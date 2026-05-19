import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Lock, Settings, AlertTriangle, Save } from 'lucide-react';
import { useProject } from '../../components/layout/ProjectLayout';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function ProjectSettingsPage() {
  const { project, setProject, role, projectId } = useProject();
  const { addToast } = useToast();

  const [isPublic, setIsPublic] = useState(project?.is_public ?? false);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isOwner = role === 'owner';
  const hasChanged = isPublic !== (project?.is_public ?? false);

  const handleToggle = () => {
    if (!isOwner) return;
    const next = !isPublic;
    if (next === true && project?.is_public === false) {
      setShowConfirm(true);
    } else {
      setIsPublic(next);
    }
  };

  const confirmMakePublic = () => {
    setIsPublic(true);
    setShowConfirm(false);
  };

  const handleSave = async () => {
    if (!hasChanged || saving) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/projects/${projectId}`, { is_public: isPublic });
      setProject(data.project);
      addToast({
        message: `El proyecto ahora es ${isPublic ? 'público' : 'privado'}.`,
        type: 'success',
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al guardar los cambios.';
      addToast({ message: msg, type: 'error' });
      setIsPublic(project?.is_public ?? false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.25)' }}
          >
            <Settings size={16} style={{ color: '#FF6B00' }} />
          </div>
          <h1 className="text-xl font-bold text-white">Configuración del proyecto</h1>
        </div>
        <p className="text-sm text-surface-400 ml-11">Gestiona la visibilidad y ajustes generales del proyecto.</p>
      </div>

      {/* Visibility section */}
      <div
        className="rounded-2xl p-5 mb-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <h2 className="text-sm font-semibold text-white">Visibilidad</h2>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: isPublic ? 'rgba(30,144,255,0.15)' : 'rgba(255,255,255,0.06)',
              color: isPublic ? '#1E90FF' : '#9ca3af',
              border: `1px solid ${isPublic ? 'rgba(30,144,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            {isPublic ? 'Público' : 'Privado'}
          </span>
        </div>

        {/* Toggle row */}
        <div
          className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 select-none ${
            isOwner ? 'cursor-pointer hover:bg-white/[0.02]' : 'cursor-not-allowed opacity-60'
          }`}
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          onClick={handleToggle}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
              style={{
                background: isPublic ? 'rgba(30,144,255,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isPublic ? 'rgba(30,144,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {isPublic
                ? <Globe size={16} style={{ color: '#1E90FF' }} />
                : <Lock size={16} style={{ color: '#9ca3af' }} />
              }
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {isPublic ? 'Proyecto público' : 'Proyecto privado'}
              </p>
              <p className="text-[12px] text-surface-400 mt-0.5">
                {isPublic
                  ? 'Cualquier usuario puede encontrar y solicitar unirse a este proyecto'
                  : 'Solo los miembros con invitación pueden acceder'
                }
              </p>
            </div>
          </div>

          {/* Switch */}
          <div
            className="relative shrink-0 w-11 h-6 rounded-full transition-colors duration-300 ml-4"
            style={{ background: isPublic ? '#1E90FF' : 'rgba(255,255,255,0.15)' }}
          >
            <div
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
              style={{ left: isPublic ? 'calc(100% - 20px)' : '4px' }}
            />
          </div>
        </div>

        {!isOwner && (
          <p className="text-xs text-surface-500 mt-3 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            Solo el propietario puede cambiar la visibilidad del proyecto.
          </p>
        )}
      </div>

      {/* Save button */}
      {isOwner && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={!hasChanged || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: hasChanged && !saving
                ? 'linear-gradient(135deg, #1E90FF, #0066cc)'
                : 'rgba(255,255,255,0.08)',
              boxShadow: hasChanged && !saving ? '0 4px 20px rgba(30,144,255,0.3)' : 'none',
            }}
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save size={15} />
            }
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {/* Confirm: private → public */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-md rounded-2xl p-6"
              style={{ background: '#141420', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(30,144,255,0.12)', border: '1px solid rgba(30,144,255,0.25)' }}
                >
                  <Globe size={20} style={{ color: '#1E90FF' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">¿Hacer el proyecto público?</h3>
                  <p className="text-sm text-surface-400">
                    Cualquier usuario de CipoteForge podrá encontrar este proyecto y solicitar unirse.
                    Podrás revertirlo a privado en cualquier momento.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmMakePublic}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #1E90FF, #0066cc)',
                    boxShadow: '0 4px 20px rgba(30,144,255,0.3)',
                  }}
                >
                  Sí, hacer público
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
