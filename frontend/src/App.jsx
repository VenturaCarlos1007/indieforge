import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/common/Toast';
import SplashScreen from './components/common/SplashScreen';
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
import MilestonesPage from './pages/project/MilestonesPage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import AuthCallbackPage from './pages/AuthCallbackPage';

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
  // Splash: muestra 1.1s + 0.4s fade-out = 1.5s total
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1100);
    return () => clearTimeout(t);
  }, []);

  return (
    <ToastProvider>
      <ToastContainer />
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>

      <Routes>
        <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        {/* Explorar es público: visible con o sin sesión */}
        <Route path="/" element={<Layout />}>
          <Route path="explore" element={<ExplorePage />} />
        </Route>

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="project/:projectId" element={<ProjectLayout />}>
            <Route index element={<ProjectDashboard />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="kanban" element={<KanbanPage />} />
            <Route path="milestones" element={<MilestonesPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="stats" element={<ProjectStatsPage />} />
            <Route path="chat" element={<ChatPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
