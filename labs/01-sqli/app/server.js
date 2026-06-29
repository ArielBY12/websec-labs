'use strict';

/**
 * Lab 01 — SQL Injection
 *
 * One app, many stages. Each file in stages/ adds a stronger (but still
 * bypassable) defense than the last — except the final `secure` stage, which
 * is the correct fix. Stages are auto-discovered: drop in a new stages/NN-*.js
 * and it mounts itself and appears in the menu.
 *
 *   vulnerable stages → /stage/<n>
 *   secure stage      → /fixed
 *   menu              → /
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { page } = require('./shared');

const manifest = require('../lab.json');
const app = express();
const PORT = process.env.PORT || manifest.port || 4001;
app.use(express.urlencoded({ extended: false }));

const STAGES_DIR = path.join(__dirname, 'stages');

// Discover stage modules (NN-slug.js), sorted by stage number.
const stages = fs
  .readdirSync(STAGES_DIR)
  .filter((f) => /^\d+-.+\.js$/.test(f))
  .map((f) => {
    const mod = require(path.join(STAGES_DIR, f));
    return { ...mod, filePath: path.join(STAGES_DIR, f) };
  })
  .sort((a, b) => a.stage - b.stage);

// Derive each stage's mount path. Build the shared "allStages" list (used by
// the nav bar) once, so every page links to every sibling stage.
for (const s of stages) {
  s.mount = s.status === 'secure' ? '/fixed' : `/stage/${s.stage}`;
}
// Enriched with title/defense/lesson so the fixed-stage recap can build its table.
const allStages = stages.map((s) => ({
  stage: s.stage,
  status: s.status,
  mount: s.mount,
  title: s.title,
  defense: s.defense,
  lesson: s.lesson,
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
     <p>Each stage adds a stronger (but still bypassable) defense — until the fixed version.
     Open a stage, read its source, and try to bypass it.</p>
     <ul style="line-height:2.2">${items}</ul>`
  );
}

initSqlJs().then((SQL) => {
  for (const s of stages) {
    const ctx = {
      stage: s.stage,
      slug: s.slug,
      title: s.title,
      defense: s.defense,
      hint: s.hint,
      explanation: s.explanation,
      status: s.status,
      mount: s.mount,
      filePath: s.filePath,
      allStages,
      goal: manifest.goal,
      goalSecure: manifest.goalSecure,
    };
    if (s.status === 'secure') {
      ctx.recap = { rootCause: manifest.rootCause, lessons: manifest.lessons };
    }
    app.use(s.mount, s.createRouter(SQL, ctx));
  }

  app.get('/', (req, res) => res.send(renderMenu()));

  app.listen(PORT, () =>
    console.log(`🛡️  Lab 01 SQLi → http://localhost:${PORT}  (${stages.length} stages)`)
  );
});
