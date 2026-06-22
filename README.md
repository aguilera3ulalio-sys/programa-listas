# UAQ Docentes

Sistema de gestión académica para docentes de la **Facultad de Informática de la UAQ**.
Permite administrar clases, alumnos, asistencias, evidencias (calificaciones),
periodos, modelos de evaluación, un calendario semanal y un panel de pendientes.

Desarrollado como proyecto de **servicio social**.

## Tecnologías

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Base de datos:** SQLite (better-sqlite3)

## Requisitos

- Node.js v18 o superior
- npm

## Instalación

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Ejecución

En dos terminales separadas:

```bash
# Terminal 1 — Backend (puerto 3001)
cd backend
npm run dev
```

```bash
# Terminal 2 — Frontend (puerto 5173)
cd frontend
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

## Cuenta de demostración

- **Clave de trabajador:** 12345
- **NIP:** 0000

## Estructura del proyecto

```
programa-listas/
├── backend/
│   ├── db/            # Esquema y migraciones de la base de datos
│   ├── routes/        # Endpoints del API (auth, classes, students, etc.)
│   └── server.js
└── frontend/
    └── src/
        ├── pages/      # Pantallas (Login, Dashboard, ClassView, etc.)
        ├── components/ # Componentes reutilizables (Sidebar, etc.)
        └── context/    # Estado global (autenticación)
```

## Estado del proyecto

En desarrollo activo. Funcionalidades completas: gestión de clases y alumnos,
asistencias, evidencias y calificaciones, rasgos y periodos de evaluación,
calendario, pendientes y ajustes de cuenta.

## Autor

Eulalio Aguilera — Servicio Social, Facultad de Informática, UAQ.
