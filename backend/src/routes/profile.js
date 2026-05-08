const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

// GET /api/profile — datos del usuario + estadísticas
router.get('/', async (req, res, next) => {
  try {
    const userQuery = await query(
      `SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (!userQuery.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const user = userQuery.rows[0];

    // Stats: projects count, tasks assigned count
    const statsQuery = await query(
      `SELECT
        (SELECT COUNT(*) FROM project_members WHERE user_id = $1) AS projects_count,
        (SELECT COUNT(*) FROM task_assignments WHERE user_id = $1) AS tasks_assigned_count`,
      [req.user.id]
    );

    const stats = statsQuery.rows[0];

    res.json({
      user,
      stats: {
        projectsCount: parseInt(stats.projects_count, 10),
        tasksAssignedCount: parseInt(stats.tasks_assigned_count, 10),
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile — actualizar nombre y avatar_url (base64)
router.put('/', async (req, res, next) => {
  try {
    const { name, avatar_url } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido.' });
    }

    const { rows } = await query(
      `UPDATE users SET name = $1, avatar_url = $2 WHERE id = $3 RETURNING id, name, email, avatar_url, created_at`,
      [name, avatar_url || null, req.user.id]
    );

    res.json({ user: rows[0], message: 'Perfil actualizado exitosamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
