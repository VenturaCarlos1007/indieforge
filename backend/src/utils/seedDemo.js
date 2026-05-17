'use strict';
require('dotenv').config();

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { getClient } = require('../config/db');

const DEMO_EMAIL    = 'demo@cipoteforge.com';
const DEMO_PASSWORD = 'Demo1234';

async function seedDemo() {
  console.log('🚀 Iniciando seed demo...');
  console.log('📦 Conectando a la base de datos...');
  const client = await getClient();
  console.log('✅ Conexión establecida.');

  try {
    // Idempotency check — abort if demo user already exists
    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]
    );
    if (existing.length > 0) {
      console.log('⚠️  Demo seed ya existe. Saltando...');
      return;
    }

    console.log('🔄 Iniciando transacción...');
    await client.query('BEGIN');

    const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const now  = new Date();
    const daysOffset = (n) => {
      const d = new Date(now);
      d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    };
    const minsAgo = (m) => {
      const d = new Date(now);
      d.setMinutes(d.getMinutes() - m);
      return d.toISOString();
    };

    // ── Users ────────────────────────────────────────────────────
    console.log('👤 Creando usuarios demo...');
    const alexId   = uuidv4();
    const mariaId  = uuidv4();
    const carlosId = uuidv4();
    const sofiaId  = uuidv4();

    await client.query(
      `INSERT INTO users (id, name, email, password_hash, bio, favorite_engine, location)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [alexId, 'Alex Studio', 'demo@cipoteforge.com', hash,
       'Desarrollador indie apasionado por los roguelikes y los juegos de plataformas.',
       'unity', 'San Salvador, El Salvador']
    );
    await client.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1,$2,$3,$4)`,
      [mariaId, 'María González', 'maria@indieforge.com', hash]
    );
    await client.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1,$2,$3,$4)`,
      [carlosId, 'Carlos Rivas', 'carlos@indieforge.com', hash]
    );
    await client.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1,$2,$3,$4)`,
      [sofiaId, 'Sofía Martínez', 'sofia@indieforge.com', hash]
    );

    // ── Project ──────────────────────────────────────────────────
    console.log('🎮 Creando proyecto Eclipse Carmesí...');
    const projectId = uuidv4();
    await client.query(
      `INSERT INTO projects (id, name, description, owner_id, engine)
       VALUES ($1,$2,$3,$4,$5)`,
      [projectId, 'Eclipse Carmesí',
       'Roguelite de mazmorras en pixel art con generación procedural, más de 50 enemigos únicos y jefes épicos. Seleccionado para demo en expo indie 2025.',
       alexId, 'unity']
    );

    // ── Memberships ──────────────────────────────────────────────
    console.log('👥 Asignando miembros al proyecto...');
    for (const [uid, role] of [
      [alexId,   'owner'],
      [mariaId,  'admin'],
      [carlosId, 'member'],
      [sofiaId,  'member'],
    ]) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role, status)
         VALUES ($1,$2,$3,'active')`,
        [projectId, uid, role]
      );
    }

    // ── Boards ───────────────────────────────────────────────────
    console.log('📋 Creando boards...');
    const bGameplay  = uuidv4();
    const bBugs      = uuidv4();
    const bArte      = uuidv4();
    const bAudio     = uuidv4();
    const bNiveles   = uuidv4();
    const bBuild     = uuidv4();
    const bMarketing = uuidv4();
    const bEscenas   = uuidv4();
    const bPrefabs   = uuidv4();
    const bScripts   = uuidv4();
    const bBuilds    = uuidv4();

    const boardRows = [
      [bGameplay,  'Tareas de Gameplay',  '🎮', false, 0],
      [bBugs,      'Seguimiento de Bugs', '🐛', false, 1],
      [bArte,      'Pipeline de Arte',    '🎨', false, 2],
      [bAudio,     'Audio',               '🎵', false, 3],
      [bNiveles,   'Diseño de Niveles',   '🗺️', false, 4],
      [bBuild,     'Build y Release',     '🚀', false, 5],
      [bMarketing, 'Marketing',           '📣', false, 6],
      [bEscenas,   'Escenas',             '🎬', true,  7],
      [bPrefabs,   'Prefabs',             '📦', true,  8],
      [bScripts,   'Scripts',             '📝', true,  9],
      [bBuilds,    'Builds',              '⚙️',  true,  10],
    ];
    for (const [id, name, icon, specific, pos] of boardRows) {
      await client.query(
        `INSERT INTO boards (id, project_id, name, icon, engine_specific, position)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, projectId, name, icon, specific, pos]
      );
    }

    // ── Tasks ────────────────────────────────────────────────────
    console.log('📝 Creando tareas y asignaciones...');
    const taskDefs = [
      // board, title, status, priority, assignee
      [bGameplay, 'Implementar sistema de dash del jugador',       'in_progress', 'high',   alexId],
      [bGameplay, 'Balancear stats de enemigos del piso 3',        'pending',     'high',   carlosId],
      [bGameplay, 'Agregar combo de ataques básicos',               'done',        'medium', alexId],
      [bGameplay, 'Sistema de experiencia y niveles',               'pending',     'medium', mariaId],
      [bBugs,     'El jugador atraviesa paredes en esquinas',       'pending',     'high',   carlosId],
      [bBugs,     'El boss del piso 2 se queda atascado',           'in_progress', 'high',   carlosId],
      [bBugs,     'Crash al abrir el inventario con items llenos',  'done',        'high',   alexId],
      [bArte,     'Sprites del enemigo Skeleton Knight',            'in_progress', 'medium', sofiaId],
      [bArte,     'Tileset del bioma de fuego',                     'pending',     'medium', sofiaId],
      [bArte,     'Animaciones de muerte del jugador',              'done',        'low',    sofiaId],
      [bAudio,    'Música de fondo para el piso de hielo',         'pending',     'low',    mariaId],
      [bAudio,    'Efectos de sonido de espadas',                   'done',        'medium', mariaId],
      [bBuild,    'Configurar build para Windows',                  'done',        'high',   alexId],
      [bBuild,    'Subir demo a itch.io',                           'in_progress', 'high',   alexId],
      [bBuild,    'Preparar trailer de Steam',                      'pending',     'medium', mariaId],
    ];

    const taskIdMap = {};
    for (const [boardId, title, status, priority, assignee] of taskDefs) {
      const taskId = uuidv4();
      taskIdMap[title] = taskId;
      await client.query(
        `INSERT INTO tasks (id, project_id, title, status, priority, board_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [taskId, projectId, title, status, priority, boardId, alexId]
      );
      await client.query(
        `INSERT INTO task_assignments (task_id, user_id) VALUES ($1,$2)`,
        [taskId, assignee]
      );
    }

    // ── Milestones ───────────────────────────────────────────────
    console.log('🏁 Creando milestones...');
    const milestoneIdAlpha = uuidv4();
    const milestoneDefs = [
      [uuidv4(),          'Prototipo',    'completado',  daysOffset(-60), 0],
      [milestoneIdAlpha,  'Alpha',        'completado',  daysOffset(-30), 1],
      [uuidv4(),          'Beta',         'en_progreso', daysOffset(14),  2],
      [uuidv4(),          'Demo Jugable', 'en_progreso', daysOffset(30),  3],
      [uuidv4(),          'Gold Master',  'pendiente',   daysOffset(90),  4],
      [uuidv4(),          'Release',      'pendiente',   daysOffset(120), 5],
    ];
    for (const [id, name, status, due_date, pos] of milestoneDefs) {
      await client.query(
        `INSERT INTO milestones (id, project_id, name, status, due_date, position, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, projectId, name, status, due_date, pos, alexId]
      );
    }

    // ── Demo assets (referenced by activity feed) ─────────────────
    console.log('🖼️  Creando assets demo...');
    const assetDashId     = uuidv4();
    const assetSkeletonId = uuidv4();
    const assetTilesetId  = uuidv4();

    for (const [id, uploader, name] of [
      [assetDashId,     alexId,   'player_dash.png'],
      [assetSkeletonId, carlosId, 'skeleton_knight_sprite.png'],
      [assetTilesetId,  sofiaId,  'tileset_fire.png'],
    ]) {
      await client.query(
        `INSERT INTO assets (id, project_id, uploaded_by, name, type)
         VALUES ($1,$2,$3,$4,'image')`,
        [id, projectId, uploader, name]
      );
      await client.query(
        `INSERT INTO asset_versions (asset_id, uploaded_by, version_number, storage_url, size_bytes)
         VALUES ($1,$2,1,'demo://placeholder',0)`,
        [id, uploader]
      );
    }

    // ── Activity feed ────────────────────────────────────────────
    console.log('📰 Generando activity feed...');
    const bossTaskId  = taskIdMap['El boss del piso 2 se queda atascado'];
    const sofiaTaskId = taskIdMap['Animaciones de muerte del jugador'];
    const buildTaskId = taskIdMap['Configurar build para Windows'];
    const tilesTaskId = taskIdMap['Tileset del bioma de fuego'];

    const activityRows = [
      // [userId, action, resource_type, resource_id, timestamp]
      [alexId,   'uploaded',  'asset',     assetDashId,       minsAgo(5)],
      [carlosId, 'created',   'task',      bossTaskId,        minsAgo(60)],
      [sofiaId,  'updated',   'task',      sofiaTaskId,       minsAgo(180)],
      [mariaId,  'commented', 'asset',     assetTilesetId,    minsAgo(300)],
      [alexId,   'updated',   'task',      buildTaskId,       minsAgo(480)],
      [carlosId, 'uploaded',  'asset',     assetSkeletonId,   minsAgo(720)],
      [sofiaId,  'created',   'task',      tilesTaskId,       minsAgo(1440)],
      [mariaId,  'updated',   'milestone', milestoneIdAlpha,  minsAgo(2880)],
      [alexId,   'assigned',  'task',      bossTaskId,        minsAgo(4320)],
      [alexId,   'created',   'project',   projectId,         minsAgo(5760)],
    ];
    for (const [userId, action, resourceType, resourceId, ts] of activityRows) {
      await client.query(
        `INSERT INTO activity_feed (project_id, user_id, action, resource_type, resource_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [projectId, userId, action, resourceType, resourceId, ts]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Demo seed completado — usuario: demo@cipoteforge.com / pass: Demo1234');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error en demo seed:', err.message);
    console.error(err.stack);
    throw err;
  } finally {
    client.release();
  }
}

// Run as standalone script: node src/utils/seedDemo.js
if (require.main === module) {
  seedDemo()
    .then(() => {
      console.log('🎉 Seed demo finalizado exitosamente.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💀 Seed demo falló. Abortando.');
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedDemo };
