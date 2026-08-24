import { createBrowserClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  INITIAL_PROFILES, 
  INITIAL_MODELS, 
  INITIAL_HOTSPOTS, 
  INITIAL_VISITORS, 
  INITIAL_COMM_PREFS, 
  INITIAL_COMM_LOGS, 
  INITIAL_JOBS 
} from './mock-db';
import { Profile, Model3D, Hotspot, Visitor, Inquiry, FollowUpJob, CommunicationLog, CommunicationPreference, UserRole, EmailTemplate, EmailReply } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase-project') && 
  !supabaseUrl.includes('mock-project')
);

export function getSupabaseBrowserClient() {
  if (isSupabaseConfigured) {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return null;
}

let cachedSupabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!cachedSupabaseClient) {
    const key = (typeof window === 'undefined' && supabaseServiceKey) ? supabaseServiceKey : supabaseAnonKey;
    cachedSupabaseClient = createClient(supabaseUrl, key);
  }
  return cachedSupabaseClient;
}

// Unified Database Store (Supabase with in-memory fallback)
class MockStore {
  profiles: Profile[] = [...INITIAL_PROFILES];
  models: Model3D[] = [...INITIAL_MODELS];
  hotspots: Hotspot[] = [...INITIAL_HOTSPOTS];
  visitors: Visitor[] = [...INITIAL_VISITORS];
  inquiries: Inquiry[] = [
    { id: 'inq-01', visitor_id: 'vis-01', status: 'FOLLOWED_UP', details: 'Master Suite Inquiry', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'inq-02', visitor_id: 'vis-02', status: 'NEW', details: 'Penthouse Investment', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ];
  commPrefs: CommunicationPreference[] = [...INITIAL_COMM_PREFS];
  commLogs: CommunicationLog[] = [...INITIAL_COMM_LOGS];
  followUpJobs: FollowUpJob[] = [...INITIAL_JOBS];
  currentUser: Profile | null = INITIAL_PROFILES[0]; // Default Admin for initial view

  // User Auth & Profiles
  async getProfiles(): Promise<Profile[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as Profile[];
      }
    }
    return this.profiles;
  }

  async getProfileById(id: string): Promise<Profile | null> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle();
      if (!error && data) return data as Profile;
    }
    return this.profiles.find(p => p.id === id) || null;
  }

  async createProfile(data: { full_name: string; email: string; role: UserRole }): Promise<Profile> {
    const client = getSupabaseClient();
    if (client) {
      const { data: newProf, error } = await client.from('profiles').insert([{
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        must_change_password: true,
        is_active: true,
      }]).select().single();
      if (!error && newProf) return newProf as Profile;
    }
    const newProfile: Profile = {
      id: `user-${Date.now()}`,
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      must_change_password: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.profiles.unshift(newProfile);
    return newProfile;
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const index = this.profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      this.profiles[index] = { ...this.profiles[index], ...updates, updated_at: new Date().toISOString() };
      if (this.currentUser?.id === id) {
        this.currentUser = this.profiles[index];
      }
    }

    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('profiles').update({
        ...updates,
        updated_at: new Date().toISOString()
      }).eq('id', id).select().single();
      if (!error && data) {
        if (this.currentUser?.id === id) this.currentUser = data as Profile;
        return data as Profile;
      }
    }

    return index !== -1 ? this.profiles[index] : null;
  }

  // 3D Models
  async getModels(): Promise<Model3D[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('models').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as Model3D[];
    }
    return this.models;
  }

  async getActiveModel(): Promise<{ model: Model3D; hotspots: Hotspot[] } | null> {
    const client = getSupabaseClient();
    if (client) {
      const { data: active, error } = await client.from('models')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'PUBLISHED')
        .limit(1)
        .maybeSingle();

      if (!error && active) {
        const { data: modelHotspots } = await client.from('hotspots')
          .select('*')
          .eq('model_id', active.id)
          .eq('is_enabled', true);

        return { model: active as Model3D, hotspots: (modelHotspots || []) as Hotspot[] };
      }
    }

    const active = this.models.find(m => m.is_active && m.status === 'PUBLISHED') || this.models[0];
    if (!active) return null;
    const modelHotspots = this.hotspots.filter(h => h.model_id === active.id && h.is_enabled);
    return { model: active, hotspots: modelHotspots };
  }

  async addModel(model: Omit<Model3D, 'id' | 'created_at' | 'updated_at'>): Promise<Model3D> {
    const client = getSupabaseClient();
    if (client) {
      if (model.is_active) {
        await client.from('models').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      }
      const { data: newModel, error } = await client.from('models').insert([model]).select().single();
      if (!error && newModel) return newModel as Model3D;
    }

    const newModel: Model3D = {
      ...model,
      id: `model-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (newModel.is_active) {
      this.models.forEach(m => m.is_active = false);
    }
    this.models.unshift(newModel);
    return newModel;
  }

  async setActiveModel(modelId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (client) {
      await client.from('models').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('models').update({ is_active: true, status: 'PUBLISHED' }).eq('id', modelId);
      return true;
    }

    this.models.forEach(m => {
      m.is_active = m.id === modelId;
      if (m.id === modelId) m.status = 'PUBLISHED';
    });
    return true;
  }

  async deleteModel(modelId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (client) {
      await client.from('models').delete().eq('id', modelId);
      return true;
    }

    this.models = this.models.filter(m => m.id !== modelId);
    this.hotspots = this.hotspots.filter(h => h.model_id !== modelId);
    return true;
  }

  // Hotspots
  async getHotspotsByModel(modelId: string): Promise<Hotspot[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('hotspots').select('*').eq('model_id', modelId);
      if (!error && data) return data as Hotspot[];
    }
    return this.hotspots.filter(h => h.model_id === modelId);
  }

  async saveHotspot(hotspot: Omit<Hotspot, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Hotspot> {
    const client = getSupabaseClient();
    if (client) {
      if (hotspot.id) {
        const { data, error } = await client.from('hotspots').update({
          ...hotspot,
          updated_at: new Date().toISOString()
        }).eq('id', hotspot.id).select().single();
        if (!error && data) return data as Hotspot;
      } else {
        const { data, error } = await client.from('hotspots').insert([hotspot]).select().single();
        if (!error && data) return data as Hotspot;
      }
    }

    if (hotspot.id) {
      const idx = this.hotspots.findIndex(h => h.id === hotspot.id);
      if (idx !== -1) {
        this.hotspots[idx] = {
          ...this.hotspots[idx],
          ...hotspot,
          updated_at: new Date().toISOString()
        };
        return this.hotspots[idx];
      }
    }
    const newHs: Hotspot = {
      ...hotspot,
      id: `hs-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.hotspots.push(newHs);
    return newHs;
  }

  async deleteHotspot(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (client) {
      await client.from('hotspots').delete().eq('id', id);
      return true;
    }
    this.hotspots = this.hotspots.filter(h => h.id !== id);
    return true;
  }

  // Visitors & Inquiries
  async getVisitors(salespersonId?: string): Promise<Visitor[]> {
    const client = getSupabaseClient();
    if (client) {
      let query = client.from('visitors').select('*').order('created_at', { ascending: false });

      if (salespersonId) {
        // The salespersonId may be a mock ID (e.g. 'user-sales-01') or a real Supabase UUID.
        // Try to resolve the actual Supabase UUID by checking if we have a matching profile
        // in the live DB for the current user's email.
        let resolvedId = salespersonId;

        // If it looks like a mock ID (not a UUID format), try to resolve via currentUser email
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salespersonId);
        if (!isUuid && this.currentUser?.email) {
          const { data: realProfile } = await client
            .from('profiles')
            .select('id')
            .eq('email', this.currentUser.email)
            .maybeSingle();
          if (realProfile?.id) resolvedId = realProfile.id;
        }

        // Fetch by real ID AND by original mock ID in case both exist
        const { data, error } = await client
          .from('visitors')
          .select('*')
          .or(`salesperson_id.eq.${resolvedId},salesperson_id.eq.${salespersonId}`)
          .order('created_at', { ascending: false });

        if (!error && data) return data as Visitor[];
      } else {
        const { data, error } = await query;
        if (!error && data) return data as Visitor[];
      }
    }
    if (salespersonId) {
      return this.visitors.filter(v => v.salesperson_id === salespersonId);
    }
    return this.visitors;
  }

  async registerVisitor(data: {
    salesperson_id: string;
    name: string;
    email: string;
    phone: string;
    inquiry_type: string;
    notes?: string;
  }): Promise<{ visitor: Visitor; job: FollowUpJob }> {
    const client = getSupabaseClient();
    if (client) {
      const { data: newVisitor, error: vErr } = await client.from('visitors').insert([{
        salesperson_id: data.salesperson_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        inquiry_type: data.inquiry_type,
        notes: data.notes || null,
      }]).select().single();

      if (!vErr && newVisitor) {
        await client.from('communication_preferences').insert([{
          visitor_id: newVisitor.id,
          opted_out: false,
        }]);

        await client.from('inquiries').insert([{
          visitor_id: newVisitor.id,
          status: 'FOLLOW_UP_SCHEDULED',
          details: data.inquiry_type,
        }]);

        const scheduledTime = new Date(Date.now() + 60 * 1000).toISOString();
        const { data: newJob } = await client.from('follow_up_jobs').insert([{
          visitor_id: newVisitor.id,
          scheduled_for: scheduledTime,
          status: 'PENDING',
          attempts: 0,
        }]).select().single();

        return {
          visitor: newVisitor as Visitor,
          job: (newJob || {
            id: `job-${Date.now()}`,
            visitor_id: newVisitor.id,
            scheduled_for: scheduledTime,
            status: 'PENDING',
            attempts: 0,
            follow_up_number: 1,
            error: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }) as FollowUpJob
        };
      }
    }

    const newVisitor: Visitor = {
      id: `vis-${Date.now()}`,
      salesperson_id: data.salesperson_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      inquiry_type: data.inquiry_type,
      notes: data.notes || null,
      max_follow_ups: 3,
      follow_ups_sent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.visitors.unshift(newVisitor);

    this.commPrefs.push({
      id: `cp-${Date.now()}`,
      visitor_id: newVisitor.id,
      opted_out: false,
      opt_out_timestamp: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.inquiries.unshift({
      id: `inq-${Date.now()}`,
      visitor_id: newVisitor.id,
      status: 'FOLLOW_UP_SCHEDULED',
      details: data.inquiry_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const scheduledTime = new Date(Date.now() + 60 * 1000).toISOString();
    const newJob: FollowUpJob = {
      id: `job-${Date.now()}`,
      visitor_id: newVisitor.id,
      scheduled_for: scheduledTime,
      status: 'PENDING',
      attempts: 0,
      follow_up_number: 1,
      error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.followUpJobs.unshift(newJob);

    return { visitor: newVisitor, job: newJob };
  }

  async toggleOptOut(visitorId: string, optOut: boolean): Promise<boolean> {
    const client = getSupabaseClient();
    if (client) {
      const { data: existing } = await client.from('communication_preferences').select('*').eq('visitor_id', visitorId).maybeSingle();
      if (existing) {
        await client.from('communication_preferences').update({
          opted_out: optOut,
          opt_out_timestamp: optOut ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }).eq('visitor_id', visitorId);
      } else {
        await client.from('communication_preferences').insert([{
          visitor_id: visitorId,
          opted_out: optOut,
          opt_out_timestamp: optOut ? new Date().toISOString() : null
        }]);
      }
      return true;
    }

    const pref = this.commPrefs.find(cp => cp.visitor_id === visitorId);
    if (pref) {
      pref.opted_out = optOut;
      pref.opt_out_timestamp = optOut ? new Date().toISOString() : null;
      pref.updated_at = new Date().toISOString();
    } else {
      this.commPrefs.push({
        id: `cp-${Date.now()}`,
        visitor_id: visitorId,
        opted_out: optOut,
        opt_out_timestamp: optOut ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return true;
  }

  async getVisitorDetail(visitorId: string) {
    const client = getSupabaseClient();
    if (client) {
      const { data: visitor } = await client.from('visitors').select('*').eq('id', visitorId).maybeSingle();
      if (visitor) {
        const { data: pref } = await client.from('communication_preferences').select('*').eq('visitor_id', visitorId).maybeSingle();
        const { data: logs } = await client.from('communication_logs').select('*').eq('visitor_id', visitorId).order('sent_at', { ascending: false });
        const { data: jobs } = await client.from('follow_up_jobs').select('*').eq('visitor_id', visitorId).order('created_at', { ascending: false });
        const { data: salesperson } = await client.from('profiles').select('*').eq('id', visitor.salesperson_id).maybeSingle();

        return {
          visitor: visitor as Visitor,
          preference: pref || { opted_out: false },
          logs: (logs || []) as CommunicationLog[],
          jobs: (jobs || []) as FollowUpJob[],
          salesperson: salesperson as Profile
        };
      }
    }

    const visitor = this.visitors.find(v => v.id === visitorId) || null;
    if (!visitor) return null;
    const pref = this.commPrefs.find(cp => cp.visitor_id === visitorId) || { opted_out: false };
    const logs = this.commLogs.filter(l => l.visitor_id === visitorId);
    const jobs = this.followUpJobs.filter(j => j.visitor_id === visitorId);
    const salesperson = this.profiles.find(p => p.id === visitor.salesperson_id);
    return { visitor, preference: pref, logs, jobs, salesperson };
  }

  async getCommLogs(): Promise<CommunicationLog[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('communication_logs').select('*').order('sent_at', { ascending: false });
      if (!error && data) return data as CommunicationLog[];
    }
    return this.commLogs;
  }

  async addCommLog(log: Omit<CommunicationLog, 'id' | 'sent_at'>): Promise<CommunicationLog> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('communication_logs').insert([log]).select().single();
      if (!error && data) return data as CommunicationLog;
    }

    const newLog: CommunicationLog = {
      ...log,
      id: `log-${Date.now()}`,
      sent_at: new Date().toISOString(),
    };
    this.commLogs.unshift(newLog);
    return newLog;
  }

  async getPendingJobs(): Promise<FollowUpJob[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('follow_up_jobs').select('*').eq('status', 'PENDING');
      if (!error && data) return data as FollowUpJob[];
    }
    return this.followUpJobs.filter(j => j.status === 'PENDING');
  }

  async updateJobStatus(jobId: string, status: 'COMPLETED' | 'FAILED' | 'PROCESSING', error?: string) {
    const client = getSupabaseClient();
    if (client) {
      const { data: currentJob } = await client.from('follow_up_jobs').select('attempts').eq('id', jobId).single();
      const attempts = (currentJob?.attempts || 0) + 1;
      await client.from('follow_up_jobs').update({
        status,
        attempts,
        error: error || null,
        updated_at: new Date().toISOString()
      }).eq('id', jobId);
      return;
    }

    const job = this.followUpJobs.find(j => j.id === jobId);
    if (job) {
      job.status = status;
      job.attempts += 1;
      if (error) job.error = error;
      job.updated_at = new Date().toISOString();
    }
  }

  // ── Email Templates ──────────────────────────────────────────────

  /** Get a specific follow-up template by salesperson + follow-up number */
  async getEmailTemplate(salespersonId: string, followUpNumber: number = 1): Promise<EmailTemplate | null> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('email_templates')
        .select('*')
        .eq('salesperson_id', salespersonId)
        .eq('follow_up_number', followUpNumber)
        .maybeSingle();
      if (!error && data) return data as EmailTemplate;
      if (error && !error.message.includes('does not exist')) console.warn('email_templates error:', error.message);
    }
    return null;
  }

  /** Get all templates for a salesperson (all follow-up numbers) */
  async getAllEmailTemplates(salespersonId: string): Promise<EmailTemplate[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('email_templates')
        .select('*')
        .eq('salesperson_id', salespersonId)
        .order('follow_up_number', { ascending: true });
      if (!error && data) return data as EmailTemplate[];
      if (error && !error.message.includes('does not exist')) console.warn('email_templates error:', error.message);
    }
    return [];
  }

  /** Save / update a template for a specific follow-up number */
  async saveEmailTemplate(
    salespersonId: string,
    followUpNumber: number,
    subject: string,
    bodyText: string
  ): Promise<EmailTemplate | null> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('email_templates')
        .upsert(
          {
            salesperson_id: salespersonId,
            follow_up_number: followUpNumber,
            subject,
            body_text: bodyText,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'salesperson_id,follow_up_number' }
        )
        .select()
        .single();
      if (!error && data) return data as EmailTemplate;
      if (error) console.error('saveEmailTemplate error:', error.message);
    }
    return null;
  }

  // ── Email Replies ─────────────────────────────────────────────────

  async getEmailReplies(visitorId: string): Promise<EmailReply[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('email_replies')
        .select('*')
        .eq('visitor_id', visitorId)
        .order('received_at', { ascending: false });
      if (!error && data) return data as EmailReply[];
      if (error && !error.message.includes('does not exist')) console.warn('email_replies error:', error.message);
    }
    return [];
  }

  async storeEmailReply(reply: Omit<EmailReply, 'id'>): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      await client.from('email_replies').insert([reply]);
    }
  }

  // ── Visitor Follow-up Count ───────────────────────────────────────

  async updateVisitorFollowUpCount(visitorId: string, maxFollowUps: number): Promise<boolean> {
    const clamped = Math.min(10, Math.max(1, maxFollowUps));
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client
        .from('visitors')
        .update({ max_follow_ups: clamped, updated_at: new Date().toISOString() })
        .eq('id', visitorId);
      if (!error) return true;
      console.error('updateVisitorFollowUpCount error:', error.message);
    }
    const v = this.visitors.find(v => v.id === visitorId);
    if (v) v.max_follow_ups = clamped;
    return true;
  }

  async incrementFollowUpsSent(visitorId: string): Promise<number> {
    const client = getSupabaseClient();
    if (client) {
      const { data: current } = await client.from('visitors').select('follow_ups_sent').eq('id', visitorId).single();
      const newCount = (current?.follow_ups_sent || 0) + 1;
      await client.from('visitors').update({ follow_ups_sent: newCount, updated_at: new Date().toISOString() }).eq('id', visitorId);
      return newCount;
    }
    const v = this.visitors.find(v => v.id === visitorId);
    if (v) { v.follow_ups_sent = (v.follow_ups_sent || 0) + 1; return v.follow_ups_sent; }
    return 0;
  }

  async scheduleNextFollowUp(visitorId: string, followUpNumber: number, delayMs: number = 60000): Promise<FollowUpJob | null> {
    // Default: 1 minute between each follow-up
    const client = getSupabaseClient();
    const scheduledFor = new Date(Date.now() + delayMs).toISOString();
    if (client) {
      const { data, error } = await client.from('follow_up_jobs').insert([{
        visitor_id: visitorId,
        scheduled_for: scheduledFor,
        status: 'PENDING',
        attempts: 0,
        follow_up_number: followUpNumber,
      }]).select().single();
      if (!error && data) return data as FollowUpJob;
    }
    const newJob: FollowUpJob = {
      id: `job-${Date.now()}`,
      visitor_id: visitorId,
      scheduled_for: scheduledFor,
      status: 'PENDING',
      attempts: 0,
      follow_up_number: followUpNumber,
      error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.followUpJobs.push(newJob);
    return newJob;
  }
}

export const mockDb = new MockStore();
