'use strict';

/**
 * Dev runner — boots the hub + every lab together with one command.
 *
 *   npm run dev            # install missing deps, then run hub + all labs
 *   npm run install:all    # just install deps everywhere, then exit
 *
 * Mirrors the hub's auto-discovery (hub/server.js): every labs/<id>/lab.json
 * becomes a running app on its manifest `port`. Drop in a new lab and it joins
 * automatically — nothing here to edit. Zero dependencies (built-in modules only).
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LABS_DIR = path.join(ROOT, 'labs');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// Simple ANSI colors for the log prefixes, cycled per target.
const COLORS = [36, 32, 33, 35, 34, 31, 96, 92, 93, 95]; // cyan, green, yellow, ...
const color = (n, s) => `\x1b[${n}m${s}\x1b[0m`;

/** Build the list of things to run: the hub, then every discovered lab. */
function discoverTargets() {
  const targets = [{ name: 'hub', cwd: path.join(ROOT, 'hub'), port: 3000 }];

  if (fs.existsSync(LABS_DIR)) {
    for (const dirent of fs.readdirSync(LABS_DIR, { withFileTypes: true })) {
      if (!dirent.isDirectory() || dirent.name.startsWith('_')) continue;
      const manifestPath = path.join(LABS_DIR, dirent.name, 'lab.json');
      const appDir = path.join(LABS_DIR, dirent.name, 'app');
      if (!fs.existsSync(manifestPath) || !fs.existsSync(appDir)) continue;
      let manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (err) {
        console.warn(`Skipping ${dirent.name}: invalid lab.json (${err.message})`);
        continue;
      }
      if (!Number.isInteger(manifest.port)) {
        console.warn(`Skipping ${dirent.name}: lab.json has no numeric "port"`);
        continue;
      }
      targets.push({ name: manifest.id || dirent.name, cwd: appDir, port: manifest.port });
    }
  }
  return targets;
}

/** Install deps for a target if its node_modules is missing. */
function ensureDeps(target) {
  if (fs.existsSync(path.join(target.cwd, 'node_modules'))) return;
  console.log(color(33, `[${target.name}] installing dependencies…`));
  const res = spawnSync(npmCmd, ['install'], {
    cwd: target.cwd,
    stdio: 'inherit',
    shell: isWin, // npm.cmd needs a shell on Windows
  });
  if (res.status !== 0) {
    console.error(color(31, `[${target.name}] npm install failed`));
    process.exit(1);
  }
}

function main() {
  const installOnly = process.argv.includes('--install-only');
  const targets = discoverTargets();

  // Bootstrap: install everything that's missing first (sequential, clear logs).
  for (const t of targets) ensureDeps(t);
  if (installOnly) {
    console.log(color(32, '✓ dependencies installed'));
    return;
  }

  const children = [];
  targets.forEach((t, i) => {
    const c = COLORS[i % COLORS.length];
    const prefix = color(c, `[${t.name}]`);
    const child = spawn('node', ['server.js'], {
      cwd: t.cwd,
      env: { ...process.env, PORT: String(t.port) },
    });
    // Prefix every line of the child's output with its label.
    const pipe = (stream, out) => {
      let buf = '';
      stream.on('data', (chunk) => {
        buf += chunk.toString();
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) out.write(`${prefix} ${line}\n`);
      });
      // Flush any trailing newline-less line (e.g. the last line of a stack trace).
      stream.on('end', () => {
        if (buf) out.write(`${prefix} ${buf}\n`);
      });
    };
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);
    // Without this, a failed spawn emits an unhandled 'error' that crashes the runner.
    child.on('error', (err) => console.error(`${prefix} failed to start: ${err.message}`));
    child.on('exit', (code) => console.log(`${prefix} exited (code ${code})`));
    children.push(child);
  });

  console.log(color(32, `\n▶ running ${children.length} processes — open http://localhost:3000  (Ctrl+C to stop)\n`));

  // Tear everything down together on Ctrl+C / termination.
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const c of children) c.kill('SIGTERM');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
