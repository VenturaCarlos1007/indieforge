// ─── JWT Authentication Middleware ────────────────────────────────
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Verifies the Bearer token and attaches `req.user` with the
 * authenticated user's id, name, and email.
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB to ensure they still exist
    const { rows } = await query(
      'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Inicia sesión de nuevo.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

module.exports = { authenticate };
