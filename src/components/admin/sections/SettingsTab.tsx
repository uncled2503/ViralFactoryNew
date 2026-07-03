/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings, 
  ToggleLeft, 
  ToggleRight, 
  Key, 
  Mail, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  CheckCircle,
  ShieldCheck
} from 'lucide-react';

interface SettingsTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ showToast }) => {
  // Feature flags state
  const [flags, setFlags] = useState({
    aiSubtitles: true,
    batchRenders: true,
    stripeLive: false,
    offlineFallbackAuth: true,
    telemetryLogs: true
  });

  // Global details
  const [saasName, setSaasName] = useState('Viral Factory');
  const [saasEmail, setSaasEmail] = useState('support@viralfactory.com');
  const [stripeSecretKey, setStripeSecretKey] = useState('sk_test_51Mz90BFF...');
  
  // IP Blacklist state
  const [blacklistedIps, setBlacklistedIps] = useState<string[]>([
    '185.220.101.44',
    '45.227.254.12'
  ]);
  const [newIp, setNewIp] = useState('');

  const toggleFlag = (key: keyof typeof flags) => {
    setFlags(prev => {
      const next = { ...prev, [key]: !prev[key] };
      showToast(`Flag de recurso "${String(key)}" alterada com sucesso!`, 'info');
      return next;
    });
  };

  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Variáveis de ambiente globais atualizadas e salvas!', 'success');
  };

  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp) return;
    setBlacklistedIps(prev => [...prev, newIp.trim()]);
    showToast(`IP ${newIp} bloqueado nas regras de firewall ingress.`, 'success');
    setNewIp('');
  };

  const handleRemoveIp = (ip: string) => {
    setBlacklistedIps(prev => prev.filter(item => item !== ip));
    showToast(`IP ${ip} liberado do bloqueio.`, 'info');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-xs font-medium">
      
      {/* Left Columns: Config values */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Global SaaS General Config Form */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-pink-500" /> Variáveis Globais de SaaS
          </h3>
          <form onSubmit={handleSaveConfigs} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Email Remetente (SMTP)</label>
              <input
                type="email"
                required
                value={saasEmail}
                onChange={e => setSaasEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] text-slate-500 font-mono uppercase font-bold">Stripe Secret API Key</label>
              <input
                type="password"
                required
                value={stripeSecretKey}
                onChange={e => setStripeSecretKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-pink-500"
              />
            </div>

            <button
              type="submit"
              className="md:col-span-2 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Gravar Configurações
            </button>
          </form>
        </div>

        {/* Feature Flags Switches */}
        <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-pink-500" /> Feature Flags (Alternância de Recursos)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'aiSubtitles', label: 'Transcrições & Legendas por IA', desc: 'Habilita Whisper transcrições nos editores.' },
              { key: 'batchRenders', label: 'Exportações Rápidas em Lote', desc: 'Processamento multi-threaded no cluster.' },
              { key: 'stripeLive', label: 'Gateway Stripe Modo Produção', desc: 'Desativa o sandbox de faturamento test.' },
              { key: 'offlineFallbackAuth', label: 'Fallback de Auth Mock', desc: 'Habilita login offline em caso de timeout de rede.' }
            ].map(flag => (
              <div 
                key={flag.key}
                onClick={() => toggleFlag(flag.key as any)}
                className="p-3.5 bg-slate-950 rounded-xl border border-slate-900 flex items-center justify-between gap-4 cursor-pointer hover:border-slate-800 transition"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{flag.label}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{flag.desc}</p>
                </div>
                <button className="shrink-0 text-indigo-400 hover:text-indigo-300">
                  {flags[flag.key as keyof typeof flags] ? (
                    <ToggleRight className="w-8 h-8 text-pink-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-700" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Column: IP Firewall Ingress limits */}
      <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl h-fit space-y-4">
        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-pink-500" /> Ingress IP Firewall (Blacklist)
        </h3>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Bloqueie requisições suspeitas de scrapers, bots ou invasores diretamente no middleware de borda.
        </p>

        {/* Add block */}
        <form onSubmit={handleAddIp} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Ex: 198.51.100.12"
            value={newIp}
            onChange={e => setNewIp(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-pink-500"
          />
          <button
            type="submit"
            className="px-3 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-white font-bold rounded-lg transition cursor-pointer"
          >
            Bloquear
          </button>
        </form>

        {/* Blocked IP list */}
        <div className="space-y-2 pt-2 border-t border-slate-900/50">
          {blacklistedIps.map(ip => (
            <div key={ip} className="p-2.5 bg-slate-950 rounded-xl border border-slate-900 flex items-center justify-between font-mono text-[11px]">
              <span className="text-red-400 font-semibold">{ip}</span>
              <button
                onClick={() => handleRemoveIp(ip)}
                className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-white transition cursor-pointer"
                title="Desbloquear IP"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {blacklistedIps.length === 0 && (
            <div className="py-6 text-center text-slate-500">
              Nenhum endereço IP restrito nas tabelas IPtables.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
