const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

// GET /api/dashboard/summary
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Tareas asignadas a mí (últimas 5)
    const recentTasksRes = await query(`
      SELECT t.id, t.title, t.status, t.priority, t.due_date, p.id as project_id, p.name as project_name
      FROM tasks t
      JOIN task_assignments ta ON ta.task_id = t.id
      JOIN projects p ON p.id = t.project_id
      WHERE ta.user_id = $1 AND t.status != 'done'
      ORDER BY t.created_at DESC
      LIMIT 5
    `, [userId]);

    // 2. Assets recientes en mis proyectos (últimos 4)
    const recentAssetsRes = await query(`
      SELECT a.id, a.name, a.type, a.current_version, p.id as project_id, p.name as project_name, u.name as uploader_name
      FROM assets a
      JOIN projects p ON p.id = a.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id
      JOIN users u ON u.id = a.uploaded_by
      WHERE (p.owner_id = $1 OR pm.user_id = $1)
      GROUP BY a.id, p.id, u.name
      ORDER BY a.created_at DESC
      LIMIT 4
    `, [userId]);

    // 3. Activity grid (últimos 365 días)
    const activityGridRes = await query(`
      SELECT TO_CHAR(date_trunc('day', af.created_at), 'YYYY-MM-DD') AS date, count(*)::int as count
      FROM activity_feed af
      JOIN projects p ON p.id = af.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE (p.owner_id = $1 OR pm.user_id = $1) AND af.created_at >= NOW() - INTERVAL '365 days'
      GROUP BY date_trunc('day', af.created_at)
      ORDER BY date_trunc('day', af.created_at) ASC
    `, [userId]);

    // 4. Totals for animated counters
    const totalsRes = await query(`
      SELECT 
        (SELECT count(DISTINCT p.id) FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id WHERE p.owner_id = $1 OR pm.user_id = $1) as total_projects,
        (SELECT count(t.id) FROM tasks t JOIN task_assignments ta ON ta.task_id = t.id WHERE ta.user_id = $1) as total_tasks,
        (SELECT count(a.id) FROM assets a JOIN projects p ON p.id = a.project_id LEFT JOIN project_members pm ON pm.project_id = p.id WHERE p.owner_id = $1 OR pm.user_id = $1) as total_assets
    `, [userId]);

    res.json({
      recentTasks: recentTasksRes.rows,
      recentAssets: recentAssetsRes.rows,
      activityGrid: activityGridRes.rows,
      totals: totalsRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
