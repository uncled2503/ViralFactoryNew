/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Play, 
  Pause, 
  RefreshCw, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  Server, 
  Terminal, 
  TrendingUp, 
  TrendingDown, 
  Check 
} from 'lucide-react';
import { RenderingTask, RenderWorker } from '../../../types';

interface RenderFarmTabProps {
  renderingTasks: RenderingTask[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const RenderFarmTab: React.FC<RenderFarmTabProps> = ({ renderingTasks, showToast }) => {
  const [workers, setWorkers] = useState<RenderWorker[]>([
    { id: 'wrk-01', name: 'US-EAST Worker-Alpha', status: 'online', cpuUsage: 14, memoryUsage: 32, processedCount: 1420, region: 'N. Virginia' },
    { id: 'wrk-02', name: 'US-WEST Worker-Beta', status: 'busy', cpuUsage: 89, memoryUsage: 74, processedCount: 980, region: 'Oregon' },
    { id: 'wrk-03', name: 'EU-WEST Worker-Gamma', status: 'online', cpuUsage: 5, memoryUsage: 18, processedCount: 1205, region: 'Frankfurt' },
    { id: 'wrk-04', name: 'SA-EAST Worker-Delta', status: 'offline', cpuUsage: 0, memoryUsage: 0, processedCount: 540, region: 'São Paulo' }
  ]);

  const [activeQueue, setActiveQueue] = useState<RenderingTask[]>([
    { id: 'task-100', userId: 'usr-01', projectId: 'prj-01', templateId: 'reddit-stories', status: 'processing', progress: 68, createdAt: new Date().toISOString(), videoUrl: '' },
    { id: 'task-101', userId: 'usr-02', projectId: 'prj-02', templateId: 'podcast-clip', status: 'queued', progress: 0, createdAt: new Date().toISOString(), videoUrl: '' },
    { id: 'task-102', userId: 'usr-03', projectId: 'prj-03', templateId: 'gta-gameplay', status: 'failed', progress: 14, createdAt: new Date().toISOString(), videoUrl: '' }
  ]);

  // Live simulation of cpu load fluctuations
  useEffect(() => {
    const timer = setInterval(() => {
      setWorkers(prev => prev.map(w => {
        if (w.status === 'offline') return w;
        const nextCpu = w.status === 'busy' 
          ? Math.max(70, Math.min(98, w.cpuUsage + (Math.floor(Math.random() * 11) - 5)))
          : Math.max(2, Math.min(25, w.cpuUsage + (Math.floor(Math.random() * 5) - 2)));
        
        const nextMemory = w.status === 'busy'
          ? Math.max(60, Math.min(85, w.memoryUsage + (Math.floor(Math.random() * 5) - 2)))
          : Math.max(10, Math.min(25, w.memoryUsage + (Math.floor(Math.random() * 3) - 1)));

        return { ...w, cpuUsage: nextCpu, memoryUsage: nextMemory };
      }));

      // Simulate rendering progress
      setActiveQueue(prev => prev.map(t => {
        if (t.status === 'processing') {
          const nextProgress = t.progress + 4;
          if (nextProgress >= 100) {
            showToast(`Render ${t.id} concluído com sucesso e enfileirado para S3.`, 'success');
            return { ...t, status: 'completed', progress: 100 };
          }
          return { ...t, progress: nextProgress };
        }
        return t;
      }));
    }, 3000);

    return () => clearInterval(timer);
  }, [showToast]);

  const toggleWorker = (id: string, action: 'reboot' | 'toggle' | 'pause') => {
    setWorkers(prev => prev.map(w => {
      if (w.id === id) {
        if (action === 'reboot') {
          showToast(`Nó regional ${w.name} reinicializado.`, 'success');
          return { ...w, status: 'online', cpuUsage: 0, memoryUsage: 0 };
        } else if (action === 'toggle') {
          const isOff = w.status === 'offline';
          showToast(`Nó ${w.name} foi ${isOff ? 'ativado' : 'desligado'}.`, 'info');
          return { ...w, status: isOff ? 'online' : 'offline', cpuUsage: 0, memoryUsage: 0 };
        } else {
          const isBusy = w.status === 'busy';
          showToast(`Worker ${w.name} está ${isBusy ? 'ocioso' : 'forçado a processar'}.`, 'info');
          return { ...w, status: isBusy ? 'online' : 'busy' };
        }
      }
      return w;
    }));
  };

  const handleRequeue = (taskId: string) => {
    setActiveQueue(prev => prev.map(t => {
      if (t.id === taskId) {
        showToast(`Tarefa de vídeo ${taskId} reinserida na fila de processamento ffmpeg.`, 'success');
        return { ...t, status: 'queued', progress: 0 };
      }
      return t;
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Infrastructure Node summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Server className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase">Capacidade Farm</h4>
            <h3 className="text-base font-black text-white">3 / 4 Ativos</h3>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase">CPU Consolidado</h4>
            <h3 className="text-base font-black text-white">36% Médio</h3>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-2.5 bg-pink-500/10 text-pink-400 rounded-xl">
            <RefreshCw className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase">Fila de Espera</h4>
            <h3 className="text-base font-black text-white">
              {activeQueue.filter(t => t.status === 'queued').length} Vídeos
            </h3>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <Terminal className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase">Velocidade Média</h4>
            <h3 className="text-base font-black text-white">1.8x Real-Time</h3>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Workers control lists */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Cluster Nodes (Render Workers)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workers.map(w => (
              <div 
                key={w.id}
                className={`p-5 bg-slate-900/30 border rounded-2xl space-y-4 transition ${
                  w.status === 'offline' ? 'border-red-500/20 opacity-60' : 'border-slate-900 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${
                      w.status === 'busy' ? 'bg-amber-400' : w.status === 'online' ? 'bg-emerald-400' : 'bg-red-500'
                    }`} />
                    <h4 className="text-xs font-bold text-white">{w.name}</h4>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">{w.region}</span>
                </div>

                {/* Telemetries of the current worker node */}
                <div className="grid grid-cols-2 gap-4 pt-1 text-[11px] font-mono">
                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px]">Carga CPU</span>
                    <span className="font-bold text-white block">{w.cpuUsage}%</span>
                    <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full" style={{ width: `${w.cpuUsage}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px]">Consumo RAM</span>
                    <span className="font-bold text-white block">{w.memoryUsage}%</span>
                    <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${w.memoryUsage}%` }} />
                    </div>
                  </div>
                </div>

                {/* Regional Stats */}
                <div className="flex justify-between text-[10px] font-mono text-slate-500 border-t border-slate-900/60 pt-3">
                  <span>ID: {w.id}</span>
                  <span>TOTAL RENDER: {w.processedCount}</span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => toggleWorker(w.id, 'reboot')}
                    className="flex-1 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-[10px] font-bold rounded text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    Reboot
                  </button>
                  <button
                    onClick={() => toggleWorker(w.id, 'toggle')}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition cursor-pointer ${
                      w.status === 'offline' 
                        ? 'bg-emerald-950/20 border border-emerald-500/10 text-emerald-400 hover:bg-emerald-950/45' 
                        : 'bg-red-950/20 border border-red-500/10 text-red-400 hover:bg-red-950/45'
                    }`}
                  >
                    {w.status === 'offline' ? 'Ligar' : 'Desligar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Active Ffmpeg queues */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-900">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Fila FFmpeg</h3>
            <span className="text-[10px] bg-slate-950 border border-slate-900 text-slate-500 font-mono px-2 py-0.5 rounded-full">
              LIVE SIM
            </span>
          </div>

          <div className="space-y-4">
            {activeQueue.map(task => (
              <div key={task.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-900/60 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-slate-200 block">{task.id}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Template: {task.templateId}</span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                    task.status === 'processing' 
                      ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse' 
                      : task.status === 'queued'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : task.status === 'completed'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {task.status === 'processing' ? 'Codificando' : task.status === 'queued' ? 'Aguardando' : task.status === 'completed' ? 'Sucesso' : 'Falhou'}
                  </span>
                </div>

                {/* Progress bar */}
                {(task.status === 'processing' || task.status === 'completed') && (
                  <div className="space-y-1">
                    <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-600 to-indigo-600 rounded-full" style={{ width: `${task.progress}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>Progresso</span>
                      <span>{task.progress}%</span>
                    </div>
                  </div>
                )}

                {/* Re-queue trigger for failed renders */}
                {task.status === 'failed' && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Erro Codec FFMPEG
                    </span>
                    <button
                      onClick={() => handleRequeue(task.id)}
                      className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold rounded text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      Re-enfileirar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
