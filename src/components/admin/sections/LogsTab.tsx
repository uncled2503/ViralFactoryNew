/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, Search, RefreshCw, Clock, Filter } from 'lucide-react';
import { adminFetch } from '../../../utils/api';

interface AuditLog {
  id: string;
  adminName: string;
  action: string;
  targetUser: string;
  timestamp: string;
  ip: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export const LogsTab: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.warn('Failed to load real audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const admin = log.adminName || '';
      const action = log.action || '';
      const target = log.targetUser || '';
      const matchSearch = admin.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          target.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || log.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [auditLogs, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Puxando logs de auditoria imutáveis do banco...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-600 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por administrador, ação ou alvo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-900 p-2 pl-9 text-xs text-white rounded-xl placeholder-slate-600 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900/60 border border-slate-900 p-2 text-xs text-slate-300 rounded-xl focus:outline-none focus:border-pink-500 cursor-pointer w-full sm:w-auto"
          >
            <option value="all">Todos os Status</option>
            <option value="SUCCESS">Sucesso</option>
            <option value="WARNING">Aviso</option>
            <option value="FAILED">Falha</option>
          </select>
          <button 
            onClick={fetchAuditLogs}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Terminal className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-xs font-semibold text-slate-400 font-sans">Nenhum log de auditoria registrado</p>
            <p className="text-[10px] text-slate-500 font-sans">Ações administrativas no SaaS gerarão logs de segurança em tempo real.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-500 font-mono font-bold uppercase tracking-wider">
                  <th className="py-3 px-6">Administrador</th>
                  <th className="py-3 px-6">Ação Realizada</th>
                  <th className="py-3 px-6">Alvo / Alteraçâo</th>
                  <th className="py-3 px-6">Endereço IP</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40 font-medium font-mono text-[11px] text-slate-300">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/10 transition">
                    <td className="py-3 px-6 text-white font-sans font-bold">{log.adminName}</td>
                    <td className="py-3 px-6 text-slate-200">{log.action}</td>
                    <td className="py-3 px-6 text-slate-400 max-w-xs truncate">{log.targetUser}</td>
                    <td className="py-3 px-6 text-slate-500 font-mono">{log.ip}</td>
                    <td className="py-3 px-6 font-sans">
                      <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : log.status === 'WARNING'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      {log.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
