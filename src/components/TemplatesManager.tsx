/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AspectRatio, Template } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Plus,
  Trash2,
  Edit3,
  Copy,
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
  Heart,
  Search,
  Filter,
  ArrowRight,
  Sliders,
  Maximize,
  Tag
} from 'lucide-react';
import { TemplateEditor } from './TemplateEditor';

export const TemplatesManager: React.FC = () => {
  const {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setActiveTab
  } = useApp();

  const [activeEditorTemplate, setActiveEditorTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('newest');

  // Favorites state persistent during session
  const [favorites, setFavorites] = useState<string[]>(['tpl-reddit-stories']);

  // Delete Template Confirmation Modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(fid => fid !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const openCreateFlow = () => {
    // Generate a fresh template and load the editor immediately
    const name = `Estrutura Automatizada #${templates.length + 1}`;
    const desc = 'Estrutura dinâmica para produção de vídeos em massa.';
    const newTpl = createTemplate(name, desc, '9:16', 30);
    if (newTpl) {
      setActiveEditorTemplate(newTpl);
    }
  };

  const handleDuplicate = (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicatedName = `${template.name} (Cópia)`;
    const newTpl = createTemplate(duplicatedName, template.description, template.aspect, template.defaultDuration);
    if (newTpl) {
      const updated: Template = {
        ...newTpl,
        scenesCount: template.scenesCount,
        layers: template.layers.map(l => ({
          ...l,
          id: `lyr-${Math.random().toString(36).substr(2, 9)}`
        }))
      };
      updateTemplate(updated);
    }
  };

  const triggerDeletePrompt = (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplateToDelete(template);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (templateToDelete) {
      deleteTemplate(templateToDelete.id);
      setIsConfirmOpen(false);
      setTemplateToDelete(null);
    }
  };

  const getTemplateCategory = (tpl: Template) => {
    if (tpl.id === 'tpl-reddit-stories') return 'Curiosidades';
    if (tpl.id === 'tpl-motivational') return 'Cristão';
    if (tpl.id === 'tpl-saas-showcase') return 'Notícias';
    if (tpl.id === 'tpl-ecom-quick') return 'Achadinhos';
    return 'Geral';
  };

  const getCategoryTags = (tpl: Template) => {
    if (tpl.id === 'tpl-reddit-stories') return ['TikTok', 'Curiosidades', 'Reddit'];
    if (tpl.id === 'tpl-motivational') return ['Reflexão', 'Cristão', 'Shorts'];
    if (tpl.id === 'tpl-saas-showcase') return ['Notícias', 'SaaS', 'Canva'];
    if (tpl.id === 'tpl-ecom-quick') return ['Achadinhos', 'Shopee', 'E-commerce'];
    return ['Automação', 'Massa'];
  };

  // Pre-configured custom backgrounds for visual card previews
  const getMockThumbnailUrl = (tplId: string) => {
    switch (tplId) {
      case 'tpl-reddit-stories':
        return 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=300&fit=crop';
      case 'tpl-motivational':
        return 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=300&fit=crop';
      case 'tpl-saas-showcase':
        return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=300&fit=crop';
      case 'tpl-ecom-quick':
        return 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=300&fit=crop';
      default:
        return 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=300&fit=crop';
    }
  };

  const filteredTemplates = templates
    .filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const category = getTemplateCategory(t);
      const matchesCategory = selectedCategory === 'all' || category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (selectedSort === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (selectedSort === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

  if (activeEditorTemplate) {
    return (
      <TemplateEditor
        template={activeEditorTemplate}
        onClose={() => setActiveEditorTemplate(null)}
        onSave={(updated) => {
          updateTemplate(updated);
          setActiveEditorTemplate(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Upper Banner Section */}
      <div className="bg-gradient-to-r from-gray-950 via-indigo-950/20 to-gray-950 border border-gray-900 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-2xl space-y-2">
          <span className="text-[9px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-900 uppercase tracking-widest inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 animate-pulse" />
            Fórmula de Automação
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Biblioteca de Templates</h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            Desenhe a estrutura visual uma única vez e use-a para gerar centenas de shorts, reels e TikToks com vídeos de fundo dinâmicos, headlines, CTAs e legendas aplicadas automaticamente.
          </p>
        </div>
      </div>

      {/* Toolbar / Filters Panel */}
      <div className="bg-gray-950 border border-gray-900/60 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar templates..."
              className="w-full bg-gray-900 border border-gray-850 pl-9 pr-4 py-2 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="w-px h-6 bg-gray-800 hidden md:block" />

          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pr-1">
            {[
              { id: 'all', label: 'Tudo' },
              { id: 'achadinhos', label: 'Achadinhos' },
              { id: 'curiosidades', label: 'Curiosidades' },
              { id: 'noticias', label: 'Notícias' },
              { id: 'cristao', label: 'Cristão' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${selectedCategory === cat.id ? 'bg-indigo-600 text-white shadow' : 'bg-gray-900 text-gray-400 hover:bg-gray-850 hover:text-gray-200'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">Ordenar:</span>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="bg-gray-900 border border-gray-850 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 font-bold cursor-pointer"
            >
              <option value="newest">Mais Recentes</option>
              <option value="name">Ordem Alfabética</option>
            </select>
          </div>

          <button
            onClick={openCreateFlow}
            className="flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/15 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Template</span>
          </button>
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredTemplates.map((template) => {
          const category = getTemplateCategory(template);
          const tags = getCategoryTags(template);
          const isFavorite = favorites.includes(template.id);
          const zonesCount = template.layers ? template.layers.length : 3;

          return (
            <div
              key={template.id}
              className="group bg-gray-950 border border-gray-900 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-gray-800 transition duration-300 relative"
            >
              {/* Premium Card Header / Visual Preview */}
              <div className="relative aspect-[9/16] max-h-[300px] overflow-hidden bg-gray-900">
                <img
                  src={(template as any).backgroundImageUrl || getMockThumbnailUrl(template.id)}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-black/40" />

                {/* Badges on preview */}
                <div className="absolute top-3 left-3 flex gap-1.5 items-center">
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-950/80 border border-gray-800 text-gray-300 backdrop-blur">
                    {template.aspect}
                  </span>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-900 text-indigo-400 backdrop-blur">
                    {zonesCount} Zonas
                  </span>
                </div>

                <button
                  onClick={(e) => toggleFavorite(template.id, e)}
                  className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur transition cursor-pointer ${isFavorite ? 'bg-red-500/10 border border-red-500/30 text-red-500' : 'bg-gray-950/80 border border-gray-800 text-gray-400 hover:text-white'}`}
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                </button>

                {/* Applied overlay layers names visual map */}
                <div className="absolute bottom-3 left-3 right-3 space-y-1">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{category}</span>
                  <h3 className="text-sm font-bold text-white truncate">{template.name}</h3>
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    {tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="text-[8px] font-bold text-gray-400 px-1.5 py-0.5 rounded bg-gray-900/60 border border-gray-800/30">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-gray-950 border-t border-gray-900/40 space-y-3">
                <p className="text-[11px] text-gray-500 line-clamp-2 h-8 leading-relaxed">
                  {template.description || 'Design adaptado para renderizações automatizadas de vídeo em alta velocidade.'}
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveEditorTemplate(template)}
                    className="flex-1 py-2 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/10 text-indigo-400 hover:text-indigo-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Layout</span>
                  </button>

                  <button
                    onClick={() => {
                      // Redirect to project batch generation with this template preselected
                      localStorage.setItem('vf_batch_template_preselect', template.id);
                      setActiveTab('projects');
                    }}
                    className="flex-1 py-2 px-3 bg-gray-900 hover:bg-gray-850 text-gray-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-gray-800"
                  >
                    <span>Criar Lote</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-gray-600 pt-1 border-t border-gray-900/40">
                  <span>Atualizado: {new Date(template.updatedAt).toLocaleDateString('pt-BR')}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleDuplicate(template, e)}
                      className="hover:text-indigo-400 transition cursor-pointer"
                      title="Duplicar"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => triggerDeletePrompt(template, e)}
                      className="hover:text-red-400 transition cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Excluir Template?"
        message={`Esta ação irá remover permanentemente o template "${templateToDelete?.name}" da biblioteca da sua fábrica.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsConfirmOpen(false);
          setTemplateToDelete(null);
        }}
      />
    </div>
  );
};
