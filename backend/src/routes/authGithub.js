const { Router } = require('express');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const router = Router();

const CLIENT_ID     = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const CALLBACK_URL  = 'https://indieforge-production.up.railway.app/api/auth/github/callback';
const FRONTEND_URL  = process.env.FRONTEND_URL || 'https://cipoteforge.vercel.app';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('⚠️  GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET no configurados — OAuth GitHub deshabilitado');
  module.exports = router;
  return;
}

const { Strategy: GitHubStrategy } = require('passport-github2');
const passport = require('passport');

passport.use('github', new GitHubStrategy({
  clientID:     CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL:  CALLBACK_URL,
  state: false,
}, async (_accessToken, _refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(null, false);

    const { rows } = await query(
      'SELECT id, name, email, avatar_url FROM users WHERE email = $1',
      [email]
    );
    if (rows.length > 0) return done(null, rows[0]);

    const name      = profile.displayName || profile.username || email.split('@')[0];
    const avatarUrl = profile.photos?.[0]?.value || null;

    const { rows: created } = await query(
      `INSERT INTO users (name, email, password_hash, avatar_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, avatar_url, created_at`,
      [name, email, 'github:' + profile.id, avatarUrl]
    );

    return done(null, created[0]);
  } catch (err) {
    return done(err);
  }
}));

router.use(passport.initialize());

router.get('/github', passport.authenticate('github', {
  session: false,
  scope: ['user:email'],
  state: false,
}));

router.get('/github/callback',
  (req, res, next) => {
    console.log('🔵 GitHub callback recibido', req.query);
    next();
  },
  passport.authenticate('github', {
    session: false,
    state: false,
    failureRedirect: `${FRONTEND_URL}/login?error=github`,
  }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

module.exports = router;
