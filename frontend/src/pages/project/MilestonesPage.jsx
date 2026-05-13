import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flag, Plus, Pencil, Trash2, Calendar, Check } from 'lucide-react';
import { useProject } from '../../components/layout/ProjectLayout';
import api from '../../services/api';
import Modal from '../../components/common/Modal';

const ENGINES = {
  unity:  { color: '#4CAF50' },
  unreal: { color: '#2196F3' },
  godot:  { color: '#5C6BC0' },
  roblox: { color: '#F59E0B' },
  custom: { color: '#7C3AED' },
};

const STATUS_LABELS = {
  pendiente:   'Pendiente',
  en_progreso: 'En progreso',
  completado:  'Completado',
};
const STATUS_NEXT = {
  pendiente:   'en_progreso',
  en_progreso: 'completado',
  completado:  'pendiente',
};

function parseDateParts(d) {
  const str = d.split('T')[0];
  const [year, month, day] = str.split('-').map(Number);
  return { year, month, day };
}

function formatDate(d) {
  if (!d) return null;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const { year, month, day } = parseDateParts(d);
  return `${day} ${months[month - 1]} ${year}`;
}

function isOverdue(ms) {
  if (ms.status === 'completado' || !ms.due_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { year, month, day } = parseDateParts(ms.due_date);
  return new Date(year, month - 1, day) < today;
}

const stagger = { show: { transition: { staggerChildren: 0.05 } } };
const item    = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function MilestonesPage() {
  const { projectId, project, role } = useProject();
  const accent     = (ENGINES[project?.engine] || ENGINES.custom).color;
  const canManage  = role === 'owner' || role === 'admin';
  const canEdit    = role !== 'viewer';

  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading]       = useState(true);

  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState({ name: '', description: '', due_date: '', status: 'pendiente' });
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [deleting, setDeleting]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/projects/${projectId}/milestones`)
      .then(r => setMilestones(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', due_date: '', status: 'pendiente' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (ms) => {
    setEditing(ms);
    setForm({
      name:        ms.name,
      description: ms.description || '',
      due_date:    ms.due_date ? ms.due_date.split('T')[0] : '',
      status:      ms.status,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    if (form.name.trim().length < 3) { setFormError('El nombre del hito debe tener al menos 3 caracteres.'); return; }
    if (!form.due_date) { setFormError('La fecha límite es requerida.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const body = {
        name:        form.name.trim(),
        description: form.description || null,
        due_date:    form.due_date || null,
        status:      form.status,
      };
      if (editing) {
        const { data } = await api.patch(`/milestones/${editing.id}`, body);
        setMilestones(prev => prev.map(m => m.id === data.id ? data : m));
      } else {
        const { data } = await api.post(`/projects/${projectId}/milestones`, body);
        setMilestones(prev => [...prev, data]);
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error al guardar.');
    } finally { setSaving(false); }
  };

  const cycleStatus = async (ms) => {
    if (!canEdit) return;
    const next = STATUS_NEXT[ms.status];
    try {
      const { data } = await api.patch(`/milestones/${ms.id}`, { status: next });
      setMilestones(prev => prev.map(m => m.id === data.id ? data : m));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await api.delete(`/milestones/${id}`);
      setMilestones(prev => prev.filter(m => m.id !== id));
    } catch (err) { console.error(err); }
    finally { setDeleting(null); }
  };

  return (
    <motion.div className="max-w-5xl mx-auto space-y-6" variants={stagger} initial="hidden" animate="show">

      {/* Header */}
      <motion.div className="flex items-center justify-between" variants={item}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
            <Flag size={18} style={{ color: accent }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Hitos del Proyecto</h1>
            <p className="text-xs text-surface-400">
              {milestones.length} {milestones.length === 1 ? 'hito' : 'hitos'} en total
            </p>
          </div>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> Nuevo hito
          </button>
        )}
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass p-5 animate-pulse">
              <div className="skeleton h-5 w-40 rounded mb-2" />
              <div className="skeleton h-3 w-64 rounded" />
            </div>
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <motion.div variants={item}
          className="glass p-16 flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-6xl select-none">
            🏁
          </motion.div>
          <p className="text-lg font-semibold text-white">Sin hitos aún</p>
          <p className="text-sm text-surface-400 text-center max-w-xs">
            Creá hitos para marcar las etapas importantes de tu proyecto
          </p>
          {canEdit && (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 mt-2">
              <Plus size={15} /> Crear primer hito
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div className="space-y-3" variants={stagger}>
          {milestones.map(ms => {
            const overdue      = isOverdue(ms);
            const statusColor  = ms.status === 'pendiente' ? '#6B7280' : accent;
            return (
              <motion.div key={ms.id} variants={item}
                className="glass p-5 flex items-start gap-4 group hover:border-white/[0.08] transition-colors">

                {/* Status indicator */}
                <div className="shrink-0 mt-0.5">
                  {ms.status === 'completado' ? (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: accent, boxShadow: `0 0 12px ${accent}40` }}>
                      <Check size={16} className="text-white" />
                    </div>
                  ) : ms.status === 'en_progreso' ? (
                    <div className="relative w-9 h-9 flex items-center justify-center">
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ border: `2px solid ${accent}` }}
                        animate={{ boxShadow: [`0 0 0 0 ${accent}50`, `0 0 0 6px transparent`] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                      />
                      <div className="w-3 h-3 rounded-full" style={{ background: accent }} />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full" style={{ border: '2px solid #4B5563' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-white text-base">{ms.name}</h3>
                    {overdue && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                        Vencido
                      </span>
                    )}
                  </div>
                  {ms.description && (
                    <p className="text-sm text-surface-400 mb-2 leading-relaxed">{ms.description}</p>
                  )}
                  {ms.due_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className={overdue ? 'text-red-400' : 'text-surface-500'} />
                      <span className={`text-xs ${overdue ? 'text-red-400' : 'text-surface-500'}`}>
                        {formatDate(ms.due_date)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => canEdit && cycleStatus(ms)}
                    title={canEdit ? 'Cambiar estado' : undefined}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                      canEdit ? 'hover:opacity-75 cursor-pointer' : 'cursor-default'
                    }`}
                    style={{
                      background:   `${statusColor}15`,
                      color:        statusColor,
                      borderColor:  `${statusColor}35`,
                    }}>
                    {STATUS_LABELS[ms.status]}
                  </button>

                  {canEdit && (
                    <button onClick={() => openEdit(ms)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.05]">
                      <Pencil size={13} className="text-surface-400 hover:text-white transition-colors" />
                    </button>
                  )}

                  {canManage && (
                    <button onClick={() => handleDelete(ms.id)} disabled={deleting === ms.id}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 disabled:opacity-50">
                      <Trash2 size={13} className="text-surface-400 hover:text-red-400 transition-colors" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editing ? 'Editar hito' : 'Nuevo hito'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Nombre *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="Ej: Alpha"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="input-field resize-none"
              placeholder="Descripción opcional..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">
              Fecha límite <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-400 mb-2 block">Estado</label>
            <div className="flex gap-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const c = key === 'pendiente' ? '#6B7280' : accent;
                const active = form.status === key;
                return (
                  <button key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, status: key }))}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border"
                    style={{
                      background:  active ? `${c}18` : 'transparent',
                      color:       active ? c : '#6B7280',
                      borderColor: active ? `${c}40` : 'rgba(255,255,255,0.06)',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary disabled:opacity-50">
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear hito'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
