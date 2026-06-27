/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Video,
  Layers,
  Film,
  Activity,
  ArrowRight,
  TrendingUp,
  Clock,
  HardDrive,
  Play,
  FileVideo,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AspectRatio } from '../types';

export const DashboardOverview: React.FC = () => {
  const { stats, projects, renderingTasks, setActiveTab, triggerRender, user } = useApp();

  const activeRenders = renderingTasks.filter(t => t.status === 'queued' || t.status === 'processing');
  const recentProjects = projects.slice(0, 3);

  const getAspectBadge = (aspect: AspectRatio) => {
    switch (aspect) {
      case '9:16':
        return 'aspect-[9/16] border-l-2 border-indigo-500';
      case '16:9':
        return 'aspect-[16/9] border-l-2 border-purple-500';
      case '1:1':
        return 'aspect-square border-l-2 border-pink-500';
      default:
        return 'aspect-[9/16]';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl p-8 border border-gray-900/60 bg-gradient-to-r from-gray-950/80 via-indigo-950/10 to-gray-950/60 overflow-hidden">
        {/* Glow behind greeting */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-mono text-indigo-400 font-semibold tracking-widest uppercase">WORK CENTER</span>
            <h1 className="text-2xl font-bold text-gray-100 mt-1 tracking-tight">
              Olá, {user?.name || 'Gabriel Moura'}!
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-xl leading-relaxed">
              Sua fábrica viral está operando perfeitamente. Você tem total acesso às pastas de uploads, logos e templates para criar vídeos curtos em massa.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('projects')}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Novo Projeto</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className="py-2 px-4 bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Explorar Templates</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rendered Videos */}
        <div className="glass-panel rounded-xl p-5 border border-gray-900 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Total Renderizado</p>
            <h3 className="text-2xl font-bold font-mono text-gray-100 mt-1.5">{stats.totalVideosRendered}</h3>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
              <TrendingUp className="w-3 h-3" /> +14% essa semana
            </p>
          </div>
          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/10 text-indigo-400">
            <Film className="w-5 h-5" />
          </div>
        </div>

        {/* Minutes Consumed */}
        <div className="glass-panel rounded-xl p-5 border border-gray-900 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Tempo de Processamento</p>
            <h3 className="text-2xl font-bold font-mono text-gray-100 mt-1.5">{stats.totalRenderingMinutes} min</h3>
            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1 font-mono">
              <Clock className="w-3 h-3" /> Limite renova em 12 dias
            </p>
          </div>
          <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-500/10 text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Templates Count */}
        <div className="glass-panel rounded-xl p-5 border border-gray-900 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Templates Disponíveis</p>
            <h3 className="text-2xl font-bold font-mono text-gray-100 mt-1.5">{stats.activeTemplates}</h3>
            <p className="text-[10px] text-indigo-400 flex items-center gap-1 mt-1 font-mono">
              Pronto para replicação
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/10 text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Render Success Rate */}
        <div className="glass-panel rounded-xl p-5 border border-gray-900 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Taxa de Sucesso</p>
            <h3 className="text-2xl font-bold font-mono text-gray-100 mt-1.5">{stats.renderSuccessRate}%</h3>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
              Estabilidade ideal (FFmpeg)
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/10 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Area: Renderings & Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-400" />
              <span>Projetos Recentes</span>
            </h2>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs text-gray-400 hover:text-indigo-400 font-mono transition flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {recentProjects.length === 0 ? (
              <div className="glass-panel rounded-xl p-6 text-center border border-gray-900">
                <p className="text-xs text-gray-500">Nenhum projeto criado ainda.</p>
              </div>
            ) : (
              recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="glass-panel glass-panel-hover rounded-xl p-4 border border-gray-900/80 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 bg-gray-950 border border-gray-900 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">
                      {project.status === 'completed' && project.videoUrl ? (
                        <video
                          src={project.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <FileVideo className="w-5 h-5 text-gray-700" />
                      )}
                      
                      {/* Aspect Ratio Small Indicator */}
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono text-gray-500 bg-gray-950/90 px-1 rounded border border-gray-900">
                        {project.aspect}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-gray-200 truncate">{project.name}</h4>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{project.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Status badge */}
                    {project.status === 'completed' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                        PRONTO
                      </span>
                    )}
                    {project.status === 'draft' && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-[10px] font-mono">
                        RASCUNHO
                      </span>
                    )}
                    {project.status === 'rendering' && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono animate-pulse">
                        RENDERIZANDO
                      </span>
                    )}

                    {project.status === 'draft' ? (
                      <button
                        onClick={() => triggerRender(project.id)}
                        className="p-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/15 hover:border-indigo-500 text-indigo-400 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold"
                        title="Solicitar Renderização rápida"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>RENDER</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('projects')}
                        className="text-[11px] text-gray-400 hover:text-indigo-400 font-mono transition cursor-pointer"
                      >
                        Gerenciar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Live Renders and Folders */}
        <div className="space-y-6">
          {/* Active Renders Panel */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Jobs Ativos</span>
            </h2>

            <div className="glass-panel rounded-xl p-5 border border-gray-900 space-y-4">
              {activeRenders.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-medium">Fila de renderização vazia</p>
                  <p className="text-[10px] text-gray-600 mt-1">Crie um projeto e inicie para ver o progresso aqui.</p>
                </div>
              ) : (
                activeRenders.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <div className="flex justify-between items-start text-xs">
                      <div>
                        <h4 className="font-semibold text-gray-200 truncate max-w-40">{task.projectName}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{task.templateName}</p>
                      </div>
                      <span className="font-mono text-[10px] bg-purple-950/20 border border-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded animate-pulse">
                        {task.progress}%
                      </span>
                    </div>

                    {/* Progress Slider Bar */}
                    <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden border border-gray-900/60">
                      <div
                        className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Files panel */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Estrutura de Arquivos</span>
            </h2>

            <div className="glass-panel rounded-xl p-5 border border-gray-900 space-y-3.5">
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex justify-between">
                <span>Diretório de Saídas</span>
                <span className="text-emerald-400 font-semibold">{stats.storageUsed}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab('storage')}
                  className="p-3 rounded-lg bg-gray-950/60 border border-gray-900 text-left hover:border-gray-800 transition"
                >
                  <span className="block text-xs font-semibold text-gray-300">/uploads</span>
                  <span className="text-[10px] text-gray-500 font-mono mt-1 block">Recursos brutos</span>
                </button>
                <button
                  onClick={() => setActiveTab('storage')}
                  className="p-3 rounded-lg bg-gray-950/60 border border-gray-900 text-left hover:border-gray-800 transition"
                >
                  <span className="block text-xs font-semibold text-gray-300">/rendered</span>
                  <span className="text-[10px] text-gray-500 font-mono mt-1 block">Vídeos finais</span>
                </button>
              </div>

              <button
                onClick={() => setActiveTab('storage')}
                className="w-full text-center py-2 bg-gray-900/40 hover:bg-gray-900 border border-gray-800/60 rounded-lg text-xs font-semibold text-gray-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Navegar nas Pastas</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
