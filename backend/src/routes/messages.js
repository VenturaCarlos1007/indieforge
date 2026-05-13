'use strict';
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('./notifications');

router.use(authenticate);

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎮', '✅'];

// ── helpers ─────────────────────────────────────────────────────────
async function getReactions(messageIdText) {
  const r = await query(
    `SELECT mr.emoji, mr.user_id::TEXT AS user_id, u.name AS user_name
       FROM message_reactions mr
       JOIN users u ON u.id = mr.user_id
      WHERE mr.message_id = $1
      ORDER BY mr.created_at`,
    [messageIdText]
  );
  return r.rows;
}

// GET /api/messages?project_id=:id — últimos 50 mensajes con reacciones
router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id requerido.' });

    const member = await query(
      `SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2 AND status='active'`,
      [project_id, req.user.id]
    );
    if (!member.rows.length) return res.status(403).json({ error: 'Sin acceso.' });

    const result = await query(
      `SELECT pm.id, pm.content, pm.created_at,
              COALESCE(pm.edited, false) AS edited, pm.edited_at,
              pm.user_id, u.name AS user_name, u.avatar_url,
              COALESCE((
                SELECT json_agg(json_build_object(
                  'emoji', mr.emoji,
                  'user_id', mr.user_id::TEXT,
                  'user_name', ru.name
                ) ORDER BY mr.created_at)
                FROM message_reactions mr
                JOIN users ru ON ru.id = mr.user_id
                WHERE mr.message_id = pm.id::TEXT
              ), '[]'::json) AS raw_reactions
         FROM project_messages pm
         JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = $1
        ORDER BY pm.created_at DESC
        LIMIT 50`,
      [project_id]
    );
    res.json({ messages: result.rows.reverse() });
  } catch (err) {
    console.error('[chat] GET error:', err);
    res.status(500).json({ error: 'Error al obtener mensajes.' });
  }
});

// POST /api/messages — enviar mensaje
router.post('/', async (req, res) => {
  try {
    const { project_id, content, mention_ids } = req.body;
    if (!project_id || !content?.trim()) return res.status(400).json({ error: 'Datos incompletos.' });

    const member = await query(
      `SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2 AND status='active'`,
      [project_id, req.user.id]
    );
    if (!member.rows.length) return res.status(403).json({ error: 'Sin acceso.' });

    const insert = await query(
      `INSERT INTO project_messages (project_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [project_id, req.user.id, content.trim()]
    );
    const msg = insert.rows[0];

    const fullMsg = {
      id: String(msg.id),
      content: msg.content,
      created_at: msg.created_at,
      edited: false,
      edited_at: null,
      raw_reactions: [],
      project_id,
      user_id: String(req.user.id),
      user_name: req.user.name,
      avatar_url: req.user.avatar_url,
    };

    const io = req.app.get('io');
    io?.to(`project:${project_id}`).emit('chat:message', fullMsg);

    if (Array.isArray(mention_ids) && mention_ids.length > 0) {
      const preview = content.trim().slice(0, 80) + (content.trim().length > 80 ? '…' : '');
      for (const mentionedId of mention_ids) {
        if (String(mentionedId) !== String(req.user.id)) {
          await createNotification(req, mentionedId, project_id, 'mention',
            'Te mencionaron en el chat',
            `${req.user.name}: ${preview}`,
            { projectId: project_id, messageId: String(msg.id) }
          );
        }
      }
    }

    res.status(201).json({ message: fullMsg });
  } catch (err) {
    console.error('[chat] POST error:', err);
    res.status(500).json({ error: 'Error al enviar mensaje.' });
  }
});

// PATCH /api/messages/:id — editar (solo el autor)
router.patch('/:id', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Contenido requerido.' });

    const existing = await query(
      'SELECT id, user_id, project_id FROM project_messages WHERE id=$1',
      [req.params.id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Mensaje no encontrado.' });
    if (String(existing.rows[0].user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Solo el autor puede editar el mensaje.' });
    }

    const updated = await query(
      `UPDATE project_messages SET content=$1, edited=true, edited_at=NOW()
       WHERE id=$2 RETURNING id, content, edited, edited_at, project_id`,
      [content.trim(), req.params.id]
    );
    const row = updated.rows[0];

    const io = req.app.get('io');
    io?.to(`project:${row.project_id}`).emit('chat:message_edited', {
      id: String(row.id),
      content: row.content,
      edited: true,
      edited_at: row.edited_at,
    });

    res.json({ message: row });
  } catch (err) {
    console.error('[chat] PATCH error:', err);
    res.status(500).json({ error: 'Error al editar el mensaje.' });
  }
});

// DELETE /api/messages/:id — eliminar (autor, admin u owner del proyecto)
router.delete('/:id', async (req, res) => {
  try {
    const existing = await query(
      'SELECT id, user_id, project_id FROM project_messages WHERE id=$1',
      [req.params.id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Mensaje no encontrado.' });

    const m = existing.rows[0];
    const isAuthor = String(m.user_id) === String(req.user.id);

    if (!isAuthor) {
      const membership = await query(
        `SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2 AND status='active'`,
        [m.project_id, req.user.id]
      );
      if (!membership.rows.length || !['owner', 'admin'].includes(membership.rows[0].role)) {
        return res.status(403).json({ error: 'No autorizado para eliminar este mensaje.' });
      }
    }

    await query('DELETE FROM project_messages WHERE id=$1', [req.params.id]);

    const io = req.app.get('io');
    io?.to(`project:${m.project_id}`).emit('chat:message_deleted', { id: String(m.id) });

    res.json({ ok: true });
  } catch (err) {
    console.error('[chat] DELETE error:', err);
    res.status(500).json({ error: 'Error al eliminar el mensaje.' });
  }
});

// POST /api/messages/:id/reactions — toggle reacción (agregar o quitar)
router.post('/:id/reactions', async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: 'Emoji no válido.' });
    }

    const msg = await query(
      'SELECT id, project_id FROM project_messages WHERE id=$1',
      [req.params.id]
    );
    if (!msg.rows.length) return res.status(404).json({ error: 'Mensaje no encontrado.' });

    const member = await query(
      `SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2 AND status='active'`,
      [msg.rows[0].project_id, req.user.id]
    );
    if (!member.rows.length) return res.status(403).json({ error: 'Sin acceso.' });

    const msgIdText = String(req.params.id);
    const existing = await query(
      'SELECT id FROM message_reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
      [msgIdText, req.user.id, emoji]
    );

    if (existing.rows.length) {
      await query('DELETE FROM message_reactions WHERE id=$1', [existing.rows[0].id]);
    } else {
      await query(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1,$2,$3)',
        [msgIdText, req.user.id, emoji]
      );
    }

    const reactions = await getReactions(msgIdText);

    const io = req.app.get('io');
    io?.to(`project:${msg.rows[0].project_id}`).emit('chat:message_reaction', {
      messageId: msgIdText,
      reactions,
    });

    res.json({ reactions });
  } catch (err) {
    console.error('[chat] REACTION error:', err);
    res.status(500).json({ error: 'Error al reaccionar al mensaje.' });
  }
});

module.exports = router;
