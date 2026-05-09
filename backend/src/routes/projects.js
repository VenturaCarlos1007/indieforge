// ─── Project Routes ──────────────────────────────────────────────
const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();

// All project routes require authentication
router.use(authenticate);

// ── GET /api/projects ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, u.name AS owner_name
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = $1 AND pm.status = 'active'
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ projects: rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/projects ───────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del proyecto es requerido.' });
    }

    // Create project
    const { rows } = await query(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || null, req.user.id]
    );

    const project = rows[0];

    // Add creator as owner member
    await query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [project.id, req.user.id]
    );

    // Log activity
    await query(
      `INSERT INTO activity_feed (project_id, user_id, action, resource_type, resource_id)
       VALUES ($1, $2, 'created', 'project', $3)`,
      [project.id, req.user.id, project.id]
    );

    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/projects/:id ────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT p.*, u.name AS owner_name
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       WHERE p.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }

    // Check active membership
    const membership = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este proyecto.' });
    }

    res.json({ project: rows[0], role: membership.rows[0].role });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/projects/:id/stats ──────────────────────────────────
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify active membership
    const membership = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este proyecto.' });
    }

    // 1. tasksCompletedByWeek — last 6 weeks, dense (zeros for empty weeks)
    const tasksCompletedByWeekResult = await query(`
      SELECT
        TO_CHAR(w.week_start, 'DD Mon') AS name,
        COALESCE(COUNT(t.id), 0)::int AS "Completadas"
      FROM generate_series(
        date_trunc('week', NOW() - INTERVAL '5 weeks'),
        date_trunc('week', NOW()),
        '1 week'::interval
      ) AS w(week_start)
      LEFT JOIN tasks t
        ON date_trunc('week', t.created_at) = w.week_start
        AND t.project_id = $1
        AND t.status = 'done'
      GROUP BY w.week_start
      ORDER BY w.week_start ASC
    `, [id]);

    // 2. tasksByStatus
    const tasksByStatusResult = await query(`
      SELECT status as name, count(*)::int as value 
      FROM tasks 
      WHERE project_id = $1 
      GROUP BY status
    `, [id]);
    
    // Map status names
    const statusMap = { 'pending': 'Por Hacer', 'in_progress': 'En Progreso', 'done': 'Completado' };
    const tasksByStatus = tasksByStatusResult.rows.map(r => ({
      name: statusMap[r.name] || r.name,
      value: r.value
    }));

    // 3. activityByDay — last 30 days, dense (zeros for empty days)
    const activityByDayResult = await query(`
      SELECT
        TO_CHAR(d.day, 'DD/MM') AS name,
        COALESCE(COUNT(af.id), 0)::int AS "Actividad"
      FROM generate_series(
        date_trunc('day', NOW() - INTERVAL '29 days'),
        date_trunc('day', NOW()),
        '1 day'::interval
      ) AS d(day)
      LEFT JOIN activity_feed af
        ON date_trunc('day', af.created_at) = d.day
        AND af.project_id = $1
      GROUP BY d.day
      ORDER BY d.day ASC
    `, [id]);

    // 4. Metrics
    const mostActiveAsset = await query(`
      SELECT a.name, count(av.id)::int as val 
      FROM assets a JOIN asset_versions av ON av.asset_id = a.id 
      WHERE a.project_id = $1 GROUP BY a.id ORDER BY val DESC LIMIT 1
    `, [id]);

    const mostProductiveMember = await query(`
      SELECT u.name, count(t.id)::int as val 
      FROM users u 
      JOIN tasks t ON t.created_by = u.id 
      WHERE t.project_id = $1 AND t.status = 'done' 
      GROUP BY u.id ORDER BY val DESC LIMIT 1
    `, [id]);

    const oldestPendingTask = await query(`
      SELECT title, created_at FROM tasks 
      WHERE project_id = $1 AND status != 'done' 
      ORDER BY created_at ASC LIMIT 1
    `, [id]);

    const daysPending = oldestPendingTask.rows.length > 0 
      ? Math.floor((new Date() - new Date(oldestPendingTask.rows[0].created_at)) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      tasksCompletedByWeek: tasksCompletedByWeekResult.rows,
      tasksByStatus,
      activityByDay: activityByDayResult.rows,
      metrics: {
        mostActiveAsset: mostActiveAsset.rows.length ? mostActiveAsset.rows[0].name : 'N/A',
        mostProductiveMember: mostProductiveMember.rows.length ? mostProductiveMember.rows[0].name : 'N/A',
        oldestPendingTask: oldestPendingTask.rows.length 
          ? { title: oldestPendingTask.rows[0].title, days: daysPending }
          : null
      }
    });

  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id — owner o admin pueden editar
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es requerido.' });

    const mem = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );
    if (!mem.rows.length || !['owner', 'admin'].includes(mem.rows[0].role)) {
      return res.status(403).json({ error: 'Solo el propietario o admin puede editar el proyecto.' });
    }

    const { rows } = await query(
      'UPDATE projects SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description ?? null, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    res.json({ project: rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/projects/:id — solo el owner puede eliminar
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const mem = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );
    if (!mem.rows.length || mem.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Solo el propietario puede eliminar el proyecto.' });
    }

    const { rows } = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    res.json({ message: 'Proyecto eliminado correctamente.' });
  } catch (err) { next(err); }
});

module.exports = router;
