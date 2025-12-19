import dotenv from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import net from 'net';
import pg from 'pg';
import EmbeddedPostgres from 'embedded-postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const DEFAULT_DATABASE_URL = 'postgresql://phase_user:phase_password@localhost:5432/phase_messenger';

const parseDbUrl = (url) => {
  const parsed = new URL(url);
  return {
    user: decodeURIComponent(parsed.username || 'postgres'),
    password: decodeURIComponent(parsed.password || ''),
    host: parsed.hostname || 'localhost',
    port: parsed.port ? Number(parsed.port) : 5432,
    database: parsed.pathname.replace('/', '') || 'postgres',
  };
};

const isPortFree = (port, host) => new Promise((resolve) => {
  const server = net.createServer();
  server.once('error', () => resolve(false));
  server.once('listening', () => server.close(() => resolve(true)));
  server.listen(port, host);
});

const pickPort = async (preferred, host) => {
  const candidates = [preferred, 55432, 55433];
  for (const port of candidates) {
    if (await isPortFree(port, host)) return port;
  }
  return preferred;
};

const canConnect = async (connectionString) => {
  const { Pool } = pg;
  const pool = new Pool({ connectionString });
  try {
    await pool.query('SELECT 1');
    return null;
  } catch (err) {
    return err;
  } finally {
    await pool.end();
  }
};

const ensureDatabaseExists = async (connectionString) => {
  const parsed = new URL(connectionString);
  const dbName = parsed.pathname.replace('/', '');
  if (!dbName) return null;

  const adminUrl = new URL(connectionString);
  adminUrl.pathname = '/postgres';
  const { Pool } = pg;
  const pool = new Pool({ connectionString: adminUrl.toString() });
  try {
    const exists = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rows.length === 0) {
      const safeName = dbName.replace(/\"/g, '\"\"');
      await pool.query(`CREATE DATABASE "${safeName}"`);
    }
    return null;
  } catch (err) {
    return err;
  } finally {
    await pool.end();
  }
};

const startEmbeddedPostgres = async (config) => {
  const dbDir = join(__dirname, '.pgdata');
  const embedded = new EmbeddedPostgres({
    databaseDir: dbDir,
    port: config.port,
    user: config.user,
    password: config.password,
    persistent: true,
  });

  await embedded.initialise();
  await embedded.start();
  try {
    await embedded.createDatabase(config.database);
  } catch {
    // Database may already exist.
  }

  return embedded;
};

const startServer = (env) => {
  const child = spawn(process.execPath, ['--watch', join(__dirname, 'index.js')], {
    stdio: 'inherit',
    env,
  });
  return child;
};

const run = async () => {
  const baseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const parsed = parseDbUrl(baseUrl);

  let effectiveUrl = baseUrl;
  let embedded = null;

  let connectionError = await canConnect(effectiveUrl);
  if (connectionError) {
    const code = connectionError?.code;
    if (code === '3D000') {
      const createErr = await ensureDatabaseExists(effectiveUrl);
      if (!createErr) {
        connectionError = await canConnect(effectiveUrl);
      }
    }
  }

  if (connectionError) {
    const embeddedHost = 'localhost';
    const port = await pickPort(parsed.port, embeddedHost);
    const embeddedConfig = { ...parsed, port, host: embeddedHost };
    embedded = await startEmbeddedPostgres(embeddedConfig);

    const updated = new URL(baseUrl);
    updated.hostname = embeddedHost;
    updated.port = String(port);
    updated.username = encodeURIComponent(parsed.user);
    updated.password = encodeURIComponent(parsed.password || '');
    updated.pathname = `/${parsed.database}`;
    effectiveUrl = updated.toString();
  }

  const child = startServer({ ...process.env, DATABASE_URL: effectiveUrl });

  const shutdown = async () => {
    child.kill('SIGTERM');
    if (embedded) {
      await embedded.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  child.on('exit', async () => {
    if (embedded) {
      await embedded.stop();
    }
    process.exit(0);
  });
};

run().catch((err) => {
  console.error('Dev bootstrap failed:', err);
  process.exit(1);
});
