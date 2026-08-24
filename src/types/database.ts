export type UserRole = 'ADMIN' | 'SALES';
export type ModelStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type InquiryStatus = 'NEW' | 'FOLLOW_UP_SCHEDULED' | 'FOLLOWED_UP' | 'CLOSED';
export type CommChannel = 'EMAIL' | 'WHATSAPP';
export type CommStatus = 'SENT' | 'FAILED' | 'SKIPPED_OPT_OUT' | 'MOCK_SENT';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Model3D {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_size_bytes: number | null;
  is_active: boolean;
  status: ModelStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hotspot {
  id: string;
  model_id: string;
  name: string;
  description: string | null;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rot_y: number;
  target_pos_x: number;
  target_pos_y: number;
  target_pos_z: number;
  target_rot_y: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Visitor {
  id: string;
  salesperson_id: string;
  name: string;
  email: string;
  phone: string;
  inquiry_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  visitor_id: string;
  status: InquiryStatus;
  details: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationPreference {
  id: string;
  visitor_id: string;
  opted_out: boolean;
  opt_out_timestamp: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationLog {
  id: string;
  visitor_id: string;
  channel: CommChannel;
  status: CommStatus;
  recipient: string;
  content_summary: string;
  error_message: string | null;
  sent_at: string;
}

export interface FollowUpJob {
  id: string;
  visitor_id: string;
  scheduled_for: string;
  status: JobStatus;
  attempts: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}
