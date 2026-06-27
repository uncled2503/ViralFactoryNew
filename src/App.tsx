/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { ProjectsManager } from './components/ProjectsManager';
import { TemplatesManager } from './components/TemplatesManager';
import { RenderingsManager } from './components/RenderingsManager';
import { StorageManager } from './components/StorageManager';
import { SubscriptionDashboard } from './components/SubscriptionDashboard';
import { AdminPanel } from './components/AdminPanel';
import { LimitExceededModal } from './components/LimitExceededModal';

const AppContent: React.FC = () => {
  const { user, activeTab } = useApp();

  // If user is not authenticated, show Auth Panel
  if (!user) {
    return <Auth />;
  }

  // Render the currently selected tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'projects':
        return <ProjectsManager />;
      case 'templates':
        return <TemplatesManager />;
      case 'renderings':
        return <RenderingsManager />;
      case 'storage':
        return <StorageManager />;
      case 'subscription':
        return <SubscriptionDashboard />;
      case 'admin':
        if (user.role === 'SaaS_Owner') {
          return <AdminPanel />;
        }
        return <DashboardOverview />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex">
      {/* Permanent Premium Left Sidebar */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-h-screen pl-64">
        {/* Sticky Header info bar */}
        <Header />

        {/* Dynamic page content wrapped with elegant padding and max-width bounds */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto relative z-10">
          {renderActiveTab()}
        </main>

        {/* Footer info bar */}
        <footer className="h-12 border-t border-gray-900/40 flex items-center justify-between px-8 text-[10px] font-mono text-gray-600">
          <span>Viral Factory © 2026</span>
          <span>SaaS Video Rendering Platform (FFmpeg Engine Ready)</span>
        </footer>
      </div>

      {/* Global Limit Control Overlay Modal */}
      <LimitExceededModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
