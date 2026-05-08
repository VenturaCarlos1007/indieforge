const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

// GET /api/search?q=...
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ results: [] });
    }

    const searchTerm = `%${q}%`;
    const userId = req.user.id;
    const results = [];

    // Search Projects (owner or member)
    const projects = await query(`
      SELECT p.id, p.name as title, p.description as subtitle, 'project' as type
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE (p.owner_id = $1 OR pm.user_id = $1)
        AND (p.name ILIKE $2 OR p.description ILIKE $2)
      GROUP BY p.id
      LIMIT 5
    `, [userId, searchTerm]);
    projects.rows.forEach(r => results.push(r));

    // Search Tasks
    const tasks = await query(`
      SELECT t.id, t.title as title, p.name as subtitle, 'task' as type, t.project_id
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE (p.owner_id = $1 OR pm.user_id = $1)
        AND (t.title ILIKE $2 OR t.description ILIKE $2)
      GROUP BY t.id, p.name
      LIMIT 5
    `, [userId, searchTerm]);
    tasks.rows.forEach(r => results.push(r));

    // Search Assets
    const assets = await query(`
      SELECT a.id, a.name as title, p.name as subtitle, 'asset' as type, a.project_id
      FROM assets a
      JOIN projects p ON p.id = a.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE (p.owner_id = $1 OR pm.user_id = $1)
        AND a.name ILIKE $2
      GROUP BY a.id, p.name
      LIMIT 5
    `, [userId, searchTerm]);
    assets.rows.forEach(r => results.push(r));

    // Search Members (users sharing at least one project)
    const members = await query(`
      SELECT DISTINCT u.id, u.name as title, u.email as subtitle, 'member' as type
      FROM users u
      JOIN project_members pm1 ON pm1.user_id = u.id
      JOIN project_members pm2 ON pm2.project_id = pm1.project_id
      WHERE pm2.user_id = $1 AND u.id != $1
        AND (u.name ILIKE $2 OR u.email ILIKE $2)
      LIMIT 5
    `, [userId, searchTerm]);
    members.rows.forEach(r => results.push(r));

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
