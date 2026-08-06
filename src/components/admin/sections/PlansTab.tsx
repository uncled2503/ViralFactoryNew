/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Layers, Check, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { adminFetch } from '../../../utils/api';

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

export const PlansTab: React.FC = () => {
  const [plans, setPlans] = useState<CustomPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/settings');
      if (res.ok) {
        const settings = await res.json();
        const customPlansItem = settings.find((s: any) => s.key === 'saas_custom_plans');
        if (customPlansItem && customPlansItem.value) {
          setPlans(JSON.parse(customPlansItem.value));
        } else {
          // If no plans in DB yet, show empty
          setPlans([]);
        }
      }
    } catch (err) {
      console.warn('Failed to load plans from settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async () => {
    const defaultPlansList: CustomPlan[] = [
      { id: 'plan-0', tier: 'Free', name: 'Free Trial', monthlyPrice: 0, annualPrice: 0, maxVideos: 5, maxStorageGB: 1, priority: 'low', watermark: true, aiSubtitles: false, batchRender: false, status: 'active' },
      { id: 'plan-1', tier: 'Starter', name: 'Starter', monthlyPrice: 97, annualPrice: 77, maxVideos: 300, maxStorageGB: 2, priority: 'normal', watermark: false, aiSubtitles: true, batchRender: false, status: 'active' },
      { id: 'plan-2', tier: 'Pro', name: 'Creator Pro', monthlyPrice: 197, annualPrice: 157, maxVideos: 1200, maxStorageGB: 100, priority: 'high', watermark: false, aiSubtitles: true, batchRender: true, status: 'active' },
      { id: 'plan-3', tier: 'Business', name: 'Business', monthlyPrice: 397, annualPrice: 317, maxVideos: 4000, maxStorageGB: 10, priority: 'vip', watermark: false, aiSubtitles: true, batchRender: true, status: 'active' }
    ];

    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'saas_custom_plans',
          value: JSON.stringify(defaultPlansList)
        })
      });
      if (res.ok) {
        fetchPlans();
      }
    } catch (err) {
      console.error(err);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Catálogo de Planos</h2>
          <p className="text-xs text-slate-400 font-sans">Configuração de quotas, limites de renderização e precificação real.</p>
        </div>
        {plans.length === 0 && (
          <button
            onClick={handleCreatePlan}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Inicializar Tabela de Planos
          </button>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-3xl text-center space-y-4 max-w-lg mx-auto">
          <Layers className="w-12 h-12 text-slate-700 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white">Nenhum Plano no Banco de Dados</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Não existem planos customizados registrados na tabela de configurações do seu banco de dados Supabase. Nenhuma informação fictícia será exibida.
            </p>
          </div>
          <button
            onClick={handleCreatePlan}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-800"
          >
            Configurar Planos Padrão no Banco
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(p => (
            <div key={p.id} className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <span className="inline-flex items-center text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400">
                  {p.tier}
                </span>
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
                <span className={`w-full py-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded-lg ${
                  p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-950 text-slate-500'
                }`}>
                  {p.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
