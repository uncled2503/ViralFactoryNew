/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
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
  Eye,
  Cloud,
  Activity,
  ChevronDown,
  Check,
  CheckSquare,
  Play,
  LayoutGrid,
  FolderOpen,
  Menu,
  X
} from 'lucide-react';

// Section background tones — subtle variations within the brand's dark/indigo/violet palette,
// used to differentiate sections without introducing new hues.
const TONE_VOID = '#03050a';   // matches the page base — open, seamless sections
const TONE_INDIGO = '#080b16'; // faint indigo-tinted panel
const TONE_VIOLET = '#0b0814'; // faint violet-tinted panel
const TONE_FOOTER = '#05060c'; // darkest, closing tone

// Full-bleed wave divider placed between sections (own document flow, never overlaps content).
// Each divider is one full wave cycle — a clear descent followed by a clear rise (or the reverse) —
// with strong amplitude so the curve reads clearly, not a flat ripple.
// `from`/`to` are set explicitly so the seam always matches its neighbors, regardless of layout above/below.
const WAVE_PATHS = [
  'M0,40 C360,40 360,170 720,170 C1080,170 1080,30 1440,30 L1440,200 L0,200 Z', // down, then up
  'M0,160 C360,160 360,30 720,30 C1080,30 1080,180 1440,180 L1440,200 L0,200 Z', // up, then down
  'M0,30 C300,30 300,180 620,180 C1000,180 1050,60 1440,60 L1440,200 L0,200 Z' // steep down, gentle up
];

const WaveDivider: React.FC<{ from: string; to: string; variant?: number }> = ({ from, to, variant = 0 }) => (
  <div aria-hidden="true" className="relative w-full h-24 md:h-40 overflow-hidden" style={{ backgroundColor: from }}>
    <svg
      className="absolute inset-x-0 bottom-0 w-full h-full"
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      fill="none"
    >
      <path d={WAVE_PATHS[variant % WAVE_PATHS.length]} fill={to} />
    </svg>
  </div>
);

// Scroll-reveal wrapper used across every section — fades/slides content in once as it enters
// the viewport. Wrapped app-wide in <MotionConfig reducedMotion="user">, so this automatically
// turns into an instant, no-motion appearance when the OS requests reduced motion.
const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}> = ({
  children,
  delay = 0,
  y = 24,
  className,
  onMouseEnter,
  onMouseLeave
}) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.6, ease: 'easeOut', delay }}
    className={className}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    {children}
  </motion.div>
);

const examplePages = [
  { id: 1, image: '/assets/02-uAy4VjXQ.webp', title: '@filosofia_ancestral', views: '1.4M views', category: 'Citações' },
  { id: 2, image: '/assets/03-B2jCMS6j.webp', title: '@dica_de_riqueza', views: '2.1M views', category: 'Finanças' },
  { id: 3, image: '/assets/04-BANhblpL.webp', title: '@rainha_das_novelas', views: '3.8M views', category: 'Cortes' },
  { id: 4, image: '/assets/06-BCOSIrKe.webp', title: '@mentalidade_oculta', views: '2.5M views', category: 'Motivação' },
  { id: 5, image: '/assets/07-xAqbZkQu.webp', title: '@cortes_de_series', views: '1.9M views', category: 'Cinema' },
  { id: 6, image: '/assets/08-DDZBl70i.webp', title: '@futebol_resenha', views: '4.1M views', category: 'Futebol' },
  { id: 7, image: '/assets/09-sQPdEBK6.webp', title: '@reflexao_diaria', views: '2.3M views', category: 'Poesia' },
  { id: 8, image: '/assets/10-D-kzC9r3.webp', title: '@curiosidade_global', views: '1.1M views', category: 'Curiosidades' },
  { id: 9, image: '/assets/11-Bd_y7XPb.webp', title: '@zicada_futebol', views: '1.7M views', category: 'Futebol' },
  { id: 10, image: '/assets/12-Bq0AnmXJ.webp', title: '@estetica_escura', views: '980K views', category: 'Estilo de Vida' },
  { id: 11, image: '/assets/13-_LniUGFI.webp', title: '@regras_devida', views: '2.9M views', category: 'Disciplina' },
  { id: 12, image: '/assets/14-CPvLg7dt.webp', title: '@sucesso_financeiro', views: '3.4M views', category: 'Negócios' }
];

export const LandingPage: React.FC = () => {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<'template' | 'posicionamento' | 'videos' | 'renderizacao'>('posicionamento');
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

  // Demo tab data — reflects the real 4-stage product flow (template → posicionamento → vídeos → renderização)
  const demoTabs = {
    template: {
      title: 'Template selecionado',
      badge: 'Estrutura visual do lote',
      desc: 'Escolha um template pronto ou envie seu próprio background — ele vira a estrutura visual aplicada a todos os vídeos do lote.',
      content: (
        <div className="space-y-3 font-sans text-left">
          <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent pointer-events-none" />
            <span className="text-[8px] uppercase tracking-wider font-mono text-indigo-400 font-semibold block">Template ativo</span>
            <h3 className="text-xs font-bold text-gray-100 mt-0.5">background_estudio_dark.mp4</h3>
            <p className="text-[10px] text-gray-400 mt-1">Servirá de estrutura visual para todos os vídeos deste lote.</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              'from-orange-600/10 to-orange-500/5 border-orange-500/20',
              'from-indigo-600/15 to-indigo-500/5 border-indigo-500/50 ring-1 ring-indigo-500/40',
              'from-blue-600/10 to-blue-500/5 border-blue-500/20'
            ].map((c, i) => (
              <div key={i} className={`bg-gradient-to-br ${c} h-16 rounded-lg border flex items-center justify-center`}>
                {i === 1 && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
              </div>
            ))}
          </div>
        </div>
      )
    },
    posicionamento: {
      title: 'Área do vídeo dentro do template',
      badge: 'Posicionamento preciso',
      desc: 'Arraste, redimensione e trave a área exata onde cada vídeo do lote será encaixado dentro do template.',
      content: (
        <div className="relative bg-slate-950 rounded-xl border border-gray-900 h-[220px] flex items-center justify-center overflow-hidden">
          <div className="relative h-[85%] aspect-[9/16] bg-gray-900/80 rounded-lg overflow-hidden border border-gray-800">
            <div className="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:14px_14px]" />
            {/* Selected video area (bounding box) */}
            <div className="absolute left-[16%] top-[24%] right-[16%] bottom-[24%] border border-pink-400/80 bg-indigo-500/10">
              <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-pink-500/60 -translate-x-1/2" />
              <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-pink-500/60 -translate-y-1/2" />
              {['-top-1.5 -left-1.5', '-top-1.5 -right-1.5', '-bottom-1.5 -left-1.5', '-bottom-1.5 -right-1.5'].map((pos, i) => (
                <span key={i} className={`absolute ${pos} w-2.5 h-2.5 rounded-full bg-white border-2 border-indigo-600 shadow`} />
              ))}
            </div>
          </div>
          <div className="absolute bottom-3 left-3 text-[9px] font-mono text-gray-500 bg-gray-950/80 px-2 py-1 rounded border border-gray-900">760 × 980 px</div>
        </div>
      )
    },
    videos: {
      title: 'Envio do lote de vídeos',
      badge: 'Upload em lote',
      desc: 'Adicione todo o lote que deseja processar de uma só vez — o mesmo template é aplicado a cada arquivo enviado.',
      content: (
        <div className="space-y-1.5">
          {['clipe_001.mp4', 'clipe_002.mp4', 'clipe_003.mp4', 'clipe_004.mp4', 'clipe_005.mp4'].map((name, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] bg-gray-900/40 p-2 rounded-lg border border-gray-800/50">
              <span className="font-mono text-gray-300 flex items-center gap-2">
                <Video className="w-3 h-3 text-indigo-400" /> {name}
              </span>
              <span className="text-[8px] text-emerald-400 font-mono">Pronto</span>
            </div>
          ))}
          <div className="text-[9px] text-gray-500 font-mono pt-1.5">+ 45 arquivos no lote</div>
        </div>
      )
    },
    renderizacao: {
      title: 'Renderização do lote',
      badge: 'Processamento em fila',
      desc: 'O sistema aplica o template a cada vídeo, trata os metadados dos arquivos e entrega o lote finalizado.',
      content: (
        <div className="space-y-3 font-sans">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-300">Lote #142</span>
            <span className="text-indigo-400 font-mono font-bold">75% CONCLUÍDO</span>
          </div>
          <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-3/4 rounded-full" />
          </div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {[
              { id: 'clipe_001.mp4', status: 'Finalizado', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
              { id: 'clipe_002.mp4', status: 'Finalizado', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
              { id: 'clipe_003.mp4', status: 'Tratando metadados...', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 animate-pulse' },
              { id: 'clipe_004.mp4', status: 'Na fila', color: 'text-gray-400 bg-gray-800 border-gray-700' }
            ].map((v, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] bg-gray-900/40 p-2 rounded-lg border border-gray-800/50">
                <span className="font-mono text-gray-300">{v.id}</span>
                <span className={`px-2 py-0.5 rounded text-[8px] border font-mono font-bold tracking-wider ${v.color}`}>{v.status}</span>
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
      name: 'Tayse Cardoso',
      role: 'Criadora de Conteúdo',
      company: 'Digital Creator',
      quote: 'O Viral Factory revolucionou nossa operação. Conseguimos criar 120 shorts personalizados para nossos clientes em menos de 15 minutos. A qualidade visual é simplesmente premium.',
      avatar: '/assets/taysecardoso.jpg',
      rating: 5
    },
    {
      name: 'Paulo de Borba Moraes',
      role: 'Produtor e Gestor',
      company: 'Moraes Media',
      quote: 'Ter dezenas de vídeos prontos para a semana toda me salvou de um cansaço absurdo. O Viral Factory me dá o suporte ideal para dominar os algoritmos e crescer muito mais rápido.',
      avatar: '/assets/paulodeborbamoraes.jpg',
      rating: 5
    },
    {
      name: 'Rogerio Dorx',
      role: 'Head de Growth',
      company: 'Dorx Digital',
      quote: 'Antes levávamos dias editando vídeos manualmente para o TikTok e Reels. Hoje, montamos um template no editor e exportamos em lote de forma incrivelmente rápida e padronizada.',
      avatar: '/assets/rogeriodorx.jpg',
      rating: 5
    },
    {
      name: 'Studio Evellynn',
      role: 'Especialista em Social Media',
      company: 'Evellynn Agency',
      quote: 'A facilidade de programar as automações de legendas inteligentes com o Viral Factory decolou minhas visualizações. Consegui triplicar o engajamento sem precisar passar horas editando.',
      avatar: '/assets/studio.evellynn.jpg',
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
      a: 'Você envia um template (background) e define exatamente a área onde o vídeo vai ser posicionado. Depois, envia o lote de vídeos que deseja processar. O Viral Factory aplica o template a cada vídeo do lote e renderiza tudo na nuvem ao mesmo tempo, entregando os arquivos finalizados e prontos para publicar.'
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
    <MotionConfig reducedMotion="user">
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
            <LogoFull iconSize={120} />
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
          <Reveal y={16} className="lg:col-span-7 space-y-8 text-left">

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
          </Reveal>

          {/* Hero Right Visual — Render Core Pipeline Illustration */}
          <Reveal y={16} delay={0.15} className="lg:col-span-5 relative flex justify-center lg:justify-end">

            {/* Ambient Purple Soft Glow behind illustration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[26rem] h-[26rem] bg-indigo-500/20 blur-[110px] rounded-full pointer-events-none" />

            <div className="relative w-full max-w-[380px] sm:max-w-[440px] lg:max-w-[520px]">
              <img
                src="/assets/hero-render-core.webp"
                alt="Template e lote de vídeos sendo processados pelo Viral Factory até se tornarem vários vídeos finalizados"
                width={1122}
                height={1402}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="relative z-10 w-full h-auto"
              />

              {/* Floating Badge — Top Right */}
              <div className="absolute top-6 right-0 sm:-right-2 z-20 bg-indigo-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1 border border-indigo-400/30 animate-bounce">
                <Sparkles className="w-3 h-3" />
                100x Mais Rápido
              </div>

              {/* Floating Badge — Bottom Left */}
              <div className="absolute bottom-8 left-0 sm:-left-2 z-20 bg-gray-900 border border-gray-800 text-gray-300 text-[10px] font-mono px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Fila de Processamento Ativa
              </div>
            </div>
          </Reveal>

        </div>
      </section>

      <WaveDivider from={TONE_VOID} to={TONE_INDIGO} variant={0} />

      {/* PROVA SOCIAL / STATS SECTION */}
      <section className="relative z-10" style={{ backgroundColor: TONE_INDIGO }}>
        <div className="py-16 md:py-20 max-w-7xl mx-auto px-6">

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
        </div>
      </section>

      <WaveDivider from={TONE_INDIGO} to={TONE_VOID} variant={1} />

      {/* COMO FUNCIONA — PIPELINE DE 4 ETAPAS */}
      <section id="como-funciona" className="relative z-10" style={{ backgroundColor: TONE_VOID }}>
        <div className="py-24 md:py-28 max-w-7xl mx-auto px-6 text-center">
        <Reveal className="space-y-4 max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Metodologia</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Como usar o <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-extrabold">Viral Factory?</span>
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Configure uma vez. Envie o lote. Renderize em escala — sem repetir o mesmo trabalho vídeo por vídeo.
          </p>
        </Reveal>

        {/* 4-Step Pipeline */}
        <div className="relative max-w-6xl mx-auto">

          {/* Desktop connector line — draws left to right as it enters view, then the glow node keeps traveling */}
          <div className="hidden md:block absolute top-[92px] left-[12.5%] right-[12.5%] h-px z-0">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.1 }}
              style={{ transformOrigin: 'left' }}
              className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/25 to-indigo-500/0"
            />
            <div className="pipeline-glow-node hidden motion-safe:block" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6 relative">
            {[
              {
                step: '01',
                title: 'Envie seu template',
                desc: 'Envie o background ou template que será aplicado aos seus vídeos.',
                image: '/assets/step-template.webp'
              },
              {
                step: '02',
                title: 'Defina a área do vídeo',
                desc: 'Escolha exatamente onde e em qual tamanho o conteúdo será exibido.',
                image: '/assets/step-position.webp'
              },
              {
                step: '03',
                title: 'Envie seus vídeos',
                desc: 'Adicione todo o lote que deseja processar de uma só vez.',
                image: '/assets/step-batch.webp'
              },
              {
                step: '04',
                title: 'Renderize tudo',
                desc: 'A Viral Factory aplica o template, processa os arquivos e entrega o lote finalizado.',
                image: '/assets/step-render.webp'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 + i * 0.22 }}
                className="relative z-10 flex flex-col items-center"
              >

                {/* Mobile vertical connector */}
                {i > 0 && (
                  <div className="md:hidden relative w-px h-10 -mt-2 mb-2 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/0 via-indigo-500/30 to-indigo-500/0" />
                  </div>
                )}

                {/* Step illustration — transparent asset, no card/frame */}
                <div className="w-full max-w-[168px] aspect-square flex items-center justify-center">
                  <img
                    src={item.image}
                    alt=""
                    aria-hidden="true"
                    width={1254}
                    height={1254}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Step number node (sits on the pipeline line) */}
                <span className="relative z-10 -mt-2 mb-3 bg-gradient-to-r from-indigo-600 to-indigo-500 border border-indigo-400/30 text-[10px] font-mono font-bold text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg shadow-indigo-950">
                  {item.step}
                </span>

                <h3 className="text-xs font-bold text-gray-200 mb-2 font-display uppercase tracking-wider">
                  {item.title}
                </h3>
                <p className="text-[11px] text-gray-400 leading-relaxed max-w-[220px] text-center">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
        </div>
      </section>

      <WaveDivider from={TONE_VOID} to={TONE_INDIGO} variant={2} />

      {/* BENEFÍCIOS (PREMIUM BENTO GRID) */}
      <section id="recursos" className="relative z-10" style={{ backgroundColor: TONE_INDIGO }}>
        <div className="py-24 md:py-28 max-w-7xl mx-auto px-6">
        <Reveal className="space-y-4 max-w-2xl mx-auto mb-16 text-center">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Recursos de Alto Nível</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Tudo para produzir vídeos em escala
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Automatize tarefas repetitivas e transforme um template em dezenas de vídeos finalizados.
          </p>
        </Reveal>

        {/* Bento Grid — varied card weights + color-coded icon chips, dense auto-flow to close gaps */}
        <Reveal delay={0.1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-row-dense">
          {[
            {
              title: 'Produção em Escala',
              desc: 'Gere lotes enormes de vídeos curtos verticalizados prontos de uma só vez.',
              icon: <Zap className="w-4.5 h-4.5 text-indigo-400" />,
              tint: 'indigo',
              span: true
            },
            {
              title: 'Templates Reutilizáveis',
              desc: 'Salve seus layouts vencedores e repita fórmulas de sucesso indefinidamente.',
              icon: <Layers className="w-4.5 h-4.5 text-purple-400" />,
              tint: 'purple'
            },
            {
              title: 'Legendas Automáticas',
              desc: 'Sincronização impecável com realce dinâmico por palavra para manter retenção alta.',
              icon: <Play className="w-4.5 h-4.5 text-pink-400" />,
              tint: 'pink'
            },
            {
              title: 'Uploads em Lote',
              desc: 'Envie múltiplos assets de fundo simultaneamente sem travar seu navegador.',
              icon: <Cloud className="w-4.5 h-4.5 text-indigo-400" />,
              tint: 'indigo'
            },
            {
              title: 'Headlines Dinâmicas',
              desc: 'Varie e teste diferentes títulos para descobrir o que gera mais cliques de curiosidade.',
              icon: <Sparkles className="w-4.5 h-4.5 text-purple-400" />,
              tint: 'purple'
            },
            {
              title: 'Organização por Projetos',
              desc: 'Pastas dedicadas por nicho, marca ou canal para manter sua operação em ordem.',
              icon: <FolderOpen className="w-4.5 h-4.5 text-pink-400" />,
              tint: 'pink'
            },
            {
              title: 'Renderização em Massa',
              desc: 'Nossa fila concorrente processa seus lotes na nuvem sem consumir sua RAM.',
              icon: <Activity className="w-4.5 h-4.5 text-indigo-400" />,
              tint: 'indigo',
              span: true
            },
            {
              title: 'Pré-visualização Rápida',
              desc: 'Veja exatamente como cada variação do seu lote ficará antes de iniciar o render.',
              icon: <Eye className="w-4.5 h-4.5 text-purple-400" />,
              tint: 'purple'
            },
            {
              title: 'Automação Completa',
              desc: 'Deixe o trabalho chato e repetitivo de edição manual no passado de uma vez por todas.',
              icon: <CheckSquare className="w-4.5 h-4.5 text-pink-400" />,
              tint: 'pink'
            },
            {
              title: 'Dashboard Intuitivo',
              desc: 'Métricas visuais que mostram o tempo poupado e o volume da sua esteira criativa.',
              icon: <LayoutGrid className="w-4.5 h-4.5 text-indigo-400" />,
              tint: 'indigo'
            },
            {
              title: 'Sincronização na Nuvem',
              desc: 'Seus projetos salvos de forma segura e acessíveis de qualquer computador.',
              icon: <Globe className="w-4.5 h-4.5 text-purple-400" />,
              tint: 'purple'
            },
            {
              title: 'Sistema Multiusuário',
              desc: 'Pronto para receber sua equipe de roteiristas ou gestores de conteúdo no futuro.',
              icon: <Users className="w-4.5 h-4.5 text-pink-400" />,
              tint: 'pink'
            }
          ].map((item, i) => {
            const chip = {
              indigo: 'bg-indigo-500/10 border-indigo-500/20',
              purple: 'bg-purple-500/10 border-purple-500/20',
              pink: 'bg-pink-500/10 border-pink-500/20'
            }[item.tint];
            return (
              <div
                key={i}
                className={`bg-gray-900/40 border border-gray-900/80 hover:border-gray-800 hover:bg-gray-900/60 p-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group text-left ${item.span ? 'lg:col-span-2' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl ${chip} border flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  {item.icon}
                </div>
                <h3 className="text-sm font-bold text-gray-100 font-display mb-1.5">{item.title}</h3>
                <p className="text-[12px] text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </Reveal>
        </div>
      </section>

      <WaveDivider from={TONE_INDIGO} to={TONE_VOID} variant={0} />

      {/* CONHEÇA A PLATAFORMA POR DENTRO */}
      <section id="demonstracao" className="relative z-10" style={{ backgroundColor: TONE_VOID }}>
        <div className="py-24 md:py-28 max-w-7xl mx-auto px-6">
        <Reveal className="space-y-4 max-w-2xl mb-12 text-left">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Fluxo Real do Produto</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight leading-none">
            Conheça a Plataforma por dentro
          </h2>
          <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
            Template, posicionamento, lote e renderização — as quatro etapas reais que levam do seu template a um lote de vídeos finalizados.
          </p>
        </Reveal>

        {/* Segmented Tab Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'template', label: 'Template' },
            { id: 'posicionamento', label: 'Posicionamento' },
            { id: 'videos', label: 'Vídeos' },
            { id: 'renderizacao', label: 'Renderização' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-4 py-2.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600/10 border-indigo-500/30 text-white'
                  : 'bg-transparent border-gray-900 text-gray-400 hover:text-gray-200 hover:bg-gray-900/40'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div layoutId="active-tab-indicator" className="absolute inset-0 rounded-xl border border-indigo-500/30 bg-indigo-600/10 -z-10" />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Large Product Display */}
        <Reveal delay={0.1} className="w-full bg-[#0b0f19]/90 border border-gray-800/80 rounded-2xl p-5 md:p-8 shadow-2xl relative">
          <div className="flex items-center gap-1.5 mb-6 border-b border-gray-900 pb-3 text-left">
            <div className="w-2 h-2 rounded-full bg-gray-700" />
            <span className="text-[10px] text-gray-500 font-mono">viral_factory_workspace / {activeTab}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="text-left order-2 lg:order-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="inline-flex items-center gap-1.5 text-[9px] font-mono text-indigo-400 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 uppercase">
                    {demoTabs[activeTab].badge}
                  </div>
                  <h3 className="text-lg font-bold text-white font-display mt-3">{demoTabs[activeTab].title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mt-2 max-w-md">
                    {demoTabs[activeTab].desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="order-1 lg:order-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="bg-[#03050a]/60 border border-gray-900/80 rounded-xl p-4 min-h-[260px] flex flex-col justify-center"
                >
                  {demoTabs[activeTab].content}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
        </div>
      </section>

      <WaveDivider from={TONE_VOID} to={TONE_VIOLET} variant={1} />

      {/* COMPARAÇÃO (PRODUÇÃO MANUAL VS PRODUÇÃO COM VIRAL FACTORY) */}
      <section className="relative z-10" style={{ backgroundColor: TONE_VIOLET }}>
        <div className="py-24 md:py-28 max-w-7xl mx-auto px-6 text-center">
        <Reveal className="space-y-4 max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Comparativo de Processo</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Configure uma vez. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Renderize o lote inteiro.</span>
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Compare o processo manual, repetido vídeo por vídeo, com o pipeline automatizado do Viral Factory.
          </p>
        </Reveal>

        {/* Side by Side Comparison Layout */}
        <Reveal delay={0.1} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto items-start">

          {/* PRODUÇÃO MANUAL CARD */}
          <div className="bg-gradient-to-b from-red-950/10 to-transparent border border-red-500/10 rounded-2xl p-8 text-left shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full pointer-events-none" />

            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-900/60">
              <span className="bg-red-500/10 text-red-400 text-[10px] font-mono uppercase px-3 py-1 rounded-lg border border-red-500/25 font-bold">
                Produção manual
              </span>
            </div>

            <ol className="space-y-3 text-xs text-gray-400">
              {[
                "Abrir editor",
                "Importar template/background",
                "Importar vídeo",
                "Posicionar manualmente",
                "Ajustar escala/enquadramento",
                "Exportar",
                "Esperar renderização",
                "Repetir para o próximo",
                "Organizar arquivos"
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5 text-red-400 font-bold text-[10px] font-mono">
                    {i + 1}
                  </div>
                  <span className="leading-relaxed">{text}</span>
                </li>
              ))}
            </ol>

            <p className="text-[11px] text-red-300/80 mt-6 pt-4 border-t border-gray-900/60 leading-relaxed">
              O processo inteiro precisa ser repetido para cada vídeo.
            </p>
          </div>

          {/* Mobile transformation arrow */}
          <div className="md:hidden flex justify-center -my-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
              <ChevronDown className="w-4 h-4 text-indigo-400" />
            </div>
          </div>

          {/* PRODUÇÃO COM VIRAL FACTORY CARD */}
          <div className="bg-gradient-to-b from-indigo-950/20 to-transparent border border-indigo-500/30 rounded-2xl p-8 text-left shadow-2xl relative overflow-hidden ring-1 ring-indigo-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-900/60">
              <span className="bg-indigo-500/10 text-indigo-300 text-[10px] font-mono uppercase px-3 py-1 rounded-lg border border-indigo-500/25 font-bold">
                Produção com Viral Factory
              </span>
            </div>

            <ol className="space-y-3 text-xs text-gray-300">
              {[
                "Envie o template",
                "Defina a área uma vez",
                "Envie o lote",
                "Inicie a renderização",
                "O sistema aplica os conteúdos",
                "Receba os outputs",
                "Metadados tratados no fluxo"
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3 group">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400 font-bold text-[10px] font-mono group-hover:scale-110 transition-transform">
                    {i + 1}
                  </div>
                  <span className="leading-relaxed font-medium text-gray-200">{text}</span>
                </li>
              ))}
            </ol>

            <p className="text-[11px] text-indigo-300/90 mt-6 pt-4 border-t border-gray-900/60 leading-relaxed">
              Configure uma vez e processe o lote inteiro.
            </p>
          </div>

        </Reveal>

        {/* Scale comparison strip */}
        <Reveal delay={0.15} className="max-w-3xl mx-auto mt-12 pt-10 border-t border-gray-900/40">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-6">Exemplo de escala — 50 vídeos</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <div className="text-center">
              <p className="text-sm font-bold text-red-300/90 font-display">Manual</p>
              <p className="text-[11px] text-gray-500 mt-1">repetir o processo 50×</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-700 rotate-90 sm:rotate-0 shrink-0" />
            <div className="text-center">
              <p className="text-sm font-bold text-indigo-300 font-display">Viral Factory</p>
              <p className="text-[11px] text-gray-500 mt-1">1 configuração + 1 lote</p>
            </div>
          </div>
        </Reveal>
        </div>
      </section>

      <WaveDivider from={TONE_VIOLET} to={TONE_INDIGO} variant={2} />

      {/* EXEMPLOS DE SUCESSO (AUTOPLAY SMARTPHONE CAROUSEL) */}
      <section id="exemplos" className="relative z-10" style={{ backgroundColor: TONE_INDIGO }}>
        <div className="py-24 md:py-28 max-w-7xl mx-auto px-6 text-center overflow-hidden">
        <Reveal className="space-y-4 max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Produção Real</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Resultados produzidos com o Viral Factory
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Cada miniatura abaixo é um vídeo final, gerado a partir de um template configurado uma única vez e aplicado a um lote inteiro.
          </p>
        </Reveal>

        {/* Carousel Container */}
        <div className="relative max-w-full mx-auto overflow-hidden">
          {/* Subtle Ambient light behind visual content */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 blur-[120px] pointer-events-none z-0" />

          {/* Infinite Scrolling Track */}
          <div className="overflow-hidden w-full py-4 relative z-10">
            <div className="animate-infinite-scroll flex gap-6">
              {[...examplePages, ...examplePages].map((page, index) => (
                <div 
                  key={`${page.id}-${index}`}
                  className="flex-shrink-0 w-[240px] sm:w-[265px] bg-[#0c0f1a] border-4 border-gray-800/80 rounded-[34px] shadow-xl overflow-hidden p-2 select-none relative group transition-all duration-500 hover:border-indigo-500/60 hover:scale-[1.02]"
                >
                  {/* Camera Notch / Speaker Mockup */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-[#0c0f1a] rounded-b-xl z-30 flex items-center justify-center">
                    <div className="w-10 h-0.5 bg-gray-800 rounded-full mb-1" />
                  </div>

                  {/* Vertical Image 9:16 aspect ratio */}
                  <div className="w-full aspect-[9/16] rounded-[26px] overflow-hidden relative bg-[#06080e]">
                    <img 
                      src={`${page.image}?v=2`} 
                      alt={page.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    
                    {/* Subtle dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-90 transition-opacity duration-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </section>

      <WaveDivider from={TONE_INDIGO} to={TONE_VOID} variant={0} />

      {/* DEPOIMENTOS (AUTOPLAY CAROUSEL) */}
      <section id="depoimentos" className="relative z-10" style={{ backgroundColor: TONE_VOID }}>
        <div className="py-24 md:py-28 max-w-7xl mx-auto px-6 text-center">
        <Reveal className="space-y-4 max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Depoimentos Reais</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Aprovado pelos maiores estrategistas
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Quem experimentou a automação em massa de vídeos curtos não consegue voltar a editar manualmente.
          </p>
        </Reveal>

        {/* Carousel Card Wrapper */}
        <Reveal
          delay={0.1}
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
                  className="w-10 h-10 rounded-full object-cover border border-indigo-500/30"
                  referrerPolicy="no-referrer"
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
        </Reveal>
        </div>
      </section>

      <WaveDivider from={TONE_VOID} to={TONE_VIOLET} variant={1} />

      {/* PLANOS (PREÇOS) */}
      <section id="precos" className="relative z-10" style={{ backgroundColor: TONE_VIOLET }}>
        <div className="py-24 md:py-28 max-w-7xl mx-auto px-6 text-center">
        <Reveal className="space-y-4 max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Planos Flexíveis</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white tracking-tight">
            Escolha o combustível da sua máquina de virais
          </h2>
          <p className="text-gray-400 text-xs md:text-sm">
            Selecione o plano ideal para a sua produção de conteúdo. Atualize ou cancele de forma extremamente simples quando desejar.
          </p>
        </Reveal>

        {/* Plan Cards Grid */}
        <Reveal delay={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
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
        </Reveal>
        </div>
      </section>

      <WaveDivider from={TONE_VIOLET} to={TONE_VOID} variant={2} />

      {/* FAQ (ACCORDION) */}
      <section id="faq" className="relative z-10" style={{ backgroundColor: TONE_VOID }}>
        <div className="py-24 md:py-28 max-w-3xl mx-auto px-6 text-center">
        <Reveal className="space-y-4 mb-16">
          <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">Dúvidas Frequentes</span>
          <h2 className="text-3xl font-bold font-display text-white tracking-tight">
            Perguntas mais comuns
          </h2>
          <p className="text-gray-400 text-xs">
            Tudo o que você precisa saber sobre o funcionamento e o suporte do Viral Factory.
          </p>
        </Reveal>

        {/* Accordions */}
        <Reveal delay={0.1} className="space-y-3 text-left">
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
        </Reveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 max-w-7xl mx-auto px-6 relative z-10">
        <Reveal className="relative rounded-3xl overflow-hidden border border-gray-800/80 bg-gradient-to-br from-indigo-950/20 via-slate-950/90 to-purple-950/20 p-12 text-center shadow-2xl">

          {/* Subtle Ambient light behind visual content */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-8">

            {/* Closing pipeline motif — template + lote → processamento → outputs (decorative) */}
            <div className="hidden sm:flex items-center justify-center gap-3 opacity-[0.18] pointer-events-none" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <Video key={`in-${i}`} className="w-5 h-5 text-indigo-300" />
              ))}
              <ArrowRight className="w-4 h-4 text-gray-500 mx-2" />
              <Layers className="w-6 h-6 text-purple-300" />
              <ArrowRight className="w-4 h-4 text-gray-500 mx-2" />
              {[0, 1, 2].map((i) => (
                <CheckCircle2 key={`out-${i}`} className="w-5 h-5 text-indigo-300" />
              ))}
            </div>

            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-indigo-300 uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5" /> Pipeline pronto para o seu lote
            </span>
            <h2 className="text-4xl md:text-5xl font-bold font-display text-white tracking-tight leading-none">
              Comece agora e transforme sua produção de vídeos.
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-lg mx-auto">
              Configure um template, envie o lote e receba seus vídeos finalizados prontos para publicar — em escala, sem repetir o processo a cada arquivo.
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
        </Reveal>
      </section>

      <WaveDivider from={TONE_VOID} to={TONE_FOOTER} variant={0} />

      {/* FOOTER */}
      <footer className="relative z-10" style={{ backgroundColor: TONE_FOOTER }}>
        <div className="py-12 max-w-7xl mx-auto px-6">
        <Reveal y={16} className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Column 1: Brand */}
          <div className="space-y-4 text-left">
            <LogoFull iconSize={90} />
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

        </Reveal>

        {/* Bottom copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-gray-900/60 text-[10px] font-mono text-gray-600">
          <span>Viral Factory © 2026. Todos os direitos reservados.</span>
          <span>SaaS Internacional de Produção Massiva de Vídeo.</span>
        </div>
        </div>
      </footer>

    </div>
    </MotionConfig>
  );
};
