# Phase Messenger

Real-time messenger application built with React, Node.js, PostgreSQL, and WebSocket.

## Requirements

- Node.js 18+
- Docker & Docker Compose
- npm or bun

## Quick Start

### 1. Install dependencies

```bash
npm install
npm run server:install
```

### 2. Start the application

```bash
npm run dev
```

This command will:
- Start PostgreSQL in Docker
- Start the backend server (port 3001)
- Start the frontend dev server (port 8080)

### 3. Open the app

Navigate to `http://localhost:8080`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start everything (Docker + Server + Client) |
| `npm run dev:client` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:reset` | Reset database (delete all data) |
| `npm run build` | Build for production |

## Manual Start (Windows)

If the combined `npm run dev` command doesn't work on Windows:

```bash
# Terminal 1: Start database
npm run db:up

# Terminal 2: Start backend
cd server
npm install
npm run dev

# Terminal 3: Start frontend
npm run dev:client
```

## Features

- User registration and authentication (email, username, password)
- Real-time messaging via WebSocket
- Direct messages (1-to-1)
- Group chats
- Online status indicators
- User search
- Responsive dark theme UI

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express, WebSocket (ws)
- **Database**: PostgreSQL
- **Auth**: JWT tokens, bcrypt

## Environment Variables

Create `.env` file in root directory:

```env
DATABASE_URL=postgresql://phase_user:phase_password@localhost:5432/phase_messenger
JWT_SECRET=your_secret_key
PORT=3001
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```
