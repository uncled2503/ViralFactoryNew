/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Centralized schema definitions prepared for future Prisma ORM integration.
// These reflect the exact PostgreSQL database models used by the persistent layer.

export interface UserModel {
  id: string; // primary key
  name: string;
  email: string;
  company?: string;
  role: string;
  avatar_url?: string;
  subscription: string;
  status: string;
  usage_current: number;
  usage_limit: number;
  storage_used_mb: number;
  templates_used: number;
  projects_active: number;
  subscription_details?: any;
  created_at?: string;
}

export interface ProjectModel {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  template_id?: string;
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  aspect: string;
  variables: any;
  video_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateModel {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  aspect: string;
  default_duration: number;
  scenes_count: number;
  layers: any[];
  bg_music_url?: string;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RenderJobModel {
  id: string;
  project_id?: string;
  user_id: string;
  project_name: string;
  template_name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  duration: string;
  render_time?: string;
  output_url?: string;
  created_at?: string;
  completed_at?: string;
}

export interface RenderLogModel {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  ip_address?: string;
}

export interface UploadedVideoModel {
  id: string;
  user_id: string;
  name: string;
  size_mb: number;
  url: string;
  created_at?: string;
}

export interface RenderedVideoModel {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  size_mb: number;
  url: string;
  created_at?: string;
}

export interface StorageFolderModel {
  id: string;
  user_id: string;
  name: string;
  path: string;
  description?: string;
  files: any[];
  created_at?: string;
}

export interface PlanModel {
  id: string;
  name: string;
  price: number;
  max_videos_per_month: number;
  max_storage_mb: number;
  features: string[];
}

export interface SubscriptionModel {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  billing_cycle: string;
  price: number;
  start_date: string;
  end_date: string;
  cancel_at_period_end: boolean;
  auto_renew: boolean;
}

export interface PaymentModel {
  id: string;
  subscription_id: string;
  user_id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at?: string;
  pdf_url?: string;
  billing_period_start: string;
  billing_period_end: string;
}

export interface CouponModel {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  active: boolean;
  expires_at?: string;
}
