/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
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

export type TabName = 'dashboard' | 'projects' | 'templates' | 'renderings' | 'storage' | 'subscription' | 'admin';

interface LimitExceededInfo {
  type: 'videos' | 'templates' | 'projects' | 'storage';
  title: string;
  message: string;
  limitLabel: string;
  currentLabel: string;
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
  
  // Auth Functions
  login: (email: string, name?: string) => Promise<boolean>;
  register: (name: string, email: string, company: string) => Promise<boolean>;
  recoverPassword: (email: string) => Promise<string>;
  logout: () => void;
  
  // Projects Functions
  createProject: (name: string, description: string, templateId: string, aspect: AspectRatio) => Project | null;
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
  const loadUserWorkspace = (targetUser: User) => {
    const userId = targetUser.id;

    // 1. Projects
    const userProjectsKey = `vf_projects_${userId}`;
    const savedProjects = localStorage.getItem(userProjectsKey);
    let curProjects: Project[] = [];
    if (savedProjects) {
      curProjects = JSON.parse(savedProjects);
      setProjects(curProjects);
    } else {
      curProjects = INITIAL_PROJECTS;
      setProjects(INITIAL_PROJECTS);
      localStorage.setItem(userProjectsKey, JSON.stringify(INITIAL_PROJECTS));
    }

    // 2. Templates
    const userTemplatesKey = `vf_templates_${userId}`;
    const savedTemplates = localStorage.getItem(userTemplatesKey);
    let curTemplates: Template[] = [];
    if (savedTemplates) {
      curTemplates = JSON.parse(savedTemplates);
      setTemplates(curTemplates);
    } else {
      curTemplates = INITIAL_TEMPLATES;
      setTemplates(INITIAL_TEMPLATES);
      localStorage.setItem(userTemplatesKey, JSON.stringify(INITIAL_TEMPLATES));
    }

    // 3. Rendering Tasks
    const userTasksKey = `vf_tasks_${userId}`;
    const savedTasks = localStorage.getItem(userTasksKey);
    if (savedTasks) {
      setRenderingTasks(JSON.parse(savedTasks));
    } else {
      setRenderingTasks(INITIAL_RENDERING_TASKS);
      localStorage.setItem(userTasksKey, JSON.stringify(INITIAL_RENDERING_TASKS));
    }

    // 4. Folders
    const userFoldersKey = `vf_folders_${userId}`;
    const savedFolders = localStorage.getItem(userFoldersKey);
    let curFolders: StorageFolder[] = [];
    if (savedFolders) {
      curFolders = JSON.parse(savedFolders);
      setFolders(curFolders);
    } else {
      curFolders = INITIAL_FOLDERS;
      setFolders(INITIAL_FOLDERS);
      localStorage.setItem(userFoldersKey, JSON.stringify(INITIAL_FOLDERS));
    }

    // 5. Invoices
    const userInvoicesKey = `vf_invoices_${userId}`;
    const savedInvoices = localStorage.getItem(userInvoicesKey);
    if (savedInvoices) {
      setInvoices(JSON.parse(savedInvoices));
    } else {
      // Create a few mock historical invoices for an authentic experience
      const mockInvoices: Invoice[] = [
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
      setInvoices(mockInvoices);
      localStorage.setItem(userInvoicesKey, JSON.stringify(mockInvoices));
    }

    // Calculate dynamic usage metrics based on current loaded state
    let totalStorageMB = 0;
    curFolders.forEach(folder => {
      folder.files.forEach(file => {
        totalStorageMB += parseSizeToMB(file.size);
      });
    });

    // Update system stats specific to the current plan and isolation of user
    const limitObj = PLAN_LIMITS_MAP[targetUser.subscription];
    const limitsConfig = PLAN_LIMITS_MAP[targetUser.subscription];
    const storageLimitGB = limitsConfig.maxStorageMB / 1024;
    const currentStorageGB = totalStorageMB / 1024;

    const isolatedStats: SystemStats = {
      totalVideosRendered: targetUser.usageCurrent + 24, // baseline simulation offset
      totalRenderingMinutes: Math.ceil(targetUser.usageCurrent * 0.8) + 12,
      activeTemplates: curTemplates.length,
      activeProjects: curProjects.length,
      storageUsed: `${totalStorageMB.toFixed(1)} MB / ${(limitsConfig.maxStorageMB).toLocaleString('pt-BR')} MB`,
      renderSuccessRate: 98.8
    };
    setStats(isolatedStats);

    // Save initial computed limits directly on the session user
    const updatedUser: User = {
      ...targetUser,
      templatesUsed: curTemplates.length,
      projectsActive: curProjects.length,
      storageUsedMB: parseFloat(totalStorageMB.toFixed(2)),
    };
    setUser(updatedUser);
    localStorage.setItem('vf_user', JSON.stringify(updatedUser));
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
  const login = async (email: string, name?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const savedUsers: User[] = JSON.parse(localStorage.getItem('vf_all_users') || '[]');
        let resolvedUser = savedUsers.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
        
        if (!resolvedUser) {
          // Automatic create on the fly if not found
          const plan: PlanTier = 'Starter';
          const defaultName = name || email.split('@')[0].replace('.', ' ');
          const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
          resolvedUser = {
            id: `usr-${Math.random().toString(36).substr(2, 9)}`,
            name: formattedName,
            email: email.toLowerCase().trim(),
            company: 'Sua Empresa',
            role: 'Administrador',
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&h=256&fit=crop',
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
              price: PLAN_LIMITS_MAP[plan].maxVideosPerMonth === 100 ? 49 : 149,
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
        loadUserWorkspace(resolvedUser);
        setActiveTab('dashboard');
        resolve(true);
      }, 500);
    });
  };

  const register = async (name: string, email: string, company: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const savedUsers: User[] = JSON.parse(localStorage.getItem('vf_all_users') || '[]');
        
        // Remove existing if any to avoid duplication
        const filteredUsers = savedUsers.filter(u => u.email.toLowerCase().trim() !== email.toLowerCase().trim());

        const newUser: User = {
          id: `usr-${Math.random().toString(36).substr(2, 9)}`,
          name,
          email: email.toLowerCase().trim(),
          company,
          role: 'Administrador',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop',
          subscription: 'Starter', // Starts on Starter
          status: 'active',
          usageCurrent: 0,
          usageLimit: PLAN_LIMITS_MAP.Starter.maxVideosPerMonth,
          storageUsedMB: 0,
          templatesUsed: 0,
          projectsActive: 0,
          subscriptionDetails: {
            id: `sub-${Math.random().toString(36).substr(2, 9)}`,
            userId: `usr-${Math.random().toString(36).substr(2, 9)}`,
            tier: 'Starter',
            status: 'active',
            billingCycle: 'monthly',
            price: 49,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancelAtPeriodEnd: false,
            autoRenew: true
          }
        };

        const nextUsersList = [...filteredUsers, newUser];
        setAllUsers(nextUsersList);
        localStorage.setItem('vf_all_users', JSON.stringify(nextUsersList));

        setUser(newUser);
        localStorage.setItem('vf_user', JSON.stringify(newUser));
        loadUserWorkspace(newUser);
        setActiveTab('dashboard');
        resolve(true);
      }, 500);
    });
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

  // Projects Functions with Limit Checks
  const createProject = (name: string, description: string, templateId: string, aspect: AspectRatio): Project | null => {
    if (!verifyAndTriggerLimitExceeded('projects')) {
      return null;
    }

    const newProject: Project = {
      id: `prj-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      templateId,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aspect,
      variables: {
        title: name,
        subtitles: ['Fábrica viral ativada...', 'Criando shorts em escala...'],
        brandColor: '#6366f1',
        fontName: 'Inter Regular'
      }
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
    }

    return newProject;
  };

  const updateProject = (updatedProject: Project) => {
    const updated = projects.map(p => p.id === updatedProject.id ? { ...updatedProject, updatedAt: new Date().toISOString() } : p);
    setProjects(updated);
    if (user) {
      localStorage.setItem(`vf_projects_${user.id}`, JSON.stringify(updated));
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
    }

    return newTemplate;
  };

  const updateTemplate = (updatedTemplate: Template) => {
    const updated = templates.map(t => t.id === updatedTemplate.id ? { ...updatedTemplate, updatedAt: new Date().toISOString() } : t);
    setTemplates(updated);
    if (user) {
      localStorage.setItem(`vf_templates_${user.id}`, JSON.stringify(updated));
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
                return nextFolders;
              });

              return {
                ...t,
                status: 'completed' as const,
                progress: 100,
                renderTime: '18s',
                outputUrl: mockFile.url,
                completedAt: completedTime
              };
            }
            return t;
          });
          localStorage.setItem(`vf_tasks_${user.id}`, JSON.stringify(finishedTasks));
          return finishedTasks;
        });

        // Update project status
        setProjects(prevProjects => {
          const nextProjects = prevProjects.map(p => p.id === projectId ? {
            ...p,
            status: 'completed' as const,
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-gaming-streamer-screen-playing-with-headphones-40439-large.mp4',
            updatedAt: new Date().toISOString()
          } : p);
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

      } else {
        if (!user) return;
        setRenderingTasks(prevTasks => {
          const nextTasks = prevTasks.map(t => {
            if (t.id === taskId) {
              return {
                ...t,
                status: (progress > 5 ? 'processing' : 'queued') as any,
                progress
              };
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
        login,
        register,
        recoverPassword,
        logout,
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
