const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const router = Router();
router.use(authenticate);

// GET /api/folders?project_id=xxx&parent_id=xxx&search=xxx
router.get('/', async (req, res, next) => {
  try {
    const { project_id, parent_id, search } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id es requerido.' });

    let sql, params;
    if (search) {
      sql = 'SELECT * FROM folders WHERE project_id = $1 AND name ILIKE $2 ORDER BY name';
      params = [project_id, `%${search}%`];
    } else if (parent_id) {
      sql = 'SELECT * FROM folders WHERE project_id = $1 AND parent_id = $2 ORDER BY name';
      params = [project_id, parent_id];
    } else {
      sql = 'SELECT * FROM folders WHERE project_id = $1 AND parent_id IS NULL ORDER BY name';
      params = [project_id];
    }

    const { rows } = await query(sql, params);
    res.json({ folders: rows });
  } catch (err) { next(err); }
});

// POST /api/folders
router.post('/', async (req, res, next) => {
  try {
    const { project_id, parent_id, name } = req.body;
    if (!project_id || !name) return res.status(400).json({ error: 'project_id y name son requeridos.' });

    const { rows } = await query(
      'INSERT INTO folders (project_id, parent_id, name) VALUES ($1, $2, $3) RETURNING *',
      [project_id, parent_id || null, name]
    );

    await logActivity(req, project_id, req.user.id, 'created', 'folder', rows[0].id);

    res.status(201).json({ folder: rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/folders/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    const { rows } = await query('UPDATE folders SET name = $1 WHERE id = $2 RETURNING *', [name, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Carpeta no encontrada.' });
    res.json({ folder: rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/folders/:id — solo owner o admin
router.delete('/:id', async (req, res, next) => {
  try {
    const folderRes = await query('SELECT project_id FROM folders WHERE id = $1', [req.params.id]);
    if (!folderRes.rows.length) return res.status(404).json({ error: 'Carpeta no encontrada.' });

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [folderRes.rows[0].project_id, req.user.id]
    );
    if (!perm.length || !['owner', 'admin'].includes(perm[0].role)) {
      return res.status(403).json({ error: 'Solo el propietario o admin puede eliminar carpetas.' });
    }

    await query('DELETE FROM folders WHERE id = $1', [req.params.id]);
    res.json({ message: 'Carpeta eliminada.' });
  } catch (err) { next(err); }
});

module.exports = router;
