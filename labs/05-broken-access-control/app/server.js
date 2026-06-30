'use strict';

/**
 * Lab 05 — Broken Access Control
 *
 * One app, many stages. Each file in stages/ adds a stronger (but still
 * bypassable) authorization check than the last — except the final `secure`
 * stage. Stages are auto-discovered: drop in stages/NN-*.js and it mounts itself
 * and appears in the menu.
 *
 *   vulnerable stages → /stage/<n>
 *   secure stage      → /fixed
 *   menu              → /
 *
 * DB-backed (like 01-sqli / 03-idor): the initialized sql.js module is handed to
 * each stage, which seeds its OWN database (no state shared between stages).
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { page } = require('./shared');

const manifest = require('../lab.json');
const app = express();
const PORT = process.env.PORT || manifest.port || 4005;
app.use(express.urlencoded({ extended: false }));

const STAGES_DIR = path.join(__dirname, 'stages');

// 1) DISCOVER: read every stages/NN-slug.js, sorted by stage number.
const stages = fs
  .readdirSync(STAGES_DIR)
  .filter((f) => /^\d+-.+\.js$/.test(f))
  .map((f) => ({ ...require(path.join(STAGES_DIR, f)), filePath: path.join(STAGES_DIR, f) }))
  .sort((a, b) => a.stage - b.stage);

// 2) MOUNT PATH: vulnerable → /stage/<n>, secure → /fixed.
for (const s of stages) s.mount = s.status === 'secure' ? '/fixed' : `/stage/${s.stage}`;

// 3) NAV DATA: a slim list every page uses to render the stage switcher.
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
     <p>You're logged in as <strong>alice</strong> (role <code>user</code>). Each stage adds a
     stronger (but still bypassable) authorization check — until the fixed version. Open a
     stage, read its source, and try to reach the admin panel.</p>
     <ul style="line-height:2.2">${items}</ul>`
  );
}

// 4) WIRE UP: once sql.js is ready, build each stage's ctx and mount its router.
initSqlJs().then((SQL) => {
  for (const s of stages) {
    const ctx = {
      stage: s.stage, slug: s.slug, title: s.title, defense: s.defense,
      hint: s.hint, explanation: s.explanation, status: s.status,
      mount: s.mount, filePath: s.filePath, allStages,
      goal: manifest.goal, goalSecure: manifest.goalSecure,
    };
    if (s.status === 'secure') {
      ctx.recap = { rootCause: manifest.rootCause, lessons: manifest.lessons };
    }
    app.use(s.mount, s.createRouter(SQL, ctx));
  }

  app.get('/', (req, res) => res.send(renderMenu()));

  app.listen(PORT, () =>
    console.log(`🛡️  Lab 05 Broken Access Control → http://localhost:${PORT}  (${stages.length} stages)`)
  );
});
