/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../hooks/useRouter';
import { AdminSidebar, AdminMenuId } from '../admin/AdminSidebar';
import { AdminHeader } from '../admin/AdminHeader';
import { AdminDashboard } from '../admin/AdminDashboard';
import { isAdminRole } from '../../utils/rbac';
import { ShieldAlert, ArrowLeftRight, FileWarning, HelpCircle } from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user } = useApp();
  const { navigate } = useRouter();
  const [activeMenu, setActiveMenu] = useState<AdminMenuId>('dashboard');

  // Double validation for administrative roles
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center max-w-sm space-y-4 shadow-xl">
          <ShieldAlert className="w-12 h-12 text-pink-500 mx-auto" />
          <h2 className="text-white font-bold text-lg">Autenticação Necessária</h2>
          <p className="text-xs text-slate-400 leading-normal">
            Faça login em sua conta com credenciais de administrador para acessar a Área do SaaS.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition"
          >
            Ir para Tela de Login
          </button>
        </div>
      </div>
    );
  }

  // Security Access Shield (403 Forbidden Page)
  if (!isAdminRole(user.role)) {
    return (
      <div className="min-h-screen bg-[#030712] text-gray-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-950 border border-slate-900 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Subtle cosmic styling overlay */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/10 rounded-full blur-2xl" />
          
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold bg-red-500/10 border border-red-500/20 text-red-400 py-0.5 px-2.5 rounded-full uppercase tracking-wider">
              Erro 403 • Acesso Negado
            </span>
            <h1 className="text-xl font-black text-white tracking-tight">Área Restrita aos Administradores</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Desculpe, <strong className="text-white">{user.name}</strong>. Sua conta possui cargo <strong className="text-indigo-400">"{user.role}"</strong>, que não possui as permissões necessárias para acessar este terminal.
            </p>
          </div>

          <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-900 text-left text-[11px] text-slate-500 leading-relaxed font-mono space-y-1">
            <div>HOST_DENIED: /admin</div>
            <div>USER_ID: {user.id}</div>
            <div>PERM_STATUS: REJECTED_BY_RBAC_POLICY</div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              <ArrowLeftRight className="w-4 h-4 text-pink-500" />
              Área de Trabalho
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Exclusivo Admin Left Sidebar */}
      <AdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      {/* Main Admin Content Panel */}
      <div className="flex-1 flex flex-col min-h-screen pl-64">
        {/* Sticky Admin Header */}
        <AdminHeader activeMenu={activeMenu} />

        {/* Core Administrative Console rendered with specialized max bounds */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto relative z-10">
          <AdminDashboard activeMenu={activeMenu} />
        </main>

        {/* Exclusivo Admin Footer */}
        <footer className="h-12 border-t border-slate-900 flex items-center justify-between px-8 text-[10px] font-mono text-slate-600 bg-slate-950">
          <span>Viral Factory Admin Terminal © 2026</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SaaS Telemetry Layer Secure
          </span>
        </footer>
      </div>
    </div>
  );
};
