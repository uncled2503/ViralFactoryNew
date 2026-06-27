/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Calendar, HelpCircle, FileSpreadsheet } from 'lucide-react';

export const Header: React.FC = () => {
  const { activeTab, user, stats } = useApp();

  const getBreadcrumbs = () => {
    switch (activeTab) {
      case 'dashboard':
        return { parent: 'Workspace', current: 'Dashboard Geral' };
      case 'projects':
        return { parent: 'Workspace', current: 'Meus Projetos' };
      case 'templates':
        return { parent: 'Vídeo Engine', current: 'Templates de Layout' };
      case 'renderings':
        return { parent: 'Vídeo Engine', current: 'Fila de Renderização' };
      case 'storage':
        return { parent: 'Sistema de Arquivos', current: 'Pastas & Mídias' };
      case 'subscription':
        return { parent: 'Minha Conta', current: 'Planos & Cobrança' };
      case 'admin':
        return { parent: 'Administrador', current: 'Painel do SaaS' };
      default:
        return { parent: 'Workspace', current: 'Dashboard' };
    }
  };

  if (!user) return null;

  const breadcrumbs = getBreadcrumbs();

  const getPlanColorClass = () => {
    if (user.subscription === 'Business') return 'bg-pink-950/20 border-pink-500/20 text-pink-300';
    if (user.subscription === 'Pro') return 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300';
    return 'bg-gray-900/60 border-gray-800 text-gray-300';
  };

  return (
    <header className="h-16 bg-[#030712]/40 border-b border-gray-900 sticky top-0 right-0 z-10 flex items-center justify-between px-8 backdrop-blur-md">
      {/* Breadcrumb path */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className="text-gray-500 font-mono">{breadcrumbs.parent}</span>
        <span className="text-gray-700">/</span>
        <span className="text-gray-200">{breadcrumbs.current}</span>
      </div>

      {/* Utilities panel */}
      <div className="flex items-center gap-4">
        {/* Render indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-900/40 border border-gray-900 rounded-full text-[11px] font-mono text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Engine Status: Ativo e pronto</span>
        </div>

        {/* Current Date Display */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-400 font-mono">
          <Calendar className="w-3.5 h-3.5 text-gray-500" />
          <span>{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
        </div>

        {/* Action Button: Quick Document or guide */}
        <button
          onClick={() => alert('Para configurar novos vídeos, crie um projeto associando a qualquer template e pressione "Solicitar Render".')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 transition cursor-pointer"
          title="Ajuda e Tutoriais"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Premium Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${getPlanColorClass()}`}>
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Plano {user.subscription}</span>
        </div>
      </div>
    </header>
  );
};
