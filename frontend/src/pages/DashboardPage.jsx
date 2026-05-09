import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/common/Modal';
import { SkeletonCard } from '../components/common/Skeleton';
import { Plus, FolderKanban, Clock, Gamepad2, ArrowUpRight, CheckCircle2, FileUp, Activity, Rocket } from 'lucide-react';
import { EmptyState } from '../components/common/Skeleton';
import { timeAgo } from '../utils/helpers';

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const CARD_GRADIENTS = [
  { from: '#7C3AED', to: '#a855f7' },
  { from: '#06B6D4', to: '#22d3ee' },
  { from: '#10B981', to: '#34d399' },
  { from: '#F59E0B', to: '#fbbf24' },
];

function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate(v) { setCount(Math.round(v)); }
    });
    return controls.stop;
  }, [value]);
  return <>{count}</>;
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function activityColor(count, isFuture) {
  if (isFuture) return 'transparent';
  if (count === 0) return 'rgba(255,255,255,0.07)';
  if (count < 3)  return 'rgba(168,85,247,0.35)';
  if (count < 6)  return 'rgba(168,85,247,0.68)';
  return 'rgb(168,85,247)';
}

function GithubActivityGrid({ data }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const map = new Map(data.map(d => [d.date.split('T')[0], d.count]));

  // Align start to the Monday on or before 29 days ago
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  const dow = start.getDay();
  start.setDate(start.getDate() + (dow === 0 ? -6 : 1 - dow));

  // Build rows (one per week, Mon→Sun)
  const weeks = [];
  const cur = new Date(start);
  while (cur <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const ds = cur.toISOString().split('T')[0];
      week.push({ date: ds, count: map.get(ds) || 0, isToday: ds === todayStr, isFuture: new Date(cur) > today });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  return (
    <div className="w-full select-none">
      {/* Header: day-of-week labels */}
      <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
        <div />
        {DAY_LABELS.map(l => (
          <div key={l} className="text-[11px] font-medium text-surface-400 text-center">{l}</div>
        ))}
      </div>

      {/* Rows: one per week */}
      <div className="flex flex-col gap-1.5">
        {weeks.map((week, wi) => {
          const label = new Date(week[0].date + 'T12:00:00');
          return (
            <div key={wi} className="grid gap-1.5 items-center" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
              {/* Week-start date label */}
              <div className="text-[10px] text-surface-500 text-right pr-1.5 whitespace-nowrap">
                {label.getDate()}/{label.getMonth() + 1}
              </div>
              {/* Day cells */}
              {week.map(d => (
                <div
                  key={d.date}
                  title={!d.isFuture ? `${d.count} actividad${d.count !== 1 ? 'es' : ''} — ${d.date}` : undefined}
                  style={{
                    height: '20px',
                    background: activityColor(d.count, d.isFuture),
                    border: d.isToday
                      ? '2px solid rgb(192,132,252)'
                      : '1px solid rgba(255,255,255,0.06)',
                    opacity: d.isFuture ? 0 : 1,
                  }}
                  className="rounded-sm transition-all duration-200 hover:brightness-125 cursor-default"
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] text-surface-500">Menos</span>
        {[0, 2, 4, 7].map((count, i) => (
          <div
            key={i}
            style={{ width: '14px', height: '14px', background: activityColor(count, false) }}
            className="rounded-sm border border-white/[0.06]"
          />
        ))}
        <span className="text-[10px] text-surface-500">Más</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectNameError, setProjectNameError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/projects'),
      api.get('/dashboard/summary')
    ])
    .then(([projRes, sumRes]) => {
      setProjects(projRes.data.projects);
      setSummary(sumRes.data);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const createProject = async (e) => {
    e.preventDefault();
    if (!newName.trim() || creatingProject) return;
    const trimmedName = newName.trim();
    if (projects.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setProjectNameError('Ya tienes un proyecto con ese nombre');
      return;
    }
    setCreatingProject(true);
    try {
      const { data } = await api.post('/projects', { name: trimmedName, description: newDesc });
      setProjects((p) => [data.project, ...p]);
      setNewName(''); setNewDesc('');
      setProjectNameError('');
      setShowNew(false);
    } catch { /* ignore */ }
    finally { setCreatingProject(false); }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 60%)' }} />

      <motion.div className="max-w-6xl mx-auto relative z-10" variants={stagger} initial="hidden" animate="show">
        {/* Header */}
        <motion.div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 pt-2" variants={item}>
          <div>
            <h1 className="text-3xl font-bold mb-1">
              Hola, <span style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {user?.name}
              </span> 👋
            </h1>
            <p className="text-surface-400 text-sm">Aquí está el resumen de tu trabajo</p>
          </div>
          <motion.button
            onClick={() => setShowNew(true)}
            className="btn-primary-pulse flex items-center gap-2 self-start md:self-auto"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            <Plus size={18} /> Nuevo proyecto
          </motion.button>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : summary && (
          <>
            {/* Animated Counters */}
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8" variants={item}>
              <div className="glass p-5 rounded-2xl flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                  <Gamepad2 size={24} />
                </div>
                <div>
                  <p className="text-sm text-surface-400">Proyectos</p>
                  <p className="text-3xl font-bold text-white"><AnimatedCounter value={summary.totals.total_projects} /></p>
                </div>
              </div>
              <div className="glass p-5 rounded-2xl flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-sm text-surface-400">Tareas Asignadas</p>
                  <p className="text-3xl font-bold text-white"><AnimatedCounter value={summary.totals.total_tasks} /></p>
                </div>
              </div>
              <div className="glass p-5 rounded-2xl flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <FileUp size={24} />
                </div>
                <div>
                  <p className="text-sm text-surface-400">Assets Subidos</p>
                  <p className="text-3xl font-bold text-white"><AnimatedCounter value={summary.totals.total_assets} /></p>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Activity Map */}
              <motion.div className="lg:col-span-2 glass p-6 rounded-2xl" variants={item}>
                <div className="flex items-center gap-2 mb-6">
                  <Activity size={18} className="text-brand-400" />
                  <h2 className="text-sm font-semibold text-white">Mapa de Actividad (Último mes)</h2>
                </div>
                <GithubActivityGrid data={summary.activityGrid} />
              </motion.div>

              {/* Recent Tasks */}
              <motion.div className="glass p-6 rounded-2xl flex flex-col" variants={item}>
                <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-cyan-400" /> Tareas Pendientes
                </h2>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                  {summary.recentTasks.length === 0 ? (
                    <p className="text-sm text-surface-400">No tienes tareas pendientes.</p>
                  ) : (
                    summary.recentTasks.map(t => (
                      <div key={t.id} className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05] hover:bg-white/[0.06] transition-colors cursor-pointer" onClick={() => navigate(`/project/${t.project_id}/kanban`)}>
                        <p className="text-sm font-medium text-white line-clamp-1">{t.title}</p>
                        <p className="text-xs text-surface-400 mt-1">{t.project_name}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}

        {/* Projects Grid */}
        <motion.div variants={item}>
          <h2 className="text-xl font-bold text-white mb-4">Tus Proyectos</h2>
          {projects.length === 0 && !loading ? (
            <div className="glass-strong rounded-2xl">
              <EmptyState
                icon={Rocket}
                iconColor="#a855f7"
                title="Aún no tienes proyectos"
                subtitle="Crea tu primer proyecto y empieza a construir algo increíble"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence>
                {projects.map((p, i) => {
                  const grad = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
                  return (
                    <motion.button key={p.id} onClick={() => navigate(`/project/${p.id}`)}
                      className="glass p-6 text-left group relative overflow-hidden"
                      layout whileHover={{
                        y: -4, borderColor: `${grad.from}30`,
                        boxShadow: `0 20px 60px ${grad.from}12, 0 0 0 1px ${grad.from}20`,
                      }} transition={{ duration: 0.3 }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: `linear-gradient(135deg, ${grad.from}06, transparent)` }} />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                            style={{ background: `linear-gradient(135deg, ${grad.from}18, ${grad.to}08)`, border: `1px solid ${grad.from}20`, boxShadow: `0 0 20px ${grad.from}10` }}>
                            <FolderKanban size={20} style={{ color: grad.from }} />
                          </div>
                          <ArrowUpRight size={16} className="text-surface-500 group-hover:text-white transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                        <h3 className="font-semibold text-white text-base mb-1">{p.name}</h3>
                        {p.description && <p className="text-xs text-surface-400 line-clamp-2 leading-relaxed">{p.description}</p>}
                        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
                            <Clock size={11} /> {new Date(p.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          </div>
                          {p.members_preview && p.members_preview.length > 0 && (
                            <div className="flex items-center">
                              <div className="flex -space-x-2">
                                {p.members_preview.map((m, mi) => (
                                  <div key={mi} title={m.name}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border border-surface-900 ring-1 ring-surface-800"
                                    style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}>
                                    {m.name[0].toUpperCase()}
                                  </div>
                                ))}
                              </div>
                              {p.member_count > 3 && (
                                <span className="ml-1.5 text-[10px] text-surface-400 font-medium">+{p.member_count - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Create modal */}
        <Modal open={showNew} onClose={() => { setShowNew(false); setProjectNameError(''); }} title="Nuevo proyecto">
          <form onSubmit={createProject} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Nombre del proyecto</label>
              <input
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setProjectNameError(''); }}
                placeholder="Mi Juego Increíble"
                className="input-field"
                autoFocus required
              />
              {projectNameError && <p className="text-xs text-red-400 mt-1">{projectNameError}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-surface-400 mb-1.5 block">Descripción</label>
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Un RPG 2D con pixel art..." rows={3} className="input-field resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowNew(false); setProjectNameError(''); }} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary disabled:opacity-50" disabled={creatingProject}>
                {creatingProject ? 'Creando…' : 'Crear proyecto'}
              </button>
            </div>
          </form>
        </Modal>
      </motion.div>
    </div>
  );
}
