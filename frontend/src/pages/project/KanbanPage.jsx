import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../../components/layout/ProjectLayout';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { SkeletonCard, EmptyState } from '../../components/common/Skeleton';
import {
  Plus, GripVertical, Pencil, Trash2, Clock, CheckCircle2, Loader2,
  Users, AlertTriangle, AlertCircle, ArrowDownCircle, Calendar, Layers, ChevronDown, X,
  Gamepad2, Bug, Palette, Music, Map, Rocket, Megaphone,
  Clapperboard, Package, Code, Settings,
  GitBranch, Zap, Mountain, Sparkles,
  Plug, DollarSign, Radio, LayoutGrid,
} from 'lucide-react';
import UserAvatar from '../../components/common/UserAvatar';

const COLUMNS = [
  {
    status: 'pending', label: 'Por Hacer', icon: Clock,
    accent: '#fbbf24', accentLight: '#fbbf2415', accentBorder: '#fbbf2430',
    headerBg: 'linear-gradient(135deg, #fbbf2410, #f59e0b08)',
    cardBorder: '#fbbf2420', badge: 'badge-amber',
  },
  {
    status: 'in_progress', label: 'En Progreso', icon: Loader2,
    accent: '#22d3ee', accentLight: '#22d3ee15', accentBorder: '#22d3ee30',
    headerBg: 'linear-gradient(135deg, #22d3ee10, #06b6d408)',
    cardBorder: '#22d3ee20', badge: 'badge-cyan',
  },
  {
    status: 'done', label: 'Completado', icon: CheckCircle2,
    accent: '#34d399', accentLight: '#34d39915', accentBorder: '#34d39930',
    headerBg: 'linear-gradient(135deg, #34d39910, #10b98108)',
    cardBorder: '#34d39920', badge: 'badge-green',
  },
];

const PRIORITIES = {
  high:   { label: 'Alta',  color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20',    icon: AlertCircle    },
  medium: { label: 'Media', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', icon: AlertTriangle  },
  low:    { label: 'Baja',  color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: ArrowDownCircle },
};

const ENGINE_ACCENT = {
  unity: '#4CAF50', unreal: '#2196F3', godot: '#5C6BC0', roblox: '#F59E0B', custom: '#FF6B00',
};
const ENGINE_LABEL = {
  unity: 'Unity', unreal: 'Unreal', godot: 'Godot', roblox: 'Roblox', custom: 'Motor',
};

const BOARD_ICON_MAP = {
  // "Todos" virtual entry
  'Todos':                  LayoutGrid,
  // Base boards
  'Tareas de Gameplay':     Gamepad2,
  'Seguimiento de Bugs':    Bug,
  'Pipeline de Arte':       Palette,
  'Audio':                  Music,
  'Diseño de Niveles':      Map,
  'Build y Release':        Rocket,
  'Marketing':              Megaphone,
  // Unity
  'Escenas':                Clapperboard,
  'Prefabs':                Package,
  'Scripts':                Code,
  'Builds':                 Settings,
  // Unreal
  'Sistemas Blueprint':     GitBranch,
  'Sistemas C++':           Zap,
  'Niveles':                Mountain,
  'Shaders/Materiales':     Sparkles,
  // Godot (Escenas/Scripts already mapped above)
  'Shaders':                Sparkles,
  'Plugins':                Plug,
  // Roblox
  'Scripts de Gameplay':    Code,
  'Construcción de Mapas':  Map,
  'Monetización':           DollarSign,
  'Live Ops':               Radio,
};

function BoardIcon({ name, active, accent, size = 16 }) {
  const Icon = BOARD_ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={size} style={{ color: active ? accent : '#9ca3af' }} />;
}

// ── Board sidebar item
function BoardItem({ label, icon, count, active, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 text-left"
      style={{
        background: active ? `${accent}15` : 'transparent',
        color: active ? 'white' : '#94a3b8',
        borderLeft: `2px solid ${active ? accent : 'transparent'}`,
      }}
    >
      <span className="shrink-0 flex items-center justify-center w-4 h-4">
        <BoardIcon name={label} active={active} accent={accent} />
      </span>
      <span className="flex-1 truncate">{label}</span>
      {count > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
          style={{
            background: active ? `${accent}25` : 'rgba(255,255,255,0.06)',
            color: active ? accent : '#64748b',
          }}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function KanbanPage() {
  const { projectId, members, role, project } = useProject();
  const { addToast } = useToast();
  const isViewer = role === 'viewer';

  const [tasks, setTasks]               = useState([]);
  const [boards, setBoards]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(null);
  const [editTask, setEditTask]         = useState(null);
  const [dragOverCol, setDragOverCol]   = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedBoard, setSelectedBoard]   = useState(null);
  const [kanbanError, setKanbanError]   = useState('');
  const [shakingTask, setShakingTask]   = useState(null);
  const [isMobile, setIsMobile]         = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false);
  const [activeColIdx, setActiveColIdx] = useState(0);
  const dragItem   = useRef(null);
  const columnsRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleColumnsScroll = useCallback(() => {
    if (!columnsRef.current) return;
    const el = columnsRef.current;
    const colWidth = el.scrollWidth / COLUMNS.length;
    const idx = Math.min(Math.round(el.scrollLeft / colWidth), COLUMNS.length - 1);
    setActiveColIdx(idx);
  }, []);

  const accent      = ENGINE_ACCENT[project?.engine] || '#FF6B00';
  const engineLabel = ENGINE_LABEL[project?.engine]  || 'Motor';
  const baseBoards   = boards.filter(b => !b.engine_specific);
  const engineBoards = boards.filter(b => b.engine_specific);

  const boardTaskCount = (boardId) => tasks.filter(t => t.board_id === boardId).length;

  const loadData = async () => {
    try {
      const [tasksRes, boardsRes] = await Promise.all([
        api.get(`/tasks?project_id=${projectId}`),
        api.get(`/projects/${projectId}/boards`),
      ]);
      setTasks(tasksRes.data.tasks);
      setBoards(boardsRes.data.boards);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const socket = getSocket();
    if (socket) {
      socket.on('task_created', (d) => setTasks((p) => [d.task, ...p]));
      socket.on('task_updated', (d) => setTasks((p) => p.map((t) => t.id === d.task.id ? d.task : t)));
      socket.on('task_deleted', (d) => setTasks((p) => p.filter((t) => t.id !== d.taskId)));
      socket.on('task_moved',   (d) => setTasks((p) => p.map((t) => t.id === d.taskId ? { ...t, status: d.status } : t)));
      return () => {
        socket.off('task_created');
        socket.off('task_updated');
        socket.off('task_deleted');
        socket.off('task_moved');
      };
    }
  }, [projectId]);

  const showError = (msg) => {
    setKanbanError(msg);
    addToast({ message: msg, type: 'error' });
    setTimeout(() => setKanbanError(''), 4000);
  };

  const createTask = async ({ title, description, status, priority, due_date, assignee_ids, board_id }) => {
    try {
      const { data } = await api.post('/tasks', { project_id: projectId, title, description, status, priority, due_date, assignee_ids, board_id });
      setTasks((p) => [data.task, ...p]);
      setShowCreate(null);
      getSocket()?.emit('task_created', { projectId, task: data.task });
    } catch (e) { showError(e.response?.data?.error || 'Error al crear la tarea.'); }
  };

  const updateTask = async (id, updates) => {
    try {
      const { data } = await api.put(`/tasks/${id}`, updates);
      setTasks((p) => p.map((t) => t.id === id ? data.task : t));
      setEditTask(null);
      getSocket()?.emit('task_updated', { projectId, task: data.task });
    } catch (e) { showError(e.response?.data?.error || 'Error al actualizar la tarea.'); }
  };

  const deleteTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((p) => p.filter((t) => t.id !== id));
      getSocket()?.emit('task_deleted', { projectId, taskId: id });
    } catch (e) { showError(e.response?.data?.error || 'Error al eliminar la tarea.'); }
  };

  const moveTask = async (taskId, newStatus) => {
    if (newStatus === 'done') {
      const task = tasks.find(t => t.id === taskId);
      if (!task?.assignees?.length) {
        showError('Asigná al menos un miembro antes de completar la tarea.');
        setShakingTask(taskId);
        setTimeout(() => setShakingTask(null), 600);
        return;
      }
    }
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks((p) => p.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
      getSocket()?.emit('task_moved', { projectId, taskId, status: newStatus });
    } catch (e) {
      showError(e.response?.data?.error || 'Error al mover la tarea.');
    }
  };

  const handleDragStart  = (e, taskId) => { dragItem.current = taskId; e.dataTransfer.effectAllowed = 'move'; e.target.style.opacity = '0.4'; };
  const handleDragEnd    = (e) => { e.target.style.opacity = '1'; dragItem.current = null; setDragOverCol(null); };
  const handleDragOver   = (e, status) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(status); };
  const handleDragLeave  = () => setDragOverCol(null);
  const handleDrop       = (e, status) => { e.preventDefault(); setDragOverCol(null); if (dragItem.current) moveTask(dragItem.current, status); };

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {COLUMNS.map((c) => (
        <div key={c.status} className="space-y-3">
          <div className="skeleton h-10 w-full rounded-xl" />
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ))}
    </div>
  );

  const filteredTasks = tasks.filter(t => {
    const boardOk    = !selectedBoard || t.board_id === selectedBoard;
    const priorityOk = priorityFilter === 'all' || t.priority === priorityFilter;
    return boardOk && priorityOk;
  });

  const selectedBoardData = selectedBoard ? boards.find(b => b.id === selectedBoard) : null;
  const selectedBoardName = selectedBoardData?.name || null;

  return (
    <div className="flex gap-3 items-start">

      {/* ── Board sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:block w-48 shrink-0 sticky top-0 rounded-2xl py-3 px-1"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest px-2 pb-2">
          Tableros
        </p>

        <BoardItem
          label="Todos"
          icon="🗂️"
          count={tasks.length}
          active={!selectedBoard}
          onClick={() => setSelectedBoard(null)}
          accent={accent}
        />

        {baseBoards.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest px-2 pt-3 pb-1">
              Base
            </p>
            {baseBoards.map(b => (
              <BoardItem
                key={b.id}
                label={b.name}
                icon={b.icon}
                count={boardTaskCount(b.id)}
                active={selectedBoard === b.id}
                onClick={() => setSelectedBoard(b.id)}
                accent={accent}
              />
            ))}
          </>
        )}

        {engineBoards.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-2 pt-3 pb-1">
              <div className="flex-1 h-px" style={{ background: `${accent}30` }} />
              <p className="text-[10px] font-semibold uppercase tracking-widest shrink-0" style={{ color: accent }}>
                {engineLabel}
              </p>
              <div className="flex-1 h-px" style={{ background: `${accent}30` }} />
            </div>
            {engineBoards.map(b => (
              <BoardItem
                key={b.id}
                label={b.name}
                icon={b.icon}
                count={boardTaskCount(b.id)}
                active={selectedBoard === b.id}
                onClick={() => setSelectedBoard(b.id)}
                accent={accent}
              />
            ))}
          </>
        )}
      </aside>

      {/* ── Main kanban area ───────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Mobile board selector — custom dropdown */}
        {boards.length > 0 && (
          <div className="md:hidden relative z-20">
            <button
              onClick={() => setBoardDropdownOpen(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: `${accent}12`,
                border: `1px solid ${accent}30`,
                color: 'white',
                minHeight: '44px',
              }}
            >
              <span className="flex items-center gap-2">
                <span className="flex items-center justify-center w-4 h-4">
                  <BoardIcon name={selectedBoardData?.name || 'Todos'} active={true} accent={accent} />
                </span>
                <span className="truncate">
                  {selectedBoardData ? selectedBoardData.name : `Todos los tableros (${tasks.length})`}
                </span>
              </span>
              <motion.span animate={{ rotate: boardDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} style={{ color: accent }} />
              </motion.span>
            </button>

            <AnimatePresence>
              {boardDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-1.5 left-0 right-0 rounded-2xl overflow-hidden shadow-2xl"
                  style={{ background: 'rgba(8,8,18,0.97)', border: `1px solid ${accent}25`, backdropFilter: 'blur(20px)' }}
                >
                  <button
                    onClick={() => { setSelectedBoard(null); setBoardDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors"
                    style={{
                      background: !selectedBoard ? `${accent}12` : 'transparent',
                      color: !selectedBoard ? 'white' : '#94a3b8',
                    }}
                  >
                    <span className="flex items-center justify-center w-4 h-4">
                      <BoardIcon name="Todos" active={!selectedBoard} accent={accent} />
                    </span>
                    <span className="flex-1 text-left">Todos los tableros</span>
                    <span className="text-[10px]" style={{ color: accent }}>{tasks.length}</span>
                  </button>

                  {baseBoards.length > 0 && (
                    <div className="px-4 py-1.5">
                      <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-widest">Base</p>
                    </div>
                  )}
                  {baseBoards.map(b => (
                    <button key={b.id}
                      onClick={() => { setSelectedBoard(b.id); setBoardDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors"
                      style={{
                        background: selectedBoard === b.id ? `${accent}12` : 'transparent',
                        color: selectedBoard === b.id ? 'white' : '#94a3b8',
                      }}
                    >
                      <span className="flex items-center justify-center w-4 h-4">
                        <BoardIcon name={b.name} active={selectedBoard === b.id} accent={accent} />
                      </span>
                      <span className="flex-1 text-left truncate">{b.name}</span>
                      <span className="text-[10px] text-surface-500">{boardTaskCount(b.id)}</span>
                    </button>
                  ))}

                  {engineBoards.length > 0 && (
                    <>
                      <div className="flex items-center gap-1.5 px-4 py-1.5">
                        <div className="flex-1 h-px" style={{ background: `${accent}30` }} />
                        <p className="text-[10px] font-semibold uppercase tracking-widest shrink-0" style={{ color: accent }}>{engineLabel}</p>
                        <div className="flex-1 h-px" style={{ background: `${accent}30` }} />
                      </div>
                      {engineBoards.map(b => (
                        <button key={b.id}
                          onClick={() => { setSelectedBoard(b.id); setBoardDropdownOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors"
                          style={{
                            background: selectedBoard === b.id ? `${accent}12` : 'transparent',
                            color: selectedBoard === b.id ? 'white' : '#94a3b8',
                          }}
                        >
                          <span>{b.icon}</span>
                          <span className="flex-1 text-left truncate">{b.name}</span>
                          <span className="text-[10px] text-surface-500">{boardTaskCount(b.id)}</span>
                        </button>
                      ))}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {kanbanError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl flex items-center justify-between">
            <span>{kanbanError}</span>
            <button onClick={() => setKanbanError('')} className="ml-3 text-red-400 hover:text-red-300 text-lg leading-none">✕</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              Kanban
              {selectedBoardName && (
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-full"
                  style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
                  {selectedBoardName}
                </span>
              )}
            </h1>
            <span className="text-xs text-surface-400">{filteredTasks.length} tareas mostradas</span>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1 bg-surface-900 border border-white/5 rounded-xl p-1">
            {[
              { key: 'all',    label: 'Todas', active: 'bg-white/10 text-white',          hover: 'hover:text-white hover:bg-white/5'         },
              { key: 'high',   label: 'Alta',  active: 'bg-red-400/20 text-red-400',       hover: 'hover:text-red-400 hover:bg-white/5'        },
              { key: 'medium', label: 'Media', active: 'bg-yellow-400/20 text-yellow-400', hover: 'hover:text-yellow-400 hover:bg-white/5'     },
              { key: 'low',    label: 'Baja',  active: 'bg-blue-500/20 text-blue-500',     hover: 'hover:text-blue-500 hover:bg-white/5'       },
            ].map(f => (
              <button key={f.key}
                onClick={() => setPriorityFilter(f.key)}
                className={`px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                  priorityFilter === f.key ? f.active : `text-surface-400 ${f.hover}`
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Kanban columns */}
        <div
          ref={columnsRef}
          onScroll={handleColumnsScroll}
          className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none gap-5 items-start dot-grid rounded-2xl p-4 -mx-4 pb-6 md:pb-4"
          style={{ minHeight: '500px' }}
        >
          {COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.status);
            const isOver = dragOverCol === col.status;
            return (
              <div key={col.status}
                className="shrink-0 w-[85vw] md:w-auto snap-start rounded-2xl transition-all duration-200"
                style={{
                  background: isOver ? `${col.accent}0c` : 'transparent',
                  boxShadow: isOver
                    ? `inset 0 0 0 2px ${col.accentBorder}, 0 0 24px ${col.accent}10`
                    : 'inset 0 0 0 2px transparent',
                }}
                onDragOver={isViewer || isMobile ? undefined : (e) => handleDragOver(e, col.status)}
                onDragLeave={isViewer || isMobile ? undefined : handleDragLeave}
                onDrop={isViewer || isMobile ? undefined : (e) => handleDrop(e, col.status)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-3"
                  style={{ background: col.headerBg, border: `1px solid ${col.accentBorder}` }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: col.accentLight }}>
                      <col.icon size={14} style={{ color: col.accent }} />
                    </div>
                    <span className="text-sm font-semibold">{col.label}</span>
                    <span className={`badge ${col.badge}`}>{columnTasks.length}</span>
                  </div>
                  {!isViewer && (
                    <motion.button
                      onClick={() => setShowCreate(col.status)}
                      className="w-11 h-11 md:w-7 md:h-7 rounded-lg flex items-center justify-center transition-all duration-200"
                      style={{ background: col.accentLight }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}>
                      <Plus size={16} style={{ color: col.accent }} />
                    </motion.button>
                  )}
                </div>

                {/* Cards */}
                <div className="space-y-2.5 px-1 pb-2 min-h-[200px]">
                  {columnTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <col.icon size={22} style={{ color: `${col.accent}50` }} className="mb-2" />
                      <p className="text-xs text-surface-500 max-w-[150px] leading-relaxed">
                        {selectedBoard
                          ? 'Sin tareas en este tablero — creá una nueva'
                          : 'Sin tareas aquí'}
                      </p>
                    </div>
                  )}
                  <AnimatePresence>
                    {columnTasks.map((task) => {
                      const priorityData = PRIORITIES[task.priority || 'medium'];
                      const PriorityIcon = priorityData.icon;
                      const taskBoard = task.board_id ? boards.find(b => b.id === task.board_id) : null;

                      let dueColor = '', dueLabel = '';
                      if (task.due_date && task.status !== 'done') {
                        const diffDays = Math.ceil((new Date(task.due_date) - new Date()) / 86400000);
                        if (diffDays < 0)       { dueColor = 'text-red-400 border-red-400/30 bg-red-400/10';       dueLabel = 'Vencida'; }
                        else if (diffDays <= 3) { dueColor = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'; dueLabel = `En ${diffDays} día${diffDays !== 1 ? 's' : ''}`; }
                        else                    { dueColor = 'text-blue-500 border-blue-500/30 bg-blue-500/10';    dueLabel = `En ${diffDays} días`; }
                      }

                      const maxAvatars = isMobile ? 2 : 4;

                      return (
                        <motion.div
                          key={task.id}
                          className={`kanban-card group relative ${isMobile && !isViewer ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                          style={{ borderLeft: `3px solid ${col.accent}60` }}
                          draggable={!isViewer && !isMobile}
                          onClick={isMobile && !isViewer ? () => setEditTask(task) : undefined}
                          onDragStart={!isViewer && !isMobile ? (e) => handleDragStart(e, task.id) : undefined}
                          onDragEnd={!isViewer && !isMobile ? handleDragEnd : undefined}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={shakingTask === task.id
                            ? { x: [0, -7, 7, -5, 5, 0], opacity: 1, y: 0, transition: { duration: 0.45 } }
                            : { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 22 } }}
                          exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
                          whileHover={{ y: -2, boxShadow: `0 8px 30px ${col.accent}18, 0 0 0 1px ${col.accent}20` }}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical size={14} className="hidden md:block text-surface-400 mt-0.5 cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${priorityData.bg} ${priorityData.border} ${priorityData.color}`}>
                                  <PriorityIcon size={10} />
                                  {priorityData.label}
                                </div>
                                {task.due_date && task.status !== 'done' && (
                                  <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${dueColor}`}>
                                    <Calendar size={10} />
                                    {dueLabel}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm font-medium leading-tight">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-surface-400 mt-1.5 line-clamp-2 leading-relaxed">{task.description}</p>
                              )}
                              {!selectedBoard && taskBoard && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-surface-500 mt-1.5">
                                  <span>{taskBoard.icon}</span>
                                  <span className="truncate max-w-[90px]">{taskBoard.name}</span>
                                </span>
                              )}
                            </div>
                            {!isViewer && (
                              <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setEditTask(task); }} className="p-1.5 rounded-lg text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-all"><Pencil size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={12} /></button>
                              </div>
                            )}
                          </div>
                          {task.assignees && task.assignees.length > 0 && (
                            <div className="flex items-center gap-0.5 mt-3 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              {task.assignees.slice(0, maxAvatars).map((a) => (
                                <UserAvatar key={a.id} name={a.name} avatarUrl={a.avatar_url} size={24} className="ring-1 ring-surface-800" title={a.name} />
                              ))}
                              {task.assignees.length > maxAvatars && (
                                <span className="text-[10px] text-surface-400 ml-1">+{task.assignees.length - maxAvatars}</span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dot indicators — mobile only */}
        <div className="flex md:hidden justify-center gap-2 -mt-2">
          {COLUMNS.map((col, i) => (
            <button
              key={col.status}
              onClick={() => {
                if (!columnsRef.current) return;
                const el = columnsRef.current;
                el.scrollTo({ left: (el.scrollWidth / COLUMNS.length) * i, behavior: 'smooth' });
              }}
              className="rounded-full transition-all duration-300"
              style={{
                width: activeColIdx === i ? '20px' : '6px',
                height: '6px',
                background: activeColIdx === i ? col.accent : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>
      </div>

      <TaskFormModal
        open={!!showCreate}
        onClose={() => setShowCreate(null)}
        onSubmit={(d) => createTask({ ...d, status: d.status ?? showCreate })}
        members={members}
        boards={boards}
        defaultBoardId={selectedBoard}
        defaultStatus={showCreate || 'pending'}
        title="Nueva tarea"
        isMobile={isMobile}
      />
      <TaskFormModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        onSubmit={(d) => updateTask(editTask.id, d)}
        members={members}
        boards={boards}
        defaultBoardId={null}
        defaultStatus={editTask?.status || 'pending'}
        task={editTask}
        title="Editar tarea"
        isMobile={isMobile}
      />
    </div>
  );
}

// ── Task form modal ────────────────────────────────────────────────
function TaskFormModal({ open, onClose, onSubmit, members, task, title: modalTitle, boards = [], defaultBoardId, isMobile, defaultStatus }) {
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority]     = useState('medium');
  const [dueDate, setDueDate]       = useState('');
  const [assignees, setAssignees]   = useState([]);
  const [boardId, setBoardId]       = useState(null);
  const [taskStatus, setTaskStatus] = useState('pending');
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'medium');
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
      setAssignees(task.assignees?.map((a) => a.id) || []);
      setBoardId(task.board_id || null);
      setTaskStatus(task.status || defaultStatus || 'pending');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setAssignees([]);
      setBoardId(defaultBoardId || null);
      setTaskStatus(defaultStatus || 'pending');
    }
    setTitleError('');
  }, [task, open, defaultBoardId, defaultStatus]);

  const isCompleted = task?.status === 'done';
  const toggleAssignee = (id) => { if (!isCompleted) setAssignees((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]); };
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const submitData = { title, description, priority, due_date: dueDate || null, assignee_ids: assignees, board_id: boardId };
      if (isMobile) submitData.status = taskStatus;
      await onSubmit(submitData);
    } finally { setSubmitting(false); }
  };

  // ── Shared form fields ─────────────────────────────────────────
  const formFields = (
    <>
      {/* Mobile column selector */}
      {isMobile && (
        <div>
          <label className="text-xs font-medium text-surface-300 mb-2 block">Columna</label>
          <div className="grid grid-cols-3 gap-2">
            {COLUMNS.map(col => (
              <button key={col.status} type="button"
                onClick={() => setTaskStatus(col.status)}
                className="py-2.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: taskStatus === col.status ? col.accentLight : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${taskStatus === col.status ? col.accentBorder : 'rgba(255,255,255,0.06)'}`,
                  color: taskStatus === col.status ? col.accent : '#94a3b8',
                }}>
                {col.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
          onBlur={() => { if (title.trim() && title.trim().length < 3) setTitleError('El título debe tener al menos 3 caracteres.'); }}
          placeholder="Título de la tarea"
          className="input-field w-full"
          style={{
            ...(titleError ? { borderColor: '#f87171' } : {}),
            fontSize: isMobile ? '16px' : undefined,
          }}
          autoFocus={!isMobile}
          required
        />
        {titleError && <p className="text-xs text-red-400 mt-1">{titleError}</p>}
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        rows={3}
        className="input-field resize-none w-full"
        style={{ fontSize: isMobile ? '16px' : undefined }}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-surface-300 mb-2 block">Prioridad</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
            style={{ fontSize: isMobile ? '16px' : undefined }}>
            <option value="high"   className="bg-gray-900">Alta</option>
            <option value="medium" className="bg-gray-900">Media</option>
            <option value="low"    className="bg-gray-900">Baja</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-surface-300 mb-2 flex items-center gap-1"><Calendar size={13} /> Fecha límite</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            min={today}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm [color-scheme:dark]"
            style={{ fontSize: isMobile ? '16px' : undefined }} />
        </div>
      </div>

      {boards.length > 0 && (
        <div>
          <label className="text-xs font-medium text-surface-300 mb-2 flex items-center gap-1"><Layers size={13} /> Tablero</label>
          <select value={boardId || ''} onChange={(e) => setBoardId(e.target.value || null)}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
            style={{ fontSize: isMobile ? '16px' : undefined }}>
            <option value="" className="bg-gray-900">Sin tablero</option>
            {boards.map(b => (
              <option key={b.id} value={b.id} className="bg-gray-900">{b.icon} {b.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-surface-300 mb-2 flex items-center gap-1"><Users size={13} /> Asignar a</label>
        <div className="flex flex-wrap gap-2 mt-1" style={{ opacity: isCompleted ? 0.5 : 1, cursor: isCompleted ? 'not-allowed' : undefined }}>
          {members.map((m) => (
            <button key={m.user_id} type="button" onClick={() => toggleAssignee(m.user_id)}
              disabled={isCompleted}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: assignees.includes(m.user_id) ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${assignees.includes(m.user_id) ? 'rgba(255,107,0,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: assignees.includes(m.user_id) ? '#c084fc' : '#94A3B8',
                cursor: isCompleted ? 'not-allowed' : 'pointer',
                minHeight: isMobile ? '40px' : undefined,
              }}>
              <UserAvatar name={m.name} avatarUrl={m.avatar_url} size={20} />
              {m.name}
            </button>
          ))}
        </div>
        {isCompleted && (
          <p className="text-xs text-surface-500 mt-1.5">Las tareas completadas no pueden recibir nuevas asignaciones.</p>
        )}
      </div>
    </>
  );

  // ── Desktop: centered modal ────────────────────────────────────
  if (!isMobile) {
    return (
      <Modal open={open} onClose={onClose} title={modalTitle}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formFields}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-50" disabled={submitting}>
              {submitting
                ? <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" />{task ? 'Guardando…' : 'Creando…'}</span>
                : (task ? 'Guardar' : 'Crear')}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  // ── Mobile: bottom sheet ───────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
          />
          {/* Sheet */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 glass-strong rounded-t-3xl flex flex-col"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
            style={{ maxHeight: '90dvh' }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-base font-bold">{modalTitle}</h2>
              <button onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-surface-400 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X size={16} />
              </button>
            </div>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <form id="task-sheet-form" onSubmit={handleSubmit} className="space-y-4">
                {formFields}
              </form>
            </div>
            {/* Sticky actions */}
            <div className="shrink-0 px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="btn-secondary flex-1" style={{ minHeight: '44px' }}>
                  Cancelar
                </button>
                <button type="submit" form="task-sheet-form"
                  className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ minHeight: '44px' }}
                  disabled={submitting}>
                  {submitting
                    ? <><Loader2 size={14} className="animate-spin" />{task ? 'Guardando…' : 'Creando…'}</>
                    : (task ? 'Guardar' : 'Crear')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
