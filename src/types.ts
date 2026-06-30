/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlanTier = 'Starter' | 'Pro' | 'Business';
export type BillingCycle = 'monthly' | 'quarterly' | 'semestral' | 'annual';
export type SubscriptionStatus = 'active' | 'canceled' | 'suspended' | 'past_due';

export interface PlanLimits {
  maxVideosPerMonth: number;
  maxTemplates: number;
  maxProjects: number;
  maxStorageMB: number;
  renderPriority: 'normal' | 'priority' | 'maximum';
  hasAutoSubtitles: boolean;
  hasMultiFormatExport: boolean;
  hasPrivateTemplates: boolean;
  hasApiAccess: boolean;
  hasTeamManagement: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: PlanTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  price: number; // local currency (e.g., R$ 49,00)
  startDate: string;
  endDate: string;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
  paymentMethodId?: string;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  dueDate: string;
  paidAt?: string;
  pdfUrl?: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'pix' | 'boleto';
  last4?: string;
  brand?: string;
  holderName?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  active: boolean;
  expiresAt?: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'SUPPORT' 
  | 'FINANCE' 
  | 'MODERATOR' 
  | 'CLIENT_OWNER' 
  | 'CLIENT_MEMBER'
  | 'SaaS_Owner' // backward compatibility
  | 'Administrador' // backward compatibility
  | 'Membro'; // backward compatibility

export type Permission = 
  | 'MANAGE_USERS' 
  | 'VIEW_METRICS' 
  | 'MANAGE_PAYMENTS' 
  | 'MANAGE_TEMPLATES' 
  | 'MANAGE_SYSTEM' 
  | 'VIEW_LOGS' 
  | 'MANAGE_SUPPORT'
  | 'RENDER_VIDEOS'
  | 'MANAGE_FILES';

export interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  role: UserRole;
  avatarUrl?: string;
  subscription: PlanTier;
  status: 'active' | 'suspended';
  usageCurrent: number; // videos renderizados no mês
  usageLimit: number; // limite de vídeos renderizados no mês
  storageUsedMB: number; // em MB
  templatesUsed: number; // quantidade atual
  projectsActive: number; // quantidade atual
  subscriptionDetails?: UserSubscription;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  service: 'ffmpeg-worker' | 'auth-service' | 'billing-engine' | 'storage-handler';
  message: string;
  ipAddress?: string;
}

export interface RenderWorker {
  id: string;
  name: string;
  status: 'online' | 'busy' | 'offline';
  cpuUsage: number;
  memoryUsage: number;
  processedCount: number;
  region: string;
}

export type AspectRatio = '9:16' | '16:9' | '1:1';

export interface Project {
  id: string;
  name: string;
  description: string;
  templateId: string;
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  aspect: AspectRatio;
  videoUrl?: string;
  variables: {
    title: string;
    subtitles: string[];
    backgroundImageUrl?: string;
    backgroundVideoUrl?: string;
    audioUrl?: string;
    logoUrl?: string;
    brandColor?: string;
    fontName?: string;
  };
}

export interface Template {
  id: string;
  name: string;
  description: string;
  aspect: AspectRatio;
  createdAt: string;
  updatedAt: string;
  bgMusicUrl?: string;
  defaultDuration: number; // in seconds
  scenesCount: number;
  layers: {
    id: string;
    type: 'text' | 'image' | 'audio' | 'overlay';
    name: string;
    defaultValue: string;
  }[];
}

export interface RenderingTask {
  id: string;
  projectId: string;
  projectName: string;
  templateName: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 to 100
  duration: string; // duration of video, e.g. "0:30"
  renderTime?: string; // e.g. "45s"
  outputUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface StorageFile {
  id: string;
  name: string;
  size: string;
  type: 'video' | 'image' | 'audio' | 'font' | 'render';
  url: string;
  createdAt: string;
}

export interface StorageFolder {
  id: string;
  name: string; // 'uploads', 'templates', 'logos', 'videos', 'rendered'
  path: string;
  description: string;
  files: StorageFile[];
}

export interface SystemStats {
  totalVideosRendered: number;
  totalRenderingMinutes: number;
  activeTemplates: number;
  activeProjects: number;
  storageUsed: string; // e.g. "12.4 GB / 100 GB"
  renderSuccessRate: number; // e.g. 98.4
}
