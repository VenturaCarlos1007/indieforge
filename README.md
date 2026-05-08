# 🎮 IndieForge

**Plataforma colaborativa para desarrollo de videojuegos indie.**

IndieForge permite a equipos de desarrollo indie organizar sus proyectos, gestionar assets con versionado, asignar tareas, comentar en tiempo real y mantener un registro de actividad de todo el equipo.

---

## 🏗️ Stack Tecnológico

| Capa       | Tecnología                         |
|------------|------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS     |
| Backend    | Node.js + Express                  |
| Base de datos | PostgreSQL (compatible con Railway) |
| Auth       | JWT + bcrypt                       |
| Tiempo real | Socket.io                         |

---

## 📁 Estructura del Proyecto

```
indieforge-project/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # Pool de conexiones PostgreSQL
│   │   ├── middleware/
│   │   │   ├── auth.js            # Middleware JWT
│   │   │   └── errorHandler.js    # Manejador global de errores
│   │   ├── routes/
│   │   │   ├── auth.js            # /api/auth (login, register, me)
│   │   │   ├── projects.js        # /api/projects (CRUD)
│   │   │   ├── assets.js          # /api/assets (CRUD)
│   │   │   ├── tasks.js           # /api/tasks (CRUD + status)
│   │   │   └── comments.js        # /api/comments (CRUD + resolve)
│   │   └── socket/
│   │       └── index.js           # Configuración Socket.io
│   ├── sql/
│   │   └── schema.sql             # Script completo de 10 tablas
│   ├── index.js                   # Entry point del servidor
│   ├── .env.example               # Variables de entorno
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── Layout.jsx
│   │   │       └── Sidebar.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Contexto de autenticación
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── DashboardPage.jsx
│   │   ├── services/
│   │   │   ├── api.js             # Axios con interceptores JWT
│   │   │   └── socket.js          # Cliente Socket.io
│   │   ├── App.jsx                # Rutas principales
│   │   ├── main.jsx               # Entry point React
│   │   └── index.css              # Estilos globales + Tailwind
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Cómo ejecutar el proyecto localmente

### Prerrequisitos

- **Node.js** v18 o superior
- **PostgreSQL** v14 o superior (local o en Railway)
- **npm** v9 o superior

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/indieforge-project.git
cd indieforge-project
```

### 2. Configurar la base de datos

Ejecuta el script SQL para crear las tablas:

```bash
psql -U postgres -d indieforge -f backend/sql/schema.sql
```

> Si usas **Railway**, copia la `DATABASE_URL` que te proporciona Railway y pégala en tu archivo `.env`.

### 3. Configurar el backend

```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL y un JWT_SECRET seguro
npm install
npm run dev
```

El servidor arrancará en **http://localhost:4000**.

### 4. Configurar el frontend

```bash
cd frontend
npm install
npm run dev
```

La app arrancará en **http://localhost:5173**.

> El frontend tiene un proxy configurado en `vite.config.js` que redirige las peticiones `/api/*` y `/socket.io/*` al backend automáticamente.

---

## 🗄️ Base de Datos

El esquema completo está en `backend/sql/schema.sql` e incluye **10 tablas**:

| Tabla              | Descripción                                      |
|--------------------|--------------------------------------------------|
| `users`            | Usuarios de la plataforma                        |
| `projects`         | Proyectos de videojuegos                         |
| `project_members`  | Relación usuarios ↔ proyectos con roles          |
| `folders`          | Carpetas para organizar assets (anidables)       |
| `assets`           | Archivos del proyecto (imágenes, audio, modelos) |
| `asset_versions`   | Historial de versiones de cada asset             |
| `tasks`            | Tareas del proyecto (kanban-style)               |
| `task_assignments` | Asignación de tareas a usuarios                  |
| `comments`         | Comentarios en assets (con hilos)                |
| `activity_feed`    | Registro de actividad del proyecto               |

Todas las tablas usan **UUID** como primary key.

---

## 🔌 API Endpoints

### Autenticación
| Método | Ruta              | Descripción         |
|--------|--------------------|---------------------|
| POST   | `/api/auth/register` | Crear cuenta       |
| POST   | `/api/auth/login`    | Iniciar sesión     |
| GET    | `/api/auth/me`       | Usuario actual     |

### Proyectos (requiere auth)
| Método | Ruta                | Descripción            |
|--------|---------------------|------------------------|
| GET    | `/api/projects`     | Listar mis proyectos   |
| POST   | `/api/projects`     | Crear proyecto         |
| GET    | `/api/projects/:id` | Detalle de proyecto    |

### Assets (requiere auth)
| Método | Ruta           | Descripción        |
|--------|----------------|---------------------|
| GET    | `/api/assets`  | Listar assets       |
| POST   | `/api/assets`  | Crear asset         |

### Tareas (requiere auth)
| Método | Ruta                     | Descripción           |
|--------|--------------------------|-----------------------|
| GET    | `/api/tasks`             | Listar tareas         |
| POST   | `/api/tasks`             | Crear tarea           |
| PATCH  | `/api/tasks/:id/status`  | Cambiar estado        |

### Comentarios (requiere auth)
| Método | Ruta                        | Descripción           |
|--------|-----------------------------|-----------------------|
| GET    | `/api/comments`             | Listar comentarios    |
| POST   | `/api/comments`             | Crear comentario      |
| PATCH  | `/api/comments/:id/resolve` | Resolver comentario   |

### Health Check
| Método | Ruta           | Descripción               |
|--------|----------------|---------------------------|
| GET    | `/api/health`  | Estado del servidor y BD  |

---

## 🔐 Variables de Entorno

Revisa `backend/.env.example` para la lista completa. Las más importantes:

| Variable       | Descripción                              |
|----------------|------------------------------------------|
| `DATABASE_URL` | URL de conexión PostgreSQL (Railway)     |
| `JWT_SECRET`   | Clave secreta para firmar tokens JWT     |
| `CORS_ORIGIN`  | URL del frontend (default: localhost:5173)|

---

## 📜 Licencia

ISC © IndieForge
