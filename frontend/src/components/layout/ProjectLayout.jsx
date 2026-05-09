import { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import ProjectSidebar from './ProjectSidebar';

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
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </ProjectContext.Provider>
  );
}
