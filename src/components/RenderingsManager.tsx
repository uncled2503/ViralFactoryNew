/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Film,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export const RenderingsManager: React.FC = () => {
  const { renderingTasks } = useApp();

  return (
    <div className="space-y-6">
      {/* Header section with active action */}
      <div>
        <h1 className="text-xl font-bold text-gray-100 tracking-tight flex items-center gap-2">
          <Film className="w-5 h-5 text-indigo-400" />
          <span>Fila de Renderização (FFmpeg Jobs)</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Acompanhe o processamento de áudio, legendas automáticas e backgrounds em lote.
        </p>
      </div>

      {/* Render History list container */}
      <div className="glass-panel rounded-2xl border border-gray-900 overflow-hidden">
        {/* Table header */}
        <div className="p-4 border-b border-gray-900/60 bg-gray-950/40 grid grid-cols-12 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
          <span className="col-span-4">Vídeo / Projeto</span>
          <span className="col-span-3">Template Base</span>
          <span className="col-span-3 text-center">Status / Progresso</span>
          <span className="col-span-2 text-right">Duração / Ação</span>
        </div>

        {/* Jobs rows list */}
        <div className="divide-y divide-gray-900/60">
          {renderingTasks.length === 0 ? (
            <div className="p-12 text-center">
              <Film className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-300">Nenhum job processado</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Vá até a aba "Projetos" e inicie uma renderização para alimentar a fila do servidor.
              </p>
            </div>
          ) : (
            renderingTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 grid grid-cols-12 items-center text-xs hover:bg-gray-900/10 transition"
              >
                {/* Name */}
                <div className="col-span-4 min-w-0 pr-4">
                  <span className="text-[10px] font-mono text-gray-500 block uppercase">{task.id}</span>
                  <h4 className="font-semibold text-gray-200 truncate mt-0.5">{task.projectName}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Iniciado: {new Date(task.createdAt).toLocaleTimeString('pt-BR')}
                  </p>
                </div>

                {/* Template Name */}
                <span className="col-span-3 text-gray-400 truncate pr-4">{task.templateName}</span>

                {/* Status Column */}
                <div className="col-span-3 flex flex-col items-center justify-center px-4">
                  {task.status === 'completed' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> CONCLUÍDO
                    </span>
                  )}

                  {task.status === 'queued' && (
                    <div className="space-y-1 w-full text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-950/20 border border-blue-500/15 text-blue-300 text-[10px] font-mono font-bold flex items-center gap-1.5 justify-center">
                        <Clock className="w-3.5 h-3.5 animate-pulse" /> EM FILA
                      </span>
                    </div>
                  )}

                  {task.status === 'processing' && (
                    <div className="space-y-1.5 w-full">
                      <div className="flex justify-between text-[10px] font-mono text-indigo-400">
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" /> renderizando...
                        </span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-950 h-1 rounded-full overflow-hidden border border-gray-900">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {task.status === 'failed' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-950/30 border border-red-500/20 text-red-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> FALHOU
                    </span>
                  )}
                </div>

                {/* Duration & Actions */}
                <div className="col-span-2 text-right font-mono flex items-center justify-end gap-3.5 text-gray-400">
                  <div className="text-right">
                    <span className="block text-gray-300">{task.duration}</span>
                    <span className="text-[9px] text-gray-500">{task.renderTime ? `em ${task.renderTime}` : '---'}</span>
                  </div>

                  {task.status === 'completed' && task.outputUrl ? (
                    <a
                      href={task.outputUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/25 hover:border-indigo-500 transition"
                      title="Download Vídeo Codificado"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="p-1.5 rounded-lg bg-gray-900 text-gray-700 border border-gray-900/60 cursor-not-allowed"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
