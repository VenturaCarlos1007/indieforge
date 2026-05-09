// ─── PostgreSQL Connection Pool ───────────────────────────────────
// Uses DATABASE_URL when available (Railway), otherwise falls back
// to individual DB_* env vars for local development.
// ──────────────────────────────────────────────────────────────────

const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'indieforge',
    };

const pool = new Pool({
  ...connectionConfig,
  max: 20,                // max concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log successful connection (only once)
pool.on('connect', () => {
  console.log('📦 New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client', err);
  // Pool handles reconnection automatically; crashing the process is too aggressive
});

/**
 * Helper to run a query against the pool.
 * @param {string} text  - SQL query
 * @param {any[]}  params - Parameterised values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Helper to get a dedicated client for transactions.
 * Remember to call client.release() when done.
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
