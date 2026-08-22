/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  HelpCircle,
  BookOpen,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from './ui/PageHeader';

interface FAQItem {
  id: string;
  category: 'geral' | 'limits' | 'render' | 'templates';
  question: string;
  answer: string;
}

interface Chapter {
  title: string;
  description: string;
}

// TODO(product): replace with the real support channel (email, WhatsApp, Discord...)
// before this ships to real users — placeholder until the team decides.
const SUPPORT_CONTACT_URL = 'mailto:suporte@viralfactory.com';

export const HelpTutorials: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'geral' | 'limits' | 'render' | 'templates'>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  // Guide chapters — a real step-by-step reference, not a video (no tutorial video
  // exists yet; this used to be dressed up as a fake video player).
  const chapters: Chapter[] = [
    {
      title: 'Introdução ao Viral Factory',
      description: 'Aprenda os conceitos básicos de escalonamento de shorts utilizando nossa interface automatizada.'
    },
    {
      title: 'Desenhando Templates Dinâmicos',
      description: 'Como definir placeholders de texto, fundos variáveis e posições para legendas automáticas.'
    },
    {
      title: 'Processamento Assíncrono em Lote',
      description: 'Como nosso cluster distribui as tarefas de render e acelera a exportação em lote.'
    },
    {
      title: 'Gerenciando Limites de Disco e Renders',
      description: 'Como o cálculo de cotas do seu plano previne vazamentos de memória e interrupções.'
    },
  ];

  // FAQ list
  const faqs: FAQItem[] = [
    {
      id: 'faq-1',
      category: 'geral',
      question: 'O que é o Viral Factory?',
      answer: 'O Viral Factory é uma plataforma SaaS automatizada voltada para criação e renderização de vídeos curtos (Shorts, Reels, TikToks) em escala. Através do acoplamento de variáveis (textos, logos, cores) em templates reutilizáveis, nosso motor de renderização processa centenas de vídeos assincronamente sem travar seu navegador.'
    },
    {
      id: 'faq-2',
      category: 'render',
      question: 'Como o motor de renderização funciona?',
      answer: 'Quando você clica em "Solicitar Render" em qualquer projeto, o sistema enfileira o projeto em nosso microsserviço de renderização. O motor extrai os assets do seu diretório virtual, aplica as fontes tipográficas, sobrepõe as legendas dinâmicas frame a frame e encoda o vídeo final (.mp4), liberando-o na pasta de renderizados.'
    },
    {
      id: 'faq-3',
      category: 'limits',
      question: 'Como são calculados os limites de armazenamento?',
      answer: 'Cada plano (Starter, Pro, Business) possui uma quota máxima de armazenamento expressa em MB ou GB. Toda mídia que você envia para suas pastas virtuais (como fundos, imagens de marca ou logos) somada aos vídeos exportados consome seu espaço em disco. Se atingir o limite, basta remover mídias antigas ou fazer upgrade de plano.'
    },
    {
      id: 'faq-4',
      category: 'limits',
      question: 'O que acontece se eu estourar o limite de vídeos mensais?',
      answer: 'Seu limite de renderizações de vídeo é reiniciado automaticamente a cada período de faturamento (mensal ou anual). Se você atingir o limite antes do dia de renovação, as novas renderizações serão bloqueadas até lá — para continuar renderizando de imediato, adquira um upgrade de plano na aba de Assinatura.'
    },
    {
      id: 'faq-5',
      category: 'templates',
      question: 'Como posso reutilizar um template de layout?',
      answer: 'Templates servem como a fôrma estrutural do seu vídeo. Um template possui camadas predefinidas (como Caixas de Texto ou vídeos de fundo). Ao criar um novo "Projeto", você seleciona o template desejado e preenche as variáveis de texto específicas daquele projeto. Assim, você altera o conteúdo sem precisar reconfigurar fontes ou proporções.'
    },
    {
      id: 'faq-6',
      category: 'render',
      question: 'Posso baixar os vídeos gerados para meu computador?',
      answer: 'Sim! Assim que o render atinge 100% de progresso, o vídeo final é adicionado à pasta de arquivos renderizados. Você pode acessar a aba "Arquivos & Pastas", navegar até a pasta correspondente e realizar o download ou visualizá-lo em tela cheia.'
    }
  ];

  // Filter FAQs based on category and query
  const filteredFAQs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  const handleToggleFAQ = (id: string) => {
    if (expandedFAQ === id) {
      setExpandedFAQ(null);
    } else {
      setExpandedFAQ(id);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Central de Ajuda & Tutoriais"
        subtitle="Aprenda a dominar o ecossistema de renderização de vídeos curtos e tire suas dúvidas sobre limites, templates e processamento."
      />

      {/* Main Grid: Onboarding and Video */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Step Guide (2 Columns wide on desktop) */}
        <div className="lg:col-span-2 bg-gray-950 border border-gray-900 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Guia: Como Escalar sua Produção
              </h3>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 font-mono rounded-full uppercase">
                Etapa {currentChapterIndex + 1}/{chapters.length}
              </span>
            </div>

            {/* Selected step content */}
            <div className="aspect-video bg-gray-900 rounded-xl border border-gray-850 relative overflow-hidden flex flex-col items-center justify-center p-8 text-center">
              <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">Etapa {String(currentChapterIndex + 1).padStart(2, '0')}</span>
              <h4 className="text-lg font-bold text-white mt-2">{chapters[currentChapterIndex].title}</h4>
              <p className="text-xs text-gray-400 mt-3 max-w-md leading-relaxed">{chapters[currentChapterIndex].description}</p>
            </div>
          </div>

          {/* Step Selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {chapters.map((chap, idx) => {
              const isActive = idx === currentChapterIndex;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentChapterIndex(idx)}
                  className={`text-left p-3 rounded-xl border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                    isActive
                      ? 'bg-indigo-950/25 border-indigo-500/30 text-white shadow-md'
                      : 'bg-gray-900/20 border-gray-900 hover:border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="text-[10px] font-mono text-indigo-400 block mb-1">Etapa 0{idx + 1}</span>
                  <span className="font-semibold line-clamp-2 leading-tight">{chap.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rapid Step-By-Step Onboarding */}
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-900 pb-3">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Fluxo do Vídeo Engine
            </h3>

            <div className="space-y-4">
              
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-200">Escolha o Layout</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    Navegue na aba de <strong className="text-gray-300">Templates</strong> para analisar as fôrmas, fontes tipográficas e proporção ideal (Retrato ou Paisagem).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-200">Preencha as Variáveis</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    Crie um novo <strong className="text-gray-300">Projeto</strong> associado àquele template e personalize o título, cores de marca e logos correspondentes.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-200">Dispare o Renderizador</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    Clique em <strong className="text-gray-300">Solicitar Render</strong>. Nosso motor vai sobrepor o áudio, legendas e encodar o arquivo de forma assíncrona.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-200">Baixe e Distribua</h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    Acompanhe o download em <strong className="text-gray-300">Fila de Renderização</strong>. Ao finalizar, baixe o arquivo em sua pasta de arquivos renderizados.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-950/15 border border-indigo-950/30 p-3.5 rounded-xl mt-6">
            <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Dica Pro: Vídeos de Fundo
            </h4>
            <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
              Você pode enviar seus próprios clipes de fundo em formato .mp4 na aba "Arquivos & Pastas" para usá-los como plano de fundo customizado em seus projetos.
            </p>
          </div>
        </div>
      </div>

      {/* FAQs and Support Ticket Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FAQ Area (2 Columns wide) */}
        <div className="lg:col-span-2 bg-gray-950 border border-gray-900 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-900 pb-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                Perguntas Frequentes (FAQ)
              </h3>
              <p className="text-xs text-gray-500 mt-1">Navegue pelas dúvidas mais comuns sobre faturamento, render e limites.</p>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'geral', 'render', 'limits', 'templates'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider transition-all ${
                    activeCategory === cat
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/10'
                      : 'bg-gray-900 border-gray-850 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'Tudo' : cat === 'render' ? 'Renderização' : cat === 'geral' ? 'Geral' : cat === 'limits' ? 'Limites' : 'Templates'}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar inside FAQ */}
          <div className="relative">
            <input
              type="text"
              placeholder="Digite palavras-chave (ex: limites, render, storage)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-850 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono"
            />
            <div className="absolute left-3 top-2.5 text-gray-500">
              <Search className="w-4 h-4" />
            </div>
          </div>

          {/* FAQ Accordions */}
          <div className="space-y-2.5">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-900 rounded-xl text-gray-500 text-xs font-mono">
                Nenhum tópico localizado com este termo de pesquisa.
              </div>
            ) : (
              filteredFAQs.map(faq => {
                const isExpanded = expandedFAQ === faq.id;
                return (
                  <div 
                    key={faq.id} 
                    className={`border rounded-xl transition-all ${
                      isExpanded 
                        ? 'bg-gray-900/10 border-gray-800' 
                        : 'bg-gray-950 border-gray-900 hover:border-gray-850'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleFAQ(faq.id)}
                      className="w-full flex items-center justify-between p-4 text-left gap-4"
                    >
                      <span className="text-xs font-semibold text-gray-200">{faq.question}</span>
                      <span className="text-gray-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-900/40 pt-3">
                        <p className="text-[11px] text-gray-400 leading-relaxed font-sans">{faq.answer}</p>
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-900/30">
                          <span className="text-[9px] font-mono uppercase bg-indigo-505/10 text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 py-0.5 px-2 rounded-md">
                            Tópico: {faq.category}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Direct Support Contact */}
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-900 pb-3">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Suporte Técnico Direto
            </h3>

            <p className="text-xs text-gray-400 leading-relaxed">
              Não achou a resposta nas perguntas frequentes? Fale diretamente com nossa equipe sobre problemas de renderização, faturamento ou bugs.
            </p>

            <a
              href={SUPPORT_CONTACT_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Entrar em Contato
            </a>
          </div>

          <div className="text-[10px] text-gray-500 leading-relaxed bg-gray-900/30 p-3 rounded-lg border border-gray-900 mt-6 flex gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              O suporte técnico prioritário funciona 24/7 para clientes nos planos <strong className="text-indigo-400">Creator Pro</strong> e <strong className="text-pink-400">Business</strong>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
