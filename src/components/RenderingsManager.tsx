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

      {/* Render History list container */}
      <motion.div 
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {filteredTasks.length === 0 ? (
          <motion.div 
            variants={rowVariants}
            className="glass-panel rounded-2xl p-16 text-center border border-gray-900"
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
            return (
              <motion.div
                key={task.id}
                variants={rowVariants}
                className="bg-gray-950 border border-gray-900/80 rounded-2xl overflow-hidden transition-all duration-300 hover:border-gray-800"
              >
                {/* Job Info Layout Grid */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  
                  {/* Title & Date */}
                  <div className="md:col-span-4 min-w-0">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">JOB ID: {task.id}</span>
                    <h3 className="font-bold text-gray-200 truncate mt-0.5 text-sm">{task.projectName}</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-600" />
                      Iniciado: {new Date(task.createdAt).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>

                  {/* Template Details */}
                  <div className="md:col-span-3">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Template Utilizado</span>
                    <span className="text-xs text-gray-300 truncate mt-0.5 block font-semibold">{task.templateName}</span>
                    <span className="text-[9px] font-mono text-gray-500 block mt-1">Duração: {task.duration}</span>
                  </div>

                  {/* Status & Live Progress */}
                  <div className="md:col-span-3">
                    <div className="flex justify-between items-center mb-1.5">
                      {getStatusBadge(task.status)}
                      {task.status === 'processing' && (
                        <span className="text-[10px] font-mono font-bold text-indigo-400">{task.progress}%</span>
                      )}
                    </div>

                    {/* Progress slider bar */}
                    {task.status === 'processing' ? (
                      <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden border border-gray-850">
                        <div
                          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    ) : task.status === 'completed' ? (
                      <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden border border-gray-850">
                        <div className="bg-emerald-500 h-full rounded-full w-full" />
                      </div>
                    ) : task.status === 'queued' ? (
                      <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden border border-gray-850">
                        <div className="bg-yellow-500/20 h-full rounded-full w-1/12 animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden border border-gray-850">
                        <div className="bg-red-500 h-full rounded-full w-full" />
                      </div>
                    )}
                  </div>

                  {/* Output Controls & Actions */}
                  <div className="md:col-span-2 flex items-center justify-end gap-2.5 self-stretch md:self-auto border-t md:border-t-0 border-gray-900 pt-3 md:pt-0">
                    <button
                      onClick={() => toggleLog(task.id)}
                      className={`p-2 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
                        isLogOpen 
                          ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400' 
                          : 'bg-gray-950 border-gray-900 hover:border-gray-850 text-gray-400 hover:text-gray-200'
                      }`}
                      title="Console Logs"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>LOGS</span>
                    </button>

                    <button
                      onClick={() => duplicateRenderingTask(task.id)}
                      className="p-2.5 rounded-xl bg-gray-950 border border-gray-900 hover:border-gray-800 text-gray-400 hover:text-gray-200 transition cursor-pointer"
                      title="Duplicar Renderização"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setTaskToDelete(task.id);
                        setIsConfirmOpen(true);
                      }}
                      className="p-2.5 rounded-xl bg-gray-950 border border-gray-900 hover:border-red-950 hover:text-red-400 text-gray-500 transition cursor-pointer"
                      title="Excluir Renderização"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {task.status === 'completed' && task.outputUrl ? (
                      <a
                        href={task.outputUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/10 flex items-center justify-center transition cursor-pointer"
                        title="Baixar Vídeo Codificado (ZIP)"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        disabled
                        className="p-2.5 rounded-xl bg-gray-900 text-gray-700 border border-gray-850 cursor-not-allowed"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>

                {/* Honest Pipeline metadata displayed if processing or completed */}
                <div className="px-5 py-2.5 bg-gray-950 border-t border-b border-gray-900/60 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono text-gray-500">
                  <span>ID do Projeto: <strong className="text-gray-400">{task.projectId}</strong></span>
                  <span>Duração: <strong className="text-gray-400">{task.duration}</strong></span>
                  <span>Formato: <strong className="text-gray-400">MP4 (H.264)</strong></span>
                  <span>Tempo Processado: <strong className="text-indigo-400">{task.renderTime || 'Calculando...'}</strong></span>
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
                      <div className="p-5 font-mono text-[10px] text-gray-400 space-y-1.5 border-t border-gray-900">
                        <div className="flex justify-between text-gray-600 text-[9px] uppercase font-bold tracking-widest mb-1 pb-1 border-b border-gray-950">
                          <span>LOGS DE COMPOSIÇÃO E EXPORTAÇÃO</span>
                          <span>Status do Processamento</span>
                        </div>
                        {getCompileLogs(task).map((line, idx) => (
                          <div key={idx} className="flex gap-2 font-mono leading-relaxed">
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
    </div>
  );
};
