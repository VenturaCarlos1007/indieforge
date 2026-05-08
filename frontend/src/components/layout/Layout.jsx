import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import GlobalSearchModal from '../common/GlobalSearchModal';

export default function Layout() {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        {/* Subtle ambient glow */}
        <div className="pointer-events-none fixed top-0 right-0 w-[600px] h-[600px] opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }} />
        <div className="pointer-events-none fixed bottom-0 left-1/3 w-[500px] h-[500px] opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, #06B6D4, transparent 70%)' }} />

        {/* Global Header for Notification Bell */}
        <header className="absolute top-0 right-0 p-4 md:p-6 w-full flex justify-end items-center pointer-events-none z-50">
          <div className="pointer-events-auto">
            <NotificationBell />
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname.split('/').slice(0, 3).join('/')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="p-6 lg:p-8 min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        
        <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </main>
    </div>
  );
}
