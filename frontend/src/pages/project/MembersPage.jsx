import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../../components/layout/ProjectLayout';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus, Shield, ShieldCheck, Eye, Crown, Trash2, ChevronDown, Mail
} from 'lucide-react';

const ROLE_CONFIG = {
  owner:  { label: 'Propietario', icon: Crown,      badge: 'bg-amber-500/15 text-amber-400' },
  admin:  { label: 'Admin',       icon: ShieldCheck, badge: 'bg-brand-500/15 text-brand-300' },
  member: { label: 'Miembro',     icon: Shield,      badge: 'bg-cyan-500/15 text-cyan-400' },
  viewer: { label: 'Visor',       icon: Eye,         badge: 'bg-surface-400/15 text-surface-200' },
};

export default function MembersPage() {
  const { projectId, members, setMembers, role } = useProject();
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isOwner = role === 'owner';
  const isAdmin = role === 'owner' || role === 'admin';

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

  const changeRole = async (memberId, newRole) => {
    try {
      await api.patch(`/members/${memberId}/role`, { role: newRole });
      setMembers((p) => p.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar rol.');
    }
  };

  const remove = async (memberId) => {
    if (!confirm('¿Eliminar este miembro del proyecto?')) return;
    try {
      await api.delete(`/members/${memberId}`);
      setMembers((p) => p.filter((m) => m.id !== memberId));
      getSocket()?.emit('member_removed', { projectId, memberId });
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar.');
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
                {isOwner && m.role !== 'owner' && (
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
                    <button onClick={() => remove(m.id)} className="text-surface-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

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
