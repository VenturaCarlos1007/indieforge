import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../components/layout/ProjectLayout';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus, Shield, ShieldCheck, Eye, Crown, Trash2, Mail, AlertTriangle
} from 'lucide-react';

const ROLE_CONFIG = {
  owner:  { label: 'Propietario', icon: Crown,      badge: 'bg-amber-500/15 text-amber-400' },
  admin:  { label: 'Admin',       icon: ShieldCheck, badge: 'bg-brand-500/15 text-brand-300' },
  member: { label: 'Miembro',     icon: Shield,      badge: 'bg-cyan-500/15 text-cyan-400' },
  viewer: { label: 'Visor',       icon: Eye,         badge: 'bg-surface-400/15 text-surface-200' },
};

export default function MembersPage() {
  const { projectId, project, members, setMembers, role } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isOwner = role === 'owner';
  const isAdmin = role === 'owner' || role === 'admin';

  // Delete member modal state
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Delete project modal state
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [deleteProjectName, setDeleteProjectName] = useState('');
  const [deletingProject, setDeletingProject] = useState(false);
  const [deleteProjectError, setDeleteProjectError] = useState('');

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/members/invite', { project_id: projectId, email, role: inviteRole });
      setEmail('');
      setShowInvite(false);
      // Member is pending until they accept — not shown in active members list
    } catch (err) {
      setError(err.response?.data?.error || 'Error al invitar.');
    } finally { setLoading(false); }
  };

  const [roleError, setRoleError] = useState('');

  const changeRole = async (memberId, newRole) => {
    setRoleError('');
    try {
      await api.patch(`/members/${memberId}/role`, { role: newRole });
      setMembers((p) => p.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err) {
      setRoleError(err.response?.data?.error || 'Error al cambiar rol.');
    }
  };

  const remove = async () => {
    if (!memberToDelete || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/members/${memberToDelete.id}`);
      setMembers((p) => p.filter((m) => m.id !== memberToDelete.id));
      getSocket()?.emit('member_removed', { projectId, memberId: memberToDelete.id });
      setMemberToDelete(null);
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Error al eliminar.');
    } finally { setDeleting(false); }
  };

  const deleteProject = async () => {
    if (deletingProject) return;
    setDeletingProject(true);
    setDeleteProjectError('');
    try {
      await api.delete(`/projects/${projectId}`);
      navigate('/dashboard');
    } catch (err) {
      setDeleteProjectError(err.response?.data?.error || 'Error al eliminar el proyecto.');
      setDeletingProject(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Miembros</h1>
        {isAdmin && (
          <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-1.5">
            <UserPlus size={16} /> Invitar
          </button>
        )}
      </div>

      {roleError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl">
          {roleError}
        </div>
      )}

      {/* Members list */}
      <div className="space-y-2">
        <AnimatePresence>
          {members.map((m, i) => {
            const rc = ROLE_CONFIG[m.role] || ROLE_CONFIG.member;
            const RoleIcon = rc.icon;
            const isSelf = m.user_id === user?.id;
            return (
              <motion.div
                key={m.id}
                className="glass-sm p-4 flex items-center gap-4 group"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.04 }}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-sm font-bold shrink-0">
                  {m.name[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    {isSelf && <span className="text-[10px] text-surface-400">(tú)</span>}
                  </div>
                  <p className="text-xs text-surface-400 truncate">{m.email}</p>
                </div>

                {/* Role badge */}
                <span className={`badge ${rc.badge} shrink-0`}>
                  <RoleIcon size={12} /> {rc.label}
                </span>

                {/* Actions */}
                {isOwner && m.role !== 'owner' && m.user_id !== user?.id && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value)}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs px-2 py-1.5 text-surface-200 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Miembro</option>
                      <option value="viewer">Visor</option>
                    </select>
                    <button onClick={() => setMemberToDelete(m)} className="text-surface-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Danger zone — solo para owner */}
      {isOwner && (
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={15} className="text-red-400" />
            <h2 className="text-sm font-semibold text-red-400">Zona de peligro</h2>
          </div>
          <p className="text-xs text-surface-400 mb-4">
            Eliminar el proyecto borrará permanentemente todos sus assets, tareas, comentarios y miembros. Esta acción no se puede deshacer.
          </p>
          <button
            onClick={() => { setShowDeleteProject(true); setDeleteProjectName(''); setDeleteProjectError(''); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all"
          >
            <Trash2 size={14} /> Eliminar proyecto
          </button>
        </div>
      )}

      {/* Delete member modal */}
      <Modal open={!!memberToDelete} onClose={() => { setMemberToDelete(null); setDeleteError(''); }} title="Eliminar miembro">
        <div className="space-y-4">
          <p className="text-sm text-surface-300">
            ¿Seguro que quieres eliminar a{' '}
            <span className="font-semibold text-white">{memberToDelete?.name}</span>{' '}
            del proyecto?
          </p>
          {deleteError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setMemberToDelete(null); setDeleteError(''); }} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all"
            >
              <Trash2 size={14} /> {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete project modal — estilo GitHub */}
      <Modal open={showDeleteProject} onClose={() => setShowDeleteProject(false)} title="Eliminar proyecto">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">
              Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos los assets, tareas, comentarios y miembros del proyecto.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-surface-300 mb-1.5 block">
              Escribe <span className="font-mono text-white">{project?.name}</span> para confirmar:
            </label>
            <input
              value={deleteProjectName}
              onChange={(e) => { setDeleteProjectName(e.target.value); setDeleteProjectError(''); }}
              placeholder={project?.name}
              className="input-field font-mono"
              autoFocus
            />
          </div>
          {deleteProjectError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl">
              {deleteProjectError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowDeleteProject(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={deleteProject}
              disabled={deleteProjectName !== project?.name || deletingProject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Trash2 size={14} /> {deletingProject ? 'Eliminando…' : 'Eliminar proyecto'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Invite modal */}
      <Modal open={showInvite} onClose={() => { setShowInvite(false); setError(''); }} title="Invitar miembro">
        <form onSubmit={invite} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-300" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email del usuario" className="input-field pl-10" autoFocus required />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-300 mb-1.5 block">Rol</label>
            <div className="flex gap-2">
              {['admin', 'member', 'viewer'].map((r) => {
                const rc = ROLE_CONFIG[r];
                return (
                  <button key={r} type="button" onClick={() => setInviteRole(r)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      inviteRole === r
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                        : 'bg-white/[0.04] text-surface-300 border border-white/[0.06] hover:bg-white/[0.08]'
                    }`}
                  >
                    <rc.icon size={13} /> {rc.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Invitando…' : 'Invitar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
