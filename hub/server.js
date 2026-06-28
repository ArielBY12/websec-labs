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

const app = express();
const PORT = process.env.PORT || 3000;
const LABS_DIR = path.join(__dirname, '..', 'labs');

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

  const stats = {
    total: labs.length,
    done: labs.filter((l) => l.status === 'done').length,
    inProgress: labs.filter((l) => l.status === 'in-progress').length,
  };

  res.render('index', { byLevel, stats });
});

app.get('/lab/:id', (req, res) => {
  const lab = loadLabs().find((l) => l.id === req.params.id);
  if (!lab) return res.status(404).send('Unknown lab');
  res.render('lab', { lab });
});

app.listen(PORT, () => {
  console.log(`WebSec Labs hub → http://localhost:${PORT}`);
});
