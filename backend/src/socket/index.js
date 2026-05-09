const jwt = require('jsonwebtoken');

function initSocket(httpServer) {
  const { Server } = require('socket.io');

  const io = new Server(httpServer, {
    cors: {
      origin: [
        'https://indieforge-beryl.vercel.app',
        'https://indieforge-production.up.railway.app', 
        'http://localhost:5173'
      ],
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token requerido.'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      return next(new Error('Token inválido.'));
    }
  });

  // projectId -> Map<userId, refCount>
  const onlineUsers = new Map();

  function emitOnlineUpdate(projectId) {
    const users = onlineUsers.get(projectId);
    const ids = users ? Array.from(users.keys()) : [];
    io.to(`project:${projectId}`).emit('online_users_update', { projectId, onlineUserIds: ids });
  }

  io.on('connection', (socket) => {
    console.log(`🔌 User ${socket.userId} connected`);

    // ── Personal room
    socket.join(`user:${socket.userId}`);

    socket.projectRooms = new Set();

    // ── Project rooms
    socket.on('join_project', (projectId) => {
      socket.join(`project:${projectId}`);
      socket.projectRooms.add(projectId);

      if (!onlineUsers.has(projectId)) onlineUsers.set(projectId, new Map());
      const map = onlineUsers.get(projectId);
      map.set(socket.userId, (map.get(socket.userId) || 0) + 1);
      emitOnlineUpdate(projectId);
    });

    socket.on('leave_project', (projectId) => {
      socket.leave(`project:${projectId}`);
      socket.projectRooms.delete(projectId);

      const map = onlineUsers.get(projectId);
      if (map) {
        const count = (map.get(socket.userId) || 1) - 1;
        if (count <= 0) map.delete(socket.userId); else map.set(socket.userId, count);
        emitOnlineUpdate(projectId);
      }
    });

    // ── Activity feed
    socket.on('activity', (data) => {
      socket.to(`project:${data.projectId}`).emit('new_activity', {
        ...data, userId: socket.userId, timestamp: new Date().toISOString(),
      });
    });

    // ── Comments
    socket.on('new_comment', (data) => {
      socket.to(`project:${data.projectId}`).emit('comment_added', data);
    });
    socket.on('comment_resolved', (data) => {
      socket.to(`project:${data.projectId}`).emit('comment_resolved', data);
    });

    // ── Tasks / Kanban
    socket.on('task_created', (data) => {
      socket.to(`project:${data.projectId}`).emit('task_created', data);
    });
    socket.on('task_updated', (data) => {
      socket.to(`project:${data.projectId}`).emit('task_updated', data);
    });
    socket.on('task_deleted', (data) => {
      socket.to(`project:${data.projectId}`).emit('task_deleted', data);
    });
    socket.on('task_moved', (data) => {
      socket.to(`project:${data.projectId}`).emit('task_moved', data);
    });

    // ── Assets
    socket.on('asset_uploaded', (data) => {
      socket.to(`project:${data.projectId}`).emit('asset_uploaded', data);
    });

    // ── Members
    socket.on('member_added', (data) => {
      socket.to(`project:${data.projectId}`).emit('member_added', data);
    });
    socket.on('member_removed', (data) => {
      socket.to(`project:${data.projectId}`).emit('member_removed', data);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User ${socket.userId} disconnected`);
      socket.projectRooms.forEach((projectId) => {
        const map = onlineUsers.get(projectId);
        if (map) {
          const count = (map.get(socket.userId) || 1) - 1;
          if (count <= 0) map.delete(socket.userId); else map.set(socket.userId, count);
          emitOnlineUpdate(projectId);
        }
      });
    });
  });

  return io;
}

module.exports = { initSocket };
