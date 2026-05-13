const { Router } = require('express');
const { seedDemo } = require('../utils/seedDemo');

const router = Router();

// POST /api/admin/seed-demo
// Ejecuta el seed de datos demo (idempotente — no hace nada si ya existe)
router.post('/seed-demo', async (req, res, next) => {
  try {
    await seedDemo();
    res.json({ message: 'Demo seed ejecutado. usuario: demo@indieforge.com / pass: Demo1234' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
