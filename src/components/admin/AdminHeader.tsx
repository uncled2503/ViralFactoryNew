/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useRouter } from '../../hooks/useRouter';
import { 
  Shield, 
  Cpu, 
  Radio, 
  Settings, 
  RefreshCw, 
  ArrowLeftRight 
} from 'lucide-react';
import { AdminMenuId } from './AdminSidebar';

interface AdminHeaderProps {
  activeMenu: AdminMenuId;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ activeMenu }) => {
  const { user } = useApp();
  const { navigate } = useRouter();
  const [dateTimeStr, setDateTimeStr] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Formatting date for UTC dashboard
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'short'
      };
      setDateTimeStr(now.toLocaleDateString('pt-BR', options));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getMenuLabel = () => {
    switch (activeMenu) {
      case 'dashboard': return 'Dashboard de Métricas';
      case 'users': return 'Gestão de Clientes';
      case 'subscriptions': return 'Assinaturas & Cobranças';
      case 'payments': return 'Histórico Financeiro';
      case 'renderings': return 'Processos FFmpeg';
      case 'queue': return 'Fila de Tarefas';
      case 'workers': return 'Cluster de Workers';
      case 'storage': return 'Uso de Storage Geral';
      case 'logs': return 'Logs Globais do Sistema';
      case 'coupons': return 'Cupons de Desconto';
      case 'analytics': return 'Métricas de Crescimento';
      case 'settings': return 'Configurações do SaaS';
      case 'support': return 'Suporte Técnico e Tickets';
      default: return 'Visão Geral';
    }
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <header id="admin-header" className="h-16 bg-slate-950 border-b border-slate-900 sticky top-0 z-10 flex items-center justify-between px-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-pink-500" />
        <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">
          Painel Administrativo
        </span>
        <span className="text-slate-700 text-xs font-mono">/</span>
        <span className="text-xs font-semibold text-slate-200">
          {getMenuLabel()}
        </span>
      </div>

      {/* Admin Right Elements */}
      <div className="flex items-center gap-4">
        {/* Active Worker Nodes Indicator */}
        <div className="hidden md:flex items-center gap-5 border-r border-slate-900 pr-5">
          {/* Cluster Status */}
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-slate-400">
              CLUSTER: <span className="text-emerald-400">4 / 4 ONLINE</span>
            </span>
          </div>

          {/* Average Cluster Load */}
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-pink-500" />
            <span className="text-[10px] font-mono font-bold text-slate-400">
              LOAD: <span className="text-pink-400">22.4%</span>
            </span>
          </div>
        </div>

        {/* Global Date/Time */}
        <div className="text-[10px] font-mono font-bold text-slate-500 hidden sm:block bg-slate-900/40 border border-slate-900 py-1 px-3 rounded-lg">
          {dateTimeStr}
        </div>

        {/* Action: Sync Database */}
        <button
          onClick={handleManualSync}
          className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          title="Sincronizar Telemetria"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-pink-500' : ''}`} />
        </button>

        {/* Quick Back-to-Workspace Action */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-medium text-[11px] rounded-lg transition-all shadow-md shadow-pink-600/10 cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Área do Cliente
        </button>
      </div>
    </header>
  );
};
