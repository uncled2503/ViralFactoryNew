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

const AppContent: React.FC = () => {
  const { user, activeTab, setActiveTab } = useApp();
  const { path, navigate } = useRouter();

  // 1. Path-to-Tab Routing Sync Layer (Frontend Router)
  useEffect(() => {
    if (!user) return;

    if (path === '/dashboard') {
      if (activeTab !== 'dashboard') setActiveTab('dashboard');
    } else if (path === '/projects') {
      if (activeTab !== 'projects') setActiveTab('projects');
    } else if (path === '/templates') {
      if (activeTab !== 'templates') setActiveTab('templates');
    } else if (path === '/renders' || path === '/renderings') {
      if (activeTab !== 'renderings') setActiveTab('renderings');
    } else if (path === '/files' || path === '/storage') {
      if (activeTab !== 'storage') setActiveTab('storage');
    } else if (path === '/subscription') {
      if (activeTab !== 'subscription') setActiveTab('subscription');
    } else if (path === '/settings/profile') {
      if (activeTab !== 'profile-settings') setActiveTab('profile-settings');
    } else if (path === '/settings' || path === '/help') {
      if (activeTab !== 'help') setActiveTab('help');
    } else if (path === '/') {
      navigate('/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, user, navigate, setActiveTab]);

  // 2. Tab-to-Path Reverse Sync Layer (Browser URL bar update)
  useEffect(() => {
    if (!user) return;
    if (path.startsWith('/admin')) return; // Let admin routes have full URL control

    const tabToPathMap: Record<string, string> = {
      dashboard: '/dashboard',
      projects: '/projects',
      templates: '/templates',
      renderings: '/renders',
      storage: '/files',
      subscription: '/subscription',
      help: '/settings',
      'profile-settings': '/settings/profile'
    };

    const targetPath = tabToPathMap[activeTab];
    if (targetPath && path !== targetPath) {
      navigate(targetPath);
    }
  }, [activeTab, user, path, navigate]);

  // If user is not authenticated, show Auth Panel
  if (!user) {
    return <Auth />;
  }

  // 3. COMPLETE ARCHITECTURAL INTERCEPTOR: /admin gets its own application frame
  if (path.startsWith('/admin')) {
    return <AdminLayout />;
  }

  // Interceptor for Project Editor route /project/:id
  if (path.startsWith('/project/')) {
    const projectId = path.split('/project/')[1];
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
