// ─── Comment Routes ──────────────────────────────────────────────
const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { logActivity } = require('../utils/activity');

const router = Router();
router.use(authenticate);

// ── GET /api/comments?asset_id=xxx ───────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { asset_id } = req.query;

    if (!asset_id) {
      return res.status(400).json({ error: 'asset_id es requerido.' });
    }

    const { rows } = await query(
      `SELECT c.*, u.name AS user_name, u.avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.asset_id = $1
       ORDER BY c.created_at ASC`,
      [asset_id]
    );

    res.json({ comments: rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/comments ───────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { asset_id, content, parent_id } = req.body;

    if (!asset_id || !content) {
      return res.status(400).json({ error: 'asset_id y content son requeridos.' });
    }

    const assetCheck = await query('SELECT project_id FROM assets WHERE id = $1', [asset_id]);
    if (!assetCheck.rows.length) return res.status(404).json({ error: 'Asset no encontrado.' });

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [assetCheck.rows[0].project_id, req.user.id]
    );
    if (!perm.length || perm[0].role === 'viewer') {
      return res.status(403).json({ error: 'Los visualizadores no pueden comentar.' });
    }

    const { rows } = await query(
      `INSERT INTO comments (asset_id, user_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [asset_id, req.user.id, parent_id || null, content]
    );

    // Log activity — fetch project_id from asset
    const assetResult = await query('SELECT project_id, uploaded_by, name FROM assets WHERE id = $1', [asset_id]);
    if (assetResult.rows.length > 0) {
      const asset = assetResult.rows[0];
      await logActivity(req, asset.project_id, req.user.id, 'commented', 'comment', rows[0].id);
      
      // Notify asset owner if it's someone else
      if (asset.uploaded_by && asset.uploaded_by !== req.user.id) {
        await createNotification(
          req,
          asset.uploaded_by,
          asset.project_id,
          'asset_comment',
          'Nuevo comentario',
          `Han comentado en tu asset "${asset.name}"`,
          { assetId: asset_id }
        );
      }
    }

    // Return comment with user info
    const userRes = await query('SELECT name, avatar_url FROM users WHERE id = $1', [req.user.id]);
    const commentWithUser = { ...rows[0], user_name: userRes.rows[0].name, avatar_url: userRes.rows[0].avatar_url };

    res.status(201).json({ comment: commentWithUser });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/comments/:id/resolve ──────────────────────────────
router.patch('/:id/resolve', async (req, res, next) => {
  try {
    const commentCheck = await query(
      'SELECT c.asset_id, a.project_id FROM comments c JOIN assets a ON a.id = c.asset_id WHERE c.id = $1',
      [req.params.id]
    );
    if (!commentCheck.rows.length) return res.status(404).json({ error: 'Comentario no encontrado.' });

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [commentCheck.rows[0].project_id, req.user.id]
    );
    if (!perm.length || perm[0].role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permiso para resolver comentarios.' });
    }

    const { resolved } = req.body;
    const { rows } = await query(
      'UPDATE comments SET resolved = $1 WHERE id = $2 RETURNING *',
      [resolved !== undefined ? resolved : true, req.params.id]
    );

    res.json({ comment: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
