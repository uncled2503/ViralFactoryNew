/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  BillingCycle,
  UserSubscription,
  Invoice,
} from '../types';
import { PLAN_LIMITS_MAP, PLANS_DETAILS } from '../config/plans';
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
  logout: () => void;
  updateUser: (updatedUser: User) => Promise<boolean>;
  
  // Projects Functions
  createProject: (name: string, description: string, templateId: string, aspect: AspectRatio, variables?: any) => Project | null;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (id: string) => void;
  
  // Templates Functions
  createTemplate: (name: string, description: string, aspect: AspectRatio, defaultDuration: number) => Template | null;
  updateTemplate: (updatedTemplate: Template) => void;
  duplicateTemplate: (id: string) => boolean;
  deleteTemplate: (id: string) => void;
  
  // Render System
  triggerRender: (projectId: string) => boolean;
  
  // Storage System
  uploadFileToFolder: (folderId: string, fileName: string, fileSize: string, fileType: StorageFile['type']) => boolean;
  deleteFileFromFolder: (folderId: string, fileId: string) => void;

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
  adminUpdateUser: (userId: string, updates: Partial<User>) => void;
  adminDeleteUser: (userId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Core Mock Users for Admin Dashboard Initial State
const MOCK_ADMIN_USERS: User[] = [
  {
    id: 'usr-001',
    name: 'Gabriel Moura',
    email: 'mouragabriel2011@gmail.com',
    company: 'Viral S.A.',
    role: 'SaaS_Owner', // Main user can access SaaS Admin!
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop',
    subscription: 'Pro',
    status: 'active',
    usageCurrent: 142,
    usageLimit: 2000,
    storageUsedMB: 1840, // 1.84 GB
    templatesUsed: 4,
    projectsActive: 3,
    subscriptionDetails: {
      id: 'sub-001',
      userId: 'usr-001',
      tier: 'Pro',
      status: 'active',
      billingCycle: 'monthly',
      price: 149,
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true
    }
  },
  {
    id: 'usr-002',
    name: 'Bruna Silva',
    email: 'bruna@ecom.com',
    company: 'Dropshipping Brasil',
    role: 'Administrador',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&fit=crop',
    subscription: 'Starter',
    status: 'active',
    usageCurrent: 87,
    usageLimit: 100,
    storageUsedMB: 1224, // 1.2 GB
    templatesUsed: 3,
    projectsActive: 4,
    subscriptionDetails: {
      id: 'sub-002',
      userId: 'usr-002',
      tier: 'Starter',
      status: 'active',
      billingCycle: 'monthly',
      price: 49,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true
    }
  },
  {
    id: 'usr-003',
    name: 'Lucas Santos',
    email: 'lucas@agency.io',
    company: 'Selo Criativo',
    role: 'Administrador',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&fit=crop',
    subscription: 'Pro',
    status: 'active',
    usageCurrent: 1240,
    usageLimit: 2000,
    storageUsedMB: 48500, // 48.5 GB
    templatesUsed: 12,
    projectsActive: 18,
    subscriptionDetails: {
      id: 'sub-003',
      userId: 'usr-003',
      tier: 'Pro',
      status: 'active',
      billingCycle: 'annual',
      price: 1428, // 119 * 12
      startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 245 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true
    }
  },
  {
    id: 'usr-004',
    name: 'Mariana Costa',
    email: 'mariana@tech.com',
    company: 'TechGrowth Media',
    role: 'Administrador',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=256&h=256&fit=crop',
    subscription: 'Business',
    status: 'active',
    usageCurrent: 3840,
    usageLimit: 10000,
    storageUsedMB: 380400, // 380.4 GB
    templatesUsed: 38,
    projectsActive: 52,
    subscriptionDetails: {
      id: 'sub-004',
      userId: 'usr-004',
      tier: 'Business',
      status: 'active',
      billingCycle: 'monthly',
      price: 499,
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: true
    }
  },
  {
    id: 'usr-005',
    name: 'Tiago Souza',
    email: 'tiago@spam.com',
    company: 'LeadGen Inc',
    role: 'Membro',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256&h=256&fit=crop',
    subscription: 'Starter',
    status: 'suspended', // Suspended account!
    usageCurrent: 14,
    usageLimit: 100,
    storageUsedMB: 154,
    templatesUsed: 1,
    projectsActive: 1,
    subscriptionDetails: {
      id: 'sub-005',
      userId: 'usr-005',
      tier: 'Starter',
      status: 'suspended',
      billingCycle: 'monthly',
      price: 49,
      startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      autoRenew: false
    }
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  
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
      currentAllUsers = MOCK_ADMIN_USERS;
      setAllUsers(MOCK_ADMIN_USERS);
      localStorage.setItem('vf_all_users', JSON.stringify(MOCK_ADMIN_USERS));
    }

    // Load active session user
    const savedUser = localStorage.getItem('vf_user');
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
            const plan: PlanTier = 'Starter';
            const userMetadata = supabaseUser.user_metadata || {};
            const name = userMetadata.full_name || userMetadata.name || supabaseUser.email?.split('@')[0] || 'Usuário Google';
            const company = userMetadata.company || 'Minha Empresa';
            
            resolvedUser = {
              id: supabaseUser.id,
              name,
              email: supabaseUser.email || '',
              company,
              role: 'Administrador',
              avatarUrl: userMetadata.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&h=256&fit=crop',
              subscription: plan,
              status: 'active',
              usageCurrent: 0,
              usageLimit: PLAN_LIMITS_MAP[plan].maxVideosPerMonth,
              storageUsedMB: 0,
              templatesUsed: 0,
              projectsActive: 0,
              subscriptionDetails: {
                id: `sub-${Math.random().toString(36).substr(2, 9)}`,
                userId: supabaseUser.id,
                tier: plan,
                status: 'active',
                billingCycle: 'monthly',
                price: 49,
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
          localStorage.setItem('vf_user', JSON.stringify(resolvedUser));
          await loadUserWorkspace(resolvedUser);
          setActiveTab('dashboard');
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
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

    // 1. Projects
    const userProjectsKey = `vf_projects_${userId}`;
    const savedProjects = localStorage.getItem(userProjectsKey);
    let curProjects: Project[] = [];
    if (savedProjects) {
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
    if (savedTasks) {
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
    if (savedFolders) {
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
    if (savedInvoices) {
      curInvoices = JSON.parse(savedInvoices);
    } else {
      curInvoices = [
        {
          id: `inv-${Math.random().toString(36).substr(2, 6)}`,
          subscriptionId: targetUser.subscriptionDetails?.id || 'sub-001',
          userId: userId,
          amount: targetUser.subscriptionDetails?.price || 49,
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
          amount: targetUser.subscriptionDetails?.price || 49,
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

      const limitsConfig = PLAN_LIMITS_MAP[loadedUser.subscription];
      const isolatedStats: SystemStats = {
        totalVideosRendered: loadedUser.usageCurrent + 24,
        totalRenderingMinutes: Math.ceil(loadedUser.usageCurrent * 0.8) + 12,
        activeTemplates: loadedTemplates.length,
        activeProjects: loadedProjects.length,
        storageUsed: `${totalStorageMB.toFixed(1)} MB / ${(limitsConfig.maxStorageMB).toLocaleString('pt-BR')} MB`,
        renderSuccessRate: 98.8
      };
      setStats(isolatedStats);

      const updatedUser: User = {
        ...loadedUser,
        templatesUsed: loadedTemplates.length,
        projectsActive: loadedProjects.length,
        storageUsedMB: parseFloat(totalStorageMB.toFixed(2)),
      };
      setUser(updatedUser);
      localStorage.setItem('vf_user', JSON.stringify(updatedUser));
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
    if (!user) return false;

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

    const limits = PLAN_LIMITS_MAP[user.subscription];

    if (type === 'projects') {
      const activeProjectsCount = projects.filter(p => p.status !== 'completed' && p.status !== 'failed').length;
      if (activeProjectsCount >= limits.maxProjects) {
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
          localStorage.setItem('vf_user', JSON.stringify(resolvedUser));
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
            role: 'Administrador',
            avatarUrl: data.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&h=256&fit=crop',
            subscription: plan,
            status: 'active',
            usageCurrent: 0,
            usageLimit: PLAN_LIMITS_MAP[plan].maxVideosPerMonth,
            storageUsedMB: 0,
            templatesUsed: 0,
            projectsActive: 0,
            subscriptionDetails: {
              id: `sub-${Math.random().toString(36).substr(2, 9)}`,
              userId: data.user.id,
              tier: plan,
              status: 'active',
              billingCycle: 'monthly',
              price: 49,
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
          localStorage.setItem('vf_user', JSON.stringify(resolvedUser));
          await loadUserWorkspace(resolvedUser);
          setActiveTab('dashboard');
          return true;
        }
      }
      return false;
    }

    // Local Storage Real Fallback Auth Flow
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        const savedUsers: User[] = JSON.parse(localStorage.getItem('vf_all_users') || '[]');
        const resolvedUser = savedUsers.find(u => u.email.toLowerCase().trim() === cleanEmail);
        
        if (!resolvedUser) {
          reject(new Error('Este e-mail não está cadastrado. Crie uma conta para continuar.'));
          return;
        }

        const savedPassword = localStorage.getItem(`vf_pwd_${cleanEmail}`);
        const isMockUser = MOCK_ADMIN_USERS.some(u => u.email.toLowerCase().trim() === cleanEmail);
        
        if (!isMockUser && savedPassword && savedPassword !== password) {
          reject(new Error('Senha incorreta. Verifique suas credenciais.'));
          return;
        }

        // Successfully logged in
        setUser(resolvedUser);
        localStorage.setItem('vf_user', JSON.stringify(resolvedUser));
        await loadUserWorkspace(resolvedUser);
        setActiveTab('dashboard');
        resolve(true);
      }, 500);
    });
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
        const plan: PlanTier = 'Starter';
        const newUser: User = {
          id: data.user.id,
          name,
          email: cleanEmail,
          company,
          role: 'Administrador',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop',
          subscription: plan,
          status: 'active',
          usageCurrent: 0,
          usageLimit: PLAN_LIMITS_MAP[plan].maxVideosPerMonth,
          storageUsedMB: 0,
          templatesUsed: 0,
          projectsActive: 0,
          subscriptionDetails: {
            id: `sub-${Math.random().toString(36).substr(2, 9)}`,
            userId: data.user.id,
            tier: plan,
            status: 'active',
            billingCycle: 'monthly',
            price: 49,
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
          localStorage.setItem('vf_user', JSON.stringify(newUser));
          await loadUserWorkspace(newUser);
          setActiveTab('dashboard');
        } else {
          showToast('Conta criada! Verifique seu e-mail para confirmar o cadastro.', 'success');
        }
        return true;
      }
      return false;
    }

    // Local Storage Real Fallback Auth Flow
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        const savedUsers: User[] = JSON.parse(localStorage.getItem('vf_all_users') || '[]');
        const existingUser = savedUsers.find(u => u.email.toLowerCase().trim() === cleanEmail);
        
        if (existingUser) {
          reject(new Error('Este e-mail já está cadastrado. Faça login para continuar.'));
          return;
        }

        const plan: PlanTier = 'Starter';
        const newUser: User = {
          id: `usr-${Math.random().toString(36).substr(2, 9)}`,
          name,
          email: cleanEmail,
          company,
          role: 'Administrador',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop',
          subscription: plan,
          status: 'active',
          usageCurrent: 0,
          usageLimit: PLAN_LIMITS_MAP[plan].maxVideosPerMonth,
          storageUsedMB: 0,
          templatesUsed: 0,
          projectsActive: 0,
          subscriptionDetails: {
            id: `sub-${Math.random().toString(36).substr(2, 9)}`,
            userId: `usr-${Math.random().toString(36).substr(2, 9)}`,
            tier: plan,
            status: 'active',
            billingCycle: 'monthly',
            price: 49,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancelAtPeriodEnd: false,
            autoRenew: true
          }
        };

        // Save password
        if (password) {
          localStorage.setItem(`vf_pwd_${cleanEmail}`, password);
        }

        const nextUsersList = [...savedUsers, newUser];
        setAllUsers(nextUsersList);
        localStorage.setItem('vf_all_users', JSON.stringify(nextUsersList));

        setUser(newUser);
        localStorage.setItem('vf_user', JSON.stringify(newUser));
        await loadUserWorkspace(newUser);
        setActiveTab('dashboard');
        resolve(true);
      }, 500);
    });
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
      // Simulate OAuth Popup Flow for offline testing so it is beautiful and fully testable!
      return new Promise<void>((resolve, reject) => {
        showToast('Iniciando conexão segura com a Conta Google...', 'info');
        
        // Open a gorgeous mock popup
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          '',
          'google_oauth_popup',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (popup) {
          popup.document.write(`
            <html>
              <head>
                <title>Fazer login com o Google</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                <style>
                  body { background-color: #030712; color: #f3f4f6; font-family: ui-sans-serif, system-ui; }
                </style>
              </head>
              <body class="flex flex-col items-center justify-center h-screen px-6 text-center">
                <div class="mb-6">
                  <svg class="w-12 h-12 mx-auto text-indigo-500" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <h2 class="text-sm font-bold mb-1 text-gray-100">Selecionar Conta Google</h2>
                <p class="text-[11px] text-gray-400 mb-6">para continuar no Viral Factory</p>
                
                <div class="w-full space-y-3">
                  <button id="select-btn" class="w-full p-4 bg-gray-900 hover:bg-gray-850 rounded-xl border border-gray-800 flex items-center gap-3 text-left transition">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=64&h=64&fit=crop" class="w-8 h-8 rounded-full border border-indigo-500/30"/>
                    <div>
                      <div class="text-xs font-bold text-gray-200">Gabriel Moura</div>
                      <div class="text-[10px] text-gray-500">mouragabriel2011@gmail.com</div>
                    </div>
                  </button>
                  
                  <button id="other-btn" class="w-full p-3 bg-gray-950 hover:bg-gray-900 rounded-xl border border-gray-900 text-xs font-semibold text-gray-400 transition">
                    Usar outra conta
                  </button>
                </div>
                
                <p class="text-[9px] text-gray-600 mt-8">
                  Para fins de teste sem chaves de API, este popup simula o comportamento real do Google OAuth. Configure as credenciais no .env para integrar as contas de produção.
                </p>
                
                <script>
                  document.getElementById('select-btn').addEventListener('click', () => {
                    window.opener.postMessage({
                      type: 'MOCK_GOOGLE_AUTH_SUCCESS',
                      user: {
                        name: 'Gabriel Moura',
                        email: 'mouragabriel2011@gmail.com',
                        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop'
                      }
                    }, '*');
                    window.close();
                  });
                  
                  document.getElementById('other-btn').addEventListener('click', () => {
                    const email = prompt('Digite o e-mail da sua conta Google:');
                    if (email) {
                      const name = email.split('@')[0].replace('.', ' ');
                      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
                      window.opener.postMessage({
                        type: 'MOCK_GOOGLE_AUTH_SUCCESS',
                        user: {
                          name: formattedName,
                          email: email,
                          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&h=256&fit=crop'
                        }
                      }, '*');
                    }
                    window.close();
                  });
                </script>
              </body>
            </html>
          `);
          
          const handlePopupMessage = async (event: MessageEvent) => {
            if (event.data?.type === 'MOCK_GOOGLE_AUTH_SUCCESS') {
              window.removeEventListener('message', handlePopupMessage);
              const googleUser = event.data.user;
              
              const savedUsers: User[] = JSON.parse(localStorage.getItem('vf_all_users') || '[]');
              let resolvedUser = savedUsers.find(u => u.email.toLowerCase().trim() === googleUser.email.toLowerCase().trim());
              
              if (!resolvedUser) {
                const plan: PlanTier = 'Starter';
                resolvedUser = {
                  id: `usr-ggl-${Math.random().toString(36).substr(2, 9)}`,
                  name: googleUser.name,
                  email: googleUser.email.toLowerCase().trim(),
                  company: 'Minha Empresa Google',
                  role: 'Administrador',
                  avatarUrl: googleUser.avatarUrl,
                  subscription: plan,
                  status: 'active',
                  usageCurrent: 0,
                  usageLimit: PLAN_LIMITS_MAP[plan].maxVideosPerMonth,
                  storageUsedMB: 0,
                  templatesUsed: 0,
                  projectsActive: 0,
                  subscriptionDetails: {
                    id: `sub-${Math.random().toString(36).substr(2, 9)}`,
                    userId: `usr-${Math.random().toString(36).substr(2, 9)}`,
                    tier: plan,
                    status: 'active',
                    billingCycle: 'monthly',
                    price: 49,
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    cancelAtPeriodEnd: false,
                    autoRenew: true
                  }
                };
                
                const nextUsersList = [...savedUsers, resolvedUser];
                setAllUsers(nextUsersList);
                localStorage.setItem('vf_all_users', JSON.stringify(nextUsersList));
              }
              
              setUser(resolvedUser);
              localStorage.setItem('vf_user', JSON.stringify(resolvedUser));
              await loadUserWorkspace(resolvedUser);
              setActiveTab('dashboard');
              showToast(`Conectado como ${resolvedUser.name}!`, 'success');
              resolve();
            }
          };
          window.addEventListener('message', handlePopupMessage);
        } else {
          reject(new Error('Bloqueador de popup ativo. Por favor, libere popups para efetuar login com o Google.'));
        }
      });
    }
  };


  const recoverPassword = async (email: string): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`Instruções de redefinição de assinatura e senha enviadas para: ${email}`);
      }, 400);
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vf_user');
    setActiveTab('dashboard');
  };

  const updateUser = async (updatedUser: User): Promise<boolean> => {
    try {
      setUser(updatedUser);
      localStorage.setItem('vf_user', JSON.stringify(updatedUser));
      
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
        id: `prj-${Math.random().toString(36).substr(2, 9)}`,
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
  const createTemplate = (name: string, description: string, aspect: AspectRatio, defaultDuration: number): Template | null => {
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
  const triggerRender = (projectId: string): boolean => {
    if (!verifyAndTriggerLimitExceeded('videos')) {
      return false;
    }

    const project = projects.find(p => p.id === projectId);
    if (!project) return false;

    const template = templates.find(t => t.id === project.templateId);
    const templateName = template ? template.name : 'Template Desconhecido';

    const taskId = `rnd-${Math.random().toString(36).substr(2, 9)}`;
    const newTask: RenderingTask = {
      id: taskId,
      projectId,
      projectName: project.name,
      templateName,
      status: 'queued',
      progress: 0,
      duration: template?.defaultDuration ? `0:${template.defaultDuration}` : '0:30',
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
    }

    // Simulate progress loop
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 10;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        if (!user) return;

        setRenderingTasks(prevTasks => {
          const finishedTasks = prevTasks.map(t => {
            if (t.id === taskId) {
              const completedTime = new Date().toISOString();
              const cleanFileName = `${project.name.toLowerCase().replace(/\s+/g, '_')}_final.mp4`;
              const mockFile: StorageFile = {
                id: `f-rnd-${Date.now()}`,
                name: cleanFileName,
                size: `${(Math.random() * 8 + 5).toFixed(1)} MB`,
                type: 'render',
                url: 'https://assets.mixkit.co/videos/preview/mixkit-gaming-streamer-screen-playing-with-headphones-40439-large.mp4',
                createdAt: completedTime
              };
              
              setFolders(prevFolders => {
                const nextFolders = prevFolders.map(folder => {
                  if (folder.id === 'fld-rendered') {
                    return {
                      ...folder,
                      files: [mockFile, ...folder.files]
                    };
                  }
                  return folder;
                });
                localStorage.setItem(`vf_folders_${user.id}`, JSON.stringify(nextFolders));
                if (isSupabaseConfigured()) {
                  StorageService.upsertFolders(user.id, nextFolders);
                }
                return nextFolders;
              });

              const completedTask: RenderingTask = {
                ...t,
                status: 'completed' as const,
                progress: 100,
                renderTime: '18s',
                outputUrl: mockFile.url,
                completedAt: completedTime
              };

              if (isSupabaseConfigured()) {
                RenderService.upsertRenderingTask(user.id, completedTask);
              }

              return completedTask;
            }
            return t;
          });
          localStorage.setItem(`vf_tasks_${user.id}`, JSON.stringify(finishedTasks));
          return finishedTasks;
        });

        // Update project status
        setProjects(prevProjects => {
          const nextProjects = prevProjects.map(p => {
            if (p.id === projectId) {
              const updatedP: Project = {
                ...p,
                status: 'completed' as const,
                videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-gaming-streamer-screen-playing-with-headphones-40439-large.mp4',
                updatedAt: new Date().toISOString()
              };
              if (isSupabaseConfigured()) {
                ProjectService.upsertProject(user.id, updatedP);
              }
              return updatedP;
            }
            return p;
          });
          localStorage.setItem(`vf_projects_${user.id}`, JSON.stringify(nextProjects));
          return nextProjects;
        });

        // Increment usage count for isolated user
        const updatedUser: User = {
          ...user,
          usageCurrent: user.usageCurrent + 1
        };
        setUser(updatedUser);
        syncUserToAllUsers(updatedUser);
        loadUserWorkspace(updatedUser);
        if (isSupabaseConfigured()) {
          UserService.upsertUser(updatedUser);
        }

      } else {
        if (!user) return;
        setRenderingTasks(prevTasks => {
          const nextTasks = prevTasks.map(t => {
            if (t.id === taskId) {
              const updatedT: RenderingTask = {
                ...t,
                status: (progress > 5 ? 'processing' : 'queued') as any,
                progress
              };
              if (isSupabaseConfigured()) {
                RenderService.upsertRenderingTask(user.id, updatedT);
              }
              return updatedT;
            }
            return t;
          });
          localStorage.setItem(`vf_tasks_${user.id}`, JSON.stringify(nextTasks));
          return nextTasks;
        });
      }
    }, 1000);

    return true;
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
      url: '#',
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

  // SaaS Admin: Core management functions
  const adminUpdateUser = (userId: string, updates: Partial<User>) => {
    setAllUsers(prev => {
      const next = prev.map(u => {
        if (u.id === userId) {
          const merged = { ...u, ...updates };
          // If the tier changed, align default limits
          if (updates.subscription) {
            merged.usageLimit = PLAN_LIMITS_MAP[updates.subscription].maxVideosPerMonth;
          }
          return merged;
        }
        return u;
      });
      localStorage.setItem('vf_all_users', JSON.stringify(next));
      
      // If the current active user is the one modified, sync their workspace as well!
      if (user && user.id === userId) {
        const matched = next.find(u => u.id === userId);
        if (matched) {
          setUser(matched);
          loadUserWorkspace(matched);
        }
      }
      return next;
    });
  };

  const adminDeleteUser = (userId: string) => {
    setAllUsers(prev => {
      const next = prev.filter(u => u.id !== userId);
      localStorage.setItem('vf_all_users', JSON.stringify(next));
      return next;
    });

    // If active user is deleted, force logout!
    if (user && user.id === userId) {
      logout();
    }
  };

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
        uploadFileToFolder,
        deleteFileFromFolder,
        changeSubscription,
        cancelSubscription,
        invoices,
        triggerMockRenewal,
        limitError,
        clearLimitError,
        allUsers,
        adminUpdateUser,
        adminDeleteUser
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
