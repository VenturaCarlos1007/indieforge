import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useProject } from '../../components/layout/ProjectLayout';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import { timeAgo, activityLabel } from '../../utils/helpers';
import { SkeletonStat, SkeletonList } from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import {
  Package, CheckCircle2, Clock, Users, Activity, TrendingUp,
  Upload, MessageSquare, PlusCircle, UserPlus, Folder, Pencil
} from 'lucide-react';

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

const ACTION_ICONS = {
  created: { icon: PlusCircle, color: '#a855f7' },
  uploaded: { icon: Upload, color: '#22d3ee' },
  commented: { icon: MessageSquare, color: '#fbbf24' },
  updated: { icon: Pencil, color: '#60a5fa' },
  added_member: { icon: UserPlus, color: '#34d399' },
  deleted: { icon: Clock, color: '#f87171' },
  assigned: { icon: Users, color: '#fb923c' },
};

const STAT_CONFIGS = [
  { key: 'assets', label: 'Assets', icon: Package, gradient: 'linear-gradient(135deg, #7C3AED15, #7C3AED05)', borderColor: '#7C3AED25', iconBg: '#7C3AED20', iconColor: '#a855f7', valueColor: '#c084fc' },
  { key: 'done', label: 'Completadas', icon: CheckCircle2, gradient: 'linear-gradient(135deg, #10B98115, #10B98105)', borderColor: '#10B98125', iconBg: '#10B98120', iconColor: '#34d399', valueColor: '#6ee7b7' },
  { key: 'in_progress', label: 'En progreso', icon: TrendingUp, gradient: 'linear-gradient(135deg, #06B6D415, #06B6D405)', borderColor: '#06B6D425', iconBg: '#06B6D420', iconColor: '#22d3ee', valueColor: '#67e8f9' },
  { key: 'members', label: 'Miembros', icon: Users, gradient: 'linear-gradient(135deg, #F59E0B15, #F59E0B05)', borderColor: '#F59E0B25', iconBg: '#F59E0B20', iconColor: '#fbbf24', valueColor: '#fde68a' },
];

export default function ProjectDashboard() {
  const { projectId, project, setProject, role } = useProject();
  const canEdit = role === 'owner' || role === 'admin';
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [s, a] = await Promise.all([
          api.get(`/activity/stats?project_id=${projectId}`),
          api.get(`/activity?project_id=${projectId}&limit=20`),
        ]);
        setStats(s.data.stats);
        setActivities(a.data.activities);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();

    const socket = getSocket();
    if (socket) {
      const handler = (data) => setActivities((prev) => [data, ...prev].slice(0, 30));
      socket.on('new_activity', handler);
      return () => socket.off('new_activity', handler);
    }
  }, [projectId]);

  const openEdit = () => {
    setEditName(project?.name || '');
    setEditDesc(project?.description || '');
    setEditError('');
    setShowEdit(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || editSaving) return;
    setEditSaving(true);
    setEditError('');
    try {
      const { data } = await api.put(`/projects/${projectId}`, { name: editName.trim(), description: editDesc });
      setProject(data.project);
      setShowEdit(false);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Error al guardar.');
    } finally { setEditSaving(false); }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}
      </div>
      <div className="glass p-6"><SkeletonList count={6} /></div>
    </div>
  );

  const taskTotal = stats.total_tasks || 1;
  const donePercent = Math.round((stats.tasks.done / taskTotal) * 100);

  const statValues = {
    assets: stats.total_assets,
    done: stats.tasks.done,
    in_progress: stats.tasks.in_progress,
    members: stats.total_members,
  };

  return (
    <motion.div className="max-w-5xl mx-auto space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* Header with edit button */}
      {canEdit && (
        <motion.div className="flex justify-end" variants={item}>
          <button onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-surface-300 hover:text-white border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all">
            <Pencil size={13} /> Editar proyecto
          </button>
        </motion.div>
      )}

      {/* Stat cards */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={item}>
        {STAT_CONFIGS.map((cfg) => (
          <motion.div key={cfg.key} className="stat-card group" variants={item}
            style={{ background: cfg.gradient, borderColor: cfg.borderColor }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
              style={{ background: cfg.iconBg, boxShadow: `0 0 20px ${cfg.iconColor}15` }}>
              <cfg.icon size={19} style={{ color: cfg.iconColor }} />
            </div>
            <span className="text-[11px] text-surface-300 font-medium uppercase tracking-wider">{cfg.label}</span>
            <span className="text-3xl font-extrabold" style={{ color: cfg.valueColor }}>{statValues[cfg.key]}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Progress bar */}
      <motion.div className="glass p-5" variants={item}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Progreso general</span>
          <span className="text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {donePercent}%
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <motion.div
            className="h-full rounded-full relative"
            style={{ background: 'linear-gradient(90deg, #7C3AED, #06B6D4)' }}
            initial={{ width: 0 }}
            animate={{ width: `${donePercent}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2) 50%, transparent)', animation: 'shimmer 2s infinite linear', backgroundSize: '200% 100%' }} />
          </motion.div>
        </div>
        <div className="flex gap-5 mt-3 text-xs text-surface-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-surface-400" />{stats.tasks.pending} pendientes</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#06B6D4' }} />{stats.tasks.in_progress} en progreso</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981' }} />{stats.tasks.done} completadas</span>
        </div>
      </motion.div>

      {/* Activity feed — Timeline style */}
      <motion.div className="glass p-6" variants={item}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.12)' }}>
            <Activity size={17} style={{ color: '#a855f7' }} />
          </div>
          <h3 className="font-semibold text-base">Actividad reciente</h3>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-10">No hay actividad todavía.</p>
        ) : (
          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: 'linear-gradient(180deg, #7C3AED30, #06B6D420, transparent)' }} />

            <div className="space-y-0.5">
              {activities.map((a, i) => {
                const actionConfig = ACTION_ICONS[a.action] || ACTION_ICONS.created;
                const ActionIcon = actionConfig.icon;
                return (
                  <motion.div
                    key={a.id || i}
                    className="flex items-start gap-4 py-2.5 pl-0 relative group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    {/* Timeline dot */}
                    <div className="w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 relative z-10 transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `${actionConfig.color}15`, boxShadow: `0 0 12px ${actionConfig.color}10` }}>
                      <ActionIcon size={14} style={{ color: actionConfig.color }} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm">
                        <span className="font-semibold text-white">{a.user_name}</span>{' '}
                        <span className="text-surface-300">{activityLabel(a.action, a.resource_type)}</span>
                      </p>
                      <span className="text-[11px] text-surface-400">{timeAgo(a.created_at || a.timestamp)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar proyecto">
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Nombre</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)}
              className="input-field" autoFocus required />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Descripción</label>
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
              rows={3} className="input-field resize-none" />
          </div>
          {editError && <p className="text-xs text-red-400">{editError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={editSaving} className="btn-primary disabled:opacity-50">
              {editSaving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
