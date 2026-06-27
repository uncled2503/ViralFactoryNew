/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AspectRatio, Template } from '../types';
import { ConfirmModal } from './ConfirmModal';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Music,
  Clock,
  X,
  Sparkles,
  HelpCircle,
  FileJson
} from 'lucide-react';

export const TemplatesManager: React.FC = () => {
  const {
    templates,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Custom Confirm Modal States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [aspect, setAspect] = useState<AspectRatio>('9:16');
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [bgMusicUrl, setBgMusicUrl] = useState('/assets/audio/ambient_satisfying.mp3');

  const openCreateModal = () => {
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setAspect('9:16');
    setDefaultDuration(30);
    setBgMusicUrl('/assets/audio/ambient_satisfying.mp3');
    setIsModalOpen(true);
  };

  const openEditModal = (template: Template) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setAspect(template.aspect);
    setDefaultDuration(template.defaultDuration);
    setBgMusicUrl(template.bgMusicUrl || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      return;
    }

    if (editingTemplate) {
      const updated: Template = {
        ...editingTemplate,
        name,
        description,
        aspect,
        defaultDuration,
        bgMusicUrl
      };
      updateTemplate(updated);
    } else {
      createTemplate(name, description, aspect, defaultDuration);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header section with active action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Templates de Layout</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Defina estruturas visuais, trilhas sonoras padrões e disposições de camadas para replicação em massa.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Template</span>
        </button>
      </div>

      {/* Info Warning */}
      <div className="p-4 rounded-xl bg-gray-950 border border-gray-900 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong>Nota de Arquitetura:</strong> O editor visual de timeline de vídeo da segunda etapa será ancorado nessas definições. Atualmente, os templates servem de guia estrutural para a injeção automatizada de legendas e renderização via FFmpeg.
        </p>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((template) => {
          return (
            <div
              key={template.id}
              className="glass-panel glass-panel-hover rounded-2xl border border-gray-900 flex flex-col justify-between overflow-hidden"
            >
              {/* Template Content */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-200 truncate">{template.name}</h3>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-400 text-[9px] font-mono font-semibold">
                      Proporção {template.aspect}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0 text-gray-400">
                    <button
                      onClick={() => duplicateTemplate(template.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-900 hover:text-white transition cursor-pointer"
                      title="Duplicar Template"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(template)}
                      className="p-1.5 rounded-lg hover:bg-gray-900 hover:text-white transition cursor-pointer"
                      title="Editar Propriedades"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setTemplateToDelete(template);
                        setIsConfirmOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-950/20 hover:text-red-400 transition cursor-pointer"
                      title="Deletar Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed h-[34px]">
                  {template.description}
                </p>

                {/* Sub Metadata rows */}
                <div className="pt-3 border-t border-gray-900/60 grid grid-cols-2 gap-3 text-[10px] font-mono text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    <span>Duração: {template.defaultDuration}s</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Music className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    <span className="truncate" title={template.bgMusicUrl || 'Sem áudio padrão'}>
                      Áudio: {template.bgMusicUrl?.split('/').pop() || 'Sem música'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Layers breakdown representation */}
              <div className="px-5 py-3 bg-gray-950/60 border-t border-gray-900/40 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <span className="flex items-center gap-1">
                  <FileJson className="w-3.5 h-3.5 text-gray-700" />
                  <span>Estrutura de JSON</span>
                </span>
                <span>{template.layers.length} camadas mapeadas</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create or Edit Template */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100">
                    {editingTemplate ? 'Propriedades do Template' : 'Criar Template de Vídeo'}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Parâmetros padrões para replicação automatizada.</p>
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
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Nome do Layout</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Reddit Gameplay v2"
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Descrição</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Fundo dinâmico com gameplay do Minecraft e legendas em caixa amarela centralizada."
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Proporção (Aspect Ratio)</label>
                <select
                  value={aspect}
                  onChange={(e) => setAspect(e.target.value as AspectRatio)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                >
                  <option value="9:16">9:16 (TikTok, Reels, Shorts)</option>
                  <option value="16:9">16:9 (YouTube Landscape)</option>
                  <option value="1:1">1:1 (Square Posts)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Duration */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Duração Padrão (s)</label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Music selection */}
                <div>
                  <label className="block text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Áudio de Fundo Padrão</label>
                  <select
                    value={bgMusicUrl}
                    onChange={(e) => setBgMusicUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-950 border border-gray-900 rounded-lg text-xs text-gray-200 outline-none focus:border-indigo-500 transition"
                  >
                    <option value="/assets/audio/ambient_satisfying.mp3">ambient_satisfying.mp3</option>
                    <option value="/assets/audio/cinematic_motivation.mp3">cinematic_motivation.mp3</option>
                    <option value="/assets/audio/sleek_corporate.mp3">sleek_corporate.mp3</option>
                    <option value="/assets/audio/high_energy_hype.mp3">high_energy_hype.mp3</option>
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
                  {editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
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
