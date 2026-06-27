/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, PlanTier } from '../types';
import { 
  Users, 
  ShieldCheck, 
  DollarSign, 
  Activity, 
  Search, 
  UserCog, 
  Ban, 
  CheckCircle, 
  Trash2, 
  ExternalLink, 
  HardDrive, 
  Video, 
  SlidersHorizontal,
  FolderLock,
  ArrowRight,
  UserCheck,
  X
} from 'lucide-react';
import { PLANS_DETAILS, PLAN_LIMITS_MAP } from '../config/plans';

export const AdminPanel: React.FC = () => {
  const { 
    allUsers, 
    adminUpdateUser, 
    adminDeleteUser, 
    renderingTasks,
    user: currentUser
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Drawer/Modal states for user editing
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Global KPIs calculations from live users array
  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter(u => u.status === 'active').length;
  const suspendedUsers = allUsers.filter(u => u.status === 'suspended').length;
  
  // Calculate expected MRR (Monthly Recurring Revenue)
  const calculatedMRR = allUsers.reduce((acc, u) => {
    if (u.status !== 'active' || !u.subscriptionDetails) return acc;
    const price = u.subscriptionDetails.price;
    const cycle = u.subscriptionDetails.billingCycle;
    // Normalize to monthly pricing
    const monthlyPrice = cycle === 'annual' ? price / 12 : price;
    return acc + monthlyPrice;
  }, 0);

  // Calculate live total disk storage used by all users in GB
  const totalStorageMBAll = allUsers.reduce((acc, u) => acc + (u.storageUsedMB || 0), 0);
  const totalStorageGBAll = totalStorageMBAll / 1024;

  // Filter users based on query
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.email.toLowerCase().includes(search.toLowerCase()) ||
                          (u.company && u.company.toLowerCase().includes(search.toLowerCase()));
    
    const matchesPlan = filterPlan === 'all' || u.subscription === filterPlan;
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const handleToggleSuspension = (targetUser: User) => {
    const nextStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    adminUpdateUser(targetUser.id, { 
      status: nextStatus 
    });
    
    // Update local drawer state if open
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
      setEditingUser({ 
        ...editingUser, 
        subscription: newPlan, 
        usageLimit: planConfig.limits.maxVideosPerMonth 
      });
    }
  };

  const handleConfirmDelete = (userId: string) => {
    adminDeleteUser(userId);
    setShowDeleteConfirm(null);
    setEditingUser(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Admin Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Área do Proprietário do SaaS
          <span className="text-xs bg-pink-500/15 border border-pink-500/30 text-pink-400 font-mono py-0.5 px-2 rounded-full font-normal">
            SaaS Creator Admin
          </span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Painel de telemetria geral para controle de contas, acompanhamento de receita, alteração de limites e monitoramento de consumo de disco de todos os clientes.
        </p>
      </div>

      {/* Admin metrics bento grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Total Users */}
        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl border border-blue-500/10">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Total de Usuários</p>
            <h3 className="text-2xl font-bold text-white mt-1">{totalUsers}</h3>
            <p className="text-[10px] text-gray-400 mt-1">
              {activeUsers} ativos • {suspendedUsers} suspensos
            </p>
          </div>
        </div>

        {/* KPI: MRR Forecast */}
        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/10">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">MRR Projetado</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">R$ {calculatedMRR.toLocaleString('pt-BR')},00</h3>
            <p className="text-[10px] text-gray-400 mt-1">
              Receita mensal simulada recorrente
            </p>
          </div>
        </div>

        {/* KPI: Storage Consumed */}
        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-rose-500/10 text-rose-400 p-3 rounded-xl border border-rose-500/10">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Disco Total</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {totalStorageGBAll >= 1 ? `${totalStorageGBAll.toFixed(2)} GB` : `${totalStorageMBAll.toFixed(0)} MB`}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">
              Consolidação de mídia de todos os tenants
            </p>
          </div>
        </div>

        {/* KPI: Renders Active */}
        <div className="bg-gray-950 border border-gray-900 rounded-xl p-5 flex items-center gap-4">
          <div className="bg-purple-500/10 text-purple-400 p-3 rounded-xl border border-purple-500/10">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Fila de Renders</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {renderingTasks.filter(t => t.status === 'processing' || t.status === 'queued').length}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">
              Tarefas simuladas de FFmpeg ativas
            </p>
          </div>
        </div>
      </div>

      {/* Users Control center */}
      <div className="bg-gray-950 border border-gray-900 rounded-xl overflow-hidden">
        {/* Table Filter Controls */}
        <div className="p-6 border-b border-gray-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar por nome, email ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-850 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
            />
            <div className="absolute left-3 top-2.5 text-gray-500">
              <Search className="w-4 h-4" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter: Plan */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-gray-500 uppercase">Plano:</span>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="bg-gray-900 border border-gray-850 rounded-lg py-1.5 px-3 text-xs text-white font-mono focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="Starter">Starter</option>
                <option value="Pro">Creator Pro</option>
                <option value="Business">Business</option>
              </select>
            </div>

            {/* Filter: Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-gray-500 uppercase">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-900 border border-gray-850 rounded-lg py-1.5 px-3 text-xs text-white font-mono focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>
          </div>
        </div>

        {/* Database List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950 text-gray-500 text-[10px] font-mono uppercase tracking-wider border-b border-gray-900">
                <th className="py-3.5 px-6">Usuário / Empresa</th>
                <th className="py-3.5 px-6">Assinatura</th>
                <th className="py-3.5 px-6">Renders no Mês</th>
                <th className="py-3.5 px-6">Armazenamento</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900/40 text-xs text-gray-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 font-mono">
                    Nenhum usuário localizado com estes filtros.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const storageMB = u.storageUsedMB || 0;
                  const storageStr = storageMB >= 1024 ? `${(storageMB / 1024).toFixed(1)} GB` : `${storageMB.toFixed(0)} MB`;
                  
                  return (
                    <tr key={u.id} className={`hover:bg-gray-900/10 ${u.id === currentUser?.id ? 'bg-indigo-500/5' : ''}`}>
                      {/* Name & Account */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=128&h=128'}
                            alt={u.name}
                            className="w-8 h-8 rounded-full border border-gray-800 object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white">{u.name}</span>
                              {u.id === currentUser?.id && (
                                <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase">
                                  Você
                                </span>
                              )}
                              {u.role === 'SaaS_Owner' && (
                                <span className="bg-pink-500/15 text-pink-400 border border-pink-500/25 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase">
                                  Dono
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-500 font-mono block">{u.email}</span>
                            {u.company && (
                              <span className="text-[10px] text-gray-400 block font-sans mt-0.5">{u.company}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subscription Plan */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className={`font-semibold font-mono text-[11px] uppercase tracking-wide ${
                            u.subscription === 'Business' ? 'text-pink-400' : u.subscription === 'Pro' ? 'text-indigo-400' : 'text-gray-400'
                          }`}>
                            {u.subscription}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {u.subscriptionDetails?.billingCycle === 'annual' ? 'Plano Anual' : 'Plano Mensal'}
                          </span>
                        </div>
                      </td>

                      {/* Video Quota */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white font-mono">
                            {u.usageCurrent} <span className="text-gray-500 text-[10px] font-normal">/ {u.usageLimit}</span>
                          </span>
                          <div className="w-24 h-1 bg-gray-900 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className="h-full bg-gradient-to-r from-violet-600 to-indigo-500"
                              style={{ width: `${Math.min((u.usageCurrent / u.usageLimit) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Storage Quota */}
                      <td className="py-4 px-6">
                        <span className="text-gray-300 font-mono">{storageStr}</span>
                      </td>

                      {/* Status badge */}
                      <td className="py-4 px-6">
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3 text-emerald-500" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/15 px-2 py-0.5 rounded-full">
                            <Ban className="w-3 h-3 text-red-500" />
                            Suspenso
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Suspend / Unsuspend */}
                          <button
                            onClick={() => handleToggleSuspension(u)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              u.status === 'active'
                                ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/10 text-red-400 hover:border-red-500/30'
                                : 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/10 text-emerald-400 hover:border-emerald-500/30'
                            }`}
                            title={u.status === 'active' ? 'Suspender Usuário' : 'Reativar Usuário'}
                          >
                            {u.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>

                          {/* Detail / Config tool */}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded-lg border border-gray-800 hover:border-gray-700 bg-gray-900 text-gray-400 hover:text-white transition-all"
                            title="Alterar Plano & Parâmetros"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete account */}
                          <button
                            onClick={() => setShowDeleteConfirm(u.id)}
                            disabled={u.id === currentUser?.id}
                            className={`p-1.5 rounded-lg border border-gray-800/60 text-gray-500 transition-all ${
                              u.id === currentUser?.id 
                                ? 'opacity-30 cursor-not-allowed' 
                                : 'hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400'
                            }`}
                            title="Remover Usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Editing Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-950 border border-gray-900 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="bg-gray-900/50 p-5 border-b border-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserCog className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-bold text-white">Configurações da Conta</h3>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-gray-500 hover:text-white text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Profile Details card */}
              <div className="flex items-center gap-3 bg-gray-900/40 p-3 rounded-lg border border-gray-900">
                <img
                  src={editingUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=128&h=128'}
                  alt={editingUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-gray-850"
                />
                <div>
                  <h4 className="font-semibold text-white leading-tight">{editingUser.name}</h4>
                  <span className="text-[11px] text-gray-500 font-mono block mt-0.5">{editingUser.email}</span>
                </div>
              </div>

              {/* Modify Plan manual override */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase">Alterar Plano Manualmente</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Starter', 'Pro', 'Business'] as PlanTier[]).map(tier => {
                    const active = editingUser.subscription === tier;
                    return (
                      <button
                        key={tier}
                        onClick={() => handleUpdatePlan(editingUser.id, tier)}
                        className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10'
                            : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-850'
                        }`}
                      >
                        {tier}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-500">
                  Isso irá recalcular instantaneamente os limites mensais do usuário para o tier selecionado.
                </p>
              </div>

              {/* Suspension Switch */}
              <div className="space-y-2 border-t border-gray-900/60 pt-4">
                <label className="text-[10px] font-mono text-gray-500 uppercase">Restrições Administrativas</label>
                <div className="flex items-center justify-between bg-gray-900/20 border border-gray-900 rounded-lg p-3">
                  <div>
                    <h5 className="text-xs font-semibold text-white">Status da Assinatura</h5>
                    <p className="text-[10px] text-gray-500">Impedir o usuário de renderizar ou carregar mídias.</p>
                  </div>
                  <button
                    onClick={() => handleToggleSuspension(editingUser)}
                    className={`text-[10px] font-mono py-1 px-3 rounded-md transition-all font-bold border ${
                      editingUser.status === 'active'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
                    }`}
                  >
                    {editingUser.status === 'active' ? 'SUSPENDER' : 'REATIVAR'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 bg-gray-900/30 border-t border-gray-900 flex justify-end">
              <button
                onClick={() => setEditingUser(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2 px-5 rounded-lg transition-all"
              >
                Concluir Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account confirmation overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-gray-950 border border-red-500/20 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 space-y-4">
              <div className="bg-red-500/10 text-red-400 p-3 rounded-full w-12 h-12 flex items-center justify-center border border-red-500/10 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-white">Excluir Conta Permanentemente?</h3>
                <p className="text-xs text-gray-400 leading-normal">
                  A exclusão de um tenant é irreversível. Todas as suas mídias, vídeos gerados, templates e projetos serão excluídos e removidos dos discos simulados da plataforma.
                </p>
              </div>
            </div>
            <div className="p-5 bg-gray-900/35 border-t border-gray-900 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="text-xs text-gray-400 hover:text-white px-4 py-2 font-mono"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmDelete(showDeleteConfirm)}
                className="bg-red-600 hover:bg-red-500 text-white font-medium text-xs py-2 px-4 rounded-lg transition-all"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
