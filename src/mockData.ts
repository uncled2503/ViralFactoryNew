/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Template, Project, RenderingTask, StorageFolder, SystemStats, User } from './types';

export const INITIAL_USER: User = {
  id: '',
  name: 'Usuário',
  email: '',
  company: 'Minha Empresa',
  role: 'Membro',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop',
  subscription: 'Free',
  status: 'active',
  usageCurrent: 0,
  usageLimit: 5,
  storageUsedMB: 0,
  templatesUsed: 0,
  projectsActive: 0
};

export const INITIAL_TEMPLATES: Template[] = [
  {
    id: 'tmp-reels-subtitles',
    name: 'Legendas Dinâmicas Neon',
    description: 'Template ideal para Reels, TikTok e Shorts com legendas destacadas e barra de progresso.',
    aspect: '9:16',
    defaultDuration: 30,
    scenesCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: 'layer-video',
        type: 'video',
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        order: 1,
        placeholder: 'Vídeo Principal'
      },
      {
        id: 'layer-subtitles',
        type: 'subtitles',
        x: 100,
        y: 1400,
        width: 880,
        height: 200,
        order: 10,
        font: 'Montserrat',
        size: 52,
        color: '#FFFFFF',
        weight: 'bold',
        strokeEnabled: true,
        strokeColor: '#000000',
        strokeWidth: 4
      }
    ]
  },
  {
    id: 'tmp-viral-split',
    name: 'Corte Viral Top/Bottom',
    description: 'Layout clássico com vídeo no topo e gameplay/loop satisfatório na base.',
    aspect: '9:16',
    defaultDuration: 30,
    scenesCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layers: [
      {
        id: 'layer-video-top',
        type: 'video',
        x: 0,
        y: 0,
        width: 1080,
        height: 960,
        order: 1,
        placeholder: 'Vídeo do Topo'
      },
      {
        id: 'layer-video-bottom',
        type: 'video',
        x: 0,
        y: 960,
        width: 1080,
        height: 960,
        order: 2,
        placeholder: 'Gameplay/Fundo'
      }
    ]
  }
];

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

