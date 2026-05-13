const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// ─── Mounted at /api/projects ────────────────────────────────────────────────
const projectMilestonesRouter = express.Router();
projectMilestonesRouter.use(authenticate);

// GET /api/projects/:projectId/milestones
projectMilestonesRouter.get('/:projectId/milestones', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [projectId, req.user.id]
    );
    if (!perm.length) return res.status(403).json({ error: 'No tienes acceso a este proyecto.' });

    const { rows } = await query(
      `SELECT * FROM milestones WHERE project_id = $1 ORDER BY position ASC, created_at ASC`,
      [projectId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/projects/:projectId/milestones
projectMilestonesRouter.post('/:projectId/milestones', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, due_date, status } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido.' });
    if (name.trim().length < 3) return res.status(400).json({ error: 'El nombre del hito debe tener al menos 3 caracteres.' });
    if (!due_date) return res.status(400).json({ error: 'La fecha límite es requerida.' });

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [projectId, req.user.id]
    );
    if (!perm.length || perm[0].role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permiso para crear hitos.' });
    }

    const { rows: posRow } = await query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM milestones WHERE project_id = $1`,
      [projectId]
    );

    const { rows } = await query(
      `INSERT INTO milestones (project_id, name, description, due_date, status, position, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [projectId, name.trim(), description || null, due_date || null,
       status || 'pendiente', posRow[0].next_pos, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// ─── Mounted at /api/milestones ──────────────────────────────────────────────
const milestonesRouter = express.Router();
milestonesRouter.use(authenticate);

// PATCH /api/milestones/:id
milestonesRouter.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, due_date, status } = req.body;

    const { rows: ms } = await query(`SELECT * FROM milestones WHERE id = $1`, [id]);
    if (!ms.length) return res.status(404).json({ error: 'Hito no encontrado.' });

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [ms[0].project_id, req.user.id]
    );
    if (!perm.length || perm[0].role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permiso para editar hitos.' });
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (name !== undefined)        { fields.push(`name = $${idx++}`);        params.push(name.trim()); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); params.push(description || null); }
    if (due_date !== undefined)    { fields.push(`due_date = $${idx++}`);    params.push(due_date || null); }
    if (status !== undefined)      { fields.push(`status = $${idx++}`);      params.push(status); }

    if (!fields.length) return res.status(400).json({ error: 'Sin cambios.' });

    params.push(id);
    const { rows } = await query(
      `UPDATE milestones SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/milestones/:id
milestonesRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: ms } = await query(`SELECT * FROM milestones WHERE id = $1`, [id]);
    if (!ms.length) return res.status(404).json({ error: 'Hito no encontrado.' });

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [ms[0].project_id, req.user.id]
    );
    if (!perm.length || !['owner', 'admin'].includes(perm[0].role)) {
      return res.status(403).json({ error: 'Solo el owner o admin pueden eliminar hitos.' });
    }

    await query(`DELETE FROM milestones WHERE id = $1`, [id]);
    res.json({ message: 'Hito eliminado.' });
  } catch (err) { next(err); }
});

module.exports = { projectMilestonesRouter, milestonesRouter };
