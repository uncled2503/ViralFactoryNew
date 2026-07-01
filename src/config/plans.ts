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
    maxVideosPerMonth: 100,
    maxTemplates: 5,
    maxProjects: 5,
    maxStorageMB: 2048, // 2 GB
    renderPriority: 'normal',
    hasAutoSubtitles: false,
    hasMultiFormatExport: false,
    hasPrivateTemplates: false,
    hasApiAccess: false,
    hasTeamManagement: false,
  },
  Pro: {
    maxVideosPerMonth: 2000,
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
    maxVideosPerMonth: 10000, // Fair use representation
    maxTemplates: 99999,
    maxProjects: 99999,
    maxStorageMB: 1024000, // 1 TB
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
    priceMonthly: 49,
    priceAnnual: 39, // R$39/month billed annually
    description: 'Ideal para criadores iniciantes experimentando vídeos curtos.',
    limits: PLAN_LIMITS_MAP.Starter,
    features: [
      'Até 100 vídeos por mês',
      'Até 5 templates de vídeo',
      'Até 5 projetos ativos',
      'Até 2 GB de armazenamento',
      'Renderização em prioridade normal',
      'Suporte via e-mail corporativo',
    ],
  },
  {
    tier: 'Pro',
    name: 'Creator Pro',
    priceMonthly: 149,
    priceAnnual: 119, // R$119/month billed annually
    description: 'Acelerador de escala perfeito para produtores de conteúdo ativos.',
    limits: PLAN_LIMITS_MAP.Pro,
    features: [
      'Até 2.000 vídeos por mês',
      'Templates ilimitados',
      'Projetos ativos ilimitados',
      'Até 100 GB de armazenamento',
      'Legendas automáticas inteligentes por IA',
      'Fila de renderização prioritária',
      'Exportação em múltiplos formatos',
      'Templates privados e exclusivos',
    ],
  },
  {
    tier: 'Business',
    name: 'Business Enterprise',
    priceMonthly: 499,
    priceAnnual: 399, // R$399/month billed annually
    description: 'Infraestrutura robusta de alta performance para marcas e agências.',
    limits: PLAN_LIMITS_MAP.Business,
    features: [
      'Limite estendido de vídeos (uso justo)',
      'Templates ilimitados',
      'Projetos ilimitados',
      '1 TB de armazenamento dedicado',
      'Fila de processamento ultrarápido com prioridade máxima',
      'API preparada para automação e integração externa',
      'Painel de equipe avançado (estrutura pronta)',
      'Logs e histórico completo de renderizações',
    ],
  },
];
