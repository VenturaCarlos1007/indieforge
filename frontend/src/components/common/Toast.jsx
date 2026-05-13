import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertCircle, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const STYLES = {
  success: { border: 'rgba(16,185,129,0.35)',  glow: 'rgba(16,185,129,0.08)',  color: '#34d399' },
  error:   { border: 'rgba(239,68,68,0.35)',   glow: 'rgba(239,68,68,0.08)',   color: '#f87171' },
  info:    { border: 'rgba(124,58,237,0.35)',  glow: 'rgba(124,58,237,0.08)', color: '#a855f7' },
};

function SuccessCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M5 13l4 4L19 7" className="check-draw" />
    </svg>
  );
}

export default function ToastContainer() {
  const ctx = useToast();
  if (!ctx) return null;
  const { toasts, dismiss } = ctx;

  return (
    <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const s = STYLES[toast.type] || STYLES.info;
          return (
            <motion.div
              key={toast.id}
              initial={{ x: '110%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '110%', opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-sm max-w-sm"
              style={{
                background: '#0d0f18',
                border: `1px solid ${s.border}`,
                boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 0 4px ${s.glow}`,
                backdropFilter: 'blur(16px)',
              }}
            >
              {toast.type === 'success'
                ? <SuccessCheck />
                : toast.type === 'error'
                  ? <AlertCircle size={16} style={{ color: s.color, flexShrink: 0 }} />
                  : <Info size={16} style={{ color: s.color, flexShrink: 0 }} />
              }
              <span className="flex-1 text-white/85 text-[13px] leading-snug">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-white/25 hover:text-white/60 transition-colors ml-1"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
