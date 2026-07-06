'use strict';

/**
 * WebSec Labs — Hub
 * Auto-discovers every lab by scanning labs/<id>/lab.json and renders a
 * level-grouped dashboard. No database, no per-lab wiring: drop in a new
 * lab.json and it shows up here automatically.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;
const LABS_DIR = path.join(__dirname, '..', 'labs');

/** Short description of what each curriculum level represents (shown on the dashboard). */
const LEVELS = {
  1: { name: 'Basics', blurb: 'First-contact web bugs: injection and direct-access mistakes.' },
  2: { name: 'Auth & Access', blurb: 'Identity, sessions, and authorization — who you are and what you may do.' },
  3: { name: 'Injection+', blurb: 'Untrusted input reaching a dangerous sink — scripts, commands, templates, files, paths.' },
  4: { name: 'Config & Crypto', blurb: 'Insecure defaults, weak cryptography, and over-permissive data binding.' },
  5: { name: 'Advanced', blurb: 'Server-side and protocol-level attacks — SSRF, XXE, deserialization, concurrency, DoS.' },
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

/** Read and validate every labs/<id>/lab.json manifest. */
function loadLabs() {
  if (!fs.existsSync(LABS_DIR)) return [];
  return fs
    .readdirSync(LABS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => path.join(LABS_DIR, d.name, 'lab.json'))
    .filter((p) => fs.existsSync(p))
    .map((p) => {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (err) {
        console.warn(`Skipping invalid manifest: ${p} (${err.message})`);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.level - b.level) || a.id.localeCompare(b.id));
}

app.get('/', (req, res) => {
  const labs = loadLabs();

  const byLevel = labs.reduce((acc, lab) => {
    (acc[lab.level] ??= []).push(lab);
    return acc;
  }, {});

  res.render('index', { byLevel, LEVELS });
});

app.get('/lab/:id', (req, res) => {
  const lab = loadLabs().find((l) => l.id === req.params.id);
  if (!lab) return res.status(404).send('Unknown lab');
  // Derive the host from the request so stage links work from any device on the
  // LAN (a phone can't resolve the server's 'localhost'). req.hostname omits the
  // port — each lab's own port is appended in the view.
  res.render('lab', { lab, host: req.hostname });
});

// Render a lab's writeup (its README.md) as HTML. Resolving the lab through
// loadLabs() means only ids of real, discovered labs are served — so req.params.id
// can't be used for path traversal. The README is authored in-repo (trusted), so
// marked's HTML output is rendered as-is.
app.get('/lab/:id/writeup', (req, res) => {
  const lab = loadLabs().find((l) => l.id === req.params.id);
  if (!lab) return res.status(404).send('Unknown lab');
  const readme = path.join(LABS_DIR, lab.id, 'README.md');
  if (!fs.existsSync(readme)) return res.status(404).send('No writeup for this lab yet');
  const html = marked.parse(fs.readFileSync(readme, 'utf8'));
  res.render('writeup', { lab, html });
});

app.listen(PORT, () => {
  console.log(`WebSec Labs hub → http://localhost:${PORT}`);
});
