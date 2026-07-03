/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

// Import Modular Sections
import { DashboardTab } from './sections/DashboardTab';
import { UsersTab } from './sections/UsersTab';
import { PlansTab } from './sections/PlansTab';
import { FinanceTab } from './sections/FinanceTab';
import { RenderFarmTab } from './sections/RenderFarmTab';
import { StorageTab } from './sections/StorageTab';
import { LogsTab } from './sections/LogsTab';
import { CouponsTab } from './sections/CouponsTab';
import { SupportTab } from './sections/SupportTab';
import { SettingsTab } from './sections/SettingsTab';

// Toast structure
interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

interface AdminDashboardProps {
  activeMenu: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeMenu }) => {
  const { 
    allUsers, 
    adminUpdateUser, 
    adminDeleteUser, 
    renderingTasks,
    impersonateUser 
  } = useApp();

  // Toast alert manager
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    visible: false
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  return (
    <div className="relative min-h-[500px]">
      
      {/* Dynamic Tab Router */}
      {(activeMenu === 'dashboard' || activeMenu === 'analytics') && (
        <DashboardTab allUsers={allUsers} renderingTasks={renderingTasks} />
      )}

      {activeMenu === 'users' && (
        <UsersTab 
          allUsers={allUsers} 
          adminUpdateUser={adminUpdateUser} 
          adminDeleteUser={adminDeleteUser} 
          impersonateUser={impersonateUser}
          showToast={showToast}
        />
      )}

      {activeMenu === 'subscriptions' && (
        <PlansTab showToast={showToast} />
      )}

      {activeMenu === 'payments' && (
        <FinanceTab showToast={showToast} />
      )}

      {(activeMenu === 'renderings' || activeMenu === 'queue' || activeMenu === 'workers') && (
        <RenderFarmTab renderingTasks={renderingTasks} showToast={showToast} />
      )}

      {activeMenu === 'storage' && (
        <StorageTab showToast={showToast} />
      )}

      {activeMenu === 'logs' && (
        <LogsTab showToast={showToast} />
      )}

      {activeMenu === 'coupons' && (
        <CouponsTab showToast={showToast} />
      )}

      {activeMenu === 'support' && (
        <SupportTab showToast={showToast} />
      )}

      {activeMenu === 'settings' && (
        <SettingsTab showToast={showToast} />
      )}

      {/* Elegant HUD Toast Overlay Alert System */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-bounce-short">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-sm transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400'
              : toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/30 text-red-400'
              : 'bg-indigo-950/90 border-indigo-500/30 text-indigo-400'
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              toast.type === 'success' ? 'bg-emerald-400 animate-pulse' : toast.type === 'error' ? 'bg-red-400 animate-pulse' : 'bg-indigo-400 animate-pulse'
            }`} />
            <p className="text-xs font-semibold leading-snug text-white font-sans">{toast.message}</p>
          </div>
        </div>
      )}

    </div>
  );
};
