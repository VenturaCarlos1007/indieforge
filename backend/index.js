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

const app = express();
const server = http.createServer(app);

// ── Middlewares
app.use(cors({
  origin: [
    'https://indieforge-beryl.vercel.app',
    'https://indieforge-production.up.railway.app', 
    'http://localhost:5173'
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

// ── 404
app.use((_req, res) => { res.status(404).json({ error: 'Ruta no encontrada.' }); });

// ── Error handler
app.use(errorHandler);

// ── Socket.io
const io = initSocket(server);
app.set('io', io);

// ── Cron Jobs
initCronJobs(io);

// ── Migrations (idempotent, run at startup)
async function runMigrations() {
  try {
    await pool.query(`
      ALTER TABLE project_members
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
    `);
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
