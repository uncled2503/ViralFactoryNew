/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TabName } from '../context/AppContext';
import {
  LayoutDashboard,
  Video,
  Layers,
  Film,
  HardDrive,
  Sparkles,
  Settings,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

export interface NavItem {
  id: TabName;
  label: string;
  breadcrumbParent: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Single source of truth for every section of the logged-in app: the Sidebar reads
// `label`/`icon` from here, and the Header derives its breadcrumb from
// `breadcrumbParent` + `label`. Previously each of those had its own hand-written
// copy of these names, which drifted out of sync (and the Header's breadcrumb
// switch had no case for "profile-settings" at all).
//
// Order matches the real product flow — template first, then a project that uses
// it, then the render — rather than the historical order.
export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', breadcrumbParent: 'Workspace', icon: LayoutDashboard },
  { id: 'templates', label: 'Templates', breadcrumbParent: 'Vídeo Engine', icon: Layers },
  { id: 'renderings', label: 'Renderizações', breadcrumbParent: 'Vídeo Engine', icon: Film },
  { id: 'storage', label: 'Arquivos', breadcrumbParent: 'Arquivos', icon: HardDrive },
  { id: 'subscription', label: 'Assinatura', breadcrumbParent: 'Minha Conta', icon: Sparkles },
  { id: 'profile-settings', label: 'Configurações', breadcrumbParent: 'Minha Conta', icon: Settings },
  { id: 'help', label: 'Ajuda & Tutoriais', breadcrumbParent: 'Suporte', icon: HelpCircle }
];

// Not shown in the Sidebar, kept only so the Header's breadcrumb lookup resolves
// correctly if the screen is still reached some other way (the admin area has its
// own separate layout/shell; "projects" was removed from the nav by request but the
// screen/route itself still exists, reachable from the Dashboard).
export const ADMIN_NAV_ITEM: NavItem = {
  id: 'admin',
  label: 'Painel do SaaS',
  breadcrumbParent: 'Administrador',
  icon: ShieldCheck
};

const HIDDEN_NAV_ITEMS: NavItem[] = [
  ADMIN_NAV_ITEM,
  { id: 'projects', label: 'Projetos', breadcrumbParent: 'Workspace', icon: Video }
];

export function getNavItem(tab: TabName): NavItem {
  return NAV_ITEMS.find((item) => item.id === tab) || HIDDEN_NAV_ITEMS.find((item) => item.id === tab) || NAV_ITEMS[0];
}
