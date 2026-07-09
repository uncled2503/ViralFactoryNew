/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, AlertTriangle, Server, Zap, CheckCircle } from 'lucide-react';
import { RenderingTask, RenderWorker } from '../../../types';

interface RenderFarmTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const RenderFarmTab: React.FC<RenderFarmTabProps> = ({ showToast }) => {
  const [workers, setWorkers] = useState<RenderWorker[]>([]);
  const [jobs, setJobs] = useState<RenderingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const wRes = await fetch('/api/admin/workers');
      if (wRes.ok) {
        setWorkers(await wRes.ok ? await wRes.json() : []);
      }
      const jRes = await fetch('/api/admin/jobs');
      if (jRes.ok) {
        setJobs(await jRes.ok ? await jRes.json() : []);
      }
    } catch (err) {
      console.warn('Failed to load render farm status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestEngine = async () => {
    setIsTesting(true);
    showToast("Iniciando validação do motor FFmpeg em tempo real...", "info");
    try {
      const response = await fetch('/api/admin/test-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'usr-admin-test' })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast("Motor validado com sucesso! Clipe renderizado e verificado no S3.", "success");
        fetchData();
      } else {
        throw new Error(data.error || "Falha ao acionar motor de render.");
      }
    } catch (err: any) {
      showToast(`Erro de validação: ${err.message}`, "error");
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Consultando cluster de servidores FFmpeg reais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Test action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Cluster FFmpeg</h2>
          <p className="text-xs text-slate-400 font-sans">Gerenciamento em tempo real de workers distribuídos e renderizações de vídeo.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTestEngine}
            disabled={isTesting}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" />
            {isTesting ? "Validando..." : "Testar Engine FFmpeg"}
          </button>
          <button 
            onClick={fetchData}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid: Workers List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Workers Status */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-pink-500" /> Nós de Renderização
          </h3>

          {workers.length === 0 ? (
            <div className="p-8 border border-slate-900 bg-slate-950/20 rounded-2xl text-center space-y-2">
              <Server className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-xs font-bold text-slate-400 font-sans">Nenhum Worker Ativo</p>
              <p className="text-[10px] text-slate-500 font-sans">Os nós de processamento aparecerão ao se conectar ao backend.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workers.map(w => (
                <div key={w.id} className="bg-slate-900/30 border border-slate-900 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{w.name}</h4>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      w.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {w.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                    <div>CPU: <span className="text-white font-bold">{w.cpuUsage}%</span></div>
                    <div>RAM: <span className="text-white font-bold">{w.memoryUsage}%</span></div>
                    <div className="col-span-2">Região: <span className="text-indigo-400 font-bold">{w.region}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Render Queue List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Fila de Processamento</h3>

          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
            {jobs.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Cpu className="w-10 h-10 text-slate-700 mx-auto" />
                <p className="text-xs font-semibold text-slate-400 font-sans">Nenhuma Renderização na Fila</p>
                <p className="text-[10px] text-slate-500 font-sans">Novos pedidos de exportação de vídeo aparecerão nesta lista em tempo real.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/40 text-slate-500 font-mono font-bold uppercase tracking-wider">
                    <th className="py-3 px-6">ID do Job</th>
                    <th className="py-3 px-6">Template</th>
                    <th className="py-3 px-6">Progresso</th>
                    <th className="py-3 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 font-medium font-mono text-[11px] text-slate-300">
                  {jobs.map(job => (
                    <tr key={job.id} className="hover:bg-slate-900/10 transition">
                      <td className="py-3 px-6 text-white font-bold">{job.id}</td>
                      <td className="py-3 px-6 text-slate-400">{job.templateId}</td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                            <div className="h-full bg-pink-500 rounded-full" style={{ width: `${job.progress || 0}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">{job.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          job.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : job.status === 'failed'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {job.status === 'completed' ? 'Concluído' : job.status === 'failed' ? 'Falhou' : 'Processando'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
