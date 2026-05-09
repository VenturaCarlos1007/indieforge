import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Info, AlertTriangle, AlertCircle, Clock, UserPlus, Loader2, X, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(null); // notif.id being processed
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    if (socket) socket.on('notification', handleNewNotification);

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    const handleKeyDown = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (socket) socket.off('notification', handleNewNotification);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const [resNotif, resCount] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(resNotif.data.notifications);
      setUnreadCount(resCount.data.count);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleNewNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const clearAll = async () => {
    try {
      await api.delete('/notifications/all');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleAccept = async (notif) => {
    const membershipId = notif.data?.membershipId;
    if (!membershipId || actionLoading) return;
    setActionLoading(notif.id);
    try {
      await api.patch(`/members/${membershipId}/accept`);
      await markAsRead(notif.id);
      setIsOpen(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error accepting invitation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (notif) => {
    const membershipId = notif.data?.membershipId;
    if (!membershipId || actionLoading) return;
    setActionLoading(notif.id);
    try {
      await api.patch(`/members/${membershipId}/decline`);
      await markAsRead(notif.id);
    } catch (err) {
      console.error('Error declining invitation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleNotifClick = (notif) => {
    if (notif.type === 'project_invitation') return;
    if (!notif.read) markAsRead(notif.id);
    setIsOpen(false);
    const projectId = notif.project_id;
    const data = notif.data || {};
    switch (notif.type) {
      case 'task_assigned':
      case 'task_due':
        navigate(`/project/${projectId}/kanban`);
        break;
      case 'asset_comment':
        navigate(`/project/${projectId}/assets`, { state: { openAssetId: data.assetId } });
        break;
      case 'asset_uploaded':
        navigate(`/project/${projectId}/assets`);
        break;
      default:
        if (projectId) navigate(`/project/${projectId}`);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'project_invitation': return <UserPlus className="w-5 h-5 text-purple-400" />;
      case 'task_assigned':      return <Info className="w-5 h-5 text-cyan-400" />;
      case 'warning':            return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':              return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:                   return <Bell className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="relative z-50" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
      >
        <Bell className="w-5 h-5 text-white/70" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-gray-900" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-80 max-h-[32rem] flex flex-col bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h3 className="font-semibold text-white">Notificaciones</h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3 h-3" /> Marcar leídas
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Limpiar todo
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-white/40">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No tienes notificaciones</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isInvitation = notif.type === 'project_invitation';
                  const isProcessing = actionLoading === notif.id;

                  return (
                    <div
                      key={notif.id}
                      onClick={() => !isInvitation && handleNotifClick(notif)}
                      className={`p-3 rounded-xl transition-all flex items-start gap-3 ${
                        notif.read ? 'opacity-60' : 'bg-white/10'
                      } ${!isInvitation ? 'cursor-pointer hover:bg-white/15' : ''}`}
                    >
                      <div className="mt-0.5 flex-shrink-0">{getIcon(notif.type)}</div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{notif.title}</p>
                        <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{notif.message}</p>

                        {/* Invitation action buttons */}
                        {isInvitation && !notif.read && (
                          <div className="flex gap-2 mt-2.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAccept(notif); }}
                              disabled={isProcessing}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-50 transition-colors"
                            >
                              {isProcessing
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Check size={11} />
                              }
                              Aceptar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDecline(notif); }}
                              disabled={isProcessing}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-white/5 text-white/50 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 disabled:opacity-50 transition-colors"
                            >
                              <X size={11} /> Rechazar
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-white/40">
                          <Clock className="w-3 h-3" />
                          {new Date(notif.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>

                      {!notif.read && !isInvitation && (
                        <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
