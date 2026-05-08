const cron = require('node-cron');
const { query } = require('../config/db');

function initCronJobs(io) {
  // Run every hour to check for tasks due in <= 24 hours
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('⏰ Running task deadline check...');
      // Find tasks that are due in exactly or less than 24h, and greater than 23h
      // to avoid spamming the same notification.
      // Better: store a flag or check if it's strictly between 23h and 24h.
      // Alternatively, we look for tasks due between NOW() + 23 hours and NOW() + 24 hours.
      const sql = `
        SELECT t.id, t.title, t.project_id, ta.user_id 
        FROM tasks t
        JOIN task_assignments ta ON ta.task_id = t.id
        WHERE t.due_date IS NOT NULL
          AND t.status != 'done'
          AND t.due_date > NOW() + INTERVAL '23 hours'
          AND t.due_date <= NOW() + INTERVAL '24 hours'
      `;
      const { rows } = await query(sql);

      for (const task of rows) {
        // Create notification
        const { rows: notifs } = await query(
          `INSERT INTO notifications (user_id, project_id, type, title, message, data)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            task.user_id, 
            task.project_id, 
            'warning', 
            'Tarea por vencer', 
            `La tarea "${task.title}" vence en menos de 24 horas.`, 
            { taskId: task.id }
          ]
        );
        
        // Emit via socket
        if (io) {
          io.to(`user:${task.user_id}`).emit('notification', notifs[0]);
        }
      }
    } catch (err) {
      console.error('Error in task cron job:', err);
    }
  });
}

module.exports = { initCronJobs };
