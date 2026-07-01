/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Template, Project, RenderingTask, StorageFolder, SystemStats, User } from './types';

export const INITIAL_USER: User = {
  id: 'usr-001',
  name: 'Gabriel Moura',
  email: 'mouragabriel2011@gmail.com',
  company: 'Viral S.A.',
  role: 'SaaS_Owner',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop',
  subscription: 'Free',
  status: 'active',
  usageCurrent: 0,
  usageLimit: 5,
  storageUsedMB: 0,
  templatesUsed: 0,
  projectsActive: 0,
  subscriptionDetails: {
    id: 'sub-001',
    userId: 'usr-001',
    tier: 'Free',
    status: 'active',
    billingCycle: 'monthly',
    price: 0,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    autoRenew: true
  }
};

export const INITIAL_TEMPLATES: Template[] = [];

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_RENDERING_TASKS: RenderingTask[] = [];

// Folders specified in the requirement: Uploads, Templates, Logos, Vídeos, Arquivos Renderizados
export const INITIAL_FOLDERS: StorageFolder[] = [
  {
    id: 'fld-uploads',
    name: 'Uploads',
    path: '/storage/uploads',
    description: 'Arquivos brutos carregados pelo usuário (áudios, mídias gerais).',
    files: []
  },
  {
    id: 'fld-templates',
    name: 'Templates',
    path: '/storage/templates',
    description: 'Estruturas JSON de animações e layouts predefinidos do sistema.',
    files: []
  },
  {
    id: 'fld-logos',
    name: 'Logos',
    path: '/storage/logos',
    description: 'Marcas d\'água, logotipos corporativos e ícones para sobreposição de marca.',
    files: []
  },
  {
    id: 'fld-videos',
    name: 'Vídeos',
    path: '/storage/videos',
    description: 'Vídeos de fundo brutos (gameplays, paisagens cinematográficas, loops abstratos).',
    files: []
  },
  {
    id: 'fld-rendered',
    name: 'Arquivos Renderizados',
    path: '/storage/rendered',
    description: 'Vídeos finais prontos, codificados e compactados para download.',
    files: []
  }
];

export const INITIAL_STATS: SystemStats = {
  totalVideosRendered: 0,
  totalRenderingMinutes: 0,
  activeTemplates: 0,
  activeProjects: 0,
  storageUsed: '0.0 MB / 500 MB',
  renderSuccessRate: 100
};

