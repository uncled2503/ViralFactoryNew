/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Film,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  AlertCircle,
  RefreshCw,
  Cpu,
  Terminal,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sliders,
  Sparkles,
  Database,
  Info,
  Trash2,
  Copy,
  Search
} from 'lucide-react';
import { RenderingTask, Project } from '../types';
import { ConfirmModal } from './ConfirmModal';

export const RenderingsManager: React.FC = () => {
  const { renderingTasks, projects, deleteRenderingTask, duplicateRenderingTask } = useApp();

  // Confirm delete states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Debugger states
  const [selectedDebugTask, setSelectedDebugTask] = useState<RenderingTask | null>(null);
  const [copied, setCopied] = useState(false);

  // State to track which job's logs are collapsed
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'queued' | 'processing' | 'completed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'projectName' | 'progress'>('newest');

  const filteredTasks = renderingTasks
    .filter(t => 
      (t.projectName.toLowerCase().includes(searchQuery.toLowerCase()) || 
       t.id.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'all' || t.status === statusFilter)
    )
    .sort((a, b) => {
      if (sortBy === 'projectName') {
        return a.projectName.localeCompare(b.projectName);
      }
      if (sortBy === 'progress') {
        return b.progress - a.progress;
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

  // Trigger default expanded for active renders
  useEffect(() => {
    const processingTask = renderingTasks.find(t => t.status === 'processing');
    if (processingTask) {
      setExpandedLogs(prev => {
        if (prev[processingTask.id]) return prev;
        return { ...prev, [processingTask.id]: true };
      });
    }
  }, [renderingTasks]);

  const toggleLog = (id: string) => {
    setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Compiler to translate project parameters into an actual executable FFmpeg command string
  const getFFmpegCommand = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return 'ffmpeg -i input_background.mp4 -vf "scale=720:1280" -c:v libx264 output.mp4';
    
    const vars = project.variables;
    const inputs: string[] = [];
    const filters: string[] = [];
    
    // 1. Video/Image background layer
    if (vars.backgroundVideoUrl) {
      inputs.push(`-i "background_feed.mp4"`);
    } else if (vars.backgroundImageUrl) {
      inputs.push(`-loop 1 -i "background_frame.webp"`);
    } else {
      inputs.push(`-f lavfi -i color=c=black:s=720x1280:d=30`);
    }
    
    // 2. Audio layer
    if (vars.audioUrl) {
      inputs.push(`-i "synthesized_voice.mp3"`);
    }
    // 3. Brand logo overlay
    if (vars.logoUrl) {
      inputs.push(`-i "brand_logo.png"`);
    }
    
    // Video dimensions & overlay filters
    let vf = 'scale=720:1280';
    
    // Add text layers if present
    if (vars.title) {
      const escapedTitle = vars.title.replace(/'/g, "'\\''");
      const color = vars.brandColor || '#ffffff';
      const font = vars.fontName || 'Inter';
      vf += `,drawtext=text='${escapedTitle}':font='${font}':fontsize=48:fontcolor=${color}:x=(w-text_w)/2:y=(h-text_h)/3`;
    }
    
    if (vars.subtitles && vars.subtitles.length > 0) {
      const escapedSub = vars.subtitles[0].replace(/'/g, "'\\''");
      vf += `,drawtext=text='${escapedSub}':font='Inter':fontsize=36:fontcolor=yellow:x=(w-text_w)/2:y=(h-text_h)/1.5`;
    }
    
    filters.push(`-vf "${vf}"`);
    const audioMap = vars.audioUrl ? '-map 0:v:0 -map 1:a:0 -c:a aac -shortest' : '-c:a copy';
    
    return `ffmpeg -y ${inputs.join(' ')} ${filters.join(' ')} ${audioMap} -c:v libx264 -preset fast -crf 22 output_${project.id}.mp4`;
  };

  // Helper to generate dynamic, user-friendly system process logs
  const getCompileLogs = (task: RenderingTask) => {
    if (task.logs && task.logs.length > 0) {
      return task.logs;
    }
    const timeStr = new Date(task.createdAt).toLocaleTimeString('pt-BR');

    if (task.status === 'queued') {
      return [
        `[${timeStr}] [Sistema] Tarefa de geração de vídeo registrada com sucesso (ID: ${task.id})`,
        `[${timeStr}] [Layout] Analisando camadas de legenda e metadados de mídia do projeto...`,
        `[${timeStr}] [Fila] Aguardando alocação na fila de processamento automático...`,
        `[${timeStr}] [Status] Sincronização em tempo real ativa.`
      ];
    }

    if (task.status === 'processing') {
      const p = task.progress;
      return [
        `[Sistema] Iniciando a composição visual das cenas (ID: ${task.id})`,
        `[Processando] Aplicando legendagem automática e sincronização de áudio...`,
        `[Mídia] Codificando trilha sonora e backgrounds na proporção selecionada`,
        `[Status] Progresso atual: ${p}% concluído.`
      ];
    }

    if (task.status === 'completed') {
      const completedTime = task.completedAt ? new Date(task.completedAt).toLocaleTimeString('pt-BR') : 'Recent';
      return [
        `[Sistema] Processamento do vídeo finalizado com sucesso.`,
        `[Mídia] Arquivo gerado mapeado para sua pasta de armazenamento de mídias.`,
        `[${completedTime}] [Status] Vídeo finalizado disponível para download.`
      ];
    }

    return [
      `[Erro] Falha no processamento do vídeo.`,
      `[Status] Verifique se as mídias selecionadas e fontes estão disponíveis.`
    ];
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatMs = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    return (ms / 1000).toFixed(2) + 's';
  };

  const getStatusBadge = (status: RenderingTask['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3 h-3" /> CONCLUÍDO
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/20 text-indigo-400 text-[9px] font-mono font-bold flex items-center gap-1.5 animate-pulse shadow-sm">
            <RefreshCw className="w-3 h-3 animate-spin" /> CODIFICANDO
          </span>
        );
      case 'queued':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-yellow-950/40 border border-yellow-500/15 text-yellow-400 text-[9px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3 h-3 animate-pulse" /> EM FILA
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-500/20 text-red-400 text-[9px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
            <XCircle className="w-3 h-3" /> FALHOU
          </span>
        );
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header section with active action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-400" />
            <span>Fila de Geração de Vídeos</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Acompanhe o andamento da criação, legendagem e exportação dos seus vídeos em lote.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-gray-900 bg-gray-950/30">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Pesquisar por projeto ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-300 outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-300 outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="all">Todos Status</option>
            <option value="queued">Em Fila</option>
            <option value="processing">Codificando</option>
            <option value="completed">Concluídos</option>
            <option value="failed">Falhas</option>
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-300 outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="newest">Mais Recentes</option>
            <option value="projectName">Nome do Projeto</option>
            <option value="progress">Progresso</option>
          </select>
        </div>
      </div>

      {/* Render History grid container */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {filteredTasks.length === 0 ? (
          <motion.div
            variants={rowVariants}
            className="col-span-full glass-panel rounded-2xl p-16 text-center border border-gray-900"
          >
            <Film className="w-12 h-12 text-gray-700 mx-auto mb-4 animate-pulse" />
            <h3 className="text-sm font-semibold text-gray-300">Nenhum pipeline correspondente</h3>
            <p className="text-xs text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Tente alterar os termos da busca ou os filtros de status selecionados.
            </p>
          </motion.div>
        ) : (
          filteredTasks.map((task) => {
            const isLogOpen = !!expandedLogs[task.id];
            const hasThumbnail = !!task.thumbnailUrl;
            const hasVideoFallback = task.status === 'completed' && !!task.outputUrl;

            return (
              <motion.div
                key={task.id}
                variants={rowVariants}
                className="col-span-1 bg-gray-950 border border-gray-900/80 rounded-2xl overflow-hidden transition-all duration-300 hover:border-gray-800 flex flex-col"
              >
                {/* 9:16 Preview */}
                <div className="relative w-full aspect-[9/16] bg-gray-900 overflow-hidden">
                  {hasThumbnail ? (
                    <img
                      src={task.thumbnailUrl}
                      alt={task.projectName}
                      className="w-full h-full object-cover"
                    />
                  ) : hasVideoFallback ? (
                    <video
                      src={task.outputUrl}
                      muted
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {task.status === 'processing' ? (
                        <RefreshCw className="w-8 h-8 text-gray-700 animate-spin" />
                      ) : task.status === 'failed' ? (
                        <XCircle className="w-8 h-8 text-red-900" />
                      ) : (
                        <Film className="w-8 h-8 text-gray-700" />
                      )}
                    </div>
                  )}

                  {/* Status + progress overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 pt-6 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      {getStatusBadge(task.status)}
                      {task.status === 'processing' && (
                        <span className="text-[10px] font-mono font-bold text-indigo-300">{task.progress}%</span>
                      )}
                    </div>
                    {task.status === 'processing' ? (
                      <div className="w-full bg-black/50 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    ) : task.status === 'queued' ? (
                      <div className="w-full bg-black/50 h-1 rounded-full overflow-hidden">
                        <div className="bg-yellow-500/40 h-full rounded-full w-1/12 animate-pulse" />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Compact info block */}
                <div className="p-3 min-w-0">
                  <h3 className="font-bold text-gray-200 truncate text-xs">{task.projectName}</h3>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">{task.templateName}</p>
                  <p className="text-[9px] text-gray-600 font-mono mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.duration}
                    {task.status === 'completed' && task.renderTime && (
                      <span className="text-indigo-500">· {task.renderTime}</span>
                    )}
                  </p>
                </div>

                {/* Actions footer */}
                <div className="mt-auto p-2.5 pt-0 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleLog(task.id)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        isLogOpen
                          ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400'
                          : 'bg-gray-950 border-gray-900 hover:border-gray-850 text-gray-500 hover:text-gray-200'
                      }`}
                      title="Console Logs"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedDebugTask(task)}
                      className="p-1.5 rounded-lg bg-gray-950 border border-gray-900 hover:border-indigo-500/40 hover:text-indigo-400 text-gray-500 transition cursor-pointer"
                      title="Ver Log de Telemetria e FFmpeg"
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => duplicateRenderingTask(task.id)}
                      className="p-1.5 rounded-lg bg-gray-950 border border-gray-900 hover:border-gray-800 text-gray-500 hover:text-gray-200 transition cursor-pointer"
                      title="Duplicar Renderização"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setTaskToDelete(task.id);
                        setIsConfirmOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-gray-950 border border-gray-900 hover:border-red-950 hover:text-red-400 text-gray-600 transition cursor-pointer"
                      title="Excluir Renderização"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {task.status === 'completed' && task.outputUrl ? (
                    <a
                      href={`${task.outputUrl}${task.outputUrl.includes('?') ? '&' : '?'}download=${encodeURIComponent(task.projectName || 'video')}.mp4`}
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/10 flex items-center justify-center transition cursor-pointer"
                      title="Baixar Vídeo Codificado"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="p-1.5 rounded-lg bg-gray-900 text-gray-700 border border-gray-850 cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Collapsible Console Log Terminal Container */}
                <AnimatePresence initial={false}>
                  {isLogOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-black"
                    >
                      <div className="p-3 font-mono text-[9px] text-gray-400 space-y-1.5 border-t border-gray-900 max-h-48 overflow-y-auto">
                        <div className="flex justify-between text-gray-600 text-[8px] uppercase font-bold tracking-widest mb-1 pb-1 border-b border-gray-950">
                          <span>LOGS</span>
                        </div>
                        {getCompileLogs(task).map((line, idx) => (
                          <div key={idx} className="flex gap-1.5 font-mono leading-relaxed">
                            <span className="text-indigo-900 shrink-0 select-none">❯</span>
                            <span className={line.includes('[Error]') || line.includes('error') ? 'text-red-400' : line.startsWith('  ') ? 'text-amber-400 font-bold font-mono break-all bg-gray-900/40 p-1.5 rounded border border-gray-900 mt-1 block w-full' : 'text-gray-500'}>
                              {line}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={() => {
          if (taskToDelete) {
            deleteRenderingTask(taskToDelete);
          }
          setIsConfirmOpen(false);
          setTaskToDelete(null);
        }}
        title="Excluir Registro de Vídeo"
        message="Deseja realmente remover esta tarefa de renderização do histórico de forma permanente?"
        confirmText="Excluir"
      />

      {/* Render Debugger & Telemetry Modal */}
      <AnimatePresence>
        {selectedDebugTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-gray-950 border border-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8"
              style={{ maxHeight: '90vh' }}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-900 flex items-center justify-between bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <div>
                    <h2 className="text-sm font-bold text-gray-200">Render Debugger & Telemetria</h2>
                    <p className="text-[10px] text-gray-500 font-mono">Job ID: {selectedDebugTask.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedDebugTask(null);
                    setCopied(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-900 text-gray-400 hover:text-gray-200 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content Scrollable Area */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* 1. Bento Grid of Telemetry & FFmpeg Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-900">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Status Final</span>
                    {getStatusBadge(selectedDebugTask.status)}
                  </div>
                  
                  <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-900">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Tempo Total</span>
                    <span className="text-xs font-mono font-bold text-gray-300">{selectedDebugTask.renderTime || 'N/A'}</span>
                  </div>

                  <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-900">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Encoding FFmpeg</span>
                    <span className="text-xs font-mono font-bold text-gray-300">
                      {formatMs(selectedDebugTask.debugInfo?.encodingTimeMs)}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-900">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Tamanho de Saída</span>
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {formatBytes(selectedDebugTask.debugInfo?.fileSize)}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-900">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Resolução</span>
                    <span className="text-xs font-mono font-bold text-gray-300">
                      {selectedDebugTask.debugInfo?.resolution || 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-900">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Taxa de Bits (Bitrate)</span>
                    <span className="text-xs font-mono font-bold text-gray-300">
                      {selectedDebugTask.debugInfo?.bitrate || 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-900">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Codec Codificado</span>
                    <span className="text-xs font-mono font-bold text-gray-300">
                      {selectedDebugTask.debugInfo?.codec || 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-900/40 rounded-xl border border-gray-900">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Frames Por Segundo</span>
                    <span className="text-xs font-mono font-bold text-gray-300">
                      {selectedDebugTask.debugInfo?.fps !== undefined ? `${selectedDebugTask.debugInfo.fps} FPS` : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* 2. FFmpeg command string section with copy button */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Comando FFmpeg Executado</span>
                    </h3>
                    <button
                      onClick={() => {
                        const cmd = selectedDebugTask.debugInfo?.command || getFFmpegCommand(selectedDebugTask.projectId);
                        navigator.clipboard.writeText(cmd);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-400 hover:text-gray-200 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <div className="p-4 bg-black rounded-xl border border-gray-900 font-mono text-xs text-indigo-300 overflow-x-auto break-all max-h-40 leading-relaxed whitespace-pre-wrap select-all">
                    {selectedDebugTask.debugInfo?.command || getFFmpegCommand(selectedDebugTask.projectId)}
                  </div>
                </div>

                {/* 3. Stderr output terminal log */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-red-400" />
                    <span>Saída Detalhada stderr (FFmpeg Output Log)</span>
                  </h3>
                  <div className="p-4 bg-black rounded-xl border border-gray-900 font-mono text-[11px] text-gray-400 overflow-y-auto max-h-60 space-y-1 select-text scrollbar-thin">
                    {selectedDebugTask.debugInfo?.stderr ? (
                      selectedDebugTask.debugInfo.stderr.split('\n').map((line: string, idx: number) => {
                        let colorClass = 'text-gray-400';
                        if (line.includes('Error') || line.includes('Failed') || line.includes('Fatal') || line.includes('Can\'t') || line.includes('Invalid')) {
                          colorClass = 'text-red-400 font-semibold';
                        } else if (line.includes('warning') || line.includes('Warning')) {
                          colorClass = 'text-amber-400';
                        } else if (line.startsWith('frame=')) {
                          colorClass = 'text-indigo-400';
                        }
                        return (
                          <div key={idx} className={`${colorClass} leading-relaxed font-mono whitespace-pre-wrap`}>
                            {line}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-600 italic font-mono">Nenhuma mensagem registrada na saída padrão de erro do FFmpeg.</div>
                    )}
                  </div>
                </div>

                {/* 4. Stdout output log */}
                {selectedDebugTask.debugInfo?.stdout && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saída Padrão stdout</span>
                    </h3>
                    <div className="p-4 bg-black rounded-xl border border-gray-900 font-mono text-[11px] text-gray-400 overflow-y-auto max-h-32 select-text scrollbar-thin whitespace-pre-wrap">
                      {selectedDebugTask.debugInfo.stdout}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-900 bg-gray-950 flex justify-end sticky bottom-0 z-10">
                <button
                  onClick={() => {
                    setSelectedDebugTask(null);
                    setCopied(false);
                  }}
                  className="px-4 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs text-gray-300 font-bold rounded-xl transition cursor-pointer"
                >
                  Fechar Diagnóstico
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
