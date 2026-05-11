const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/messages?project_id=:id  — últimos 50 mensajes
router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id requerido.' });

    const member = await query(
      `SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2 AND status='active'`,
      [project_id, req.user.id]
    );
    if (!member.rows.length) {
      console.log(`[chat] GET denied: user ${req.user.id} not in project ${project_id}`);
      return res.status(403).json({ error: 'Sin acceso.' });
    }

    const result = await query(
      `SELECT pm.id, pm.content, pm.created_at,
              pm.user_id, u.name AS user_name, u.avatar_url
         FROM project_messages pm
         JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = $1
        ORDER BY pm.created_at DESC
        LIMIT 50`,
      [project_id]
    );
    const messages = result.rows.reverse();
    console.log(`[chat] GET project ${project_id}: ${messages.length} messages`);
    res.json({ messages });
  } catch (err) {
    console.error('[chat] GET error:', err);
    res.status(500).json({ error: 'Error al obtener mensajes.' });
  }
});

// POST /api/messages  — enviar mensaje
router.post('/', async (req, res) => {
  try {
    const { project_id, content } = req.body;
    if (!project_id || !content?.trim()) return res.status(400).json({ error: 'Datos incompletos.' });

    const member = await query(
      `SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2 AND status='active'`,
      [project_id, req.user.id]
    );
    if (!member.rows.length) {
      console.log(`[chat] POST denied: user ${req.user.id} not in project ${project_id}`);
      return res.status(403).json({ error: 'Sin acceso.' });
    }

    const insert = await query(
      `INSERT INTO project_messages (project_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [project_id, req.user.id, content.trim()]
    );
    const msg = insert.rows[0];
    console.log(`[chat] message ${msg.id} inserted by user ${req.user.id} in project ${project_id}`);

    const fullMsg = {
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      project_id: parseInt(project_id),
      user_id: req.user.id,
      user_name: req.user.name,
      avatar_url: req.user.avatar_url,
    };

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${project_id}`).emit('chat:message', fullMsg);
      console.log(`[chat] emitted chat:message to project:${project_id}`);
    } else {
      console.error('[chat] io not available on req.app');
    }

    res.status(201).json({ message: fullMsg });
  } catch (err) {
    console.error('[chat] POST error:', err);
    res.status(500).json({ error: 'Error al enviar mensaje.' });
  }
});

module.exports = router;
