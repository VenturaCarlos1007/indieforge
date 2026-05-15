import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, AlertCircle, Github, Upload, Shield, Sparkles, Eye, EyeOff } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Upload,   color: '#FF6B00', text: 'Assets con versionado automático' },
  { icon: Shield,   color: '#22d3ee', text: 'Roles y permisos por proyecto' },
  { icon: Sparkles, color: '#34d399', text: 'Feed de actividad en tiempo real' },
];

function AuthPanel() {
  return (
    <motion.div className="w-full max-w-[280px] ml-auto"
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
      <div className="absolute inset-0 rounded-2xl blur-3xl opacity-[0.10] pointer-events-none"
        style={{ background: 'linear-gradient(135deg, #06B6D4, #FF6B00)' }} />
      <div className="relative rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(7,7,14,0.75)', backdropFilter: 'blur(20px)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex gap-1.5">
            {['#f87171','#fbbf24','#34d399'].map(c => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.6 }} />
            ))}
          </div>
          <span className="text-[9px] text-surface-500 mx-auto">CipoteForge · Assets</span>
        </div>
        {/* Asset list */}
        <div className="p-3.5 space-y-2">
          <div className="text-[9px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Zombie RPG / Arte</div>
          {[
            { name: 'hero_sprite_v3.png', size: '2.4 MB', color: '#FF6B00', tag: 'v3' },
            { name: 'background_city.psd', size: '18 MB', color: '#22d3ee', tag: 'v2' },
            { name: 'sfx_sword_hit.wav', size: '312 KB', color: '#fbbf24', tag: 'v1' },
          ].map((f, i) => (
            <motion.div key={f.name}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{ background: `${f.color}06`, border: `1px solid ${f.color}12` }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}>
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `${f.color}14` }}>
                <Upload size={10} style={{ color: f.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>{f.name}</p>
                <p className="text-[8px] text-surface-500">{f.size}</p>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: `${f.color}14`, color: f.color }}>{f.tag}</span>
            </motion.div>
          ))}
          {/* Upload zone */}
          <div className="rounded-lg border border-dashed p-3 text-center mt-1"
            style={{ borderColor: 'rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.04)' }}>
            <Upload size={12} className="mx-auto mb-1" style={{ color: 'rgba(168,85,247,0.6)' }} />
            <p className="text-[8px] text-surface-500">Arrastra archivos aquí</p>
          </div>
          {/* Members row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex -space-x-1.5">
              {['#FF6B00','#22d3ee','#34d399','#fbbf24'].map(c => (
                <div key={c} className="w-5 h-5 rounded-full" style={{ background: `${c}20`, border: `1.5px solid ${c}50` }} />
              ))}
            </div>
            <span className="text-[8px] text-surface-500">4 colaboradores</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwErrors, setPwErrors] = useState([]);
  const [confirmError, setConfirmError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);

  const validatePassword = (val) => {
    const errors = [];
    if (val.length > 0 && val.length < 8) errors.push('Mínimo 8 caracteres');
    if (val.length > 0 && !/\d/.test(val)) errors.push('Debe incluir al menos un número');
    setPwErrors(errors);
    if (confirmPassword && val !== confirmPassword) setConfirmError('Las contraseñas no coinciden');
    else if (confirmPassword) setConfirmError('');
  };

  const validateConfirm = (val) => {
    if (val && val !== password) setConfirmError('Las contraseñas no coinciden');
    else setConfirmError('');
  };

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
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      shake();
      return;
    }
    if (!/\d/.test(password)) {
      setError('La contraseña debe incluir al menos un número.');
      shake();
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      shake();
      return;
    }
    setLoading(true);
    try { await register(name, email, password); }
    catch (err) {
      const msg = err.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Error al registrarse. Verifica tus datos.');
      shake();
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
          style={{ background: 'radial-gradient(circle, #FF6B00, transparent 70%)' }} />
      </div>

      {/* Left — Form */}
      <div className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6 relative z-10 overflow-y-auto">
        <motion.div
          ref={cardRef}
          className="glass-strong p-6 sm:p-8 md:p-10 w-full max-w-md my-auto"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-7">
            <Link to="/" className="flex items-center gap-2">
              <svg width="40" height="40" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                <polygon points="18,6 8,28 28,28" fill="#1E3A8A"/>
                <polygon points="18,6 14,18 18,15" fill="#FF6B00"/>
                <polygon points="18,6 22,18 18,15" fill="#FF4500"/>
                <ellipse cx="18" cy="5" rx="3" ry="4" fill="#FF6B00"/>
                <ellipse cx="18" cy="3" rx="1.5" ry="2.5" fill="#FFA500"/>
                <rect x="6" y="28" width="24" height="3" rx="1.5" fill="#1E4494"/>
              </svg>
              <span className="text-xl font-extrabold"
                style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                CipoteForge
              </span>
            </Link>
          </div>

          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold mb-1">Creá tu cuenta en CipoteForge</h1>
            <p className="text-surface-400 text-sm">Únete a la comunidad indie</p>
          </div>

          {/* Social buttons — stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <button type="button" className="btn-secondary py-3 flex items-center justify-center gap-2 text-sm">
              <Github size={15} /> GitHub
            </button>
            <button type="button" className="btn-secondary py-3 flex items-center justify-center gap-2 text-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
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
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Nombre</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input id="register-name" type="text" placeholder="Tu nombre" value={name}
                  onChange={(e) => setName(e.target.value)} required
                  className="input-field pl-10"
                  style={{ fontSize: '16px' }} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input id="register-email" type="email" placeholder="tu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="input-field pl-10"
                  style={{ fontSize: '16px' }} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input id="register-password" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => validatePassword(password)}
                  required
                  className="input-field pl-10 pr-10"
                  style={{ fontSize: '16px' }} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwErrors.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {pwErrors.map(e => <p key={e} className="text-xs text-red-400">{e}</p>)}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Confirmar contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input id="register-confirm" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repite tu contraseña" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => validateConfirm(confirmPassword)}
                  required
                  className="input-field pl-10 pr-10"
                  style={{ fontSize: '16px' }} />
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors">
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmError && <p className="text-xs text-red-400 mt-1.5">{confirmError}</p>}
            </div>
            <button id="register-submit" type="submit"
              disabled={loading || !name || !email || !password || !confirmPassword || password.length < 8 || !/\d/.test(password) || password !== confirmPassword}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    style={{ animation: 'spin-slow 0.6s linear infinite' }} />
                  Creando cuenta…
                </span>
              ) : 'Crear cuenta gratis'}
            </button>
          </form>

          <p className="text-center text-sm text-surface-400 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold transition-colors"
              style={{ color: '#22d3ee' }}
              onMouseEnter={(e) => e.target.style.color = '#67e8f9'}
              onMouseLeave={(e) => e.target.style.color = '#22d3ee'}>
              Inicia sesión
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right — Branding + Panel (desktop only) */}
      <div className="hidden lg:flex flex-col justify-between flex-1 relative z-10 p-12">
        <div className="flex justify-end">
          <Link to="/" className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <polygon points="18,6 8,28 28,28" fill="#1E3A8A"/>
              <polygon points="18,6 14,18 18,15" fill="#FF6B00"/>
              <polygon points="18,6 22,18 18,15" fill="#FF4500"/>
              <ellipse cx="18" cy="5" rx="3" ry="4" fill="#FF6B00"/>
              <ellipse cx="18" cy="3" rx="1.5" ry="2.5" fill="#FFA500"/>
              <rect x="6" y="28" width="24" height="3" rx="1.5" fill="#1E4494"/>
            </svg>
            <span className="text-xl font-extrabold"
              style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CipoteForge
            </span>
          </Link>
        </div>

        <div className="flex flex-col gap-10 items-end relative">
          <motion.div className="text-right" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-3xl font-bold leading-tight mb-3">
              Construye, colabora,{' '}
              <span style={{ background: 'linear-gradient(135deg, #22d3ee, #FF6B00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                publica.
              </span>
            </h2>
            <p className="text-surface-400 text-sm max-w-xs ml-auto leading-relaxed">
              Todo lo que tu equipo necesita en un solo lugar.
            </p>
          </motion.div>
          <AuthPanel />
        </div>

        <div className="flex flex-col gap-2.5 items-end">
          {HIGHLIGHTS.map((h, i) => (
            <motion.div key={i}
              className="flex items-center gap-2.5 text-surface-300"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}>
              <span className="text-xs">{h.text}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${h.color}12` }}>
                <h.icon size={14} style={{ color: h.color }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
