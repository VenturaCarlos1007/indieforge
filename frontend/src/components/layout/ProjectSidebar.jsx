import { NavLink, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, FolderOpen, Columns3, Users, ArrowLeft, Gamepad2, BarChart2 } from 'lucide-react';

const navItems = [
  { path: '',        label: 'Dashboard',  icon: LayoutDashboard, accent: '#a855f7', end: true },
  { path: 'assets',  label: 'Assets',     icon: FolderOpen,      accent: '#22d3ee' },
  { path: 'kanban',  label: 'Kanban',     icon: Columns3,        accent: '#fbbf24' },
  { path: 'members', label: 'Miembros',   icon: Users,           accent: '#34d399' },
  { path: 'stats',   label: 'Estadísticas',icon: BarChart2,      accent: '#f43f5e' },
];

export default function ProjectSidebar({ project }) {
  const { projectId } = useParams();
  const base = `/project/${projectId}`;

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
