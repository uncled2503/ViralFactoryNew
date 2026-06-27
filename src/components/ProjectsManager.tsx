/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AspectRatio, Project } from '../types';
import { ConfirmModal } from './ConfirmModal';
import {
  Video,
  Plus,
  Trash2,
  Edit3,
  Play,
  FileVideo,
  X,
  Check,
  Sparkles,
  Layers,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export const ProjectsManager: React.FC = () => {
  const {
    projects,
    templates,
    createProject,
    updateProject,
    deleteProject,
    triggerRender
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Custom Confirm Modal States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [aspect, setAspect] = useState<AspectRatio>('9:16');
  
  // Variables fields
  const [title, setTitle] = useState('');
  const [subtitlesText, setSubtitlesText] = useState(''); // comma/newline separated
  const [brandColor, setBrandColor] = useState('#6366f1');
  const [fontName, setFontName] = useState('Inter Bold');

  const openCreateModal = () => {
    setEditingProject(null);
    setName('');
    setDescription('');
    setTemplateId(templates[0]?.id || '');
    setAspect('9:16');
    setTitle('');
    setSubtitlesText('Insira a primeira frase do vídeo\nInsira a segunda frase de impacto\nInsira o encerramento do curto');
    setBrandColor('#6366f1');
    setFontName('Inter Bold');
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description);
    setTemplateId(project.templateId);
    setAspect(project.aspect);
    setTitle(project.variables.title);
    setSubtitlesText(project.variables.subtitles.join('\n'));
    setBrandColor(project.variables.brandColor || '#6366f1');
    setFontName(project.variables.fontName || 'Inter Bold');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !templateId) {
      return;
    }

    const subtitlesArr = subtitlesText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (editingProject) {
      // Edit
      const updated: Project = {
        ...editingProject,
        name,
        description,
        templateId,
        aspect,
        variables: {
          ...editingProject.variables,
          title,
          subtitles: subtitlesArr,
          brandColor,
          fontName
        }
      };
      updateProject(updated);
    } else {
      // Create
      const newProj = createProject(name, description, templateId, aspect);
      // Update variables on the created project
      const updated: Project = {
        ...newProj,
        variables: {
          title,
          subtitles: subtitlesArr,
          brandColor,
          fontName
        }
      };
      updateProject(updated);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header section with active action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-400" />
            <span>Meus Projetos</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Crie novos curtos de alta conversão, edite legendas ou solicite renderização do conteúdo.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Projeto</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.length === 0 ? (
          <div className="col-span-full glass-panel rounded-2xl p-12 text-center border border-gray-900">
            <Video className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-300">Nenhum projeto registrado</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Clique no botão "Criar Projeto" no canto superior direito para parametrizar seu primeiro vídeo.
            </p>
          </div>
        ) : (
          projects.map((project) => {
            const template = templates.find((t) => t.id === project.templateId);
            return (
              <div
                key={project.id}
                className="glass-panel glass-panel-hover rounded-2xl border border-gray-900/80 overflow-hidden flex flex-col h-[320px] justify-between"
              >
                {/* Visual Preview container */}
                <div className="bg-gray-950 p-4 border-b border-gray-900/60 flex-1 flex flex-col justify-between relative">
                  {/* Overlay Aspect badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold bg-gray-900/90 text-gray-400 px-2 py-0.5 rounded border border-gray-800">
                      Proporção: {project.aspect}
                    </span>
                  </div>

                  {/* Project Details */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-400 font-mono tracking-wider block">
                      {template ? template.name : 'Sem Template'}
                    </span>
                    <h3 className="text-sm font-bold text-gray-200 truncate">{project.name}</h3>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                      {project.description || 'Sem descrição.'}
                    </p>
                  </div>

                  {/* Simulated screen showing parameters & subtitles inside a styled preview container */}
                  <div className="mt-4 p-3 bg-gray-900/50 border border-gray-800/40 rounded-xl space-y-1.5 text-[10px] font-mono">
                    <div className="flex justify-between text-gray-500">
                      <span>FONTE:</span>
                      <span className="text-gray-300 font-bold">{project.variables.fontName}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>COR:</span>
                      <span className="font-bold flex items-center gap-1" style={{ color: project.variables.brandColor }}>
                        <span className="w-2.5 h-2.5 rounded-full inline-block border border-gray-800" style={{ backgroundColor: project.variables.brandColor }} />
                        {project.variables.brandColor}
                      </span>
                    </div>
                    <div className="text-gray-500 line-clamp-1">
                      <span>LEGENDAS ({project.variables.subtitles.length}):</span>{' '}
                      <span className="text-gray-400">"{project.variables.subtitles[0] || '...'}"</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-gray-950/40 border-t border-gray-900/40 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(project)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-900 transition cursor-pointer"
                      title="Editar variáveis do projeto"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setProjectToDelete(project);
                        setIsConfirmOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition cursor-pointer"
                      title="Deletar projeto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Render Status action */}
                  <div>
                    {project.status === 'completed' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/15">
                          CONCLUÍDO
                        </span>
                        {project.videoUrl && (
                          <a
                            href={project.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-gray-900 text-gray-300 hover:text-white rounded-lg border border-gray-800 hover:border-gray-700 transition"
                            title="Ver vídeo final"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : project.status === 'rendering' ? (
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded border border-indigo-500/20 animate-pulse">
                        RENDERIZANDO...
                      </span>
                    ) : (
                      <button
                        onClick={() => triggerRender(project.id)}
                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold font-mono transition flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>RENDER</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Create or Edit Project */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-250">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100">
                    {editingProject ? 'Editar Configurações do Projeto' : 'Configurar Novo Projeto'}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Preencha os textos e variáveis de rendering.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[480px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {/* Project Name */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Nome do Projeto</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Curioso Relato de Casamento - Reddit"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Descrição Curta</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Vídeo de piada curta focado em adolescentes no TikTok."
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Template Base</label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.aspect})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Proporção (Aspect Ratio)</label>
                  <select
                    value={aspect}
                    onChange={(e) => setAspect(e.target.value as AspectRatio)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  >
                    <option value="9:16">9:16 (TikTok / Shorts / Reels)</option>
                    <option value="16:9">16:9 (Landscape YouTube)</option>
                    <option value="1:1">1:1 (Square Instagram Post)</option>
                  </select>
                </div>

                {/* Title */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Título / Pergunta de Entrada</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Qual é a coisa mais absurda que já te disseram?"
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Subtitles text - multiple scenes */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
                    Legendas das Cenas (Uma por linha)
                  </label>
                  <textarea
                    rows={4}
                    value={subtitlesText}
                    onChange={(e) => setSubtitlesText(e.target.value)}
                    placeholder="Digite cada fala do narrador por linha..."
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 font-mono outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                {/* Brand Color */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Cor de Destaque</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-10 h-8 p-0 rounded bg-transparent border-0 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none"
                    />
                  </div>
                </div>

                {/* Font Name */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Estilo de Fonte</label>
                  <select
                    value={fontName}
                    onChange={(e) => setFontName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  >
                    <option value="Inter Bold">Inter Bold (Moderno / Clean)</option>
                    <option value="Space Grotesk">Space Grotesk (Tech / High-Impact)</option>
                    <option value="Fira Code">Fira Code (Terminal / Nerd Style)</option>
                    <option value="Playfair Display">Playfair Display (Serif / Editorial)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-900/80 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 hover:bg-gray-900 text-gray-400 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition cursor-pointer"
                >
                  {editingProject ? 'Salvar Alterações' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={() => {
          if (projectToDelete) {
            deleteProject(projectToDelete.id);
          }
        }}
        title="Excluir Projeto"
        message={`Tem certeza que deseja excluir o projeto "${projectToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};
