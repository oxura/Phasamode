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

const upload = multer({ storage: storage });

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

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

const broadcastUserStatus = (userId, isOnline) => {
  const message = JSON.stringify({ type: 'user_status', payload: { userId, isOnline } });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const broadcastToChat = async (chatId, message, excludeUserId = null) => {
  const result = await pool.query('SELECT user_id FROM chat_members WHERE chat_id = $1', [chatId]);
  result.rows.forEach(({ user_id }) => {
    if (user_id !== excludeUserId && clients.has(user_id)) {
      const client = clients.get(user_id);
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  });
};

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
      // Basic signaling
      const { chatId, targetUserId, sdp, candidate } = payload;
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
         // Broadcast to all in chat if no specific target (e.g. group call start)
         broadcastToChat(chatId, { type: type, payload: { ...payload, senderId: ws.userId } }, ws.userId);
       }
       break;
    }
  }
};

app.post('/api/auth/register', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
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
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
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

app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar, 'is_online', u.is_online))
           FROM chat_members cm2 
           JOIN users u ON cm2.user_id = u.id 
           WHERE cm2.chat_id = c.id),
          '[]'
        ) as members,
        (SELECT json_build_object('id', m.id, 'content', m.content, 'created_at', m.created_at, 'sender_id', m.sender_id, 'message_type', m.message_type)
         FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
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
  const { name, isGroup, memberIds, avatar, description } = req.body;

  try {
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
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar, 'is_online', u.is_online))
           FROM chat_members cm2 
           JOIN users u ON cm2.user_id = u.id 
           WHERE cm2.chat_id = c.id),
          '[]'
        ) as members
      FROM chats c WHERE c.id = $1`,
      [chat.id]
    );

    res.json(fullChat.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

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
        json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar) as sender
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1
    `;
    const params = [chatId];

    if (before) {
      query += ` AND m.created_at < $2`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json(result.rows.reverse());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const { content, messageType = 'text', fileUrl, fileName, fileSize } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO messages (chat_id, sender_id, content, message_type, file_url, file_name, file_size) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [chatId, req.user.id, content, messageType, fileUrl, fileName, fileSize]
    );

    await pool.query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chatId]);

    const userResult = await pool.query('SELECT id, username, avatar FROM users WHERE id = $1', [req.user.id]);

    const message = {
      ...result.rows[0],
      sender: userResult.rows[0],
    };

    broadcastToChat(chatId, { type: 'new_message', payload: message });

    res.json(message);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/chats/:chatId/members', authenticateToken, async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;

  try {
    await pool.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [chatId, userId]
    );
    res.json({ success: true });
  } catch (e) {
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
       AND (SELECT COUNT(*) FROM chat_members WHERE chat_id = c.id) = 2`,
      [req.user.id, userId]
    );

    if (existingChat.rows.length > 0) {
      const fullChat = await pool.query(
        `SELECT c.*, 
          COALESCE(
            (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar, 'is_online', u.is_online))
             FROM chat_members cm2 
             JOIN users u ON cm2.user_id = u.id 
             WHERE cm2.chat_id = c.id),
            '[]'
          ) as members
        FROM chats c WHERE c.id = $1`,
        [existingChat.rows[0].id]
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
        COALESCE(
          (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'avatar', u.avatar, 'is_online', u.is_online))
           FROM chat_members cm2 
           JOIN users u ON cm2.user_id = u.id 
           WHERE cm2.chat_id = c.id),
          '[]'
        ) as members
      FROM chats c WHERE c.id = $1`,
      [chat.id]
    );

    res.json(fullChat.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const protocol = req.protocol;
  const host = req.get('host');
  // In production, you might want to use the public URL
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
