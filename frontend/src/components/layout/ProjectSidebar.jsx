import { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, FolderOpen, Columns3, Users, ArrowLeft, Gamepad2, BarChart2, MessageSquare } from 'lucide-react';
import { useProject } from './ProjectLayout';
import { getSocket } from '../../services/socket';
import UserAvatar from '../common/UserAvatar';

const navItems = [
  { path: '',        label: 'Dashboard',  icon: LayoutDashboard, accent: '#a855f7', end: true },
  { path: 'assets',  label: 'Assets',     icon: FolderOpen,      accent: '#22d3ee' },
  { path: 'kanban',  label: 'Kanban',     icon: Columns3,        accent: '#fbbf24' },
  { path: 'members', label: 'Miembros',   icon: Users,           accent: '#34d399' },
  { path: 'stats',   label: 'Estadísticas',icon: BarChart2,      accent: '#f43f5e' },
  { path: 'chat',   label: 'Chat',         icon: MessageSquare,  accent: '#a855f7' },
];

export default function ProjectSidebar({ project }) {
  const { projectId } = useParams();
  const { members } = useProject();
  const base = `/project/${projectId}`;
  const [onlineIds, setOnlineIds] = useState(new Set());

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ onlineUserIds }) => setOnlineIds(new Set(onlineUserIds));
    socket.on('online_users_update', handler);
    return () => socket.off('online_users_update', handler);
  }, []);

  return (
    <aside className="hidden lg:flex flex-col w-56 glass-sidebar-project shrink-0 relative">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, #a855f7, #22d3ee, #34d399)' }} />

      {/* Back + Project name */}
      <div className="px-4 py-4 border-b border-white/[0.05]">
        <NavLink to="/dashboard"
          className="flex items-center gap-2 text-surface-400 hover:text-white text-xs mb-3 transition-all duration-200 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Todos los proyectos</span>
        </NavLink>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED20, #06B6D420)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <Gamepad2 size={14} className="text-brand-400" />
          </div>
          <h2 className="font-semibold text-sm truncate">{project.name}</h2>
        </div>
      </div>

      {/* Online members */}
      {members.length > 0 && (
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <p className="text-[10px] font-medium text-surface-500 uppercase tracking-wider mb-2">En línea</p>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => {
              const isOnline = onlineIds.has(m.user_id);
              return (
                <div key={m.id} className="relative group/avatar">
                  <UserAvatar
                    name={m.name}
                    avatarUrl={m.avatar_url}
                    size={28}
                    className={isOnline ? 'opacity-100' : 'opacity-40'}
                  />
                  <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-gray-900 ${isOnline ? 'bg-green-400' : 'bg-surface-500'}`} />
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-0.5 rounded-lg text-[10px] text-white whitespace-nowrap pointer-events-none opacity-0 group-hover/avatar:opacity-100 transition-opacity z-50"
                    style={{ background: 'rgba(15,15,20,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {m.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon, accent, end }) => (
          <NavLink
            key={path}
            to={`${base}/${path}`}
            end={end}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group"
          >
            {({ isActive }) => (
              <>
                {/* Animated background */}
                {isActive && (
                  <motion.div
                    layoutId="project-nav-active"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${accent}12, transparent)`,
                      border: `1px solid ${accent}25`,
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {/* Left accent bar */}
                {isActive && (
                  <motion.div
                    layoutId="project-nav-bar"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                    style={{ background: accent, boxShadow: `0 0 8px ${accent}60` }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 relative z-10 ${
                  isActive ? '' : 'group-hover:scale-110'
                }`}
                  style={{
                    background: isActive ? `${accent}18` : 'rgba(255,255,255,0.03)',
                    boxShadow: isActive ? `0 0 12px ${accent}15` : 'none',
                  }}>
                  <Icon size={15} style={{ color: isActive ? accent : '#64748B' }}
                    className="transition-colors duration-200 group-hover:brightness-150" />
                </div>
                <span className={`relative z-10 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-surface-300 group-hover:text-white'
                }`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
