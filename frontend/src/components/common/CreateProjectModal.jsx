import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Globe } from 'lucide-react';
import { EngineImg } from './EngineIcons';

export const ENGINES = {
  unity: {
    label: 'Unity',
    color: '#4CAF50',
    text: '#81C784',
    stack: ['C#', 'Prefabs', 'Scenes', 'Packages'],
    boards: ['Escenas', 'Prefabs', 'Scripts', 'Builds'],
  },
  unreal: {
    label: 'Unreal',
    color: '#2196F3',
    text: '#64B5F6',
    stack: ['Blueprints', 'C++', 'Nanite', 'Lumen'],
    boards: ['Sistemas Blueprint', 'Sistemas C++', 'Niveles', 'Shaders / Materiales'],
  },
  godot: {
    label: 'Godot',
    color: '#5C6BC0',
    text: '#9FA8DA',
    stack: ['GDScript', 'Scenes', 'Nodes', 'Signals'],
    boards: ['Escenas', 'Scripts', 'Shaders', 'Plugins'],
  },
  roblox: {
    label: 'Roblox',
    color: '#F59E0B',
    text: '#FCD34D',
    stack: ['Lua', 'Datastores', 'Live Ops'],
    boards: ['Scripts de Gameplay', 'Construcción de Mapas', 'Monetización', 'Live Ops'],
  },
  custom: {
    label: 'Personalizado',
    color: '#FF6B00',
    text: '#FFA060',
    stack: ['Cualquier motor o framework'],
    boards: [],
  },
};

export const BASE_BOARDS = [
  'Tareas de Gameplay', 'Seguimiento de Bugs', 'Pipeline de Arte', 'Audio',
  'Diseño de Niveles', 'Build y Release', 'Marketing',
];

const panel = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 320 } },
  exit: { opacity: 0, scale: 0.92, y: 30, transition: { duration: 0.15 } },
};

export default function CreateProjectModal({ open, onClose, onSubmit, existingNames = [] }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [engine, setEngine] = useState('custom');
  const [nameError, setNameError] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const eng = ENGINES[engine];

  useEffect(() => {
    if (!open) { setName(''); setDesc(''); setEngine('custom'); setNameError(''); setIsPublic(false); }
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed.length < 3) setNameError('El nombre debe tener al menos 3 caracteres.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length < 3) { setNameError('El nombre debe tener al menos 3 caracteres.'); return; }
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setNameError('Ya tienes un proyecto con ese nombre');
      return;
    }
    onSubmit({ name: trimmed, description: desc, engine, isPublic });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0"
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          />

          <motion.div
            variants={panel}
            initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{
              background: '#0f1117',
              border: `1px solid ${eng.color}40`,
              boxShadow: `0 0 40px ${eng.color}18, 0 25px 50px rgba(0,0,0,0.5)`,
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
            }}
          >
            <div className="p-4 sm:p-7">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${eng.color}20`,
                      color: eng.color,
                      border: `1px solid ${eng.color}40`,
                      transition: 'all 150ms ease',
                    }}
                  >
                    <EngineImg engine={engine} size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    Nuevo proyecto{' '}
                    <span style={{ color: eng.color, transition: 'color 150ms ease' }}>
                      {engine === 'custom' ? 'personalizado' : eng.label}
                    </span>
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-surface-400 mb-1.5 block">
                    Nombre del proyecto
                  </label>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameError(''); }}
                    onBlur={handleNameBlur}
                    placeholder="Mi Juego Increíble"
                    className="input-field"
                    style={nameError ? { borderColor: '#f87171' } : {}}
                    autoFocus
                    required
                  />
                  {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-surface-400 mb-1.5 block">
                    Descripción{' '}
                    <span className="text-surface-600 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Un RPG 2D con pixel art..."
                    rows={2}
                    className="input-field resize-none"
                  />
                </div>

                {/* Engine selector */}
                <div>
                  <label className="text-xs font-medium text-surface-400 mb-2 block">Motor</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {Object.entries(ENGINES).map(([key, e]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEngine(key)}
                        className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-xs font-medium"
                        style={{
                          background: engine === key ? `${e.color}18` : 'rgba(255,255,255,0.03)',
                          borderColor: engine === key ? `${e.color}60` : 'rgba(255,255,255,0.08)',
                          color: engine === key ? e.color : '#6b7280',
                          boxShadow: engine === key ? `0 0 14px ${e.color}25` : 'none',
                          transition: 'all 150ms ease',
                        }}
                      >
                        <EngineImg
                          engine={key}
                          size={32}
                          style={{ opacity: engine === key ? 1 : 0.4, transition: 'opacity 150ms ease' }}
                        />
                        <span>{e.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Stack badges */}
                  <motion.div
                    key={engine}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-wrap gap-1.5 mt-3"
                  >
                    {eng.stack.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                        style={{
                          background: `${eng.color}15`,
                          color: eng.text,
                          border: `1px solid ${eng.color}30`,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </motion.div>
                </div>

                {/* Boards preview */}
                <div>
                  <label className="text-xs font-medium text-surface-400 mb-2 block">
                    Tableros que se crearán
                  </label>
                  <motion.div
                    key={`boards-${engine}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-wrap gap-1.5"
                  >
                    {BASE_BOARDS.map((b) => (
                      <span
                        key={b}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          color: '#9ca3af',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {b}
                      </span>
                    ))}
                    {eng.boards.map((b) => (
                      <span
                        key={b}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${eng.color}15`,
                          color: eng.text,
                          border: `1px solid ${eng.color}30`,
                        }}
                      >
                        {b}
                      </span>
                    ))}
                  </motion.div>
                </div>

                {/* Visibilidad */}
                <div
                  className="flex items-center justify-between p-4 rounded-xl cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onClick={() => setIsPublic((v) => !v)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: isPublic ? 'rgba(30,144,255,0.12)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isPublic ? 'rgba(30,144,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {isPublic
                        ? <Globe size={14} style={{ color: '#1E90FF' }} />
                        : <Lock size={14} style={{ color: '#9ca3af' }} />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {isPublic ? 'Proyecto público' : 'Proyecto privado'}
                      </p>
                      <p className="text-[11px] text-surface-400">
                        {isPublic
                          ? 'Cualquiera puede ver este proyecto en el explorador'
                          : 'Solo los miembros pueden ver este proyecto'
                        }
                      </p>
                    </div>
                  </div>
                  <div
                    className="relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200"
                    style={{ background: isPublic ? '#1E90FF' : 'rgba(255,255,255,0.15)' }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow"
                      style={{ left: isPublic ? 'calc(100% - 18px)' : '2px' }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={onClose} className="btn-secondary">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || name.trim().length < 3}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(135deg, ${eng.color}ee, ${eng.color}aa)`,
                      boxShadow: `0 4px 20px ${eng.color}35`,
                      opacity: (!name.trim() || name.trim().length < 3) ? 0.5 : 1,
                      transition: 'all 150ms ease',
                    }}
                  >
                    Crear proyecto {engine === 'custom' ? 'personalizado' : eng.label} →
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
