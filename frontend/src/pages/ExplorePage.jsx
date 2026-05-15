import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Compass, Users, Calendar, X, UserPlus, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { EngineImg } from '../components/common/EngineIcons';

const ENGINE_META = {
  unity:  { color: '#4CAF50', label: 'Unity' },
  unreal: { color: '#2196F3', label: 'Unreal' },
  godot:  { color: '#5C6BC0', label: 'Godot' },
  roblox: { color: '#F59E0B', label: 'Roblox' },
  custom: { color: '#7C3AED', label: 'Custom' },
};

const FILTER_ENGINES = ['all', 'unity', 'unreal', 'godot', 'roblox', 'custom'];

const stagger      = { show: { transition: { staggerChildren: 0.05 } } };
const cardVariant  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function ExplorePage() {
  const { user }      = useAuth();
  const { addToast }  = useToast();
  const navigate      = useNavigate();

  const [projects, setProjects]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [search, setSearch]                   = useState('');
  const [engineFilter, setEngineFilter]       = useState('all');
  const [userProjectIds, setUserProjectIds]   = useState(new Set());
  const [pendingProjectIds, setPendingProjectIds] = useState(new Set());

  // Modal de login (para usuarios no autenticados)
  const [loginModal, setLoginModal]           = useState(null); // { project }
  // Modal de solicitud de unión
  const [requestModal, setRequestModal]       = useState(null); // { project }
  const [requestMessage, setRequestMessage]   = useState('');
  const [submitting, setSubmitting]           = useState(false);

  // Proyectos del usuario (para verificar membresía)
  useEffect(() => {
    if (!user) return;
    api.get('/projects')
      .then(res => setUserProjectIds(new Set(res.data.projects.map(p => p.id))))
      .catch(() => {});
  }, [user]);

  // Solicitudes pendientes del usuario
  useEffect(() => {
    if (!user) return;
    api.get('/join-requests')
      .then(res => setPendingProjectIds(new Set(res.data.projectIds)))
      .catch(() => {});
  }, [user]);

  // Buscar proyectos públicos con debounce
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)                              params.name   = search;
      if (engineFilter && engineFilter !== 'all') params.engine = engineFilter;
      const { data } = await api.get('/projects/explore', { params });
      setProjects(data.projects);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [search, engineFilter]);

  useEffect(() => {
    const t = setTimeout(fetchProjects, 300);
    return () => clearTimeout(t);
  }, [fetchProjects]);

  const openRequestModal = (project) => {
    if (!user) return setLoginModal({ project });
    setRequestModal({ project });
    setRequestMessage('');
  };

  const handleSubmitRequest = async () => {
    if (!requestModal || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/projects/${requestModal.project.id}/join-requests`, {
        message: requestMessage.trim() || undefined,
      });
      setPendingProjectIds(prev => new Set([...prev, requestModal.project.id]));
      addToast({ message: 'Solicitud enviada correctamente', type: 'success' });
      setRequestModal(null);
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al enviar la solicitud.';
      addToast({ message: msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const hasFilters = search || engineFilter !== 'all';

  return (
    <div className="max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Compass size={26} className="text-emerald-400" />
          <h1 className="text-3xl font-bold text-white">Explorar proyectos</h1>
        </div>
        <p className="text-surface-400 text-sm ml-10">
          Descubrí proyectos indie de la comunidad
        </p>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="input-field pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTER_ENGINES.map(e => {
            const meta   = ENGINE_META[e];
            const active = engineFilter === e;
            const accent = e === 'all' ? '#10b981' : meta?.color;
            return (
              <button
                key={e}
                onClick={() => setEngineFilter(e)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: active ? `${accent}18` : 'rgba(255,255,255,0.04)',
                  color:      active ? accent : '#6b7280',
                  border:     `1px solid ${active ? `${accent}40` : 'rgba(255,255,255,0.08)'}`,
                  boxShadow:  active ? `0 0 10px ${accent}20` : 'none',
                }}
              >
                {e === 'all' ? 'Todos' : meta?.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-white/10" />
                <div className="w-14 h-5 rounded-full bg-white/10" />
              </div>
              <div className="h-4 bg-white/10 rounded mb-2 w-3/4" />
              <div className="h-3 bg-white/10 rounded mb-1" />
              <div className="h-3 bg-white/10 rounded w-2/3 mb-6" />
              <div className="h-8 bg-white/10 rounded-xl" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Compass size={48} className="mx-auto mb-4 text-surface-600" />
          <p className="text-white font-semibold mb-2">
            {hasFilters
              ? 'No se encontraron proyectos con esos filtros'
              : 'Aún no hay proyectos públicos — ¡sé el primero en compartir el tuyo!'
            }
          </p>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setEngineFilter('all'); }}
              className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={stagger} initial="hidden" animate="show"
        >
          {projects.map(project => {
            const eng      = ENGINE_META[project.engine] || ENGINE_META.custom;
            const isMember = userProjectIds.has(project.id);
            const isPending = pendingProjectIds.has(project.id);

            return (
              <motion.div
                key={project.id}
                variants={cardVariant}
                className="glass rounded-2xl p-6 flex flex-col group transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                whileHover={{
                  y: -3,
                  borderColor: `${eng.color}30`,
                  boxShadow: `0 16px 48px ${eng.color}15`,
                }}
              >
                {/* Header card */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: `${eng.color}18`, border: `1px solid ${eng.color}25` }}
                  >
                    <EngineImg engine={project.engine} size={20} />
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${eng.color}15`, color: eng.color, border: `1px solid ${eng.color}30` }}
                  >
                    {eng.label}
                  </span>
                </div>

                {/* Nombre y descripción */}
                <h3 className="font-semibold text-white text-base mb-1 line-clamp-1">{project.name}</h3>
                <p className="text-xs text-surface-400 line-clamp-2 leading-relaxed mb-auto min-h-[2.5rem]">
                  {project.description || 'Sin descripción'}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 text-[11px] text-surface-500 mt-4 mb-2">
                  <span className="flex items-center gap-1">
                    <Users size={11} />
                    {project.member_count} miembro{project.member_count !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(project.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <p className="text-[11px] text-surface-500 mb-4">
                  por <span className="text-surface-300 font-medium">{project.owner_name}</span>
                </p>

                {/* Botón según estado */}
                {isMember ? (
                  <button
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: `${eng.color}20`,
                      color: eng.color,
                      border: `1px solid ${eng.color}40`,
                    }}
                  >
                    Abrir proyecto →
                  </button>
                ) : isPending ? (
                  <div
                    className="w-full py-2 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-1.5"
                    style={{
                      background: 'rgba(245,158,11,0.08)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245,158,11,0.20)',
                    }}
                  >
                    <Clock size={13} /> Solicitud pendiente
                  </div>
                ) : (
                  <button
                    onClick={() => openRequestModal(project)}
                    className="w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: 'rgba(16,185,129,0.08)',
                      color: '#34d399',
                      border: '1px solid rgba(16,185,129,0.20)',
                    }}
                  >
                    <UserPlus size={14} /> Solicitar unirse
                  </button>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Modal login */}
      <AnimatePresence>
        {loginModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setLoginModal(null)}
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl p-7"
              style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.10)' }}
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 320 } }}
              exit={{ scale: 0.92, y: 20, transition: { duration: 0.15 } }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}
              >
                <Compass size={22} className="text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-white text-center mb-1">{loginModal.project.name}</h3>
              <p className="text-sm text-surface-400 text-center mb-5">
                Iniciá sesión para solicitar unirte a proyectos de la comunidad.
              </p>
              <div className="flex gap-3">
                <Link
                  to="/login"
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-center transition-all"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  Iniciar sesión
                </Link>
                <button onClick={() => setLoginModal(null)} className="btn-secondary flex-1">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal solicitud de unión */}
      <AnimatePresence>
        {requestModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => !submitting && setRequestModal(null)}
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl p-7"
              style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.10)' }}
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 320 } }}
              exit={{ scale: 0.92, y: 20, transition: { duration: 0.15 } }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}
              >
                <UserPlus size={22} className="text-emerald-400" />
              </div>

              <h3 className="text-base font-semibold text-white text-center mb-1">
                {requestModal.project.name}
              </h3>
              <p className="text-xs text-surface-400 text-center mb-5">
                Tu solicitud será enviada al owner para su aprobación.
              </p>

              <textarea
                value={requestMessage}
                onChange={e => setRequestMessage(e.target.value)}
                placeholder="Mensaje para el owner (opcional)"
                rows={3}
                maxLength={300}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-surface-500 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/40 mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={handleSubmitRequest}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  <UserPlus size={14} />
                  {submitting ? 'Enviando…' : 'Enviar solicitud'}
                </button>
                <button
                  onClick={() => setRequestModal(null)}
                  disabled={submitting}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
