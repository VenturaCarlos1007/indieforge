const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = Router();
router.use(authenticate);

// GET /api/members?project_id=xxx  — only active members
router.get('/', async (req, res, next) => {
  try {
    const { project_id } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id es requerido.' });

    const { rows } = await query(
      `SELECT pm.id, pm.role, pm.status, pm.joined_at, u.id AS user_id, u.name, u.email, u.avatar_url
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1 AND pm.status = 'active'
       ORDER BY pm.joined_at ASC`,
      [project_id]
    );
    res.json({ members: rows });
  } catch (err) { next(err); }
});

// POST /api/members/invite
router.post('/invite', async (req, res, next) => {
  try {
    const { project_id, email, role } = req.body;
    if (!project_id || !email) return res.status(400).json({ error: 'project_id y email son requeridos.' });

    // Check requester is owner/admin
    const perm = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [project_id, req.user.id]
    );
    if (!perm.rows.length || !['owner', 'admin'].includes(perm.rows[0].role)) {
      return res.status(403).json({ error: 'No tienes permiso para invitar miembros.' });
    }

    // Find target user by email
    const userRes = await query('SELECT id, name, email, avatar_url FROM users WHERE email = $1', [email]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'No se encontró un usuario con ese email.' });
    const targetUser = userRes.rows[0];

    // Check if already member or has pending invitation
    const existing = await query(
      'SELECT id, status FROM project_members WHERE project_id = $1 AND user_id = $2',
      [project_id, targetUser.id]
    );
    if (existing.rows.length > 0) {
      const msg = existing.rows[0].status === 'pending'
        ? 'Este usuario ya tiene una invitación pendiente.'
        : 'Este usuario ya es miembro del proyecto.';
      return res.status(409).json({ error: msg });
    }

    // Get project name and inviter name for notification
    const [projectRes, inviterRes] = await Promise.all([
      query('SELECT name FROM projects WHERE id = $1', [project_id]),
      query('SELECT name FROM users WHERE id = $1', [req.user.id]),
    ]);
    const projectName = projectRes.rows[0]?.name || 'un proyecto';
    const inviterName = inviterRes.rows[0]?.name || 'Alguien';

    // Insert membership with status='pending'
    const { rows } = await query(
      `INSERT INTO project_members (project_id, user_id, role, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [project_id, targetUser.id, role || 'member']
    );
    const membership = rows[0];

    // Create in-app notification
    const notifData = {
      projectId: project_id,
      projectName,
      invitedBy: { id: req.user.id, name: inviterName },
      membershipId: membership.id,
    };
    const notifRes = await query(
      `INSERT INTO notifications (user_id, project_id, type, title, message, data)
       VALUES ($1, $2, 'project_invitation', $3, $4, $5) RETURNING *`,
      [
        targetUser.id,
        project_id,
        `Invitación a ${projectName}`,
        `${inviterName} te ha invitado a unirte a "${projectName}"`,
        JSON.stringify(notifData),
      ]
    );

    // Emit real-time notification to invited user
    const io = req.app.get('io');
    if (io) io.to(`user:${targetUser.id}`).emit('notification', notifRes.rows[0]);

    res.status(201).json({
      member: { ...membership, name: targetUser.name, email: targetUser.email, avatar_url: targetUser.avatar_url, user_id: targetUser.id },
    });
  } catch (err) { next(err); }
});

// PATCH /api/members/:id/accept
router.patch('/:id/accept', async (req, res, next) => {
  try {
    const mem = await query(
      `SELECT * FROM project_members WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (!mem.rows.length) return res.status(404).json({ error: 'Invitación no encontrada.' });

    const { rows } = await query(
      `UPDATE project_members SET status = 'active' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    await query(
      `INSERT INTO activity_feed (project_id, user_id, action, resource_type, resource_id)
       VALUES ($1, $2, 'added_member', 'project', $1)`,
      [mem.rows[0].project_id, req.user.id]
    );

    res.json({ member: rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/members/:id/decline
router.patch('/:id/decline', async (req, res, next) => {
  try {
    const mem = await query(
      `SELECT * FROM project_members WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (!mem.rows.length) return res.status(404).json({ error: 'Invitación no encontrada.' });

    await query('DELETE FROM project_members WHERE id = $1', [req.params.id]);
    res.json({ message: 'Invitación rechazada.' });
  } catch (err) { next(err); }
});

// PATCH /api/members/:id/role
router.patch('/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: `Rol inválido. Usa: ${validRoles.join(', ')}` });

    const mem = await query('SELECT * FROM project_members WHERE id = $1', [req.params.id]);
    if (!mem.rows.length) return res.status(404).json({ error: 'Miembro no encontrado.' });

    const perm = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [mem.rows[0].project_id, req.user.id]
    );
    if (!perm.rows.length || perm.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Solo el propietario puede cambiar roles.' });
    }

    const { rows } = await query('UPDATE project_members SET role = $1 WHERE id = $2 RETURNING *', [role, req.params.id]);
    res.json({ member: rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/members/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const mem = await query('SELECT * FROM project_members WHERE id = $1', [req.params.id]);
    if (!mem.rows.length) return res.status(404).json({ error: 'Miembro no encontrado.' });
    if (mem.rows[0].role === 'owner') return res.status(403).json({ error: 'No puedes eliminar al propietario.' });
    if (mem.rows[0].user_id === req.user.id) return res.status(403).json({ error: 'No puedes eliminarte a ti mismo del proyecto.' });

    const perm = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [mem.rows[0].project_id, req.user.id]
    );
    if (!perm.rows.length || !['owner', 'admin'].includes(perm.rows[0].role)) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar miembros.' });
    }

    await query('DELETE FROM project_members WHERE id = $1', [req.params.id]);
    res.json({ message: 'Miembro eliminado del proyecto.' });
  } catch (err) { next(err); }
});

module.exports = router;
