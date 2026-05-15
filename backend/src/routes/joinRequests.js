const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// ── GET /api/join-requests — IDs de proyectos con solicitud pendiente del usuario
const userRouter = Router();
userRouter.use(authenticate);

userRouter.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT project_id FROM join_requests WHERE user_id = $1 AND status = 'pendiente'`,
      [req.user.id]
    );
    res.json({ projectIds: rows.map(r => r.project_id) });
  } catch (err) { next(err); }
});

// ── Rutas bajo /api/projects/:id/join-requests
const projectRouter = Router();
projectRouter.use(authenticate);

// POST — solicitar unirse
projectRouter.post('/:id/join-requests', async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const { message } = req.body;

    const projectRes = await query(
      'SELECT id, name, owner_id, is_public FROM projects WHERE id = $1',
      [projectId]
    );
    if (!projectRes.rows.length) return res.status(404).json({ error: 'Proyecto no encontrado.' });
    const project = projectRes.rows[0];
    if (!project.is_public)
      return res.status(403).json({ error: 'Solo se puede solicitar unirse a proyectos públicos.' });

    const mem = await query(
      `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [projectId, req.user.id]
    );
    if (mem.rows.length) return res.status(409).json({ error: 'Ya eres miembro de este proyecto.' });

    const existing = await query(
      'SELECT id, status FROM join_requests WHERE project_id = $1 AND user_id = $2',
      [projectId, req.user.id]
    );
    if (existing.rows.length) {
      if (existing.rows[0].status === 'pendiente')
        return res.status(409).json({ error: 'Ya tienes una solicitud pendiente para este proyecto.' });
      await query('DELETE FROM join_requests WHERE id = $1', [existing.rows[0].id]);
    }

    const { rows } = await query(
      `INSERT INTO join_requests (project_id, user_id, message) VALUES ($1, $2, $3) RETURNING *`,
      [projectId, req.user.id, message || null]
    );

    const senderRes = await query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const senderName = senderRes.rows[0]?.name || 'Alguien';

    const notifRes = await query(
      `INSERT INTO notifications (user_id, project_id, type, title, message, data)
       VALUES ($1, $2, 'join_request', $3, $4, $5) RETURNING *`,
      [
        project.owner_id, projectId,
        `Solicitud de unión a ${project.name}`,
        `${senderName} quiere unirse a "${project.name}"`,
        JSON.stringify({ projectId, requestId: rows[0].id, senderId: req.user.id }),
      ]
    );
    const io = req.app.get('io');
    if (io) io.to(`user:${project.owner_id}`).emit('notification', notifRes.rows[0]);

    res.status(201).json({ request: rows[0] });
  } catch (err) { next(err); }
});

// GET — lista de solicitudes pendientes (solo owner/admin)
projectRouter.get('/:id/join-requests', async (req, res, next) => {
  try {
    const { id: projectId } = req.params;

    const mem = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [projectId, req.user.id]
    );
    if (!mem.rows.length || !['owner', 'admin'].includes(mem.rows[0].role))
      return res.status(403).json({ error: 'Sin permiso para ver solicitudes.' });

    const { rows } = await query(
      `SELECT jr.id, jr.message, jr.created_at,
         u.id AS user_id, u.name, u.email, u.avatar_url
       FROM join_requests jr
       JOIN users u ON u.id = jr.user_id
       WHERE jr.project_id = $1 AND jr.status = 'pendiente'
       ORDER BY jr.created_at ASC`,
      [projectId]
    );

    res.json({
      requests: rows.map(r => ({
        id: r.id,
        message: r.message,
        created_at: r.created_at,
        user: { id: r.user_id, name: r.name, email: r.email, avatar_url: r.avatar_url },
      })),
    });
  } catch (err) { next(err); }
});

// PATCH /:requestId — aceptar o rechazar
projectRouter.patch('/:id/join-requests/:requestId', async (req, res, next) => {
  try {
    const { id: projectId, requestId } = req.params;
    const { status } = req.body;

    if (!['aceptado', 'rechazado'].includes(status))
      return res.status(400).json({ error: "Estado inválido. Usa: 'aceptado' o 'rechazado'." });

    const mem = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [projectId, req.user.id]
    );
    if (!mem.rows.length || !['owner', 'admin'].includes(mem.rows[0].role))
      return res.status(403).json({ error: 'Sin permiso.' });

    const reqRes = await query(
      `SELECT * FROM join_requests WHERE id = $1 AND project_id = $2 AND status = 'pendiente'`,
      [requestId, projectId]
    );
    if (!reqRes.rows.length) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    const joinReq = reqRes.rows[0];

    await query(
      'UPDATE join_requests SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, requestId]
    );

    const projectRes = await query('SELECT name FROM projects WHERE id = $1', [projectId]);
    const projectName = projectRes.rows[0]?.name || 'el proyecto';
    const io = req.app.get('io');

    if (status === 'aceptado') {
      await query(
        `INSERT INTO project_members (project_id, user_id, role, status)
         VALUES ($1, $2, 'member', 'active')
         ON CONFLICT (project_id, user_id) DO UPDATE SET status = 'active', role = 'member'`,
        [projectId, joinReq.user_id]
      );

      const notifRes = await query(
        `INSERT INTO notifications (user_id, project_id, type, title, message, data)
         VALUES ($1, $2, 'join_accepted', $3, $4, $5) RETURNING *`,
        [
          joinReq.user_id, projectId,
          'Solicitud aceptada',
          `Tu solicitud para unirte a "${projectName}" fue aceptada`,
          JSON.stringify({ projectId }),
        ]
      );
      if (io) io.to(`user:${joinReq.user_id}`).emit('notification', notifRes.rows[0]);

      const memberRes = await query(
        `SELECT pm.id, pm.role, pm.status, pm.joined_at,
           u.id AS user_id, u.name, u.email, u.avatar_url
         FROM project_members pm
         JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = $1 AND pm.user_id = $2`,
        [projectId, joinReq.user_id]
      );
      return res.json({ status, member: memberRes.rows[0] });
    }

    const notifRes = await query(
      `INSERT INTO notifications (user_id, project_id, type, title, message, data)
       VALUES ($1, $2, 'join_rejected', $3, $4, $5) RETURNING *`,
      [
        joinReq.user_id, projectId,
        'Solicitud rechazada',
        `Tu solicitud para unirte a "${projectName}" fue rechazada`,
        JSON.stringify({ projectId }),
      ]
    );
    if (io) io.to(`user:${joinReq.user_id}`).emit('notification', notifRes.rows[0]);

    res.json({ status });
  } catch (err) { next(err); }
});

module.exports = { projectRouter, userRouter };
