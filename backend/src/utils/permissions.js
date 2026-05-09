const { query } = require('../config/db');

async function getMemberRole(project_id, user_id) {
  const { rows } = await query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
    [project_id, user_id]
  );
  return rows[0]?.role || null;
}

module.exports = { getMemberRole };
