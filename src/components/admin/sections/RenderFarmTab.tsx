/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { adminFetch } from '../../../utils/api';
import { 
  Cpu, 
  RefreshCw, 
  AlertTriangle, 
  Server, 
  Zap, 
  CheckCircle, 
  Activity, 
  HardDrive, 
  Terminal, 
  Clock, 
  Globe, 
  Wifi, 
  Monitor,
  Sliders,
  Play,
  Trash2,
  Settings,
  ChevronRight,
  ListOrdered
} from 'lucide-react';
import { RenderingTask, RenderWorker } from '../../../types';

interface RenderFarmTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const RenderFarmTab: React.FC<RenderFarmTabProps> = ({ showToast }) => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  // Auto Scaling states
  const [autoScaleData, setAutoScaleData] = useState<{
    current: any;
    history: any[];
    logs: any[];
    config?: any;
  } | null>(null);

  const [scalingConfig, setScalingConfig] = useState({
    enabled: true,
    minWorkers: 1,
    maxWorkers: 8,
    scaleUpThreshold: 2,
    scaleDownThreshold: 0,
    cooldownPeriod: 15
  });

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isScalingUp, setIsScalingUp] = useState(false);
  const [isScalingDown, setIsScalingDown] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const fetchData = async () => {
    try {
      const wRes = await adminFetch('/api/admin/workers');
      if (wRes.ok) {
        setWorkers(await wRes.json());
      }
      const jRes = await adminFetch('/api/admin/jobs');
      if (jRes.ok) {
        setJobs(await jRes.json());
      }
      
      const asRes = await adminFetch('/api/admin/autoscaling');
      if (asRes.ok) {
        const data = await asRes.json();
        setAutoScaleData(data);
      }
    } catch (err) {
      console.warn('Failed to load render farm status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll telemetry stats every 4 seconds for super live updates
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update scaling config state once fetched from backend
  useEffect(() => {
    if (autoScaleData?.config) {
      setScalingConfig({
        enabled: autoScaleData.config.enabled ?? true,
        minWorkers: autoScaleData.config.minWorkers ?? 1,
        maxWorkers: autoScaleData.config.maxWorkers ?? 8,
        scaleUpThreshold: autoScaleData.config.scaleUpThreshold ?? 2,
        scaleDownThreshold: autoScaleData.config.scaleDownThreshold ?? 0,
        cooldownPeriod: autoScaleData.config.cooldownPeriod ?? 15
      });
    }
  }, [autoScaleData?.config]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await adminFetch('/api/admin/autoscaling/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scalingConfig)
      });
      if (res.ok) {
        showToast("Configuração do Cluster Elástico salva com sucesso!", "success");
        fetchData();
      } else {
        throw new Error("Erro de processamento da requisição.");
      }
    } catch (err: any) {
      showToast(`Erro ao salvar: ${err.message}`, "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleManualScaleUp = async () => {
    setIsScalingUp(true);
    showToast("Provisionando novo nó elástico no cluster...", "info");
    try {
      const res = await adminFetch('/api/admin/autoscaling/scale-up', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, "success");
        fetchData();
      } else {
        showToast(data.message || "Falha ao provisionar worker elástico.", "error");
      }
    } catch (err: any) {
      showToast(`Erro no Scale Up: ${err.message}`, "error");
    } finally {
      setIsScalingUp(false);
    }
  };

  const handleManualScaleDown = async () => {
    setIsScalingDown(true);
    showToast("Localizando nó ocioso para desprovisionar...", "info");
    try {
      const res = await adminFetch('/api/admin/autoscaling/scale-down', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, "success");
        fetchData();
      } else {
        showToast(data.message || "Nenhum nó elástico elegível para remoção.", "error");
      }
    } catch (err: any) {
      showToast(`Erro no Scale Down: ${err.message}`, "error");
    } finally {
      setIsScalingDown(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Deseja realmente limpar o histórico de métricas e logs de auto scaling?")) return;
    setIsClearing(true);
    try {
      const res = await adminFetch('/api/admin/autoscaling/clear', {
        method: 'POST'
      });
      if (res.ok) {
        showToast("Histórico limpo com sucesso.", "success");
        fetchData();
      }
    } catch (err: any) {
      showToast(`Erro ao limpar: ${err.message}`, "error");
    } finally {
      setIsClearing(false);
    }
  };

  const handleTestEngine = async () => {
    setIsTesting(true);
    showToast("Iniciando validação do motor FFmpeg em tempo real...", "info");
    try {
      const response = await adminFetch('/api/admin/test-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'usr-admin-test' })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast("Motor validado com sucesso! Clipe renderizado e verificado no S3/Storage.", "success");
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

  const formatUptime = (seconds?: number) => {
    if (seconds === undefined) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${remMinutes}m`;
  };

  // SVG Chart Renderer
  const renderHistoryChart = () => {
    const history = autoScaleData?.history || [];
    if (history.length < 2) {
      return (
        <div className="h-44 flex items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
          <p className="text-[10px] text-slate-500 font-mono">Aguardando mais pontos de telemetria para plotar o histórico...</p>
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = 20;

    // Find max values
    const maxQueue = Math.max(...history.map(h => h.queueSize), 5);
    const maxWorkers = Math.max(...history.map(h => h.activeWorkers), 5);
    const maxCpu = 100;

    const pointsCount = history.length;

    const getX = (index: number) => {
      return padding + (index / (pointsCount - 1)) * (width - padding * 2);
    };

    // Scaled Y coords (inverted since SVG 0,0 is top-left)
    const getYQueue = (val: number) => {
      return height - padding - (val / maxQueue) * (height - padding * 2);
    };

    const getYWorkers = (val: number) => {
      return height - padding - (val / maxWorkers) * (height - padding * 2);
    };

    const getYCpu = (val: number) => {
      return height - padding - (val / maxCpu) * (height - padding * 2);
    };

    // Build SVG paths
    let queuePath = '';
    let workersPath = '';
    let cpuPath = '';

    history.forEach((h, idx) => {
      const x = getX(idx);
      const yQ = getYQueue(h.queueSize);
      const yW = getYWorkers(h.activeWorkers);
      const yC = getYCpu(h.averageCpu);

      if (idx === 0) {
        queuePath = `M ${x} ${yQ}`;
        workersPath = `M ${x} ${yW}`;
        cpuPath = `M ${x} ${yC}`;
      } else {
        queuePath += ` L ${x} ${yQ}`;
        workersPath += ` L ${x} ${yW}`;
        cpuPath += ` L ${x} ${yC}`;
      }
    });

    return (
      <div className="space-y-3">
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 bg-slate-950/50 rounded-xl border border-slate-900/80 p-1">
            {/* Grid Lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1e293b" strokeDasharray="3,3" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1e293b" strokeDasharray="3,3" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" />

            {/* Path lines */}
            <path d={cpuPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={workersPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={queuePath} fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Labels */}
            <text x={padding + 5} y={padding + 12} fill="#64748b" className="text-[9px] font-mono">MAX</text>
            <text x={padding + 5} y={height - padding - 4} fill="#64748b" className="text-[9px] font-mono">0</text>
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-[9px] font-mono text-slate-400 border-t border-slate-900/60 pt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 block" />
            <span>Fila de Jobs (Max: {maxQueue})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block" />
            <span>Nós Ativos (Max: {maxWorkers})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
            <span>Carga CPU Média (%)</span>
          </div>
        </div>
      </div>
    );
  };

  // Cluster totals and metrics
  const totalCores = workers.reduce((acc, w) => acc + (w.cores || 0), 0);
  const totalRam = workers.reduce((acc, w) => acc + (w.totalRam || 0), 0);
  const activeWorkersCount = workers.length;
  const busyWorkersCount = workers.filter(w => w.status === 'busy').length;
  const queuedJobsCount = jobs.filter(j => j.status === 'queued' || j.status === 'preparing' || j.status === 'Queued').length;

  if (loading && workers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Iniciando painel do cluster elástico de auto scaling...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-pink-500 animate-pulse" /> Cluster Elástico & Auto Scaling
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono border ${
              scalingConfig.enabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}>
              {scalingConfig.enabled ? 'Auto Scaling Ativo' : 'Manual'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Nós de computação elásticos que sobem e descem conforme a fila e o uso do cluster. Prioridades integradas.
          </p>
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
            <RefreshCw className="w-4 h-4 animate-spin-hover" />
          </button>
        </div>
      </div>

      {/* Cluster Overview Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Workers do Cluster</p>
            <h4 className="text-xl font-black text-white">
              {activeWorkersCount} 
              <span className="text-xs font-normal text-slate-400 ml-1.5">({busyWorkersCount} ocupados)</span>
            </h4>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Processadores do Cluster</p>
            <h4 className="text-xl font-black text-white">{totalCores} <span className="text-xs font-normal text-slate-400">Núcleos vCPUs</span></h4>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">RAM Agregada Cluster</p>
            <h4 className="text-xl font-black text-white">{totalRam} <span className="text-xs font-normal text-slate-400">GB RAM</span></h4>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Fila Pendente</p>
            <h4 className="text-xl font-black text-white">
              {queuedJobsCount} 
              <span className="text-xs font-normal text-slate-400 ml-1.5">aguardando</span>
            </h4>
          </div>
        </div>
      </div>

      {/* Auto Scaling Core Console: Configuration, Manual Controls & SVG Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Elastic Configuration Sliders Column */}
        <div className="lg:col-span-4 bg-slate-950/40 border border-slate-900 p-5 rounded-2xl space-y-5 shadow-md">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-pink-500" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Parâmetros de Auto Scaling</h3>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            {/* Toggle Enabled */}
            <div className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-900 rounded-xl">
              <span className="font-sans font-bold text-slate-300">Habilitar Auto Scaling</span>
              <button
                type="button"
                onClick={() => setScalingConfig({ ...scalingConfig, enabled: !scalingConfig.enabled })}
                className={`w-11 h-6 rounded-full p-1 transition-colors ${
                  scalingConfig.enabled ? 'bg-pink-600' : 'bg-slate-800'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${
                  scalingConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Minimum Workers & Maximum Workers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Mín Workers</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={scalingConfig.minWorkers}
                  onChange={(e) => setScalingConfig({ ...scalingConfig, minWorkers: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg p-2.5 font-bold font-mono focus:border-pink-600 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Máx Workers</label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={scalingConfig.maxWorkers}
                  onChange={(e) => setScalingConfig({ ...scalingConfig, maxWorkers: parseInt(e.target.value) || 8 })}
                  className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg p-2.5 font-bold font-mono focus:border-pink-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Thresholds */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Gatilho Scale Up</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={scalingConfig.scaleUpThreshold}
                  onChange={(e) => setScalingConfig({ ...scalingConfig, scaleUpThreshold: parseInt(e.target.value) || 2 })}
                  className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg p-2.5 font-bold font-mono focus:border-pink-600 focus:outline-none"
                  title="Quantidade de jobs na fila para acionar novos workers"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Gatilho Scale Down</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={scalingConfig.scaleDownThreshold}
                  onChange={(e) => setScalingConfig({ ...scalingConfig, scaleDownThreshold: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg p-2.5 font-bold font-mono focus:border-pink-600 focus:outline-none"
                  title="Quantidade de jobs na fila para reduzir workers ociosos"
                />
              </div>
            </div>

            {/* Cooldown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Período de Cooldown (segundos)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={scalingConfig.cooldownPeriod}
                onChange={(e) => setScalingConfig({ ...scalingConfig, cooldownPeriod: parseInt(e.target.value) || 15 })}
                className="w-full bg-slate-950 border border-slate-900 text-white rounded-lg p-2.5 font-bold font-mono focus:border-pink-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingConfig}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Settings className="w-4 h-4" />
              {isSavingConfig ? "Salvando..." : "Salvar Configuração"}
            </button>
          </form>

          {/* Manual Scaler Overrides */}
          <div className="pt-4 border-t border-slate-900 space-y-2">
            <p className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Ações de Forçamento Manual</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleManualScaleUp}
                disabled={isScalingUp}
                className="py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer"
              >
                + Forçar Scale Up
              </button>
              <button
                onClick={handleManualScaleDown}
                disabled={isScalingDown}
                className="py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer"
              >
                - Forçar Scale Down
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Charts / Monitoring Center */}
        <div className="lg:col-span-8 bg-slate-950/40 border border-slate-900 p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-pink-500 animate-pulse" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Monitor de Cluster Elástico (Gráficos)</h3>
            </div>
            <button
              onClick={handleClearHistory}
              disabled={isClearing}
              className="text-[9px] font-mono text-slate-500 hover:text-slate-300 transition flex items-center gap-1 cursor-pointer bg-slate-900/30 p-1 px-2 rounded-lg border border-slate-900"
            >
              <Trash2 className="w-3 h-3" /> Limpar Histórico
            </button>
          </div>

          {renderHistoryChart()}

          {/* Current aggregates telemetry footer */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-2 border-t border-slate-900/50">
            <div className="p-2 bg-slate-900/20 rounded-xl">
              <p className="text-[9px] text-slate-500 uppercase">Uso Médio CPU</p>
              <h5 className="text-base font-black text-amber-500 mt-1">
                {autoScaleData?.current?.averageCpu ?? 0}%
              </h5>
            </div>
            <div className="p-2 bg-slate-900/20 rounded-xl">
              <p className="text-[9px] text-slate-500 uppercase">Uso Médio RAM</p>
              <h5 className="text-base font-black text-indigo-400 mt-1">
                {autoScaleData?.current?.averageRam ?? 0}%
              </h5>
            </div>
            <div className="p-2 bg-slate-900/20 rounded-xl">
              <p className="text-[9px] text-slate-500 uppercase">Tempo Médio Render</p>
              <h5 className="text-base font-black text-pink-500 mt-1">
                {autoScaleData?.current?.averageRenderTime ?? 15}s
              </h5>
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid: Active Compute Nodes & Priority Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Nodes Left Column */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-pink-500" /> Nós de Computação Ativos
          </h3>

          {workers.length === 0 ? (
            <div className="p-8 border border-slate-900 bg-slate-950/20 rounded-2xl text-center space-y-2">
              <Server className="w-8 h-8 text-slate-700 mx-auto animate-bounce" />
              <p className="text-xs font-bold text-slate-400 font-sans">Nenhum Worker Ativo</p>
              <p className="text-[10px] text-slate-500 font-sans max-w-[240px] mx-auto">
                Utilize os controles de Auto Scaling acima para provisionar nós virtuais instantaneamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workers.map((w, idx) => {
                const isBusy = w.status === 'busy';
                const isElastic = w.id.includes('elastic');
                return (
                  <div key={w.id || idx} className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl space-y-3.5 shadow-md hover:border-slate-800 transition">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-white font-mono">{w.id}</h4>
                          <span className={`text-[8px] px-1.5 py-0.2 rounded font-black font-mono uppercase ${
                            isElastic 
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {isElastic ? 'Elástico' : 'Fixo'}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Globe className="w-3 h-3 text-slate-600" /> {w.ip || '127.0.0.1'} • {w.os || 'Linux'}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isBusy 
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {isBusy ? 'Processando' : 'Disponível'}
                      </span>
                    </div>

                    {/* Progress sliders */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-0.5">
                          <span>CPU Load</span>
                          <span className="font-bold text-white">{w.cpuUsage || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              (w.cpuUsage || 0) > 85 ? 'bg-red-500' : (w.cpuUsage || 0) > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} 
                            style={{ width: `${w.cpuUsage || 0}%` }} 
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-0.5">
                          <span>RAM Usage ({w.totalRam || 4}GB)</span>
                          <span className="font-bold text-white">{w.memoryUsage || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-900">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              (w.memoryUsage || 0) > 85 ? 'bg-red-500' : (w.memoryUsage || 0) > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} 
                            style={{ width: `${w.memoryUsage || 0}%` }} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Specs info */}
                    <div className="pt-2 border-t border-slate-900/60 flex justify-between text-[9px] font-mono text-slate-500">
                      <span>Cores: <span className="text-slate-300 font-bold">{w.cores || 1} vCPUs</span></span>
                      <span>Uptime: <span className="text-slate-300 font-bold">{formatUptime(w.uptimeSeconds)}</span></span>
                    </div>

                    {/* Busy tag */}
                    {isBusy && w.currentJobId && (
                      <div className="p-1.5 bg-slate-900/60 border border-slate-900 rounded-lg flex items-center justify-between text-[8px] font-mono">
                        <span className="text-amber-500 font-bold uppercase animate-pulse">Ativo em:</span>
                        <span className="text-slate-300 truncate max-w-[130px] font-bold">{w.currentJobId}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Priorities & Jobs Queue Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Queued Jobs Column */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-pink-500" /> Fila de Trabalhos & Prioridades
            </h3>

            <div className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden shadow-md">
              {jobs.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Activity className="w-8 h-8 text-slate-800 mx-auto" />
                  <p className="text-xs font-semibold text-slate-400 font-sans">Sem trabalhos na fila</p>
                  <p className="text-[10px] text-slate-500 font-sans max-w-[260px] mx-auto">
                    Os render-jobs ordenados por nível de prioridade aparecerão e serão processados aqui.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-950/80 text-slate-500 font-mono font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 px-4">Job ID</th>
                      <th className="py-2.5 px-4">Prioridade</th>
                      <th className="py-2.5 px-4">Progresso</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/30 font-mono text-[10px] text-slate-300">
                    {jobs.map((job, idx) => {
                      const isFailed = job.status?.toLowerCase() === 'failed';
                      const isCompleted = job.status?.toLowerCase() === 'completed';
                      
                      // Map priority from backend structure
                      const priority = job.priority || (idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low');

                      return (
                        <tr key={job.id || idx} className="hover:bg-slate-900/10 transition">
                          <td className="py-3 px-4 font-bold text-white max-w-[120px] truncate">{job.id}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              priority === 'high'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : priority === 'medium'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}>
                              {priority === 'high' ? 'Alta (Business)' : priority === 'medium' ? 'Média (Pro)' : 'Baixa (Starter)'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900/80">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isFailed ? 'bg-red-500' : isCompleted ? 'bg-emerald-500' : 'bg-pink-500'
                                  }`} 
                                  style={{ width: `${job.progress || 0}%` }} 
                                />
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold">{job.progress || 0}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : isFailed
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse'
                            }`}>
                              {job.status || 'queued'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Auto Scaling Live Events Log Terminal */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-pink-500" /> Console de Auto Scaling do Coordinator
            </h3>

            <div className="bg-slate-950/80 border border-slate-900 p-4 rounded-2xl h-48 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-2 shadow-inner scrollbar-thin">
              {(!autoScaleData?.logs || autoScaleData.logs.length === 0) ? (
                <div className="h-full flex items-center justify-center text-slate-600 italic">
                  &gt;_ Nenhuma atividade recente do Auto Scaler registrada.
                </div>
              ) : (
                autoScaleData.logs.map((log) => {
                  let badgeColor = 'text-indigo-400 bg-indigo-950/40 border-indigo-900/40';
                  if (log.type === 'SCALE_UP') badgeColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40';
                  if (log.type === 'SCALE_DOWN') badgeColor = 'text-rose-400 bg-rose-950/40 border-rose-900/40';
                  if (log.type === 'ERROR') badgeColor = 'text-red-400 bg-red-950/40 border-red-900/40';

                  return (
                    <div key={log.id} className="flex items-start gap-1.5 pb-1.5 border-b border-slate-900/30 leading-relaxed animate-fade-in">
                      <span className="text-slate-600 select-none text-[8px] pt-0.5">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={`px-1 rounded border text-[8px] font-bold ${badgeColor}`}>{log.type}</span>
                      <span className="text-slate-300 text-[10px]">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
