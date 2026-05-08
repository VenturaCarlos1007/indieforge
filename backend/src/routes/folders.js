const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

// GET /api/folders?project_id=xxx&parent_id=xxx
router.get('/', async (req, res, next) => {
  try {
    const { project_id, parent_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id es requerido.' });

    const sql = parent_id
      ? 'SELECT * FROM folders WHERE project_id = $1 AND parent_id = $2 ORDER BY name'
      : 'SELECT * FROM folders WHERE project_id = $1 AND parent_id IS NULL ORDER BY name';
    const params = parent_id ? [project_id, parent_id] : [project_id];

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

    await query(
      `INSERT INTO activity_feed (project_id, user_id, action, resource_type, resource_id)
       VALUES ($1, $2, 'created', 'folder', $3)`,
      [project_id, req.user.id, rows[0].id]
    );

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

// DELETE /api/folders/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM folders WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Carpeta no encontrada.' });
    res.json({ message: 'Carpeta eliminada.' });
  } catch (err) { next(err); }
});

module.exports = router;
