const { query } = require('../config/db');

async function logActivity(req, projectId, userId, action, resourceType, resourceId) {
  const { rows } = await query(
    `INSERT INTO activity_feed (project_id, user_id, action, resource_type, resource_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [projectId, userId, action, resourceType, resourceId]
  );
  const activity = rows[0];

  const userRes = await query('SELECT name, avatar_url FROM users WHERE id = $1', [userId]);
  const enriched = {
    ...activity,
    user_name: userRes.rows[0]?.name || '',
    avatar_url: userRes.rows[0]?.avatar_url || null,
  };

  const io = req.app.get('io');
  if (io) io.to(`project:${projectId}`).emit('new_activity', enriched);

  return activity;
}

module.exports = { logActivity };
