import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, LogOut, Settings, User, Compass } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Proyectos', icon: LayoutDashboard, accent: '#a855f7' },
  { to: '/explore',   label: 'Explorar',  icon: Compass,         accent: '#10b981' },
  { to: '/profile',  label: 'Mi Perfil',  icon: User,            accent: '#06b6d4' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
    <aside className={[
      'flex flex-col w-[260px] glass-sidebar shrink-0',
      'fixed inset-y-0 left-0 z-40',
      'transition-transform duration-300 ease-in-out',
      open ? 'translate-x-0' : '-translate-x-full',
      'md:relative md:z-auto md:translate-x-0',
    ].join(' ')}>
      {/* Gradient top line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-10"
        style={{ background: 'linear-gradient(90deg, #7C3AED, #06B6D4, #7C3AED)' }} />

      {/* Logo */}
      <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3 px-5 py-5 hover:opacity-80 transition-opacity"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <polygon points="18,6 8,28 28,28" fill="#1E3A8A"/>
          <polygon points="18,6 14,18 18,15" fill="#FF6B00"/>
          <polygon points="18,6 22,18 18,15" fill="#FF4500"/>
          <ellipse cx="18" cy="5" rx="3" ry="4" fill="#FF6B00"/>
          <ellipse cx="18" cy="3" rx="1.5" ry="2.5" fill="#FFA500"/>
          <rect x="6" y="28" width="24" height="3" rx="1.5" fill="#1E4494"/>
        </svg>
        <span className="text-lg font-bold text-white tracking-tight">CipoteForge</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ to, label, icon: Icon, accent }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group">
            {({ isActive }) => (
              <>
                {isActive && (
                  <>
                    <motion.div layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, ${accent}10, transparent)`,
                        border: `1px solid ${accent}20`,
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                    <motion.div layoutId="sidebar-bar"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                      style={{ background: accent, boxShadow: `0 0 10px ${accent}50` }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                  </>
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 relative z-10 ${isActive ? '' : 'group-hover:scale-110'}`}
                  style={{
                    background: isActive ? `${accent}15` : 'var(--btn-sec-bg)',
                    boxShadow: isActive ? `0 0 15px ${accent}15` : 'none',
                  }}>
                  <Icon size={16} style={{ color: isActive ? accent : '#64748B' }}
                    className="transition-colors group-hover:brightness-150" />
                </div>
                <span className={`relative z-10 transition-colors ${
                  isActive
                    ? 'dark:text-white text-brand-700 font-semibold'
                    : 'text-surface-300 dark:group-hover:text-white group-hover:text-brand-600'
                }`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="avatar-ring">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
              style={{ background: 'var(--avatar-inner)', color: 'var(--btn-sec-text)' }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--body-color)' }}>{user?.name}</p>
            <p className="text-[11px] text-surface-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={() => setConfirmOpen(true)}
          className="w-full flex items-center justify-center gap-2 text-[13px] text-surface-400 hover:text-red-400 py-2.5 rounded-xl transition-all duration-200"
          style={{ background: 'var(--surface-hover)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>

    </aside>

    {/* Portal: renderiza fuera del aside para evitar que el transform cree un containing block */}
    {createPortal(
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            initial="hidden" animate="visible" exit="hidden">
            {/* Backdrop — igual que Modal.jsx */}
            <motion.div
              className="absolute inset-0"
              onClick={() => setConfirmOpen(false)}
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px) saturate(120%)' }}
            />
            {/* Card — bottom sheet en móvil, dialog centrado en sm+ */}
            <motion.div
              className="relative glass-strong w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl px-5 pt-5 pb-6 sm:p-7"
              variants={{
                hidden: { opacity: 0, scale: 0.92, y: 40 },
                visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 320 } },
                exit:    { opacity: 0, scale: 0.92, y: 40, transition: { duration: 0.15 } },
              }}
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>

              {/* Drag handle — solo móvil */}
              <div className="sm:hidden w-10 h-1 rounded-full mx-auto mb-5"
                style={{ background: 'rgba(255,255,255,0.15)' }} />

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
                <LogOut size={22} style={{ color: '#f87171' }} />
              </div>

              <h2 className="text-base font-semibold text-center mb-1" style={{ color: 'var(--body-color)' }}>
                ¿Cerrar sesión?
              </h2>
              <p className="text-sm text-center text-surface-400 mb-6">
                ¿Estás seguro que deseas cerrar sesión?
              </p>

              {/* Botones: apilados en móvil, lado a lado en sm+ */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { setConfirmOpen(false); handleLogout(); }}
                  className="flex-1 min-h-[44px] text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.22)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}>
                  <LogOut size={15} /> Cerrar sesión
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="btn-secondary flex-1 min-h-[44px] text-sm">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
}
