/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, Key, Mail, ShieldAlert, RefreshCw, CheckCircle } from 'lucide-react';

interface SettingsTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ showToast }) => {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState({
    aiSubtitles: false,
    batchRenders: false,
    stripeLive: false,
    offlineFallbackAuth: false,
    telemetryLogs: false
  });

  const [saasName, setSaasName] = useState('Viral Factory');
  const [saasEmail, setSaasEmail] = useState('support@viralfactory.com');
  const [stripeSecretKey, setStripeSecretKey] = useState('sk_test_51Mz90BFF...');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        // Match settings items
        const saasNameItem = data.find((s: any) => s.key === 'saas_name');
        if (saasNameItem) setSaasName(saasNameItem.value);

        const saasEmailItem = data.find((s: any) => s.key === 'saas_email');
        if (saasEmailItem) setSaasEmail(saasEmailItem.value);

        const stripeKeyItem = data.find((s: any) => s.key === 'stripe_secret_key');
        if (stripeKeyItem) setStripeSecretKey(stripeKeyItem.value);

        const flagsItem = data.find((s: any) => s.key === 'feature_flags');
        if (flagsItem) {
          try {
            setFlags(JSON.parse(flagsItem.value));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'saas_name', value: saasName })
      });
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'saas_email', value: saasEmail })
      });
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'stripe_secret_key', value: stripeSecretKey })
      });

      showToast('Configurações globais salvas com sucesso no banco de dados!', 'success');
      fetchSettings();
    } catch (err) {
      showToast('Erro ao salvar configurações.', 'error');
    }
  };

  const handleToggleFlag = async (key: keyof typeof flags) => {
    const nextFlags = { ...flags, [key]: !flags[key] };
    setFlags(nextFlags);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'feature_flags', value: JSON.stringify(nextFlags) })
      });
      showToast(`Flag "${String(key)}" atualizada no banco de dados.`, 'success');
    } catch (err) {
      showToast('Erro ao alternar flag de recurso.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Puxando configurações globais do banco de dados...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      
      {/* Left Columns: Environment variables setup */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-pink-500" /> Parâmetros Globais do SaaS
        </h3>

        <form onSubmit={handleSaveConfigs} className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Nome da Plataforma</label>
              <input
                type="text"
                required
                value={saasName}
                onChange={e => setSaasName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Email SMTP de Envio</label>
              <input
                type="email"
                required
                value={saasEmail}
                onChange={e => setSaasEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Chave Privada Stripe (Secret API Key)</label>
            <input
              type="password"
              required
              value={stripeSecretKey}
              onChange={e => setStripeSecretKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Salvar Parâmetros no Banco
          </button>
        </form>
      </div>

      {/* Right Column: Dynamic Feature Flags */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-pink-500" /> Feature Flags do SaaS
        </h3>

        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-4 text-xs font-medium">
          {Object.entries(flags).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between py-1 border-b border-slate-900/30 last:border-0">
              <div className="space-y-0.5">
                <p className="font-semibold text-white capitalize font-mono text-[11px]">{key}</p>
                <p className="text-[9px] text-slate-500">Persistido dinamicamente no banco</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFlag(key as any)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enabled ? 'bg-pink-600' : 'bg-slate-950'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
