import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { SkeletonCard } from '../components/common/Skeleton';
import { Plus, Clock, Gamepad2, ArrowUpRight, CheckCircle2, FileUp, Activity, Rocket, Lock, Globe, Sparkles, Users } from 'lucide-react';
import { EngineImg } from '../components/common/EngineIcons';
import { EmptyState } from '../components/common/Skeleton';
import { timeAgo } from '../utils/helpers';
import CreateProjectModal from '../components/common/CreateProjectModal';
import ProjectInitScreen from '../components/common/ProjectInitScreen';

/* ── Animation variants ── */
const cardVariant = {
  hidden: { opacity: 0, y: 22, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22,1,0.36,1] } } };

const initial = (name) => name?.[0]?.toUpperCase() || '?';

const CARD_GRADIENTS = [
  { from: '#FF6B00', to: '#FB923C' },
  { from: '#06B6D4', to: '#22d3ee' },
  { from: '#10B981', to: '#34d399' },
  { from: '#F59E0B', to: '#fbbf24' },
];

const ENGINE_ACCENT = {
  unity:  '#4CAF50',
  unreal: '#2196F3',
  godot:  '#5C6BC0',
  roblox: '#F59E0B',
  custom: '#FF6B00',
};

/* ── Animated counter ── */
function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.5, ease: 'easeOut',
      onUpdate(v) { setCount(Math.round(v)); }
    });
    return controls.stop;
  }, [value]);
  return <>{count}</>;
}

/* ── Activity grid ── */
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
function activityColor(count, isFuture) {
  if (isFuture) return 'transparent';
  if (count === 0) return '#1E293B';               /* visible pero sutil */
  if (count < 3)  return 'rgba(255,107,0,0.35)';
  if (count < 6)  return 'rgba(255,107,0,0.65)';
  return 'rgb(255,107,0)';
}

function GithubActivityGrid({ data }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const map = new Map(data.map(d => [d.date.split('T')[0], d.count]));
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  const dow = start.getDay();
  start.setDate(start.getDate() + (dow === 0 ? -6 : 1 - dow));
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
      <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
        <div />
        {DAY_LABELS.map(l => (
          <div key={l} className="text-[11px] font-semibold text-center tracking-wider" style={{ color: '#94A3B8' }}>{l}</div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {weeks.map((week, wi) => {
          const label = new Date(week[0].date + 'T12:00:00');
          return (
            <div key={wi} className="grid gap-1.5 items-center" style={{ gridTemplateColumns: '36px repeat(7, 1fr)' }}>
              <div className="text-right pr-1.5 whitespace-nowrap" style={{ fontSize: '11px', color: '#64748B' }}>
                {label.getDate()}/{label.getMonth() + 1}
              </div>
              {week.map(d => (
                <div key={d.date}
                  title={!d.isFuture ? `${d.count} actividad${d.count !== 1 ? 'es' : ''} — ${d.date}` : undefined}
                  style={{
                    height: '18px',
                    background: activityColor(d.count, d.isFuture),
                    border: d.isToday ? '2px solid rgba(192,132,252,0.8)' : '1px solid rgba(255,255,255,0.05)',
                    opacity: d.isFuture ? 0 : 1,
                    boxShadow: d.count >= 6 ? '0 0 6px rgba(255,107,0,0.4)' : 'none',
                  }}
                  className="rounded transition-all duration-200 hover:brightness-125 cursor-default"
                />
              ))}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] text-slate-400">Menos</span>
        {[0, 2, 4, 7].map((count, i) => (
          <div key={i} style={{ width: '13px', height: '13px', background: activityColor(count, false) }}
            className="rounded border border-white/[0.05]" />
        ))}
        <span className="text-[10px] text-slate-400">Más</span>
      </div>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon: Icon, color, label, value, delay }) {
  return (
    <motion.div variants={fadeUp} className="relative overflow-hidden group cursor-default"
      style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 16,
        boxShadow: '0 2px 16px rgba(0,0,0,0.25)' }}
      whileHover={{ y: -3, boxShadow: `0 8px 32px ${color}18, 0 0 0 1px ${color}22`, transition: { duration: 0.2 } }}>
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${color}07, transparent 60%)` }} />
      <div className="relative p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
          style={{ background: `${color}12`, border: `1.5px solid ${color}25`, boxShadow: `0 0 24px ${color}14` }}>
          <Icon size={22} style={{ color }} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-black text-white leading-none"><AnimatedCounter value={value} /></p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Project card ── */
function ProjectCard({ project, index, onClick }) {
  const grad = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const accent = ENGINE_ACCENT[project.engine] || grad.from;
  const engineName = project.engine ? project.engine.charAt(0).toUpperCase() + project.engine.slice(1) : 'Custom';

  return (
    <motion.button
      variants={cardVariant}
      onClick={onClick}
      className="text-left group relative overflow-hidden w-full"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
      whileHover={{
        y: -5,
        borderColor: `${accent}35`,
        boxShadow: `0 12px 40px ${accent}22, 0 0 0 1px ${accent}28, 0 2px 8px rgba(0,0,0,0.4)`,
        transition: { duration: 0.22 },
      }}
      layout>
      {/* Top color line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      {/* Hover glow overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${accent}06 0%, transparent 55%)` }} />

      <div className="relative z-10 p-6">
        {/* Card header */}
        <div className="flex items-start justify-between mb-5">
          {/* Engine icon */}
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300"
              style={{ background: `${accent}14`, border: `1.5px solid ${accent}30`, boxShadow: `0 0 28px ${accent}18` }}>
              <EngineImg engine={project.engine} size={22} />
            </div>
            {/* Engine name pill */}
            <span className="absolute -bottom-2.5 -right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full tracking-wide"
              style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}35` }}>
              {engineName}
            </span>
          </div>

          {/* Right badges */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
              style={project.is_public ? {
                background: 'rgba(30,144,255,0.10)', color: '#1E90FF', border: '1px solid rgba(30,144,255,0.22)',
              } : {
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
              {project.is_public ? <><Globe size={9} /> Público</> : <><Lock size={9} /> Privado</>}
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-white/[0.08] transition-all duration-300">
              <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
            </div>
          </div>
        </div>

        {/* Project name */}
        <h3 className="font-black text-white text-base mb-1.5 leading-tight group-hover:text-white transition-colors">
          {project.name}
        </h3>
        {project.description && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">{project.description}</p>
        )}
        {!project.description && <div className="mb-4" />}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock size={10} />
            {new Date(project.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
          </div>

          {project.members_preview && project.members_preview.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {project.members_preview.map((m, mi) => (
                  <div key={mi} title={m.name}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border-2"
                    style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`, borderColor: 'rgba(6,11,23,0.9)' }}>
                    {initial(m.name)}
                  </div>
                ))}
              </div>
              {project.member_count > 3 && (
                <span className="text-[10px] text-slate-400 font-semibold">+{project.member_count - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ── Enhanced Empty State ── */
function ProjectsEmptyState({ onNew }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden text-center py-16 md:py-20 px-8 rounded-3xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(255,107,0,0.07), transparent 60%)' }} />
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
      <div className="relative z-10">
        <motion.div
          animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(255,107,0,0.10)', border: '1.5px solid rgba(255,107,0,0.22)', boxShadow: '0 0 48px rgba(255,107,0,0.14)' }}>
          <Rocket size={34} style={{ color: '#FF6B00' }} />
        </motion.div>
        <h3 className="text-2xl font-black mb-3 tracking-tight">¡Comenzá a forjar tu primer juego!</h3>
        <p className="text-slate-300 text-sm max-w-xs mx-auto leading-relaxed mb-8">
          Creá tu primer proyecto y empezá a construir con tu crew. Es gratis y tarda menos de un minuto.
        </p>
        <motion.button onClick={onNew}
          className="btn-primary-pulse inline-flex items-center gap-2.5 text-sm font-bold"
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Plus size={17} /> Crear mi primer proyecto
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Main Component ── */
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [initData, setInitData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/projects'),
      api.get('/dashboard/summary'),
    ])
    .then(([projRes, sumRes]) => {
      setProjects(projRes.data.projects);
      setSummary(sumRes.data);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleModalSubmit = useCallback(({ name, description, engine, isPublic }) => {
    setShowNew(false);
    const apiPromise = api.post('/projects', { name, description, engine, is_public: isPublic });
    setInitData({ engine, name, apiPromise });
  }, []);

  const handleInitComplete = useCallback((project) => {
    setProjects((p) => [project, ...p]);
    setInitData(null);
    navigate(`/project/${project.id}`);
  }, [navigate]);

  const handleInitError = useCallback(() => {
    setInitData(null);
    setShowNew(true);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="relative">
      {/* Ambient top glow */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,0,0.05) 0%, transparent 55%)' }} />

      <motion.div className="max-w-6xl mx-auto relative z-10" variants={stagger} initial="hidden" animate="show">

        {/* ── Header ── */}
        <motion.div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-5 pt-2" variants={fadeUp}>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em] mb-2">{greeting} 👋</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-1.5">
              Bienvenido,{' '}
              <span style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {user?.name}
              </span>{' '}👾
            </h1>
            <p className="text-slate-400 text-sm">Aquí está el resumen de tu trabajo</p>
          </div>
          <motion.button
            onClick={() => setShowNew(true)}
            className="btn-primary-pulse flex items-center gap-2.5 self-start md:self-auto text-sm font-bold"
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Plus size={17} /> Nuevo proyecto
          </motion.button>
        </motion.div>

        {/* ── Stats ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : summary && (
          <>
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" variants={stagger}>
              <StatCard icon={Gamepad2}    color="#FF6B00" label="Proyectos"      value={summary.totals.total_projects} />
              <StatCard icon={CheckCircle2} color="#22d3ee" label="Tareas Asignadas" value={summary.totals.total_tasks} />
              <StatCard icon={FileUp}       color="#34d399" label="Assets Subidos"  value={summary.totals.total_assets} />
            </motion.div>

            {/* ── Activity + Tasks row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
              {/* Activity heatmap */}
              <motion.div className="lg:col-span-2 relative overflow-hidden rounded-2xl" variants={fadeUp}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,107,0,0.3), transparent)' }} />
                <div className="p-6">
                  <div className="flex items-center gap-2.5 mb-6">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.22)' }}>
                      <Activity size={14} style={{ color: '#FF6B00' }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Mapa de Actividad</h2>
                      <p className="text-[11px] text-slate-400">Último mes</p>
                    </div>
                  </div>
                  <GithubActivityGrid data={summary.activityGrid} />
                </div>
              </motion.div>

              {/* Pending tasks */}
              <motion.div className="relative overflow-hidden rounded-2xl flex flex-col" variants={fadeUp}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)' }} />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.22)' }}>
                      <CheckCircle2 size={14} style={{ color: '#22d3ee' }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Tareas Pendientes</h2>
                      <p className="text-[11px] text-slate-400">{summary.recentTasks.length} asignadas</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                    {summary.recentTasks.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle2 size={28} className="mx-auto mb-3 opacity-20" style={{ color: '#22d3ee' }} />
                        <p className="text-sm text-slate-400">No tienes tareas pendientes</p>
                      </div>
                    ) : (
                      summary.recentTasks.map(t => (
                        <button key={t.id}
                          onClick={() => navigate(`/project/${t.project_id}/kanban`)}
                          className="w-full text-left p-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 group/task"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.18)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                          <p className="text-sm font-semibold text-white line-clamp-1 mb-0.5">{t.title}</p>
                          <p className="text-[11px] text-slate-400">{t.project_name}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}

        {/* ── Projects section ── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Tus Proyectos</h2>
              {!loading && projects.length > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">{projects.length} proyecto{projects.length !== 1 ? 's' : ''} activo{projects.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            {!loading && projects.length > 0 && (
              <button onClick={() => setShowNew(true)}
                className="text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'rgba(255,107,0,0.08)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.20)' }}>
                <Plus size={13} /> Nuevo
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : projects.length === 0 ? (
            <ProjectsEmptyState onNew={() => setShowNew(true)} />
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              variants={stagger} initial="hidden" animate="show">
              <AnimatePresence>
                {projects.map((p, i) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    index={i}
                    onClick={() => navigate(`/project/${p.id}`)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>

      </motion.div>

      {/* Modals */}
      <CreateProjectModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onSubmit={handleModalSubmit}
        existingNames={projects.map((p) => p.name)}
      />
      <AnimatePresence>
        {initData && (
          <ProjectInitScreen
            key="project-init"
            engine={initData.engine}
            projectName={initData.name}
            apiPromise={initData.apiPromise}
            onComplete={handleInitComplete}
            onError={handleInitError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
