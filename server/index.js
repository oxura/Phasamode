import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import multer from 'multer';
import fs from 'fs';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Zod Schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const CreateChatSchema = z.object({
  name: z.string().max(100).optional(),
  isGroup: z.boolean().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  description: z.string().max(500).optional(),
});

const MessageSchema = z.object({
  content: z.string().max(5000).optional(),
  messageType: z.enum(['text', 'image', 'video', 'audio', 'file', 'system']).default('text'),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
});

const ReactionSchema = z.object({
  emoji: z.string().max(10), // Allow for multi-char emojis/variations
});

const MuteSchema = z.object({
  muted: z.boolean(),
});

const CallSchema = z.object({
  chatId: z.string().uuid(),
  isVideo: z.boolean().default(false),
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
      'application/pdf', 'application/zip', 'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const clients = new Map();

const broadcastUserStatus = (userId, isOnline) => {
  const message = JSON.stringify({ type: 'user_status', payload: { userId, isOnline } });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const getChatMemberIds = async (chatId) => {
  const result = await pool.query('SELECT user_id FROM chat_members WHERE chat_id = $1', [chatId]);
  return result.rows.map((r) => r.user_id);
};

const broadcastToChat = async (chatId, message, excludeUserId = null) => {
  const memberIds = await getChatMemberIds(chatId);
  memberIds.forEach((user_id) => {
    if (user_id !== excludeUserId && clients.has(user_id)) {
      const client = clients.get(user_id);
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  });
};

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(1008, 'No token');
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    ws.userId = decoded.id;
    clients.set(decoded.id, ws);

    pool.query('UPDATE users SET is_online = true WHERE id = $1', [decoded.id]);
    broadcastUserStatus(decoded.id, true);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        await handleWSMessage(ws, message);
      } catch (e) {
        console.error('WS message error:', e);
      }
    });

    ws.on('close', async () => {
      clients.delete(decoded.id);
      await pool.query('UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1', [decoded.id]);
      broadcastUserStatus(decoded.id, false);
    });
  } catch (e) {
    ws.close(1008, 'Invalid token');
  }
});

const handleWSMessage = async (ws, message) => {
  const { type, payload } = message;

  switch (type) {
    case 'typing': {
      const { chatId } = payload;
      broadcastToChat(chatId, { type: 'typing', payload: { chatId, userId: ws.userId } }, ws.userId);
      break;
    }
    case 'stop_typing': {
      const { chatId } = payload;
      broadcastToChat(chatId, { type: 'stop_typing', payload: { chatId, userId: ws.userId } }, ws.userId);
      break;
    }
    case 'call_offer':
    case 'call_answer':
    case 'call_ice_candidate':
    case 'call_end': {
      const { chatId, targetUserId } = payload;
      if (targetUserId && clients.has(targetUserId)) {
        const client = clients.get(targetUserId);
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: type,
            payload: {
              ...payload,
              senderId: ws.userId
            }
          }));
        }
      } else if (chatId) {
        broadcastToChat(chatId, { type: type, payload: { ...payload, senderId: ws.userId } }, ws.userId);
      }
      break;
    }
    case 'message_deleted': {
      const { chatId, messageId } = payload;
      if (chatId && messageId) {
        broadcastToChat(chatId, { type: 'message_deleted', payload: { chatId, messageId, senderId: ws.userId } }, ws.userId);
      }
      break;
    }
  }
};

// Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = RegisterSchema.parse(req.body);

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, avatar, is_online',
      [email, username, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user, token });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.id, email: user.email, username: user.username, avatar: user.avatar, is_online: user.is_online },
      token,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, avatar, is_online FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Users
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  const { username, avatar } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET username = COALESCE($1, username), avatar = COALESCE($2, avatar) WHERE id = $3 RETURNING id, email, username, avatar, is_online',
      [username, avatar, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/search', authenticateToken, async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query(
      'SELECT id, username, avatar, is_online FROM users WHERE username ILIKE $1 AND id != $2 LIMIT 20',
      [`%${q}%`, req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Chats
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
        cm.muted,
        cm.role,
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar, 'is_online', u.is_online))
           FROM chat_members cm2 
           JOIN users u ON cm2.user_id = u.id 
           WHERE cm2.chat_id = c.id),
          '[]'
        ) as members,
        (SELECT json_build_object('id', m.id, 'content', m.content, 'created_at', m.created_at, 'sender_id', m.sender_id, 'message_type', m.message_type)
         FROM messages m WHERE m.chat_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM chats c
      JOIN chat_members cm ON c.id = cm.chat_id
      WHERE cm.user_id = $1
      ORDER BY c.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chats', authenticateToken, async (req, res) => {
  try {
    const { name, isGroup, memberIds, avatar, description } = CreateChatSchema.parse(req.body);

    const chatResult = await pool.query(
      'INSERT INTO chats (name, is_group, avatar, description, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, isGroup || false, avatar, description, req.user.id]
    );
    const chat = chatResult.rows[0];

    await pool.query(
      'INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)',
      [chat.id, req.user.id, 'admin']
    );

    if (memberIds && memberIds.length > 0) {
      for (const memberId of memberIds) {
        await pool.query(
          'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [chat.id, memberId]
        );
      }
    }

    const fullChat = await pool.query(
      `SELECT c.*, 
        cm.role,
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar, 'is_online', u.is_online))
           FROM chat_members cm2 
           JOIN users u ON cm2.user_id = u.id 
           WHERE cm2.chat_id = c.id),
          '[]'
        ) as members
      FROM chats c 
      LEFT JOIN chat_members cm ON c.id = cm.chat_id AND cm.user_id = $2
      WHERE c.id = $1`,
      [chat.id, req.user.id]
    );

    res.json(fullChat.rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chats/direct', authenticateToken, async (req, res) => {
  const { userId } = req.body;
  try {
    const existingChat = await pool.query(
      `SELECT c.* FROM chats c
       JOIN chat_members cm1 ON c.id = cm1.chat_id
       JOIN chat_members cm2 ON c.id = cm2.chat_id
       WHERE c.is_group = false 
       AND cm1.user_id = $1 
       AND cm2.user_id = $2
AND(SELECT COUNT(*) FROM chat_members WHERE chat_id = c.id) = 2`,
      [req.user.id, userId]
    );

    if (existingChat.rows.length > 0) {
      const fullChat = await pool.query(
        `SELECT c.*,
  cm.role,
  COALESCE(
    (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar, 'is_online', u.is_online))
             FROM chat_members cm2 
             JOIN users u ON cm2.user_id = u.id 
             WHERE cm2.chat_id = c.id),
  '[]'
          ) as members
        FROM chats c 
        LEFT JOIN chat_members cm ON c.id = cm.chat_id AND cm.user_id = $2
        WHERE c.id = $1`,
        [existingChat.rows[0].id, req.user.id]
      );
      return res.json(fullChat.rows[0]);
    }

    const chatResult = await pool.query(
      'INSERT INTO chats (is_group, created_by) VALUES (false, $1) RETURNING *',
      [req.user.id]
    );
    const chat = chatResult.rows[0];

    await pool.query('INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)', [chat.id, req.user.id]);
    await pool.query('INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)', [chat.id, userId]);

    const fullChat = await pool.query(
      `SELECT c.*,
  cm.role,
  COALESCE(
    (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar, 'is_online', u.is_online))
           FROM chat_members cm2 
           JOIN users u ON cm2.user_id = u.id 
           WHERE cm2.chat_id = c.id),
  '[]'
        ) as members
      FROM chats c 
      LEFT JOIN chat_members cm ON c.id = cm.chat_id AND cm.user_id = $2
      WHERE c.id = $1`,
      [chat.id, req.user.id]
    );
    res.json(fullChat.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/chats/:id/mute', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const { muted } = MuteSchema.parse(req.body);
    await pool.query(
      'UPDATE chat_members SET muted = $1 WHERE chat_id = $2 AND user_id = $3',
      [muted, id, req.user.id]
    );
    res.json({ success: true, muted });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chats/:id/invite', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Membership check
  const memberCheck = await pool.query(
    'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
    [id, req.user.id]
  );
  if (memberCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Not a member of this chat' });
  }

  const code = nanoid(6).toUpperCase();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    const result = await pool.query(
      'INSERT INTO chat_invites (chat_id, code, expires_at, created_by) VALUES ($1, $2, $3, $4) RETURNING code',
      [id, code, expiresAt, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/invites/:code/join', authenticateToken, async (req, res) => {
  const { code } = req.params;
  try {
    const inviteResult = await pool.query(
      'SELECT chat_id FROM chat_invites WHERE code = $1 AND expires_at > NOW()',
      [code]
    );
    if (inviteResult.rows.length === 0) return res.status(404).json({ error: 'Invalid or expired invite' });

    const chatId = inviteResult.rows[0].chat_id;
    await pool.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [chatId, req.user.id]
    );

    res.json({ success: true, chatId });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Messages
app.get('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const { limit = 50, before } = req.query;

  try {
    const memberCheck = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }

    let query = `
      SELECT m.*,
      json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar) as sender,
      COALESCE(
        (SELECT json_agg(json_build_object('emoji', r.emoji, 'user_id', r.user_id, 'username', ru.username))
           FROM reactions r
           JOIN users ru ON r.user_id = ru.id
           WHERE r.message_id = m.id),
      '[]'
    ) as reactions,
      EXISTS(SELECT 1 FROM saved_messages sm WHERE sm.message_id = m.id AND sm.user_id = $1) as is_saved
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $2 AND m.deleted_at IS NULL
    `;
    const params = [req.user.id, chatId];

    if (before) {
      query += ` AND m.created_at < $3`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1} `;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json(result.rows.reverse());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType, fileUrl, fileName, fileSize } = MessageSchema.parse(req.body);

    // Membership check
    const memberCheck = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }

    const result = await pool.query(
      'INSERT INTO messages (chat_id, sender_id, content, message_type, file_url, file_name, file_size) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [chatId, req.user.id, content, messageType, fileUrl, fileName, fileSize]
    );

    await pool.query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chatId]);

    const userResult = await pool.query('SELECT id, username, avatar FROM users WHERE id = $1', [req.user.id]);

    const message = {
      ...result.rows[0],
      sender: userResult.rows[0],
      reactions: [],
      is_saved: false
    };

    broadcastToChat(chatId, { type: 'new_message', payload: message });

    res.json(message);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/chats/:id/messages/search', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { q } = req.query;
  try {
    const result = await pool.query(
      `SELECT m.*,
  json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar) as sender
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1 AND m.content ILIKE $2 AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC LIMIT 50`,
      [id, `% ${q}% `]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/chats/:id/messages', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Membership and Admin check
    const memberCheck = await pool.query(
      'SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }

    if (memberCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can clear chat history' });
    }

    await pool.query(
      'UPDATE messages SET deleted_at = NOW() WHERE chat_id = $1',
      [id]
    );
    broadcastToChat(id, { type: 'history_cleared', payload: { chatId: id, userId: req.user.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reactions
app.post('/api/messages/:id/reactions', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { emoji } = ReactionSchema.parse(req.body);
    const messageResult = await pool.query('SELECT chat_id FROM messages WHERE id = $1', [id]);
    if (messageResult.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    const chatId = messageResult.rows[0].chat_id;

    // Membership check
    const memberCheck = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }

    await pool.query(
      'INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT (message_id, user_id, emoji) DO NOTHING',
      [id, req.user.id, emoji]
    );

    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);

    broadcastToChat(chatId, {
      type: 'reaction_added',
      payload: { messageId: id, userId: req.user.id, username: userResult.rows[0].username, emoji, chatId }
    });

    res.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/messages/:id/reactions', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { emoji } = ReactionSchema.parse(req.body);
    const messageResult = await pool.query('SELECT chat_id FROM messages WHERE id = $1', [id]);
    if (messageResult.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    const chatId = messageResult.rows[0].chat_id;

    // Membership check
    const memberCheck = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }

    await pool.query(
      'DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [id, req.user.id, emoji]
    );

    broadcastToChat(chatId, {
      type: 'reaction_removed',
      payload: { messageId: id, userId: req.user.id, emoji, chatId }
    });

    res.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Server error' });
  }
});

// Saves
app.post('/api/messages/:id/save', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const messageResult = await pool.query('SELECT chat_id FROM messages WHERE id = $1', [id]);
    if (messageResult.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    const chatId = messageResult.rows[0].chat_id;

    // Membership check
    const memberCheck = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }

    await pool.query(
      'INSERT INTO saved_messages (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/messages/:id/save', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const messageResult = await pool.query('SELECT chat_id FROM messages WHERE id = $1', [id]);
    if (messageResult.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    const chatId = messageResult.rows[0].chat_id;

    // Membership check
    const memberCheck = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }

    await pool.query(
      'DELETE FROM saved_messages WHERE message_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/saves', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*,
  json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar) as sender,
  c.name as chat_name
      FROM saved_messages sm
      JOIN messages m ON sm.message_id = m.id
      JOIN users u ON m.sender_id = u.id
      JOIN chats c ON m.chat_id = c.id
      WHERE sm.user_id = $1
      ORDER BY sm.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Trash
app.get('/api/trash', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*,
  json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar) as sender,
  c.name as chat_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN chats c ON m.chat_id = c.id
      WHERE m.sender_id = $1 AND m.deleted_at IS NOT NULL
      ORDER BY m.deleted_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/messages/:id/restore', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE messages SET deleted_at = NULL WHERE id = $1 AND sender_id = $2',
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/messages/:id/permanent', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'DELETE FROM messages WHERE id = $1 AND sender_id = $2',
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Calls
app.post('/api/calls', authenticateToken, async (req, res) => {
  try {
    const { chatId, isVideo } = CallSchema.parse(req.body);

    // Membership check
    const memberCheck = await pool.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, req.user.id]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }

    const result = await pool.query(
      'INSERT INTO calls (chat_id, initiator_id, is_video) VALUES ($1, $2, $3) RETURNING *',
      [chatId, req.user.id, isVideo]
    );
    const call = result.rows[0];

    await pool.query(
      'INSERT INTO call_participants (call_id, user_id, status) VALUES ($1, $2, $3)',
      [call.id, req.user.id, 'joined']
    );

    broadcastToChat(chatId, { type: 'call_started', payload: { ...call, senderId: req.user.id } });
    res.json(call);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/calls/:id/end', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE calls SET ended_at = NOW(), status = \'ended\' WHERE id = $1 AND initiator_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Call not found or unauthorized' });

    const call = result.rows[0];
    broadcastToChat(call.chat_id, { type: 'call_ended', payload: { callId: id } });
    res.json(call);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Uploads
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const protocol = req.protocol;
  const host = req.get('host');
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename, mimetype: req.file.mimetype });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected');

      try {
        const initSql = fs.readFileSync(join(__dirname, 'init.sql'), 'utf8');
        await pool.query(initSql);
        console.log('Database schema initialized');
      } catch (err) {
        console.error('Failed to initialize database schema:', err);
      }

      break;
    } catch (e) {
      console.log(`Database connection failed, retrying... (${retries} attempts left)`);
      retries--;
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
