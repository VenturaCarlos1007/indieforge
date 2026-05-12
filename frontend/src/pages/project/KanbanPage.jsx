import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../../components/layout/ProjectLayout';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { SkeletonCard, EmptyState } from '../../components/common/Skeleton';
import {
  Plus, GripVertical, Pencil, Trash2, Clock, CheckCircle2, Loader2, Users, AlertTriangle, AlertCircle, ArrowDownCircle, Calendar
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
  high: { label: 'Alta', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: AlertCircle },
  medium: { label: 'Media', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', icon: AlertTriangle },
  low: { label: 'Baja', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', icon: ArrowDownCircle }
};

export default function KanbanPage() {
  const { projectId, members, role } = useProject();
  const isViewer = role === 'viewer';
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [kanbanError, setKanbanError] = useState('');
  const dragItem = useRef(null);

  const loadTasks = async () => {
    try { const { data } = await api.get(`/tasks?project_id=${projectId}`); setTasks(data.tasks); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadTasks();
    const socket = getSocket();
    if (socket) {
      socket.on('task_created', (d) => setTasks((p) => [d.task, ...p]));
      socket.on('task_updated', (d) => setTasks((p) => p.map((t) => t.id === d.task.id ? d.task : t)));
      socket.on('task_deleted', (d) => setTasks((p) => p.filter((t) => t.id !== d.taskId)));
      socket.on('task_moved', (d) => setTasks((p) => p.map((t) => t.id === d.taskId ? { ...t, status: d.status } : t)));
      return () => { socket.off('task_created'); socket.off('task_updated'); socket.off('task_deleted'); socket.off('task_moved'); };
    }
  }, [projectId]);

  const showError = (msg) => { setKanbanError(msg); setTimeout(() => setKanbanError(''), 4000); };

  const createTask = async ({ title, description, status, priority, due_date, assignee_ids }) => {
    try {
      const { data } = await api.post('/tasks', { project_id: projectId, title, description, status, priority, due_date, assignee_ids });
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
    await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
    setTasks((p) => p.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    getSocket()?.emit('task_moved', { projectId, taskId, status: newStatus });
  };

  const handleDragStart = (e, taskId) => { dragItem.current = taskId; e.dataTransfer.effectAllowed = 'move'; e.target.style.opacity = '0.4'; };
  const handleDragEnd = (e) => { e.target.style.opacity = '1'; dragItem.current = null; setDragOverCol(null); };
  const handleDragOver = (e, status) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(status); };
  const handleDragLeave = () => setDragOverCol(null);
  const handleDrop = (e, status) => { e.preventDefault(); setDragOverCol(null); if (dragItem.current) moveTask(dragItem.current, status); };

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

  const filteredTasks = priorityFilter === 'all' ? tasks : tasks.filter(t => t.priority === priorityFilter);

  return (
    <div className="space-y-5">
      {kanbanError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl flex items-center justify-between">
          <span>{kanbanError}</span>
          <button onClick={() => setKanbanError('')} className="ml-3 text-red-400 hover:text-red-300 text-lg leading-none">✕</button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Kanban</h1>
          <span className="text-xs text-surface-400">{filteredTasks.length} tareas mostradas</span>
        </div>
        
        {/* Priority Filter */}
        <div className="flex items-center gap-2 bg-surface-900 border border-white/5 rounded-xl p-1">
          <button
            onClick={() => setPriorityFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${priorityFilter === 'all' ? 'bg-white/10 text-white' : 'text-surface-400 hover:text-white hover:bg-white/5'}`}
          >
            Todas
          </button>
          <button
            onClick={() => setPriorityFilter('high')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${priorityFilter === 'high' ? 'bg-red-400/20 text-red-400' : 'text-surface-400 hover:text-red-400 hover:bg-white/5'}`}
          >
            Alta
          </button>
          <button
            onClick={() => setPriorityFilter('medium')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${priorityFilter === 'medium' ? 'bg-yellow-400/20 text-yellow-400' : 'text-surface-400 hover:text-yellow-400 hover:bg-white/5'}`}
          >
            Media
          </button>
          <button
            onClick={() => setPriorityFilter('low')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${priorityFilter === 'low' ? 'bg-green-400/20 text-green-400' : 'text-surface-400 hover:text-green-400 hover:bg-white/5'}`}
          >
            Baja
          </button>
        </div>
      </div>

      {/* Board with dot grid bg */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start dot-grid rounded-2xl p-4 -mx-4"
        style={{ minHeight: '500px' }}>
        {COLUMNS.map((col) => {
          const columnTasks = filteredTasks.filter((t) => t.status === col.status);
          const isOver = dragOverCol === col.status;
          return (
            <div key={col.status}
              className={`rounded-2xl transition-all duration-300 ${isOver ? 'ring-2 ring-offset-0' : ''}`}
              style={{
                background: isOver ? `${col.accent}08` : 'transparent',
                ringColor: isOver ? `${col.accent}40` : 'transparent',
              }}
              onDragOver={isViewer ? undefined : (e) => handleDragOver(e, col.status)}
              onDragLeave={isViewer ? undefined : handleDragLeave}
              onDrop={isViewer ? undefined : (e) => handleDrop(e, col.status)}
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
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
                    style={{ background: col.accentLight }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus size={14} style={{ color: col.accent }} />
                  </motion.button>
                )}
              </div>

              {/* Cards */}
              <div className="space-y-2.5 px-1 pb-2 min-h-[200px]">
                {columnTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <col.icon size={22} style={{ color: `${col.accent}50` }} className="mb-2" />
                    <p className="text-xs text-surface-500">Sin tareas aquí</p>
                  </div>
                )}
                <AnimatePresence>
                  {columnTasks.map((task) => {
                    const priorityData = PRIORITIES[task.priority || 'medium'];
                    const PriorityIcon = priorityData.icon;
                    
                    // Due date logic
                    let dueColor = '';
                    let dueLabel = '';
                    if (task.due_date && task.status !== 'done') {
                      const today = new Date();
                      const due = new Date(task.due_date);
                      const diffTime = due - today;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays < 0) {
                        dueColor = 'text-red-400 border-red-400/30 bg-red-400/10';
                        dueLabel = 'Vencida';
                      } else if (diffDays <= 3) {
                        dueColor = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
                        dueLabel = `En ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
                      } else {
                        dueColor = 'text-green-400 border-green-400/30 bg-green-400/10';
                        dueLabel = `En ${diffDays} días`;
                      }
                    }

                    return (
                      <motion.div
                        key={task.id}
                        className="kanban-card group relative"
                        style={{ borderLeft: `3px solid ${col.accent}60` }}
                        draggable={!isViewer}
                        onDragStart={isViewer ? undefined : (e) => handleDragStart(e, task.id)}
                        onDragEnd={isViewer ? undefined : handleDragEnd}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ y: -2, boxShadow: `0 8px 30px ${col.accent}12, 0 0 0 1px ${col.accent}15` }}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical size={14} className="text-surface-400 mt-0.5 cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                          </div>
                          {!isViewer && (
                          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditTask(task)} className="p-1.5 rounded-lg text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-all"><Pencil size={12} /></button>
                            <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={12} /></button>
                          </div>
                        )}
                        </div>
                        {task.assignees && task.assignees.length > 0 && (
                          <div className="flex items-center gap-0.5 mt-3 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            {task.assignees.slice(0, 4).map((a) => (
                              <UserAvatar key={a.id} name={a.name} avatarUrl={a.avatar_url} size={24} className="ring-1 ring-surface-800" title={a.name} />
                            ))}
                            {task.assignees.length > 4 && (
                              <span className="text-[10px] text-surface-400 ml-1">+{task.assignees.length - 4}</span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <TaskFormModal open={!!showCreate} onClose={() => setShowCreate(null)} onSubmit={(d) => createTask({ ...d, status: showCreate })} members={members} title="Nueva tarea" />
      <TaskFormModal open={!!editTask} onClose={() => setEditTask(null)} onSubmit={(d) => updateTask(editTask.id, d)} members={members} task={editTask} title="Editar tarea" />
    </div>
  );
}

function TaskFormModal({ open, onClose, onSubmit, members, task, title: modalTitle }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (task) { 
      setTitle(task.title || ''); 
      setDescription(task.description || ''); 
      setPriority(task.priority || 'medium');
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
      setAssignees(task.assignees?.map((a) => a.id) || []); 
    } else { 
      setTitle(''); 
      setDescription(''); 
      setPriority('medium');
      setDueDate('');
      setAssignees([]); 
    }
  }, [task, open]);

  const toggleAssignee = (id) => setAssignees((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try { await onSubmit({ title, description, priority, due_date: dueDate || null, assignee_ids: assignees }); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la tarea" className="input-field" autoFocus required />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción (opcional)" rows={3} className="input-field resize-none" />
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-surface-300 mb-2 flex items-center gap-1">Prioridad:</label>
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
            >
              <option value="high" className="bg-gray-900">Alta</option>
              <option value="medium" className="bg-gray-900">Media</option>
              <option value="low" className="bg-gray-900">Baja</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-surface-300 mb-2 flex items-center gap-1"><Calendar size={13} /> Fecha límite:</label>
            <input 
              type="date" 
              value={dueDate} 
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm [color-scheme:dark]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-surface-300 mb-2 flex items-center gap-1"><Users size={13} /> Asignar a:</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {members.map((m) => (
              <button key={m.user_id} type="button" onClick={() => toggleAssignee(m.user_id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: assignees.includes(m.user_id) ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${assignees.includes(m.user_id) ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: assignees.includes(m.user_id) ? '#c084fc' : '#94A3B8',
                }}>
                <UserAvatar name={m.name} avatarUrl={m.avatar_url} size={20} />
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary disabled:opacity-50" disabled={submitting}>
            {submitting
              ? <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" />{task ? 'Guardando…' : 'Creando…'}</span>
              : (task ? 'Guardar' : 'Crear')
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}
