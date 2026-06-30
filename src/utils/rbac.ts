/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole, Permission } from '../types';

// Map each role to its list of allowed permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'MANAGE_USERS',
    'VIEW_METRICS',
    'MANAGE_PAYMENTS',
    'MANAGE_TEMPLATES',
    'MANAGE_SYSTEM',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'RENDER_VIDEOS',
    'MANAGE_FILES'
  ],
  ADMIN: [
    'MANAGE_USERS',
    'VIEW_METRICS',
    'MANAGE_PAYMENTS',
    'MANAGE_TEMPLATES',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'RENDER_VIDEOS',
    'MANAGE_FILES'
  ],
  SUPPORT: [
    'VIEW_METRICS',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'MANAGE_USERS' // Support can view and edit user limits but not delete or promote
  ],
  FINANCE: [
    'VIEW_METRICS',
    'MANAGE_PAYMENTS'
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
    'VIEW_METRICS',
    'MANAGE_PAYMENTS',
    'MANAGE_TEMPLATES',
    'MANAGE_SYSTEM',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'RENDER_VIDEOS',
    'MANAGE_FILES'
  ],
  Administrador: [
    'MANAGE_USERS',
    'VIEW_METRICS',
    'MANAGE_PAYMENTS',
    'MANAGE_TEMPLATES',
    'VIEW_LOGS',
    'MANAGE_SUPPORT',
    'RENDER_VIDEOS',
    'MANAGE_FILES'
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
  return ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE', 'MODERATOR', 'SaaS_Owner', 'Administrador'].includes(role);
}

/**
 * Helper to display role names with Portuguese translations and custom colors
 */
export const ROLE_DETAILS_MAP: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
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
    label: 'Moderador de Conteúdo',
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
  // Compatibility
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
