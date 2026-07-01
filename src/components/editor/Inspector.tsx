/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EditorLayer, EditorLayerType } from './types';
import { 
  Sliders, Settings, Type, Layout, Palette, 
  Sparkles, Clock, Compass, HelpCircle, AlignLeft, 
  AlignCenter, AlignRight, Bold, Info, Target, Undo 
} from 'lucide-react';

interface InspectorProps {
  selectedLayerId: string | null;
  layers: EditorLayer[];
  onUpdateLayer: (layerId: string, updates: Partial<EditorLayer>) => void;
  totalDuration: number;
}

const FONTS_LIST = [
  'Inter',
  'Space Grotesk',
  'Outfit',
  'Anton',
  'Montserrat',
  'Playfair Display',
  'JetBrains Mono',
  'Fira Code'
];

export const Inspector: React.FC<InspectorProps> = ({
  selectedLayerId,
  layers,
  onUpdateLayer,
  totalDuration,
}) => {
  const layer = layers.find((l) => l.id === selectedLayerId);

  if (!layer) {
    return (
      <div className="w-80 bg-[#090b14] border-l border-gray-900 flex flex-col items-center justify-center p-6 text-center text-gray-500 h-full">
        <Sliders className="w-10 h-10 text-gray-700 mb-3" />
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Painel Inspetor</h4>
        <p className="text-[10px] leading-relaxed max-w-[200px]">
          Selecione uma camada na tela ou no menu lateral para visualizar e editar suas propriedades.
        </p>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<EditorLayer>) => {
    onUpdateLayer(layer.id, updates);
  };

  const isTextType = [
    'headline',
    'subheadline',
    'text',
    'cta',
    'subtitle'
  ].includes(layer.type);

  return (
    <div className="w-80 bg-[#090b14] border-l border-gray-900 flex flex-col h-full overflow-hidden select-none">
      {/* Inspector Header */}
      <div className="h-12 border-b border-gray-900 flex items-center justify-between px-4 bg-gray-950/40">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-500 animate-spin-slow" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-200">Propriedades</span>
        </div>
        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30 uppercase">
          {layer.type}
        </span>
      </div>

      {/* Main Form Fields scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* Layer Identity Section */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Nome da Camada</label>
          <input
            type="text"
            value={layer.name}
            onChange={(e) => handleUpdate({ name: e.target.value })}
            className="w-full bg-gray-950 border border-gray-900 hover:border-gray-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-semibold transition"
          />
        </div>

        {/* Placeholder settings (SaaS Automation) */}
        <div className="space-y-3 bg-indigo-950/10 border border-indigo-950/30 p-3 rounded-xl">
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Placeholders de Automação</span>
          </div>
          <p className="text-[9px] text-gray-500 font-medium">
            Selecione uma tag dinâmica para automatizar a renderização em lote pelo FFmpeg.
          </p>
          <select
            value={layer.placeholder || ''}
            onChange={(e) => handleUpdate({ placeholder: e.target.value || undefined })}
            className="w-full bg-gray-950 border border-gray-900 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-indigo-200 outline-none font-semibold transition cursor-pointer"
          >
            <option value="">Nenhum (Valor Estático)</option>
            <option value="{{VIDEO}}">🎥 {"{{VIDEO}}"} (Vídeo Principal)</option>
            <option value="{{HEADLINE}}">✍️ {"{{HEADLINE}}"} (Título Principal)</option>
            <option value="{{SUBHEADLINE}}">💬 {"{{SUBHEADLINE}}"} (Subtítulo)</option>
            <option value="{{LOGO}}">🏷️ {"{{LOGO}}"} (Logo da Marca)</option>
            <option value="{{CTA}}">📢 {"{{CTA}}"} (Chamada de Ação)</option>
            <option value="{{USERNAME}}">👤 {"{{USERNAME}}"} (Usuário Social)</option>
            <option value="{{DATE}}">📅 {"{{DATE}}"} (Data do Dia)</option>
            <option value="{{INDEX}}">🔢 {"{{INDEX}}"} (Número do Lote)</option>
          </select>
        </div>

        {/* Dimensions & Coordinates */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-gray-900 pb-1">
            <Compass className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Dimensões & Posição</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[9px] font-semibold text-gray-500">Posição X (px)</label>
              <input
                type="number"
                value={layer.x}
                onChange={(e) => handleUpdate({ x: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-gray-500">Posição Y (px)</label>
              <input
                type="number"
                value={layer.y}
                onChange={(e) => handleUpdate({ y: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-gray-500">Largura (px)</label>
              <input
                type="number"
                value={layer.width}
                onChange={(e) => handleUpdate({ width: Math.max(5, parseInt(e.target.value) || 0) })}
                className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-gray-500">Altura (px)</label>
              <input
                type="number"
                value={layer.height}
                onChange={(e) => handleUpdate({ height: Math.max(5, parseInt(e.target.value) || 0) })}
                className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div>
              <label className="text-[9px] font-semibold text-gray-500">Rotação (°)</label>
              <input
                type="number"
                value={layer.rotation}
                onChange={(e) => handleUpdate({ rotation: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                min="0"
                max="360"
              />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-gray-500">Opacidade (%)</label>
              <input
                type="number"
                value={layer.opacity}
                onChange={(e) => handleUpdate({ opacity: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                min="0"
                max="100"
              />
            </div>
          </div>
          <div className="pt-1">
            <input
              type="range"
              min="0"
              max="100"
              value={layer.opacity}
              onChange={(e) => handleUpdate({ opacity: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-gray-900 rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* Text Settings (Only if Text layer selected) */}
        {isTextType && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 border-b border-gray-900 pb-1">
              <Type className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Texto & Tipografia</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-gray-500">Texto Estático</label>
              <textarea
                value={layer.text || ''}
                onChange={(e) => handleUpdate({ text: e.target.value })}
                className="w-full bg-gray-950 border border-gray-900 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-medium h-16 resize-none custom-scrollbar"
                placeholder="Ex: Seu Título Viral Aqui"
                disabled={!!layer.placeholder}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-semibold text-gray-500">Fonte</label>
                <select
                  value={layer.font || 'Inter'}
                  onChange={(e) => handleUpdate({ font: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-900 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-white outline-none font-semibold transition cursor-pointer"
                >
                  {FONTS_LIST.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-semibold text-gray-500">Tamanho (px)</label>
                <input
                  type="number"
                  value={layer.size || 24}
                  onChange={(e) => handleUpdate({ size: Math.max(6, parseInt(e.target.value) || 0) })}
                  className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-semibold text-gray-500">Cor</label>
                <div className="flex gap-1.5">
                  <input
                    type="color"
                    value={layer.color || '#ffffff'}
                    onChange={(e) => handleUpdate({ color: e.target.value })}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent p-0 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={layer.color || '#ffffff'}
                    onChange={(e) => handleUpdate({ color: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2 py-1 text-xs text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-semibold text-gray-500">Alinhamento</label>
                <div className="flex gap-1 bg-gray-950 border border-gray-900 rounded-xl p-1 h-8">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => handleUpdate({ align })}
                      className={`flex-1 flex items-center justify-center rounded transition cursor-pointer ${
                        layer.align === align ? 'bg-indigo-950 text-indigo-400' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {align === 'left' ? (
                        <AlignLeft className="w-3.5 h-3.5" />
                      ) : align === 'center' ? (
                        <AlignCenter className="w-3.5 h-3.5" />
                      ) : (
                        <AlignRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-semibold text-gray-500">Espaçamento</label>
                <input
                  type="number"
                  value={layer.spacing || 0}
                  onChange={(e) => handleUpdate({ spacing: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] font-semibold text-gray-500">Peso</label>
                <select
                  value={layer.weight || 'normal'}
                  onChange={(e) => handleUpdate({ weight: e.target.value as any })}
                  className="w-full bg-gray-950 border border-gray-900 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-white outline-none font-semibold cursor-pointer"
                >
                  <option value="normal">Normal (400)</option>
                  <option value="medium">Medium (500)</option>
                  <option value="semibold">SemiBold (600)</option>
                  <option value="bold">Bold (700)</option>
                </select>
              </div>
            </div>

            {/* Effects Panel (Shadow, Stroke, Glow) */}
            <div className="space-y-3 bg-gray-950/40 p-3 border border-gray-900 rounded-xl mt-2.5">
              <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">Efeitos de Texto</span>

              {/* Stroke */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-500 font-semibold">Contorno (Stroke)</span>
                  <input
                    type="checkbox"
                    checked={!!layer.strokeEnabled}
                    onChange={(e) => handleUpdate({ strokeEnabled: e.target.checked })}
                    className="rounded text-indigo-500 accent-indigo-500 cursor-pointer"
                  />
                </div>
                {layer.strokeEnabled && (
                  <div className="grid grid-cols-2 gap-2.5 pl-1.5">
                    <input
                      type="color"
                      value={layer.strokeColor || '#000000'}
                      onChange={(e) => handleUpdate({ strokeColor: e.target.value })}
                      className="w-full h-7 rounded border-0 cursor-pointer bg-transparent p-0"
                    />
                    <input
                      type="number"
                      value={layer.strokeWidth || 1}
                      onChange={(e) => handleUpdate({ strokeWidth: Math.max(0.5, parseFloat(e.target.value) || 0) })}
                      className="w-full bg-gray-950 border border-gray-900 rounded px-2.5 text-xs text-white outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Shadow */}
              <div className="space-y-2 pt-1 border-t border-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-500 font-semibold">Sombra (Shadow)</span>
                  <input
                    type="checkbox"
                    checked={!!layer.shadowEnabled}
                    onChange={(e) => handleUpdate({ shadowEnabled: e.target.checked })}
                    className="rounded text-indigo-500 accent-indigo-500 cursor-pointer"
                  />
                </div>
                {layer.shadowEnabled && (
                  <div className="grid grid-cols-2 gap-2.5 pl-1.5">
                    <input
                      type="color"
                      value={layer.shadowColor || '#000000'}
                      onChange={(e) => handleUpdate({ shadowColor: e.target.value })}
                      className="w-full h-7 rounded border-0 cursor-pointer bg-transparent p-0"
                    />
                    <input
                      type="number"
                      value={layer.shadowBlur || 4}
                      onChange={(e) => handleUpdate({ shadowBlur: parseInt(e.target.value) || 0 })}
                      className="w-full bg-gray-950 border border-gray-900 rounded px-2.5 text-xs text-white outline-none font-mono"
                      placeholder="Desfoque"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shapes Settings */}
        {layer.type === 'shape' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 border-b border-gray-900 pb-1">
              <Palette className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Configurações da Forma</span>
            </div>

            <div>
              <label className="text-[9px] font-semibold text-gray-500">Tipo de Forma</label>
              <select
                value={layer.shapeType || 'rectangle'}
                onChange={(e) => handleUpdate({ shapeType: e.target.value as any })}
                className="w-full bg-gray-950 border border-gray-900 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-white outline-none font-semibold cursor-pointer"
              >
                <option value="rectangle">Retângulo</option>
                <option value="circle">Círculo</option>
                <option value="line">Linha</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-semibold text-gray-500">Cor de Preenchimento</label>
              <div className="flex gap-1.5">
                <input
                  type="color"
                  value={layer.color || '#6366f1'}
                  onChange={(e) => handleUpdate({ color: e.target.value })}
                  className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent p-0 flex-shrink-0"
                />
                <input
                  type="text"
                  value={layer.color || '#6366f1'}
                  onChange={(e) => handleUpdate({ color: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2 py-1 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            {layer.shapeType === 'rectangle' && (
              <div>
                <label className="text-[9px] font-semibold text-gray-500">Arredondado (Radius px)</label>
                <input
                  type="number"
                  value={layer.radius || 0}
                  onChange={(e) => handleUpdate({ radius: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                />
              </div>
            )}
          </div>
        )}

        {/* Overlay Settings */}
        {layer.type === 'overlay' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 border-b border-gray-900 pb-1">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Opções do Overlay</span>
            </div>

            <div>
              <label className="text-[9px] font-semibold text-gray-500">Efeito</label>
              <select
                value={layer.overlayType || 'solid'}
                onChange={(e) => handleUpdate({ overlayType: e.target.value as any })}
                className="w-full bg-gray-950 border border-gray-900 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-white outline-none font-semibold cursor-pointer"
              >
                <option value="solid">Cor Sólida</option>
                <option value="blur">Desfoque de Fundo (Blur)</option>
                <option value="gradient">Gradiente Linear</option>
              </select>
            </div>

            {layer.overlayType === 'blur' && (
              <div>
                <label className="text-[9px] font-semibold text-gray-500">Força do Desfoque (px)</label>
                <input
                  type="number"
                  value={layer.size || 8}
                  onChange={(e) => handleUpdate({ size: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                  min="0"
                  max="50"
                />
              </div>
            )}

            {layer.overlayType === 'gradient' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] font-semibold text-gray-500">Início</label>
                  <input
                    type="color"
                    value={layer.gradientColorStart || '#transparent'}
                    onChange={(e) => handleUpdate({ gradientColorStart: e.target.value })}
                    className="w-full h-8 rounded border-0 cursor-pointer bg-transparent p-0"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-gray-500">Fim</label>
                  <input
                    type="color"
                    value={layer.gradientColorEnd || '#000000'}
                    onChange={(e) => handleUpdate({ gradientColorEnd: e.target.value })}
                    className="w-full h-8 rounded border-0 cursor-pointer bg-transparent p-0"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Animation & Timing Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 border-b border-gray-900 pb-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Tempo & Animações</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[9px] font-semibold text-gray-500">Início (s)</label>
              <input
                type="number"
                value={layer.durationStart}
                onChange={(e) => handleUpdate({ durationStart: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                min="0"
                max={layer.durationEnd}
                step="0.1"
              />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-gray-500">Término (s)</label>
              <input
                type="number"
                value={layer.durationEnd}
                onChange={(e) => handleUpdate({ durationEnd: Math.min(totalDuration, parseFloat(e.target.value) || 0) })}
                className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                min={layer.durationStart}
                max={totalDuration}
                step="0.1"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-semibold text-gray-500">Animação de Entrada</label>
            <select
              value={layer.animationIn || 'none'}
              onChange={(e) => handleUpdate({ animationIn: e.target.value as any })}
              className="w-full bg-gray-950 border border-gray-900 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-white outline-none font-semibold cursor-pointer"
            >
              <option value="none">Nenhuma</option>
              <option value="fade">Esmaecer (Fade In)</option>
              <option value="slide-up">Subir Deslizando</option>
              <option value="slide-down">Descer Deslizando</option>
              <option value="zoom-in">Aproximar Zoom</option>
              <option value="typewriter">Máquina de Escrever</option>
              <option value="bounce">Salto Elástico</option>
            </select>
          </div>

          {layer.animationIn && layer.animationIn !== 'none' && (
            <div>
              <label className="text-[9px] font-semibold text-gray-500">Duração do Efeito (s)</label>
              <input
                type="number"
                value={layer.animationDuration || 0.5}
                onChange={(e) => handleUpdate({ animationDuration: Math.max(0.1, parseFloat(e.target.value) || 0) })}
                className="w-full bg-gray-950 border border-gray-900 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                min="0.1"
                max="5"
                step="0.1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-gray-950/30 border-t border-gray-900 text-[9px] text-gray-500 leading-relaxed select-none">
        Todas as coordenadas e propriedades são absolutas para renderização em 100% de escala FFmpeg.
      </div>
    </div>
  );
};
