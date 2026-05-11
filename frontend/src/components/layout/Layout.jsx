import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Sun, Moon, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import GlobalSearchModal from '../common/GlobalSearchModal';
import Tooltip from '../common/Tooltip';
import { useTheme } from '../../context/ThemeContext';

const SECTION_MAP = {
  '/dashboard': 'Proyectos',
  '/profile':   'Mi Perfil',
  '/kanban':    'Kanban',
  '/assets':    'Assets',
  '/members':   'Miembros',
  '/stats':     'Estadísticas',
  '/chat':      'Chat',
};

function getSectionName(pathname) {
  for (const [key, name] of Object.entries(SECTION_MAP)) {
    if (pathname.includes(key)) return name;
  }
  if (pathname.startsWith('/project/')) return 'Dashboard';
  return 'IndieForge';
}

export default function Layout() {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark, toggle } = useTheme();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 md:px-6 py-3 shrink-0 z-20">
          {/* Hamburger — mobile only */}
          <Tooltip text="Abrir menú" side="bottom">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0 cursor-pointer"
              style={{ background: 'var(--btn-sec-bg)', border: '1px solid var(--btn-sec-border)' }}
            >
              <Menu size={18} style={{ color: 'var(--body-color)' }} />
            </button>
          </Tooltip>

          {/* Section name — mobile only */}
          <span className="md:hidden text-sm font-semibold truncate flex-1" style={{ color: 'var(--body-color)' }}>
            {getSectionName(location.pathname)}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <Tooltip text={dark ? 'Modo claro' : 'Modo oscuro'} side="bottom">
              <button
                onClick={toggle}
                aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                style={{ background: 'var(--btn-sec-bg)', border: '1px solid var(--btn-sec-border)' }}
              >
                {dark
                  ? <Sun size={15} style={{ color: '#fbbf24' }} />
                  : <Moon size={15} style={{ color: '#7C3AED' }} />
                }
              </button>
            </Tooltip>
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative">
          <div className="pointer-events-none fixed top-0 right-0 w-[600px] h-[600px] opacity-[0.03]"
            style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }} />
          <div className="pointer-events-none fixed bottom-0 left-1/3 w-[500px] h-[500px] opacity-[0.02]"
            style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />

          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname.split('/').slice(0, 3).join('/')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="px-4 md:px-6 lg:px-8 pb-6 lg:pb-8 min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>

          <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </main>
      </div>
    </div>
  );
}
