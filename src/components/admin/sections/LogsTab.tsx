/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Terminal, 
  Search, 
  Filter, 
  Download, 
  Play, 
  Pause, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Clock
} from 'lucide-react';

interface LogsTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  service: 'ffmpeg-worker' | 'auth-service' | 'billing-engine' | 'storage-handler';
  message: string;
  ipAddress: string;
}

interface AuditLog {
  id: string;
  adminName: string;
  action: string;
  targetUser: string;
  timestamp: string;
  ip: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export const LogsTab: React.FC<LogsTabProps> = ({ showToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'system'>('audit');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [streamPaused, setStreamPaused] = useState(false);

  // Administrative Audit logs (Immutable action trails)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: 'aud-001', adminName: 'Gabriel (SUPER_ADMIN)', action: 'Impersonated User Session', targetUser: 'Bruna Silva (bruna@ecom.com)', timestamp: '2026-07-01 11:42:01', ip: '186.204.14.22', status: 'SUCCESS' },
    { id: 'aud-002', adminName: 'Gabriel (SUPER_ADMIN)', action: 'Adjusted Storage Quotas (+500MB)', targetUser: 'Lucas Santos (lucas@agency.io)', timestamp: '2026-07-01 11:38:15', ip: '186.204.14.22', status: 'SUCCESS' },
    { id: 'aud-003', adminName: 'Gabriel (SUPER_ADMIN)', action: 'Changed Subscription Plan to Pro', targetUser: 'Renata Souza (renata@vlog.com)', timestamp: '2026-07-01 11:15:30', ip: '186.204.14.22', status: 'SUCCESS' },
    { id: 'aud-004', adminName: 'Suporte Dev (DESENVOLVEDOR)', action: 'Rebooted Cluster Node: Delta', targetUser: 'Cluster US-EAST-01', timestamp: '2026-07-01 10:44:12', ip: '191.144.11.2', status: 'SUCCESS' },
    { id: 'aud-005', adminName: 'Gabriel (SUPER_ADMIN)', action: 'Suspended Account due to abuse', targetUser: 'Hacker User (hack@test.com)', timestamp: '2026-06-30 23:55:00', ip: '186.204.14.22', status: 'SUCCESS' }
  ]);

  // Streaming Dev Logs state
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([
    { id: 'log-01', timestamp: '2026-07-01 11:51:04', level: 'info', service: 'ffmpeg-worker', message: 'FFmpeg command completed for project prj-001 in 45s.', ipAddress: '10.244.1.15' },
    { id: 'log-02', timestamp: '2026-07-01 11:50:45', level: 'info', service: 'auth-service', message: 'User Gabriel Moura logged in successfully.', ipAddress: '191.182.14.9' },
    { id: 'log-03', timestamp: '2026-07-01 11:50:12', level: 'warning', service: 'storage-handler', message: 'User usr-002 reached 81% of storage quota limit.', ipAddress: '200.141.11.2' },
    { id: 'log-04', timestamp: '2026-07-01 11:49:55', level: 'info', service: 'billing-engine', message: 'Subscription sub-001 successfully renewed for next period.', ipAddress: 'stripe-webhook' },
    { id: 'log-05', timestamp: '2026-07-01 11:48:30', level: 'error', service: 'ffmpeg-worker', message: 'Codec error frame 1400: Failed to decode input background stream.', ipAddress: '10.244.2.19' }
  ]);

  // Live log simulation interval
  useEffect(() => {
    if (streamPaused || activeSubTab !== 'system') return;

    const services: Array<'ffmpeg-worker' | 'auth-service' | 'billing-engine' | 'storage-handler'>[] = [
      ['ffmpeg-worker'], ['auth-service'], ['billing-engine'], ['storage-handler']
    ];
    const messages = [
      'Worker-Beta received job queue payload.',
      'API Token authenticated successfully for client support agent.',
      'Storage bucket sync complete in sa-east-1.',
      'Memory cleanup: Released 512MB of cached chunk buffers.',
      'Billing webhook processed: Invoice ref inv-39201.',
      'Ffmpeg encoding started at 60fps (fastest-gpu mode).'
    ];
    const levels: Array<'info' | 'warning' | 'error'>[] = [['info'], ['info'], ['warning'], ['info']];

    const interval = setInterval(() => {
      const randomSvc = services[Math.floor(Math.random() * services.length)][0];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      const randomLvl = levels[Math.floor(Math.random() * levels.length)][0];
      
      const newLog: LogEntry = {
        id: `log-${Math.floor(Math.random() * 90000) + 10000}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        level: randomLvl as any,
        service: randomSvc,
        message: randomMsg,
        ipAddress: `${Math.floor(Math.random() * 150) + 50}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 254) + 1}`
      };

      setSystemLogs(prev => [newLog, ...prev.slice(0, 49)]);
    }, 4000);

    return () => clearInterval(interval);
  }, [streamPaused, activeSubTab]);

  // Logs filtering
  const filteredSystemLogs = useMemo(() => {
    return systemLogs.filter(log => {
      const matchSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.service.toLowerCase().includes(searchQuery.toLowerCase());
      const matchLevel = levelFilter === 'all' || log.level === levelFilter;
      return matchSearch && matchLevel;
    });
  }, [systemLogs, searchQuery, levelFilter]);

  const handleExportLogs = () => {
    const dataString = activeSubTab === 'audit'
      ? auditLogs.map(l => `[${l.timestamp}] Admin: ${l.adminName} | Action: ${l.action} | Target: ${l.targetUser} | Status: ${l.status}`).join('\n')
      : systemLogs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.service}] ${l.message} (${l.ipAddress})`).join('\n');

    const blob = new Blob([dataString], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `viral-factory-logs-${activeSubTab}-${new Date().toISOString().split('T')[0]}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Histórico de logs exportado com sucesso!', 'success');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Sub-tabs header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3 flex-wrap gap-4">
        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-850">
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'audit' 
                ? 'bg-pink-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Auditoria Administrativa
          </button>
          <button
            onClick={() => setActiveSubTab('system')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'system' 
                ? 'bg-pink-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 animate-pulse" />
            Logs de Sistema
          </button>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          {activeSubTab === 'system' && (
            <button
              onClick={() => setStreamPaused(!streamPaused)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
            >
              {streamPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
              <span>{streamPaused ? 'Iniciar Stream' : 'Pausar Stream'}</span>
            </button>
          )}
          <button
            onClick={handleExportLogs}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg text-xs font-bold text-white transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pink-500" />
            Salvar Relatório
          </button>
        </div>
      </div>

      {/* AUDIT LOG TAB VIEW */}
      {activeSubTab === 'audit' && (
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
          <div className="p-4 bg-slate-950/40 border-b border-slate-900 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-semibold font-mono uppercase tracking-wider">Trilha de Segurança Imutável (Audit Trail)</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">● ASSINATURA SHA-256 ATIVA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/20 text-slate-500 font-mono font-bold uppercase">
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Administrador</th>
                  <th className="py-3.5 px-6">Ação Realizada</th>
                  <th className="py-3.5 px-6">Alvo / Entidade</th>
                  <th className="py-3.5 px-6">Endereço IP</th>
                  <th className="py-3.5 px-6 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 text-slate-300 font-mono text-[11px]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/10 transition">
                    <td className="py-3.5 px-6 text-slate-500">{log.timestamp}</td>
                    <td className="py-3.5 px-6 font-sans font-bold text-slate-200">{log.adminName}</td>
                    <td className="py-3.5 px-6 font-sans text-pink-400 font-semibold">{log.action}</td>
                    <td className="py-3.5 px-6 font-sans text-slate-400">{log.targetUser}</td>
                    <td className="py-3.5 px-6 text-slate-400">{log.ip}</td>
                    <td className="py-3.5 px-6 text-right">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 py-0.5 px-2 rounded-full uppercase">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SYSTEM LIVE LOG TAB VIEW */}
      {activeSubTab === 'system' && (
        <div className="space-y-3">
          {/* Filters inside terminal view */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar log por mensagem ou serviço..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-lg py-1.5 pl-10 pr-4 text-xs text-white focus:outline-none placeholder-slate-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900/30 border border-slate-900 p-1 rounded-xl shrink-0">
              {(['all', 'info', 'warning', 'error'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg uppercase transition cursor-pointer ${
                    levelFilter === level 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {level === 'all' ? 'Tudo' : level}
                </button>
              ))}
            </div>
          </div>

          {/* Terminal Box UI */}
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 font-mono text-[11px] leading-relaxed space-y-2 h-[450px] overflow-y-auto shadow-inner text-slate-400">
            {filteredSystemLogs.map(log => {
              const colorMap = {
                info: 'text-cyan-400',
                warning: 'text-amber-400',
                error: 'text-red-400 font-bold'
              };
              return (
                <div key={log.id} className="flex items-start gap-3 border-b border-slate-900/30 pb-1.5 hover:bg-slate-900/20 transition">
                  <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                  <span className={`shrink-0 select-none uppercase font-bold text-[10px] ${colorMap[log.level]}`}>
                    [{log.level}]
                  </span>
                  <span className="text-indigo-400 font-semibold shrink-0 select-none">[{log.service}]</span>
                  <span className="text-slate-300 flex-1">{log.message}</span>
                  <span className="text-slate-600 select-none text-[10px] shrink-0">{log.ipAddress}</span>
                </div>
              );
            })}

            {filteredSystemLogs.length === 0 && (
              <div className="h-full flex items-center justify-center text-slate-600">
                Aguardando logs adicionais no canal selecionado...
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
