'use strict';

/**
 * Stage host for the auth-failures lab. Auto-discovers stages/NN-slug.js, mounts
 * vulnerable stages at /stage/<n> and the secure one at /fixed, and renders a menu
 * at /. No database — each stage keeps its own in-memory user + session state.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { page, STYLE, escapeHtml } = require('./shared');

const manifest = require('../lab.json');
const app = express();
const PORT = process.env.PORT || manifest.port || 4008;
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
        <a href="${s.mount}"><strong>${s.status === 'secure' ? '🟢' : '🔴'} Stage ${s.stage} — ${escapeHtml(s.title)}</strong></a>
        <div class="hint">${escapeHtml(s.defense)}</div>
      </li>`
    )
    .join('');
  return page(
    manifest.title,
    `<h1>🛡️ ${manifest.title}</h1>
     <p>Each stage adds a stronger (but still bypassable) authentication defense — until
     the fixed version. Open a stage, read its source, and try to take over the admin account.</p>
     <ul style="line-height:2.2">${items}</ul>`
  );
}

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
  app.use(s.mount, s.createRouter(ctx));
}
// Serve the shared CSS as an external same-origin stylesheet so the fixed stage's
// strict CSP (default-src 'self') can load it — an inline <style> would be blocked.
app.get('/style.css', (req, res) => {
  res.type('css').send(STYLE);
});
app.get('/', (req, res) => res.send(renderMenu()));
app.listen(PORT, () =>
  console.log(`🛡️  ${manifest.title} → http://localhost:${PORT}  (${stages.length} stages)`)
);
