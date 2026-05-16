import { motion } from 'framer-motion';

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
        <img src="/logo2.0.png" alt="CipoteForge" style={{ width: 100, height: 100, objectFit: 'contain' }} />

        {/* Wordmark */}
        <span style={{ background: 'linear-gradient(to right, #1E90FF, #FF6B00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 'bold', fontSize: '28px' }}>CipoteForge</span>

        {/* Tagline */}
        <span style={{ color: '#1E90FF', fontSize: '14px' }}>Game Dev · El Salvador 🌋</span>

        {/* Dots */}
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2].map(i => (
            <motion.div key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#FF6B00' }}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
