import { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, useParams, NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Columns3, Users, BarChart2, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import ProjectSidebar from './ProjectSidebar';

const MOBILE_NAV = [
  { path: '',        label: 'Dashboard',    icon: LayoutDashboard, accent: '#a855f7', end: true },
  { path: 'assets',  label: 'Assets',       icon: FolderOpen,      accent: '#22d3ee' },
  { path: 'kanban',  label: 'Kanban',       icon: Columns3,        accent: '#fbbf24' },
  { path: 'members', label: 'Miembros',     icon: Users,           accent: '#34d399' },
  { path: 'stats',   label: 'Stats',        icon: BarChart2,       accent: '#f43f5e' },
  { path: 'chat',    label: 'Chat',         icon: MessageSquare,   accent: '#a855f7' },
];

const ProjectContext = createContext(null);
export const useProject = () => useContext(ProjectContext);

export default function ProjectLayout() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [role, setRole] = useState('member');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, memRes] = await Promise.all([
          api.get(`/projects/${projectId}`),
          api.get(`/members?project_id=${projectId}`),
        ]);
        setProject(projRes.data.project);
        setRole(projRes.data.role);
        setMembers(memRes.data.members);
      } catch (err) {
        console.error('Error loading project', err);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Join socket room
    const socket = getSocket();
    if (socket) {
      socket.emit('join_project', projectId);
      return () => socket.emit('leave_project', projectId);
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-surface-300">
        Proyecto no encontrado.
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={{ project, setProject, role, members, setMembers, projectId }}>
      <div className="flex h-full">
        <ProjectSidebar project={project} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile horizontal tab nav */}
          <nav className="lg:hidden flex overflow-x-auto scrollbar-none shrink-0 border-b px-2"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--sidebar-bg)' }}>
            {MOBILE_NAV.map(({ path, label, icon: Icon, accent, end }) => (
              <NavLink
                key={path}
                to={`/project/${projectId}/${path}`}
                end={end}
                className="flex flex-col items-center gap-1 px-4 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 border-b-2"
                style={({ isActive }) => ({
                  color: isActive ? accent : 'var(--surface-400, #64748B)',
                  borderBottomColor: isActive ? accent : 'transparent',
                })}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8">
            <Outlet />
          </div>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}
