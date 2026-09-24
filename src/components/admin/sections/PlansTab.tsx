/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Layers, Sparkles, RefreshCw, Archive, RotateCcw, Pencil, X } from 'lucide-react';
import { adminFetch } from '../../../utils/api';

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

const EMPTY_FORM = {
  tier: '',
  name: '',
  monthlyPrice: 0,
  annualPrice: 0,
  maxVideos: 100,
  maxStorageGB: 5,
  priority: 'normal' as CustomPlan['priority'],
  watermark: false,
  aiSubtitles: false,
  batchRender: false,
};

export const PlansTab: React.FC<PlansTabProps> = ({ showToast }) => {
  const [plans, setPlans] = useState<CustomPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/plans');
      if (res.ok) {
        setPlans(await res.json());
      }
    } catch (err) {
      console.warn('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (plan: CustomPlan) => {
    setEditingId(plan.id);
    setForm({
      tier: plan.tier,
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      maxVideos: plan.maxVideos,
      maxStorageGB: plan.maxStorageGB,
      priority: plan.priority,
      watermark: plan.watermark,
      aiSubtitles: plan.aiSubtitles,
      batchRender: plan.batchRender,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/admin/plans/${editingId}` : '/api/admin/plans';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao salvar plano.');
      }
      showToast(editingId ? 'Plano atualizado com sucesso.' : 'Plano criado com sucesso.', 'success');
      setShowForm(false);
      setEditingId(null);
      fetchPlans();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar plano.', 'error');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao arquivar plano.');
      showToast('Plano arquivado. Assinantes atuais mantêm o plano até migrarem.', 'success');
      fetchPlans();
    } catch (err: any) {
      showToast(err.message || 'Erro ao arquivar plano.', 'error');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) throw new Error('Falha ao reativar plano.');
      showToast('Plano reativado.', 'success');
      fetchPlans();
    } catch (err: any) {
      showToast(err.message || 'Erro ao reativar plano.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Consultando planos e limites cadastrados no SaaS...</p>
      </div>
    );
  }

  const activePlans = plans.filter(p => p.status !== 'archived');
  const archivedPlans = plans.filter(p => p.status === 'archived');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Catálogo de Planos</h2>
          <p className="text-xs text-slate-400 font-sans">Configuração de quotas, limites de renderização e precificação real.</p>
        </div>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          Novo Plano
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              {editingId ? 'Editar Plano' : 'Criar Novo Plano'}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Tier</label>
              <input required value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-pink-500" placeholder="Pro" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Nome</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-white focus:outline-none focus:border-pink-500" placeholder="Creator Pro" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Preço Mensal (R$)</label>
              <input required type="number" min={0} value={form.monthlyPrice} onChange={e => setForm({ ...form, monthlyPrice: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-pink-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Preço Anual (R$/mês)</label>
              <input required type="number" min={0} value={form.annualPrice} onChange={e => setForm({ ...form, annualPrice: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-pink-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Máx. Vídeos/Mês</label>
              <input required type="number" min={0} value={form.maxVideos} onChange={e => setForm({ ...form, maxVideos: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-pink-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Storage (GB)</label>
              <input required type="number" min={0} value={form.maxStorageGB} onChange={e => setForm({ ...form, maxStorageGB: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-pink-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Prioridade na Fila</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as CustomPlan['priority'] })}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-pink-500 cursor-pointer">
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="vip">VIP</option>
              </select>
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={form.watermark} onChange={e => setForm({ ...form, watermark: e.target.checked })} /> Watermark
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={form.aiSubtitles} onChange={e => setForm({ ...form, aiSubtitles: e.target.checked })} /> Legendas IA
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                <input type="checkbox" checked={form.batchRender} onChange={e => setForm({ ...form, batchRender: e.target.checked })} /> Render em Lote
              </label>
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition cursor-pointer">
            {editingId ? 'Salvar Alterações' : 'Criar Plano'}
          </button>
        </form>
      )}

      {activePlans.length === 0 && !showForm ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-3xl text-center space-y-4 max-w-lg mx-auto">
          <Layers className="w-12 h-12 text-slate-700 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white">Nenhum Plano Ativo</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Não existem planos customizados registrados no banco de dados. Nenhuma informação fictícia será exibida.
            </p>
          </div>
          <button onClick={openCreateForm} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-800">
            Criar Primeiro Plano
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activePlans.map(p => (
            <div key={p.id} className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400">
                    {p.tier}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditForm(p)} className="p-1 text-slate-500 hover:text-white cursor-pointer" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleArchive(p.id)} className="p-1 text-slate-500 hover:text-red-400 cursor-pointer" title="Arquivar">
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-base font-bold text-white">{p.name}</h3>
                <div className="pt-2">
                  <span className="text-2xl font-black text-white">R$ {p.monthlyPrice}</span>
                  <span className="text-[10px] text-slate-500 font-mono"> /mês</span>
                </div>
              </div>

              <div className="space-y-2 text-[11px] font-medium font-mono text-slate-400 pt-3 border-t border-slate-900">
                <div className="flex items-center justify-between">
                  <span>Vídeos:</span>
                  <span className="text-white font-bold">{p.maxVideos}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Storage:</span>
                  <span className="text-white font-bold">{p.maxStorageGB} GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Prioridade:</span>
                  <span className="text-indigo-400 font-bold uppercase">{p.priority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Watermark:</span>
                  <span className={p.watermark ? "text-amber-500" : "text-emerald-400"}>
                    {p.watermark ? "Sim" : "Não"}
                  </span>
                </div>
              </div>

              <div className="pt-3">
                <span className="w-full py-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded-lg bg-emerald-500/10 text-emerald-400">
                  Ativo
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {archivedPlans.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Planos Arquivados</h3>
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl divide-y divide-slate-900/60">
            {archivedPlans.map(p => (
              <div key={p.id} className="p-3 px-5 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">{p.tier} — {p.name}</span>
                <button onClick={() => handleReactivate(p.id)} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-400 cursor-pointer">
                  <RotateCcw className="w-3 h-3" /> Reativar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
