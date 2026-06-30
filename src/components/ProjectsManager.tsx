/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useRouter } from '../hooks/useRouter';
import { AspectRatio, Project } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
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
  ExternalLink,
  Copy,
  Clock,
  Eye,
  Search,
  Sliders,
  Tv
} from 'lucide-react';

export const ProjectsManager: React.FC = () => {
  const { navigate } = useRouter();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAspect, setFilterAspect] = useState<string>('all');

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

  const handleDuplicate = (project: Project) => {
    const duplicatedName = `${project.name} (Cópia)`;
    createProject(
      duplicatedName, 
      project.description, 
      project.templateId, 
      project.aspect,
      { ...project.variables }
    );
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
      createProject(name, description, templateId, aspect, {
        title,
        subtitles: subtitlesArr,
        brandColor,
        fontName
      });
    }

    setIsModalOpen(false);
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAspect = filterAspect === 'all' || p.aspect === filterAspect;
    return matchesSearch && matchesAspect;
  });

  const getAspectBadgeColor = (aspect: AspectRatio) => {
    switch (aspect) {
      case '9:16': return 'bg-indigo-950/60 border-indigo-500/20 text-indigo-300';
      case '16:9': return 'bg-purple-950/60 border-purple-500/20 text-purple-300';
      case '1:1': return 'bg-pink-950/60 border-pink-500/20 text-pink-300';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-400" />
            <span>Meus Projetos de Vídeo</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Crie, duplique, gerencie variáveis e dispare renderizadores FFmpeg automatizados de forma simples.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Projeto</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-gray-900 bg-gray-950/30">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Pesquisar projetos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-300 outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1">
            <Sliders className="w-3 h-3" /> Filtrar Proporção:
          </span>
          <div className="inline-flex bg-gray-950 border border-gray-900 rounded-lg p-0.5">
            {['all', '9:16', '16:9', '1:1'].map((asp) => (
              <button
                key={asp}
                onClick={() => setFilterAspect(asp)}
                className={`text-[10px] font-semibold px-3 py-1 rounded transition ${
                  filterAspect === asp
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {asp === 'all' ? 'Tudo' : asp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid with Framer Motion stagger */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence mode="popLayout">
          {filteredProjects.length === 0 ? (
            <motion.div 
              layout
              variants={cardVariants}
              className="col-span-full glass-panel rounded-2xl p-16 text-center border border-gray-900"
            >
              <Video className="w-12 h-12 text-gray-700 mx-auto mb-4 animate-pulse" />
              <h3 className="text-sm font-semibold text-gray-300">Nenhum projeto registrado</h3>
              <p className="text-xs text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Nenhum projeto atende a esse filtro. Clique em "Criar Projeto" no canto superior direito para registrar o primeiro.
              </p>
            </motion.div>
          ) : (
            filteredProjects.map((project) => {
              const template = templates.find((t) => t.id === project.templateId);
              return (
                <motion.div
                  key={project.id}
                  layout
                  variants={cardVariants}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="group relative bg-gray-950 border border-gray-900/60 rounded-2xl overflow-hidden flex flex-col justify-between h-[340px] transition-all duration-300 hover:border-indigo-500/35 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer"
                >
                  {/* Top Layer Header */}
                  <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5 pointer-events-none">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${getAspectBadgeColor(project.aspect)}`}>
                      {project.aspect}
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-gray-950/90 border border-gray-900 text-gray-400 px-2 py-0.5 rounded-full">
                      Duração: 30s
                    </span>
                  </div>

                  {/* Rendering Status badge inside header */}
                  <div className="absolute top-4 right-4 z-10 pointer-events-none">
                    {project.status === 'completed' && (
                      <span className="text-[8px] font-mono font-extrabold bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        CONCLUÍDO
                      </span>
                    )}
                    {project.status === 'draft' && (
                      <span className="text-[8px] font-mono font-extrabold bg-gray-900/80 text-gray-400 px-2 py-0.5 rounded-full border border-gray-850 flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                        RASCUNHO
                      </span>
                    )}
                    {project.status === 'rendering' && (
                      <span className="text-[8px] font-mono font-extrabold bg-indigo-950/80 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1 shadow-sm animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                        RENDERING
                      </span>
                    )}
                  </div>

                  {/* Thumbnail / Creative Layer Preview Container */}
                  <div className="h-44 bg-gray-900/20 border-b border-gray-900/60 relative overflow-hidden flex items-center justify-center">
                    {project.status === 'completed' && project.videoUrl ? (
                      <video
                        src={project.videoUrl}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                        muted
                        playsInline
                        loop
                        onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                        onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-950/20 via-purple-950/10 to-gray-950 flex flex-col items-center justify-center p-4">
                        <FileVideo className="w-10 h-10 text-gray-800 group-hover:text-indigo-400 transition-colors" />
                        
                        {/* Styled Preview Layout representing headlines */}
                        <div className="mt-3 max-w-[80%] text-center space-y-1">
                          <p className="text-[9px] font-bold text-gray-400 line-clamp-1">
                            "{project.variables.title}"
                          </p>
                          <p className="text-[8px] text-gray-600 line-clamp-1 italic font-mono">
                            {project.variables.subtitles[0] || 'Sem legendas'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Smooth Hover overlay with action buttons */}
                    <div className="absolute inset-0 bg-gray-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/project/${project.id}`);
                          }}
                          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/20 cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(project);
                          }}
                          className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-850 text-gray-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                          <span>Duplicar</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {project.status === 'draft' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerRender(project.id);
                            }}
                            className="py-1.5 px-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-lg shadow-pink-600/20"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Renderizar</span>
                          </button>
                        ) : project.status === 'completed' && project.videoUrl ? (
                          <a
                            href={project.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="py-1.5 px-4 bg-gray-900 border border-gray-800 text-gray-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:border-gray-700 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Abrir Vídeo</span>
                          </a>
                        ) : null}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(project);
                            setIsConfirmOpen(true);
                          }}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Metadata Details */}
                  <div className="p-4 space-y-2 bg-gray-950 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <span className="text-[9px] text-indigo-400 font-mono tracking-wider font-semibold uppercase block">
                        TEMPLATE: {template ? template.name : 'Personalizado'}
                      </span>
                      <h3 className="text-xs font-bold text-gray-200 truncate group-hover:text-indigo-400 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                        {project.description || 'Nenhuma descrição adicionada.'}
                      </p>
                    </div>

                    {/* Meta values list */}
                    <div className="pt-2 border-t border-gray-900/60 flex items-center justify-between text-[9px] font-mono text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Legendas: {project.variables.subtitles.length}
                      </span>
                      <span>Exports: 12</span>
                      <span className="flex items-center gap-1">
                        <Sliders className="w-3 h-3" style={{ color: project.variables.brandColor }} /> {project.variables.fontName}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal: Create or Edit Project */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-950 border border-gray-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-250">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4 fill-current animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100">
                    {editingProject ? 'Editar Propriedades do Projeto' : 'Configurar Novo Projeto Automático'}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Preencha as headlines, cores e mídias de fundo.</p>
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
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-900 rounded-xl text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
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
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-900 rounded-xl text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Template Base</label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-900 rounded-xl text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
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
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-900 rounded-xl text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
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
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-900 rounded-xl text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Subtitles text - multiple scenes */}
                <div className="col-span-2">
                  <div className="flex justify-between mb-1.5">
                    <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                      Legendas das Cenas (Uma por linha)
                    </label>
                    <span className="text-[10px] text-gray-500 font-mono">Suporta CSV em lote</span>
                  </div>
                  <textarea
                    rows={4}
                    value={subtitlesText}
                    onChange={(e) => setSubtitlesText(e.target.value)}
                    placeholder="Digite cada fala do narrador por linha..."
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-900 rounded-xl text-xs text-gray-200 font-mono outline-none focus:border-indigo-500 transition resize-none"
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
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-900 rounded-xl text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  >
                    <option value="Inter Bold">Inter Bold (Moderno / Clean)</option>
                    <option value="Space Grotesk">Space Grotesk (Tech / High-Impact)</option>
                    <option value="Fira Code">Fira Code (Terminal / Nerd Style)</option>
                    <option value="Playfair Display">Playfair Display (Serif / Editorial)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-900/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 hover:bg-gray-900 text-gray-400 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition cursor-pointer"
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
