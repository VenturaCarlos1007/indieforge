import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Users, FolderKanban, Upload, Columns3,
  MessageSquare, Zap, ArrowRight, Github,
  Check, Star, Twitter, Folder, Play, ChevronRight,
  Menu, X,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

const FEATURES = [
  { icon: FolderKanban, title: 'Gestión de Proyectos',   desc: 'Organiza tus juegos indie con dashboards inteligentes y seguimiento de progreso en tiempo real.', color: '#FF6B00' },
  { icon: Upload,       title: 'Assets con Versionado',  desc: 'Sube y gestiona arte, audio, modelos 3D con versionado automático y restauración instantánea.', color: '#22d3ee' },
  { icon: Columns3,     title: 'Kanban Visual',           desc: 'Tableros drag & drop con columnas personalizadas para tu pipeline de desarrollo.', color: '#fbbf24' },
  { icon: Users,        title: 'Colaboración en Equipo',  desc: 'Invita artistas, programadores y diseñadores. Asigna roles y permisos granulares.', color: '#34d399' },
  { icon: MessageSquare,title: 'Comentarios en Hilos',    desc: 'Feedback contextual en cada asset con hilos de discusión y resolución integrada.', color: '#f472b6' },
  { icon: Zap,          title: 'Tiempo Real',             desc: 'Socket.io integrado para ver cambios al instante. Sin recargar, sin esperas.', color: '#fb923c' },
];

const STEPS = [
  { n: '01', icon: Folder, title: 'Crea tu proyecto',         desc: 'Configura tu espacio de trabajo en segundos e invita a tu equipo de inmediato.', color: '#FF6B00' },
  { n: '02', icon: Users,  title: 'Colabora en tiempo real',  desc: 'Gestiona assets, tareas y feedback desde un solo lugar. Todo sincronizado al instante.', color: '#22d3ee' },
  { n: '03', icon: Play,   title: 'Lanza tu juego',           desc: 'Mantén el momentum con herramientas que se adaptan a tu ritmo de desarrollo.', color: '#34d399' },
];

const STATS = [
  { value: '500+',   label: 'Proyectos creados' },
  { value: '1,200+', label: 'Desarrolladores' },
  { value: '50K+',   label: 'Assets subidos' },
  { value: '4.9★',   label: 'Valoración media' },
];

const PLANS = [
  {
    name: 'Cipote', price: '$0', period: 'para siempre',
    desc: 'Para el cipote que está empezando',
    color: '#1E90FF', primary: false, cta: 'Empezar gratis',
    btnClass: 'btn-secondary py-2.5',
    btnStyle: { borderColor: '#1E90FF50', color: '#1E90FF' },
    features: ['Hasta 2 proyectos', '3 miembros por proyecto', '1GB de assets', 'Kanban básico', 'Chat del proyecto'],
  },
  {
    name: 'Chero', price: '$9.99', period: '/mes',
    desc: 'Para vos y tu crew',
    color: '#FF6B00', primary: true, cta: 'Comenzar prueba', badge: 'MÁS POPULAR',
    btnClass: 'btn-primary',
    btnStyle: {},
    features: ['Proyectos ilimitados', '10 miembros por proyecto', '10GB de assets', 'Boards por engine', 'Milestones y etiquetas', 'Proyectos públicos'],
  },
  {
    name: 'Cabal', price: '$24.99', period: '/mes',
    desc: 'Para el estudio establecido',
    color: '#1E90FF', primary: false, cta: 'Comenzar prueba', badge: 'ESTUDIO',
    btnClass: 'btn-secondary py-2.5',
    btnStyle: { borderColor: '#1E90FF50', color: '#1E90FF' },
    features: ['Todo lo del plan Chero', 'Miembros ilimitados', '100GB de assets', 'Proyectos públicos ilimitados', 'Soporte prioritario', 'Acceso anticipado a nuevas funciones'],
  },
];

const TESTIMONIALS = [
  {
    name: 'María García',
    role: 'Lead Artist · Pixel Storm',
    text: 'CipoteForge cambió completamente cómo gestionamos assets. El versionado automático nos salvó de perder semanas de trabajo.',
    color: '#FF6B00', initial: 'M',
  },
  {
    name: 'Carlos Ruiz',
    role: 'Solo Indie Developer',
    text: 'Por fin una herramienta pensada para devs indie. El kanban y la colaboración en tiempo real son exactamente lo que necesitaba.',
    color: '#22d3ee', initial: 'C',
  },
  {
    name: 'Ana Torres',
    role: 'Producer · Forge Games',
    text: 'Coordinamos 8 personas desde distintos países sin ningún problema. Imprescindible para cualquier estudio indie serio.',
    color: '#34d399', initial: 'A',
  },
];

/* ── App Mockup ──────────────────────────────────── */
function AppMockup() {
  return (
    <motion.div className="relative"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
      <div className="absolute inset-0 rounded-3xl blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, #FF6B00, #06B6D4)' }} />

      <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#0c0b18', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-1.5">
            {['#f87171','#fbbf24','#34d399'].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c, opacity: 0.7 }} />)}
          </div>
          <div className="flex-1 mx-3 rounded-md py-1 px-3 text-[10px] text-surface-500 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
            app.cipoteforge.io / project / zombie-rpg
          </div>
        </div>

        {/* Dashboard content */}
        <div className="bg-[#07070E] p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg" style={{ background: 'linear-gradient(135deg,#FF6B00,#06B6D4)' }} />
              <div>
                <div className="h-2.5 w-24 rounded" style={{ background: 'rgba(255,255,255,0.14)' }} />
                <div className="h-1.5 w-14 rounded mt-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            </div>
            <div className="flex -space-x-2">
              {['#FF6B00','#22d3ee','#34d399'].map(c => (
                <div key={c} className="w-6 h-6 rounded-full" style={{ background: `${c}25`, border: `2px solid ${c}50` }} />
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {[['12','Assets','#FF6B00'],['8','Tareas','#22d3ee'],['3','Devs','#34d399']].map(([n,l,c]) => (
              <div key={l} className="rounded-xl p-2.5 text-center" style={{ background:`${c}08`, border:`1px solid ${c}18` }}>
                <p className="text-sm font-black" style={{ color:c }}>{n}</p>
                <p className="text-[9px] text-surface-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>

          {/* Mini kanban */}
          <div className="grid grid-cols-3 gap-2">
            {[{label:'TODO',color:'#64748B',c:1},{label:'WIP',color:'#FF6B00',c:2},{label:'DONE',color:'#34d399',c:1}].map(col => (
              <div key={col.label}>
                <div className="flex items-center gap-1 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background:col.color }} />
                  <span className="text-[9px] font-semibold" style={{ color:col.color }}>{col.label}</span>
                </div>
                {[...Array(col.c)].map((_,i) => (
                  <motion.div key={i} className="h-9 rounded-lg mb-1.5 p-2"
                    style={{ background:`${col.color}08`, border:`1px solid ${col.color}20` }}
                    animate={{ opacity:[0.65,1,0.65] }}
                    transition={{ duration:2+i*0.7, repeat:Infinity, ease:'easeInOut' }}>
                    <div className="h-1.5 rounded w-3/4" style={{ background:`${col.color}30` }} />
                    <div className="h-1.5 rounded w-1/2 mt-1" style={{ background:`${col.color}20` }} />
                  </motion.div>
                ))}
              </div>
            ))}
          </div>

          {/* Activity */}
          <div className="rounded-xl p-2.5 space-y-2" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
            {[['#FF6B00',72],['#22d3ee',50],['#fbbf24',38]].map(([c,w],i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full shrink-0" style={{ background:`${c}20` }} />
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.04)' }}>
                  <div className="h-full rounded-full" style={{ width:`${w}%`, background:c, opacity:0.5 }} />
                </div>
                <span className="text-[9px] text-surface-500">{['ahora','2m','5m'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const HERO_PARTICLES = [
  { x: '12%', y: '25%', color: '#1E90FF', delay: 0 },
  { x: '28%', y: '65%', color: '#FF6B00', delay: 0.7 },
  { x: '42%', y: '15%', color: '#1E90FF', delay: 1.4 },
  { x: '58%', y: '75%', color: '#FF6B00', delay: 0.3 },
  { x: '72%', y: '30%', color: '#1E90FF', delay: 1.1 },
  { x: '85%', y: '55%', color: '#FF6B00', delay: 0.5 },
  { x: '18%', y: '80%', color: '#FF6B00', delay: 1.8 },
  { x: '90%', y: '20%', color: '#1E90FF', delay: 0.9 },
];

/* ── Landing Page ────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 40);
      if (window.scrollY > 40) setMobileMenuOpen(false);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen animated-bg relative overflow-x-hidden">
      {/* Floating orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[8%] left-[12%] w-[600px] h-[600px] rounded-full opacity-[0.07] float-orb"
          style={{ background: 'radial-gradient(circle, #FF6B00, transparent 70%)' }} />
        <div className="absolute top-[55%] right-[8%] w-[450px] h-[450px] rounded-full opacity-[0.05] float-orb-delay"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />
        <div className="absolute bottom-[12%] left-[38%] w-[350px] h-[350px] rounded-full opacity-[0.04] float-orb"
          style={{ background: 'radial-gradient(circle, #f472b6, transparent 70%)' }} />
      </div>

      {/* ── Fixed Navbar ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'py-3 border-b border-white/[0.06]' : 'py-4 md:py-5'
      }`} style={{ background: scrolled ? 'rgba(7,7,14,0.90)' : 'transparent', backdropFilter: scrolled ? 'blur(20px)' : 'none' }}>
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <img src="/logo2.0.png" alt="CipoteForge" width="38" height="38" style={{ objectFit: 'contain' }} />
            <span className="text-xl font-extrabold"
              style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CipoteForge
            </span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm text-surface-300">
            <a href="#how" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#features" className="hover:text-white transition-colors">Características</a>
            <a href="#pricing" className="hover:text-white transition-colors">Precios</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1.5">
              <Github size={14} /> GitHub
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/login')} className="btn-ghost text-sm hidden md:block">
              Iniciar sesión
            </button>
            <button onClick={() => navigate('/register')} className="btn-primary text-sm py-2 px-4 md:px-5 hidden sm:flex">
              Empezar gratis
            </button>
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="Abrir menú"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {mobileMenuOpen
                ? <X size={18} className="text-white" />
                : <Menu size={18} className="text-white" />}
            </button>
          </div>
        </nav>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="absolute top-full left-0 right-0 md:hidden overflow-hidden"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}>
              <div className="mx-4 mb-4 rounded-2xl overflow-hidden"
                style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { href: '#how',      label: 'Cómo funciona' },
                  { href: '#features', label: 'Características' },
                  { href: '#pricing',  label: 'Precios' },
                ].map(({ href, label }) => (
                  <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-5 py-4 text-sm text-surface-300 hover:text-white hover:bg-white/5 transition-colors border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {label}
                  </a>
                ))}
                <div className="p-4 flex flex-col gap-2">
                  <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                    className="btn-ghost text-sm w-full py-2.5">
                    Iniciar sesión
                  </button>
                  <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                    className="btn-primary text-sm w-full">
                    Empezar gratis
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ── */}
      <motion.section className="relative z-10 pt-24 md:pt-36 pb-14 md:pb-24 px-4 sm:px-6"
        variants={stagger} initial="hidden" animate="show">
        {/* Hero background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, #FF6B0020, transparent 65%)' }} />
          {HERO_PARTICLES.map((p, i) => (
            <motion.div key={i}
              className="absolute rounded-full"
              style={{ width: 4, height: 4, left: p.x, top: p.y, background: p.color, boxShadow: `0 0 6px ${p.color}` }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
            />
          ))}
        </div>
        <motion.img
          src="/logo.png"
          alt="CipoteForge"
          className="block mx-auto mt-8 w-28 h-28 object-contain relative z-10"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — text */}
          <div className="relative z-20 text-center lg:text-left">
            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-6 md:mb-8"
              style={{ background: 'rgba(30,144,255,0.10)', border: '1px solid rgba(30,144,255,0.35)', color: '#1E90FF' }}>
              🌋 Hecho en El Salvador
            </motion.div>

            <motion.h1 variants={fadeUp}
              className="text-[2.25rem] sm:text-5xl md:text-[3.75rem] font-black leading-[1.08] tracking-tight mb-5 md:mb-6">
              Forjá tu juego.
              <br />
              <span style={{ color: '#1E90FF' }}>
                Con tu crew.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base md:text-lg text-surface-300 mb-8 md:mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
              CipoteForge es la plataforma colaborativa hecha en El Salvador para equipos de videojuegos indie. Gestioná tareas, assets y tu equipo en un solo lugar.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-9 md:mb-12">
              <button onClick={() => navigate('/register')} className="btn-primary-pulse flex items-center justify-center gap-2 text-base w-full sm:w-auto">
                Empezar gratis <ArrowRight size={18} />
              </button>
              <button onClick={() => navigate('/login')} className="btn-secondary py-3 px-7 text-base flex items-center justify-center gap-2 w-full sm:w-auto">
                Iniciar sesión <ChevronRight size={16} />
              </button>
            </motion.div>

            {/* Trust signals */}
            <motion.div variants={fadeUp} className="flex items-center gap-4 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {['#FF6B00','#22d3ee','#34d399','#f472b6'].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                    style={{ background:`${c}20`, borderColor:`${c}50`, color:c }}>
                    {['A','B','C','D'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 mb-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} size={11} style={{ color:'#fbbf24', fill:'#fbbf24' }} />)}
                </div>
                <p className="text-xs text-surface-400">+500 equipos confían en CipoteForge</p>
              </div>
            </motion.div>
          </div>

          {/* Right: Mockup — visible on all screens, below text on mobile */}
          <div className="relative z-10 max-w-sm mx-auto lg:max-w-none w-full">
            <AppMockup />
          </div>
        </div>
      </motion.section>

      {/* ── Stats bar ── */}
      <section className="relative z-10 py-10 md:py-12 border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            {STATS.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <p className="text-2xl md:text-3xl font-black mb-1"
                  style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {s.value}
                </p>
                <p className="text-xs md:text-sm text-surface-400">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative z-10 px-4 sm:px-6 py-16 md:py-28">
        <motion.div className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full inline-block mb-4"
            style={{ background: 'rgba(124,58,237,0.10)', color: '#c084fc', border: '1px solid rgba(124,58,237,0.22)' }}>
            Cómo funciona
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">En tres pasos tienes todo listo</h2>
          <p className="text-surface-400 max-w-md mx-auto">Sin configuraciones complicadas. Empieza a crear en minutos.</p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5 relative">
          <div className="hidden md:block absolute top-14 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px"
            style={{ background: 'linear-gradient(90deg, #FF6B0030, #06B6D440, #FF6B0030)' }} />

          {STEPS.map((step, i) => (
            <motion.div key={step.n}
              className="glass p-7 md:p-8 relative text-center"
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-black"
                style={{ background:`${step.color}18`, border:`1px solid ${step.color}35`, color:step.color }}>
                {step.n}
              </div>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background:`${step.color}10`, boxShadow:`0 0 30px ${step.color}12` }}>
                <step.icon size={26} style={{ color: step.color }} />
              </div>
              <h3 className="font-bold text-lg mb-3">{step.title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 px-4 sm:px-6 pb-16 md:pb-28">
        <motion.div className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full inline-block mb-4"
            style={{ background: 'rgba(6,182,212,0.10)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.22)' }}>
            Características
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo para tu pipeline de desarrollo</h2>
          <p className="text-surface-400 max-w-lg mx-auto">Herramientas diseñadas específicamente para equipos indie que quieren crear juegos increíbles.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} className="glass-sm p-5 md:p-6 group"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                style={{ background:`${f.color}10`, boxShadow:`0 0 20px ${f.color}08` }}>
                <f.icon size={20} style={{ color: f.color }} />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative z-10 px-4 sm:px-6 pb-16 md:pb-28">
        <motion.div className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full inline-block mb-4"
            style={{ background: 'rgba(52,211,153,0.10)', color: '#34d399', border: '1px solid rgba(52,211,153,0.22)' }}>
            Testimonios
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Lo que dicen los equipos</h2>
          <p className="text-surface-400 max-w-md mx-auto">Más de 500 estudios indie ya confían en CipoteForge para lanzar sus juegos.</p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4 md:gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name} className="glass-sm p-5 md:p-6 flex flex-col gap-4"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={12} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                ))}
              </div>
              <p className="text-sm text-surface-300 leading-relaxed flex-1">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}28` }}>
                  {t.initial}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-surface-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 px-4 sm:px-6 pb-16 md:pb-28">
        <motion.div className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full inline-block mb-4"
            style={{ background: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.22)' }}>
            Precios
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple y transparente</h2>
          <p className="text-surface-400 max-w-md mx-auto">Sin cargos ocultos. Empieza gratis y escala cuando lo necesites.</p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5 md:gap-6 items-start">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.name}
              className="glass p-7 md:p-8 relative"
              style={plan.primary ? { boxShadow: `0 0 0 1px ${plan.color}30, 0 8px 32px rgba(0,0,0,0.3)` } : {}}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #06B6D4)', color: 'white' }}>
                  {plan.badge}
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="text-4xl font-black" style={{ color: plan.color }}>{plan.price}</span>
                <span className="text-surface-400 text-sm pb-1">{plan.period}</span>
              </div>
              <p className="text-sm text-surface-400 mb-6">{plan.desc}</p>

              <ul className="space-y-3 mb-8">
                {plan.features.map(feat => (
                  <li key={feat} className="flex items-center gap-3 text-sm">
                    <Check size={14} style={{ color: plan.color, flexShrink: 0 }} />
                    <span className="text-surface-300">{feat}</span>
                  </li>
                ))}
              </ul>

              <button onClick={() => navigate('/register')}
                className={`w-full flex items-center justify-center gap-2 ${plan.btnClass}`}
                style={plan.btnStyle}>
                {plan.cta} <ArrowRight size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <motion.section className="relative z-10 px-4 sm:px-6 pb-16 md:pb-28"
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <div className="max-w-3xl mx-auto text-center py-12 md:py-16 px-6 md:px-8 rounded-3xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06))', border: '1px solid rgba(124,58,237,0.15)' }}>
          <div className="absolute inset-0 dot-grid opacity-40" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">¿Listo para forjar tu próximo juego?</h2>
            <p className="text-surface-300 mb-7 md:mb-8 max-w-md mx-auto text-sm md:text-base">Únete a CipoteForge y empieza a crear con tu equipo hoy mismo. Sin tarjeta de crédito.</p>
            <button onClick={() => navigate('/register')} className="btn-primary-pulse flex items-center justify-center gap-2 mx-auto text-base w-full sm:w-auto">
              Crear cuenta gratis <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </motion.section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10 mb-8 md:mb-12">
            {/* Brand — always visible */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="CipoteForge" width="52" height="52" style={{ objectFit: 'contain' }} />
                <span className="text-lg font-extrabold"
                  style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  CipoteForge
                </span>
              </div>
              <p className="text-sm text-surface-400 leading-relaxed mb-5">
                La plataforma todo-en-uno para equipos de desarrollo de videojuegos independientes.
              </p>
              <div className="flex items-center gap-2">
                {[Github, Twitter].map((Icon, i) => (
                  <a key={i} href="#"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns — hidden on mobile */}
            {[
              { title: 'Producto',  links: ['Características', 'Precios', 'Changelog', 'Roadmap'] },
              { title: 'Empresa',   links: ['Acerca de', 'Blog', 'Carreras', 'Prensa'] },
              { title: 'Soporte',   links: ['Documentación', 'Discord', 'Status', 'Contacto'] },
            ].map(col => (
              <div key={col.title} className="hidden md:block">
                <h4 className="text-sm font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l}><a href="#" className="text-sm text-surface-400 hover:text-white transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-surface-500">© 2026 CipoteForge. Todos los derechos reservados.</p>
            <div className="flex items-center gap-5 text-xs text-surface-500">
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <span>Hecho con 🌋 en El Salvador</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
