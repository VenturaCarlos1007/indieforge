import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, Mail, Lock, AlertCircle, Github, Star } from 'lucide-react';

function AuthMockup() {
  return (
    <motion.div className="relative w-full max-w-[280px]"
      initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
      <div className="absolute inset-0 rounded-2xl blur-3xl opacity-[0.12] pointer-events-none"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }} />
      <div className="relative rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(7,7,14,0.75)', backdropFilter: 'blur(20px)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex gap-1.5">
            {['#f87171','#fbbf24','#34d399'].map(c => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.6 }} />
            ))}
          </div>
          <span className="text-[9px] text-surface-500 mx-auto">app.indieforge.io</span>
        </div>
        {/* Content */}
        <div className="p-3.5 space-y-2.5">
          {/* Project row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md" style={{ background: 'linear-gradient(135deg,#7C3AED,#06B6D4)' }} />
              <div className="h-2 w-16 rounded" style={{ background: 'rgba(255,255,255,0.10)' }} />
            </div>
            <div className="flex -space-x-1.5">
              {['#a855f7','#22d3ee','#34d399'].map(c => (
                <div key={c} className="w-4 h-4 rounded-full" style={{ background: `${c}20`, border: `1.5px solid ${c}45` }} />
              ))}
            </div>
          </div>
          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-1.5">
            {[['12','Assets','#a855f7'],['8','Tareas','#22d3ee'],['3','Devs','#34d399']].map(([n,l,c]) => (
              <div key={l} className="rounded-lg p-2 text-center" style={{ background:`${c}08`, border:`1px solid ${c}14` }}>
                <p className="text-xs font-black" style={{ color:c }}>{n}</p>
                <p className="text-[8px] text-surface-500">{l}</p>
              </div>
            ))}
          </div>
          {/* Mini kanban */}
          <div className="grid grid-cols-3 gap-1.5">
            {[{l:'TODO',c:'#64748B',n:1},{l:'WIP',c:'#a855f7',n:2},{l:'DONE',c:'#34d399',n:1}].map(col => (
              <div key={col.l}>
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background:col.c }} />
                  <span className="text-[8px] font-semibold" style={{ color:col.c }}>{col.l}</span>
                </div>
                {[...Array(col.n)].map((_,i) => (
                  <motion.div key={i} className="h-7 rounded mb-1 p-1.5"
                    style={{ background:`${col.c}08`, border:`1px solid ${col.c}16` }}
                    animate={{ opacity:[0.6,1,0.6] }}
                    transition={{ duration:2.5+i*0.7, repeat:Infinity, ease:'easeInOut' }}>
                    <div className="h-1.5 w-3/4 rounded" style={{ background:`${col.c}25` }} />
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
          {/* Activity */}
          <div className="rounded-lg p-2 space-y-1.5" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)' }}>
            {[['#a855f7',70],['#22d3ee',50],['#fbbf24',35]].map(([c,w],i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ background:`${c}18` }} />
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.04)' }}>
                  <div className="h-full rounded-full" style={{ width:`${w}%`, background:c, opacity:0.5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Floating badges */}
      <motion.div className="absolute -bottom-3 -right-3 px-2.5 py-1.5 rounded-xl text-[9px] font-semibold"
        style={{ background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.2)', color:'#22d3ee', backdropFilter:'blur(12px)' }}
        animate={{ y:[0,-4,0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}>
        🚀 v3 subida por Alex
      </motion.div>

    </motion.div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);

  const shake = () => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await login(email, password); }
    catch (err) {
      const msg = err.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Credenciales incorrectas.');
      shake();
    }
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

      {/* Left — Branding + Mockup */}
      <div className="hidden lg:flex flex-col justify-between flex-1 relative z-10 p-12">
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

        <div className="flex flex-col gap-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-3xl font-bold leading-tight mb-3">
              Tu próximo gran{' '}
              <span style={{ background: 'linear-gradient(135deg, #a855f7, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                juego indie
              </span>
              <br />empieza aquí.
            </h2>
            <p className="text-surface-400 text-sm max-w-xs leading-relaxed">
              La plataforma todo-en-uno para equipos de desarrollo de videojuegos independientes.
            </p>
          </motion.div>
          <AuthMockup />
        </div>

        <div className="flex items-center gap-2">
          {[...Array(5)].map((_,i) => <Star key={i} size={11} style={{ color:'#fbbf24', fill:'#fbbf24' }} />)}
          <span className="text-xs text-surface-500 ml-1">+500 equipos confían en IndieForge</span>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          ref={cardRef}
          className="glass-strong p-8 md:p-10 w-full max-w-md"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>

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

          <div className="text-center lg:text-left mb-7">
            <h1 className="text-2xl font-bold mb-1">Bienvenido de vuelta</h1>
            <p className="text-surface-400 text-sm">Inicia sesión para continuar</p>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button type="button" className="btn-secondary py-2.5 flex items-center justify-center gap-2 text-xs">
              <Github size={14} /> GitHub
            </button>
            <button type="button" className="btn-secondary py-2.5 flex items-center justify-center gap-2 text-xs">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
            <span className="text-xs text-surface-500">O continúa con email</span>
            <div className="flex-1 h-px" style={{ background: 'var(--glass-border)' }} />
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
              <AlertCircle size={16} className="shrink-0" /> {error}
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
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    style={{ animation: 'spin-slow 0.6s linear infinite' }} />
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
