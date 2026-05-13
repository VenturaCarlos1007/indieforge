import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { EngineImg } from './EngineIcons';

const ENGINES = {
  unity:  { label: 'Unity',         color: '#4CAF50', stack: 'C# · PREFABS · SCENES · PACKAGES' },
  unreal: { label: 'Unreal',        color: '#2196F3', stack: 'BLUEPRINTS · C++ · NANITE · LUMEN' },
  godot:  { label: 'Godot',         color: '#5C6BC0', stack: 'GDSCRIPT · SCENES · NODES · SIGNALS' },
  roblox: { label: 'Roblox',        color: '#F59E0B', stack: 'LUA · DATASTORES · LIVE OPS' },
  custom: { label: 'Personalizado', color: '#7C3AED', stack: 'CUALQUIER MOTOR O FRAMEWORK' },
};

const STEPS = [
  { label: 'Inicializando proyecto',         desc: 'Configurando el espacio de trabajo...' },
  { label: 'Creando tableros',               desc: 'Generando tableros del motor...' },
  { label: 'Aplicando preset del motor',     desc: 'configurando pipeline del motor...' },
  { label: 'Construyendo columnas Kanban',   desc: 'Estructurando flujo de tareas...' },
  { label: 'Generando hitos',                desc: 'Planificando hitos del proyecto...' },
  { label: 'Registrando etiquetas del motor',desc: 'Etiquetando assets y tareas...' },
  { label: '¡Proyecto listo!',               desc: '¡Lanzando tu proyecto!' },
];

// Step i becomes active at APPEAR_TIMES[i], done at DONE_TIMES[i]
const APPEAR_TIMES = [0, 500, 1200, 2000, 2800, 3400, 4000];
const DONE_TIMES   = [500, 1200, 2000, 2800, 3400, 4000, 4600];
const TOTAL_MS     = 4800;

export default function ProjectInitScreen({ engine, projectName, apiPromise, onComplete, onError }) {
  const eng = ENGINES[engine] || ENGINES.custom;

  const [stepStatus, setStepStatus] = useState({});
  const [progress, setProgress] = useState(0);
  const [animDone, setAnimDone] = useState(false);
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState(null);

  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Fire API call
  useEffect(() => {
    let cancelled = false;
    apiPromise
      .then(({ data }) => { if (!cancelled) setApiResult(data.project); })
      .catch((err) => { if (!cancelled) setApiError(err); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step timers + progress bar
  useEffect(() => {
    const timers = [];
    APPEAR_TIMES.forEach((t, i) =>
      timers.push(setTimeout(() => setStepStatus((s) => ({ ...s, [i]: 'active' })), t))
    );
    DONE_TIMES.forEach((t, i) =>
      timers.push(setTimeout(() => setStepStatus((s) => ({ ...s, [i]: 'done' })), t))
    );
    timers.push(setTimeout(() => setAnimDone(true), DONE_TIMES[DONE_TIMES.length - 1]));

    const startMs = Date.now();
    const interval = setInterval(() => {
      const p = Math.min(100, ((Date.now() - startMs) / TOTAL_MS) * 100);
      setProgress(p);
      if (p >= 100) clearInterval(interval);
    }, 50);

    return () => { timers.forEach(clearTimeout); clearInterval(interval); };
  }, []);

  // Redirect when animation + API both complete
  useEffect(() => {
    if (animDone && apiResult) {
      const t = setTimeout(() => onCompleteRef.current(apiResult), 300);
      return () => clearTimeout(t);
    }
    if (animDone && apiError) {
      onErrorRef.current(apiError);
    }
  }, [animDone, apiResult, apiError]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#090b11' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      {/* Dots pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 35%, ${eng.color}12 0%, transparent 65%)`,
        }}
      />

      {/* Breadcrumb */}
      <div className="relative z-10 px-8 pt-8">
        <p
          className="text-[11px] font-mono font-semibold tracking-widest select-none"
          style={{ color: `${eng.color}70` }}
        >
          INDIEFORGE{' '}
          <span style={{ color: 'rgba(255,255,255,0.18)' }}>|</span>{' '}
          INICIANDO PROYECTO{' '}
          <span style={{ color: 'rgba(255,255,255,0.18)' }}>|</span>{' '}
          <span style={{ color: eng.color }}>{eng.label.toUpperCase()}</span>
        </p>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-10">
        {/* Orbital icon */}
        <div
          style={{
            position: 'relative',
            width: 160,
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Decorative orbit ring */}
          <div
            style={{
              position: 'absolute',
              width: 136,
              height: 136,
              borderRadius: '50%',
              border: `1px dashed ${eng.color}22`,
            }}
          />

          {/* Orbiting dots */}
          {[0, 90, 180, 270].map((startAngle, i) => (
            <motion.div
              key={i}
              style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%' }}
              initial={{ rotate: startAngle }}
              animate={{ rotate: startAngle + 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: eng.color,
                  boxShadow: `0 0 10px ${eng.color}, 0 0 20px ${eng.color}60`,
                  top: 8,
                  left: 'calc(50% - 4px)',
                }}
              />
            </motion.div>
          ))}

          {/* Center icon */}
          <motion.div
            style={{
              position: 'relative',
              zIndex: 1,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: `${eng.color}15`,
              border: `2px solid ${eng.color}50`,
              color: eng.color,
              boxShadow: `0 0 30px ${eng.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <EngineImg engine={engine} size={64} />
          </motion.div>
        </div>

        {/* Project name + stack */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">{projectName}</h1>
          <p
            className="text-[11px] font-mono font-semibold tracking-widest"
            style={{ color: `${eng.color}70` }}
          >
            {eng.stack}
          </p>
        </div>

        {/* Checklist */}
        <div className="w-full max-w-xs space-y-3">
          <AnimatePresence>
            {STEPS.map((step, i) => {
              const status = stepStatus[i];
              if (!status) return null;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-3"
                >
                  {/* Indicator */}
                  <div style={{ width: 20, height: 20, flexShrink: 0 }}>
                    {status === 'done' ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 8px rgba(16,185,129,0.5)',
                        }}
                      >
                        <Check size={10} color="white" strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <div style={{ position: 'relative', width: 20, height: 20 }}>
                        <motion.div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            border: `2px solid ${eng.color}30`,
                            borderTopColor: eng.color,
                          }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className="text-sm flex-1"
                    style={{ color: status === 'done' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.9)' }}
                  >
                    {step.label}
                  </span>

                  {/* Right status */}
                  {status === 'done' ? (
                    <span className="text-xs font-semibold" style={{ color: '#10B981' }}>
                      ✓ listo
                    </span>
                  ) : (
                    <span className="text-[11px] text-right" style={{ color: `${eng.color}70` }}>
                      {step.desc}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-8 pb-10">
        <div
          style={{
            width: '100%',
            height: 2,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <motion.div
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${eng.color}80, ${eng.color})`,
              borderRadius: 2,
              boxShadow: `0 0 6px ${eng.color}60`,
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
        <p className="text-[11px] text-surface-600 mt-2 text-center font-mono">
          {Math.round(progress)}% completado
        </p>
      </div>
    </motion.div>
  );
}
