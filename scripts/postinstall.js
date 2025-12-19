import { spawnSync } from 'child_process';

const shouldSkip =
  process.env.NETLIFY === 'true' ||
  process.env.SKIP_SERVER_INSTALL === 'true';

if (shouldSkip) {
  console.log('[postinstall] Skipping server dependencies install.');
  process.exit(0);
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCmd, ['run', 'server:install'], { stdio: 'inherit' });

process.exit(result.status ?? 1);
