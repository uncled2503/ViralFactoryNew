/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  AlertTriangle, 
  Sparkles, 
  TrendingUp, 
  ArrowRight, 
  X,
  Lock
} from 'lucide-react';

export const LimitExceededModal: React.FC = () => {
  const { limitError, clearLimitError, setActiveTab } = useApp();

  if (!limitError) return null;

  const handleUpgradeClick = () => {
    setActiveTab('subscription');
    clearLimitError();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-md">
      {/* Glow highlight */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="bg-gray-950 border border-indigo-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-indigo-500/5 animate-scale-in relative">
        
        {/* Banner image or glowing abstract header */}
        <div className="bg-gradient-to-b from-indigo-950/40 to-gray-950 p-6 border-b border-gray-900/60 text-center relative">
          <button 
            onClick={clearLimitError}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mx-auto w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight">{limitError.title}</h3>
          <p className="text-xs text-indigo-400 font-mono tracking-wider uppercase mt-1">Recurso Premium Requerido</p>
        </div>

        {/* Modal content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-gray-300 leading-relaxed text-center">
            {limitError.message}
          </p>

          {/* Limits breakdown comparison */}
          <div className="bg-gray-900/30 border border-gray-900 rounded-xl p-4 flex items-center justify-around text-center">
            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Seu Consumo</span>
              <p className="text-sm font-bold text-red-400 font-mono mt-0.5">{limitError.currentLabel}</p>
            </div>
            
            <div className="h-8 w-px bg-gray-900" />

            <div>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Limite do Plano</span>
              <p className="text-sm font-bold text-white font-mono mt-0.5">{limitError.limitLabel}</p>
            </div>
          </div>

          {/* Quick value pitch */}
          <div className="bg-indigo-950/15 border border-indigo-950/40 p-3.5 rounded-lg flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Os planos superiores removem limitações, adicionam legendas automáticas em minutos, garantem prioridade máxima nas renderizações e salvam seus templates com total privacidade.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-900/10 border-t border-gray-900 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={clearLimitError}
            className="w-full sm:w-1/3 order-2 sm:order-1 text-xs text-gray-400 hover:text-white transition-colors py-2.5 font-sans"
          >
            Voltar
          </button>
          
          <button
            onClick={handleUpgradeClick}
            className="w-full sm:w-2/3 order-1 sm:order-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-600/10"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Ver Planos & Upgrades
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
