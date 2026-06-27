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
  subscription: 'Pro',
  status: 'active',
  usageCurrent: 142,
  usageLimit: 2000,
  storageUsedMB: 1840,
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
};

export const INITIAL_TEMPLATES: Template[] = [
  {
    id: 'tpl-reddit-stories',
    name: 'Reddit Stories Virais',
    description: 'Fundo de gameplay relaxante com narração automatizada e legenda centralizada de alto contraste.',
    aspect: '9:16',
    createdAt: '2026-05-10T14:32:00Z',
    updatedAt: '2026-06-25T11:20:00Z',
    bgMusicUrl: '/assets/audio/ambient_satisfying.mp3',
    defaultDuration: 55,
    scenesCount: 3,
    layers: [
      { id: 'lyr-1', type: 'text', name: 'Título Principal (Pergunta)', defaultValue: 'Qual é o maior segredo que você esconde?' },
      { id: 'lyr-2', type: 'text', name: 'Legendas do Relato', defaultValue: 'Estava caminhando na floresta quando de repente...' },
      { id: 'lyr-3', type: 'image', name: 'Fundo Gameplay Minecraft', defaultValue: 'minecraft_parkour_01.mp4' },
      { id: 'lyr-4', type: 'audio', name: 'Voz Sintética Masculina (Narrador)', defaultValue: 'felipe_pt_br_tts' }
    ]
  },
  {
    id: 'tpl-motivational',
    name: 'Motivacional Cinematic',
    description: 'Estilo dark com paisagens épicas e trilha sonora imersiva. Ideal para TikTok/Shorts de desenvolvimento pessoal.',
    aspect: '9:16',
    createdAt: '2026-05-15T09:12:00Z',
    updatedAt: '2026-06-22T18:45:00Z',
    bgMusicUrl: '/assets/audio/cinematic_motivation.mp3',
    defaultDuration: 30,
    scenesCount: 2,
    layers: [
      { id: 'lyr-5', type: 'text', name: 'Citação de Impacto', defaultValue: 'O silêncio é a resposta mais barulhenta.' },
      { id: 'lyr-6', type: 'text', name: 'Autor da Frase', defaultValue: 'Provérbio Antigo' },
      { id: 'lyr-7', type: 'image', name: 'Fundo Neblina e Montanhas', defaultValue: 'foggy_mountains_4k.mp4' }
    ]
  },
  {
    id: 'tpl-saas-showcase',
    name: 'SaaS Promo Minimalist',
    description: 'Layout moderno e limpo inspirado na Vercel e Stripe para promoção de recursos de software e dashboards.',
    aspect: '16:9',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-20T14:10:00Z',
    bgMusicUrl: '/assets/audio/sleek_corporate.mp3',
    defaultDuration: 45,
    scenesCount: 4,
    layers: [
      { id: 'lyr-8', type: 'text', name: 'Chamada Principal (Headline)', defaultValue: 'Acelere o fluxo de trabalho do seu time' },
      { id: 'lyr-9', type: 'text', name: 'Subtexto explicativo', defaultValue: 'Integre analytics e relatórios em tempo real sem complexidade.' },
      { id: 'lyr-10', type: 'image', name: 'Mockup de App / Dashboard', defaultValue: 'saas_dashboard_ui.png' }
    ]
  },
  {
    id: 'tpl-ecom-quick',
    name: 'E-commerce Quick Sell',
    description: 'Focado em conversão direta. Banner de produto quadrado (1:1), preço promocional piscante e setas dinâmicas.',
    aspect: '1:1',
    createdAt: '2026-06-12T16:40:00Z',
    updatedAt: '2026-06-24T08:30:00Z',
    bgMusicUrl: '/assets/audio/high_energy_hype.mp3',
    defaultDuration: 15,
    scenesCount: 1,
    layers: [
      { id: 'lyr-11', type: 'text', name: 'Nome do Produto', defaultValue: 'Fone de Ouvido Noise Cancel 300' },
      { id: 'lyr-12', type: 'text', name: 'Preço Antigo', defaultValue: 'De R$ 599,00' },
      { id: 'lyr-13', type: 'text', name: 'Preço Oferta', defaultValue: 'Por R$ 199,90' },
      { id: 'lyr-14', type: 'image', name: 'Foto de Produto Translúcida', defaultValue: 'headset_premium.png' }
    ]
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'prj-001',
    name: 'O Segredo da Floresta - Reddit',
    description: 'História arrepiante sobre uma cabana abandonada encontrada em uma trilha de Minas Gerais.',
    templateId: 'tpl-reddit-stories',
    status: 'completed',
    createdAt: '2026-06-25T15:30:00Z',
    updatedAt: '2026-06-25T15:35:12Z',
    aspect: '9:16',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-gaming-streamer-screen-playing-with-headphones-40439-large.mp4',
    variables: {
      title: 'O Segredo da Floresta Oculta',
      subtitles: [
        'Encontrei uma cabana antiga...',
        'Tinha velas acesas na janela...',
        'E um som de sussurro vindo de baixo.'
      ],
      brandColor: '#ef4444',
      fontName: 'Inter Bold'
    }
  },
  {
    id: 'prj-002',
    name: 'Rotina Milionária - Mentalidade',
    description: 'Vídeo inspirador contendo 3 hábitos matinais cruciais para manter o foco total.',
    templateId: 'tpl-motivational',
    status: 'completed',
    createdAt: '2026-06-26T10:15:00Z',
    updatedAt: '2026-06-26T10:17:45Z',
    aspect: '9:16',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-epic-sunset-above-mountains-and-clouds-42453-large.mp4',
    variables: {
      title: '3 Hábitos Inabaláveis para o Sucesso',
      subtitles: [
        '1. Execute no escuro, brilhe na luz.',
        '2. Treine seu corpo como seu maior ativo.',
        '3. O silêncio é o seu maior trunfo estratégico.'
      ],
      brandColor: '#f59e0b',
      fontName: 'Space Grotesk'
    }
  },
  {
    id: 'prj-003',
    name: 'Anúncio Headline SaaS - Viral Factory',
    description: 'Campanha de lançamento para o Viral Factory, exibindo recursos da dashboard e rapidez de render.',
    templateId: 'tpl-saas-showcase',
    status: 'draft',
    createdAt: '2026-06-27T11:00:00Z',
    updatedAt: '2026-06-27T12:05:00Z',
    aspect: '16:9',
    variables: {
      title: 'Viral Factory: Do Texto ao Vídeo em Segundos',
      subtitles: [
        'Crie dezenas de shorts dinâmicos.',
        'Inteligência artificial e render rápido.',
        'Comece agora grátis.'
      ],
      brandColor: '#6366f1',
      fontName: 'Fira Code'
    }
  }
];

export const INITIAL_RENDERING_TASKS: RenderingTask[] = [
  {
    id: 'rnd-001',
    projectId: 'prj-001',
    projectName: 'O Segredo da Floresta - Reddit',
    templateName: 'Reddit Stories Virais',
    status: 'completed',
    progress: 100,
    duration: '0:55',
    renderTime: '48s',
    outputUrl: 'https://assets.mixkit.co/videos/preview/mixkit-gaming-streamer-screen-playing-with-headphones-40439-large.mp4',
    createdAt: '2026-06-25T15:34:24Z',
    completedAt: '2026-06-25T15:35:12Z'
  },
  {
    id: 'rnd-002',
    projectId: 'prj-002',
    projectName: 'Rotina Milionária - Mentalidade',
    templateName: 'Motivacional Cinematic',
    status: 'completed',
    progress: 100,
    duration: '0:30',
    renderTime: '28s',
    outputUrl: 'https://assets.mixkit.co/videos/preview/mixkit-epic-sunset-above-mountains-and-clouds-42453-large.mp4',
    createdAt: '2026-06-26T10:16:55Z',
    completedAt: '2026-06-26T10:17:45Z'
  }
];

// Folders specified in the requirement: Uploads, Templates, Logos, Vídeos, Arquivos Renderizados
export const INITIAL_FOLDERS: StorageFolder[] = [
  {
    id: 'fld-uploads',
    name: 'Uploads',
    path: '/storage/uploads',
    description: 'Arquivos brutos carregados pelo usuário (áudios, mídias gerais).',
    files: [
      { id: 'f-u1', name: 'depoimento_cliente_01.wav', size: '4.2 MB', type: 'audio', url: '#', createdAt: '2026-06-24T10:00:00Z' },
      { id: 'f-u2', name: 'sound_effect_impact.mp3', size: '320 KB', type: 'audio', url: '#', createdAt: '2026-06-24T10:05:00Z' }
    ]
  },
  {
    id: 'fld-templates',
    name: 'Templates',
    path: '/storage/templates',
    description: 'Estruturas JSON de animações e layouts predefinidos do sistema.',
    files: [
      { id: 'f-t1', name: 'reddit_v2_main.json', size: '45 KB', type: 'font', url: '#', createdAt: '2026-06-20T14:00:00Z' },
      { id: 'f-t2', name: 'cinema_motivation_v1.json', size: '38 KB', type: 'font', url: '#', createdAt: '2026-06-22T18:00:00Z' }
    ]
  },
  {
    id: 'fld-logos',
    name: 'Logos',
    path: '/storage/logos',
    description: 'Marcas d\'água, logotipos corporativos e ícones para sobreposição de marca.',
    files: [
      { id: 'f-l1', name: 'viral_factory_watermark.png', size: '124 KB', type: 'image', url: '#', createdAt: '2026-06-25T08:00:00Z' },
      { id: 'f-l2', name: 'viralsa_logo_white.png', size: '250 KB', type: 'image', url: '#', createdAt: '2026-06-26T12:00:00Z' }
    ]
  },
  {
    id: 'fld-videos',
    name: 'Vídeos',
    path: '/storage/videos',
    description: 'Vídeos de fundo brutos (gameplays, paisagens cinematográficas, loops abstratos).',
    files: [
      { id: 'f-v1', name: 'minecraft_parkour_01.mp4', size: '85.4 MB', type: 'video', url: '#', createdAt: '2026-06-18T16:00:00Z' },
      { id: 'f-v2', name: 'satisfying_sand_loop.mp4', size: '42.1 MB', type: 'video', url: '#', createdAt: '2026-06-19T09:30:00Z' },
      { id: 'f-v3', name: 'cinematic_clouds_4k.mp4', size: '115.8 MB', type: 'video', url: '#', createdAt: '2026-06-21T11:00:00Z' }
    ]
  },
  {
    id: 'fld-rendered',
    name: 'Arquivos Renderizados',
    path: '/storage/rendered',
    description: 'Vídeos finais prontos, codificados e compactados para download.',
    files: [
      { id: 'f-r1', name: 'reddit_story_floresta_segredo.mp4', size: '12.8 MB', type: 'render', url: '#', createdAt: '2026-06-25T15:35:12Z' },
      { id: 'f-r2', name: 'motivation_3_habitos_matutinos.mp4', size: '7.4 MB', type: 'render', url: '#', createdAt: '2026-06-26T10:17:45Z' }
    ]
  }
];

export const INITIAL_STATS: SystemStats = {
  totalVideosRendered: 342,
  totalRenderingMinutes: 284,
  activeTemplates: 4,
  activeProjects: 3,
  storageUsed: '281.3 MB / 50.0 GB',
  renderSuccessRate: 99.1
};
