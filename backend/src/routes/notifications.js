const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

// Helper function to create a notification and emit via socket.io
async function createNotification(req, userId, projectId, type, title, message, data = null) {
  try {
    const { rows } = await query(
      `INSERT INTO notifications (user_id, project_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, projectId, type, title, message, data]
    );
    const notification = rows[0];

    // Emit real-time event via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('notification', notification);
    }
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

// GET /api/notifications — lista notificaciones del usuario (limit 50)
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ notifications: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/unread-count — retorna { count: N }
router.get('/unread-count', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT COUNT(*) FROM notifications
       WHERE user_id = $1 AND read = FALSE`,
      [req.user.id]
    );
    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read — marca una como leída
router.patch('/:id/read', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE notifications SET read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Notificación no encontrada.' });
    res.json({ notification: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all — marca todas como leídas
router.patch('/read-all', async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET read = TRUE
       WHERE user_id = $1 AND read = FALSE`,
      [req.user.id]
    );
    res.json({ message: 'Todas las notificaciones marcadas como leídas.' });
  } catch (err) {
    next(err);
  }
});

module.exports = { router, createNotification };
