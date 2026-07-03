/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  UserX, 
  UserCheck, 
  Eye, 
  Trash2, 
  Mail, 
  ShieldAlert, 
  Settings, 
  Clock, 
  HardDrive, 
  Key, 
  Activity, 
  Smartphone, 
  Laptop, 
  ArrowLeftRight, 
  Lock, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { User, PlanTier } from '../../../types';
import { ROLE_DETAILS_MAP } from '../../../utils/rbac';
import { PLANS_DETAILS } from '../../../config/plans';

interface UsersTabProps {
  allUsers: User[];
  adminUpdateUser: (userId: string, updates: Partial<User>) => void;
  adminDeleteUser: (userId: string) => void;
  impersonateUser?: (targetUser: User) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type DrawerSubTab = 'profile' | 'usage' | 'history' | 'security' | 'actions';

export const UsersTab: React.FC<UsersTabProps> = ({
  allUsers,
  adminUpdateUser,
  adminDeleteUser,
  impersonateUser,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<DrawerSubTab>('profile');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [emailDraftSubject, setEmailDraftSubject] = useState('');
  const [emailDraftBody, setEmailDraftBody] = useState('');

  // Filtering user records
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = u.name.toLowerCase().includes(query) || 
                            u.email.toLowerCase().includes(query) || 
                            (u.company && u.company.toLowerCase().includes(query));
      const matchesPlan = filterPlan === 'all' || u.subscription === filterPlan;
      const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [allUsers, searchQuery, filterPlan, filterStatus]);

  const handleToggleSuspension = (targetUser: User) => {
    const nextStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    adminUpdateUser(targetUser.id, { status: nextStatus });
    if (selectedUser?.id === targetUser.id) {
      setSelectedUser({ ...selectedUser, status: nextStatus });
    }
    showToast(
      `Usuário ${targetUser.name} foi ${nextStatus === 'suspended' ? 'suspenso' : 'ativado'} com sucesso.`, 
      'success'
    );
  };

  const handleUpdatePlan = (userId: string, newPlan: PlanTier) => {
    const planConfig = PLANS_DETAILS.find(p => p.tier === newPlan);
    if (!planConfig) return;
    adminUpdateUser(userId, { 
      subscription: newPlan,
      usageLimit: planConfig.limits.maxVideosPerMonth
    });
    if (selectedUser?.id === userId) {
      setSelectedUser({ 
        ...selectedUser, 
        subscription: newPlan, 
        usageLimit: planConfig.limits.maxVideosPerMonth 
      });
    }
    showToast(`Plano de ${selectedUser?.name} alterado para ${newPlan}.`, 'success');
  };

  const handleResetPassword = () => {
    setPasswordResetSuccess(true);
    showToast('Um link seguro para redefinição de senha foi gerado e enviado.', 'success');
    setTimeout(() => setPasswordResetSuccess(false), 3000);
  };

  const handleSendDraftEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailDraftSubject || !emailDraftBody) {
      showToast('Preencha o assunto e corpo do email.', 'error');
      return;
    }
    showToast(`Simulado: Email enviado para ${selectedUser?.email} via SMTP Queue.`, 'success');
    setEmailDraftSubject('');
    setEmailDraftBody('');
  };

  const handleQuotaAdjustment = (type: 'renders' | 'storage', value: number) => {
    if (!selectedUser) return;
    if (type === 'renders') {
      const nextLimit = Math.max(0, selectedUser.usageLimit + value);
      adminUpdateUser(selectedUser.id, { usageLimit: nextLimit });
      setSelectedUser({ ...selectedUser, usageLimit: nextLimit });
      showToast(`Limite mensal de renders ajustado para ${nextLimit}.`, 'success');
    } else {
      const nextStorage = Math.max(0, selectedUser.storageUsedMB + value);
      adminUpdateUser(selectedUser.id, { storageUsedMB: nextStorage });
      setSelectedUser({ ...selectedUser, storageUsedMB: nextStorage });
      showToast(`Armazenamento ajustado em ${value > 0 ? '+' : ''}${value}MB.`, 'success');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters and actions bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou empresa..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-pink-500 placeholder-slate-500 transition font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Plan Filter */}
          <select
            value={filterPlan}
            onChange={e => setFilterPlan(e.target.value)}
            className="bg-slate-900 border border-slate-850 text-slate-400 text-xs py-2 px-3 rounded-xl focus:outline-none focus:border-pink-500 cursor-pointer font-semibold"
          >
            <option value="all">Todos os Planos</option>
            <option value="Free">Free Trial</option>
            <option value="Starter">Starter</option>
            <option value="Pro">Pro</option>
            <option value="Business">Business</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-850 text-slate-400 text-xs py-2 px-3 rounded-xl focus:outline-none focus:border-pink-500 cursor-pointer font-semibold"
          >
            <option value="all">Qualquer Status</option>
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-500 font-mono font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Usuário / Empresa</th>
                <th className="py-4 px-6">Cargo RBAC</th>
                <th className="py-4 px-6">Plano</th>
                <th className="py-4 px-6">Armazenamento</th>
                <th className="py-4 px-6">Renders (Mês)</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40 font-medium">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-900/20 transition">
                  {/* User Profile */}
                  <td className="py-4 px-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                      {u.avatarUrl && !u.avatarUrl.includes('unsplash') ? (
                        <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        u.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-semibold truncate text-xs">{u.name}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                    </div>
                  </td>

                  {/* RBAC Role badge */}
                  <td className="py-4 px-6">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      ROLE_DETAILS_MAP[u.role]?.bg || 'bg-slate-900'
                    } ${ROLE_DETAILS_MAP[u.role]?.color || 'text-slate-400'} ${ROLE_DETAILS_MAP[u.role]?.border || 'border-slate-800'}`}>
                      {ROLE_DETAILS_MAP[u.role]?.label || u.role}
                    </span>
                  </td>

                  {/* Subscription Plan */}
                  <td className="py-4 px-6">
                    <span className={`text-[10px] font-bold ${
                      u.subscription === 'Business' ? 'text-pink-400' : u.subscription === 'Pro' ? 'text-indigo-400' : 'text-slate-300'
                    }`}>
                      {u.subscription}
                    </span>
                  </td>

                  {/* Storage */}
                  <td className="py-4 px-6 text-slate-400 font-mono">
                    {u.storageUsedMB >= 1024 
                      ? `${(u.storageUsedMB / 1024).toFixed(2)} GB` 
                      : `${u.storageUsedMB} MB`}
                  </td>

                  {/* Rendering usage bar */}
                  <td className="py-4 px-6 min-w-[120px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>{u.usageCurrent} renders</span>
                        <span>/ {u.usageLimit}</span>
                      </div>
                      <div className="h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-900/50">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${Math.min(100, (u.usageCurrent / u.usageLimit) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Status badge */}
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${
                      u.status === 'active' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                      {u.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </td>

                  {/* Inline Actions */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setActiveSubTab('profile');
                        }}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                        title="Ver Perfil"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleSuspension(u)}
                        className={`p-1.5 bg-slate-900 border border-slate-850 rounded-lg transition cursor-pointer ${
                          u.status === 'active' 
                            ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-950/10' 
                            : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/10'
                        }`}
                        title={u.status === 'active' ? 'Suspender Usuário' : 'Ativar Usuário'}
                      >
                        {u.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Nenhum cliente atende aos filtros definidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sliding Enterprise User Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex justify-end">
          <div className="w-full max-w-xl bg-slate-950 border-l border-slate-900 h-screen flex flex-col shadow-2xl relative">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-900 bg-slate-950/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                  {selectedUser.avatarUrl && !selectedUser.avatarUrl.includes('unsplash') ? (
                    <img src={selectedUser.avatarUrl} alt={selectedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    selectedUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-[10px] text-slate-500">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>

            {/* Sub-tabs Selection */}
            <div className="px-6 border-b border-slate-900 bg-slate-950/30 flex items-center gap-2 overflow-x-auto py-1">
              {([
                { id: 'profile', label: 'Perfil', icon: Settings },
                { id: 'usage', label: 'Cotas', icon: HardDrive },
                { id: 'history', label: 'Atividade', icon: Activity },
                { id: 'security', label: 'Segurança', icon: Key },
                { id: 'actions', label: 'Ações', icon: ArrowLeftRight }
              ] as const).map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-[10px] font-mono font-bold uppercase transition cursor-pointer shrink-0 ${
                      activeSubTab === tab.id
                        ? 'border-pink-500 text-pink-500'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Body Tab Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">

              {/* PROFILE SUB-TAB */}
              {activeSubTab === 'profile' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">Empresa</span>
                      <span className="text-xs font-semibold text-white">{selectedUser.company || 'Não informada'}</span>
                    </div>
                    <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block mb-1">Status da Conta</span>
                      <span className={`text-xs font-bold ${selectedUser.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {selectedUser.status === 'active' ? 'Ativo / Liberado' : 'Suspenso'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Ajuste de Assinatura</h4>
                    <div className="flex items-center gap-2">
                      {(['Free', 'Starter', 'Pro', 'Business'] as PlanTier[]).map(tier => (
                        <button
                          key={tier}
                          onClick={() => handleUpdatePlan(selectedUser.id, tier)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                            selectedUser.subscription === tier
                              ? 'bg-pink-600/15 border-pink-500/30 text-pink-400'
                              : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Resetar Senha da Conta</h4>
                      <p className="text-[10px] text-slate-500">Gera um link seguro para o email do cliente.</p>
                    </div>
                    <button
                      onClick={handleResetPassword}
                      disabled={passwordResetSuccess}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-900 hover:bg-slate-900 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      {passwordResetSuccess ? 'Link Enviado!' : 'Resetar Senha'}
                    </button>
                  </div>
                </div>
              )}

              {/* USAGE SUB-TAB */}
              {activeSubTab === 'usage' && (
                <div className="space-y-4">
                  {/* Storage Usage */}
                  <div className="p-5 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-white">Consumo de Armazenamento</h4>
                        <p className="text-[10px] text-slate-500">Mídia armazenada no S3 consolidada.</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {selectedUser.storageUsedMB} MB
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQuotaAdjustment('storage', -100)}
                        className="flex-1 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[10px] font-bold rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        Liberar 100MB
                      </button>
                      <button
                        onClick={() => handleQuotaAdjustment('storage', 500)}
                        className="flex-1 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[10px] font-bold rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        Adicionar 500MB
                      </button>
                    </div>
                  </div>

                  {/* Rendering Limits */}
                  <div className="p-5 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-white">Quotas de Renderização</h4>
                        <p className="text-[10px] text-slate-500">Videos mensais permitidos.</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-pink-400">
                        {selectedUser.usageCurrent} / {selectedUser.usageLimit} vids
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleQuotaAdjustment('renders', -10)}
                        className="flex-1 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[10px] font-bold rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        Remover 10
                      </button>
                      <button
                        onClick={() => handleQuotaAdjustment('renders', 25)}
                        className="flex-1 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[10px] font-bold rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        Creditar +25
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* HISTORY SUB-TAB */}
              {activeSubTab === 'history' && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Histórico de Ações Recentes</h4>
                  <div className="space-y-2">
                    {[
                      { action: 'Renderização Completa', details: 'Renderizou prj-302 em 32s', date: 'Há 12m', status: 'success' },
                      { action: 'Upload de Logo', details: 'Logo transparente.png (2.4MB)', date: 'Há 1h', status: 'success' },
                      { action: 'Criação de Projeto', details: 'Iniciou template Reddit Stories', date: 'Há 4h', status: 'success' },
                      { action: 'Falha de Render', details: 'Codec de áudio inválido no codec stream', date: 'Ontem', status: 'error' }
                    ].map((h, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/20 border border-slate-900/60 rounded-xl flex items-center justify-between text-[11px]">
                        <div>
                          <span className={`font-semibold block ${h.status === 'error' ? 'text-red-400' : 'text-slate-200'}`}>
                            {h.action}
                          </span>
                          <span className="text-slate-500 text-[10px]">{h.details}</span>
                        </div>
                        <span className="text-slate-600 font-mono text-[10px] shrink-0">{h.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECURITY SUB-TAB */}
              {activeSubTab === 'security' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-3 text-[11px]">
                    <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase">Status de Autenticação</h4>
                    <div className="flex justify-between border-b border-slate-900/60 pb-2">
                      <span className="text-slate-500">Duplo Fator (2FA)</span>
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Desativado
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/60 pb-2">
                      <span className="text-slate-500">Chave Física (Passkey)</span>
                      <span className="text-slate-500 font-semibold">Inativo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Último IP Registrado</span>
                      <span className="text-indigo-400 font-mono">191.182.14.9 (São Paulo)</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Dispositivos Conectados</h4>
                    {[
                      { type: 'Desktop', name: 'macOS Monterey • Chrome 114', geo: 'São Paulo - BR', current: true },
                      { type: 'Mobile', name: 'iPhone 14 Pro • Safari Mobile', geo: 'São Paulo - BR', current: false }
                    ].map((d, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl border border-slate-900 text-xs">
                        {d.type === 'Desktop' ? <Laptop className="w-4 h-4 text-slate-400" /> : <Smartphone className="w-4 h-4 text-slate-400" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-200 font-semibold truncate">{d.name}</span>
                            {d.current && <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1 rounded">Atual</span>}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">{d.geo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTIONS SUB-TAB */}
              {activeSubTab === 'actions' && (
                <div className="space-y-4">
                  {/* Impersonate */}
                  {impersonateUser && (
                    <div className="p-4 border border-pink-500/20 bg-pink-500/5 rounded-2xl space-y-2">
                      <h4 className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                        <ArrowLeftRight className="w-4 h-4" /> Assumir Sessão (Impersonate)
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Inicia uma sessão de depuração de suporte. Você visualizará a área do cliente exatamente como ele a vê.
                      </p>
                      <button
                        onClick={() => impersonateUser(selectedUser)}
                        className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Logar como {selectedUser.name}
                      </button>
                    </div>
                  )}

                  {/* Mail composer */}
                  <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl">
                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-indigo-400" /> Enviar Mensagem via SMTP
                    </h4>
                    <form onSubmit={handleSendDraftEmail} className="space-y-3">
                      <input
                        type="text"
                        placeholder="Assunto da Mensagem"
                        value={emailDraftSubject}
                        onChange={e => setEmailDraftSubject(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                      />
                      <textarea
                        placeholder="Escreva a mensagem de suporte para o cliente..."
                        rows={4}
                        value={emailDraftBody}
                        onChange={e => setEmailDraftBody(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 resize-none"
                      />
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg border border-slate-850 transition cursor-pointer"
                      >
                        Enviar Email
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
