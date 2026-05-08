import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, User, Mail, Lock, AlertCircle, Shield, Sparkles, Upload } from 'lucide-react';

const features = [
  { icon: Upload, text: 'Assets con versionado automático' },
  { icon: Shield, text: 'Roles y permisos por proyecto' },
  { icon: Sparkles, text: 'Feed de actividad en tiempo real' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    try { await register(name, email, password); }
    catch (err) { 
      const msg = err.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Error al registrarse. Verifica tus datos.');
    }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex animated-bg relative overflow-hidden">
      {/* Orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[30%] right-[15%] w-[500px] h-[500px] rounded-full opacity-[0.06] float-orb"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />
        <div className="absolute bottom-[15%] left-[15%] w-[400px] h-[400px] rounded-full opacity-[0.05] float-orb-delay"
          style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }} />
      </div>

      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          className="glass-strong p-8 md:p-10 w-full max-w-md"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
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
            <h1 className="text-2xl font-bold mb-1">Crea tu cuenta</h1>
            <p className="text-surface-400 text-sm">Únete a la comunidad indie</p>
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
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Nombre</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input id="register-name" type="text" placeholder="Tu nombre" value={name}
                  onChange={(e) => setName(e.target.value)} required className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input id="register-email" type="email" placeholder="tu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input id="register-password" type="password" placeholder="Mínimo 6 caracteres" value={password}
                  onChange={(e) => setPassword(e.target.value)} required className="input-field pl-10" />
              </div>
            </div>
            <button id="register-submit" type="submit" disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin-slow 0.6s linear infinite' }} />
                  Creando…
                </span>
              ) : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-surface-400 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold"
              style={{ color: '#22d3ee' }}
              onMouseEnter={(e) => e.target.style.color = '#67e8f9'}
              onMouseLeave={(e) => e.target.style.color = '#22d3ee'}>
              Inicia sesión
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right — Branding */}
      <div className="hidden lg:flex flex-col justify-between flex-1 relative z-10 p-12">
        <div className="flex justify-end">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
              <Gamepad2 size={22} className="text-white" />
            </div>
            <span className="text-xl font-extrabold"
              style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              IndieForge
            </span>
          </Link>
        </div>

        <motion.div className="max-w-md ml-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-4xl font-bold leading-tight mb-4 text-right">
            Construye, colabora,{' '}
            <span style={{ background: 'linear-gradient(135deg, #22d3ee, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              publica.
            </span>
          </h2>
          <div className="space-y-3 mt-8">
            {features.map((f, i) => (
              <motion.div key={i}
                className="flex items-center gap-3 text-surface-300 justify-end"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}>
                <span className="text-sm">{f.text}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(6,182,212,0.1)' }}>
                  <f.icon size={16} style={{ color: '#22d3ee' }} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="text-xs text-surface-500 text-right">© 2026 IndieForge. Para desarrolladores indie.</p>
      </div>
    </div>
  );
}
