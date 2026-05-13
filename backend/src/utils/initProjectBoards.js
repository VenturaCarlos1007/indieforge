const { query } = require('../config/db');

const BASE_BOARDS = [
  { name: 'Tareas de Gameplay',  icon: '🎮', position: 0 },
  { name: 'Seguimiento de Bugs', icon: '🐛', position: 1 },
  { name: 'Pipeline de Arte',    icon: '🎨', position: 2 },
  { name: 'Audio',               icon: '🎵', position: 3 },
  { name: 'Diseño de Niveles',   icon: '🗺️', position: 4 },
  { name: 'Build y Release',     icon: '🚀', position: 5 },
  { name: 'Marketing',           icon: '📣', position: 6 },
];

const ENGINE_BOARDS = {
  unity: [
    { name: 'Escenas',  icon: '🎬' },
    { name: 'Prefabs',  icon: '📦' },
    { name: 'Scripts',  icon: '📝' },
    { name: 'Builds',   icon: '⚙️' },
  ],
  unreal: [
    { name: 'Sistemas Blueprint', icon: '🔷' },
    { name: 'Sistemas C++',       icon: '⚡' },
    { name: 'Niveles',            icon: '🏔️' },
    { name: 'Shaders/Materiales', icon: '✨' },
  ],
  godot: [
    { name: 'Escenas',  icon: '🎬' },
    { name: 'Scripts',  icon: '📝' },
    { name: 'Shaders',  icon: '✨' },
    { name: 'Plugins',  icon: '🔌' },
  ],
  roblox: [
    { name: 'Scripts de Gameplay',   icon: '📝' },
    { name: 'Construcción de Mapas', icon: '🗺️' },
    { name: 'Monetización',          icon: '💰' },
    { name: 'Live Ops',              icon: '📡' },
  ],
  custom: [],
};

async function initProjectBoards(projectId, engine) {
  const specific = ENGINE_BOARDS[engine] || [];
  const all = [
    ...BASE_BOARDS.map(b => ({ ...b, engine_specific: false })),
    ...specific.map((b, i) => ({ ...b, position: BASE_BOARDS.length + i, engine_specific: true })),
  ];

  if (!all.length) return;

  const placeholders = all.map((_, i) =>
    `($1, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`
  ).join(', ');

  const params = [projectId];
  all.forEach(b => params.push(b.name, b.icon, b.engine_specific, b.position));

  await query(
    `INSERT INTO boards (project_id, name, icon, engine_specific, position) VALUES ${placeholders}`,
    params
  );
}

module.exports = { initProjectBoards };
