const { Router } = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const { logActivity } = require('../utils/activity');

const router = Router();
router.use(authenticate);

// GET /api/tasks?project_id=xxx&status=xxx
router.get('/', async (req, res, next) => {
  try {
    const { project_id, status } = req.query;
    if (!project_id) return res.status(400).json({ error: 'project_id es requerido.' });

    let sql = `
      SELECT t.*, u.name AS creator_name,
        COALESCE(json_agg(json_build_object('id', au.id, 'name', au.name, 'avatar_url', au.avatar_url))
          FILTER (WHERE au.id IS NOT NULL), '[]') AS assignees
      FROM tasks t
      JOIN users u ON u.id = t.created_by
      LEFT JOIN task_assignments ta ON ta.task_id = t.id
      LEFT JOIN users au ON au.id = ta.user_id
      WHERE t.project_id = $1`;
    const params = [project_id];

    if (status) { sql += ' AND t.status = $2'; params.push(status); }
    sql += ' GROUP BY t.id, u.name ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC';

    const { rows } = await query(sql, params);
    res.json({ tasks: rows });
  } catch (err) { next(err); }
});

// POST /api/tasks
router.post('/', async (req, res, next) => {
  try {
    const { project_id, title, description, status, priority, due_date, assignee_ids, board_id } = req.body;
    if (!project_id || !title) return res.status(400).json({ error: 'project_id y title son requeridos.' });
    if (title.trim().length < 3) return res.status(400).json({ error: 'El título debe tener al menos 3 caracteres.' });
    if (due_date) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (due_date < todayStr) return res.status(400).json({ error: 'La fecha límite no puede ser en el pasado.' });
    }

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [project_id, req.user.id]
    );
    if (!perm.length || perm[0].role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permiso para crear tareas.' });
    }

    const { rows } = await query(
      'INSERT INTO tasks (project_id, title, description, status, priority, due_date, created_by, board_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [project_id, title, description || null, status || 'pending', priority || 'medium', due_date || null, req.user.id, board_id || null]
    );
    const task = rows[0];

    if (Array.isArray(assignee_ids) && assignee_ids.length > 0) {
      const values = assignee_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
      await query(`INSERT INTO task_assignments (task_id, user_id) VALUES ${values}`, [task.id, ...assignee_ids]);

      // Create notifications for assignees
      for (const assignee_id of assignee_ids) {
        if (assignee_id !== req.user.id) {
          await createNotification(
            req,
            assignee_id,
            project_id,
            'task_assigned',
            'Nueva tarea asignada',
            `Se te ha asignado la tarea "${title}"`,
            { taskId: task.id }
          );
        }
      }
    }

    await logActivity(req, project_id, req.user.id, 'created', 'task', task.id);

    // Re-fetch with assignees
    const full = await query(
      `SELECT t.*, u.name AS creator_name,
        COALESCE(json_agg(json_build_object('id', au.id, 'name', au.name, 'avatar_url', au.avatar_url))
          FILTER (WHERE au.id IS NOT NULL), '[]') AS assignees
       FROM tasks t JOIN users u ON u.id = t.created_by
       LEFT JOIN task_assignments ta ON ta.task_id = t.id
       LEFT JOIN users au ON au.id = ta.user_id
       WHERE t.id = $1 GROUP BY t.id, u.name`, [task.id]
    );

    res.status(201).json({ task: full.rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, status, priority, due_date, assignee_ids, board_id } = req.body;
    const validStatuses = ['pending', 'in_progress', 'done'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Usa: ${validStatuses.join(', ')}` });
    }

    const existing = await query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const t = existing.rows[0];

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [t.project_id, req.user.id]
    );
    if (!perm.length || perm[0].role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permiso para editar tareas.' });
    }

    if (Array.isArray(assignee_ids) && t.status === 'done') {
      return res.status(400).json({ error: 'No se puede asignar miembros a una tarea completada.' });
    }

    await query(
      'UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, due_date = $5, board_id = $6 WHERE id = $7',
      [title || t.title, description !== undefined ? description : t.description, status || t.status, priority || t.priority, due_date !== undefined ? due_date : t.due_date, board_id !== undefined ? (board_id || null) : t.board_id, req.params.id]
    );

    // Update assignments if provided
    if (Array.isArray(assignee_ids)) {
      const oldAssignments = await query('SELECT user_id FROM task_assignments WHERE task_id = $1', [req.params.id]);
      const oldIds = oldAssignments.rows.map(r => r.user_id);

      await query('DELETE FROM task_assignments WHERE task_id = $1', [req.params.id]);
      if (assignee_ids.length > 0) {
        const values = assignee_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
        await query(`INSERT INTO task_assignments (task_id, user_id) VALUES ${values}`, [req.params.id, ...assignee_ids]);

        // Notify new assignees
        const newIds = assignee_ids.filter(id => !oldIds.includes(id));
        for (const assignee_id of newIds) {
          if (assignee_id !== req.user.id) {
            await createNotification(
              req,
              assignee_id,
              t.project_id,
              'task_assigned',
              'Nueva tarea asignada',
              `Se te ha asignado la tarea "${title || t.title}"`,
              { taskId: req.params.id }
            );
          }
        }
      }
    }

    // Re-fetch
    const full = await query(
      `SELECT t.*, u.name AS creator_name,
        COALESCE(json_agg(json_build_object('id', au.id, 'name', au.name, 'avatar_url', au.avatar_url))
          FILTER (WHERE au.id IS NOT NULL), '[]') AS assignees
       FROM tasks t JOIN users u ON u.id = t.created_by
       LEFT JOIN task_assignments ta ON ta.task_id = t.id
       LEFT JOIN users au ON au.id = ta.user_id
       WHERE t.id = $1 GROUP BY t.id, u.name`, [req.params.id]
    );

    res.json({ task: full.rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Usa: ${validStatuses.join(', ')}` });
    }

    const taskRes = await query('SELECT project_id FROM tasks WHERE id = $1', [req.params.id]);
    if (!taskRes.rows.length) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [taskRes.rows[0].project_id, req.user.id]
    );
    if (!perm.length || perm[0].role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permiso para mover tareas.' });
    }

    if (status === 'done') {
      const { rows: asgn } = await query('SELECT id FROM task_assignments WHERE task_id = $1', [req.params.id]);
      if (!asgn.length) return res.status(400).json({ error: 'Asigná al menos un miembro antes de completar la tarea.' });
    }

    const { rows } = await query('UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
    res.json({ task: rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/tasks/:id/board
router.patch('/:id/board', async (req, res, next) => {
  try {
    const { boardId } = req.body;
    const taskRes = await query('SELECT project_id FROM tasks WHERE id = $1', [req.params.id]);
    if (!taskRes.rows.length) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [taskRes.rows[0].project_id, req.user.id]
    );
    if (!perm.length || perm[0].role === 'viewer') {
      return res.status(403).json({ error: 'Sin permiso.' });
    }

    await query('UPDATE tasks SET board_id = $1 WHERE id = $2', [boardId || null, req.params.id]);
    const full = await query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ task: full.rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const taskRes = await query('SELECT project_id FROM tasks WHERE id = $1', [req.params.id]);
    if (!taskRes.rows.length) return res.status(404).json({ error: 'Tarea no encontrada.' });

    const { rows: perm } = await query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 AND status = 'active'`,
      [taskRes.rows[0].project_id, req.user.id]
    );
    if (!perm.length || perm[0].role === 'viewer') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar tareas.' });
    }

    await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Tarea eliminada.' });
  } catch (err) { next(err); }
});

module.exports = router;
