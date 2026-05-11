import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import Layout from './components/layout/Layout';
import ProjectLayout from './components/layout/ProjectLayout';
import ProjectDashboard from './pages/project/ProjectDashboard';
import AssetsPage from './pages/project/AssetsPage';
import KanbanPage from './pages/project/KanbanPage';
import MembersPage from './pages/project/MembersPage';
import ProjectStatsPage from './pages/project/ProjectStatsPage';
import ChatPage from './pages/project/ChatPage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="project/:projectId" element={<ProjectLayout />}>
          <Route index element={<ProjectDashboard />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="kanban" element={<KanbanPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="stats" element={<ProjectStatsPage />} />
          <Route path="chat" element={<ChatPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
