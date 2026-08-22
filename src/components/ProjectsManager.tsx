/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { NewProjectWizard } from './NewProjectWizard';
import { PageHeader } from './ui/PageHeader';
import { EmptyState } from './ui/EmptyState';
import { ConfirmModal } from './ConfirmModal';
import { Video, Search, Plus, Edit3, Copy, Trash2, Play, FileVideo } from 'lucide-react';
import { Project } from '../types';

type SortKey = 'recent' | 'name' | 'status';
type StatusFilter = 'all' | Project['status'];

const STATUS_LABEL: Record<Project['status'], string> = {
  draft: 'Rascunho',
  rendering: 'Processando',
  completed: 'Pronto',
  failed: 'Falhou'
};

const STATUS_CLASS: Record<Project['status'], string> = {
  draft: 'bg-gray-900/80 text-gray-400 border-gray-800',
  rendering: 'bg-indigo-950/80 text-indigo-400 border-indigo-500/20 animate-pulse',
  completed: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-950/80 text-red-400 border-red-500/20'
};

// Real "all projects" screen — reads straight from useApp() and reuses the same
// NewProjectWizard the Dashboard's hero CTAs open, instead of the disconnected
// simulated wizard this file used to contain.
export const ProjectsManager: React.FC = () => {
  const { projects, templates, renderingTasks, createProject, deleteProject, triggerRender } = useApp();
  const { navigate } = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const filtered = projects
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)
    .sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'status') return a.status.localeCompare(b.status);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleDuplicate = (project: Project) => {
    createProject(`${project.name} (Cópia)`, project.description, project.templateId, project.aspect, { ...project.variables });
  };

  const handleDelete = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id);
      setProjectToDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Projetos"
        subtitle="Todos os projetos criados a partir de um template e um lote de vídeos."
        action={
          <button
            onClick={() => setIsWizardOpen(true)}
            className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        }
      />

      {projects.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar projeto..."
              className="w-full pl-9 pr-3 py-2.5 bg-gray-950/60 border border-gray-900 rounded-xl text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2.5 bg-gray-950/60 border border-gray-900 rounded-xl text-xs text-gray-300 cursor-pointer focus:outline-none focus:border-indigo-500/40"
          >
            <option value="all">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="rendering">Processando</option>
            <option value="completed">Pronto</option>
            <option value="failed">Falhou</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2.5 bg-gray-950/60 border border-gray-900 rounded-xl text-xs text-gray-300 cursor-pointer focus:outline-none focus:border-indigo-500/40"
          >
            <option value="recent">Mais recentes</option>
            <option value="name">Nome (A-Z)</option>
            <option value="status">Status</option>
          </select>
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon={Video}
          title="Nenhum projeto criado ainda"
          description="Envie um template, posicione a área do vídeo e envie o lote para gerar seu primeiro projeto."
          actionLabel="Novo Projeto"
          onAction={() => setIsWizardOpen(true)}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum projeto encontrado"
          description="Ajuste a busca ou os filtros para ver outros projetos."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const templateName = templates.find((t) => t.id === project.templateId)?.name || 'Template removido';
            const liveTask = renderingTasks.find(
              (t) => t.projectId === project.id && (t.status === 'queued' || t.status === 'processing')
            );

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="group relative bg-gray-950 border border-gray-900/60 rounded-xl overflow-hidden flex flex-col h-64 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 cursor-pointer"
              >
                <div className="absolute top-3 left-3 z-10">
                  <span className="text-[9px] font-mono font-bold bg-gray-950/95 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-900/40">
                    {project.aspect}
                  </span>
                </div>
                <div className="absolute top-3 right-3 z-10">
                  <span className={`text-[8px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${STATUS_CLASS[project.status]}`}>
                    {liveTask ? `${liveTask.progress}%` : STATUS_LABEL[project.status].toUpperCase()}
                  </span>
                </div>

                <div className="h-32 bg-gray-900/40 border-b border-gray-900/60 relative overflow-hidden flex items-center justify-center">
                  {project.status === 'completed' && project.videoUrl ? (
                    <video
                      src={project.videoUrl}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity"
                      muted
                      playsInline
                      loop
                      onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-950/30 to-purple-950/10 flex flex-col items-center justify-center gap-1 p-3">
                      <FileVideo className="w-8 h-8 text-gray-700 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-xs flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/project/${project.id}`);
                      }}
                      className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                      title="Editar"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(project);
                      }}
                      className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition-all cursor-pointer"
                      title="Duplicar"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {project.status === 'draft' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerRender(project.id);
                        }}
                        className="p-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white transition-all cursor-pointer shadow-md shadow-pink-600/20"
                        title="Renderizar"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project);
                      }}
                      className="p-1.5 rounded-lg bg-gray-900 hover:bg-red-950/40 border border-gray-800 hover:border-red-500/20 text-gray-300 hover:text-red-400 transition-all cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-1 bg-gray-950 flex-1">
                  <p className="text-[9px] text-gray-500 font-mono truncate">TEMPLATE: {templateName}</p>
                  <h3 className="text-xs font-bold text-gray-200 truncate group-hover:text-indigo-400 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 truncate">{project.description || 'Sem descrição.'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewProjectWizard isOpen={isWizardOpen} flowType="project" onClose={() => setIsWizardOpen(false)} />

      <ConfirmModal
        isOpen={!!projectToDelete}
        title="Excluir Projeto?"
        message={`Esta ação irá remover permanentemente o projeto "${projectToDelete?.name}".`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onClose={() => setProjectToDelete(null)}
      />
    </div>
  );
};
