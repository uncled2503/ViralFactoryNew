/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import {
  User,
  Project,
  Template,
  RenderingTask,
  StorageFolder,
  SystemStats,
  AspectRatio,
  StorageFile,
  PlanTier,
  PlanLimits,
  BillingCycle,
  UserSubscription,
  Invoice,
} from '../types';
import { PLAN_LIMITS_MAP, PLANS_DETAILS, getPlanLimits, BILLING_ENABLED } from '../config/plans';
import {
  INITIAL_PROJECTS,
  INITIAL_TEMPLATES,
  INITIAL_RENDERING_TASKS,
  INITIAL_FOLDERS,
} from '../mockData';
import { isSupabaseConfigured, supabaseClient } from '../services/dbClient';
import { UserService } from '../services/UserService';
import { ProjectService } from '../services/ProjectService';
import { TemplateService } from '../services/TemplateService';
import { RenderService } from '../services/RenderService';
import { SubscriptionService } from '../services/SubscriptionService';
import { StorageService } from '../services/StorageService';
import { PaymentService } from '../services/PaymentService';
import { isAdminRole } from '../utils/rbac';
import { adminFetch, authenticatedFetch } from '../utils/api';
import { generateUUID } from '../utils/uuid';

export type TabName = 'dashboard' | 'projects' | 'templates' | 'renderings' | 'storage' | 'subscription' | 'admin' | 'help' | 'profile-settings';

interface LimitExceededInfo {
  type: 'videos' | 'templates' | 'projects' | 'storage';
  title: string;
  message: string;
  limitLabel: string;
  currentLabel: string;
}

export interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  user: User | null;
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
  projects: Project[];
  templates: Template[];
  renderingTasks: RenderingTask[];
  folders: StorageFolder[];
  stats: SystemStats;
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  
  // Auth Functions
  login: (email: string, password?: string) => Promise<boolean>;
  register: (name: string, email: string, company: string, password?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  recoverPassword: (email: string) => Promise<string>;
  logout: () => void | Promise<void>;
  updateUser: (updatedUser: User) => Promise<boolean>;
  
  // Projects Functions
  createProject: (name: string, description: string, templateId: string, aspect: AspectRatio, variables?: any) => Project | null;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (id: string) => void;
  
  // Templates Functions
  createTemplate: (name: string, description: string, aspect: AspectRatio, defaultDuration: number, backgroundImageUrl?: string) => Template | null;
  updateTemplate: (updatedTemplate: Template) => void;
  duplicateTemplate: (id: string) => boolean;
  deleteTemplate: (id: string) => void;
  
  // Render System
  triggerRender: (projectIdOrProject: string | Project, isSandbox?: boolean) => boolean;
  deleteRenderingTask: (id: string) => void;
  duplicateRenderingTask: (id: string) => void;
  
  // Storage System
  uploadFileToFolder: (folderId: string, fileName: string, fileSize: string, fileType: StorageFile['type']) => boolean;
  deleteFileFromFolder: (folderId: string, fileId: string) => void;
  createFolder: (name: string, description?: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFile: (srcFolderId: string, destFolderId: string, fileId: string) => void;

  // Subscription System
  changeSubscription: (tier: PlanTier, cycle: BillingCycle) => void;
  cancelSubscription: () => void;
  invoices: Invoice[];
  triggerMockRenewal: () => void;

  // Limits Verification & Error Modal State
  limitError: LimitExceededInfo | null;
  clearLimitError: () => void;

  // SaaS Admin Area
  allUsers: User[];
  refreshAdminData?: () => Promise<void>;
  adminUpdateUser: (userId: string, updates: Partial<User>) => void;
  adminDeleteUser: (userId: string) => void;
  impersonateUser?: (targetUser: User) => void;
  stopImpersonating?: () => void;
  isImpersonating?: boolean;
  originalAdminUser?: User | null;
  logAdminAction: (action: string, targetUser: string, status?: 'SUCCESS' | 'WARNING' | 'FAILED') => void;
  adminResetSystem: (cleanMode: 'zero' | 'demo') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Core Mock Users removed to enforce Supabase-only authentication

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const normalizeUser = (u: User | null): User | null => {
    if (!u) return null;
    const isMasterOwner =
      u.email?.toLowerCase().trim() === 'mouragabriel2011@gmail.com' ||
      u.role === 'SaaS_Owner' ||
      (u.role as string) === 'owner' ||
      u.role === 'SUPER_ADMIN' ||
      u.role === 'OWNER' ||
      (u.role as string) === 'saas_owner';

    const role = isMasterOwner ? 'SaaS_Owner' : (u.role || 'Membro');
    const rawTier = (u as any).subscription_tier || u.subscription || (u as any).subscriptionTier || 'Free';
    const tierFormatted = rawTier.charAt(0).toUpperCase() + rawTier.slice(1).toLowerCase();
    const subscription = (['Free', 'Starter', 'Pro', 'Business'].includes(tierFormatted) ? tierFormatted : 'Free') as PlanTier;

    return {
      ...u,
      role: role as any,
      subscription,
      subscription_tier: subscription,
      usageLimit: isMasterOwner ? 999999 : (u.usageLimit || getPlanLimits(subscription, role, u.email).maxVideosPerMonth)
    };
  };
  const setUser = (u: User | null) => {
    setUserState(normalizeUser(u));
  };
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [originalAdminUser, setOriginalAdminUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('vf_original_admin');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [activeTab, setActiveTabState] = useState<TabName>(() => {
    const path = window.location.pathname;
    const pathToTabMap: Record<string, TabName> = {
      '/dashboard': 'dashboard',
      '/projects': 'projects',
      '/templates': 'templates',
      '/renders': 'renderings',
      '/renderings': 'renderings',
      '/files': 'storage',
      '/storage': 'storage',
      '/subscription': 'subscription',
      '/settings': 'help',
      '/help': 'help',
      '/settings/profile': 'profile-settings',
      '/admin': 'admin'
    };
    return pathToTabMap[path] || 'dashboard';
  });

  const setActiveTab = useCallback((tab: TabName) => {
    setActiveTabState(tab);
    const tabToPathMap: Record<TabName, string> = {
      dashboard: '/dashboard',
      projects: '/projects',
      templates: '/templates',
      renderings: '/renders',
      storage: '/files',
      subscription: '/subscription',
      help: '/settings',
      'profile-settings': '/settings/profile',
      admin: '/admin'
    };
    const targetPath = tabToPathMap[tab];
    if (targetPath && window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const pathToTabMap: Record<string, TabName> = {
        '/dashboard': 'dashboard',
        '/projects': 'projects',
        '/templates': 'templates',
        '/renders': 'renderings',
        '/renderings': 'renderings',
        '/files': 'storage',
        '/storage': 'storage',
        '/subscription': 'subscription',
        '/settings': 'help',
        '/help': 'help',
        '/settings/profile': 'profile-settings',
        '/admin': 'admin'
      };
      
      if (path.startsWith('/admin')) {
        setActiveTabState('admin');
        return;
      }
      if (path.startsWith('/project/') || (path.startsWith('/projects/') && path !== '/projects')) {
        setActiveTabState('projects');
        return;
      }

      const targetTab = pathToTabMap[path];
      if (targetTab) {
        setActiveTabState(targetTab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [renderingTasks, setRenderingTasks] = useState<RenderingTask[]>([]);
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalVideosRendered: 0,
    totalRenderingMinutes: 0,
    activeTemplates: 0,
    activeProjects: 0,
    storageUsed: '0 MB / 0 MB',
    renderSuccessRate: 100,
  });

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [limitError, setLimitError] = useState<LimitExceededInfo | null>(null);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Initialize/Load user database on mount
  useEffect(() => {
    const savedAllUsers = localStorage.getItem('vf_all_users');
    let currentAllUsers: User[] = [];
    if (savedAllUsers) {
      currentAllUsers = JSON.parse(savedAllUsers);
      setAllUsers(currentAllUsers);
    } else {
      setAllUsers([]);
      localStorage.setItem('vf_all_users', JSON.stringify([]));
    }

    // Load active session user
    const savedUser = sessionStorage.getItem('vf_user');
    // Clear legacy localStorage vf_user to ensure it stops logging in automatically
    localStorage.removeItem('vf_user');
    if (savedUser) {
      const parsedUser: User = JSON.parse(savedUser);
      // Sync with latest info from users database
      const latestUser = currentAllUsers.find(u => u.id === parsedUser.id);
      if (latestUser) {
        setUser(latestUser);
        loadUserWorkspace(latestUser);
      } else {
        setUser(parsedUser);
        loadUserWorkspace(parsedUser);
      }
    }
  }, []);

  const refreshAdminData = async () => {
    if (!user) return;
    const isAdmin = isAdminRole(user.role, user.email);
    if (!isAdmin) return;
    try {
      const res = await adminFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
      const jobsRes = await adminFetch('/api/admin/jobs');
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setRenderingTasks(jobsData);
      }
    } catch (err) {
      console.warn('Failed to refresh admin datasets:', err);
    }
  };

  useEffect(() => {
    // If Supabase is configured, subscribe to auth state changes to keep sessions in sync
    if (isSupabaseConfigured() && supabaseClient) {
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const supabaseUser = session.user;
          let resolvedUser = await UserService.getUser(supabaseUser.id);
          
          if (!resolvedUser) {
            resolvedUser = await UserService.getUserByEmail(supabaseUser.email || '');
          }

          if (!resolvedUser) {
            const plan: PlanTier = 'Free';
            const userMetadata = supabaseUser.user_metadata || {};
            const name = userMetadata.full_name || userMetadata.name || supabaseUser.email?.split('@')[0] || 'Usuário Google';
            const company = userMetadata.company || 'Minha Empresa';
            
            resolvedUser = {
              id: supabaseUser.id,
              name,
              email: supabaseUser.email || '',
              company,
              role: 'Membro',
              avatarUrl: userMetadata.avatar_url || '/assets/paulodeborbamoraes.jpg',
              subscription: plan,
              status: 'active',
              usageCurrent: 0,
              usageLimit: 5,
              storageUsedMB: 0,
              templatesUsed: 0,
              projectsActive: 0,
              subscriptionDetails: {
                id: `sub-${Math.random().toString(36).substr(2, 9)}`,
                userId: supabaseUser.id,
                tier: plan,
                status: 'active',
                billingCycle: 'monthly',
                price: 0,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                cancelAtPeriodEnd: false,
                autoRenew: true
              }
            };
            await UserService.upsertUser(resolvedUser);
          } else {
            if (resolvedUser.id !== supabaseUser.id) {
              resolvedUser.id = supabaseUser.id;
              await UserService.upsertUser(resolvedUser);
            }
          }

          const savedUsers: User[] = JSON.parse(localStorage.getItem('vf_all_users') || '[]');
          const nextUsersList = [resolvedUser, ...savedUsers.filter(u => u.id !== resolvedUser.id)];
          setAllUsers(nextUsersList);
          localStorage.setItem('vf_all_users', JSON.stringify(nextUsersList));
          
          setUser(resolvedUser);
          sessionStorage.setItem('vf_user', JSON.stringify(resolvedUser));
          await loadUserWorkspace(resolvedUser);
          
          const currentPath = window.location.pathname;
          if (currentPath === '/' || currentPath === '/login' || currentPath === '/register' || currentPath === '/recovery') {
            setActiveTab('dashboard');
          } else {
            const pathToTabMap: Record<string, TabName> = {
              '/dashboard': 'dashboard',
              '/projects': 'projects',
              '/templates': 'templates',
              '/renders': 'renderings',
              '/renderings': 'renderings',
              '/files': 'storage',
              '/storage': 'storage',
              '/subscription': 'subscription',
              '/settings': 'help',
              '/help': 'help',
              '/settings/profile': 'profile-settings',
              '/admin': 'admin'
            };
            let matchedTab: TabName = 'dashboard';
            if (currentPath.startsWith('/admin')) {
              matchedTab = 'admin';
            } else if (currentPath.startsWith('/project/') || (currentPath.startsWith('/projects/') && currentPath !== '/projects')) {
              matchedTab = 'projects';
            } else {
              matchedTab = pathToTabMap[currentPath] || 'dashboard';
            }
            setActiveTabState(matchedTab);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          sessionStorage.removeItem('vf_user');
          localStorage.removeItem('vf_user');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Helper to parse file size string (e.g. "85.4 MB" or "320 KB") into numeric MB
  const parseSizeToMB = (sizeStr: string): number => {
    const parts = sizeStr.trim().split(' ');
    if (parts.length < 2) return 0;
    const value = parseFloat(parts[0]);
    const unit = parts[1].toUpperCase();
    if (unit === 'KB') return value / 1024;
    if (unit === 'GB') return value * 1024;
    return value; // MB is fallback
  };

  // Sync current user info to the global 'vf_all_users' database
  const syncUserToAllUsers = (currentUser: User) => {
    setAllUsers(prev => {
      const next = prev.map(u => u.id === currentUser.id ? currentUser : u);
      localStorage.setItem('vf_all_users', JSON.stringify(next));
      return next;
    });
  };

  // Load and isolate workspace elements specific to a user
  const loadUserWorkspace = async (targetUser: User) => {
    const userId = targetUser.id;

    // Reset all workspace states instantly to prevent race conditions or data pollution during the fetch
    setProjects([]);
    setTemplates([]);
    setRenderingTasks([]);
    setFolders([]);
    setInvoices([]);
    setLimitError(null);

    // Let's attempt to fetch synced DB snapshot from the server first to merge rendering changes
    let serverDb: any = {};
    try {
      const res = await fetch(`/api/db/sync?userId=${userId}`);
      if (res.ok) {
        serverDb = await res.json();
      }
    } catch (e) {
      console.warn('Server sync offline, running in standard local storage mode', e);
    }

    // 1. Projects
    const userProjectsKey = `vf_projects_${userId}`;
    const savedProjects = localStorage.getItem(userProjectsKey);
    let curProjects: Project[] = [];
    
    if (serverDb.projects && serverDb.projects.length > 0) {
      // Isolate only the current user's projects
      curProjects = serverDb.projects.filter((p: any) => p.userId === userId || p.user_id === userId);
      localStorage.setItem(userProjectsKey, JSON.stringify(curProjects));
    } else if (savedProjects) {
      curProjects = JSON.parse(savedProjects);
    } else {
      curProjects = INITIAL_PROJECTS;
      localStorage.setItem(userProjectsKey, JSON.stringify(INITIAL_PROJECTS));
    }
    setProjects(curProjects);

    // 2. Templates
    const userTemplatesKey = `vf_templates_${userId}`;
    const savedTemplates = localStorage.getItem(userTemplatesKey);
    let curTemplates: Template[] = [];
    if (savedTemplates) {
      curTemplates = JSON.parse(savedTemplates);
    } else {
      curTemplates = INITIAL_TEMPLATES;
      localStorage.setItem(userTemplatesKey, JSON.stringify(INITIAL_TEMPLATES));
    }
    setTemplates(curTemplates);

    // 3. Rendering Tasks
    const userTasksKey = `vf_tasks_${userId}`;
    const savedTasks = localStorage.getItem(userTasksKey);
    let curTasks: RenderingTask[] = [];

    if (serverDb.rendering_tasks && serverDb.rendering_tasks.length > 0) {
      // Isolate only the current user's rendering tasks
      const userTasks = serverDb.rendering_tasks.filter((st: any) => st.userId === userId || st.user_id === userId);
      // Map server-side rendering tasks schema to client-side
      curTasks = userTasks.map((st: any) => ({
        id: st.id,
        projectId: st.project_id || st.projectId,
        projectName: st.project_name || st.projectName,
        templateName: st.template_name || st.templateName,
        status: st.status,
        progress: st.progress,
        duration: st.duration,
        renderTime: st.render_time || st.renderTime,
        outputUrl: st.output_url || st.outputUrl,
        completedAt: st.completed_at || st.completedAt,
        logs: st.logs,
        errorMessage: st.error_message || st.errorMessage || st.error,
        debugInfo: st.debug_info || st.debugInfo
      }));
      localStorage.setItem(userTasksKey, JSON.stringify(curTasks));
    } else if (savedTasks) {
      curTasks = JSON.parse(savedTasks);
    } else {
      curTasks = INITIAL_RENDERING_TASKS;
      localStorage.setItem(userTasksKey, JSON.stringify(INITIAL_RENDERING_TASKS));
    }
    setRenderingTasks(curTasks);

    // 4. Folders
    const userFoldersKey = `vf_folders_${userId}`;
    const savedFolders = localStorage.getItem(userFoldersKey);
    let curFolders: StorageFolder[] = [];

    if (serverDb.storage_folders && serverDb.storage_folders.length > 0) {
      curFolders = serverDb.storage_folders;
      localStorage.setItem(userFoldersKey, JSON.stringify(curFolders));
    } else if (savedFolders) {
      curFolders = JSON.parse(savedFolders);
    } else {
      curFolders = INITIAL_FOLDERS;
      localStorage.setItem(userFoldersKey, JSON.stringify(INITIAL_FOLDERS));
    }
    setFolders(curFolders);

    // 5. Invoices
    const userInvoicesKey = `vf_invoices_${userId}`;
    const savedInvoices = localStorage.getItem(userInvoicesKey);
    let curInvoices: Invoice[] = [];
    if (targetUser.subscription === 'Free') {
      curInvoices = [];
      localStorage.setItem(userInvoicesKey, JSON.stringify([]));
    } else if (savedInvoices) {
      curInvoices = JSON.parse(savedInvoices);
    } else {
      curInvoices = [
        {
          id: `inv-${Math.random().toString(36).substr(2, 6)}`,
          subscriptionId: targetUser.subscriptionDetails?.id || 'sub-001',
          userId: userId,
          amount: targetUser.subscriptionDetails?.price || PLANS_DETAILS.find(p => p.tier === targetUser.subscription)?.priceMonthly || 97,
          status: 'paid',
          dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          pdfUrl: '#',
          billingPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          billingPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: `inv-${Math.random().toString(36).substr(2, 6)}`,
          subscriptionId: targetUser.subscriptionDetails?.id || 'sub-001',
          userId: userId,
          amount: targetUser.subscriptionDetails?.price || PLANS_DETAILS.find(p => p.tier === targetUser.subscription)?.priceMonthly || 97,
          status: 'paid',
          dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          pdfUrl: '#',
          billingPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          billingPeriodEnd: new Date().toISOString(),
        }
      ];
      localStorage.setItem(userInvoicesKey, JSON.stringify(curInvoices));
    }
    setInvoices(curInvoices);

    const computeAndSetStats = (
      loadedUser: User,
      loadedProjects: Project[],
      loadedTemplates: Template[],
      loadedFolders: StorageFolder[]
    ) => {
      let totalStorageMB = 0;
      loadedFolders.forEach(folder => {
        folder.files.forEach(file => {
          totalStorageMB += parseSizeToMB(file.size);
        });
      });

      const baseLimits = getPlanLimits(loadedUser?.subscription, loadedUser?.role, loadedUser?.email);
      let limitsConfig: PlanLimits = { ...baseLimits };
      const userEmail = (loadedUser?.email || '').toLowerCase().trim();
      const userRole = loadedUser?.role;
      const isAdminUser = isAdminRole(userRole, userEmail);
      if (isAdminUser) {
        limitsConfig = {
          maxVideosPerMonth: 999999,
          maxTemplates: 999999,
          maxProjects: 999999,
          maxStorageMB: 9999999,
          renderPriority: 'maximum',
          hasAutoSubtitles: true,
          hasMultiFormatExport: true,
          hasPrivateTemplates: true,
          hasApiAccess: true,
          hasTeamManagement: true,
        };
      }
      const maxStorageVal = Number(limitsConfig?.maxStorageMB) || 500;
      const usageCount = loadedUser?.usageCurrent ?? 0;
      const isolatedStats: SystemStats = {
        totalVideosRendered: usageCount,
        totalRenderingMinutes: usageCount * 2, // 2 minutes per rendering
        activeTemplates: loadedTemplates.length,
        activeProjects: loadedProjects.length,
        storageUsed: isAdminUser 
          ? `${totalStorageMB.toFixed(1)} MB / Ilimitado`
          : `${totalStorageMB.toFixed(1)} MB / ${maxStorageVal.toLocaleString('pt-BR')} MB`,
        renderSuccessRate: 100
      };
      setStats(isolatedStats);

      const updatedUser: User = {
        ...loadedUser,
        templatesUsed: loadedTemplates.length,
        projectsActive: loadedProjects.length,
        storageUsedMB: parseFloat(totalStorageMB.toFixed(2)),
      };
      setUser(updatedUser);
      sessionStorage.setItem('vf_user', JSON.stringify(updatedUser));
    };

    // First do a fast local load
    computeAndSetStats(targetUser, curProjects, curTemplates, curFolders);

    // Then, if Supabase is connected, do an async fetch and sync
    if (isSupabaseConfigured()) {
      try {
        const dbUser = await UserService.getUser(userId);
        if (dbUser) {
          const dbProjects = await ProjectService.getProjects(userId);
          const dbTemplates = await TemplateService.getTemplates(userId);
          const dbTasks = await RenderService.getRenderingTasks(userId);
          const dbFolders = await StorageService.getFolders(userId);
          const dbInvoices = await PaymentService.getInvoices(userId);

          const finalProjects = dbProjects && dbProjects.length > 0 ? dbProjects : curProjects;
          const finalTemplates = dbTemplates && dbTemplates.length > 0 ? dbTemplates : curTemplates;
          const finalTasks = dbTasks && dbTasks.length > 0 ? dbTasks : curTasks;
          const finalFolders = dbFolders && dbFolders.length > 0 ? dbFolders : curFolders;
          const finalInvoices = dbInvoices && dbInvoices.length > 0 ? dbInvoices : curInvoices;

          if (dbProjects && dbProjects.length > 0) setProjects(dbProjects);
          if (dbTemplates && dbTemplates.length > 0) setTemplates(dbTemplates);
          if (dbTasks && dbTasks.length > 0) setRenderingTasks(dbTasks);
          if (dbFolders && dbFolders.length > 0) setFolders(dbFolders);
          if (dbInvoices && dbInvoices.length > 0) setInvoices(dbInvoices);

          computeAndSetStats(dbUser, finalProjects, finalTemplates, finalFolders);
        } else {
          // Sync current local profile to Supabase saas_users table
          await UserService.upsertUser(targetUser);
        }
      } catch (err) {
        console.warn('Falha na sincronização inicial do Supabase (as tabelas podem não existir ainda):', err);
      }
    }
  };

  // Limits Validation Middleware Helper
  const verifyAndTriggerLimitExceeded = (
    type: 'videos' | 'templates' | 'projects' | 'storage',
    upcomingSizeMB = 0
  ): boolean => {
    // Special bypass: if billing is disabled globally, infinite limits for everyone
    if (!BILLING_ENABLED) {
      return true;
    }

    if (!user) return true;

    if (isAdminRole(user.role, user.email)) {
      return true;
    }

    // If user is suspended, block EVERYTHING
    if (user.status === 'suspended') {
      setLimitError({
        type: 'projects',
        title: 'Conta Suspensa',
        message: 'Sua conta está temporariamente suspensa pelo proprietário do SaaS. Entre em contato para reativação.',
        limitLabel: 'Status',
        currentLabel: 'Suspenso'
      });
      return false;
    }

    const limits = getPlanLimits(user.subscription, user.role, user.email);

    if (type === 'projects') {
      const activeProjectsCount = projects.filter(p => p.status !== 'completed' && p.status !== 'failed').length;
      const isBlocked = activeProjectsCount >= limits.maxProjects;

      console.warn(`
================== [PROJECT CREATION LIMIT AUDIT LOG] ==================
Função Responsável: verifyAndTriggerLimitExceeded
Arquivo Responsável: /src/context/AppContext.tsx
User ID: ${user.id}
Email: ${user.email}
Role: ${user.role}
Plano: ${user.subscription}
Projetos Ativos: ${activeProjectsCount}
Limite Calculado: ${limits.maxProjects}
Limite Utilizado: ${activeProjectsCount} / ${limits.maxProjects}
Resultado: ${isBlocked ? 'BLOQUEADO' : 'PERMITIDO'}
=========================================================================
`);

      if (isBlocked) {
        setLimitError({
          type: 'projects',
          title: 'Limite de Projetos Atingido',
          message: `O plano ${user.subscription} permite até no máximo ${limits.maxProjects} projetos simultâneos. Faça upgrade para criar projetos ilimitados.`,
          limitLabel: `${limits.maxProjects} projetos`,
          currentLabel: `${activeProjectsCount} ativos`
        });
        return false;
      }
    }

    if (type === 'templates') {
      if (templates.length >= limits.maxTemplates) {
        setLimitError({
          type: 'templates',
          title: 'Limite de Templates Atingido',
          message: `Seu plano atual (${user.subscription}) limita sua criação a ${limits.maxTemplates} templates. Faça upgrade para desbloquear templates ilimitados.`,
          limitLabel: `${limits.maxTemplates} templates`,
          currentLabel: `${templates.length} criados`
        });
        return false;
      }
    }

    if (type === 'videos') {
      if (user.usageCurrent >= limits.maxVideosPerMonth) {
        setLimitError({
          type: 'videos',
          title: 'Limite de Renderização Atingido',
          message: `Você atingiu seu limite mensal de ${limits.maxVideosPerMonth} vídeos renderizados no plano ${user.subscription}. Adquira o plano superior para continuar convertendo!`,
          limitLabel: `${limits.maxVideosPerMonth} vídeos`,
          currentLabel: `${user.usageCurrent} renderizados`
        });
        return false;
      }
    }

    if (type === 'storage') {
      const currentStorageMB = user.storageUsedMB || 0;
      if (currentStorageMB + upcomingSizeMB > limits.maxStorageMB) {
        const currentMBFormatted = currentStorageMB >= 1024 ? `${(currentStorageMB / 1024).toFixed(2)} GB` : `${currentStorageMB.toFixed(1)} MB`;
        const limitMBFormatted = limits.maxStorageMB >= 1024 ? `${(limits.maxStorageMB / 1024).toFixed(0)} GB` : `${limits.maxStorageMB} MB`;
        setLimitError({
          type: 'storage',
          title: 'Espaço em Disco Esgotado',
          message: `Faltam recursos de armazenamento no seu plano ${user.subscription}. O arquivo não pôde ser salvo pois ultrapassaria seu limite total de ${limitMBFormatted}.`,
          limitLabel: limitMBFormatted,
          currentLabel: currentMBFormatted
        });
        return false;
      }
    }

    return true;
  };

  const clearLimitError = () => {
    setLimitError(null);
  };

  // Auth Functions with Multi-Tenant Isolation
  const login = async (email: string, password?: string): Promise<boolean> => {
    const cleanEmail = email.toLowerCase().trim();
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: cleanEmail,
        password: password || '',
      });
      if (error) {
        throw new Error(error.message);
      }
      if (data?.user) {
        // Load user profile
        const resolvedUser = await UserService.getUser(data.user.id);
        if (resolvedUser) {
          const savedUsers: User[] = JSON.parse(localStorage.getItem('vf_all_users') || '[]');
          const updatedUsersList = [resolvedUser, ...savedUsers.filter(u => u.id !== resolvedUser.id)];
          setAllUsers(updatedUsersList);
          localStorage.setItem('vf_all_users', JSON.stringify(updatedUsersList));
          setUser(resolvedUser);
          sessionStorage.setItem('vf_user', JSON.stringify(resolvedUser));
          await loadUserWorkspace(resolvedUser);
          setActiveTab('dashboard');
          return true;
        } else {
          // Profile didn't exist? Create profile on the fly!
          const plan: PlanTier = 'Starter';
          const resolvedUser: User = {
            id: data.user.id,
            name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
            email: cleanEmail,
            company: data.user.user_metadata?.company || 'Minha Empresa',
            role: 'Membro',
            avatarUrl: data.user.user_metadata?.avatar_url || '/assets/paulodeborbamoraes.jpg',
            subscription: plan,
            status: 'active',
            usageCurrent: 0,
            usageLimit: getPlanLimits(plan).maxVideosPerMonth,
            storageUsedMB: 0,
            templatesUsed: 0,
            projectsActive: 0,
            subscriptionDetails: {
              id: `sub-${Math.random().toString(36).substr(2, 9)}`,
              userId: data.user.id,
              tier: plan,
              status: 'active',
              billingCycle: 'monthly',
              price: PLANS_DETAILS.find(p => p.tier === plan)?.priceMonthly || 97,
              startDate: new Date().toISOString(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              cancelAtPeriodEnd: false,
              autoRenew: true
            }
          };
          await UserService.upsertUser(resolvedUser);
          const savedUsers: User[] = JSON.parse(localStorage.getItem('vf_all_users') || '[]');
          const updatedUsersList = [resolvedUser, ...savedUsers.filter(u => u.id !== resolvedUser.id)];
          setAllUsers(updatedUsersList);
          localStorage.setItem('vf_all_users', JSON.stringify(updatedUsersList));
          setUser(resolvedUser);
          sessionStorage.setItem('vf_user', JSON.stringify(resolvedUser));
          await loadUserWorkspace(resolvedUser);
          setActiveTab('dashboard');
          return true;
        }
      }
      return false;
    }
    throw new Error('Supabase não configurado. Por favor, adicione chaves de API válidas no arquivo .env.');
  };

  const register = async (name: string, email: string, company: string, password?: string): Promise<boolean> => {
    const cleanEmail = email.toLowerCase().trim();
    if (isSupabaseConfigured() && supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({
        email: cleanEmail,
        password: password || '',
        options: {
          data: {
            name,
            company,
          }
        }
      });
      if (error) {
        throw new Error(error.message);
      }
      if (data?.user) {
        // Create profile in saas_users table
        const plan: PlanTier = 'Free';
        const newUser: User = {
          id: data.user.id,
          name,
          email: cleanEmail,
          company,
          role: 'Membro',
          avatarUrl: '/assets/taysecardoso.jpg',
          subscription: plan,
          status: 'active',
          usageCurrent: 0,
          usageLimit: 5,
          storageUsedMB: 0,
          templatesUsed: 0,
          projectsActive: 0,
          subscriptionDetails: {
            id: `sub-${Math.random().toString(36).substr(2, 9)}`,
            userId: data.user.id,
            tier: plan,
            status: 'active',
            billingCycle: 'monthly',
            price: 0,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancelAtPeriodEnd: false,
            autoRenew: true
          }
        };
        await UserService.upsertUser(newUser);
        
        // If they are logged in right away
        if (data.session) {
          const savedUsers: User[] = JSON.parse(localStorage.getItem('vf_all_users') || '[]');
          const updatedUsersList = [newUser, ...savedUsers.filter(u => u.id !== newUser.id)];
          setAllUsers(updatedUsersList);
          localStorage.setItem('vf_all_users', JSON.stringify(updatedUsersList));
          setUser(newUser);
          sessionStorage.setItem('vf_user', JSON.stringify(newUser));
          await loadUserWorkspace(newUser);
          setActiveTab('dashboard');
        } else {
          showToast('Conta criada! Verifique seu e-mail para confirmar o cadastro.', 'success');
        }
        return true;
      }
      return false;
    }
    throw new Error('Supabase não configurado. Por favor, adicione chaves de API válidas no arquivo .env.');
  };

  const loginWithGoogle = async (): Promise<void> => {
    if (isSupabaseConfigured() && supabaseClient) {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) {
        throw new Error(error.message);
      }
    } else {
      throw new Error('Login com Google requer Supabase configurado.');
    }
  };


  const recoverPassword = async (email: string): Promise<string> => {
    if (isSupabaseConfigured() && supabaseClient) {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/recovery`,
      });
      if (error) {
        throw new Error(error.message);
      }
      return `Link de redefinição enviado para: ${email}`;
    }
    throw new Error('Supabase não configurado para recuperação de senha.');
  };

  const logout = async () => {
    setUser(null);
    setProjects([]);
    setTemplates([]);
    setRenderingTasks([]);
    setFolders([]);
    setInvoices([]);
    setLimitError(null);
    
    sessionStorage.removeItem('vf_user');
    localStorage.removeItem('vf_user');
    
    if (isSupabaseConfigured() && supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (err) {
        console.error('Erro ao deslogar do Supabase:', err);
      }
    }

    window.history.pushState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const updateUser = async (updatedUser: User): Promise<boolean> => {
    try {
      setUser(updatedUser);
      sessionStorage.setItem('vf_user', JSON.stringify(updatedUser));
      
      const savedUsers: User[] = JSON.parse(localStorage.getItem('vf_all_users') || '[]');
      const nextUsersList = [updatedUser, ...savedUsers.filter(u => u.id !== updatedUser.id)];
      setAllUsers(nextUsersList);
      localStorage.setItem('vf_all_users', JSON.stringify(nextUsersList));
      
      if (isSupabaseConfigured()) {
        const success = await UserService.upsertUser(updatedUser);
        if (!success) {
          console.warn('Sincronização falhou no Supabase, salvo localmente.');
        }
      }
      return true;
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      return false;
    }
  };

  // Projects Functions with Limit Checks
  const createProject = (name: string, description: string, templateId: string, aspect: AspectRatio, variables?: any): Project | null => {
    if (!verifyAndTriggerLimitExceeded('projects')) {
      showToast('Limite de projetos ativos atingido no seu plano atual!', 'error');
      return null;
    }

    try {
      const defaultVariables = {
        title: name,
        subtitles: ['Fábrica viral ativada...', 'Criando shorts em escala...'],
        brandColor: '#6366f1',
        fontName: 'Inter Regular'
      };

      const newProject: Project = {
        id: generateUUID(),
        name,
        description,
        templateId,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aspect,
        variables: variables ? { ...defaultVariables, ...variables } : defaultVariables
      };

      const updated = [newProject, ...projects];
      setProjects(updated);
      
      if (user) {
        localStorage.setItem(`vf_projects_${user.id}`, JSON.stringify(updated));
        const updatedUser: User = {
          ...user,
          projectsActive: updated.length
        };
        setUser(updatedUser);
        syncUserToAllUsers(updatedUser);
        loadUserWorkspace(updatedUser);

        if (isSupabaseConfigured()) {
          ProjectService.upsertProject(user.id, newProject)
            .then(() => {
              showToast(`Projeto "${name}" salvo com sucesso no banco de dados!`, 'success');
            })
            .catch((err) => {
              console.error('Erro ao sincronizar projeto com Supabase:', err);
              showToast('Projeto criado localmente, mas houve um erro ao salvar no banco de dados.', 'error');
            });
          UserService.upsertUser(updatedUser).catch(err => {
            console.error('Erro ao sincronizar estatísticas do usuário:', err);
          });
        } else {
          showToast(`Projeto "${name}" criado com sucesso!`, 'success');
        }
      } else {
        showToast(`Projeto "${name}" criado com sucesso!`, 'success');
      }

      return newProject;
    } catch (err: any) {
      console.error('Erro fatal durante a criação do projeto:', err);
      showToast('Houve um erro inesperado ao criar o projeto.', 'error');
      return null;
    }
  };

  const updateProject = (updatedProject: Project) => {
    const updated = projects.map(p => p.id === updatedProject.id ? { ...updatedProject, updatedAt: new Date().toISOString() } : p);
    setProjects(updated);
    if (user) {
      localStorage.setItem(`vf_projects_${user.id}`, JSON.stringify(updated));
      if (isSupabaseConfigured()) {
        const fullProj = updated.find(p => p.id === updatedProject.id);
        if (fullProj) ProjectService.upsertProject(user.id, fullProj);
      }
    }
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    if (user) {
      localStorage.setItem(`vf_projects_${user.id}`, JSON.stringify(updated));
      const updatedUser: User = {
        ...user,
        projectsActive: updated.length
      };
      setUser(updatedUser);
      syncUserToAllUsers(updatedUser);
      loadUserWorkspace(updatedUser);

      if (isSupabaseConfigured()) {
        ProjectService.deleteProject(id);
        UserService.upsertUser(updatedUser);
      }
    }
  };

  // Templates Functions with Limit Checks
  const createTemplate = (name: string, description: string, aspect: AspectRatio, defaultDuration: number, backgroundImageUrl?: string): Template | null => {
    if (!verifyAndTriggerLimitExceeded('templates')) {
      return null;
    }

    const newTemplate: Template = {
      id: `tpl-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      aspect,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      defaultDuration,
      scenesCount: 1,
      layers: [
        { id: `lyr-${Date.now()}-1`, type: 'text', name: 'Título Principal', defaultValue: 'Escreva algo aqui' },
        { id: `lyr-${Date.now()}-2`, type: 'image', name: 'Vídeo do Fundo', defaultValue: 'default_bg.mp4' }
      ]
    };

    if (backgroundImageUrl) {
      newTemplate.backgroundImageUrl = backgroundImageUrl;
    }

    const updated = [newTemplate, ...templates];
    setTemplates(updated);

    if (user) {
      localStorage.setItem(`vf_templates_${user.id}`, JSON.stringify(updated));
      const updatedUser: User = {
        ...user,
        templatesUsed: updated.length
      };
      setUser(updatedUser);
      syncUserToAllUsers(updatedUser);
      loadUserWorkspace(updatedUser);

      if (isSupabaseConfigured()) {
        TemplateService.upsertTemplate(user.id, newTemplate);
        UserService.upsertUser(updatedUser);
      }
    }

    return newTemplate;
  };

  const updateTemplate = (updatedTemplate: Template) => {
    const updated = templates.map(t => t.id === updatedTemplate.id ? { ...updatedTemplate, updatedAt: new Date().toISOString() } : t);
    setTemplates(updated);
    if (user) {
      localStorage.setItem(`vf_templates_${user.id}`, JSON.stringify(updated));
      if (isSupabaseConfigured()) {
        const fullTpl = updated.find(t => t.id === updatedTemplate.id);
        if (fullTpl) TemplateService.upsertTemplate(user.id, fullTpl);
      }
    }
  };

  const duplicateTemplate = (id: string): boolean => {
    if (!verifyAndTriggerLimitExceeded('templates')) {
      return false;
    }

    const target = templates.find(t => t.id === id);
    if (!target) return false;

    const duplicated: Template = {
      ...target,
      id: `tpl-${Math.random().toString(36).substr(2, 9)}`,
      name: `${target.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [duplicated, ...templates];
    setTemplates(updated);

    if (user) {
      localStorage.setItem(`vf_templates_${user.id}`, JSON.stringify(updated));
      const updatedUser: User = {
        ...user,
        templatesUsed: updated.length
      };
      setUser(updatedUser);
      syncUserToAllUsers(updatedUser);
      loadUserWorkspace(updatedUser);

      if (isSupabaseConfigured()) {
        TemplateService.upsertTemplate(user.id, duplicated);
        UserService.upsertUser(updatedUser);
      }
    }
    return true;
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    if (user) {
      localStorage.setItem(`vf_templates_${user.id}`, JSON.stringify(updated));
      const updatedUser: User = {
        ...user,
        templatesUsed: updated.length
      };
      setUser(updatedUser);
      syncUserToAllUsers(updatedUser);
      loadUserWorkspace(updatedUser);

      if (isSupabaseConfigured()) {
        TemplateService.deleteTemplate(id);
        UserService.upsertUser(updatedUser);
      }
    }
  };

  // Trigger Render with limit check
  const triggerRender = (projectIdOrProject: string | Project, isSandbox = false): boolean => {
    if (!verifyAndTriggerLimitExceeded('videos')) {
      return false;
    }

    let project: Project | undefined;
    if (typeof projectIdOrProject === 'object' && projectIdOrProject !== null) {
      project = projectIdOrProject;
    } else {
      project = projects.find(p => p.id === projectIdOrProject);
    }

    if (!project) return false;
    const projectId = project.id;

    const template = templates.find(t => t.id === project.templateId);
    const templateName = template ? template.name : 'Template Desconhecido';
    
    const displayProjectName = isSandbox ? `[Sandbox 3s] ${project.name}` : project.name;
    const displayDuration = isSandbox ? '0:03' : (template?.defaultDuration ? `0:${template.defaultDuration}` : '0:30');

    const taskId = generateUUID();
    const newTask: RenderingTask = {
      id: taskId,
      projectId,
      projectName: displayProjectName,
      templateName,
      status: 'queued',
      progress: 0,
      duration: displayDuration,
      createdAt: new Date().toISOString()
    };

    // Update project status to rendering
    const updatedProj: Project = { ...project, status: 'rendering' };
    updateProject(updatedProj);

    const updatedTasks = [newTask, ...renderingTasks];
    setRenderingTasks(updatedTasks);
    
    if (user) {
      localStorage.setItem(`vf_tasks_${user.id}`, JSON.stringify(updatedTasks));
      if (isSupabaseConfigured()) {
        RenderService.upsertRenderingTask(user.id, newTask);
      }

      // Sync local DB snapshot to the server file database first
      fetch(`/api/db/sync?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saas_users: [user],
          projects: [updatedProj, ...projects.filter(p => p.id !== projectId)],
          templates: templates,
          rendering_tasks: [
            {
              id: taskId,
              project_id: projectId,
              user_id: user.id,
              project_name: displayProjectName,
              template_name: templateName,
              status: 'queued',
              progress: 0,
              duration: displayDuration,
              created_at: newTask.createdAt
            }
          ],
          storage_folders: folders
        })
      }).catch(e => console.error('Failed to pre-sync DB', e));

      // Trigger Backend Render Pipeline
      authenticatedFetch('/api/render/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          userId: user.id,
          projectId,
          projectName: displayProjectName,
          templateId: project.templateId,
          templateName,
          duration: displayDuration,
          variables: {
            ...(project.variables || {}),
            isSandbox,
            duration: isSandbox ? 3 : (template?.defaultDuration || 30)
          }
        })
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('API server returned error code');
        }
        return res.json();
      })
      .then(data => {
        if (data.job) {
          const backendJobId = data.job.id;
          showToast(`Processamento do vídeo "${project.name}" enviado para a fila do servidor!`, 'info');

          // Poll progress
          const pollInterval = setInterval(() => {
            authenticatedFetch(`/api/render/job/${backendJobId}`)
              .then(res => res.json())
              .then(job => {
                if (job) {
                  const mappedStatus = (
                    job.status === 'Completed' ? 'completed' :
                    job.status === 'Failed' ? 'failed' :
                    job.status === 'Canceled' ? 'failed' : 'processing'
                  ) as any;

                  setRenderingTasks(prevTasks => {
                    const next = prevTasks.map(t => {
                      if (t.id === taskId) {
                        return {
                          ...t,
                          status: mappedStatus,
                          progress: job.progress,
                          renderTime: job.renderTime,
                          outputUrl: job.outputUrl,
                          thumbnailUrl: job.thumbnailUrl,
                          completedAt: job.completedAt,
                          logs: job.logs,
                          errorMessage: job.error || job.errorMessage,
                          debugInfo: job.debugInfo
                        };
                      }
                      return t;
                    });
                    localStorage.setItem(`vf_tasks_${user.id}`, JSON.stringify(next));
                    return next;
                  });

                  if (job.status === 'Completed') {
                    clearInterval(pollInterval);
                    
                    // Sync finished project outputs back to frontend projects state
                    setProjects(prevProjects => {
                      const nextProjects = prevProjects.map(p => {
                        if (p.id === projectId) {
                          return {
                            ...p,
                            status: 'completed' as const,
                            videoUrl: job.outputUrl,
                            updatedAt: new Date().toISOString()
                          };
                        }
                        return p;
                      });
                      localStorage.setItem(`vf_projects_${user.id}`, JSON.stringify(nextProjects));
                      return nextProjects;
                    });

                    // Trigger general workspace file systems refresh
                    loadUserWorkspace(user);
                    showToast(`Vídeo "${project.name}" renderizado com sucesso no backend!`, 'success');
                  } else if (job.status === 'Failed' || job.status === 'Canceled') {
                    clearInterval(pollInterval);
                    
                    // Revert project status to failed
                    setProjects(prevProjects => {
                      const nextProjects = prevProjects.map(p => {
                        if (p.id === projectId) {
                          return { ...p, status: 'failed' as const };
                        }
                        return p;
                      });
                      localStorage.setItem(`vf_projects_${user.id}`, JSON.stringify(nextProjects));
                      return nextProjects;
                    });

                    showToast(`Renderização falhou: ${job.error || 'Erro no motor de vídeo'}`, 'error');
                  }
                }
              })
              .catch(e => console.error('Failed polling render job status:', e));
          }, 1500);
        }
      })
      .catch(err => {
        console.error('Render trigger API submission failed:', err);
        showToast(`Falha ao enviar renderização: ${err.message || 'Erro no servidor'}`, 'error');
        setRenderingTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, status: 'failed', errorMessage: err.message } : t));
      });
    }

    return true;
  };

  const deleteRenderingTask = (id: string) => {
    const nextTasks = renderingTasks.filter(t => t.id !== id);
    setRenderingTasks(nextTasks);
    if (user) {
      localStorage.setItem(`vf_tasks_${user.id}`, JSON.stringify(nextTasks));
      if (isSupabaseConfigured()) {
        RenderService.deleteRenderingTask(user.id, id);
      }
    }
  };

  const duplicateRenderingTask = (id: string) => {
    const original = renderingTasks.find(t => t.id === id);
    if (!original) return;
    const newTask: RenderingTask = {
      ...original,
      id: `rnd-${Math.random().toString(36).substr(2, 9)}`,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString()
    };
    const nextTasks = [newTask, ...renderingTasks];
    setRenderingTasks(nextTasks);
    if (user) {
      localStorage.setItem(`vf_tasks_${user.id}`, JSON.stringify(nextTasks));
      if (isSupabaseConfigured()) {
        RenderService.upsertRenderingTask(user.id, newTask);
      }
    }
  };

  // Storage Functions with Limit Checks
  const uploadFileToFolder = (folderId: string, fileName: string, fileSize: string, fileType: StorageFile['type']): boolean => {
    const fileMB = parseSizeToMB(fileSize);
    if (!verifyAndTriggerLimitExceeded('storage', fileMB)) {
      return false;
    }

    const newFile: StorageFile = {
      id: `f-${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      size: fileSize,
      type: fileType,
      url: `/storage/${folderId === 'fld-uploads' || folderId === 'uploads' ? 'uploads' : folderId === 'fld-templates' || folderId === 'templates' ? 'templates' : 'rendered'}/${fileName}`,
      createdAt: new Date().toISOString()
    };

    const nextFolders = folders.map(folder => {
      if (folder.id === folderId) {
        return {
          ...folder,
          files: [newFile, ...folder.files]
        };
      }
      return folder;
    });

    setFolders(nextFolders);
    
    if (user) {
      localStorage.setItem(`vf_folders_${user.id}`, JSON.stringify(nextFolders));
      
      let nextStorageMB = 0;
      nextFolders.forEach(folder => {
        folder.files.forEach(file => {
          nextStorageMB += parseSizeToMB(file.size);
        });
      });

      const updatedUser: User = {
        ...user,
        storageUsedMB: parseFloat(nextStorageMB.toFixed(2))
      };
      setUser(updatedUser);
      syncUserToAllUsers(updatedUser);
      loadUserWorkspace(updatedUser);

      if (isSupabaseConfigured()) {
        StorageService.upsertFolders(user.id, nextFolders);
        UserService.upsertUser(updatedUser);
      }
    }
    return true;
  };

  const deleteFileFromFolder = (folderId: string, fileId: string) => {
    const nextFolders = folders.map(folder => {
      if (folder.id === folderId) {
        return {
          ...folder,
          files: folder.files.filter(f => f.id !== fileId)
        };
      }
      return folder;
    });

    setFolders(nextFolders);
    
    if (user) {
      localStorage.setItem(`vf_folders_${user.id}`, JSON.stringify(nextFolders));
      
      let nextStorageMB = 0;
      nextFolders.forEach(folder => {
        folder.files.forEach(file => {
          nextStorageMB += parseSizeToMB(file.size);
        });
      });

      const updatedUser: User = {
        ...user,
        storageUsedMB: parseFloat(nextStorageMB.toFixed(2))
      };
      setUser(updatedUser);
      syncUserToAllUsers(updatedUser);
      loadUserWorkspace(updatedUser);

      if (isSupabaseConfigured()) {
        StorageService.upsertFolders(user.id, nextFolders);
        UserService.upsertUser(updatedUser);
      }
    }
  };

  const createFolder = (name: string, description?: string) => {
    const newFolder: StorageFolder = {
      id: `fld-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: description || 'Pasta criada pelo usuário',
      path: `/${name.toLowerCase().replace(/\s+/g, '-')}`,
      files: []
    };
    const nextFolders = [...folders, newFolder];
    setFolders(nextFolders);
    if (user) {
      localStorage.setItem(`vf_folders_${user.id}`, JSON.stringify(nextFolders));
      if (isSupabaseConfigured()) {
        StorageService.upsertFolders(user.id, nextFolders);
      }
    }
  };

  const renameFolder = (id: string, name: string) => {
    const nextFolders = folders.map(f => {
      if (f.id === id) {
        return {
          ...f,
          name,
          path: `/${name.toLowerCase().replace(/\s+/g, '-')}`
        };
      }
      return f;
    });
    setFolders(nextFolders);
    if (user) {
      localStorage.setItem(`vf_folders_${user.id}`, JSON.stringify(nextFolders));
      if (isSupabaseConfigured()) {
        StorageService.upsertFolders(user.id, nextFolders);
      }
    }
  };

  const deleteFolder = (id: string) => {
    const nextFolders = folders.filter(f => f.id !== id);
    setFolders(nextFolders);
    if (user) {
      localStorage.setItem(`vf_folders_${user.id}`, JSON.stringify(nextFolders));
      if (isSupabaseConfigured()) {
        StorageService.upsertFolders(user.id, nextFolders);
      }
    }
  };

  const moveFile = (srcFolderId: string, destFolderId: string, fileId: string) => {
    const srcFolder = folders.find(f => f.id === srcFolderId);
    if (!srcFolder) return;
    const fileToMove = srcFolder.files.find(f => f.id === fileId);
    if (!fileToMove) return;

    const nextFolders = folders.map(folder => {
      if (folder.id === srcFolderId) {
        return {
          ...folder,
          files: folder.files.filter(f => f.id !== fileId)
        };
      }
      if (folder.id === destFolderId) {
        return {
          ...folder,
          files: [fileToMove, ...folder.files]
        };
      }
      return folder;
    });

    setFolders(nextFolders);
    if (user) {
      localStorage.setItem(`vf_folders_${user.id}`, JSON.stringify(nextFolders));
      if (isSupabaseConfigured()) {
        StorageService.upsertFolders(user.id, nextFolders);
      }
    }
  };

  // Change Subscription Plan Lógica
  const changeSubscription = (tier: PlanTier, cycle: BillingCycle) => {
    if (!user) return;

    const planConfig = PLANS_DETAILS.find(p => p.tier === tier);
    if (!planConfig) return;

    const price = cycle === 'annual' ? planConfig.priceAnnual * 12 : planConfig.priceMonthly;

    // Create a new active mock subscription
    const newSub: UserSubscription = {
      id: `sub-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      tier,
      status: 'active',
      billingCycle: cycle,
      price,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + (cycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true
    };

    // Append new invoice
    const newInvoice: Invoice = {
      id: `inv-${Math.random().toString(36).substr(2, 6)}`,
      subscriptionId: newSub.id,
      userId: user.id,
      amount: price,
      status: 'paid',
      dueDate: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      pdfUrl: '#',
      billingPeriodStart: newSub.startDate,
      billingPeriodEnd: newSub.endDate,
    };

    const nextInvoices = [newInvoice, ...invoices];
    setInvoices(nextInvoices);
    localStorage.setItem(`vf_invoices_${user.id}`, JSON.stringify(nextInvoices));

    // Update main user object
    const updatedUser: User = {
      ...user,
      subscription: tier,
      usageLimit: planConfig.limits.maxVideosPerMonth,
      subscriptionDetails: newSub
    };

    setUser(updatedUser);
    syncUserToAllUsers(updatedUser);
    loadUserWorkspace(updatedUser);
  };

  const cancelSubscription = () => {
    if (!user || !user.subscriptionDetails) return;

    const updatedSub: UserSubscription = {
      ...user.subscriptionDetails,
      cancelAtPeriodEnd: true,
      autoRenew: false
    };

    const updatedUser: User = {
      ...user,
      subscriptionDetails: updatedSub
    };

    setUser(updatedUser);
    syncUserToAllUsers(updatedUser);
  };

  // Mock auto renewal simulator
  const triggerMockRenewal = () => {
    if (!user || !user.subscriptionDetails) return;

    const oldSub = user.subscriptionDetails;
    const price = oldSub.price;

    const newInvoice: Invoice = {
      id: `inv-${Math.random().toString(36).substr(2, 6)}`,
      subscriptionId: oldSub.id,
      userId: user.id,
      amount: price,
      status: 'paid',
      dueDate: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      pdfUrl: '#',
      billingPeriodStart: new Date().toISOString(),
      billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const nextInvoices = [newInvoice, ...invoices];
    setInvoices(nextInvoices);
    localStorage.setItem(`vf_invoices_${user.id}`, JSON.stringify(nextInvoices));

    // Reset current monthly usage counter on renewal!
    const updatedUser: User = {
      ...user,
      usageCurrent: 0,
      subscriptionDetails: {
        ...oldSub,
        startDate: newInvoice.billingPeriodStart,
        endDate: newInvoice.billingPeriodEnd,
      }
    };

    setUser(updatedUser);
    syncUserToAllUsers(updatedUser);
    loadUserWorkspace(updatedUser);
  };

  // SaaS Admin: Core management functions and audit trail logs
  const logAdminAction = useCallback((action: string, targetUser: string, status: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS') => {
    try {
      const savedLogs = localStorage.getItem('vf_audit_logs');
      const currentLogs = savedLogs ? JSON.parse(savedLogs) : [
        { id: 'aud-001', adminName: 'Gabriel (SUPER_ADMIN)', action: 'Impersonated User Session', targetUser: 'Bruna Silva (bruna@ecom.com)', timestamp: '2026-07-01 11:42:01', ip: '186.204.14.22', status: 'SUCCESS' },
        { id: 'aud-002', adminName: 'Gabriel (SUPER_ADMIN)', action: 'Adjusted Storage Quotas (+500MB)', targetUser: 'Lucas Santos (lucas@agency.io)', timestamp: '2026-07-01 11:38:15', ip: '186.204.14.22', status: 'SUCCESS' },
        { id: 'aud-003', adminName: 'Gabriel (SUPER_ADMIN)', action: 'Changed Subscription Plan to Pro', targetUser: 'Renata Souza (renata@vlog.com)', timestamp: '2026-07-01 11:15:30', ip: '186.204.14.22', status: 'SUCCESS' },
        { id: 'aud-004', adminName: 'Suporte Dev (DESENVOLVEDOR)', action: 'Rebooted Cluster Node: Delta', targetUser: 'Cluster US-EAST-01', timestamp: '2026-07-01 10:44:12', ip: '191.144.11.2', status: 'SUCCESS' },
        { id: 'aud-005', adminName: 'Gabriel (SUPER_ADMIN)', action: 'Suspended Account due to abuse', targetUser: 'Hacker User (hack@test.com)', timestamp: '2026-06-30 23:55:00', ip: '186.204.14.22', status: 'SUCCESS' }
      ];
      const adminName = originalAdminUser ? `${originalAdminUser.name} (Modo Suporte)` : (user ? `${user.name} (SaaS OWNER)` : 'Gabriel Moura');
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newLog = {
        id: `aud-${Date.now()}`,
        adminName,
        action,
        targetUser,
        timestamp,
        ip: '186.204.14.22',
        status
      };
      const nextLogs = [newLog, ...currentLogs];
      localStorage.setItem('vf_audit_logs', JSON.stringify(nextLogs));
      
      // Notify active listeners
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('Failed to log admin action', e);
    }
  }, [user, originalAdminUser]);

  const adminUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const res = await adminFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const uRes = await adminFetch('/api/admin/users');
        if (uRes.ok) {
          const data = await uRes.json();
          setAllUsers(data);
          if (user && user.id === userId) {
            const matched = data.find((u: User) => u.id === userId);
            if (matched) {
              setUser(matched);
              sessionStorage.setItem('vf_user', JSON.stringify(matched));
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to update user via Express API:', err);
    }
  };

  const adminDeleteUser = async (userId: string) => {
    try {
      const res = await adminFetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const uRes = await adminFetch('/api/admin/users');
        if (uRes.ok) {
          const data = await uRes.json();
          setAllUsers(data);
        }
      }
    } catch (err) {
      console.error('Failed to delete user via Express API:', err);
    }

    if (user && user.id === userId) {
      logout();
    }
  };

  const impersonateUser = useCallback((targetUser: User) => {
    if (user && !originalAdminUser) {
      setOriginalAdminUser(user);
      localStorage.setItem('vf_original_admin', JSON.stringify(user));
    }
    logAdminAction('Impersonated User Session', `${targetUser.name} (${targetUser.email})`, 'SUCCESS');
    setUser(targetUser);
    sessionStorage.setItem('vf_user', JSON.stringify(targetUser));
    loadUserWorkspace(targetUser);
    setActiveTab('dashboard');
    showToast(`Sessão assumida: operando como ${targetUser.name}`, 'success');
  }, [user, originalAdminUser, setActiveTab, logAdminAction]);

  const stopImpersonating = useCallback(() => {
    if (originalAdminUser) {
      logAdminAction('Stopped Impersonating User Session', `${user?.name || ''}`, 'SUCCESS');
      setUser(originalAdminUser);
      sessionStorage.setItem('vf_user', JSON.stringify(originalAdminUser));
      loadUserWorkspace(originalAdminUser);
      setOriginalAdminUser(null);
      localStorage.removeItem('vf_original_admin');
      setActiveTab('admin');
      showToast('Sessão encerrada. Retornado ao painel admin.', 'success');
    }
  }, [originalAdminUser, user, setActiveTab, logAdminAction]);

  const adminResetSystem = useCallback((cleanMode: 'zero' | 'demo') => {
    if (cleanMode === 'zero') {
      const currentAdmin = user || {
        id: 'usr-current',
        name: 'Administrador',
        email: 'admin@sistema.com',
        company: 'Empresa',
        role: 'SaaS_Owner',
        avatarUrl: '/assets/paulodeborbamoraes.jpg',
        subscription: 'Pro',
        status: 'active',
        usageCurrent: 0,
        usageLimit: 100,
        storageUsedMB: 0,
        templatesUsed: 0,
        projectsActive: 0
      };

      const freshUsers = [currentAdmin];
      setAllUsers(freshUsers);
      localStorage.setItem('vf_all_users', JSON.stringify(freshUsers));
      setUser(currentAdmin);
      sessionStorage.setItem('vf_user', JSON.stringify(currentAdmin));
      
      localStorage.setItem('vf_plans', JSON.stringify([]));
      localStorage.setItem('vf_coupons', JSON.stringify([]));
      localStorage.setItem('vf_tickets', JSON.stringify([]));
      localStorage.setItem('vf_smtp_queue', JSON.stringify([]));
      localStorage.setItem('vf_invoices', JSON.stringify([]));
      
      const emptyAuditLogs = [
        {
          id: `aud-${Date.now()}`,
          adminName: 'Gabriel Moura (SaaS OWNER)',
          action: 'System Database Purge (Zerar Tudo)',
          targetUser: 'All tables emptied except Owner Account',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          ip: '127.0.0.1',
          status: 'SUCCESS' as const
        }
      ];
      localStorage.setItem('vf_audit_logs', JSON.stringify(emptyAuditLogs));
      
      localStorage.setItem('vf_storage_cacheSize', '0');
      localStorage.setItem('vf_storage_orphanCount', '0');
      localStorage.setItem('vf_storage_directories', JSON.stringify([]));

      showToast('Banco de dados limpo com sucesso! Todos os dados de mockup foram deletados.', 'success');
    } else {
      localStorage.removeItem('vf_all_users');
      localStorage.removeItem('vf_plans');
      localStorage.removeItem('vf_coupons');
      localStorage.removeItem('vf_tickets');
      localStorage.removeItem('vf_smtp_queue');
      localStorage.removeItem('vf_invoices');
      localStorage.removeItem('vf_audit_logs');
      localStorage.removeItem('vf_storage_cacheSize');
      localStorage.removeItem('vf_storage_orphanCount');
      localStorage.removeItem('vf_storage_directories');
      
      showToast('Padrões de demonstração e teste restaurados! Recarregando...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    window.dispatchEvent(new Event('storage'));
  }, [allUsers]);

  const isImpersonating = !!originalAdminUser;

  return (
    <AppContext.Provider
      value={{
        user,
        activeTab,
        setActiveTab,
        projects,
        templates,
        renderingTasks,
        folders,
        stats,
        toasts,
        showToast,
        login,
        register,
        loginWithGoogle,
        recoverPassword,
        logout,
        updateUser,
        createProject,
        updateProject,
        deleteProject,
        createTemplate,
        updateTemplate,
        duplicateTemplate,
        deleteTemplate,
        triggerRender,
        deleteRenderingTask,
        duplicateRenderingTask,
        uploadFileToFolder,
        deleteFileFromFolder,
        createFolder,
        renameFolder,
        deleteFolder,
        moveFile,
        changeSubscription,
        cancelSubscription,
        invoices,
        triggerMockRenewal,
        limitError,
        clearLimitError,
        allUsers,
        refreshAdminData,
        adminUpdateUser,
        adminDeleteUser,
        impersonateUser,
        stopImpersonating,
        isImpersonating,
        originalAdminUser,
        logAdminAction,
        adminResetSystem
      }}
    >
      {children}

      {/* Floating Toast Notification Stack */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = toast.type === 'success' 
              ? CheckCircle 
              : toast.type === 'error' 
                ? AlertCircle 
                : Info;
            
            const accentColor = toast.type === 'success'
              ? 'border-emerald-500/30 shadow-emerald-500/5'
              : toast.type === 'error'
                ? 'border-rose-500/30 shadow-rose-500/5'
                : 'border-indigo-500/30 shadow-indigo-500/5';

            const iconColor = toast.type === 'success'
              ? 'text-emerald-400'
              : toast.type === 'error'
                ? 'text-rose-400'
                : 'text-indigo-400';

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                className={`pointer-events-auto flex items-start gap-3 bg-gray-950/95 backdrop-blur-md border ${accentColor} rounded-xl p-4 shadow-xl text-xs font-medium text-gray-200`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
                <div className="flex-1 leading-relaxed">{toast.message}</div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-gray-500 hover:text-gray-300 transition shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
