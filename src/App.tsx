/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
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
import { HelpTutorials } from './components/HelpTutorials';
import { ProfileSettings } from './components/ProfileSettings';
import { LimitExceededModal } from './components/LimitExceededModal';
import { useRouter } from './hooks/useRouter';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProjectEditor } from './components/ProjectEditor';
import { LandingPage } from './components/LandingPage';

const AppContent: React.FC = () => {
  const { user, activeTab, setActiveTab } = useApp();
  const { path, navigate } = useRouter();

  // Redirect root path '/' to '/dashboard' once authenticated
  useEffect(() => {
    if (user && path === '/') {
      navigate('/dashboard');
    }
  }, [path, user, navigate]);

  // If user is not authenticated, choose between landing page or auth routes
  if (!user) {
    if (path === '/login') {
      return <Auth initialMode="login" />;
    }
    if (path === '/register') {
      return <Auth initialMode="register" />;
    }
    if (path === '/recovery') {
      return <Auth initialMode="recovery" />;
    }
    return <LandingPage />;
  }

  // 3. COMPLETE ARCHITECTURAL INTERCEPTOR: /admin gets its own application frame
  if (path.startsWith('/admin')) {
    return <AdminLayout />;
  }

  // Interceptor for Project Editor route /project/:id or /projects/:id
  if (path.startsWith('/project/') || (path.startsWith('/projects/') && path !== '/projects')) {
    const projectId = path.split('/projects/')[1] || path.split('/project/')[1];
    return <ProjectEditor projectId={projectId} />;
  }

  // 4. Render the currently selected tab for Client Space
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
      case 'help':
        return <HelpTutorials />;
      case 'profile-settings':
        return <ProfileSettings />;
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
          <span>Plataforma de Produção e Edição de Vídeos</span>
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
