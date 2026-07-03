/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Film, 
  Cpu, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { User, RenderingTask } from '../../../types';

interface DashboardTabProps {
  allUsers: User[];
  renderingTasks: RenderingTask[];
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ allUsers, renderingTasks }) => {
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | 'all'>('30d');
  const [ignoredAlerts, setIgnoredAlerts] = useState<string[]>([]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.status === 'active').length;
    const suspended = allUsers.filter(u => u.status === 'suspended').length;

    // MRR
    const mrr = allUsers.reduce((acc, u) => {
      if (u.status !== 'active' || !u.subscriptionDetails) return acc;
      const price = u.subscriptionDetails.price || 0;
      return acc + (u.subscriptionDetails.billingCycle === 'annual' ? price / 12 : price);
    }, 0);

    // Storage
    const totalStorageMB = allUsers.reduce((acc, u) => acc + (u.storageUsedMB || 0), 0);
    const totalStorageGB = (totalStorageMB / 1024).toFixed(1);

    // Active rendering jobs
    const activeJobs = renderingTasks.filter(t => t.status === 'queued' || t.status === 'processing').length;

    return {
      total,
      active,
      suspended,
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      storageGB: totalStorageGB,
      activeJobs,
      onlineSimulated: Math.floor(Math.random() * 5) + 3
    };
  }, [allUsers, renderingTasks]);

  // Simulated Alerts list
  const activeAlerts = useMemo(() => {
    const alerts = [];
    const storagePercent = (parseFloat(metrics.storageGB) / 100) * 100;
    if (storagePercent > 80) {
      alerts.push({
        id: 'storage-high',
        type: 'warning',
        title: 'Capacidade do Storage Acima de 80%',
        desc: 'O consumo consolidado de mídias ultrapassou os limites de segurança da AWS S3.',
        action: 'Limpar Órfãos'
      });
    }
    const offlineWorkers = 1; // SA-EAST Worker-Delta simulated
    if (offlineWorkers > 0) {
      alerts.push({
        id: 'worker-offline',
        type: 'critical',
        title: 'Cluster Node Offline: Delta-São Paulo',
        desc: 'O nó de processamento regional SA-EAST-01 perdeu conexão com a fila do cluster.',
        action: 'Reiniciar Node'
      });
    }
    return alerts.filter(a => !ignoredAlerts.includes(a.id));
  }, [metrics.storageGB, ignoredAlerts]);

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Painel Consolidado</h2>
          <p className="text-xs text-slate-400">Telemetria de crescimento financeiro e infraestrutura.</p>
        </div>
        <div className="bg-slate-900/60 p-1 rounded-xl border border-slate-850 flex items-center gap-1">
          {(['7d', '30d', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition uppercase cursor-pointer ${
                dateFilter === f 
                  ? 'bg-pink-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === '7d' ? '7 dias' : f === '30d' ? '30 dias' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      {/* Critical System Alerts */}
      {activeAlerts.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {activeAlerts.map(alert => (
            <div 
              key={alert.id}
              className={`p-4 border rounded-2xl flex items-start justify-between gap-4 transition duration-200 ${
                alert.type === 'critical'
                  ? 'bg-red-500/5 border-red-500/20 text-red-200'
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-200'
              }`}
            >
              <div className="flex gap-3">
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${alert.type === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">{alert.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{alert.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIgnoredAlerts(prev => [...prev, alert.id])}
                  className="px-2.5 py-1.5 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Dispensar
                </button>
                <button className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg text-[10px] font-bold text-white transition shadow cursor-pointer">
                  {alert.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: MRR / ARR */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Faturamento SaaS</span>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">R$ {metrics.mrr.toLocaleString('pt-BR')}</h3>
            <p className="text-[10px] text-slate-500 font-mono">
              ARR ESTIMADO: <span className="text-emerald-400">R$ {metrics.arr.toLocaleString('pt-BR')}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold font-mono">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+14.8% em relação ao mês anterior</span>
          </div>
        </div>

        {/* KPI: Users */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Clientes Ativos</span>
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">{metrics.total}</h3>
            <p className="text-[10px] text-slate-500 font-mono">
              SIMULADOS ONLINE: <span className="text-indigo-400">{metrics.onlineSimulated}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold font-mono">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+8% novos usuários esta semana</span>
          </div>
        </div>

        {/* KPI: Renders */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Fila FFmpeg</span>
            <div className="p-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">{renderingTasks.length}</h3>
            <p className="text-[10px] text-slate-500 font-mono">
              PROCESSOS AGORA: <span className="text-pink-400">{metrics.activeJobs}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold font-mono">
            <Clock className="w-3.5 h-3.5 text-pink-500" />
            <span>Tempo médio render: 45s</span>
          </div>
        </div>

        {/* KPI: Telemetry HW */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Cluster Telemetria</span>
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight">{metrics.storageGB} GB</h3>
            <p className="text-[10px] text-slate-500 font-mono">
              NODES ONLINE: <span className="text-cyan-400">3 / 4</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold font-mono">
            <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
            <span>Consumo S3 estável</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Financial Growth (inline SVG for premium, bespoke styling and compatibility) */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white">Mapeamento de MRR</h3>
              <p className="text-[10px] text-slate-500">Crescimento financeiro nos últimos 6 meses (valores em R$)</p>
            </div>
            <span className="text-[10px] text-indigo-400 font-mono font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Metas atingidas
            </span>
          </div>

          {/* SVG Line/Area Chart */}
          <div className="h-44 w-full pt-4 relative">
            <svg viewBox="0 0 500 150" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Background horizontal grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" />

              {/* Area path */}
              <path 
                d="M 0 135 Q 80 120 100 110 T 200 95 T 300 80 T 400 50 T 500 35 L 500 150 L 0 150 Z" 
                fill="url(#chartGradient)" 
              />

              {/* Main Line path */}
              <path 
                d="M 0 135 Q 80 120 100 110 T 200 95 T 300 80 T 400 50 T 500 35" 
                fill="none" 
                stroke="url(#lineGradient)" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>

              {/* Interactive nodes dots */}
              <circle cx="100" cy="110" r="4" fill="#8b5cf6" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="200" cy="95" r="4" fill="#8b5cf6" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="300" cy="80" r="4" fill="#ec4899" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="400" cy="50" r="4" fill="#06b6d4" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="500" cy="35" r="4" fill="#06b6d4" stroke="#0f172a" strokeWidth="1.5" />
            </svg>
            <div className="absolute top-2 left-[100px] bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[8px] text-indigo-300 font-mono -translate-y-5 -translate-x-1/2">
              R$ 8.4k
            </div>
            <div className="absolute top-[48px] left-[300px] bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[8px] text-pink-300 font-mono -translate-y-5 -translate-x-1/2">
              R$ 11.2k
            </div>
            <div className="absolute top-[3px] left-[495px] bg-slate-900 border border-slate-850 rounded px-1.5 py-0.5 text-[8px] text-cyan-300 font-mono -translate-y-5 -translate-x-full">
              R$ {metrics.mrr.toLocaleString('pt-BR')} (Jan)
            </div>
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-2 px-1">
            <span>Jul/25</span>
            <span>Ago/25</span>
            <span>Set/25</span>
            <span>Out/25</span>
            <span>Nov/25</span>
            <span>Dez/25</span>
            <span>Jan/26</span>
          </div>
        </div>

        {/* Breakdown Panel: Plan distribution and operational states */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">Canais de Conversão</h3>
            <p className="text-[10px] text-slate-500">Distribuição percentual de assinaturas de clientes.</p>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {/* Plan Rows */}
            {[
              { label: 'Starter', count: allUsers.filter(u => u.subscription === 'Starter').length, color: 'bg-indigo-500' },
              { label: 'Pro', count: allUsers.filter(u => u.subscription === 'Pro').length, color: 'bg-pink-500' },
              { label: 'Business', count: allUsers.filter(u => u.subscription === 'Business').length, color: 'bg-cyan-500' },
              { label: 'Free Trial', count: allUsers.filter(u => u.subscription === 'Free').length, color: 'bg-slate-600' }
            ].map(plan => {
              const total = allUsers.length || 1;
              const percent = Math.round((plan.count / total) * 100);
              return (
                <div key={plan.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 font-medium">{plan.label}</span>
                    <span className="text-slate-500 font-bold">{plan.count} ({percent}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900/50">
                    <div className={`h-full rounded-full ${plan.color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-900/40 flex items-center justify-between text-[9px] text-slate-500 font-mono">
            <span>TOTAL PAGOS: {allUsers.filter(u => u.subscription !== 'Free').length}</span>
            <span className="text-emerald-400">Churn: 1.8% (Ótimo)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
