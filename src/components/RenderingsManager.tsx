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
  Sparkles,
  Database,
  Trash2,
  Copy,
  Search,
  Check,
  X,
  CheckSquare,
  Square,
  DownloadCloud,
  FolderInput
} from 'lucide-react';
import { RenderingTask, Project } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { EmptyState } from './ui/EmptyState';
import { PageHeader } from './ui/PageHeader';

export const RenderingsManager: React.FC = () => {
  const { renderingTasks, deleteRenderingTask, duplicateRenderingTask, setActiveTab, folders, organizeBatchOutputs, showToast } = useApp();

  // Once a completed render has been swept into a dated/batch folder under "Vídeos
  // Renderizados" (see organizeStaleRenderingsIntoDailyFolders / organizeBatchOutputs in
  // AppContext), it disappears from this flat list — that's the "cleanup" itself. The video
  // is still there, just organized in the Arquivos tab instead of cluttering this queue.
  const organizedOutputUrls = React.useMemo(() => {
    return new Set(
      folders.filter(f => f.parentId === 'fld-rendered').flatMap(f => f.files.map(file => file.url))
    );
  }, [folders]);

  const visibleRenderingTasks = renderingTasks.filter(
    t => !t.outputUrl || !organizedOutputUrls.has(t.outputUrl)
  );

  // Confirm delete states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Debugger states
  const [selectedDebugTask, setSelectedDebugTask] = useState<RenderingTask | null>(null);
  const [copied, setCopied] = useState(false);

  // Video preview modal state
  const [previewTask, setPreviewTask] = useState<RenderingTask | null>(null);

  // Bulk selection & download state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isSendToFolderOpen, setIsSendToFolderOpen] = useState(false);
  const [sendToFolderName, setSendToFolderName] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'queued' | 'processing' | 'completed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'projectName' | 'progress'>('newest');

  const filteredTasks = visibleRenderingTasks
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

  const downloadableTasks = filteredTasks.filter(t => t.status === 'completed' && !!t.outputUrl);

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size === downloadableTasks.length) return new Set();
      return new Set(downloadableTasks.map(t => t.id));
    });
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleBulkDownload = async () => {
    const tasks = downloadableTasks.filter(t => selectedIds.has(t.id));
    if (tasks.length === 0) return;
    setIsBulkDownloading(true);
    try {
      // Browsers block a flood of simultaneous downloads triggered from one click, so we
      // fire them one at a time with a short gap instead of all at once.
      for (const task of tasks) {
        const url = task.outputUrl!;
        const link = document.createElement('a');
        link.href = `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(task.projectName || 'video')}.mp4`;
        link.rel = 'noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await sleep(500);
      }
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => deleteRenderingTask(id));
    showToast(`${selectedIds.size} renderização(ões) excluída(s).`, 'success');
    setSelectedIds(new Set());
    setIsBulkDeleteOpen(false);
    setSelectionMode(false);
  };

  const handleSendSelectedToFolder = () => {
    const tasks = downloadableTasks.filter(t => selectedIds.has(t.id));
    if (tasks.length === 0) return;
    const folderName = sendToFolderName.trim() || `Selecionados ${new Date().toLocaleDateString('pt-BR')}`;
    organizeBatchOutputs(
      [],
      tasks.map(t => ({ name: `${t.projectName || 'video'}.mp4`, url: t.outputUrl! })),
      folderName
    );
    showToast(`${tasks.length} vídeo(s) enviado(s) para a pasta "${folderName}".`, 'success');
    setSelectedIds(new Set());
    setIsSendToFolderOpen(false);
    setSendToFolderName('');
    setSelectionMode(false);
  };


  // Helper to generate dynamic, user-friendly system process logs
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
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <PageHeader
        title="Fila de Geração de Vídeos"
        subtitle="Acompanhe o andamento da criação, legendagem e exportação dos seus vídeos em lote."
      />

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

          {/* Bulk selection toggle */}
          <button
            onClick={() => {
              setSelectionMode(prev => !prev);
              setSelectedIds(new Set());
            }}
            disabled={downloadableTasks.length === 0}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed ${
              selectionMode
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-gray-950 border-gray-900 text-gray-300 hover:border-gray-800'
            }`}
            title="Selecionar vídeos para baixar em massa"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Selecionar
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-indigo-500/20 bg-indigo-950/20">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-indigo-300 hover:text-indigo-200 transition cursor-pointer flex items-center gap-1.5"
                >
                  {selectedIds.size === downloadableTasks.length && downloadableTasks.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  Selecionar Todos ({downloadableTasks.length} concluídos)
                </button>
                <span className="text-[10px] text-gray-500 font-mono">{selectedIds.size} selecionado(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                  className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-gray-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setIsSendToFolderOpen(true)}
                  disabled={selectedIds.size === 0}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  title="Mover os vídeos selecionados para uma pasta em Pastas"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  Mandar para Pasta
                </button>
                <button
                  onClick={() => setIsBulkDeleteOpen(true)}
                  disabled={selectedIds.size === 0}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-red-950/20 border border-gray-800 hover:border-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 hover:text-red-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Selecionados
                </button>
                <button
                  onClick={handleBulkDownload}
                  disabled={selectedIds.size === 0 || isBulkDownloading}
                  className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  {isBulkDownloading ? 'Baixando...' : `Baixar Selecionados (${selectedIds.size})`}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation */}
      <ConfirmModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Excluir Renderizações Selecionadas"
        message={`Tem certeza que deseja excluir ${selectedIds.size} renderização(ões) selecionada(s)? Esta ação é irreversível.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Send Selected to Folder */}
      <AnimatePresence>
        {isSendToFolderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSendToFolderOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-sm bg-gray-950/95 border border-gray-900 rounded-2xl shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <FolderInput className="w-4 h-4 text-indigo-400" /> Mandar para Pasta
                </h3>
                <button onClick={() => setIsSendToFolderOpen(false)} className="text-gray-500 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {selectedIds.size} vídeo(s) selecionado(s) serão movidos para uma subpasta dentro de "Vídeos Renderizados", na aba Pastas.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-mono uppercase font-bold">Nome da Pasta</label>
                <input
                  type="text"
                  autoFocus
                  value={sendToFolderName}
                  onChange={e => setSendToFolderName(e.target.value)}
                  placeholder={`Selecionados ${new Date().toLocaleDateString('pt-BR')}`}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsSendToFolderOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-gray-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendSelectedToFolder}
                  className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Mover
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Render History grid container */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {filteredTasks.length === 0 ? (
          renderingTasks.length === 0 ? (
            <EmptyState
              icon={Film}
              title="Nenhuma renderização ainda"
              description="Crie um projeto e inicie uma renderização para ver o progresso aqui."
              actionLabel="Ir para Projetos"
              onAction={() => setActiveTab('projects')}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Nenhum pipeline correspondente"
              description="Tente alterar os termos da busca ou os filtros de status selecionados."
            />
          )
        ) : (
          filteredTasks.map((task) => {
            const hasThumbnail = !!task.thumbnailUrl;
            const hasVideoFallback = task.status === 'completed' && !!task.outputUrl;

            return (
              <motion.div
                key={task.id}
                variants={rowVariants}
                className="col-span-1 bg-gray-950 border border-gray-900/80 rounded-2xl overflow-hidden transition-all duration-300 hover:border-gray-800 flex flex-col"
              >
                {/* 9:16 Preview */}
                <div
                  className={`relative w-full aspect-[9/16] bg-gray-900 overflow-hidden ${hasVideoFallback && !selectionMode ? 'cursor-pointer group/preview' : ''}`}
                  onClick={() => {
                    if (selectionMode) {
                      if (hasVideoFallback) toggleSelected(task.id);
                      return;
                    }
                    if (hasVideoFallback) setPreviewTask(task);
                  }}
                >
                  {selectionMode && hasVideoFallback && (
                    <div className="absolute top-2 left-2 z-20">
                      {selectedIds.has(task.id) ? (
                        <CheckSquare className="w-5 h-5 text-indigo-400 bg-gray-950/80 rounded" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 bg-gray-950/80 rounded" />
                      )}
                    </div>
                  )}
                  {!selectionMode && hasVideoFallback && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover/preview:bg-black/40 transition opacity-0 group-hover/preview:opacity-100">
                      <Play className="w-10 h-10 text-white drop-shadow-lg" fill="white" />
                    </div>
                  )}
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
                      onClick={() => setSelectedDebugTask(task)}
                      className="p-1.5 rounded-lg bg-gray-950 border border-gray-900 hover:border-indigo-500/40 hover:text-indigo-400 text-gray-500 transition cursor-pointer"
                      title="Ver Log de Telemetria"
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

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewTask && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
            onClick={() => setPreviewTask(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-gray-950 border border-gray-900 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-gray-900 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-200 truncate pr-2">{previewTask.projectName}</h3>
                <button
                  onClick={() => setPreviewTask(null)}
                  className="p-1 rounded-lg hover:bg-gray-900 text-gray-400 hover:text-gray-200 transition cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="aspect-[9/16] bg-black">
                <video
                  src={previewTask.outputUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-3 flex justify-end">
                {previewTask.outputUrl && (
                  <a
                    href={`${previewTask.outputUrl}${previewTask.outputUrl.includes('?') ? '&' : '?'}download=${encodeURIComponent(previewTask.projectName || 'video')}.mp4`}
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                {/* 1. Bento Grid of Telemetry Metadata */}
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
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Tempo de Codificação</span>
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

                {/* 2. High-level processing log (internal command/raw output intentionally not exposed) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Log de Processamento</span>
                  </h3>
                  <div className="p-4 bg-black rounded-xl border border-gray-900 font-mono text-[11px] text-gray-400 overflow-y-auto max-h-60 space-y-1 select-text scrollbar-thin">
                    {selectedDebugTask.logs && selectedDebugTask.logs.length > 0 ? (
                      selectedDebugTask.logs.map((line: string, idx: number) => (
                        <div key={idx} className="leading-relaxed font-mono whitespace-pre-wrap text-gray-400">
                          {line}
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-600 italic font-mono">Nenhum registro disponível para esta tarefa.</div>
                    )}
                    {selectedDebugTask.errorMessage && (
                      <div className="text-red-400 font-semibold leading-relaxed font-mono whitespace-pre-wrap pt-1">
                        {selectedDebugTask.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
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
