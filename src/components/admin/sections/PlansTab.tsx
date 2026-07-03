/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit, 
  Layers, 
  Check, 
  ShieldAlert, 
  FileCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { PlanTier } from '../../../types';
import { PLANS_DETAILS } from '../../../config/plans';

interface PlansTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface CustomPlan {
  id: string;
  tier: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  maxVideos: number;
  maxStorageGB: number;
  priority: 'low' | 'normal' | 'high' | 'vip';
  watermark: boolean;
  aiSubtitles: boolean;
  batchRender: boolean;
  status: 'active' | 'archived';
}

export const PlansTab: React.FC<PlansTabProps> = ({ showToast }) => {
  const [plans, setPlans] = useState<CustomPlan[]>([
    { id: 'plan-0', tier: 'Free', name: 'Free Trial', monthlyPrice: 0, annualPrice: 0, maxVideos: 5, maxStorageGB: 1, priority: 'low', watermark: true, aiSubtitles: false, batchRender: false, status: 'active' },
    { id: 'plan-1', tier: 'Starter', name: 'Starter', monthlyPrice: 49, annualPrice: 39, maxVideos: 100, maxStorageGB: 5, priority: 'normal', watermark: false, aiSubtitles: true, batchRender: false, status: 'active' },
    { id: 'plan-2', tier: 'Pro', name: 'Pro', monthlyPrice: 99, annualPrice: 79, maxVideos: 300, maxStorageGB: 20, priority: 'high', watermark: false, aiSubtitles: true, batchRender: true, status: 'active' },
    { id: 'plan-3', tier: 'Business', name: 'Business', monthlyPrice: 199, annualPrice: 159, maxVideos: 1000, maxStorageGB: 100, priority: 'vip', watermark: false, aiSubtitles: true, batchRender: true, status: 'active' }
  ]);

  const [editingPlan, setEditingPlan] = useState<CustomPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formState, setFormState] = useState<Omit<CustomPlan, 'id'>>({
    tier: 'Custom',
    name: 'Plano Customizado',
    monthlyPrice: 129,
    annualPrice: 99,
    maxVideos: 500,
    maxStorageGB: 50,
    priority: 'high',
    watermark: false,
    aiSubtitles: true,
    batchRender: true,
    status: 'active'
  });

  const handleOpenEdit = (plan: CustomPlan) => {
    setEditingPlan(plan);
    setFormState({ ...plan });
    setIsCreating(false);
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormState({
      tier: 'Custom-' + Math.floor(Math.random() * 100),
      name: 'Novo Plano Enterprise',
      monthlyPrice: 299,
      annualPrice: 239,
      maxVideos: 2500,
      maxStorageGB: 250,
      priority: 'vip',
      watermark: false,
      aiSubtitles: true,
      batchRender: true,
      status: 'active'
    });
    setIsCreating(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      const newPlan: CustomPlan = {
        id: 'plan-' + Date.now(),
        ...formState
      };
      setPlans(prev => [...prev, newPlan]);
      showToast(`Plano ${formState.name} criado com sucesso!`, 'success');
      setIsCreating(false);
    } else if (editingPlan) {
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, ...formState } : p));
      showToast(`Alterações no plano ${formState.name} salvas!`, 'success');
      setEditingPlan(null);
    }
  };

  const handleArchive = (id: string) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'active' ? 'archived' : 'active' } : p));
    showToast('Status de arquivamento do plano atualizado.', 'info');
  };

  const handleDuplicate = (plan: CustomPlan) => {
    const dup: CustomPlan = {
      ...plan,
      id: 'plan-' + Date.now(),
      tier: `${plan.tier}-Copy`,
      name: `${plan.name} (Cópia)`
    };
    setPlans(prev => [...prev, dup]);
    showToast(`Plano duplicado com o nome ${dup.name}`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Configuração de Planos (SaaS CRUD)</h2>
          <p className="text-xs text-slate-400">Gerenciamento dinâmico de preços, limites e travas dos planos de assinatura.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Active Plans Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(p => (
              <div 
                key={p.id}
                className={`p-5 bg-slate-900/30 border rounded-2xl space-y-4 relative flex flex-col justify-between ${
                  p.status === 'archived' 
                    ? 'border-slate-950 opacity-50' 
                    : 'border-slate-900 hover:border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      p.tier === 'Business' ? 'bg-pink-500/10 border-pink-500/20 text-pink-400' : 'bg-slate-950 border-slate-900 text-slate-400'
                    }`}>
                      {p.tier}
                    </span>
                    {p.status === 'archived' && (
                      <span className="text-[8px] bg-red-500/10 border border-red-500/20 text-red-400 font-mono font-bold px-1.5 rounded">
                        ARQUIVADO
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    <p className="text-lg font-black text-indigo-400 font-mono mt-1">
                      R$ {p.monthlyPrice} <span className="text-[10px] text-slate-500 font-normal">/mês</span>
                    </p>
                  </div>

                  {/* Quotas Details list */}
                  <ul className="text-[11px] text-slate-400 space-y-1.5 font-mono pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{p.maxVideos === 100000 ? 'Renders Ilimitados' : `${p.maxVideos} renders/mês`}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{p.maxStorageGB} GB de Storage S3</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="uppercase">Prioridade: {p.priority}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {p.watermark ? (
                        <span className="text-red-400 flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" /> Com Watermark
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Sem marca d'água
                        </span>
                      )}
                    </li>
                  </ul>
                </div>

                {/* Grid controls */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-900/60 mt-4">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="flex-1 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3 h-3 text-indigo-400" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDuplicate(p)}
                    className="py-1.5 px-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[10px] font-bold rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                    title="Duplicar Plano"
                  >
                    Copia
                  </button>
                  <button
                    onClick={() => handleArchive(p.id)}
                    className={`p-1.5 bg-slate-950 border border-slate-900 rounded-lg transition cursor-pointer ${
                      p.status === 'active' ? 'text-red-400 hover:bg-red-950/10' : 'text-slate-400 hover:text-white'
                    }`}
                    title={p.status === 'active' ? 'Arquivar Plano' : 'Re-ativar'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Form Editor (Create/Edit state) */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
            <Sparkles className="w-4 h-4 text-pink-500" />
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              {isCreating ? 'Novo Plano' : editingPlan ? `Editando: ${formState.name}` : 'Selecione um plano'}
            </h3>
          </div>

          {(!isCreating && !editingPlan) ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Layers className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-[11px] leading-relaxed">
                Clique em <strong>Editar</strong> em qualquer cartão ou no botão <strong>Novo Plano</strong> para abrir o painel de propriedades.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Identificador (Tier ID)</label>
                <input
                  type="text"
                  required
                  value={formState.tier}
                  onChange={e => setFormState({ ...formState, tier: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Nome de Exibição</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={e => setFormState({ ...formState, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Preço Mensal (R$)</label>
                  <input
                    type="number"
                    required
                    value={formState.monthlyPrice}
                    onChange={e => setFormState({ ...formState, monthlyPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Preço Anual (R$)</label>
                  <input
                    type="number"
                    required
                    value={formState.annualPrice}
                    onChange={e => setFormState({ ...formState, annualPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Limite Videos (Mês)</label>
                  <input
                    type="number"
                    required
                    value={formState.maxVideos}
                    onChange={e => setFormState({ ...formState, maxVideos: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Storage S3 (GB)</label>
                  <input
                    type="number"
                    required
                    value={formState.maxStorageGB}
                    onChange={e => setFormState({ ...formState, maxStorageGB: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-mono uppercase font-bold block mb-1">Prioridade no Cluster</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['low', 'normal', 'high', 'vip'] as const).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setFormState({ ...formState, priority: p })}
                      className={`py-1 text-[9px] font-mono font-bold uppercase rounded border transition cursor-pointer ${
                        formState.priority === p
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature flags switches */}
              <div className="space-y-2 border-t border-slate-900 pt-3">
                <label className="text-[10px] text-slate-500 font-mono uppercase font-bold block mb-1">Recursos Inclusos</label>
                
                {/* Watermark flag */}
                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-900/50 cursor-pointer">
                  <span>Forçar Marca d'água</span>
                  <input
                    type="checkbox"
                    checked={formState.watermark}
                    onChange={e => setFormState({ ...formState, watermark: e.target.checked })}
                    className="accent-pink-500"
                  />
                </label>

                {/* AI subtitles */}
                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-900/50 cursor-pointer">
                  <span>Legendas com IA</span>
                  <input
                    type="checkbox"
                    checked={formState.aiSubtitles}
                    onChange={e => setFormState({ ...formState, aiSubtitles: e.target.checked })}
                    className="accent-pink-500"
                  />
                </label>

                {/* Batch renders */}
                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-900/50 cursor-pointer">
                  <span>Exportação / Render em Lote</span>
                  <input
                    type="checkbox"
                    checked={formState.batchRender}
                    onChange={e => setFormState({ ...formState, batchRender: e.target.checked })}
                    className="accent-pink-500"
                  />
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlan(null);
                    setIsCreating(false);
                  }}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Salvar Plano
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
