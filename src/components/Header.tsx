/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Calendar, HelpCircle, Menu } from 'lucide-react';
import { getNavItem } from '../config/navigation';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { activeTab, user, setActiveTab } = useApp();

  if (!user) return null;

  const currentNavItem = getNavItem(activeTab);
  const breadcrumbs = { parent: currentNavItem.breadcrumbParent, current: currentNavItem.label };

  const getPlanColorClass = () => {
    if (user.subscription === 'Business') return 'bg-pink-950/20 border-pink-500/20 text-pink-300';
    if (user.subscription === 'Pro') return 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300';
    return 'bg-gray-900/60 border-gray-800 text-gray-300';
  };

  return (
    <header className="h-16 bg-[#030712]/40 border-b border-gray-900 sticky top-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 lg:px-8 backdrop-blur-md gap-3">
      {/* Mobile/tablet menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden shrink-0 p-1.5 -ml-1 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-900/60 transition cursor-pointer"
        title="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb path */}
      <div className="flex items-center gap-2 text-xs font-medium min-w-0 truncate">
        <span className="text-gray-500 font-mono hidden sm:inline">{breadcrumbs.parent}</span>
        <span className="text-gray-700 hidden sm:inline">/</span>
        <span className="text-gray-200 truncate">{breadcrumbs.current}</span>
      </div>

      {/* Utilities panel */}
      <div className="flex items-center gap-4">
        {/* Current Date Display */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-400 font-mono">
          <Calendar className="w-3.5 h-3.5 text-gray-500" />
          <span>{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
        </div>

        {/* Action Button: Quick Document or guide */}
        <button
          onClick={() => setActiveTab('help')}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'help'
              ? 'text-indigo-400 bg-indigo-950/20 border border-indigo-500/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
          }`}
          title="Ajuda e Tutoriais"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Premium Badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${getPlanColorClass()}`}>
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Plano {user.subscription}</span>
        </div>
      </div>
    </header>
  );
};
