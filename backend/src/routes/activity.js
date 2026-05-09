const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

// GET /api/activity?project_id=xxx&limit=30
router.get('/', async (req, res, next) => {
  try {
    const { project_id, limit } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id es requerido.' });

    const { rows } = await query(
      `SELECT af.*, u.name AS user_name, u.avatar_url
       FROM activity_feed af
       JOIN users u ON u.id = af.user_id
       WHERE af.project_id = $1
       ORDER BY af.created_at DESC
       LIMIT $2`,
      [project_id, parseInt(limit) || 30]
    );
    res.json({ activities: rows });
  } catch (err) { next(err); }
});

// GET /api/activity/stats?project_id=xxx
router.get('/stats', async (req, res, next) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id es requerido.' });

    const [assetsRes, tasksRes, membersRes] = await Promise.all([
      query('SELECT COUNT(*) as count FROM assets WHERE project_id = $1', [project_id]),
      query(
        `SELECT status, COUNT(*) as count FROM tasks WHERE project_id = $1 GROUP BY status`,
        [project_id]
      ),
      query('SELECT COUNT(*) as count FROM project_members WHERE project_id = $1 AND status = \'active\'', [project_id]),
    ]);

    const taskStats = { pending: 0, in_progress: 0, review: 0, done: 0 };
    tasksRes.rows.forEach((r) => { taskStats[r.status] = parseInt(r.count); });

    res.json({
      stats: {
        total_assets: parseInt(assetsRes.rows[0].count),
        tasks: taskStats,
        total_tasks: Object.values(taskStats).reduce((a, b) => a + b, 0),
        total_members: parseInt(membersRes.rows[0].count),
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
