import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Github, Star, Eye, EyeOff, ArrowRight } from 'lucide-react';

/* ── App preview mockup (desktop sidebar) ── */
function AuthMockup() {
  return (
    <motion.div className="relative w-full max-w-[280px]"
      initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
      <div className="absolute inset-0 rounded-2xl blur-3xl opacity-[0.12] pointer-events-none"
        style={{ background: 'linear-gradient(135deg, #FF6B00, #06B6D4)' }} />
      <div className="relative rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(7,7,14,0.75)', backdropFilter: 'blur(20px)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex gap-1.5">
            {['#f87171','#fbbf24','#34d399'].map(c => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.6 }} />
            ))}
          </div>
          <span className="text-[9px] text-surface-500 mx-auto">app.cipoteforge.io</span>
        </div>
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md" style={{ background: 'linear-gradient(135deg,#FF6B00,#06B6D4)' }} />
              <div className="h-2 w-16 rounded" style={{ background: 'rgba(255,255,255,0.10)' }} />
            </div>
            <div className="flex -space-x-1.5">
              {['#FF6B00','#22d3ee','#34d399'].map(c => (
                <div key={c} className="w-4 h-4 rounded-full" style={{ background: `${c}20`, border: `1.5px solid ${c}45` }} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[['12','Assets','#FF6B00'],['8','Tareas','#22d3ee'],['3','Devs','#34d399']].map(([n,l,c]) => (
              <div key={l} className="rounded-lg p-2 text-center" style={{ background:`${c}08`, border:`1px solid ${c}14` }}>
                <p className="text-xs font-black" style={{ color:c }}>{n}</p>
                <p className="text-[8px] text-surface-500">{l}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[{l:'TODO',c:'#64748B',n:1},{l:'WIP',c:'#FF6B00',n:2},{l:'DONE',c:'#34d399',n:1}].map(col => (
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
          <div className="rounded-lg p-2 space-y-1.5" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)' }}>
            {[['#FF6B00',70],['#22d3ee',50],['#fbbf24',35]].map(([c,w],i) => (
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
      <motion.div className="absolute -bottom-3 -right-3 px-2.5 py-1.5 rounded-xl text-[9px] font-semibold"
        style={{ background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.2)', color:'#22d3ee', backdropFilter:'blur(12px)' }}
        animate={{ y:[0,-4,0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}>
        🚀 v3 subida por Alex
      </motion.div>
    </motion.div>
  );
}

/* ── Google SVG ── */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const fieldAnim = (delay) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div className="min-h-screen flex animated-bg relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.06] float-orb"
          style={{ background: 'radial-gradient(circle, #FF6B00, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] rounded-full opacity-[0.04] float-orb-delay"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />
      </div>

      {/* ── Left: Branding + Mockup (desktop) ── */}
      <div className="hidden lg:flex flex-col justify-between flex-1 relative z-10 p-12">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo2.0.png" alt="CipoteForge" width="38" height="38" style={{ objectFit: 'contain' }} />
          <span className="text-xl font-extrabold"
            style={{ background: 'linear-gradient(to right, #1E90FF, #FF6B00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            CipoteForge
          </span>
        </Link>

        <div className="flex flex-col gap-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-3xl font-bold leading-tight mb-3">
              Tu próximo gran{' '}
              <span style={{ background: 'linear-gradient(135deg, #FF6B00, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
          <span className="text-xs text-surface-500 ml-1">+500 equipos confían en CipoteForge</span>
        </div>
      </div>

      {/* ── Right: Form ── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 overflow-y-auto">
        {/* Glow behind card */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[520px] h-[520px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #1E90FF, transparent 65%)', filter: 'blur(40px)' }} />
        </div>

        <motion.div
          ref={cardRef}
          className="relative w-full max-w-md my-auto"
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>

          {/* Card glow border */}
          <div className="absolute -inset-px rounded-2xl pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(30,144,255,0.25), rgba(255,107,0,0.12), rgba(30,144,255,0.08))', borderRadius: 18 }} />

          <div className="relative rounded-2xl p-7 sm:p-9"
            style={{ background: 'rgba(7,7,20,0.82)', backdropFilter: 'blur(32px) saturate(180%)', border: '1px solid rgba(30,144,255,0.18)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.55), 0 0 80px rgba(30,144,255,0.07)' }}>

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <Link to="/" className="flex items-center gap-2">
                <img src="/logo2.0.png" alt="CipoteForge" width="36" height="36" style={{ objectFit: 'contain' }} />
                <span className="text-xl font-extrabold"
                  style={{ background: 'linear-gradient(to right, #1E90FF, #FF6B00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  CipoteForge
                </span>
              </Link>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">Bienvenido de vuelta</h1>
              <p className="text-surface-400 text-sm leading-relaxed">Inicia sesión para continuar en CipoteForge</p>
            </div>

            {/* Social login */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button type="button"
                onClick={() => { window.location.href = 'https://indieforge-production.up.railway.app/api/auth/github'; }}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-surface-300 transition-all duration-200 hover:-translate-y-0.5 hover:text-white"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <Github size={15} /> GitHub
              </button>
              <button type="button"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-surface-300 transition-all duration-200 hover:-translate-y-0.5 hover:text-white"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <GoogleIcon /> Google
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08))' }} />
              <span className="text-xs text-surface-500 px-1">O continúa con email</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)' }} />
            </div>

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm mb-5"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}>
                <AlertCircle size={15} className="shrink-0" /> {error}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div {...fieldAnim(0.05)}>
                <label className="text-xs font-semibold text-surface-400 mb-2 block tracking-wide uppercase" style={{ letterSpacing: '0.06em' }}>
                  Email
                </label>
                <div className="relative group">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 group-focus-within:text-[#1E90FF] transition-colors duration-200" />
                  <input id="login-email" type="email" placeholder="tu@email.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} required
                    className="input-field pl-11"
                    style={{ fontSize: '15px', paddingTop: '0.8rem', paddingBottom: '0.8rem' }} />
                </div>
              </motion.div>

              <motion.div {...fieldAnim(0.1)}>
                <label className="text-xs font-semibold text-surface-400 mb-2 block tracking-wide uppercase" style={{ letterSpacing: '0.06em' }}>
                  Contraseña
                </label>
                <div className="relative group">
                  <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 group-focus-within:text-[#1E90FF] transition-colors duration-200" />
                  <input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    className="input-field pl-11 pr-12"
                    style={{ fontSize: '15px', paddingTop: '0.8rem', paddingBottom: '0.8rem' }} />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-surface-500 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
                    tabIndex={-1}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </motion.div>

              <motion.div {...fieldAnim(0.15)}>
                <button id="login-submit" type="submit" disabled={loading}
                  className="btn-primary-pulse w-full flex items-center justify-center gap-2.5 mt-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
                  style={{ paddingTop: '0.85rem', paddingBottom: '0.85rem' }}>
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        style={{ animation: 'spin-slow 0.6s linear infinite' }} />
                      Cargando…
                    </>
                  ) : (
                    <>Iniciar sesión <ArrowRight size={16} /></>
                  )}
                </button>
              </motion.div>
            </form>

            {/* Bottom link */}
            <motion.p {...fieldAnim(0.2)} className="text-center text-sm text-surface-500 mt-7">
              ¿No tienes cuenta?{' '}
              <Link to="/register"
                className="font-bold transition-colors duration-200 hover:opacity-90"
                style={{ color: '#FF6B00' }}>
                Regístrate gratis →
              </Link>
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
