import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';

export default function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'var(--body-bg, #07070E)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}>

      <motion.div
        className="flex flex-col items-center gap-5"
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>

        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center relative z-10"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
            <Gamepad2 size={38} className="text-white" />
          </div>
          <div className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }} />
        </div>

        {/* Wordmark */}
        <span className="text-2xl font-extrabold tracking-tight"
          style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          IndieForge
        </span>

        {/* Dots */}
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#7C3AED' }}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
