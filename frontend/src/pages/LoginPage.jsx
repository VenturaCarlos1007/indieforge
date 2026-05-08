import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, Mail, Lock, AlertCircle, Sparkles, Users, FolderKanban, Zap } from 'lucide-react';

const features = [
  { icon: FolderKanban, text: 'Gestión de proyectos y assets' },
  { icon: Users, text: 'Colaboración en tiempo real' },
  { icon: Zap, text: 'Kanban con drag & drop' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(email, password); }
    catch (err) { setError(err.response?.data?.error || 'Error al iniciar sesión.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex animated-bg relative overflow-hidden">
      {/* Orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.06] float-orb"
          style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] rounded-full opacity-[0.04] float-orb-delay"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />
      </div>

      {/* Left — Branding panel */}
      <div className="hidden lg:flex flex-col justify-between flex-1 relative z-10 p-12">
        <div>
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
              <Gamepad2 size={22} className="text-white" />
            </div>
            <span className="text-xl font-extrabold"
              style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              IndieForge
            </span>
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Tu próximo gran{' '}
              <span style={{ background: 'linear-gradient(135deg, #a855f7, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                juego indie
              </span>
              <br />empieza aquí.
            </h2>
            <p className="text-surface-400 text-lg max-w-md leading-relaxed">
              La plataforma todo-en-uno para equipos de desarrollo de videojuegos independientes.
            </p>
          </motion.div>

          <motion.div className="mt-12 space-y-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            {features.map((f, i) => (
              <motion.div key={i}
                className="flex items-center gap-3 text-surface-300"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.1)' }}>
                  <f.icon size={16} style={{ color: '#a855f7' }} />
                </div>
                <span className="text-sm">{f.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <p className="text-xs text-surface-500">© 2024 IndieForge. Hecho con 💜 para devs indie.</p>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          className="glass-strong p-8 md:p-10 w-full max-w-md"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
              <Gamepad2 size={20} className="text-white" />
            </div>
            <span className="text-lg font-extrabold"
              style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              IndieForge
            </span>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h1 className="text-2xl font-bold mb-1">Bienvenido de vuelta</h1>
            <p className="text-surface-400 text-sm">Inicia sesión para continuar</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input id="login-email" type="email" placeholder="tu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input id="login-password" type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required className="input-field pl-10" />
              </div>
            </div>
            <button id="login-submit" type="submit" disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin-slow 0.6s linear infinite' }} />
                  Cargando…
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-surface-400 mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-semibold transition-colors"
              style={{ color: '#a855f7' }}
              onMouseEnter={(e) => e.target.style.color = '#c084fc'}
              onMouseLeave={(e) => e.target.style.color = '#a855f7'}>
              Regístrate gratis
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
