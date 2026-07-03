/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole, Permission } from '../types';

// Map each role to its list of allowed permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'MANAGE_USERS',
    'DELETE_USERS',
    'VIEW_METRICS',
    'VIEW_PAYMENTS',
    'MANAGE_PAYMENTS',
    'MANAGE_TEMPLATES',
    'MANAGE_SYSTEM',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'RENDER_VIDEOS',
    'MANAGE_FILES',
    'MANAGE_COUPONS',
    'MANAGE_WORKERS',
    'MANAGE_STORAGE',
    'VIEW_AUDIT'
  ],
  OWNER: [
    'MANAGE_USERS',
    'DELETE_USERS',
    'VIEW_METRICS',
    'VIEW_PAYMENTS',
    'MANAGE_PAYMENTS',
    'MANAGE_TEMPLATES',
    'MANAGE_SYSTEM',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'RENDER_VIDEOS',
    'MANAGE_FILES',
    'MANAGE_COUPONS',
    'MANAGE_WORKERS',
    'MANAGE_STORAGE',
    'VIEW_AUDIT'
  ],
  ADMIN: [
    'MANAGE_USERS',
    'VIEW_METRICS',
    'VIEW_PAYMENTS',
    'MANAGE_PAYMENTS',
    'MANAGE_TEMPLATES',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'RENDER_VIDEOS',
    'MANAGE_FILES',
    'MANAGE_COUPONS',
    'VIEW_AUDIT'
  ],
  SUPORTE: [
    'VIEW_METRICS',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'MANAGE_USERS',
    'VIEW_AUDIT'
  ],
  FINANCEIRO: [
    'VIEW_METRICS',
    'VIEW_PAYMENTS',
    'MANAGE_PAYMENTS',
    'MANAGE_COUPONS'
  ],
  MARKETING: [
    'VIEW_METRICS',
    'MANAGE_TEMPLATES',
    'MANAGE_COUPONS'
  ],
  MODERADOR: [
    'MANAGE_USERS',
    'MANAGE_TEMPLATES'
  ],
  ANALISTA: [
    'VIEW_METRICS',
    'VIEW_LOGS',
    'VIEW_AUDIT'
  ],
  DESENVOLVEDOR: [
    'VIEW_METRICS',
    'VIEW_LOGS',
    'MANAGE_SYSTEM',
    'MANAGE_WORKERS',
    'MANAGE_STORAGE'
  ],
  SUPPORT: [
    'VIEW_METRICS',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'MANAGE_USERS',
    'VIEW_AUDIT'
  ],
  FINANCE: [
    'VIEW_METRICS',
    'VIEW_PAYMENTS',
    'MANAGE_PAYMENTS',
    'MANAGE_COUPONS'
  ],
  MODERATOR: [
    'MANAGE_USERS',
    'MANAGE_TEMPLATES'
  ],
  CLIENT_OWNER: [
    'RENDER_VIDEOS',
    'MANAGE_FILES'
  ],
  CLIENT_MEMBER: [
    'RENDER_VIDEOS',
    'MANAGE_FILES'
  ],
  // Backward compatibility with previous roles
  SaaS_Owner: [
    'MANAGE_USERS',
    'DELETE_USERS',
    'VIEW_METRICS',
    'VIEW_PAYMENTS',
    'MANAGE_PAYMENTS',
    'MANAGE_TEMPLATES',
    'MANAGE_SYSTEM',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'RENDER_VIDEOS',
    'MANAGE_FILES',
    'MANAGE_COUPONS',
    'MANAGE_WORKERS',
    'MANAGE_STORAGE',
    'VIEW_AUDIT'
  ],
  Administrador: [
    'MANAGE_USERS',
    'VIEW_METRICS',
    'VIEW_PAYMENTS',
    'MANAGE_PAYMENTS',
    'MANAGE_TEMPLATES',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'RENDER_VIDEOS',
    'MANAGE_FILES',
    'MANAGE_COUPONS',
    'VIEW_AUDIT'
  ],
  Membro: [
    'RENDER_VIDEOS',
    'MANAGE_FILES'
  ]
};

/**
 * Checks if a user role has a specific permission
 */
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Checks if a user role is authorized as administrative
 */
export function isAdminRole(role: UserRole | undefined): boolean {
  if (!role) return false;
  return [
    'SUPER_ADMIN', 'OWNER', 'ADMIN', 'SUPORTE', 'FINANCEIRO', 'MARKETING', 'MODERADOR', 'ANALISTA', 'DESENVOLVEDOR',
    'SUPPORT', 'FINANCE', 'MODERATOR', 'SaaS_Owner', 'Administrador'
  ].includes(role);
}

/**
 * Helper to display role names with Portuguese translations and custom colors
 */
export const ROLE_DETAILS_MAP: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20'
  },
  OWNER: {
    label: 'Dono / Owner',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20'
  },
  ADMIN: {
    label: 'Administrador',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20'
  },
  SUPORTE: {
    label: 'Suporte Técnico',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20'
  },
  FINANCEIRO: {
    label: 'Financeiro',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  MARKETING: {
    label: 'Marketing / Growth',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20'
  },
  MODERADOR: {
    label: 'Moderador de Conteúdo',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  },
  ANALISTA: {
    label: 'Analista de SaaS',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20'
  },
  DESENVOLVEDOR: {
    label: 'Desenvolvedor',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20'
  },
  SUPPORT: {
    label: 'Suporte Técnico',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20'
  },
  FINANCE: {
    label: 'Financeiro',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  MODERATOR: {
    label: 'Moderador',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  },
  CLIENT_OWNER: {
    label: 'Proprietário',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20'
  },
  CLIENT_MEMBER: {
    label: 'Membro do Time',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20'
  },
  SaaS_Owner: {
    label: 'Dono do SaaS',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20'
  },
  Administrador: {
    label: 'Admin',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20'
  },
  Membro: {
    label: 'Membro',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20'
  }
};
