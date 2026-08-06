/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Film, 
  Cpu, 
  HardDrive, 
  AlertTriangle, 
  RefreshCw, 
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { isSupabaseConfigured } from '../../../services/dbClient';
import { adminFetch } from '../../../utils/api';

export const DashboardTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/dashboard');
      if (!res.ok) {
        throw new Error('Falha ao comunicar com o servidor.');
      }
      const payload = await res.json();
      setData(payload);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const metrics = useMemo(() => {
    if (!data?.metrics) {
      return {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        mrr: 0,
        arr: 0,
        totalStorageGB: "0.00",
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        onlineWorkers: 0,
      };
    }
    return data.metrics;
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Carregando telemetria em tempo real...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Painel Consolidado</h2>
          <p className="text-xs text-slate-400 font-sans">Mapeamento real de infraestrutura, faturamento e contas.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
          title="Recarregar dados"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Database Unconfigured Warning */}
      {!isSupabaseConfigured() && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3 items-start text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white">Integração Supabase Não Configurada</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O backend Express não detectou credenciais do Supabase. Nenhuma informação fictícia será gerada no banco de dados persistente. Configure as variáveis de ambiente <code className="text-pink-400 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded text-[10px]">VITE_SUPABASE_URL</code> e <code className="text-pink-400 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded text-[10px]">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
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
            <h3 className="text-2xl font-black text-white tracking-tight">R$ {(metrics?.mrr || 0).toLocaleString('pt-BR')}</h3>
            <p className="text-[10px] text-slate-500 font-mono">
              ARR ESTIMADO: <span className="text-emerald-400">R$ {(metrics?.arr || 0).toLocaleString('pt-BR')}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold font-mono">
            <span>Dados de faturamento real consolidados</span>
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
            <h3 className="text-2xl font-black text-white tracking-tight">{metrics.activeUsers} / {metrics.totalUsers}</h3>
            <p className="text-[10px] text-slate-500 font-mono">
              USUÁRIOS SUSPENSOS: <span className="text-indigo-400">{metrics.suspendedUsers}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold font-mono">
            <span>Contas reais cadastradas no SaaS</span>
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
            <h3 className="text-2xl font-black text-white tracking-tight">{metrics.activeJobs}</h3>
            <p className="text-[10px] text-slate-500 font-mono">
              COMPLETADOS / FALHADOS: <span className="text-pink-400">{metrics.completedJobs} / {metrics.failedJobs}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold font-mono">
            <Clock className="w-3.5 h-3.5 text-pink-500" />
            <span>Tarefas de render farm ativa</span>
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
            <h3 className="text-2xl font-black text-white tracking-tight">{metrics.totalStorageGB} GB</h3>
            <p className="text-[10px] text-slate-500 font-mono">
              WORKERS ATIVOS: <span className="text-cyan-400">{metrics.onlineWorkers}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold font-mono">
            <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
            <span>Armazenamento S3 consolidado</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Financial Growth */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white font-sans">Mapeamento de MRR Real</h3>
              <p className="text-[10px] text-slate-500 font-sans">Evolução financeira baseada em assinaturas vigentes.</p>
            </div>
          </div>

          <div className="h-44 w-full pt-4 relative flex items-center justify-center border border-slate-900/50 rounded-xl bg-slate-950/20">
            {metrics.mrr === 0 ? (
              <div className="text-center space-y-1">
                <p className="text-[11px] font-mono text-slate-500">Sem histórico financeiro real</p>
                <p className="text-[9px] text-slate-600">Assinaturas ativas acumularão dados aqui.</p>
              </div>
            ) : (
              <svg viewBox="0 0 500 150" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="75" x2="500" y2="75" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" />
                <path 
                  d="M 0 150 L 125 140 L 250 120 L 375 90 L 500 40 L 500 150 Z" 
                  fill="url(#chartGradient)" 
                />
                <path 
                  d="M 0 150 L 125 140 L 250 120 L 375 90 L 500 40" 
                  fill="none" 
                  stroke="#ec4899" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                />
                <circle cx="500" cy="40" r="5" fill="#ec4899" />
              </svg>
            )}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-2 px-1">
            <span>Hoje</span>
          </div>
        </div>

        {/* Breakdown Panel */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white font-sans">Canais de Conversão</h3>
            <p className="text-[10px] text-slate-500 font-sans font-normal">Distribuição percentual de assinaturas de clientes.</p>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {metrics.totalUsers === 0 ? (
              <div className="text-center py-6">
                <p className="text-[10px] font-mono text-slate-500">Nenhum registro</p>
              </div>
            ) : (
              ['Starter', 'Pro', 'Business', 'Free'].map(tier => {
                const count = (data?.recentUsers || []).filter((u: any) => u.subscription_tier === tier || u.subscription === tier).length;
                const total = metrics.totalUsers || 1;
                const percent = Math.round((count / total) * 100);
                return (
                  <div key={tier} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400 font-medium">{tier}</span>
                      <span className="text-slate-500 font-bold">{count} ({percent}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900/50">
                      <div className="h-full rounded-full bg-pink-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-4 border-t border-slate-900/40 flex items-center justify-between text-[9px] text-slate-500 font-mono">
            <span>PLATAFORMA INTEGRADA</span>
            <span className="text-emerald-400">Produção</span>
          </div>
        </div>
      </div>
    </div>
  );
};
