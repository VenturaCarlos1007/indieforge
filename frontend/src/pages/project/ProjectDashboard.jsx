import { useEffect, useState, Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProject } from '../../components/layout/ProjectLayout';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import { timeAgo, activityLabel } from '../../utils/helpers';
import { SkeletonStat, SkeletonList } from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import UserAvatar from '../../components/common/UserAvatar';
import { EngineImg } from '../../components/common/EngineIcons';
import {
  Package, CheckCircle2, Clock, Users, Activity,
  Upload, MessageSquare, PlusCircle, UserPlus, Pencil,
  ArrowRight, Layers, Flag, Check, ChevronRight,
} from 'lucide-react';

const ENGINES = {
  unity:  { label: 'Unity',         color: '#4CAF50' },
  unreal: { label: 'Unreal Engine', color: '#2196F3' },
  godot:  { label: 'Godot Engine',  color: '#5C6BC0' },
  roblox: { label: 'Roblox Studio', color: '#F59E0B' },
  custom: { label: 'Personalizado', color: '#FF6B00' },
};

const ROLE_LABELS = { owner: 'Propietario', admin: 'Admin', member: 'Miembro' };
const ROLE_COLORS = { owner: '#FF6B00',     admin: '#22d3ee', member: '#64748b' };

const STATUS_LABELS = { pending: 'Pendiente', in_progress: 'En progreso', done: 'Completada' };
const STATUS_COLORS = { pending: '#64748b',  in_progress: '#22d3ee',     done: '#34d399' };

const ACTION_ICONS = {
  created:      { icon: PlusCircle,    color: '#FF6B00' },
  uploaded:     { icon: Upload,        color: '#22d3ee' },
  commented:    { icon: MessageSquare, color: '#fbbf24' },
  updated:      { icon: Pencil,        color: '#60a5fa' },
  added_member: { icon: UserPlus,      color: '#34d399' },
  deleted:      { icon: Clock,         color: '#f87171' },
  assigned:     { icon: Users,         color: '#fb923c' },
};

function CountUp({ to = 0, duration = 800 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!to) { setVal(0); return; }
    let frameId;
    let start = null;
    const raf = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(p * to));
      if (p < 1) frameId = requestAnimationFrame(raf);
    };
    frameId = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(frameId);
  }, [to, duration]);
  return <>{val}</>;
}

const item   = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

export default function ProjectDashboard() {
  const { projectId, project, setProject, role } = useProject();
  const canEdit = role === 'owner' || role === 'admin';

  const [overview, setOverview]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [onlineIds, setOnlineIds] = useState(new Set());

  const [milestones, setMilestones] = useState([]);

  const [showEdit,   setShowEdit]   = useState(false);
  const [editName,   setEditName]   = useState('');
  const [editDesc,   setEditDesc]   = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState('');

  useEffect(() => {
    api.get(`/projects/${projectId}/overview`)
      .then(r => setOverview(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    api.get(`/projects/${projectId}/milestones`)
      .then(r => setMilestones(r.data))
      .catch(() => {});

    const socket = getSocket();
    if (!socket) return;

    const handleOnline   = ({ onlineUserIds }) => setOnlineIds(new Set(onlineUserIds));
    const handleActivity = (a) => setOverview(prev => prev
      ? { ...prev, recentActivity: [a, ...prev.recentActivity].slice(0, 6) }
      : prev
    );

    socket.on('online_users_update', handleOnline);
    socket.on('new_activity',        handleActivity);
    return () => {
      socket.off('online_users_update', handleOnline);
      socket.off('new_activity',        handleActivity);
    };
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
      const { data: d } = await api.put(`/projects/${projectId}`, { name: editName.trim(), description: editDesc });
      setProject(d.project);
      setShowEdit(false);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Error al guardar.');
    } finally { setEditSaving(false); }
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="glass p-6"><div className="skeleton h-16 rounded-xl" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}
      </div>
      <div className="glass p-6"><SkeletonList count={5} /></div>
    </div>
  );

  if (!overview) return (
    <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
      No se pudo cargar el dashboard.
    </div>
  );

  const { stats, recentActivity, urgentTasks, recentAssets, members } = overview;
  const eng    = ENGINES[project?.engine] || ENGINES.custom;
  const accent = eng.color;

  const onlineMembers = members.filter(m => onlineIds.has(m.user_id));
  const offlineCount  = members.length - onlineMembers.length;

  function getTimelineLine(prev, curr) {
    if (prev.status === 'completado' && curr.status === 'completado') return accent;
    if (prev.status === 'completado') return `linear-gradient(90deg, ${accent}, #374151)`;
    return '#374151';
  }

  const MAX_SHOWN = 5;
  const displayedMilestones = milestones.slice(0, MAX_SHOWN);
  const remainingCount      = Math.max(0, milestones.length - MAX_SHOWN);

  const statConfigs = [
    { key: 'active_tasks',        label: 'Tareas activas',      icon: Clock,        color: accent    },
    { key: 'completed_this_week', label: 'Completadas / semana', icon: CheckCircle2, color: '#34d399' },
    { key: 'total_assets',        label: 'Assets',              icon: Package,      color: '#22d3ee' },
    { key: 'total_members',       label: 'Miembros',            icon: Users,        color: '#fbbf24' },
  ];

  return (
    <motion.div className="max-w-6xl mx-auto space-y-5" variants={stagger} initial="hidden" animate="show">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div className="glass p-6" variants={item}
        style={{ borderColor: `${accent}25`, boxShadow: `0 0 40px ${accent}08` }}>
        <div className="flex items-start gap-5 flex-wrap sm:flex-nowrap">
          {/* Engine icon */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${accent}15`, border: `1px solid ${accent}35`, boxShadow: `0 0 24px ${accent}20` }}>
            <EngineImg engine={project?.engine || 'custom'} size={48} />
          </div>

          {/* Project info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-white">{project?.name}</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}>
                {eng.label}
              </span>
              {canEdit && (
                <button onClick={openEdit}
                  className="flex items-center gap-1 text-[11px] text-surface-400 hover:text-white px-2 py-0.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-all">
                  <Pencil size={11} /> Editar
                </button>
              )}
            </div>
            <p className="text-sm text-surface-400 leading-relaxed">
              {project?.description || <span className="italic text-surface-500">Sin descripción.</span>}
            </p>
            {/* Online strip */}
            {members.length > 0 && (
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="text-[11px] text-surface-500">En línea:</span>
                <div className="flex -space-x-1.5">
                  {onlineMembers.slice(0, 6).map(m => (
                    <div key={m.user_id} className="relative" title={m.name}>
                      <UserAvatar name={m.name} avatarUrl={m.avatar_url} size={24} />
                      <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-blue-500 border border-gray-900" />
                    </div>
                  ))}
                </div>
                {onlineMembers.length === 0
                  ? <span className="text-[11px] text-surface-500">Nadie en línea</span>
                  : onlineMembers.length > 6
                    ? <span className="text-[11px] text-surface-500">+{onlineMembers.length - 6} más</span>
                    : null
                }
                {offlineCount > 0 && (
                  <span className="text-[11px] text-surface-600">· {offlineCount} sin conexión</span>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <NavLink to={`/project/${projectId}/kanban`}
            className="btn-primary flex items-center gap-2 shrink-0 self-start relative overflow-hidden">
            <Layers size={15} />
            <span>Abrir tablero</span>
            <ArrowRight size={14} />
          </NavLink>
        </div>
      </motion.div>

      {/* ── Stat cards ─────────────────────────────────────────────── */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={item}>
        {statConfigs.map(cfg => (
          <motion.div key={cfg.key} className="stat-card"
            variants={item}
            style={{ background: `${cfg.color}08`, borderColor: `${cfg.color}20` }}
            whileHover={{ y: -2, transition: { duration: 0.18 } }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1"
              style={{ background: `${cfg.color}18`, boxShadow: `0 0 16px ${cfg.color}15` }}>
              <cfg.icon size={17} style={{ color: cfg.color }} />
            </div>
            <span className="text-[11px] text-surface-300 font-medium uppercase tracking-wider">{cfg.label}</span>
            <span className="text-3xl font-extrabold" style={{ color: cfg.color }}>
              <CountUp to={stats[cfg.key] || 0} />
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Milestones timeline ─────────────────────────────────────── */}
      {displayedMilestones.length > 0 && (
        <motion.div className="glass p-6" variants={item}
          style={{ borderColor: `${accent}15` }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${accent}18` }}>
                <Flag size={15} style={{ color: accent }} />
              </div>
              <h3 className="font-semibold">Hitos del Proyecto</h3>
            </div>
            <NavLink to={`/project/${projectId}/milestones`}
              className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: accent }}>
              Ver todos <ChevronRight size={13} />
            </NavLink>
          </div>

          <div className="flex items-start overflow-x-auto pb-2 gap-0">
            {displayedMilestones.map((ms, i) => (
              <Fragment key={ms.id}>
                {i > 0 && (
                  <div className="flex-1 h-0.5 mt-4 mx-1 min-w-[20px] shrink"
                    style={{ background: getTimelineLine(displayedMilestones[i - 1], ms) }} />
                )}
                <div className="flex flex-col items-center shrink-0" style={{ minWidth: 72 }}>
                  {ms.status === 'completado' ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: accent, boxShadow: `0 0 10px ${accent}40` }}>
                      <Check size={14} className="text-white" />
                    </div>
                  ) : ms.status === 'en_progreso' ? (
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ border: `2px solid ${accent}` }}
                        animate={{ boxShadow: [`0 0 0 0 ${accent}50`, `0 0 0 5px transparent`] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                      />
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full" style={{ border: '2px solid #4B5563' }} />
                  )}
                  <span className={`text-[10px] mt-1.5 text-center leading-tight font-medium ${
                    ms.status === 'en_progreso' ? '' : ms.status === 'completado' ? '' : 'text-surface-500'
                  }`}
                    style={ms.status !== 'pendiente' ? { color: accent } : undefined}>
                    {ms.name}
                  </span>
                </div>
              </Fragment>
            ))}
            {remainingCount > 0 && (
              <Fragment>
                <div className="flex-1 h-0.5 mt-4 mx-1 min-w-[20px] shrink" style={{ background: '#374151' }} />
                <div className="flex flex-col items-center shrink-0" style={{ minWidth: 56 }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-surface-400"
                    style={{ border: '2px dashed #4B5563' }}>
                    +{remainingCount}
                  </div>
                  <span className="text-[10px] mt-1.5 text-surface-500">más</span>
                </div>
              </Fragment>
            )}
          </div>
        </motion.div>
      )}

      {/* ── 2-column content ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Activity feed (3 cols) */}
        <motion.div className="lg:col-span-3 glass p-6" variants={item}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#FF6B0018' }}>
              <Activity size={15} style={{ color: '#FF6B00' }} />
            </div>
            <h3 className="font-semibold">Actividad reciente</h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-8">Sin actividad todavía.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px"
                style={{ background: 'linear-gradient(180deg, #FF6B0030, transparent)' }} />
              <div className="space-y-0.5">
                {recentActivity.slice(0, 5).map((a, i) => (
                  <motion.div key={a.id || i}
                    className="flex items-start gap-3 py-2 group"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}>
                    <UserAvatar name={a.user_name} avatarUrl={a.avatar_url} size={30}
                      className="relative z-10 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm leading-snug">
                        <span className="font-semibold text-white">{a.user_name}</span>{' '}
                        <span className="text-surface-300">{activityLabel(a.action, a.resource_type)}</span>
                      </p>
                      <span className="text-[11px] text-surface-500">{timeAgo(a.created_at)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              {recentActivity.length > 5 && (
                <div className="mt-3 pt-3 border-t border-white/[0.05]">
                  <NavLink to={`/project/${projectId}/stats`}
                    className="flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors">
                    Ver toda la actividad <ArrowRight size={13} />
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Right column (2 cols) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Urgent tasks */}
          <motion.div className="glass p-5" variants={item}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#fb923c18' }}>
                <Clock size={14} style={{ color: '#fb923c' }} />
              </div>
              <h3 className="font-semibold text-sm">Tareas urgentes</h3>
              <span className="ml-auto text-[11px] text-surface-500">{urgentTasks.length} pendientes</span>
            </div>
            {urgentTasks.length === 0 ? (
              <p className="text-xs text-surface-500 text-center py-5">¡Todo al día!</p>
            ) : (
              <div className="space-y-1.5">
                {urgentTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: STATUS_COLORS[t.status] || '#64748b' }} />
                    <span className="flex-1 text-xs text-surface-200 truncate">{t.title}</span>
                    {t.assigned_name && (
                      <UserAvatar name={t.assigned_name} avatarUrl={t.assigned_avatar} size={20} />
                    )}
                    <span className="text-[10px] shrink-0" style={{ color: STATUS_COLORS[t.status] }}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent assets */}
          <motion.div className="glass p-5" variants={item}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#22d3ee18' }}>
                <Package size={14} style={{ color: '#22d3ee' }} />
              </div>
              <h3 className="font-semibold text-sm">Assets recientes</h3>
            </div>
            {recentAssets.length === 0 ? (
              <p className="text-xs text-surface-500 text-center py-5">No hay assets todavía.</p>
            ) : (
              <div className="space-y-1.5">
                {recentAssets.map(a => (
                  <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#22d3ee12' }}>
                      <Upload size={13} style={{ color: '#22d3ee' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-surface-200 truncate">{a.name}</p>
                      <p className="text-[10px] text-surface-500">{timeAgo(a.created_at)}</p>
                    </div>
                    {a.uploaded_by_name && (
                      <UserAvatar name={a.uploaded_by_name} avatarUrl={a.uploaded_by_avatar} size={20} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Team bar ────────────────────────────────────────────────── */}
      <motion.div className="glass p-5" variants={item}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#fbbf2418' }}>
            <Users size={15} style={{ color: '#fbbf24' }} />
          </div>
          <h3 className="font-semibold text-sm">Equipo</h3>
          <span className="text-[11px] text-surface-500 ml-1">
            · {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </span>
        </div>
        <div className="flex md:grid overflow-x-auto md:overflow-visible gap-2.5 pb-1 md:pb-0 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {members.map(m => {
            const isOnline = onlineIds.has(m.user_id);
            const rColor   = ROLE_COLORS[m.role] || '#64748b';
            return (
              <div key={m.user_id}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02] transition-all shrink-0 min-w-[160px] md:min-w-0">
                <div className="relative shrink-0">
                  <UserAvatar name={m.name} avatarUrl={m.avatar_url} size={32} />
                  <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-gray-900 ${
                    isOnline ? 'bg-blue-500 online-dot-pulse' : 'bg-surface-600'
                  }`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{m.name}</p>
                  <span className="text-[10px] font-medium" style={{ color: rColor }}>
                    {ROLE_LABELS[m.role] || m.role}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar proyecto">
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Nombre</label>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              className="input-field" autoFocus required />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Descripción</label>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
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
