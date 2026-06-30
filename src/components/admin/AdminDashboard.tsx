/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User, PlanTier, SystemLog, RenderWorker, BillingCycle, UserSubscription } from '../../types';
import { 
  Users, 
  Sparkles, 
  DollarSign, 
  Film, 
  Clock, 
  Cpu, 
  HardDrive, 
  Terminal, 
  Ticket, 
  TrendingUp, 
  Settings, 
  LifeBuoy,
  Search,
  UserCog,
  Ban,
  CheckCircle,
  Trash2,
  ExternalLink,
  Plus,
  RefreshCw,
  Pause,
  Play,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Activity,
  UserCheck
} from 'lucide-react';
import { PLANS_DETAILS } from '../../config/plans';
import { ROLE_DETAILS_MAP, hasPermission } from '../../utils/rbac';

interface AdminDashboardProps {
  activeMenu: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeMenu }) => {
  const { 
    allUsers, 
    adminUpdateUser, 
    adminDeleteUser, 
    renderingTasks, 
    folders,
    stats: clientStats 
  } = useApp();

  // --- LOCAL EXTENSIVE STATE FOR ADMINISTRATIVE MODULES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Workers state
  const [workers, setWorkers] = useState<RenderWorker[]>([
    { id: 'wrk-01', name: 'US-EAST Worker-Alpha', status: 'online', cpuUsage: 14, memoryUsage: 32, processedCount: 1420, region: 'N. Virginia' },
    { id: 'wrk-02', name: 'US-WEST Worker-Beta', status: 'busy', cpuUsage: 89, memoryUsage: 74, processedCount: 980, region: 'Oregon' },
    { id: 'wrk-03', name: 'EU-WEST Worker-Gamma', status: 'online', cpuUsage: 5, memoryUsage: 18, processedCount: 1205, region: 'Frankfurt' },
    { id: 'wrk-04', name: 'SA-EAST Worker-Delta', status: 'offline', cpuUsage: 0, memoryUsage: 0, processedCount: 540, region: 'São Paulo' }
  ]);

  // System Logs state
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([
    { id: 'log-01', timestamp: new Date(Date.now() - 4000).toISOString(), level: 'info', service: 'ffmpeg-worker', message: 'FFmpeg command completed for project prj-001 in 45s.', ipAddress: '10.244.1.15' },
    { id: 'log-02', timestamp: new Date(Date.now() - 15000).toISOString(), level: 'info', service: 'auth-service', message: 'User Gabriel Moura logged in successfully.', ipAddress: '191.182.14.9' },
    { id: 'log-03', timestamp: new Date(Date.now() - 45000).toISOString(), level: 'warning', service: 'storage-handler', message: 'User usr-002 reached 61% of storage quota limit.', ipAddress: '200.141.11.2' },
    { id: 'log-04', timestamp: new Date(Date.now() - 120000).toISOString(), level: 'info', service: 'billing-engine', message: 'Subscription sub-001 successfully renewed for next period.', ipAddress: 'stripe-webhook' },
    { id: 'log-05', timestamp: new Date(Date.now() - 300000).toISOString(), level: 'error', service: 'ffmpeg-worker', message: 'Codec error frame 1400: Failed to decode input background stream.', ipAddress: '10.244.2.19' }
  ]);

  // Coupons state
  const [coupons, setCoupons] = useState([
    { id: 'cpn-01', code: 'VIRAL50', type: 'percentage', value: 50, status: 'active', uses: 87, maxUses: 200, expires: '2026-12-31' },
    { id: 'cpn-02', code: 'BETA100', type: 'fixed', value: 100, status: 'active', uses: 45, maxUses: 50, expires: '2026-08-15' },
    { id: 'cpn-03', code: 'INFLUENCER_GROW', type: 'percentage', value: 25, status: 'expired', uses: 120, maxUses: 120, expires: '2026-06-01' }
  ]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponValue, setNewCouponValue] = useState(20);
  const [newCouponType, setNewCouponType] = useState('percentage');

  // Support state
  const [supportTickets, setSupportTickets] = useState([
    { id: 'tkt-1', user: 'Bruna Silva', email: 'bruna@ecom.com', plan: 'Starter', subject: 'Problemas de enquadramento 9:16', status: 'open', date: '2026-06-28T14:20:00Z', text: 'Olá, quando utilizo o template Reddit stories, as legendas inferiores ficam cortadas no app do TikTok. Poderiam ajustar o espaçamento vertical?' },
    { id: 'tkt-2', user: 'Lucas Santos', email: 'lucas@agency.io', plan: 'Business', subject: 'Solicitação de API Access', status: 'responded', date: '2026-06-27T09:15:00Z', text: 'Gostaria de integrar a renderização do Viral Factory diretamente em nossa esteira interna de automação por API. Onde obtenho a Bearer Token?' }
  ]);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // Settings State
  const [maxUploadLimitMB, setMaxUploadLimitMB] = useState(500);
  const [defaultRenderPriority, setDefaultRenderPriority] = useState('normal');
  const [enableBetaFeatures, setEnableBetaFeatures] = useState(true);
  const [apiThrottlingLimit, setApiThrottlingLimit] = useState(100);

  // Live log simulation
  useEffect(() => {
    const services: Array<'ffmpeg-worker' | 'auth-service' | 'billing-engine' | 'storage-handler'>[] = [
      ['ffmpeg-worker'], ['auth-service'], ['billing-engine'], ['storage-handler']
    ];
    const messages = [
      'Worker-Beta received job queue payload.',
      'API Token authenticated for support agent.',
      'Storage bucket sync complete in sa-east-1.',
      'Memory cleanup: Released 512MB of cached chunks.',
      'Billing webhook processed: Invoice ref inv-39201.',
      'Ffmpeg enconding started at 60fps (fastest mode).'
    ];
    const levels: Array<'info' | 'warning' | 'error'>[] = [['info'], ['info'], ['warning'], ['info']];

    const interval = setInterval(() => {
      if (activeMenu === 'logs') {
        const randomSvc = services[Math.floor(Math.random() * services.length)][0];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        const randomLvl = levels[Math.floor(Math.random() * levels.length)][0];
        const newLog: SystemLog = {
          id: `log-${Math.floor(Math.random() * 90000) + 10000}`,
          timestamp: new Date().toISOString(),
          level: randomLvl as any,
          service: randomSvc,
          message: randomMsg,
          ipAddress: `${Math.floor(Math.random() * 150) + 50}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 254) + 1}`
        };
        setSystemLogs(prev => [newLog, ...prev.slice(0, 49)]);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeMenu]);


  // --- CALCULATING METRICS & KPIS ---
  const kpis = useMemo(() => {
    const totalUsersCount = allUsers.length;
    const activeUsersCount = allUsers.filter(u => u.status === 'active').length;
    const suspendedUsersCount = allUsers.filter(u => u.status === 'suspended').length;

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = allUsers.reduce((acc, u) => {
      if (u.status !== 'active' || !u.subscriptionDetails) return acc;
      const price = u.subscriptionDetails.price;
      const cycle = u.subscriptionDetails.billingCycle;
      const monthlyEquivalent = cycle === 'annual' ? price / 12 : price;
      return acc + monthlyEquivalent;
    }, 0);

    // ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Renders
    const totalRenders = clientStats?.totalVideosRendered || renderingTasks.length || 2400;
    const monthRenders = allUsers.reduce((acc, u) => acc + (u.usageCurrent || 0), 0);
    const dayRenders = Math.round(monthRenders / 25) + 3; // Simulated daily average

    // Storage
    const totalStorageMB = allUsers.reduce((acc, u) => acc + (u.storageUsedMB || 0), 0);
    const totalStorageGB = totalStorageMB / 1024;
    const averageStorageMBPerUser = totalUsersCount > 0 ? totalStorageMB / totalUsersCount : 0;

    // Queue status
    const inProgressCount = renderingTasks.filter(t => t.status === 'processing').length;
    const queuedCount = renderingTasks.filter(t => t.status === 'queued').length;

    // Workers
    const activeWorkersCount = workers.filter(w => w.status === 'online' || w.status === 'busy').length;

    // Plan count
    const starterCount = allUsers.filter(u => u.subscription === 'Starter').length;
    const proCount = allUsers.filter(u => u.subscription === 'Pro').length;
    const businessCount = allUsers.filter(u => u.subscription === 'Business').length;

    return {
      totalUsers: totalUsersCount,
      activeUsers: activeUsersCount,
      suspendedUsers: suspendedUsersCount,
      mrr,
      arr,
      totalRenders,
      monthRenders,
      dayRenders,
      storageUsedGB: totalStorageGB,
      averageStorageMB: averageStorageMBPerUser,
      inProgress: inProgressCount,
      queued: queuedCount,
      activeWorkers: activeWorkersCount,
      starterCount,
      proCount,
      businessCount
    };
  }, [allUsers, renderingTasks, workers, clientStats]);

  // Filters for User management
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (u.company && u.company.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPlan = filterPlan === 'all' || u.subscription === filterPlan;
      const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [allUsers, searchQuery, filterPlan, filterStatus]);


  // --- MUTATIVE ACTIONS ---
  const handleToggleSuspension = (targetUser: User) => {
    const nextStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    adminUpdateUser(targetUser.id, { status: nextStatus });
    if (editingUser?.id === targetUser.id) {
      setEditingUser({ ...editingUser, status: nextStatus });
    }
  };

  const handleUpdatePlan = (userId: string, newPlan: PlanTier) => {
    const planConfig = PLANS_DETAILS.find(p => p.tier === newPlan);
    if (!planConfig) return;
    adminUpdateUser(userId, { 
      subscription: newPlan,
      usageLimit: planConfig.limits.maxVideosPerMonth
    });
    if (editingUser?.id === userId) {
      setEditingUser({ ...editingUser, subscription: newPlan, usageLimit: planConfig.limits.maxVideosPerMonth });
    }
  };

  const handleUpdateLimits = (userId: string, updates: Partial<User>) => {
    adminUpdateUser(userId, updates);
    if (editingUser?.id === userId) {
      setEditingUser({ ...editingUser, ...updates });
    }
  };

  const handleConfirmDelete = (userId: string) => {
    adminDeleteUser(userId);
    setShowDeleteConfirm(null);
    setEditingUser(null);
  };

  const handleToggleWorker = (id: string) => {
    setWorkers(prev => prev.map(w => {
      if (w.id === id) {
        return {
          ...w,
          status: w.status === 'offline' ? 'online' : 'offline',
          cpuUsage: 0,
          memoryUsage: 0
        };
      }
      return w;
    }));
  };

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode) return;
    const newC = {
      id: `cpn-${Math.floor(Math.random() * 900) + 100}`,
      code: newCouponCode.toUpperCase().trim(),
      type: newCouponType as any,
      value: Number(newCouponValue),
      status: 'active',
      uses: 0,
      maxUses: 150,
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    setCoupons(prev => [...prev, newC]);
    setNewCouponCode('');
  };

  const handleReplyTicket = (id: string) => {
    if (!ticketReplyText) return;
    setSupportTickets(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: 'responded' };
      }
      return t;
    }));
    setTicketReplyText('');
    setActiveTicketId(null);
  };


  // --- RENDER COMPONENT VIEW BASED ON ACTIVE MENU ---
  return (
    <div className="space-y-6">

      {/* 1. VISÃO GERAL (DASHBOARD) */}
      {activeMenu === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Painel de Telemetria Geral</h2>
              <p className="text-xs text-slate-500 mt-1">Visão holística das contas de clientes, consumo de fila, cluster de renders e faturamento recorrente simulado.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Conexão Segura Ativa (SSL-TLS)</span>
            </div>
          </div>

          {/* Bento metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI Users */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-pink-500/20">
                <Users className="w-10 h-10" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Base de Usuários</p>
              <h3 className="text-3xl font-extrabold text-white mt-2">{kpis.totalUsers}</h3>
              <div className="flex items-center gap-2 mt-2 text-[10px] font-mono">
                <span className="text-emerald-400 font-bold">● {kpis.activeUsers} Ativos</span>
                <span className="text-slate-600">•</span>
                <span className="text-red-400 font-bold">● {kpis.suspendedUsers} Suspensos</span>
              </div>
            </div>

            {/* KPI MRR */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-emerald-500/20">
                <DollarSign className="w-10 h-10" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Simulação MRR</p>
              <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">R$ {kpis.mrr.toLocaleString('pt-BR')},00</h3>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-mono">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>ARR: <strong className="text-white">R$ {kpis.arr.toLocaleString('pt-BR')},00</strong></span>
              </div>
            </div>

            {/* KPI Render Status */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-pink-500/20">
                <Film className="w-10 h-10" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Renderizações Totais</p>
              <h3 className="text-3xl font-extrabold text-white mt-2">{kpis.totalRenders}</h3>
              <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-slate-400">
                <span>Dia: <strong className="text-pink-400">+{kpis.dayRenders}</strong></span>
                <span>•</span>
                <span>Mês: <strong className="text-white">+{kpis.monthRenders}</strong></span>
              </div>
            </div>

            {/* KPI Queues */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-blue-500/20">
                <Clock className="w-10 h-10" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Fila de Renders</p>
              <h3 className="text-3xl font-extrabold text-white mt-2">{kpis.queued + kpis.inProgress}</h3>
              <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-slate-400">
                <span className="text-amber-400 font-bold">● {kpis.inProgress} Processando</span>
                <span>•</span>
                <span className="text-blue-400 font-bold">● {kpis.queued} Em Espera</span>
              </div>
            </div>
          </div>

          {/* Second level telemetry Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* System Cluster (Workers) overview */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-900 pb-3 flex items-center justify-between">
                <span>Cluster de Nodes ({kpis.activeWorkers}/4)</span>
                <Cpu className="w-4 h-4 text-pink-500" />
              </h4>
              <div className="space-y-3">
                {workers.map(w => (
                  <div key={w.id} className="p-3 rounded-xl bg-slate-900/40 border border-slate-900 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-200 block">{w.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{w.region}</span>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        w.status === 'online' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/15' :
                        w.status === 'busy' ? 'bg-amber-500/5 text-amber-400 border-amber-500/15' :
                        'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        {w.status.toUpperCase()}
                      </span>
                      {w.status !== 'offline' && (
                        <span className="text-[10px] font-mono text-slate-400 block mt-1">CPU: {w.cpuUsage}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Storage general metrics */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-900 pb-3 flex items-center justify-between">
                <span>Armazenamento Geral</span>
                <HardDrive className="w-4 h-4 text-pink-500" />
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Espaço em Uso (Geral)</span>
                    <span className="font-mono text-white font-bold">{kpis.storageUsedGB.toFixed(2)} GB / 100 GB</span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-600" style={{ width: `${kpis.storageUsedGB}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900 text-center">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase">Consumo Médio</span>
                    <strong className="text-sm text-slate-200 block mt-1">{(kpis.averageStorageMB / 1024).toFixed(2)} GB</strong>
                    <span className="text-[9px] text-slate-500">Por usuário</span>
                  </div>
                  <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-900 text-center">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase">Limite do Plano</span>
                    <strong className="text-sm text-pink-400 block mt-1">R$ 149,00</strong>
                    <span className="text-[9px] text-slate-500">Média/Pro</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Growth & Plan share */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-900 pb-3 flex items-center justify-between">
                <span>Planos Mais Vendidos</span>
                <TrendingUp className="w-4 h-4 text-pink-500" />
              </h4>
              <div className="space-y-3.5 text-xs">
                {/* Starter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Creator Starter (R$ 49/mês)</span>
                    <span className="font-mono text-white font-bold">{kpis.starterCount} ({Math.round((kpis.starterCount / kpis.totalUsers) * 100 || 0)}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${(kpis.starterCount / kpis.totalUsers) * 100}%` }} />
                  </div>
                </div>

                {/* Pro */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Creator Pro (R$ 149/mês)</span>
                    <span className="font-mono text-pink-400 font-bold">{kpis.proCount} ({Math.round((kpis.proCount / kpis.totalUsers) * 100 || 0)}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500" style={{ width: `${(kpis.proCount / kpis.totalUsers) * 100}%` }} />
                  </div>
                </div>

                {/* Business */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Creator Business (R$ 399/mês)</span>
                    <span className="font-mono text-purple-400 font-bold">{kpis.businessCount} ({Math.round((kpis.businessCount / kpis.totalUsers) * 100 || 0)}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${(kpis.businessCount / kpis.totalUsers) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent registered users */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-900 pb-3 mb-4">
              Últimos Usuários Cadastrados
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-500">
                    <th className="py-2.5 font-semibold">Cliente</th>
                    <th className="py-2.5 font-semibold">Empresa</th>
                    <th className="py-2.5 font-semibold">Plano</th>
                    <th className="py-2.5 font-semibold">Consumo Geral</th>
                    <th className="py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40">
                  {allUsers.slice(0, 5).map(u => {
                    const roleDetails = ROLE_DETAILS_MAP[u.role];
                    return (
                      <tr key={u.id} className="hover:bg-slate-900/10">
                        <td className="py-3 font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                            <div>
                              <span>{u.name}</span>
                              <span className="block text-[10px] text-slate-500 font-mono">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-slate-400">{u.company || 'Pessoa Física'}</td>
                        <td className="py-3">
                          <span className={`font-semibold ${
                            u.subscription === 'Business' ? 'text-purple-400' :
                            u.subscription === 'Pro' ? 'text-pink-400' : 'text-indigo-400'
                          }`}>{u.subscription}</span>
                        </td>
                        <td className="py-3 text-slate-400 font-mono">
                          {u.usageCurrent} renders • {(u.storageUsedMB / 1024).toFixed(2)} GB
                        </td>
                        <td className="py-3">
                          <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {u.status === 'active' ? 'Ativo' : 'Suspenso'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* 2. USUÁRIOS (GESTÃO DE CLIENTES) */}
      {activeMenu === 'users' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-500" />
                Gestão de Contas de Clientes
              </h3>
              <p className="text-xs text-slate-500 mt-1">Consulte limites, altere quotas, promova cargos ou suspenda acessos de qualquer usuário.</p>
            </div>

            {/* Filtering controls */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="bg-slate-900 border border-slate-850 rounded-lg text-xs py-1.5 px-3 text-white focus:outline-none focus:border-pink-500"
              >
                <option value="all">Todos os Planos</option>
                <option value="Starter">Starter</option>
                <option value="Pro">Pro</option>
                <option value="Business">Business</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-850 rounded-lg text-xs py-1.5 px-3 text-white focus:outline-none focus:border-pink-500"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Pesquisar por nome, email ou empresa de cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-850 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-mono"
            />
            <div className="absolute left-3 top-2.5 text-slate-500">
              <Search className="w-4 h-4" />
            </div>
          </div>

          {/* Users List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500">
                  <th className="py-3 font-semibold">Usuário / ID</th>
                  <th className="py-3 font-semibold">Empresa</th>
                  <th className="py-3 font-semibold">Plano</th>
                  <th className="py-3 font-semibold">Quota Render</th>
                  <th className="py-3 font-semibold">Quota Disco</th>
                  <th className="py-3 font-semibold">Status</th>
                  <th className="py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-900/10">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-800" />
                        <div>
                          <span className="font-semibold text-slate-200 block">{u.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono block">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-slate-400 font-medium">{u.company || 'Pessoa Física'}</td>
                    <td className="py-3">
                      <span className={`font-semibold ${
                        u.subscription === 'Business' ? 'text-purple-400' :
                        u.subscription === 'Pro' ? 'text-pink-400' : 'text-indigo-400'
                      }`}>{u.subscription}</span>
                    </td>
                    <td className="py-3 font-mono text-slate-300">
                      {u.usageCurrent} / <strong className="text-white">{u.usageLimit}</strong> vids
                    </td>
                    <td className="py-3 font-mono text-slate-300">
                      {(u.storageUsedMB / 1024).toFixed(2)} / <strong className="text-white">{(u.subscription === 'Business' ? 20 : u.subscription === 'Pro' ? 5 : 2)} GB</strong>
                    </td>
                    <td className="py-3">
                      <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {u.status === 'active' ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-1">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="p-1 bg-slate-900 border border-slate-850 text-slate-300 hover:text-pink-400 rounded transition cursor-pointer"
                        title="Configurar limites e plano"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleSuspension(u)}
                        className={`p-1 border rounded transition cursor-pointer ${
                          u.status === 'active' 
                            ? 'bg-red-950/10 border-red-950/20 text-red-400 hover:bg-red-950/20' 
                            : 'bg-emerald-950/10 border-emerald-950/20 text-emerald-400 hover:bg-emerald-950/20'
                        }`}
                        title={u.status === 'active' ? 'Suspender Usuário' : 'Ativar Usuário'}
                      >
                        {u.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(u.id)}
                        className="p-1 bg-red-950/10 hover:bg-red-950/20 border border-red-950/20 text-red-400 hover:text-red-300 rounded transition cursor-pointer"
                        title="Deletar Usuário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* User management modal/drawer */}
          {editingUser && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-950 border border-slate-900 rounded-2xl max-w-md w-full p-6 space-y-5 animate-scale-in">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-pink-500" />
                    Limites do Cliente: {editingUser.name}
                  </h4>
                  <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Select Plan */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Plano SaaS do Usuário</label>
                    <select
                      value={editingUser.subscription}
                      onChange={(e) => handleUpdatePlan(editingUser.id, e.target.value as PlanTier)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-pink-500"
                    >
                      <option value="Starter">Starter (R$ 49/mês)</option>
                      <option value="Pro">Pro (R$ 149/mês)</option>
                      <option value="Business">Business (R$ 399/mês)</option>
                    </select>
                  </div>

                  {/* Render Quota Limits slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 uppercase text-[10px] font-mono font-bold">Limite de Render Mensal</span>
                      <strong className="text-white font-mono">{editingUser.usageLimit} vídeos</strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="10000"
                      step="50"
                      value={editingUser.usageLimit}
                      onChange={(e) => handleUpdateLimits(editingUser.id, { usageLimit: Number(e.target.value) })}
                      className="w-full accent-pink-500"
                    />
                  </div>

                  {/* Storage Simulated Upgrade */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Uso Atual de Storage</label>
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-850 text-slate-300 font-mono text-xs">
                        {editingUser.storageUsedMB} MB / {(editingUser.storageUsedMB / 1024).toFixed(2)} GB
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Projetos Ativos</label>
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-850 text-slate-300 font-mono text-xs">
                        {editingUser.projectsActive} projetos
                      </div>
                    </div>
                  </div>

                  {/* Suspension toggle button */}
                  <button
                    onClick={() => handleToggleSuspension(editingUser)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      editingUser.status === 'active' 
                        ? 'bg-red-950/20 hover:bg-red-950/30 border border-red-900/20 text-red-400' 
                        : 'bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-900/20 text-emerald-400'
                    }`}
                  >
                    {editingUser.status === 'active' ? (
                      <>
                        <Ban className="w-4 h-4" />
                        Suspender Conta Imediatamente
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Reativar Conta de Cliente
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete User confirm modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-950 border border-slate-900 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center animate-scale-in">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Remover Usuário Definitivamente?</h4>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Esta ação é irreversível. Todas as renderizações, projetos e arquivos associados a esta conta serão desvinculados do storage.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleConfirmDelete(showDeleteConfirm)}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* 3. ASSINATURAS (BILLING PLANS CONTROLLER) */}
      {activeMenu === 'subscriptions' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <Sparkles className="w-4 h-4 text-pink-500" />
              Assinaturas Ativas & Planos Ativos
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configurações de planos recorrentes do Stripe e simulações de faturamento.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS_DETAILS.map(p => {
              const usersOnThisPlan = allUsers.filter(u => u.subscription === p.tier).length;
              return (
                <div key={p.tier} className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-white uppercase font-mono">{p.name}</h4>
                      <span className="text-[10px] bg-pink-500/10 border border-pink-500/20 text-pink-400 py-0.5 px-2 rounded-full font-mono font-bold">
                        {usersOnThisPlan} Clientes
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-extrabold text-white">R$ {p.priceMonthly.toLocaleString('pt-BR')},00</span>
                      <span className="text-[10px] text-slate-500 font-mono"> /mês</span>
                    </div>
                    <ul className="text-[11px] text-slate-400 space-y-2 mt-4 border-t border-slate-900/60 pt-3">
                      <li>• Renderizações: <strong className="text-white">{p.limits.maxVideosPerMonth}</strong></li>
                      <li>• Armazenamento: <strong className="text-white">{p.limits.maxStorageMB / 1024} GB</strong></li>
                      <li>• Prioridade FFmpeg: <strong className="text-pink-500 uppercase font-mono text-[9px]">{p.limits.renderPriority}</strong></li>
                    </ul>
                  </div>
                  <button
                    onClick={() => alert(`Configurações globais para o plano ${p.tier} estão sincronizadas com o Stripe Webhook.`)}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-850 rounded-xl text-xs font-semibold text-slate-300 transition cursor-pointer"
                  >
                    Gerenciar Webhook ID
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* 4. PAGAMENTOS (SAAS TRANSACTIONS) */}
      {activeMenu === 'payments' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-pink-500" />
                Histórico Financeiro do SaaS
              </h3>
              <p className="text-xs text-slate-500 mt-1">Exportação de faturas e controle de PIX, Cartão e Boletos gerados.</p>
            </div>
            <button
              onClick={() => alert('Planilha CSV de conciliação financeira exportada com sucesso!')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-mono transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Exportar CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500">
                  <th className="py-2.5 font-semibold">Fatura ID</th>
                  <th className="py-2.5 font-semibold">Cliente</th>
                  <th className="py-2.5 font-semibold">Valor</th>
                  <th className="py-2.5 font-semibold">Método</th>
                  <th className="py-2.5 font-semibold">Período</th>
                  <th className="py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 text-slate-300">
                {allUsers.map((u, idx) => {
                  if (!u.subscriptionDetails) return null;
                  return (
                    <tr key={idx} className="hover:bg-slate-900/10">
                      <td className="py-3 font-mono font-bold text-pink-500">INV-00{idx + 139}</td>
                      <td className="py-3 font-medium text-slate-200">{u.name}</td>
                      <td className="py-3 font-mono text-slate-200">R$ {u.subscriptionDetails.price},00</td>
                      <td className="py-3 text-slate-400">Cartão de Crédito</td>
                      <td className="py-3 font-mono text-[10px] text-slate-500">
                        {new Date(u.subscriptionDetails.startDate).toLocaleDateString('pt-BR')} - {new Date(u.subscriptionDetails.endDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3">
                        <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase font-bold">
                          Pago
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* 5. RENDERIZAÇÕES (PROCESSOS FFMPEG) */}
      {activeMenu === 'renderings' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <Film className="w-4 h-4 text-pink-500" />
              Tarefas de Renderização FFmpeg Ativas
            </h3>
            <p className="text-xs text-slate-500 mt-1">Acompanhamento frame a frame do encodamento dos vídeos na nuvem em tempo real.</p>
          </div>

          <div className="space-y-3">
            {renderingTasks.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-900 rounded-2xl text-slate-500 text-xs font-mono">
                Sem renderizações ativas nas últimas horas.
              </div>
            ) : (
              renderingTasks.map(t => (
                <div key={t.id} className="p-4 bg-slate-900/20 border border-slate-900 rounded-2xl text-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-200 flex items-center gap-2">
                        {t.projectName}
                        <span className="text-[10px] font-mono font-normal text-slate-500 bg-slate-900 py-0.5 px-1.5 rounded">
                          Template: {t.templateName}
                        </span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500 block mt-1">ID: {t.id} • Criado em: {new Date(t.createdAt).toLocaleTimeString('pt-BR')}</span>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        t.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' :
                        t.status === 'processing' ? 'bg-amber-500/5 border-amber-500/15 text-amber-400' :
                        t.status === 'queued' ? 'bg-blue-500/5 border-blue-500/15 text-blue-400' :
                        'bg-red-500/5 border-red-500/15 text-red-400'
                      }`}>
                        {t.status === 'completed' ? 'CONCLUÍDO' :
                         t.status === 'processing' ? 'PROCESSANDO' :
                         t.status === 'queued' ? 'NA FILA' : 'FALHOU'}
                      </span>
                      {t.renderTime && (
                        <span className="text-[10px] font-mono text-slate-400 block mt-1">Tempo: {t.renderTime}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Progresso da Overlap de Áudio & Vídeo</span>
                      <span>{t.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full transition-all duration-300" style={{ width: `${t.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}


      {/* 6. FILA DE PROCESSAMENTO (QUEUE CONTROLLER) */}
      {activeMenu === 'queue' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-500" />
                Fila de Processamento Ativa
              </h3>
              <p className="text-xs text-slate-500 mt-1">Configure prioridades de renders, pause a fila de workers ou limpe travamentos.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => alert('Fila pausada com sucesso. Renders aguardarão liberação.')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/25 border border-red-900/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                Pausar Fila
              </button>
              <button
                onClick={() => alert('Fila retomada com sucesso.')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/25 border border-emerald-900/20 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Retomar Fila
              </button>
            </div>
          </div>

          <div className="p-5 bg-slate-900/30 rounded-2xl border border-slate-900 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase font-mono">Cargas e Capacidades Atuais</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Capacidade Máxima</span>
                <strong className="text-sm text-white">40 renders/minuto</strong>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Carga Estimada</span>
                <strong className="text-sm text-white">{(kpis.queued + kpis.inProgress) * 5}% ocupado</strong>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Tempo Médio na Fila</span>
                <strong className="text-sm text-pink-400">12 segundos</strong>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 7. WORKERS (FFMPEG NODES) */}
      {activeMenu === 'workers' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <Cpu className="w-4 h-4 text-pink-500" />
              Cluster Virtual de Render Nodes (FFmpeg)
            </h3>
            <p className="text-xs text-slate-500 mt-1">Selecione, throttleie ou desligue instâncias virtuais do renderizador assíncrono para testes de cota.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workers.map(w => (
              <div key={w.id} className="bg-slate-900/20 border border-slate-900 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-xs">{w.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">{w.region}</span>
                    </div>
                    <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      w.status === 'online' ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' :
                      w.status === 'busy' ? 'bg-amber-500/5 border-amber-500/15 text-amber-400' :
                      'bg-slate-900 border-slate-800 text-slate-500'
                    }`}>
                      {w.status}
                    </span>
                  </div>

                  {w.status !== 'offline' ? (
                    <div className="space-y-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>Uso de Processador (V-CPU)</span>
                          <span>{w.cpuUsage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${w.cpuUsage > 80 ? 'bg-red-500' : 'bg-pink-500'}`} style={{ width: `${w.cpuUsage}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>Uso de Memória RAM</span>
                          <span>{w.memoryUsage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${w.memoryUsage}%` }} />
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 font-mono mt-1">Total de renders processados: <strong className="text-white">{w.processedCount}</strong></p>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-600 font-mono text-xs">
                      Instância inativa ou desativada pelo operador.
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleToggleWorker(w.id)}
                  className={`w-full py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    w.status === 'offline' 
                      ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/25' 
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-900 text-slate-300'
                  }`}
                >
                  {w.status === 'offline' ? 'Iniciar Node' : 'Desligar Node (Throttle)'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* 8. STORAGE (USO GERAL DE STORAGE) */}
      {activeMenu === 'storage' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <HardDrive className="w-4 h-4 text-pink-500" />
              Relatório de Espaço em Disco
            </h3>
            <p className="text-xs text-slate-500 mt-1">Visualização consolidada de todos os diretórios virtuais e caches de mídias.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Videos Exportados</span>
                <strong className="text-lg text-white">{(kpis.storageUsedGB * 0.45).toFixed(2)} GB</strong>
              </div>
              <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Mídias de Fundo Uploadadas</span>
                <strong className="text-lg text-white">{(kpis.storageUsedGB * 0.50).toFixed(2)} GB</strong>
              </div>
              <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Arquivos de Fontes & Logos</span>
                <strong className="text-lg text-white">{(kpis.storageUsedGB * 0.05).toFixed(2)} GB</strong>
              </div>
            </div>

            <div className="bg-slate-900/10 border border-slate-900 p-5 rounded-2xl text-xs space-y-3">
              <h4 className="font-bold text-slate-300 uppercase font-mono">Consumo de Clientes no Bucket S3/GCS</h4>
              <div className="space-y-2">
                {allUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-slate-900/40 font-mono text-[11px]">
                    <span className="text-slate-300 font-sans">{u.name} ({u.email})</span>
                    <span className="text-white font-bold">{u.storageUsedMB} MB / {u.subscription === 'Business' ? '20' : u.subscription === 'Pro' ? '5' : '2'} GB</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 9. LOGS (LOGS DO SISTEMA EM REALTIME) */}
      {activeMenu === 'logs' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-900 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-pink-500" />
                Logs Globais de Infraestrutura
              </h3>
              <p className="text-xs text-slate-500 mt-1">Análise de conexões de usuários, requisições de API, triggers Stripe e erros FFmpeg.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-pink-500 animate-ping" />
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Streaming de Logs Ativo</span>
            </div>
          </div>

          {/* Log terminal mockup */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-[10px] leading-relaxed text-slate-400 space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
            {systemLogs.map(l => (
              <div key={l.id} className="flex gap-2.5 items-start">
                <span className="text-slate-600">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                <span className={`font-bold shrink-0 ${
                  l.level === 'error' || l.level === 'critical' ? 'text-red-500' :
                  l.level === 'warning' ? 'text-amber-500' : 'text-slate-400'
                }`}>
                  [{l.level.toUpperCase()}]
                </span>
                <span className="text-pink-500 shrink-0">[{l.service}]</span>
                <span className="text-slate-300 break-all">{l.message}</span>
                {l.ipAddress && (
                  <span className="text-slate-600 text-[9px] shrink-0 font-bold ml-auto">({l.ipAddress})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* 10. CUPONS (MARKETING COUPONS) */}
      {activeMenu === 'coupons' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <Ticket className="w-4 h-4 text-pink-500" />
              Cupons de Desconto e Promoções
            </h3>
            <p className="text-xs text-slate-500 mt-1">Crie, ative ou invalide códigos promocionais para novos clientes no checkout.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Coupon Form */}
            <div className="bg-slate-900/20 border border-slate-900 p-5 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono">Gerador de Cupons</h4>
              <form onSubmit={handleAddCoupon} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Código do Cupom</label>
                  <input
                    type="text"
                    required
                    placeholder="VIRAL100, BLACKFRIDAY"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Tipo</label>
                    <select
                      value={newCouponType}
                      onChange={(e) => setNewCouponType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg py-1.5 px-3 text-white focus:outline-none"
                    >
                      <option value="percentage">Porcentagem (%)</option>
                      <option value="fixed">Fixo (R$)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Desconto</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg py-2 px-3 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-md shadow-pink-600/10"
                >
                  Ativar Novo Cupom
                </button>
              </form>
            </div>

            {/* Coupons List */}
            <div className="lg:col-span-2 space-y-3 text-xs">
              {coupons.map(c => (
                <div key={c.id} className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-white font-mono text-sm uppercase tracking-wider">{c.code}</strong>
                      <span className={`text-[9px] font-mono font-bold px-1.5 rounded border uppercase ${
                        c.status === 'active' ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Desconto de <strong className="text-white">{c.value}{c.type === 'percentage' ? '%' : ' R$'}</strong> • Usos: <strong className="text-white">{c.uses}/{c.maxUses}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setCoupons(prev => prev.map(p => p.id === c.id ? { ...p, status: p.status === 'active' ? 'expired' : 'active' } : p))}
                    className="py-1 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 hover:text-white rounded-lg font-semibold transition cursor-pointer"
                  >
                    {c.status === 'active' ? 'Revogar' : 'Reativar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* 11. ANALYTICS (GROWTH METRICS) */}
      {activeMenu === 'analytics' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <TrendingUp className="w-4 h-4 text-pink-500" />
              SaaS Growth Analytics & Retenção
            </h3>
            <p className="text-xs text-slate-500 mt-1">Análise de conversão, LTV, churn rate, volume de transações e taxas de renderizações.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono">Simulador de Conversão Mensal</h4>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span>CAC (Custo de Aquisição)</span>
                  <span className="font-mono text-white font-bold">R$ 14,20</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span>LTV (Lifetime Value Médio)</span>
                  <span className="font-mono text-emerald-400 font-bold">R$ 447,00</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span>Churn Rate Mensal</span>
                  <span className="font-mono text-red-400 font-bold">2.4%</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono">Taxas de Sucesso e Processamento</h4>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span>Sucesso de Renderização (FFmpeg)</span>
                  <span className="font-mono text-emerald-400 font-bold">99.2%</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span>Retentativas Automáticas</span>
                  <span className="font-mono text-amber-400 font-bold">0.8%</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1.5">
                  <span>Reclamações de Ticket</span>
                  <span className="font-mono text-white font-bold">1 aberto</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 12. CONFIGURAÇÕES (GLOBAL SaaS CONFIGS) */}
      {activeMenu === 'settings' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <Settings className="w-4 h-4 text-pink-500" />
              Configurações Globais do SaaS
            </h3>
            <p className="text-xs text-slate-500 mt-1">Configure quotas padrão, ative flags de depuração e ajuste limites de buckets de mídias.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Tamanho Máximo de Upload por Arquivo (MB)</label>
                <input
                  type="number"
                  value={maxUploadLimitMB}
                  onChange={(e) => setMaxUploadLimitMB(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-850 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Prioridade de Renderização Padrão</label>
                <select
                  value={defaultRenderPriority}
                  onChange={(e) => setDefaultRenderPriority(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="normal">Normal (Starter)</option>
                  <option value="priority">Prioritária (Pro)</option>
                  <option value="maximum">Cluster Exclusivo (Business)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Limite de Throttling API (requisições/min)</label>
                <input
                  type="number"
                  value={apiThrottlingLimit}
                  onChange={(e) => setApiThrottlingLimit(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-850 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/20 border border-slate-900 rounded-xl mt-3">
                <div>
                  <span className="font-semibold text-slate-200 block">Ativar Recursos Beta</span>
                  <span className="text-[10px] text-slate-500 font-mono">Dá acesso a legendas dinâmicas AI aos planos Pro</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableBetaFeatures}
                  onChange={(e) => setEnableBetaFeatures(e.target.checked)}
                  className="h-4 w-4 accent-pink-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-900">
            <button
              onClick={() => alert('Parâmetros de ambiente do SaaS salvos e propagados nos workers!')}
              className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-pink-600/10 cursor-pointer"
            >
              Salvar Parâmetros SaaS
            </button>
          </div>
        </div>
      )}


      {/* 13. SUPORTE (TICKETS E SUPORTE DIRECT) */}
      {activeMenu === 'support' && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
              <LifeBuoy className="w-4 h-4 text-pink-500" />
              Central de Tickets e Suporte Técnico
            </h3>
            <p className="text-xs text-slate-500 mt-1">Responda dúvidas de clientes sobre faturamento, exportações ou bugs reportados.</p>
          </div>

          <div className="space-y-4">
            {supportTickets.map(t => (
              <div key={t.id} className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl text-xs space-y-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-slate-100 font-semibold">{t.subject}</strong>
                      <span className="text-[10px] font-mono text-slate-500">({t.id})</span>
                      <span className={`text-[9px] font-bold font-mono px-1.5 rounded uppercase ${
                        t.plan === 'Business' ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' :
                        t.plan === 'Pro' ? 'bg-pink-500/10 border border-pink-500/20 text-pink-400' :
                        'bg-slate-900 border-slate-850 text-slate-400'
                      }`}>
                        Plano: {t.plan}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Cliente: {t.user} ({t.email}) • {new Date(t.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <span className={`inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                    t.status === 'open' ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    {t.status === 'open' ? 'Aberto' : 'Respondido'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-900 font-sans">
                  "{t.text}"
                </p>

                {t.status === 'open' && (
                  <div className="space-y-2 pt-2">
                    {activeTicketId === t.id ? (
                      <div className="space-y-2">
                        <textarea
                          placeholder="Digite a resposta que será enviada para o e-mail do cliente..."
                          rows={3}
                          value={ticketReplyText}
                          onChange={(e) => setTicketReplyText(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 resize-none font-sans"
                        />
                        <div className="flex justify-end gap-2 text-[11px]">
                          <button
                            onClick={() => setActiveTicketId(null)}
                            className="px-3 py-1.5 bg-slate-900 border border-slate-850 text-slate-400 rounded-lg cursor-pointer font-semibold"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleReplyTicket(t.id)}
                            className="px-4 py-1.5 bg-pink-600 text-white rounded-lg cursor-pointer font-bold"
                          >
                            Enviar Resposta Prioritária
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveTicketId(t.id);
                          setTicketReplyText('Olá Bruna, analisamos o caso e ajustamos as margens verticais do template. Seus novos renders já herdarão a cota correta de margem para evitar qualquer corte vertical no app do TikTok. Qualquer dúvida, conte conosco!');
                        }}
                        className="py-1.5 px-3 bg-pink-600/10 hover:bg-pink-600/20 border border-pink-500/20 text-pink-400 rounded-lg font-bold transition cursor-pointer"
                      >
                        Acessar & Responder Ticket
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
