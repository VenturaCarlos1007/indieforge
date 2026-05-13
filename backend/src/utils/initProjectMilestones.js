const { query } = require('../config/db');

const BASE_MILESTONES = [
  { name: 'Prototipo', position: 0 },
  { name: 'Alpha',     position: 1 },
  { name: 'Beta',      position: 2 },
  { name: 'Release',   position: 3 },
];

const ENGINE_MILESTONES = {
  unity:  [{ name: 'Demo Jugable', position: 4 }, { name: 'Gold Master',    position: 5 }],
  unreal: [{ name: 'Demo Jugable', position: 4 }, { name: 'Gold Master',    position: 5 }],
  godot:  [{ name: 'Demo Jugable', position: 4 }, { name: 'Gold Master',    position: 5 }],
  roblox: [{ name: 'Prueba Pública', position: 4 }, { name: 'Lanzamiento',  position: 5 }],
  custom: [],
};

async function initProjectMilestones(projectId, engine, createdBy = null) {
  const extra = ENGINE_MILESTONES[engine] || [];
  const all   = [...BASE_MILESTONES, ...extra];

  if (!all.length) return;

  const placeholders = all.map((_, i) =>
    `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`
  ).join(', ');

  const params = [projectId];
  all.forEach(m => params.push(m.name, m.position, createdBy));

  await query(
    `INSERT INTO milestones (project_id, name, position, created_by) VALUES ${placeholders}`,
    params
  );
}

module.exports = { initProjectMilestones };
