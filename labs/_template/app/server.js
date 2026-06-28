'use strict';

/**
 * Stage host — generic, copy this verbatim into a new challenge.
 *
 * Auto-discovers stages/NN-slug.js, mounts vulnerable stages at /stage/<n> and the
 * secure one at /fixed, and renders a menu at /. Each stage gets a `ctx` with
 * its own file path so its source can be shown in-page.
 *
 * DB-backed labs (like 01-sqli) pass the initialized sql.js module to each
 * stage. If your vuln needs no DB, drop the sql.js require and call
 * `s.createRouter(ctx)` instead.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { page } = require('./shared');

const manifest = require('../lab.json');
const app = express();
const PORT = process.env.PORT || manifest.port || 4000;
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
     <p>Each stage adds a stronger (but still bypassable) defense — until the fixed version.
     Open a stage, read its source, and try to bypass it.</p>
     <ul style="line-height:2.2">${items}</ul>`
  );
}

initSqlJs().then((SQL) => {
  for (const s of stages) {
    const ctx = {
      stage: s.stage, slug: s.slug, title: s.title, defense: s.defense,
      hint: s.hint, explanation: s.explanation, status: s.status,
      mount: s.mount, filePath: s.filePath, allStages,
    };
    if (s.status === 'secure') {
      ctx.recap = { rootCause: manifest.rootCause, lessons: manifest.lessons };
    }
    app.use(s.mount, s.createRouter(SQL, ctx));
  }
  app.get('/', (req, res) => res.send(renderMenu()));
  app.listen(PORT, () =>
    console.log(`🛡️  ${manifest.title} → http://localhost:${PORT}  (${stages.length} stages)`)
  );
});
