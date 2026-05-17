const { Router } = require('express');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const router = Router();

const GITHUB_CLIENT_ID     = '0v23lij3gQBR9hCwnb51';
const GITHUB_REDIRECT_URI  = 'https://indieforge-production.up.railway.app/api/auth/github/callback';
const FRONTEND_URL         = process.env.FRONTEND_URL || 'https://cipoteforge.vercel.app';

// GET /api/auth/github → redirige a GitHub OAuth
router.get('/github', (_req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=user:email`;
  res.redirect(url);
});

// GET /api/auth/github/callback → intercambia code, crea/encuentra user, genera JWT
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  console.log('🔵 GitHub callback recibido', { code: code ? code.slice(0, 8) + '...' : 'MISSING' });

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=github`);
  }

  try {
    // 1. Intercambiar code por access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('❌ GitHub no devolvió access_token:', tokenData);
      return res.redirect(`${FRONTEND_URL}/login?error=github`);
    }

    const ghHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CipoteForge',
    };

    // 2. Obtener datos del usuario
    const userRes = await fetch('https://api.github.com/user', { headers: ghHeaders });
    const ghUser  = await userRes.json();

    // 3. Obtener email (puede ser null si el usuario lo ocultó)
    let email = ghUser.email || null;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', { headers: ghHeaders });
      const emails    = await emailsRes.json();
      const primary   = Array.isArray(emails) && emails.find(e => e.primary && e.verified);
      email = primary?.email || (Array.isArray(emails) && emails[0]?.email) || null;
    }

    if (!email) {
      console.error('❌ No se pudo obtener email de GitHub para el usuario:', ghUser.login);
      return res.redirect(`${FRONTEND_URL}/login?error=github_no_email`);
    }

    // 4. Buscar o crear usuario en la BD
    const { rows } = await query(
      'SELECT id, name, email, avatar_url FROM users WHERE email = $1',
      [email]
    );

    let user;
    if (rows.length > 0) {
      user = rows[0];
    } else {
      const name      = ghUser.name || ghUser.login || email.split('@')[0];
      const avatarUrl = ghUser.avatar_url || null;

      const { rows: created } = await query(
        `INSERT INTO users (name, email, password_hash, avatar_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, avatar_url, created_at`,
        [name, email, 'github:' + ghUser.id, avatarUrl]
      );
      user = created[0];
      console.log('✅ Usuario creado vía GitHub OAuth:', user.email);
    }

    // 5. Generar JWT y redirigir al frontend
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ GitHub OAuth exitoso para:', user.email);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);

  } catch (err) {
    console.error('❌ Error en GitHub OAuth callback:', err.message);
    res.redirect(`${FRONTEND_URL}/login?error=github`);
  }
});

module.exports = router;
