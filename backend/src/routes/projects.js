// ─── Project Routes ──────────────────────────────────────────────
const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { initProjectBoards }     = require('../utils/initProjectBoards');
const { initProjectMilestones } = require('../utils/initProjectMilestones');

const router = Router();

// ── GET /api/projects/explore (público, sin autenticación) ───────
router.get('/explore', async (req, res, next) => {
  try {
    const { name, engine } = req.query;
    const params = [];
    let conditions = 'WHERE p.is_public = true';

    if (name) {
      params.push(`%${name}%`);
      conditions += ` AND p.name ILIKE $${params.length}`;
    }
    if (engine && engine !== 'all' && ['unity', 'unreal', 'godot', 'roblox', 'custom'].includes(engine)) {
      params.push(engine);
      conditions += ` AND p.engine = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT p.id, p.name, p.description, p.engine, p.created_at,
        u.name AS owner_name,
        (SELECT COUNT(*)::int FROM project_members WHERE project_id = p.id AND status = 'active') AS member_count
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       ${conditions}
       ORDER BY p.created_at DESC
       LIMIT 50`,
      params
    );
    res.json({ projects: rows });
  } catch (err) {
    next(err);
  }
});

// All project routes require authentication
router.use(authenticate);

// ── GET /api/projects ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, u.name AS owner_name,
        (SELECT COUNT(*)::int FROM project_members WHERE project_id = p.id AND status = 'active') AS member_count,
        (SELECT json_agg(sub ORDER BY sub.joined_at ASC) FROM (
          SELECT u2.name, u2.avatar_url, pm2.joined_at
          FROM project_members pm2
          JOIN users u2 ON u2.id = pm2.user_id
          WHERE pm2.project_id = p.id AND pm2.status = 'active'
          ORDER BY pm2.joined_at ASC LIMIT 3
        ) sub) AS members_preview
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
const VALID_ENGINES = ['unity', 'unreal', 'godot', 'roblox', 'custom'];
const BASE_BOARDS = [
  'Tareas de Gameplay', 'Seguimiento de Bugs', 'Pipeline de Arte', 'Audio',
  'Diseño de Niveles', 'Build y Release', 'Marketing',
];
const ENGINE_BOARDS = {
  unity:  ['Escenas', 'Prefabs', 'Scripts', 'Builds'],
  unreal: ['Sistemas Blueprint', 'Sistemas C++', 'Niveles', 'Shaders / Materiales'],
  godot:  ['Escenas', 'Scripts', 'Shaders', 'Plugins'],
  roblox: ['Scripts de Gameplay', 'Construcción de Mapas', 'Monetización', 'Live Ops'],
  custom: [],
};

router.post('/', async (req, res, next) => {
  try {
    const { name, description, engine, is_public } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del proyecto es requerido.' });
    }
    if (name.trim().length < 3) {
      return res.status(400).json({ error: 'El nombre del proyecto debe tener al menos 3 caracteres.' });
    }

    const safeEngine = VALID_ENGINES.includes(engine) ? engine : 'custom';

    const { rows } = await query(
      `INSERT INTO projects (name, description, owner_id, engine, is_public)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || null, req.user.id, safeEngine, is_public === true]
    );

    const project = rows[0];

    await query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [project.id, req.user.id]
    );

    // Insert default boards for this engine
    const allBoards = [...BASE_BOARDS, ...(ENGINE_BOARDS[safeEngine] || [])];
    if (allBoards.length > 0) {
      const placeholders = allBoards.map((_, i) => `($1, $${i + 2}, ${i})`).join(', ');
      await query(
        `INSERT INTO project_boards (project_id, name, "order") VALUES ${placeholders}`,
        [project.id, ...allBoards]
      );
    }

    await initProjectBoards(project.id, safeEngine);
    await initProjectMilestones(project.id, safeEngine, req.user.id);
    await logActivity(req, project.id, req.user.id, 'created', 'project', project.id);

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

// ── GET /api/projects/:id/boards ────────────────────────────────
router.get('/:id/boards', async (req, res, next) => {
  try {
    const { id } = req.params;
    const mem = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );
    if (!mem.rows.length) return res.status(403).json({ error: 'Sin acceso.' });

    const { rows } = await query(`
      SELECT b.id, b.name, b.icon, b.engine_specific, b.position,
             COUNT(t.id)::int AS "taskCount"
      FROM boards b
      LEFT JOIN tasks t ON t.board_id = b.id
      WHERE b.project_id = $1
      GROUP BY b.id
      ORDER BY b.position ASC
    `, [id]);

    res.json({ boards: rows });
  } catch (err) { next(err); }
});

// ── GET /api/projects/:id/overview ──────────────────────────────
router.get('/:id/overview', async (req, res, next) => {
  try {
    const { id } = req.params;

    const membership = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este proyecto.' });
    }

    const projectResult = await query(
      `SELECT p.*, u.name AS owner_name FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
      [id]
    );
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado.' });
    }

    const [statsResult, activityResult, urgentResult, assetsResult, membersResult] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND status != 'done')::int         AS active_tasks,
          (SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND status = 'done'
            AND created_at >= NOW() - INTERVAL '7 days')::int                                  AS completed_this_week,
          (SELECT COUNT(*) FROM assets WHERE project_id = $1)::int                             AS total_assets,
          (SELECT COUNT(*) FROM project_members WHERE project_id = $1 AND status = 'active')::int AS total_members
      `, [id]),
      query(`
        SELECT af.*, u.name AS user_name, u.avatar_url
        FROM activity_feed af
        JOIN users u ON u.id = af.user_id
        WHERE af.project_id = $1
        ORDER BY af.created_at DESC LIMIT 6
      `, [id]),
      query(`
        SELECT t.id, t.title, t.status, t.created_at,
          u.name AS assigned_name, u.avatar_url AS assigned_avatar
        FROM tasks t
        LEFT JOIN LATERAL (
          SELECT u2.name, u2.avatar_url
          FROM task_assignments ta
          JOIN users u2 ON u2.id = ta.user_id
          WHERE ta.task_id = t.id
          LIMIT 1
        ) u ON true
        WHERE t.project_id = $1 AND t.status != 'done'
        ORDER BY t.created_at ASC LIMIT 5
      `, [id]),
      query(`
        SELECT a.id, a.name, a.type, a.created_at,
          u.name AS uploaded_by_name, u.avatar_url AS uploaded_by_avatar
        FROM assets a
        JOIN users u ON u.id = a.uploaded_by
        WHERE a.project_id = $1
        ORDER BY a.created_at DESC LIMIT 5
      `, [id]),
      query(`
        SELECT pm.role, pm.joined_at, u.id AS user_id, u.name, u.avatar_url
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = $1 AND pm.status = 'active'
        ORDER BY pm.joined_at ASC
      `, [id]),
    ]);

    res.json({
      project:        projectResult.rows[0],
      stats:          statsResult.rows[0],
      recentActivity: activityResult.rows,
      urgentTasks:    urgentResult.rows,
      recentAssets:   assetsResult.rows,
      members:        membersResult.rows,
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
    const isPublic = typeof req.body.is_public === 'boolean' ? req.body.is_public : undefined;

    if (!name) return res.status(400).json({ error: 'El nombre es requerido.' });

    const mem = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );
    if (!mem.rows.length || !['owner', 'admin'].includes(mem.rows[0].role)) {
      return res.status(403).json({ error: 'Solo el propietario o admin puede editar el proyecto.' });
    }
    if (isPublic !== undefined && mem.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Solo el propietario puede cambiar la visibilidad del proyecto.' });
    }

    if (isPublic === false) {
      const currentRes = await query('SELECT is_public, name FROM projects WHERE id = $1', [id]);
      if (currentRes.rows.length && currentRes.rows[0].is_public === true) {
        const currentName = currentRes.rows[0].name;
        const pendingRes = await query(
          `SELECT id, user_id FROM join_requests WHERE project_id = $1 AND status = 'pendiente'`,
          [id]
        );
        if (pendingRes.rows.length) {
          await query(
            `UPDATE join_requests SET status = 'rechazado', updated_at = NOW() WHERE project_id = $1 AND status = 'pendiente'`,
            [id]
          );
          const io = req.app.get('io');
          for (const r of pendingRes.rows) {
            const notifRes = await query(
              `INSERT INTO notifications (user_id, project_id, type, title, message, data)
               VALUES ($1, $2, 'join_cancelled', $3, $4, $5) RETURNING *`,
              [
                r.user_id, id,
                'Solicitud cancelada',
                `Tu solicitud para unirte a "${currentName}" fue cancelada porque el proyecto se volvió privado`,
                JSON.stringify({ projectId: id }),
              ]
            );
            if (io) io.to(`user:${r.user_id}`).emit('notification', notifRes.rows[0]);
          }
        }
      }
    }

    const { rows } = await query(
      'UPDATE projects SET name = $1, description = $2, is_public = COALESCE($3::boolean, is_public) WHERE id = $4 RETURNING *',
      [name, description ?? null, isPublic ?? null, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    res.json({ project: rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/projects/:id — solo el owner puede cambiar visibilidad
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isPublic = typeof req.body.is_public === 'boolean' ? req.body.is_public : undefined;

    if (isPublic === undefined) {
      return res.status(400).json({ error: 'El campo is_public es requerido.' });
    }

    const mem = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );
    if (!mem.rows.length || mem.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Solo el propietario puede cambiar la visibilidad del proyecto.' });
    }

    if (isPublic === false) {
      const currentRes = await query('SELECT is_public, name FROM projects WHERE id = $1', [id]);
      if (currentRes.rows.length && currentRes.rows[0].is_public === true) {
        const currentName = currentRes.rows[0].name;
        const pendingRes = await query(
          `SELECT id, user_id FROM join_requests WHERE project_id = $1 AND status = 'pendiente'`,
          [id]
        );
        if (pendingRes.rows.length) {
          await query(
            `UPDATE join_requests SET status = 'rechazado', updated_at = NOW() WHERE project_id = $1 AND status = 'pendiente'`,
            [id]
          );
          const io = req.app.get('io');
          for (const r of pendingRes.rows) {
            const notifRes = await query(
              `INSERT INTO notifications (user_id, project_id, type, title, message, data)
               VALUES ($1, $2, 'join_cancelled', $3, $4, $5) RETURNING *`,
              [
                r.user_id, id,
                'Solicitud cancelada',
                `Tu solicitud para unirte a "${currentName}" fue cancelada porque el proyecto se volvió privado`,
                JSON.stringify({ projectId: id }),
              ]
            );
            if (io) io.to(`user:${r.user_id}`).emit('notification', notifRes.rows[0]);
          }
        }
      }
    }

    const { rows } = await query(
      'UPDATE projects SET is_public = $1 WHERE id = $2 RETURNING *',
      [isPublic, id]
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

    const { rows: activeTasks } = await query(
      `SELECT id FROM tasks WHERE project_id = $1 AND status != 'done' LIMIT 1`, [id]
    );
    if (activeTasks.length > 0) {
      return res.status(400).json({ error: 'El proyecto tiene tareas activas. Completálas o eliminalas antes de eliminar el proyecto.' });
    }

    const { rows } = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Proyecto no encontrado.' });

    res.json({ message: 'Proyecto eliminado correctamente.' });
  } catch (err) { next(err); }
});

module.exports = router;
