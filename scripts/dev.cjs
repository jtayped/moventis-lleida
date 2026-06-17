// Loads root .env into process.env (only for keys not already set),
// then runs turbo with the remaining args passed to this script.
// On Vercel, root .env doesn't exist — env vars come from the platform.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    const raw = t.slice(eq + 1).trim();
    const val = /^["'](.*)["']$/.exec(raw)?.[1] ?? raw;
    if (!(key in process.env)) process.env[key] = val;
  }
}

const args = process.argv.slice(2);
execSync(['turbo', 'run', ...args].join(' '), {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
