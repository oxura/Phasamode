# Phase Messenger

Real-time messenger application built with React, Node.js, PostgreSQL, and WebSocket.

## Requirements

- Node.js 18+
- npm or bun
- PostgreSQL 16+ (optional for dev; required for production)

## Configuration

Create a `.env` file in the root directory. The following environment variables are required:

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: A strong, random string for JWT signing. **Mandatory**. Application will not start without it.
- `PORT`: Port for the backend server (default: 3001).

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the application

```bash
npm run dev
```

This command starts:
- the frontend dev server (port 5173)
- the backend API/WebSocket server (port 3001)
- a local PostgreSQL instance (auto-started if `DATABASE_URL` is unreachable)

### 3. Open the app

Navigate to `http://localhost:5173`

## Database (dev)

In development, `npm run dev` will bootstrap a local PostgreSQL instance automatically if it cannot connect to the `DATABASE_URL` from `.env`. The embedded database data is stored in `server/.pgdata`.

If you prefer to use your own PostgreSQL server, just set `DATABASE_URL` to a running instance and the dev bootstrap will use it instead.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Server and Client |
| `npm run dev:client` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run db:init` | Initialize database schema |
| `npm run build` | Build for production |

## Production deployment

### Backend (Node + WebSocket)

The backend requires a long-running Node server with WebSocket support and a real PostgreSQL database. It will **not** run on Netlify Functions.

Required env vars:
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT` (optional)
- `CORS_ORIGIN` (comma-separated allowed frontend origins)
- `AUTH_COOKIE_SAMESITE` (optional, `lax` by default; use `none` with HTTPS for cross-site cookies)

### Frontend (Netlify)

This repo includes:
- `netlify.toml` (build command + publish dir)
- `public/_redirects` (SPA routing)

Set Netlify environment variables:
- `VITE_API_URL` (e.g. `https://api.your-domain.com`)
- `VITE_WS_URL` (e.g. `wss://api.your-domain.com`)

## Features

- **Real-time Messaging**: WebSocket-powered chat with delivery status.
- **Group Chats & Invites**: Create groups and share invite links.
- **Audio/Video Calls**: WebRTC-based calls with video support.
- **Reactions & Saves**: React to messages with emojis and save important messages.
- **File Sharing**: Securely upload images, videos, audio, and documents (up to 50MB).
- **Search & History**: Full-text search within chats and history clearing.
- **Trash & Recovery**: Soft-deleted messages can be restored from Trash.
- **Security**: Robust validation using Zod and secure file upload checks.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express, WebSocket (ws)
- **Database**: PostgreSQL
- **Auth**: JWT tokens, bcrypt
