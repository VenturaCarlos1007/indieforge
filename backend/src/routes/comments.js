// ─── Comment Routes ──────────────────────────────────────────────
const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('./notifications');

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
      await query(
        `INSERT INTO activity_feed (project_id, user_id, action, resource_type, resource_id)
         VALUES ($1, $2, 'commented', 'comment', $3)`,
        [asset.project_id, req.user.id, rows[0].id]
      );
      
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
    const { resolved } = req.body;
    const { rows } = await query(
      'UPDATE comments SET resolved = $1 WHERE id = $2 RETURNING *',
      [resolved !== undefined ? resolved : true, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Comentario no encontrado.' });
    }

    res.json({ comment: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
