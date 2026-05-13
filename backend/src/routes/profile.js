const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const bcrypt = require('bcrypt');

const router = Router();
router.use(authenticate);

const VALID_ENGINES = ['unity', 'unreal', 'godot', 'roblox', 'custom'];

const RETURNING = `RETURNING id, name, email, avatar_url, bio, favorite_engine, location, website, created_at`;

// GET /api/profile
router.get('/', async (req, res, next) => {
  try {
    const { rows: userRows } = await query(
      `SELECT id, name, email, avatar_url, bio, favorite_engine, location, website, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!userRows.length) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const { rows: statsRows } = await query(
      `SELECT
        (SELECT COUNT(*) FROM project_members WHERE user_id = $1 AND status = 'active') AS projects_count,
        (SELECT COUNT(*) FROM task_assignments WHERE user_id = $1) AS tasks_assigned_count`,
      [req.user.id]
    );

    const { rows: projects } = await query(
      `SELECT p.id, p.name, p.engine, pm.role, pm.joined_at
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.user_id = $1 AND pm.status = 'active'
       ORDER BY pm.joined_at DESC`,
      [req.user.id]
    );

    res.json({
      user: userRows[0],
      stats: {
        projectsCount:      parseInt(statsRows[0].projects_count, 10),
        tasksAssignedCount: parseInt(statsRows[0].tasks_assigned_count, 10),
      },
      projects,
    });
  } catch (err) { next(err); }
});

// PATCH /api/profile — actualizar campos del perfil
router.patch('/', async (req, res, next) => {
  try {
    const { name, bio, favorite_engine, location, website, avatar_url } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido.' });
    if (name.trim().length < 2) return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    if (website?.trim() && !/^https?:\/\/.+/.test(website.trim())) {
      return res.status(400).json({ error: 'El sitio web debe ser una URL válida (ej. https://miweb.com).' });
    }

    const safeEngine = VALID_ENGINES.includes(favorite_engine) ? favorite_engine : null;

    const { rows } = await query(
      `UPDATE users SET name=$1, bio=$2, favorite_engine=$3, location=$4, website=$5, avatar_url=$6
       WHERE id=$7 ${RETURNING}`,
      [name.trim(), bio || null, safeEngine, location || null, website || null, avatar_url || null, req.user.id]
    );
    res.json({ user: rows[0], message: 'Perfil actualizado.' });
  } catch (err) { next(err); }
});

// PUT /api/profile — mantenido por compatibilidad
router.put('/', async (req, res, next) => {
  try {
    const { name, bio, favorite_engine, location, website, avatar_url } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido.' });
    if (name.trim().length < 2) return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    if (website?.trim() && !/^https?:\/\/.+/.test(website.trim())) {
      return res.status(400).json({ error: 'El sitio web debe ser una URL válida (ej. https://miweb.com).' });
    }

    const safeEngine = VALID_ENGINES.includes(favorite_engine) ? favorite_engine : null;

    const { rows } = await query(
      `UPDATE users SET name=$1, bio=$2, favorite_engine=$3, location=$4, website=$5, avatar_url=$6
       WHERE id=$7 ${RETURNING}`,
      [name.trim(), bio || null, safeEngine, location || null, website || null, avatar_url || null, req.user.id]
    );
    res.json({ user: rows[0], message: 'Perfil actualizado exitosamente.' });
  } catch (err) { next(err); }
});

// PUT /api/profile/password
router.put('/password', async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });

    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) { next(err); }
});

module.exports = router;
