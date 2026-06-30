/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Search, 
  HelpCircle, 
  BookOpen, 
  Video, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  Cpu, 
  HardDrive, 
  Clock, 
  CheckCircle2, 
  Send,
  AlertCircle
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'geral' | 'limits' | 'ffmpeg' | 'templates';
  question: string;
  answer: string;
}

interface Chapter {
  title: string;
  time: string;
  seconds: number;
  description: string;
}

export const HelpTutorials: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'geral' | 'limits' | 'ffmpeg' | 'templates'>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  // Simulated Video Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(35); // Initial simulated progress percent
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  // Mock Ticket Form states
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('suporte');
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tutorial Chapters definition
  const chapters: Chapter[] = [
    { 
      title: 'Introdução ao Viral Factory', 
      time: '0:00', 
      seconds: 0, 
      description: 'Aprenda os conceitos básicos de escalonamento de shorts utilizando nossa interface automatizada.' 
    },
    { 
      title: 'Desenhando Templates Dinâmicos', 
      time: '1:15', 
      seconds: 75, 
      description: 'Como definir placeholders de texto, fundos variáveis e posições para legendas automáticas.' 
    },
    { 
      title: 'Processamento FFmpeg Assíncrono', 
      time: '3:05', 
      seconds: 185, 
      description: 'Como nosso cluster distribui as tarefas de render e acelera a exportação em lote.' 
    },
    { 
      title: 'Gerenciando Limites de Disco e Renders', 
      time: '4:40', 
      seconds: 280, 
      description: 'Como o cálculo de cotas do seu plano previne vazamentos de memória e interrupções.' 
    },
  ];

  // FAQ list
  const faqs: FAQItem[] = [
    {
      id: 'faq-1',
      category: 'geral',
      question: 'O que é o Viral Factory?',
      answer: 'O Viral Factory é uma plataforma SaaS automatizada voltada para criação e renderização de vídeos curtos (Shorts, Reels, TikToks) em escala. Através do acoplamento de variáveis (textos, logos, cores) em templates reutilizáveis, nossa engine FFmpeg processa centenas de vídeos assincronamente sem travar seu navegador.'
    },
    {
      id: 'faq-2',
      category: 'ffmpeg',
      question: 'Como a engine de render do FFmpeg funciona?',
      answer: 'Quando você clica em "Solicitar Render" em qualquer projeto, o sistema enfileira o projeto em nosso microsserviço de renderização. O FFmpeg extrai os assets do seu diretório virtual, aplica as fontes tipográficas, sobrepõe as legendas dinâmicas frame a frame e encoda o vídeo final no codec H.264 (.mp4), liberando-o na pasta de renderizados.'
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
      answer: 'Seu limite de renderizações de vídeo é reiniciado automaticamente a cada período de faturamento (mensal ou anual). Se você atingir o limite antes do dia de renovação, as novas renderizações serão bloqueadas pela barreira SaaS. Você pode simular a renovação imediata clicando em "Simular Renovação Mensal" na aba de assinaturas ou adquirir um upgrade de plano.'
    },
    {
      id: 'faq-5',
      category: 'templates',
      question: 'Como posso reutilizar um template de layout?',
      answer: 'Templates servem como a fôrma estrutural do seu vídeo. Um template possui camadas predefinidas (como Caixas de Texto ou vídeos de fundo). Ao criar um novo "Projeto", você seleciona o template desejado e preenche as variáveis de texto específicas daquele projeto. Assim, você altera o conteúdo sem precisar reconfigurar fontes ou proporções.'
    },
    {
      id: 'faq-6',
      category: 'ffmpeg',
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

  const handleChapterClick = (index: number) => {
    setCurrentChapterIndex(index);
    // Simulate setting progress bar based on chapter index
    const computedProgress = Math.round((index / chapters.length) * 100) + 12;
    setVideoProgress(Math.min(computedProgress, 100));
    setIsPlaying(true);
  };

  const handleToggleFAQ = (id: string) => {
    if (expandedFAQ === id) {
      setExpandedFAQ(null);
    } else {
      setExpandedFAQ(id);
    }
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const ticketId = `TK-${Math.floor(Math.random() * 90000) + 10000}`;
      setTicketSuccess(ticketId);
      setTicketSubject('');
      setTicketMessage('');
      setIsSubmitting(false);
    }, 900);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Central de Ajuda & Tutoriais
          <span className="text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-mono py-0.5 px-2 rounded-full font-normal">
            Suporte Técnico
          </span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Aprenda a dominar o ecossistema de renderização de vídeos curtos e tire suas dúvidas sobre limites, templates e processamento.
        </p>
      </div>

      {/* Main Grid: Onboarding and Video */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Video Player Simulator (2 Columns wide on desktop) */}
        <div className="lg:col-span-2 bg-gray-950 border border-gray-900 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                Guia em Vídeo: Como Escalar sua Produção
              </h3>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 font-mono rounded-full uppercase">
                Capítulo {currentChapterIndex + 1}/{chapters.length}
              </span>
            </div>

            {/* Video Canvas Sandbox */}
            <div className="aspect-video bg-gray-900 rounded-xl border border-gray-850 relative overflow-hidden flex flex-col items-center justify-center group shadow-inner">
              
              {/* Background simulated player design */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/45 pointer-events-none z-0" />
              
              {/* Overlay graphics displaying current chapter content */}
              <div className="absolute top-4 left-4 z-10 font-mono text-[10px] text-gray-400 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                <span>Modo de Treinamento</span>
                <span>•</span>
                <span className="text-white font-semibold truncate max-w-[200px]">
                  {chapters[currentChapterIndex].title}
                </span>
              </div>

              {/* Subtitles Overlay */}
              {subtitlesEnabled && isPlaying && (
                <div className="absolute bottom-16 left-4 right-4 text-center z-10 px-6 pointer-events-none">
                  <span className="bg-black/80 text-yellow-400 border border-yellow-500/20 px-4 py-1.5 rounded-lg text-xs font-bold leading-normal shadow-lg tracking-tight font-sans inline-block animate-pulse">
                    {currentChapterIndex === 0 && '"Configure o título, selecione as fontes e deixe o FFmpeg renderizar em lote!"'}
                    {currentChapterIndex === 1 && '"Múltiplas variáveis em um único template dinâmico poupam horas de edição."'}
                    {currentChapterIndex === 2 && '"O processamento é 100% assíncrono na nuvem, você pode fechar a aba!"'}
                    {currentChapterIndex === 3 && '"Fique atento às cotas de armazenamento para garantir uploads contínuos."'}
                  </span>
                </div>
              )}

              {/* Central Trigger Action */}
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="z-10 w-16 h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all duration-300"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-white ml-0" /> : <Play className="w-6 h-6 fill-white ml-1" />}
              </button>

              {/* Player UI Controls footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent space-y-3 z-10">
                
                {/* Progress bar */}
                <div className="relative group/bar h-1.5 w-full bg-gray-800 rounded-full cursor-pointer overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300" 
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="text-white hover:text-indigo-400 transition"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <div className="text-[10px] font-mono text-gray-400">
                      <span>{chapters[currentChapterIndex].time}</span>
                      <span className="mx-1">/</span>
                      <span>5:20</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Subtitle toggle */}
                    <button
                      onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                      className={`text-[9px] font-mono border rounded px-1.5 py-0.5 font-bold transition-all ${
                        subtitlesEnabled 
                          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' 
                          : 'border-gray-800 text-gray-500 hover:text-gray-300'
                      }`}
                      title="Alternar Legenda Simulada"
                    >
                      CC / Legendas
                    </button>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-900 border border-gray-800 py-0.5 px-2 rounded">
                      1080p
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chapter Selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {chapters.map((chap, idx) => {
              const isActive = idx === currentChapterIndex;
              return (
                <button
                  key={idx}
                  onClick={() => handleChapterClick(idx)}
                  className={`text-left p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                    isActive 
                      ? 'bg-indigo-950/25 border-indigo-500/30 text-white shadow-md' 
                      : 'bg-gray-900/20 border-gray-900 hover:border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span className="text-[10px] font-mono text-indigo-400 block mb-1">Capítulo 0{idx + 1}</span>
                  <span className="font-semibold line-clamp-1 leading-tight">{chap.title}</span>
                  <span className="text-[10px] text-gray-500 font-mono mt-2 block">{chap.time} minutos</span>
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
                    Clique em <strong className="text-gray-300">Solicitar Render</strong>. O FFmpeg vai sobrepor o áudio, legendas e encodar o arquivo de forma assíncrona.
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
              {(['all', 'geral', 'ffmpeg', 'limits', 'templates'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider transition-all ${
                    activeCategory === cat
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/10'
                      : 'bg-gray-900 border-gray-850 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'Tudo' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar inside FAQ */}
          <div className="relative">
            <input
              type="text"
              placeholder="Digite palavras-chave (ex: limites, FFmpeg, storage)..."
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

        {/* Sandbox Mock Ticket Support Form */}
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-900 pb-3">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Suporte Técnico Direto
            </h3>

            {ticketSuccess ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 text-center space-y-4 animate-scale-in">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Chamado Aberto com Sucesso!</h4>
                  <p className="text-[11px] text-gray-400 mt-1.5 font-mono">
                    Identificador: <strong className="text-indigo-400">{ticketSuccess}</strong>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-3 leading-normal">
                    Como você está rodando no ambiente Sandbox do desenvolvedor, simulamos o tempo estimado de resposta do suporte prioritário em <strong className="text-emerald-400">12 minutos</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setTicketSuccess(null)}
                  className="w-full bg-gray-900 hover:bg-gray-850 border border-gray-850 hover:border-gray-800 text-white text-[11px] font-mono py-2 rounded-lg transition"
                >
                  Abrir Novo Chamado
                </button>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-500 uppercase">Categoria</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-850 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value="suporte">Dificuldade de Render / FFmpeg</option>
                    <option value="billing">Dúvidas sobre Faturamento e Planos</option>
                    <option value="outro">Reportar Bug / Feedback Técnico</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-500 uppercase">Assunto</label>
                  <input
                    type="text"
                    required
                    placeholder="Resuma seu problema (ex: Legendas desalinhadas)"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-850 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-600 placeholder-gray-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-gray-500 uppercase">Mensagem Descritiva</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Descreva detalhadamente o ocorrido..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-850 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-600 placeholder-gray-600 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10"
                >
                  {isSubmitting ? (
                    <>
                      <Cpu className="w-3.5 h-3.5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Enviar Chamado de Suporte
                    </>
                  )}
                </button>
              </form>
            )}
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
