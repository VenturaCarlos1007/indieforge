import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const POSITIONS = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
};

const Y_DELTA = { top: 4, bottom: -4, left: 0, right: 0 };

const canHover =
  typeof window !== 'undefined'
    ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
    : true;

export default function Tooltip({ text, children, side = 'top' }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  const show = () => {
    if (!canHover) return;
    timer.current = setTimeout(() => setVisible(true), 500);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setVisible(false);
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            className={`absolute ${POSITIONS[side]} px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap pointer-events-none z-[80]`}
            style={{
              background: 'rgba(10,10,20,0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            }}
            initial={{ opacity: 0, y: Y_DELTA[side], scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: Y_DELTA[side], scale: 0.92 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}>
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
