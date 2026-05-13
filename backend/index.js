require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');

const { pool } = require('./src/config/db');
const { errorHandler } = require('./src/middleware/errorHandler');
const { initSocket } = require('./src/socket');
const { initCronJobs } = require('./src/cron/tasks');

// Route modules
const authRoutes     = require('./src/routes/auth');
const projectRoutes  = require('./src/routes/projects');
const assetRoutes    = require('./src/routes/assets');
const taskRoutes     = require('./src/routes/tasks');
const commentRoutes  = require('./src/routes/comments');
const folderRoutes   = require('./src/routes/folders');
const memberRoutes   = require('./src/routes/members');
const activityRoutes = require('./src/routes/activity');
const profileRoutes  = require('./src/routes/profile');
const notificationRoutes = require('./src/routes/notifications').router;
const searchRoutes   = require('./src/routes/search');
const dashboardRoutes = require('./src/routes/dashboard');
const messageRoutes  = require('./src/routes/messages');
const { projectMilestonesRouter, milestonesRouter } = require('./src/routes/milestones');
const adminRoutes    = require('./src/routes/admin');

const app = express();
const server = http.createServer(app);

// ── Middlewares
app.use(cors({
  origin: [
    'https://indieforge-beryl.vercel.app',
    'https://indieforge-production.up.railway.app',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Health check
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── API Routes
app.use('/api/auth',     authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/assets',   assetRoutes);
app.use('/api/tasks',    taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/folders',  folderRoutes);
app.use('/api/members',  memberRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/profile',  profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search',   searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/messages',  messageRoutes);
app.use('/api/projects',  projectMilestonesRouter);
app.use('/api/milestones', milestonesRouter);
app.use('/api/admin',    adminRoutes);

// ── 404
app.use((_req, res) => { res.status(404).json({ error: 'Ruta no encontrada.' }); });

// ── Error handler
app.use(errorHandler);

// ── Socket.io
const io = initSocket(server);
app.set('io', io);

// ── Cron Jobs
initCronJobs(io);

const { initProjectBoards }     = require('./src/utils/initProjectBoards');
const { initProjectMilestones } = require('./src/utils/initProjectMilestones');

// ── Migrations (idempotent, run at startup)
async function runMigrations() {
  try {
    await pool.query(`
      ALTER TABLE project_members
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_messages (
        id          SERIAL PRIMARY KEY,
        project_id  INTEGER NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
        user_id     INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
        content     TEXT    NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS engine VARCHAR(20) NOT NULL DEFAULT 'custom'
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_boards (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name       VARCHAR(150) NOT NULL,
        "order"    INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_project_boards_project ON project_boards(project_id)
    `);
    // ── Boards feature
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations_log (
        name         VARCHAR(100) PRIMARY KEY,
        executed_at  TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
        name            VARCHAR(100) NOT NULL,
        icon            VARCHAR(10) DEFAULT '📋',
        engine_specific BOOLEAN DEFAULT false,
        position        INTEGER DEFAULT 0,
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id) ON DELETE SET NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id)`);

    // ── Profile extended fields
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_engine VARCHAR(20)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(200)`);

    // Backfill: seed boards for existing projects that have none
    const already = await pool.query(`SELECT name FROM migrations_log WHERE name = 'seed_boards_v1'`);
    if (!already.rows.length) {
      const { rows: projects } = await pool.query(`
        SELECT p.id, p.engine FROM projects p
        WHERE NOT EXISTS (SELECT 1 FROM boards b WHERE b.project_id = p.id)
      `);
      for (const p of projects) {
        await initProjectBoards(p.id, p.engine || 'custom');
      }
      await pool.query(`INSERT INTO migrations_log (name) VALUES ('seed_boards_v1') ON CONFLICT DO NOTHING`);
      if (projects.length) console.log(`✅ Boards seeded for ${projects.length} project(s)`);
    }

    // ── Milestones feature
    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
        name        VARCHAR(100) NOT NULL,
        description TEXT,
        due_date    DATE,
        status      VARCHAR(20) DEFAULT 'pendiente'
                      CHECK (status IN ('pendiente', 'en_progreso', 'completado')),
        position    INTEGER DEFAULT 0,
        created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id)`);

    // Backfill: seed milestones for existing projects that have none
    const alreadyMs = await pool.query(`SELECT name FROM migrations_log WHERE name = 'seed_milestones_v1'`);
    if (!alreadyMs.rows.length) {
      const { rows: projectsMs } = await pool.query(`
        SELECT p.id, p.engine FROM projects p
        WHERE NOT EXISTS (SELECT 1 FROM milestones m WHERE m.project_id = p.id)
      `);
      for (const p of projectsMs) {
        await initProjectMilestones(p.id, p.engine || 'custom');
      }
      await pool.query(`INSERT INTO migrations_log (name) VALUES ('seed_milestones_v1') ON CONFLICT DO NOTHING`);
      if (projectsMs.length) console.log(`✅ Milestones seeded for ${projectsMs.length} project(s)`);
    }

    console.log('✅ Migrations OK');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  }
}

// ── Start
const PORT = process.env.PORT || 4000;
runMigrations().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 IndieForge API running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
});
