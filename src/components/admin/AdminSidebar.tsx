/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Sparkles, 
  DollarSign, 
  Film, 
  Clock, 
  Cpu, 
  HardDrive, 
  Terminal, 
  Ticket, 
  TrendingUp, 
  Settings, 
  LifeBuoy, 
  ShieldAlert,
  ArrowLeftRight,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../hooks/useRouter';
import { ROLE_DETAILS_MAP } from '../../utils/rbac';

export type AdminMenuId = 
  | 'dashboard' 
  | 'users' 
  | 'subscriptions' 
  | 'payments' 
  | 'renderings' 
  | 'queue' 
  | 'workers' 
  | 'storage' 
  | 'logs' 
  | 'coupons' 
  | 'analytics' 
  | 'settings' 
  | 'support';

interface AdminSidebarProps {
  activeMenu: AdminMenuId;
  setActiveMenu: (menu: AdminMenuId) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeMenu, setActiveMenu }) => {
  const { user, logout } = useApp();
  const { navigate } = useRouter();

  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users' as const, label: 'Usuários', icon: Users, badge: 'Live' },
    { id: 'subscriptions' as const, label: 'Assinaturas', icon: Sparkles },
    { id: 'payments' as const, label: 'Pagamentos', icon: DollarSign },
    { id: 'renderings' as const, label: 'Renderizações', icon: Film },
    { id: 'queue' as const, label: 'Fila de Processamento', icon: Clock },
    { id: 'workers' as const, label: 'Workers (FFmpeg)', icon: Cpu, count: 4 },
    { id: 'storage' as const, label: 'Storage Geral', icon: HardDrive },
    { id: 'logs' as const, label: 'Logs do Sistema', icon: Terminal },
    { id: 'coupons' as const, label: 'Cupons', icon: Ticket },
    { id: 'analytics' as const, label: 'Analytics', icon: TrendingUp },
    { id: 'settings' as const, label: 'Configurações', icon: Settings },
    { id: 'support' as const, label: 'Suporte', icon: LifeBuoy, count: 1 }
  ];

  const roleDetails = user ? ROLE_DETAILS_MAP[user.role] : null;

  return (
    <aside id="admin-sidebar" className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col h-screen fixed left-0 top-0 z-20">
      {/* Brand & Badge */}
      <div className="h-16 border-b border-slate-900 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-pink-600 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-pink-600/20">
            VF
          </div>
          <span className="font-bold text-sm tracking-tight text-white uppercase font-sans">
            Viral <span className="text-pink-500">Admin</span>
          </span>
        </div>
        <div className="text-[9px] font-mono font-bold bg-pink-500/10 border border-pink-500/20 text-pink-400 py-0.5 px-2 rounded-full uppercase">
          SaaS Core
        </div>
      </div>

      {/* Admin User info card */}
      <div className="p-4 border-b border-slate-900 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <img 
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&fit=crop'} 
            alt={user?.name} 
            className="w-10 h-10 rounded-full border border-pink-500/30 object-cover"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-slate-100 truncate">{user?.name}</h4>
            <span className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border mt-1 ${roleDetails?.color} ${roleDetails?.bg} ${roleDetails?.border}`}>
              {roleDetails?.label || 'ADMIN'}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
        {menuItems.map(item => {
          const isActive = activeMenu === item.id;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-gradient-to-r from-pink-950/20 to-slate-950 text-pink-400 border border-pink-500/20 shadow-md shadow-pink-500/5 font-semibold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <IconComponent className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-pink-500' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[8px] font-bold font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md uppercase">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className="text-[9px] font-bold font-mono bg-pink-600 text-white h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Controls: Back to Client & Logout */}
      <div className="p-3 border-t border-slate-900 bg-slate-950 space-y-1.5">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-pink-500" />
          Área do Cliente
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/10 hover:bg-red-950/20 border border-red-950/20 hover:border-red-900/30 rounded-xl text-[11px] font-semibold text-red-400 hover:text-red-300 transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
};
