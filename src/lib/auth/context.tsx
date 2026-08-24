'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '@/types/database';
import { mockDb } from '@/lib/supabase/client';
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
    // Read persisted session or default to Admin in dev
    const storedUserId = localStorage.getItem('luxe_user_id');
    if (storedUserId) {
      mockDb.getProfileById(storedUserId).then((p) => {
        if (p) setUser(p);
        else setUser(mockDb.currentUser);
        setIsLoading(false);
      });
    } else {
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

      if (found.must_change_password) {
        router.push('/change-password');
      } else if (found.role === 'FRONT_DESK') {
        router.push('/walkthrough');
      } else {
        router.push(found.role === 'ADMIN' ? '/admin/dashboard' : '/sales/dashboard');
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };


  const logout = () => {
    setUser(null);
    mockDb.currentUser = null;
    localStorage.removeItem('luxe_user_id');
    router.push('/login');
  };

  const changePassword = async (newPass: string) => {
    if (!user) return false;
    if (newPass.length < 6) return false;

    const updated = await mockDb.updateProfile(user.id, { must_change_password: false });
    const finalProfile: Profile = updated
      ? { ...updated, must_change_password: false }
      : { ...user, must_change_password: false };

    setUser(finalProfile);
    mockDb.currentUser = finalProfile;

    if (finalProfile.role === 'FRONT_DESK') {
      router.push('/walkthrough');
    } else {
      router.push(finalProfile.role === 'ADMIN' ? '/admin/dashboard' : '/sales/dashboard');
    }
    return true;
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
