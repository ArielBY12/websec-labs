'use strict';

/**
 * Lab 02 — Reflected XSS
 *
 * One app, many stages. Each file in stages/ adds a stronger (but still
 * bypassable) filter than the last — except the final `secure` stage, which is
 * the correct fix (output encoding). Stages are auto-discovered: drop in a new
 * stages/NN-*.js and it mounts itself and appears in the menu.
 *
 *   vulnerable stages → /stage/<n>
 *   secure stage      → /fixed
 *   menu              → /
 *
 * No database here — the vulnerability is pure output handling — so each stage
 * exports createRouter(ctx) (no SQL handle, unlike the DB-backed 01-sqli lab).
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { page } = require('./shared');

const manifest = require('../lab.json');
const app = express();
const PORT = process.env.PORT || manifest.port || 4002;
app.use(express.urlencoded({ extended: false }));

const STAGES_DIR = path.join(__dirname, 'stages');

// Discover stage modules (NN-slug.js), sorted by stage number.
const stages = fs
  .readdirSync(STAGES_DIR)
  .filter((f) => /^\d+-.+\.js$/.test(f))
  .map((f) => ({ ...require(path.join(STAGES_DIR, f)), filePath: path.join(STAGES_DIR, f) }))
  .sort((a, b) => a.stage - b.stage);

for (const s of stages) s.mount = s.status === 'secure' ? '/fixed' : `/stage/${s.stage}`;
const allStages = stages.map((s) => ({
  stage: s.stage, status: s.status, mount: s.mount,
  title: s.title, defense: s.defense, lesson: s.lesson,
}));

function renderMenu() {
  const items = stages
    .map(
      (s) => `<li>
        <a href="${s.mount}"><strong>${s.status === 'secure' ? '🟢' : '🔴'} Stage ${s.stage} — ${s.title}</strong></a>
        <div class="hint">${s.defense}</div>
      </li>`
    )
    .join('');
  return page(
    manifest.title,
    `<h1>🛡️ ${manifest.title}</h1>
     <p>Each stage adds a stronger (but still bypassable) filter — until the fixed version.
     Open a stage, read its source, and try to get JavaScript to run.</p>
     <ul style="line-height:2.2">${items}</ul>`
  );
}

for (const s of stages) {
  const ctx = {
    stage: s.stage, slug: s.slug, title: s.title, defense: s.defense,
    hint: s.hint, explanation: s.explanation, status: s.status,
    mount: s.mount, filePath: s.filePath, allStages,
  };
  if (s.status === 'secure') {
    ctx.recap = { rootCause: manifest.rootCause, lessons: manifest.lessons };
  }
  app.use(s.mount, s.createRouter(ctx));
}

app.get('/', (req, res) => res.send(renderMenu()));

app.listen(PORT, () =>
  console.log(`🛡️  Lab 02 Reflected XSS → http://localhost:${PORT}  (${stages.length} stages)`)
);
