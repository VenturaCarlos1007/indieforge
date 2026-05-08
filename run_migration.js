const { pool } = require('./backend/src/config/db');

async function migrate() {
  const sql = `
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
    ALTER TABLE asset_versions ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;
  `;

  try {
    await pool.query(sql);
    console.log('Final Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
