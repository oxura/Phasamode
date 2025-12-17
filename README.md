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
3. Create a `.env` file in the root directory (copy from `.env.example` and adjust `DATABASE_URL`).
4. Initialize the database:
   ```bash
   npm run db:init
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

This command will start both backend server (port 3001) and frontend dev server (port 5173).

### 4. Open the app

Navigate to `http://localhost:5173`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Server and Client |
| `npm run dev:client` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run db:init` | Initialize database schema |
| `npm run build` | Build for production |

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
