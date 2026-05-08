const { Router } = require('express');
const { query, getClient } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

// GET /api/assets?project_id=xxx&folder_id=xxx&search=xxx
router.get('/', async (req, res, next) => {
  try {
    const { project_id, folder_id, search } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id es requerido.' });

    let sql = `SELECT a.*, u.name AS uploader_name FROM assets a JOIN users u ON u.id = a.uploaded_by WHERE a.project_id = $1`;
    const params = [project_id];
    let idx = 2;

    if (folder_id === 'root') {
      sql += ' AND a.folder_id IS NULL';
    } else if (folder_id) {
      sql += ` AND a.folder_id = $${idx}`;
      params.push(folder_id);
      idx++;
    }

    if (search) {
      sql += ` AND a.name ILIKE $${idx}`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ' ORDER BY a.created_at DESC';
    const { rows } = await query(sql, params);
    res.json({ assets: rows });
  } catch (err) { next(err); }
});

// GET /api/assets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.*, u.name AS uploader_name FROM assets a JOIN users u ON u.id = a.uploaded_by WHERE a.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Asset no encontrado.' });
    res.json({ asset: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/assets — auto-version if same name exists
router.post('/', async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { project_id, folder_id, name, type, storage_url, size_bytes } = req.body;
    if (!project_id || !name || !type || !storage_url) {
      return res.status(400).json({ error: 'Campos requeridos: project_id, name, type, storage_url.' });
    }

    // Check if asset with same name exists in same folder
    const existing = await client.query(
      'SELECT id, current_version FROM assets WHERE project_id = $1 AND name = $2 AND (folder_id = $3 OR ($3 IS NULL AND folder_id IS NULL))',
      [project_id, name, folder_id || null]
    );

    let asset;
    if (existing.rows.length > 0) {
      // Auto-version: increment and add new version
      const ex = existing.rows[0];
      const newVer = ex.current_version + 1;
      await client.query('UPDATE assets SET current_version = $1 WHERE id = $2', [newVer, ex.id]);
      await client.query('UPDATE asset_versions SET is_active = FALSE WHERE asset_id = $1', [ex.id]);
      await client.query(
        'INSERT INTO asset_versions (asset_id, uploaded_by, version_number, storage_url, size_bytes) VALUES ($1,$2,$3,$4,$5)',
        [ex.id, req.user.id, newVer, storage_url, size_bytes || 0]
      );
      const updated = await client.query('SELECT a.*, u.name AS uploader_name FROM assets a JOIN users u ON u.id = a.uploaded_by WHERE a.id = $1', [ex.id]);
      asset = updated.rows[0];
    } else {
      // New asset
      const ins = await client.query(
        'INSERT INTO assets (project_id, folder_id, uploaded_by, name, type) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [project_id, folder_id || null, req.user.id, name, type]
      );
      asset = ins.rows[0];
      await client.query(
        'INSERT INTO asset_versions (asset_id, uploaded_by, version_number, storage_url, size_bytes) VALUES ($1,$2,1,$3,$4)',
        [asset.id, req.user.id, storage_url, size_bytes || 0]
      );
    }

    await client.query(
      `INSERT INTO activity_feed (project_id, user_id, action, resource_type, resource_id) VALUES ($1,$2,'uploaded','asset',$3)`,
      [project_id, req.user.id, asset.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ asset });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/assets/:id/versions
router.get('/:id/versions', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT av.*, u.name AS uploader_name FROM asset_versions av JOIN users u ON u.id = av.uploaded_by WHERE av.asset_id = $1 ORDER BY av.version_number DESC`,
      [req.params.id]
    );
    res.json({ versions: rows });
  } catch (err) { next(err); }
});

// POST /api/assets/:id/restore/:versionId
router.post('/:id/restore/:versionId', async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { id, versionId } = req.params;

    const ver = await client.query('SELECT * FROM asset_versions WHERE id = $1 AND asset_id = $2', [versionId, id]);
    if (!ver.rows.length) return res.status(404).json({ error: 'Versión no encontrada.' });

    const asset = await client.query('SELECT current_version FROM assets WHERE id = $1', [id]);
    const newVerNum = asset.rows[0].current_version + 1;

    await client.query('UPDATE asset_versions SET is_active = FALSE WHERE asset_id = $1', [id]);
    const newVer = await client.query(
      'INSERT INTO asset_versions (asset_id, uploaded_by, version_number, storage_url, size_bytes, is_active) VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING *',
      [id, req.user.id, newVerNum, ver.rows[0].storage_url, ver.rows[0].size_bytes]
    );
    await client.query('UPDATE assets SET current_version = $1 WHERE id = $2', [newVerNum, id]);

    await client.query('COMMIT');
    res.json({ message: 'Versión restaurada.', version: newVer.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/assets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM assets WHERE id = $1 RETURNING project_id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Asset no encontrado.' });
    res.json({ message: 'Asset eliminado.' });
  } catch (err) { next(err); }
});

// ── Comments ─────────────────────────────────────────────────────

// GET /api/assets/:id/comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    // Fetch all comments for the asset, we will build the tree on the frontend or backend.
    // Easiest is to just send a flat list ordered by created_at.
    const { rows } = await query(`
      SELECT c.*, u.name AS user_name, u.avatar_url AS user_avatar
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.asset_id = $1
      ORDER BY c.created_at ASC
    `, [req.params.id]);
    res.json({ comments: rows });
  } catch (err) { next(err); }
});

// POST /api/assets/:id/comments
router.post('/:id/comments', async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'El comentario no puede estar vacío.' });

    const { rows } = await query(`
      INSERT INTO comments (asset_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.params.id, req.user.id, content]);
    
    const comment = rows[0];
    
    // Add user details for frontend
    const userRes = await query('SELECT name, avatar_url FROM users WHERE id = $1', [req.user.id]);
    comment.user_name = userRes.rows[0].name;
    comment.user_avatar = userRes.rows[0].avatar_url;

    res.status(201).json({ comment });
  } catch (err) { next(err); }
});

module.exports = router;
