'use strict';

/**
 * Lab 03 — Insecure Direct Object Reference (IDOR)
 *
 * One app, many stages. Each file in stages/ adds a stronger (but still
 * bypassable) access-control guard than the last — except the final `secure`
 * stage, which is the correct fix. Stages are auto-discovered: drop in a new
 * stages/NN-*.js and it mounts itself and appears in the menu.
 *
 *   vulnerable stages → /stage/<n>
 *   secure stage      → /fixed
 *   menu              → /
 *
 * DB-backed (like 01-sqli): the initialized sql.js module is handed to each
 * stage, which seeds its OWN database (no state shared between stages).
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { page } = require('./shared');

const manifest = require('../lab.json');
const app = express();
const PORT = process.env.PORT || manifest.port || 4003;
app.use(express.urlencoded({ extended: false }));

const STAGES_DIR = path.join(__dirname, 'stages');

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
     <p>You're logged in as <strong>alice</strong>. The app only ever shows you links to
     <em>your own</em> invoices — but the accounts of <strong>bob</strong> and
     <strong>carol</strong> live in the same system.</p>
     <div class="goal">🎯 <strong>Your mission:</strong> read an invoice that doesn't belong to you
     (bob's #102 is a $250,000 bonus). Each stage adds a stronger — but still bypassable —
     guard, until the fixed version finally denies it. Open a stage, read its source, and break in.</div>
     <ul style="line-height:2.2">${items}</ul>`
  );
}

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
    console.log(`🛡️  Lab 03 IDOR → http://localhost:${PORT}  (${stages.length} stages)`)
  );
});
