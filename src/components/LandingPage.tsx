/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from '../hooks/useRouter';
import { LogoFull } from './Logo';
import {
  Video,
  ArrowRight,
  Sparkles,
  Layers,
  Zap,
  Users,
  CheckCircle2,
  Globe,
  Sliders,
  Eye,
  Cloud,
  Shield,
  Activity,
  Maximize2,
  ChevronDown,
  Check,
  CheckSquare,
  Play,
  Flame,
  LayoutGrid,
  TrendingUp,
  FolderOpen,
  Settings,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<'projetos' | 'templates' | 'editor' | 'renders' | 'dashboard'>('dashboard');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Stats Counters
  const [stats, setStats] = useState({ videos: 0, users: 0, sat: 0, countries: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);

    // Animate stats numbers on mount
    const duration = 2000;
    const steps = 60;
    const intervalTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setStats({
        videos: Math.min(Math.round((2000000 / steps) * step), 2000000),
        users: Math.min(Math.round((35000 / steps) * step), 35000),
        sat: Math.min(Math.round((98 / steps) * step), 98),
        countries: Math.min(Math.round((120 / steps) * step), 120)
      });

      if (step >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(timer);
    };
  }, []);

  // Demo tab data for Interactive SaaS Showcase
  const demoTabs = {
    dashboard: {
      title: 'Dashboard de Performance',
      badge: 'Visão Geral do Escopo',
      desc: 'Monitore suas produções e veja o ganho de escala em tempo real com métricas precisas.',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
              <span className="text-[10px] uppercase text-gray-500 font-mono">Vídeos Produzidos</span>
              <p className="text-xl font-bold font-display text-indigo-400 mt-1">1.428</p>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" /> +14% esta semana
              </span>
            </div>
            <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
              <span className="text-[10px] uppercase text-gray-500 font-mono">Tempo Economizado</span>
              <p className="text-xl font-bold font-display text-purple-400 mt-1">142 horas</p>
              <span className="text-[10px] text-indigo-300 mt-0.5 block">Processamento na Nuvem</span>
            </div>
            <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800/80">
              <span className="text-[10px] uppercase text-gray-500 font-mono">Taxa de Conversão</span>
              <p className="text-xl font-bold font-display text-pink-400 mt-1">4.8%</p>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                +1.2% de engajamento
              </span>
            </div>
          </div>
          <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/50">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-medium text-gray-300">Volume de Produção Diário</span>
              <span className="text-[10px] font-mono text-gray-500">Últimos 7 Dias</span>
            </div>
            <div className="h-28 flex items-end gap-3 pt-4">
              {[35, 60, 45, 90, 110, 80, 150].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600/40 to-indigo-500/90 rounded-t-md transition-all duration-1000"
                    style={{ height: `${(h / 150) * 100}%` }}
                  />
                  <span className="text-[9px] font-mono text-gray-500">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    projetos: {
      title: 'Gerenciador de Projetos',
      badge: 'Lotes Organizacionais',
      desc: 'Crie múltiplos projetos para marcas, clientes ou canais distintos, com controle de variáveis unificado.',
      content: (
        <div className="space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-gray-900 pb-3">
            <span className="text-xs font-semibold text-gray-300">Meus Lotes de Vídeos</span>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-semibold border border-indigo-500/20">3 Ativos</span>
          </div>
          <div className="space-y-2">
            {[
              { name: 'Histórias Curtas - Curiosidades', videos: 150, update: 'Há 5 min', status: 'Exportado' },
              { name: 'Citações Motivacionais Diárias', videos: 80, update: 'Ontem', status: 'Em progresso' },
              { name: 'Demonstração de Produto SaaS', videos: 45, update: 'Há 3 dias', status: 'Planejado' }
            ].map((proj, i) => (
              <div key={i} className="bg-gray-900/50 p-3 rounded-xl border border-gray-800/80 hover:border-gray-700/80 transition flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-200">{proj.name}</h4>
                    <span className="text-[10px] text-gray-500">{proj.videos} variações de vídeo • {proj.update}</span>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-md font-mono ${
                  proj.status === 'Exportado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  proj.status === 'Em progresso' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                  'bg-gray-800 text-gray-400 border border-gray-700'
                }`}>
                  {proj.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    templates: {
      title: 'Biblioteca de Templates',
      badge: 'Layouts Altamente Customizáveis',
      desc: 'Selecione e configure layouts otimizados para retenção e engajamento nas redes verticais.',
      content: (
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: 'Estilo Reddit Stories', desc: 'Gameplay de fundo com legenda centralizada e título flutuante.', color: 'from-orange-600/20 to-orange-500/10 border-orange-500/30' },
            { title: 'Estilo Citações Premium', desc: 'Fundo estético com efeito blur, tipografia refinada e progresso sutil.', color: 'from-purple-600/20 to-purple-500/10 border-purple-500/30' },
            { title: 'Review Rápido de Produtos', desc: 'Transições rápidas, zoom automático e chamadas para ação integradas.', color: 'from-blue-600/20 to-blue-500/10 border-blue-500/30' },
            { title: 'Listas Top 5 Curiosidades', desc: 'Contadores automáticos, transições deslizantes e layout dinâmico.', color: 'from-emerald-600/20 to-emerald-500/10 border-emerald-500/30' }
          ].map((tpl, i) => (
            <div key={i} className={`bg-gradient-to-br ${tpl.color} p-3 rounded-xl border flex flex-col justify-between h-28 hover:scale-[1.02] transition-transform duration-300`}>
              <div>
                <h5 className="text-[11px] font-bold text-gray-200">{tpl.title}</h5>
                <p className="text-[9px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{tpl.desc}</p>
              </div>
              <span className="text-[9px] text-indigo-300 font-mono flex items-center gap-1 cursor-pointer">
                Usar Layout <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          ))}
        </div>
      )
    },
    editor: {
      title: 'Editor Visual de Variáveis',
      badge: 'Camadas e Inputs Dinâmicos',
      desc: 'Personalize fontes, cores, logos e legendas em lotes usando nossa timeline simplificada.',
      content: (
        <div className="space-y-3 text-xs">
          <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 flex items-center justify-between">
            <span className="text-gray-300 font-semibold flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Variáveis Dinâmicas
            </span>
            <span className="text-[10px] text-indigo-300 font-mono">{"{{HEADLINE}}"}</span>
          </div>
          <div className="bg-gray-950 p-2.5 rounded-lg border border-gray-900 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>Camada de Texto Principal</span>
              <span className="font-mono text-indigo-400">Ativa</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-900 p-2 rounded border border-gray-800">
                <span className="text-[8px] text-gray-500 uppercase block">Fonte</span>
                <span className="text-[10px] font-semibold text-gray-300">Space Grotesk</span>
              </div>
              <div className="bg-gray-900 p-2 rounded border border-gray-800">
                <span className="text-[8px] text-gray-500 uppercase block">Cor do Destaque</span>
                <span className="text-[10px] font-semibold text-purple-400">#A855F7</span>
              </div>
            </div>
          </div>
          <div className="h-10 bg-gray-900/40 rounded-xl border border-gray-800/60 flex items-center px-3 gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-gray-400 font-mono">Pré-visualização ao vivo: "Como os milionários pensam..."</span>
          </div>
        </div>
      )
    },
    renders: {
      title: 'Fila de Exportação em Massa',
      badge: 'Processamento Concorrente',
      desc: 'Veja centenas de vídeos gerados simultaneamente prontos para publicação em segundos.',
      content: (
        <div className="space-y-3 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-300">Progresso do Lote #142</span>
            <span className="text-indigo-400 font-mono font-bold">75% Concluído</span>
          </div>
          <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-3/4 rounded-full" />
          </div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {[
              { id: 'video_001.mp4', size: '18.4MB', status: 'Pronto', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
              { id: 'video_002.mp4', size: '17.9MB', status: 'Pronto', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
              { id: 'video_003.mp4', size: '19.1MB', status: 'Renderizando...', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 animate-pulse' },
              { id: 'video_004.mp4', size: '18.2MB', status: 'Na fila', color: 'text-gray-400 bg-gray-800 border-gray-700' }
            ].map((v, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] bg-gray-900/40 p-2 rounded-lg border border-gray-800/50">
                <span className="font-mono text-gray-300">{v.id} ({v.size})</span>
                <span className={`px-2 py-0.5 rounded text-[9px] border font-semibold ${v.color}`}>{v.status}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
  };

  // Testimonials with automatic playing logic
  const testimonials = [
    {
      name: 'Thiago Castanho',
      role: 'Fundador da ViralMedia',
      company: 'Agência de Escala',
      quote: 'O Viral Factory revolucionou nossa operação. Conseguimos criar 120 shorts personalizados para nossos clientes em menos de 15 minutos. A qualidade visual é simplesmente premium.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
      rating: 5
    },
    {
      name: 'Juliana Neves',
      role: 'Head de Growth',
      company: 'SaaS Pulse',
      quote: 'Antes levávamos dias editando vídeos manualmente para o TikTok e Reels. Hoje, montamos um template no editor e exportamos em lote de forma incrivelmente rápida e padronizada.',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80',
      rating: 5
    },
    {
      name: 'Marcos Silveira',
      role: 'Criador de Conteúdo',
      company: 'Canal Alquimia Financeira',
      quote: 'Ter dezenas de vídeos prontos para a semana toda me salvou de um cansaço absurdo. O Viral Factory me dá o suporte ideal para dominar os algoritmos e crescer muito mais rápido.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      rating: 5
    }
  ];

  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const testimonialTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isHoveringTestimonial, setIsHoveringTestimonial] = useState(false);

  useEffect(() => {
    if (isHoveringTestimonial) {
      if (testimonialTimerRef.current) clearInterval(testimonialTimerRef.current);
    } else {
      testimonialTimerRef.current = setInterval(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      }, 5000);
    }
    return () => {
      if (testimonialTimerRef.current) clearInterval(testimonialTimerRef.current);
    };
  }, [isHoveringTestimonial, testimonials.length]);

  // Pricing plans
  const plans = [
    {
      name: 'Starter',
      price: 'R$ 97',
      period: 'mês',
      desc: 'Ideal para criadores iniciantes que querem validar seus primeiros canais de escala.',
      features: [
        'Até 300 renders de vídeo/mês',
        '3 Projetos ativos simultâneos',
        'Templates prontos essenciais',
        'Suporte prioritário por e-mail',
        'Fila de exportação padrão',
        'Cancele a qualquer momento'
      ],
      cta: 'Começar com Starter',
      highlight: false
    },
    {
      name: 'Creator Pro',
      price: 'R$ 197',
      period: 'mês',
      desc: 'O plano perfeito para profissionais que buscam escala massiva e automação robusta.',
      features: [
        'Até 1.200 renders de vídeo/mês',
        'Projetos e pastas ilimitados',
        'Todos os Templates Premium',
        'Prioridade máxima na fila de renders',
        'Upload de vídeos de gameplay personalizados',
        'Edição avançada de variáveis de texto',
        'Acesso prioritário a novas ferramentas'
      ],
      cta: 'Começar com Creator Pro',
      highlight: true
    },
    {
      name: 'Business',
      price: 'R$ 397',
      period: 'mês',
      desc: 'Para agências e equipes grandes que produzem conteúdo em ritmo constante e de alta performance.',
      features: [
        'Até 4.000 renders de vídeo/mês',
        'Espaço de armazenamento extra de 10GB',
        'Até 5 usuários/colaboradores',
        'Modelos e templates sob medida',
        'Acompanhamento estratégico por especialistas',
        'SLA de entrega garantido de renderização'
      ],
      cta: 'Contatar Vendas',
      highlight: false
    }
  ];

  // FAQ list
  const faqs = [
    {
      q: 'Como funciona a geração de centenas de vídeos?',
      a: 'Você escolhe ou cria um template com variáveis dinâmicas (como títulos, fundos, imagens e áudios). Depois, fornece os valores dessas variáveis (por exemplo, preenchendo as colunas no nosso editor ou criando lotes). O Viral Factory processa tudo na nuvem ao mesmo tempo, renderizando centenas de vídeos totalmente únicos e prontos para publicar.'
    },
    {
      q: 'Preciso instalar algum programa ou ter um computador forte?',
      a: 'Não! Toda a edição, composição e renderização pesada dos vídeos ocorre 100% nos nossos servidores de alta performance na nuvem. Você pode usar a plataforma a partir de qualquer navegador, inclusive em um notebook antigo ou celular.'
    },
    {
      q: 'Existe período de fidelidade? Posso cancelar quando quiser?',
      a: 'Nenhum plano possui fidelidade ou contratos longos. Você pode assinar, usufruir da plataforma e cancelar sua renovação a qualquer momento direto pelo painel, sem burocracias ou multas.'
    },
    {
      q: 'Consigo usar minhas próprias fontes, cores e logotipos?',
      a: 'Com certeza! Nosso editor de variáveis de templates permite que você customize completamente o visual do vídeo para se adequar de forma cirúrgica à identidade da sua marca ou canal.'
    },
    {
      q: 'Os vídeos gerados são aceitos para monetização?',
      a: 'Sim. Os vídeos gerados com bons templates, legendas elegantes e bons materiais de áudio/vídeo são de altíssima qualidade e perfeitamente adequados para monetização em plataformas como TikTok, YouTube Shorts, Instagram Reels e Facebook Reels.'
    }
  ];

  // Smooth scroll handler
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#03050a] text-gray-200 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden font-sans">
      
      {/* Background Radial Light Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(99,102,241,0.15),transparent)] pointer-events-none z-0" />
      <div className="absolute top-[1800px] right-0 w-96 h-96 bg-purple-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[3200px] left-0 w-96 h-96 bg-indigo-500/5 blur-[120px] pointer-events-none z-0" />

      {/* Grid Canvas Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_400px,#000_80%,transparent_100%)] pointer-events-none opacity-20 z-0"></div>

      {/* HEADER */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'py-3 bg-[#03050a]/80 backdrop-blur-md border-b border-gray-900/60 shadow-lg shadow-black/30'
            : 'py-5 bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <LogoFull iconSize={34} textClassName="text-lg" subTextClassName="text-[10px]" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-gray-400">
            <button onClick={() => scrollToSection('recursos')} className="hover:text-white transition cursor-pointer">Recursos</button>
            <button onClick={() => scrollToSection('como-funciona')} className="hover:text-white transition cursor-pointer">Como Funciona</button>
            <button onClick={() => scrollToSection('demonstracao')} className="hover:text-white transition cursor-pointer">Demonstração</button>
            <button onClick={() => scrollToSection('precos')} className="hover:text-white transition cursor-pointer">Preços</button>
            <button onClick={() => scrollToSection('depoimentos')} className="hover:text-white transition cursor-pointer">Depoimentos</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-white transition cursor-pointer">FAQ</button>
          </nav>

          {/* Header Action CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-semibold text-gray-300 hover:text-white transition px-4 py-2 hover:bg-gray-900/40 rounded-xl cursor-pointer"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition px-4.5 py-2.5 rounded-xl shadow-md shadow-indigo-600/15 border border-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              Começar Agora
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white transition cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#03050a]/95 backdrop-blur-lg border-b border-gray-900 px-6 py-6 space-y-4 text-sm font-semibold text-gray-300"
            >
              <button onClick={() => scrollToSection('recursos')} className="block w-full text-left py-2 hover:text-indigo-400">Recursos</button>
              <button onClick={() => scrollToSection('como-funciona')} className="block w-full text-left py-2 hover:text-indigo-400">Como Funciona</button>
              <button onClick={() => scrollToSection('demonstracao')} className="block w-full text-left py-2 hover:text-indigo-400">Demonstração</button>
              <button onClick={() => scrollToSection('precos')} className="block w-full text-left py-2 hover:text-indigo-400">Preços</button>
              <button onClick={() => scrollToSection('depoimentos')} className="block w-full text-left py-2 hover:text-indigo-400">Depoimentos</button>
              <button onClick={() => scrollToSection('faq')} className="block w-full text-left py-2 hover:text-indigo-400">FAQ</button>
              <div className="pt-4 border-t border-gray-900 flex flex-col gap-3">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full text-center py-2.5 text-gray-300 hover:bg-gray-900 rounded-xl"
                >
                  Entrar
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full text-center py-2.5 text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg"
                >
                  Começar Agora
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 pb-24 md:pt-40 md:pb-36 max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Left Info */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            {/* Promo Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-[11px] font-mono tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Geração de Vídeos Verticais em Escala
            </div>

            {/* Core Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display tracking-tight text-white leading-[1.1]">
              Crie <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">centenas de vídeos</span> em minutos, não em horas.
            </h1>

            {/* Subheading explanation */}
            <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xl">
              Transforme uma única ideia ou template estratégico em uma produção massiva de conteúdo altamente otimizado para o TikTok, Reels e Shorts. Escale seus canais sem esforço manual.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25 border border-indigo-500/20"
              >
                <span>Começar Gratuitamente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollToSection('demonstracao')}
                className="px-6 py-3.5 bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                Ver Demonstração
              </button>
            </div>

            {/* Badges under hero */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-[11px] font-mono text-gray-500 uppercase tracking-wider border-t border-gray-900/60 max-w-lg">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-400" />
                Sem cartão de crédito
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-400" />
                Configuração em minutos
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-indigo-400" />
                Cancele quando quiser
              </div>
            </div>
          </div>

          {/* Hero Right 3D Visual Mockup */}
          <div className="lg:col-span-5 relative flex justify-center">
            
            {/* Ambient Purple Soft Glow behind mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />

            {/* Mockup Frame with perspective 3D effect */}
            <div className="relative w-full max-w-[360px] bg-gray-950/90 border border-gray-800/80 rounded-2xl p-5 shadow-2xl shadow-indigo-500/10 hover:scale-[1.03] transition-transform duration-500 transform lg:rotate-y-[-12deg] lg:rotate-x-[6deg] lg:perspective-[1000px]">
              
              {/* Fake Window bar */}
              <div className="flex items-center justify-between border-b border-gray-900 pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="text-[9px] font-mono text-gray-600 bg-gray-900/60 px-3 py-0.5 rounded border border-gray-800/40">
                  viralfactory.app/studio
                </div>
                <div className="w-4 h-4" />
              </div>

              {/* Fake Active Editor Screen */}
              <div className="space-y-4 font-sans text-left">
                <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent pointer-events-none" />
                  <span className="text-[8px] uppercase tracking-wider font-mono text-indigo-400 font-semibold block">Template Selecionado</span>
                  <h3 className="text-xs font-bold text-gray-100 mt-0.5">Reddit Viral Stories</h3>
                  <p className="text-[10px] text-gray-400 mt-1">Layout com fundo de gameplay automatizado.</p>
                </div>

                <div className="bg-gray-900/30 p-3 rounded-xl border border-gray-800/50 space-y-2">
                  <span className="text-[8px] uppercase tracking-wider font-mono text-gray-500 block">Camadas de Texto (Variáveis)</span>
                  
                  <div className="bg-gray-950 p-2 rounded-lg border border-gray-900/80 flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Citação Principal</span>
                    <span className="text-indigo-300 font-mono">{"{{CITAÇÃO}}"}</span>
                  </div>

                  <div className="bg-gray-950 p-2 rounded-lg border border-gray-900/80 flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Legenda Automática</span>
                    <span className="text-purple-300 font-mono">{"{{LEGENDA}}"}</span>
                  </div>
                </div>

                {/* Progress simulator */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[9px] text-gray-500">
                    <span>Exportando Lote de 200 Vídeos</span>
                    <span className="font-mono text-indigo-400">92%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[92%] rounded-full" />
                  </div>
                </div>
              </div>

              {/* Orbiting Badge 1 */}
              <div className="absolute -top-4 -right-6 bg-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1 border border-indigo-400/30 animate-bounce">
                <Sparkles className="w-3 h-3" />
                100x Mais Rápido
              </div>

              {/* Orbiting Badge 2 */}
              <div className="absolute -bottom-5 -left-6 bg-gray-900 border border-gray-800 text-gray-300 text-[10px] font-mono px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Fila de Processamento Ativa
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* PROVA SOCIAL / STATS SECTION */}
      <section className="py-12 border-t border-b border-gray-900/60 bg-gray-950/20 max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Placeholder Logos */}
        <div className="text-center mb-10">
          <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">Tecnologia de Confiança Utilizada por Criadores de Todo o Mundo</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 mt-6 opacity-40 grayscale hover:grayscale-0 transition duration-300">
            {['Vortex', 'Apex Creator', 'ScaleFlow', 'PixelTech', 'OmniMedia'].map((logo, i) => (
              <span key={i} className="text-sm font-bold font-display tracking-widest text-gray-400">
                {logo.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Counter Stats Container */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-gray-900/40 text-center max-w-4xl mx-auto">
          <div>
            <p className="text-3xl md:text-4xl font-bold font-display text-white">
              +{stats.videos >= 1000000 ? `${(stats.videos / 1000000).toFixed(1)}M` : stats.videos}
            </p>
            <p className="text-xs text-gray-500 mt-1">Vídeos produzidos</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold font-display text-indigo-400">
              +{stats.users >= 1000 ? `${Math.round(stats.users / 1000)}k` : stats.users}
            </p>
            <p className="text-xs text-gray-500 mt-1">Criadores ativos</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold font-display text-purple-400">
              {stats.sat}%
            </p>
            <p className="text-xs text-gray-500 mt-1">De satisfação</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold font-display text-white">
              +{stats.countries}
            </p>
            <p className="text-xs text-gray-500 mt-1">Países integrados</p>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-24 max-w-7xl mx-auto px-6 relative z-10 text-center">
        <div className="space-y-4 max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Passo a Passo</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Produza conteúdo massivo em 4 etapas simples
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Uma estrutura inteligente desenhada para remover qualquer atrito operacional da sua produção diária.
          </p>
        </div>

        {/* Interactive Steps Card Line */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          
          {/* Connector Line behind steps (Desktop only) */}
          <div className="hidden md:block absolute top-[68px] left-[12%] right-[12%] h-[1px] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 z-0" />

          {[
            {
              step: '01',
              title: 'Crie ou escolha seu template',
              desc: 'Escolha um de nossos modelos de alta retenção ou crie o seu do zero no editor.',
              icon: <Layers className="w-5 h-5 text-indigo-400" />
            },
            {
              step: '02',
              title: 'Defina suas variáveis',
              desc: 'Insira os textos, títulos, imagens ou fundos específicos que vão variar em cada vídeo.',
              icon: <Sliders className="w-5 h-5 text-purple-400" />
            },
            {
              step: '03',
              title: 'Configure os detalhes',
              desc: 'Configure o idioma das legendas automáticas, cores de destaque e logo da marca.',
              icon: <Settings className="w-5 h-5 text-indigo-400" />
            },
            {
              step: '04',
              title: 'Exporte tudo em lote',
              desc: 'Nossos servidores processam tudo simultaneamente. Em segundos, baixe todos os vídeos prontos.',
              icon: <Zap className="w-5 h-5 text-pink-400" />
            }
          ].map((item, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center group">
              <div className="w-14 h-14 rounded-2xl bg-gray-950 border border-gray-800/80 hover:border-indigo-500/50 flex items-center justify-center shadow-xl group-hover:scale-105 transition-all duration-300 relative">
                {item.icon}
                <span className="absolute -top-2.5 -right-2.5 bg-gray-900 border border-gray-800 text-[9px] font-mono font-bold text-gray-500 w-6 h-6 rounded-full flex items-center justify-center">
                  {item.step}
                </span>
              </div>
              <h3 className="text-xs font-bold text-gray-200 mt-5 mb-2 font-display">{item.title}</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed max-w-[220px]">{item.desc}</p>
            </div>
          ))}

        </div>
      </section>

      {/* BENEFÍCIOS (PREMIUM BENTO GRID) */}
      <section id="recursos" className="py-24 border-t border-gray-900/40 bg-gray-950/10 max-w-7xl mx-auto px-6 relative z-10">
        <div className="space-y-4 max-w-2xl mx-auto mb-16 text-center">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Recursos de Alto Nível</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Tudo o que você precisa para dominar os algoritmos
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Criado por profissionais de crescimento para criadores profissionais. Sem promessas vazias, focado em alta conversão e escala real.
          </p>
        </div>

        {/* Bento Grid (12 items matching the list in requirements) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'Produção em Escala',
              desc: 'Gere lotes enormes de vídeos curtos verticalizados prontos de uma só vez.',
              icon: <Zap className="w-4 h-4 text-indigo-400" />
            },
            {
              title: 'Templates Reutilizáveis',
              desc: 'Salve seus layouts vencedores e repita fórmulas de sucesso indefinidamente.',
              icon: <Layers className="w-4 h-4 text-purple-400" />
            },
            {
              title: 'Legendas Automáticas',
              desc: 'Sincronização impecável com realce dinâmico por palavra para manter retenção alta.',
              icon: <Play className="w-4 h-4 text-pink-400" />
            },
            {
              title: 'Uploads em Lote',
              desc: 'Envie múltiplos assets de fundo simultaneamente sem travar seu navegador.',
              icon: <Cloud className="w-4 h-4 text-indigo-400" />
            },
            {
              title: 'Headlines Dinâmicas',
              desc: 'Varie e teste diferentes títulos para descobrir o que gera mais cliques de curiosidade.',
              icon: <Sparkles className="w-4 h-4 text-purple-400" />
            },
            {
              title: 'Organização por Projetos',
              desc: 'Pastas dedicadas por nicho, marca ou canal para manter sua operação em ordem.',
              icon: <FolderOpen className="w-4 h-4 text-pink-400" />
            },
            {
              title: 'Renderização em Massa',
              desc: 'Nossa fila concorrente processa seus lotes na nuvem sem consumir sua RAM.',
              icon: <Activity className="w-4 h-4 text-indigo-400" />
            },
            {
              title: 'Pré-visualização Rápida',
              desc: 'Veja exatamente como cada variação do seu lote ficará antes de iniciar o render.',
              icon: <Eye className="w-4 h-4 text-purple-400" />
            },
            {
              title: 'Automação Completa',
              desc: 'Deixe o trabalho chato e repetitivo de edição manual no passado de uma vez por todas.',
              icon: <CheckSquare className="w-4 h-4 text-pink-400" />
            },
            {
              title: 'Dashboard Intuitivo',
              desc: 'Métricas visuais que mostram o tempo poupado e o volume da sua esteira criativa.',
              icon: <LayoutGrid className="w-4 h-4 text-indigo-400" />
            },
            {
              title: 'Sincronização na Nuvem',
              desc: 'Seus projetos salvos de forma segura e acessíveis de qualquer computador.',
              icon: <Globe className="w-4 h-4 text-purple-400" />
            },
            {
              title: 'Sistema Multiusuário',
              desc: 'Pronto para receber sua equipe de roteiristas ou gestores de conteúdo no futuro.',
              icon: <Users className="w-4 h-4 text-pink-400" />
            }
          ].map((item, i) => (
            <div
              key={i}
              className="bg-gray-900/40 border border-gray-900/80 hover:border-gray-800/80 hover:bg-gray-900/60 p-5 rounded-xl transition-all duration-300 hover:shadow-lg group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-950 flex items-center justify-center border border-gray-800 mb-4 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-xs font-bold text-gray-200 font-display mb-1.5">{item.title}</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMONSTRAÇÃO INTERATIVA DO SAAS */}
      <section id="demonstracao" className="py-24 max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Tabs Menu Column */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="space-y-4">
              <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">SaaS Simulator</span>
              <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight leading-none">
                Conheça a Plataforma por dentro
              </h2>
              <p className="text-gray-400 text-xs leading-relaxed">
                Navegue pelas abas interativas do simulador para visualizar como é simples operar nossa interface profissional de alta performance.
              </p>
            </div>

            {/* Vertical Tab Selector buttons */}
            <div className="space-y-2 pt-2">
              {[
                { id: 'dashboard', label: 'Dashboard de Performance', icon: <LayoutGrid className="w-4 h-4" /> },
                { id: 'projetos', label: 'Gerenciador de Projetos', icon: <FolderOpen className="w-4 h-4" /> },
                { id: 'templates', label: 'Modelos & Templates', icon: <Layers className="w-4 h-4" /> },
                { id: 'editor', label: 'Editor de Variáveis', icon: <Sliders className="w-4 h-4" /> },
                { id: 'renders', label: 'Fila de Exportação', icon: <Activity className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold text-left transition border cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                      : 'bg-transparent border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  {activeTab === tab.id && (
                    <motion.div layoutId="active-indicator" className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Screen Display Column */}
          <div className="lg:col-span-7 bg-[#0b0f19]/90 border border-gray-800/80 rounded-2xl p-6 shadow-2xl relative">
            <div className="absolute top-4 right-4 bg-indigo-500/10 text-indigo-300 text-[9px] font-mono uppercase px-2 py-0.5 rounded-md border border-indigo-500/20">
              Demo Interativa
            </div>

            <div className="flex items-center gap-1.5 mb-6 border-b border-gray-900 pb-3 text-left">
              <div className="w-2 h-2 rounded-full bg-gray-700" />
              <span className="text-[10px] text-gray-500 font-mono">viral_factory_workspace / {demoTabs[activeTab].title.toLowerCase().replace(/ /g, '_')}</span>
            </div>

            {/* Simulated Window Content with animation wrapper */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 text-left"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[9px] font-mono text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 uppercase">
                    {demoTabs[activeTab].badge}
                  </div>
                  <h3 className="text-sm font-bold text-white font-display mt-2">{demoTabs[activeTab].title}</h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                    {demoTabs[activeTab].desc}
                  </p>
                </div>

                <div className="bg-[#03050a]/60 border border-gray-900/80 rounded-xl p-4 min-h-[220px] flex flex-col justify-center">
                  {demoTabs[activeTab].content}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </section>

      {/* COMPARAÇÃO (PRODUÇÃO MANUAL VS VIRAL FACTORY) */}
      <section className="py-24 border-t border-gray-900/40 bg-gray-950/20 max-w-7xl mx-auto px-6 relative z-10 text-center">
        <div className="space-y-4 max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Comparativo de Eficiência</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Produção Manual vs Viral Factory
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Entenda numericamente por que continuar editando seus vídeos curtos um a um é o maior gargalo do seu crescimento.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-gray-900 bg-gray-950/50 backdrop-blur-md">
          <div className="grid grid-cols-12 bg-gray-950 p-4 border-b border-gray-900 font-mono text-[10px] text-gray-500 uppercase tracking-wider text-left">
            <div className="col-span-4 pl-2">Métrica de Operação</div>
            <div className="col-span-4 text-center">Produção Manual (Tradicional)</div>
            <div className="col-span-4 text-center text-indigo-400 font-bold">Na Viral Factory</div>
          </div>

          <div className="divide-y divide-gray-900/80 text-left text-xs">
            {[
              { metric: 'Tempo para 100 Vídeos', manual: 'Aproximadamente 40 a 50 horas', factory: 'Cerca de 10 a 15 minutos' },
              { metric: 'Quantidade de Cliques', manual: 'Milhares de ações repetitivas de arrastar/cortar', factory: 'Menos de 10 cliques no lote' },
              { metric: 'Escalabilidade', manual: 'Limitada ao cansaço físico do editor humano', factory: 'Escala infinita na nuvem concorrente' },
              { metric: 'Padronização Visual', manual: 'Sujeito a erros de alinhamento e fontes', factory: '100% fiel ao template e marca estabelecidos' },
              { metric: 'Organização de Lotes', manual: 'Pastas perdidas e bagunça no HD local', factory: 'Sincronizado de forma estruturada por projetos' },
              { metric: 'Exportação e Processamento', manual: 'Gargalo de render travando seu computador', factory: 'Computação em massa e download pronto na nuvem' }
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-12 p-4 items-center hover:bg-gray-900/10 transition">
                <div className="col-span-4 font-semibold text-gray-300 pl-2">{row.metric}</div>
                <div className="col-span-4 text-center text-gray-500 line-through decoration-red-500/20">{row.manual}</div>
                <div className="col-span-4 text-center text-indigo-300 font-bold bg-indigo-500/5 py-1.5 rounded-lg border border-indigo-500/10">{row.factory}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS (AUTOPLAY CAROUSEL) */}
      <section id="depoimentos" className="py-24 border-t border-gray-900/40 max-w-7xl mx-auto px-6 relative z-10 text-center">
        <div className="space-y-4 max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Depoimentos Reais</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Aprovado pelos maiores estrategistas
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Quem experimentou a automação em massa de vídeos curtos não consegue voltar a editar manualmente.
          </p>
        </div>

        {/* Carousel Card Wrapper */}
        <div
          className="max-w-2xl mx-auto bg-gray-900/35 border border-gray-800/60 rounded-2xl p-8 shadow-2xl relative"
          onMouseEnter={() => setIsHoveringTestimonial(true)}
          onMouseLeave={() => setIsHoveringTestimonial(false)}
        >
          <div className="absolute top-4 right-4 text-indigo-500/10">
            <Sparkles className="w-16 h-16" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentTestimonial}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 text-left"
            >
              {/* Star ratings */}
              <div className="flex items-center gap-1 text-indigo-400">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote text */}
              <p className="text-gray-300 text-sm md:text-base leading-relaxed italic font-medium">
                "{testimonials[currentTestimonial].quote}"
              </p>

              {/* Author profile */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-900/60">
                <img
                  src={testimonials[currentTestimonial].avatar}
                  alt={testimonials[currentTestimonial].name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-indigo-500/30"
                />
                <div>
                  <h4 className="text-xs font-bold text-white font-display">{testimonials[currentTestimonial].name}</h4>
                  <p className="text-[10px] text-gray-500">{testimonials[currentTestimonial].role} • <span className="text-indigo-400">{testimonials[currentTestimonial].company}</span></p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTestimonial(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentTestimonial === i ? 'bg-indigo-500 w-6' : 'bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS (PREÇOS) */}
      <section id="precos" className="py-24 border-t border-gray-900/40 bg-gray-950/10 max-w-7xl mx-auto px-6 relative z-10 text-center">
        <div className="space-y-4 max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Planos Flexíveis</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Escolha o combustível da sua máquina de virais
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Selecione o plano ideal para a sua produção de conteúdo. Atualize ou cancele de forma extremamente simples quando desejar.
          </p>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative bg-[#0d101d] border rounded-2xl p-6 text-left flex flex-col justify-between transition-transform duration-300 hover:scale-[1.01] ${
                plan.highlight
                  ? 'border-indigo-500 shadow-xl shadow-indigo-600/10 ring-1 ring-indigo-500/30 md:-translate-y-2'
                  : 'border-gray-900 hover:border-gray-800'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold font-mono uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg">
                  Recomendado para Criadores
                </span>
              )}

              <div>
                <h3 className="text-base font-bold text-white font-display">{plan.name}</h3>
                <p className="text-[11px] text-gray-400 mt-2 min-h-[36px]">{plan.desc}</p>

                <div className="my-6">
                  <span className="text-3xl font-extrabold text-white font-display">{plan.price}</span>
                  <span className="text-xs text-gray-500 font-medium"> / {plan.period}</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-900/80">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 block">Recursos inclusos:</span>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300 leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => navigate('/register')}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    plan.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-600/15'
                      : 'bg-gray-950 hover:bg-gray-900 border border-gray-850 text-gray-300 hover:text-white'
                  }`}
                >
                  <span>{plan.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ (ACCORDION) */}
      <section id="faq" className="py-24 border-t border-gray-900/40 max-w-3xl mx-auto px-6 relative z-10 text-center">
        <div className="space-y-4 mb-16">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Dúvidas Frequentes</span>
          <h2 className="text-3xl font-bold font-display text-white tracking-tight">
            Perguntas mais comuns
          </h2>
          <p className="text-gray-400 text-xs">
            Tudo o que você precisa saber sobre o funcionamento e o suporte do Viral Factory.
          </p>
        </div>

        {/* Accordions */}
        <div className="space-y-3 text-left">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-gray-900/35 border border-gray-900 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full px-5 py-4 flex items-center justify-between font-semibold text-xs md:text-sm text-gray-200 hover:text-white transition text-left focus:outline-none cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform duration-300 shrink-0 ml-3 ${
                    faqOpen === i ? 'rotate-180 text-indigo-400' : ''
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {faqOpen === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-5 pb-5 pt-1 text-[11px] md:text-xs text-gray-400 leading-relaxed border-t border-gray-950 bg-[#070911]/30">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 max-w-7xl mx-auto px-6 relative z-10">
        <div className="relative rounded-3xl overflow-hidden border border-gray-800/80 bg-gradient-to-br from-indigo-950/20 via-slate-950/90 to-purple-950/20 p-12 text-center shadow-2xl">
          
          {/* Subtle Ambient light behind visual content */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-indigo-300 uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5" /> Acelerador de Escala Ativo
            </span>
            <h2 className="text-4xl md:text-5xl font-bold font-display text-white tracking-tight leading-none">
              Comece agora e transforme sua produção de vídeos.
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-lg mx-auto">
              Junte-se a milhares de criadores e agências que escalaram seu tráfego orgânico gerando centenas de vídeos curtos em minutos.
            </p>

            <div className="pt-4 flex justify-center">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 hover:scale-[1.02]"
              >
                <span>Criar minha conta</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-gray-500 font-mono">
              Sem cartão de crédito necessário • Teste imediatamente
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-900/60 bg-gray-950/60 py-12 max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Brand */}
          <div className="space-y-4 text-left">
            <LogoFull iconSize={30} textClassName="text-base" subTextClassName="text-[9px]" />
            <p className="text-[11px] text-gray-500 leading-relaxed max-w-xs">
              A fábrica inteligente de vídeos virais verticalizados na nuvem, desenhada para criadores de alta performance.
            </p>
          </div>

          {/* Column 2: Links */}
          <div className="text-left space-y-3">
            <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Plataforma</h4>
            <div className="flex flex-col gap-2 text-xs text-gray-500">
              <button onClick={() => scrollToSection('recursos')} className="hover:text-white text-left transition">Recursos</button>
              <button onClick={() => scrollToSection('como-funciona')} className="hover:text-white text-left transition">Como Funciona</button>
              <button onClick={() => scrollToSection('demonstracao')} className="hover:text-white text-left transition">Demonstração</button>
              <button onClick={() => scrollToSection('precos')} className="hover:text-white text-left transition">Preços</button>
            </div>
          </div>

          {/* Column 3: Legal / Support */}
          <div className="text-left space-y-3">
            <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Suporte & Termos</h4>
            <div className="flex flex-col gap-2 text-xs text-gray-500">
              <button onClick={() => navigate('/help')} className="hover:text-white text-left transition">Central de Ajuda</button>
              <button onClick={() => navigate('/login')} className="hover:text-white text-left transition">Área de Membros</button>
              <span className="cursor-not-allowed">Termos de Uso</span>
              <span className="cursor-not-allowed">Política de Privacidade</span>
            </div>
          </div>

          {/* Column 4: Social placeholder */}
          <div className="text-left space-y-3">
            <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Comunidade</h4>
            <div className="flex flex-col gap-2 text-xs text-gray-500">
              <span className="cursor-pointer hover:text-white transition">Comunidade Discord</span>
              <span className="cursor-pointer hover:text-white transition">Instagram de Dicas</span>
              <span className="cursor-pointer hover:text-white transition">YouTube de Tutoriais</span>
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-gray-900/60 text-[10px] font-mono text-gray-600">
          <span>Viral Factory © 2026. Todos os direitos reservados.</span>
          <span>SaaS Internacional de Produção Massiva de Vídeo.</span>
        </div>
      </footer>

    </div>
  );
};
