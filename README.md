# Phase Messenger

Real-time messenger application built with React, Node.js, PostgreSQL, and WebSocket.

## Requirements

- Node.js 18+
- PostgreSQL 16+
- npm or bun

## Quick Start

### 1. Setup Database

1. Install and start PostgreSQL.
2. Create a database named `phase_messenger`.
3. Initialize the database schema:
   ```bash
   psql -d phase_messenger -f server/init.sql
   ```
4. Create a `.env` file in the root directory (copy from `.env.example` and adjust `DATABASE_URL`):
   ```env
   DATABASE_URL=postgresql://your_user:your_password@localhost:5432/phase_messenger
   JWT_SECRET=supersecretkey
   PORT=3001
   VITE_API_URL=http://localhost:3001
   VITE_WS_URL=ws://localhost:3001
   ```

### 2. Install dependencies

```bash
npm install
npm run server:install
```

### 3. Start the application

```bash
npm run dev
```

This command will:
- Start the backend server (port 3001)
- Start the frontend dev server (port 5173)

### 4. Open the app

Navigate to `http://localhost:5173`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Server and Client |
| `npm run dev:client` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run build` | Build for production |

## Features

- User registration and authentication (email, username, password)
- Real-time messaging via WebSocket
- Direct messages (1-to-1)
- Group chats
- WebRTC Audio Calls
- File Uploads (Images, Audio)
- Online status indicators
- User search
- Responsive dark theme UI

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express, WebSocket (ws)
- **Database**: PostgreSQL
- **Auth**: JWT tokens, bcrypt
