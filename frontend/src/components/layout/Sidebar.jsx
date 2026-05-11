import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, LogOut, Gamepad2, Sparkles, Settings, User } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Proyectos', icon: LayoutDashboard, accent: '#a855f7' },
  { to: '/profile', label: 'Mi Perfil', icon: User, accent: '#06b6d4' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
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
        <div className="relative">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
            <Gamepad2 size={22} className="text-white relative z-10" />
          </div>
          <div className="absolute inset-0 rounded-xl blur-xl opacity-40"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }} />
        </div>
        <div>
          <span className="text-lg font-extrabold tracking-tight block"
            style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            IndieForge
          </span>
          <span className="text-[10px] text-surface-400 dark:text-surface-500 font-medium tracking-widest uppercase flex items-center gap-1">
            <Sparkles size={8} /> Game Studio
          </span>
        </div>
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
        <button onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-[13px] text-surface-400 hover:text-red-400 py-2.5 rounded-xl transition-all duration-200"
          style={{ background: 'var(--surface-hover)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
