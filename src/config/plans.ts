/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlanTier, PlanLimits } from '../types';

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  limits: PlanLimits;
  features: string[];
}

export const PLAN_LIMITS_MAP: Record<PlanTier, PlanLimits> = {
  Free: {
    maxVideosPerMonth: 5,
    maxTemplates: 1,
    maxProjects: 1,
    maxStorageMB: 500,
    renderPriority: 'normal',
    hasAutoSubtitles: false,
    hasMultiFormatExport: false,
    hasPrivateTemplates: false,
    hasApiAccess: false,
    hasTeamManagement: false,
  },
  Starter: {
    maxVideosPerMonth: 300,
    maxTemplates: 5,
    maxProjects: 3,
    maxStorageMB: 2048, // 2 GB
    renderPriority: 'normal',
    hasAutoSubtitles: false,
    hasMultiFormatExport: false,
    hasPrivateTemplates: false,
    hasApiAccess: false,
    hasTeamManagement: false,
  },
  Pro: {
    maxVideosPerMonth: 1200,
    maxTemplates: 99999, // unlimited representation
    maxProjects: 99999, // unlimited representation
    maxStorageMB: 102400, // 100 GB
    renderPriority: 'priority',
    hasAutoSubtitles: true,
    hasMultiFormatExport: true,
    hasPrivateTemplates: true,
    hasApiAccess: false,
    hasTeamManagement: false,
  },
  Business: {
    maxVideosPerMonth: 4000, // Fair use representation
    maxTemplates: 99999,
    maxProjects: 99999,
    maxStorageMB: 10240, // 10 GB
    renderPriority: 'maximum',
    hasAutoSubtitles: true,
    hasMultiFormatExport: true,
    hasPrivateTemplates: true,
    hasApiAccess: true,
    hasTeamManagement: true,
  },
};

export const PLANS_DETAILS: PlanConfig[] = [
  {
    tier: 'Free',
    name: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    description: 'Experimente as ferramentas básicas do Viral Factory.',
    limits: PLAN_LIMITS_MAP.Free,
    features: [
      '5 renderizações de vídeo (total para teste)',
      '1 template',
      '1 projeto',
      '500 MB de armazenamento',
      'Upload máximo de 100 MB por arquivo',
      'Sem renderização em lote',
      'Sem legenda automática',
      'Sem exportação ZIP',
      'Marca d\'água do Viral Factory nas renderizações',
      'Sem prioridade na fila',
    ],
  },
  {
    tier: 'Starter',
    name: 'Starter',
    priceMonthly: 97,
    priceAnnual: 77, // R$77/month billed annually
    description: 'Ideal para criadores iniciantes que querem validar seus primeiros canais de escala.',
    limits: PLAN_LIMITS_MAP.Starter,
    features: [
      'Até 300 renders de vídeo/mês',
      '3 Projetos ativos simultâneos',
      'Templates prontos essenciais',
      'Suporte prioritário por e-mail',
      'Fila de exportação padrão',
      'Cancele a qualquer momento',
    ],
  },
  {
    tier: 'Pro',
    name: 'Creator Pro',
    priceMonthly: 197,
    priceAnnual: 157, // R$157/month billed annually
    description: 'O plano perfeito para profissionais que buscam escala massiva e automação robusta.',
    limits: PLAN_LIMITS_MAP.Pro,
    features: [
      'Até 1.200 renders de vídeo/mês',
      'Projetos e pastas ilimitados',
      'Todos os Templates Premium',
      'Prioridade máxima na fila de renders',
      'Upload de vídeos de gameplay personalizados',
      'Edição avançada de variáveis de texto',
      'Acesso prioritário a novas ferramentas',
    ],
  },
  {
    tier: 'Business',
    name: 'Business',
    priceMonthly: 397,
    priceAnnual: 317, // R$317/month billed annually
    description: 'Para agências e equipes grandes que produzem conteúdo em ritmo constante e de alta performance.',
    limits: PLAN_LIMITS_MAP.Business,
    features: [
      'Até 4.000 renders de vídeo/mês',
      'Espaço de armazenamento extra de 10GB',
      'Até 5 usuários/colaboradores',
      'Modelos e templates sob medida',
      'Acompanhamento estratégico por especialistas',
      'SLA de entrega garantido de renderização',
    ],
  },
];
