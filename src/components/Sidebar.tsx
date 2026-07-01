/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { LogoFull } from './Logo';
import {
  LayoutDashboard,
  Video,
  FileVideo,
  Film,
  HardDrive,
  LogOut,
  Sparkles,
  Layers,
  ShieldCheck,
  HelpCircle,
  Settings
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, logout, user, stats, renderingTasks } = useApp();

  const activeJobsCount = renderingTasks.filter(t => t.status === 'queued' || t.status === 'processing').length;

  const navItems: Array<{ id: string; label: string; icon: any; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projetos', icon: Video },
    { id: 'templates', label: 'Templates', icon: Layers },
    {
      id: 'renderings',
      label: 'Renderizações',
      icon: Film,
      badge: activeJobsCount > 0 ? activeJobsCount : undefined
    },
    { id: 'storage', label: 'Arquivos & Pastas', icon: HardDrive },
    { id: 'subscription', label: 'Minha Assinatura', icon: Sparkles },
    { id: 'profile-settings', label: 'Configurações', icon: Settings },
    { id: 'help', label: 'Ajuda & Tutoriais', icon: HelpCircle }
  ];

  if (!user) return null;

  // Percentage of rendering minutes limit used
  const limitPercent = Math.min(100, Math.round((user.usageCurrent / user.usageLimit) * 100));

  return (
    <aside className="w-64 bg-gray-950/80 border-r border-gray-900 flex flex-col h-screen fixed top-0 left-0 z-20 backdrop-blur-xl">
      {/* Brand logo */}
      <div className="p-6 border-b border-gray-900/60 flex items-center">
        <LogoFull iconSize={34} textClassName="text-sm" subTextClassName="text-[10px]" />
      </div>

      {/* Navigation list */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-950/40 text-indigo-200 border border-indigo-500/20 shadow-sm shadow-indigo-500/5'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </div>
              
              {item.badge !== undefined && (
                <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Consumption Panel */}
      <div className="p-4 mx-4 mb-3 rounded-xl bg-gray-900/30 border border-gray-900 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-gray-500">CONSUMO MENSAL</span>
          <span className="text-indigo-400 font-semibold">{user.usageCurrent} / {user.usageLimit} vids</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden border border-gray-900">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${limitPercent}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Plan {user.subscription}
          </span>
          <button
            onClick={() => setActiveTab('subscription')}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 transition font-semibold flex items-center gap-0.5 cursor-pointer"
          >
            Planos <Sparkles className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* User profile dropdown drawer */}
      <div className="p-4 border-t border-gray-900/60 bg-gray-950/40 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {user.avatarUrl && !user.avatarUrl.includes('unsplash') ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-gray-800 object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full border border-gray-800 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-md ${(() => {
              const charCodeSum = (user.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const colors = [
                'bg-gradient-to-br from-indigo-500 to-purple-600',
                'bg-gradient-to-br from-purple-500 to-pink-500',
                'bg-gradient-to-br from-blue-500 to-teal-500',
                'bg-gradient-to-br from-emerald-500 to-teal-600',
                'bg-gradient-to-br from-rose-500 to-pink-600',
                'bg-gradient-to-br from-amber-500 to-orange-600'
              ];
              return colors[charCodeSum % colors.length];
            })()}`}>
              {(user.name || 'U').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-gray-200 truncate">{user.name}</h4>
            <p className="text-[10px] text-gray-500 truncate">{user.company || 'Fábrica de Vídeos'}</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          title="Sair da Conta"
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
