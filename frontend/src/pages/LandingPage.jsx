import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Gamepad2, Users, FolderKanban, Upload, Columns3,
  MessageSquare, Zap, Shield, ArrowRight, Sparkles, Github
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

const FEATURES = [
  { icon: FolderKanban, title: 'Gestión de Proyectos', desc: 'Organiza todos tus juegos indie con dashboards inteligentes y seguimiento de progreso en tiempo real.', color: '#a855f7' },
  { icon: Upload, title: 'Assets con Versionado', desc: 'Sube y gestiona arte, audio, modelos 3D con versionado automático y restauración instantánea.', color: '#22d3ee' },
  { icon: Columns3, title: 'Kanban Visual', desc: 'Tableros drag & drop con columnas personalizadas para mantener tu pipeline de desarrollo organizado.', color: '#fbbf24' },
  { icon: Users, title: 'Colaboración en Equipo', desc: 'Invita artistas, programadores y diseñadores. Asigna roles y gestiona permisos granulares.', color: '#34d399' },
  { icon: MessageSquare, title: 'Comentarios en Hilos', desc: 'Feedback contextual en cada asset con hilos de discusión y sistema de resolución integrado.', color: '#f472b6' },
  { icon: Zap, title: 'Tiempo Real', desc: 'Socket.io integrado para ver cambios al instante. Sin recargar, sin esperas, sin fricción.', color: '#fb923c' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      {/* Floating orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full opacity-[0.07] float-orb"
          style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }} />
        <div className="absolute top-[50%] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.05] float-orb-delay"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />
        <div className="absolute bottom-[10%] left-[40%] w-[300px] h-[300px] rounded-full opacity-[0.04] float-orb"
          style={{ background: 'radial-gradient(circle, #f472b6, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <motion.nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
            <Gamepad2 size={20} className="text-white" />
          </div>
          <span className="text-xl font-extrabold"
            style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            IndieForge
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="btn-ghost text-surface-200 hover:text-white">
            Iniciar sesión
          </button>
          <button onClick={() => navigate('/register')} className="btn-primary text-sm py-2 px-5">
            Comenzar gratis
          </button>
        </div>
      </motion.nav>

      {/* Hero */}
      <motion.section className="relative z-10 text-center px-6 pt-20 pb-28 max-w-4xl mx-auto"
        variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#c084fc' }}>
          <Sparkles size={13} /> Plataforma colaborativa para game dev
        </motion.div>

        <motion.h1 variants={fadeUp}
          className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
          Crea videojuegos{' '}
          <span style={{ background: 'linear-gradient(135deg, #a855f7, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            indie
          </span>
          <br />en equipo, sin fricción
        </motion.h1>

        <motion.p variants={fadeUp}
          className="text-lg text-surface-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Todo lo que tu equipo necesita en un solo lugar: gestión de assets, tableros kanban,
          versionado de archivos y colaboración en tiempo real.
        </motion.p>

        <motion.div variants={fadeUp} className="flex items-center justify-center gap-4">
          <button onClick={() => navigate('/register')} className="btn-primary-pulse flex items-center gap-2 text-base">
            Empezar ahora <ArrowRight size={18} />
          </button>
          <button onClick={() => navigate('/login')} className="btn-secondary py-3 px-8 text-base">
            Ya tengo cuenta
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-12 mt-16">
          {[
            { value: '100%', label: 'Open Source' },
            { value: '∞', label: 'Proyectos' },
            { value: 'Real-time', label: 'Colaboración' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold"
                style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {s.value}
              </p>
              <p className="text-xs text-surface-400 mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-28">
        <motion.div className="text-center mb-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <h2 className="text-3xl font-bold mb-3">Todo para tu pipeline de desarrollo</h2>
          <p className="text-surface-400 max-w-lg mx-auto">Herramientas diseñadas específicamente para equipos indie que quieren crear juegos increíbles.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              className="glass-sm p-6 group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, borderColor: `${f.color}25` }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                style={{ background: `${f.color}12`, boxShadow: `0 0 20px ${f.color}08` }}>
                <f.icon size={22} style={{ color: f.color }} />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <motion.section className="relative z-10 px-6 pb-20"
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <div className="max-w-3xl mx-auto text-center py-16 px-8 rounded-3xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06))', border: '1px solid rgba(124,58,237,0.15)' }}>
          <div className="absolute inset-0 dot-grid opacity-50" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-3">¿Listo para forjar tu próximo juego?</h2>
            <p className="text-surface-300 mb-8 max-w-md mx-auto">Únete a IndieForge y empieza a crear con tu equipo hoy mismo. Sin tarjeta de crédito.</p>
            <button onClick={() => navigate('/register')} className="btn-primary-pulse flex items-center gap-2 mx-auto text-base">
              Crear cuenta gratis <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] px-6 py-8 text-center text-xs text-surface-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Gamepad2 size={14} />
          <span className="font-semibold text-surface-400">IndieForge</span>
        </div>
        <p>Hecho con 💜 para desarrolladores indie</p>
      </footer>
    </div>
  );
}
