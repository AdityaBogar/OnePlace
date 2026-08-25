'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '@/types/database';
import { mockDb, getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (newPass: string) => Promise<boolean>;
  setUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUserId = localStorage.getItem('luxe_user_id');
    if (storedUserId) {
      // Fetch profile from API to bypass client-side RLS timing issues
      fetch(`/api/auth/profile?id=${storedUserId}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch profile');
        })
        .then((json) => {
          if (json.profile) {
            setUser(json.profile);
            mockDb.currentUser = json.profile;
          } else {
            // Invalid session or profile deleted, clear storage
            setUser(null);
            localStorage.removeItem('luxe_user_id');
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error loading session profile:', err);
          setUser(null);
          setIsLoading(false);
        });
    } else {
      // Dev mode fallback or kiosk default
      setUser(mockDb.currentUser);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // Check mandatory password change flow
    if (user && user.must_change_password && pathname !== '/change-password') {
      router.push('/change-password');
      return;
    }

    // Role-based route guard
    if (pathname.startsWith('/admin') && user?.role !== 'ADMIN') {
      router.push(user ? (user.role === 'SALES' ? '/sales/dashboard' : '/walkthrough') : '/login');
    } else if (pathname.startsWith('/sales') && user?.role !== 'SALES' && user?.role !== 'ADMIN') {
      router.push(user ? (user.role === 'FRONT_DESK' ? '/walkthrough' : '/admin/dashboard') : '/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, pass: string) => {
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password: pass }),
      });
      const json = await res.json();

      if (!res.ok) {
        return { success: false, error: json.error ?? 'Login failed.' };
      }

      const found = json.profile;
      setUser(found);
      mockDb.currentUser = found;
      localStorage.setItem('luxe_user_id', found.id);

      // Synchronize client-side Supabase browser client
      const supabase = getSupabaseBrowserClient();
      if (supabase && json.session) {
        await supabase.auth.setSession({
          access_token: json.session.access_token,
          refresh_token: json.session.refresh_token,
        });
      }

      if (found.must_change_password) {
        router.push('/change-password');
      } else if (found.role === 'FRONT_DESK') {
        router.push('/walkthrough');
      } else {
        router.push(found.role === 'ADMIN' ? '/admin/dashboard' : '/sales/dashboard');
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error. Please try again.' };
    }
  };


  const logout = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    mockDb.currentUser = null;
    localStorage.removeItem('luxe_user_id');
    router.push('/login');
  };

  const changePassword = async (newPass: string) => {
    if (!user) return false;
    if (newPass.length < 6) return false;

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newPassword: newPass }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error('Change password API failed:', json.error);
        return false;
      }

      const finalProfile = json.profile;
      setUser(finalProfile);
      mockDb.currentUser = finalProfile;

      if (finalProfile.role === 'FRONT_DESK') {
        router.push('/walkthrough');
      } else {
        router.push(finalProfile.role === 'ADMIN' ? '/admin/dashboard' : '/sales/dashboard');
      }
      return true;
    } catch (err) {
      console.error('Change password network error:', err);
      return false;
    }
  };

  const setUserRole = (role: UserRole) => {
    if (!user) return;
    mockDb.updateProfile(user.id, { role }).then((updated) => {
      if (updated) setUser(updated);
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, changePassword, setUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
