/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AspectRatio, Template } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

type TemplateLayer = Template['layers'][number];
import {
  Layers,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Play,
  X,
  Sparkles,
  HelpCircle,
  Eye,
  CheckCircle2,
  Video,
  Clock,
  Layout,
  Music,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { Editor } from './editor/Editor';

export const TemplatesManager: React.FC = () => {
  const {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createProject,
    setActiveTab
  } = useApp();

  const [activeEditorTemplate, setActiveEditorTemplate] = useState<Template | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('newest');

  // Project spawning modal from template
  const [isSpawnModalOpen, setIsSpawnModalOpen] = useState(false);
  const [selectedTemplateForSpawn, setSelectedTemplateForSpawn] = useState<Template | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Interactive Live Player Preview State
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [activePreviewLayerIdx, setActivePreviewLayerIdx] = useState(0);

  // Custom Confirm Modal States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  // Template Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [aspect, setAspect] = useState<AspectRatio>('9:16');
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [category, setCategory] = useState('Geral');
  
  // Layers State
  const [layers, setLayers] = useState<TemplateLayer[]>([]);

  const openCreateModal = () => {
    // Generate a template directly and launch the visual editor
    const newTplName = `Template #${templates.length + 1}`;
    const newTpl = createTemplate(
      newTplName,
      'Layout de automação em massa',
      '9:16',
      30
    );
    if (newTpl) {
      setActiveEditorTemplate(newTpl);
    }
  };

  const openEditModal = (template: Template) => {
    setActiveEditorTemplate(template);
  };

  const handleDuplicate = (template: Template) => {
    const duplicatedName = `${template.name} (Cópia)`;
    const newTpl = createTemplate(duplicatedName, template.description, template.aspect, template.defaultDuration);
    if (newTpl) {
      const updated: Template = {
        ...newTpl,
        scenesCount: template.scenesCount,
        layers: template.layers.map(l => ({ ...l, id: `lyr-${Math.random().toString(36).substr(2, 9)}` }))
      };
      updateTemplate(updated);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingTemplate) {
      const updated: Template = {
        ...editingTemplate,
        name,
        description,
        aspect,
        defaultDuration,
        layers
      };
      updateTemplate(updated);
    } else {
      const newTpl = createTemplate(name, description, aspect, defaultDuration);
      if (newTpl) {
        const updated: Template = {
          ...newTpl,
          layers
        };
        updateTemplate(updated);
      }
    }
    setIsModalOpen(false);
  };

  const handleSpawnProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateForSpawn || !newProjectName) return;

    createProject(
      newProjectName,
      newProjectDesc || `Projeto automatizado gerado a partir do template ${selectedTemplateForSpawn.name}`,
      selectedTemplateForSpawn.id,
      selectedTemplateForSpawn.aspect,
      {
        title: newProjectName,
        subtitles: selectedTemplateForSpawn.layers
          .filter(l => l.type === 'text')
          .map(l => l.defaultValue),
        brandColor: '#6366f1',
        fontName: 'Inter Bold'
      }
    );

    // Trigger update
    updateTemplate(selectedTemplateForSpawn);

    setIsSpawnModalOpen(false);
    setSelectedTemplateForSpawn(null);
    setNewProjectName('');
    setNewProjectDesc('');
    setActiveTab('projects'); // Smooth redirect!
  };

  const handleAddLayer = () => {
    const newLyr: TemplateLayer = {
      id: `lyr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'text',
      name: 'Nova Camada de Texto',
      defaultValue: 'Subtexto dinâmico'
    };
    setLayers([...layers, newLyr]);
  };

  const handleRemoveLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
  };

  const handleLayerFieldChange = (id: string, field: keyof TemplateLayer, value: any) => {
    setLayers(layers.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const getLayerIcon = (type: TemplateLayer['type']) => {
    switch (type) {
      case 'text': return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
      case 'image': return <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />;
      case 'audio': return <Music className="w-3.5 h-3.5 text-blue-400" />;
      default: return <Layers className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getTemplateCategory = (tpl: Template) => {
    if (tpl.id === 'tpl-reddit-stories') return 'Entretenimento';
    if (tpl.id === 'tpl-motivational') return 'Desenvolvimento Pessoal';
    if (tpl.id === 'tpl-saas-showcase') return 'SaaS Showcase';
    if (tpl.id === 'tpl-ecom-quick') return 'E-commerce';
    return 'Geral';
  };

  const getMockTemplatePreviewThumbnail = (tplId: string) => {
    switch (tplId) {
      case 'tpl-reddit-stories':
        return (
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-indigo-950/20 to-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 max-w-[85%] space-y-1.5 shadow-lg">
              <span className="text-[8px] font-bold text-red-400 flex items-center gap-1">r/AskReddit 💬</span>
              <p className="text-[10px] font-bold text-gray-200 leading-tight">Qual o maior mistério que você descobriu na internet?</p>
            </div>
            <div className="mt-4 bg-gray-950/80 rounded-lg py-1 px-3 border border-gray-900 text-[8px] font-mono text-indigo-400 animate-pulse">
              Legenda viva sincronizada...
            </div>
          </div>
        );
      case 'tpl-motivational':
        return (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-purple-950/10 to-gray-950 flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-2">
              <p className="text-xs font-serif font-bold text-gray-100 tracking-wider">"A dor é temporária. O orgulho é para sempre."</p>
              <span className="text-[8px] font-mono uppercase text-purple-400 block tracking-widest">— Provérbio Espartano</span>
            </div>
          </div>
        );
      case 'tpl-saas-showcase':
        return (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-slate-900 to-gray-950 flex flex-col items-center justify-center p-4">
            <div className="w-[80%] aspect-video bg-gray-950 border border-gray-900 rounded-lg p-2 flex flex-col justify-between">
              <div className="flex gap-1.5 border-b border-gray-900 pb-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              </div>
              <div className="bg-indigo-950/20 rounded h-8 border border-indigo-500/10 flex items-center justify-center">
                <span className="text-[7px] text-indigo-400 font-mono">saas-dashboard-mock.png</span>
              </div>
            </div>
          </div>
        );
      case 'tpl-ecom-quick':
        return (
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-950/30 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-1">
              <span className="bg-pink-600 text-white font-extrabold text-[8px] py-0.5 px-2 rounded-full">OFERTA IMPERDÍVEL</span>
              <h4 className="text-[10px] font-extrabold text-white">Fone de Ouvido Noise Cancel 300</h4>
              <p className="text-emerald-400 font-mono text-[10px] font-bold">Apenas R$ 199,90</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="absolute inset-0 bg-gray-900/10 flex items-center justify-center">
            <Layout className="w-8 h-8 text-gray-800" />
          </div>
        );
    }
  };

  const filteredTemplates = templates
    .filter(t => 
      (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       t.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedCategory === 'all' || getTemplateCategory(t) === selectedCategory)
    )
    .sort((a, b) => {
      if (selectedSort === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (selectedSort === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (selectedSort === 'duration') {
        return a.defaultDuration - b.defaultDuration;
      }
      return 0;
    });

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

  if (activeEditorTemplate) {
    return (
      <Editor
        projectId={activeEditorTemplate.id}
        projectName={activeEditorTemplate.name}
        onClose={() => setActiveEditorTemplate(null)}
        onSaveProjectData={(saveObj) => {
          const updated: Template = {
            ...activeEditorTemplate,
            aspect: saveObj.canvas.aspectRatio,
            defaultDuration: saveObj.totalDuration,
            layers: saveObj.layers as any
          };
          updateTemplate(updated);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Biblioteca de Templates de Vídeo</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Gerencie layouts de áudio, voz, gameplays de fundo e legendas automatizadas para replicação massiva.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Template</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-gray-900 bg-gray-950/30">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Pesquisar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-300 outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Category Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-300 outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="all">Todas Categorias</option>
            <option value="Entretenimento">Entretenimento</option>
            <option value="Desenvolvimento Pessoal">Desenvolvimento Pessoal</option>
            <option value="SaaS Showcase">SaaS Showcase</option>
            <option value="E-commerce">E-commerce</option>
            <option value="Geral">Geral</option>
          </select>

          {/* Sort Selector */}
          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
            className="px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-300 outline-none focus:border-indigo-500 transition cursor-pointer"
          >
            <option value="newest">Mais Recentes</option>
            <option value="name">Ordem Alfabética (A-Z)</option>
            <option value="duration">Duração Curta</option>
          </select>
        </div>
      </div>

      {/* Templates Catalog Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence mode="popLayout">
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              layout
              variants={cardVariants}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group relative bg-gray-950 border border-gray-900/60 rounded-2xl overflow-hidden flex flex-col justify-between h-[360px] transition-all duration-300 hover:border-indigo-500/35 hover:shadow-xl hover:shadow-indigo-500/5"
            >
              {/* Aspect Ratio Badge */}
              <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5 pointer-events-none">
                <span className="text-[9px] font-mono font-bold bg-gray-950/90 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-900/30 shadow-sm">
                  {template.aspect}
                </span>
                <span className="text-[9px] font-mono font-bold bg-gray-950/90 text-gray-400 px-2 py-0.5 rounded-full border border-gray-900 shadow-sm">
                  {getTemplateCategory(template)}
                </span>
              </div>

              {/* Layers count badge */}
              <div className="absolute top-4 right-4 z-10 pointer-events-none">
                <span className="text-[8px] font-mono font-bold bg-gray-950/95 text-pink-400 px-2 py-0.5 rounded-full border border-pink-900/20">
                  {template.layers.length} CAMADAS
                </span>
              </div>

              {/* Custom realistic visual thumbnail background representing design layout */}
              <div className="h-48 bg-gray-900/30 border-b border-gray-900/60 relative overflow-hidden flex items-center justify-center">
                {getMockTemplatePreviewThumbnail(template.id)}

                {/* Hover Quick Action Buttons */}
                <div className="absolute inset-0 bg-gray-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(template)}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/20 cursor-pointer"
                      title="Editar Layout"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDuplicate(template)}
                      className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-850 text-gray-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Duplicar Template"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicar</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setPreviewTemplate(template);
                        setActivePreviewLayerIdx(0);
                      }}
                      className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Preview</span>
                    </button>

                    <button
                      onClick={() => {
                        setTemplateToDelete(template);
                        setIsConfirmOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Metadata & Layer Chips Preview */}
              <div className="p-4 space-y-2 bg-gray-950 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-gray-200 truncate group-hover:text-indigo-400 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 line-clamp-1 leading-relaxed">
                    {template.description}
                  </p>

                  {/* Micro list of dynamic preview layers */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {template.layers.map((lyr, idx) => (
                      <span
                        key={lyr.id}
                        className="inline-flex items-center gap-1 text-[8px] font-mono bg-gray-900 px-1.5 py-0.5 rounded border border-gray-850/60 text-gray-400"
                        title={lyr.name}
                      >
                        {getLayerIcon(lyr.type)}
                        <span>{lyr.name.length > 10 ? lyr.name.substring(0, 10) + '..' : lyr.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Trigger: Spawns video immediately */}
                <div className="pt-3 border-t border-gray-900/60 flex items-center justify-between">
                  <span className="text-[9px] text-gray-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" /> {template.defaultDuration}s padrão
                  </span>
                  
                  <button
                    onClick={() => {
                      setSelectedTemplateForSpawn(template);
                      setNewProjectName(`Campanha ${template.name}`);
                      setIsSpawnModalOpen(true);
                    }}
                    className="py-1 px-2.5 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Usar Template</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Modal: Live Player Preview of Template */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gray-950 border border-gray-850 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-900/80 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Live Frame Preview</span>
                <h3 className="text-xs font-bold text-gray-200 mt-0.5">{previewTemplate.name}</h3>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Live Mobile View Device Player Frame */}
            <div className="p-6 bg-gray-900/30 flex items-center justify-center">
              <div 
                className="relative bg-black rounded-3xl border-4 border-gray-800 shadow-2xl overflow-hidden"
                style={{
                  width: previewTemplate.aspect === '9:16' ? '220px' : previewTemplate.aspect === '1:1' ? '220px' : '340px',
                  height: previewTemplate.aspect === '9:16' ? '380px' : '220px',
                }}
              >
                {/* Visual Content based on active layer */}
                <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-b from-black/40 via-transparent to-black/80">
                  <div className="w-full flex justify-between items-center text-[8px] font-mono text-gray-500">
                    <span>{previewTemplate.aspect} Playback</span>
                    <span className="animate-pulse text-red-500 font-bold">● LIVE REC</span>
                  </div>

                  {/* Active content block */}
                  <div className="text-center space-y-3">
                    {previewTemplate.layers[activePreviewLayerIdx]?.type === 'text' && (
                      <motion.div
                        key={activePreviewLayerIdx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-yellow-500 text-black py-1 px-3 rounded font-sans font-black text-xs inline-block uppercase leading-tight shadow-md"
                      >
                        {previewTemplate.layers[activePreviewLayerIdx].defaultValue}
                      </motion.div>
                    )}

                    {previewTemplate.layers[activePreviewLayerIdx]?.type === 'image' && (
                      <div className="bg-gray-950 p-2 border border-indigo-500/20 rounded text-[9px] font-mono text-indigo-400 flex flex-col items-center gap-1 animate-pulse">
                        <Video className="w-6 h-6" />
                        <span>[Render de {previewTemplate.layers[activePreviewLayerIdx].defaultValue}]</span>
                      </div>
                    )}

                    {previewTemplate.layers[activePreviewLayerIdx]?.type === 'audio' && (
                      <div className="bg-gray-950 p-2 border border-blue-500/20 rounded text-[9px] font-mono text-blue-400 flex flex-col items-center gap-1">
                        <Music className="w-5 h-5 animate-bounce" />
                        <span>[Audio: {previewTemplate.layers[activePreviewLayerIdx].defaultValue}]</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-1">
                    <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full" 
                        style={{ width: `${((activePreviewLayerIdx + 1) / previewTemplate.layers.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-[7px] text-gray-500 font-mono text-right block uppercase">
                      Camada {activePreviewLayerIdx + 1} de {previewTemplate.layers.length} ({previewTemplate.layers[activePreviewLayerIdx]?.name})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Controllers */}
            <div className="p-5 border-t border-gray-900 flex items-center justify-between bg-gray-950">
              <button
                disabled={activePreviewLayerIdx === 0}
                onClick={() => setActivePreviewLayerIdx(prev => prev - 1)}
                className="px-3 py-1.5 text-[10px] text-gray-400 bg-gray-900 rounded-md border border-gray-850 hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
              >
                Camada Anterior
              </button>
              
              <button
                disabled={activePreviewLayerIdx === previewTemplate.layers.length - 1}
                onClick={() => setActivePreviewLayerIdx(prev => prev + 1)}
                className="px-3 py-1.5 text-[10px] text-gray-100 bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:opacity-40 cursor-pointer"
              >
                Próxima Camada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Spawn Project from Template */}
      {isSpawnModalOpen && selectedTemplateForSpawn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-950 border border-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-5 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-gray-100">Alimentar Novo Projeto</h3>
              </div>
              <button
                onClick={() => { setIsSpawnModalOpen(false); setSelectedTemplateForSpawn(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition rounded-lg hover:bg-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSpawnProject} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Nome do Projeto</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Nomeie seu projeto de escala"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Notas do Projeto</label>
                <input
                  type="text"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Ex: Campanha de tráfego pago TikTok"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Spawning Terms */}
              <p className="text-[10px] text-gray-500 leading-normal bg-indigo-950/15 border border-indigo-950/30 p-3 rounded-lg flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Isso irá criar uma instância viva do projeto pré-carregando todas as camadas de design deste template. Você será redirecionado para preencher as headlines finais.
                </span>
              </p>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-900 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsSpawnModalOpen(false); setSelectedTemplateForSpawn(null); }}
                  className="px-3 py-1.5 hover:bg-gray-900 text-gray-400 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-600/10 transition cursor-pointer"
                >
                  Confirmar e Criar
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
          setTemplateToDelete(null);
        }}
        onConfirm={() => {
          if (templateToDelete) {
            deleteTemplate(templateToDelete.id);
          }
        }}
        title="Excluir Template"
        message={`Tem certeza que deseja excluir o template "${templateToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};
