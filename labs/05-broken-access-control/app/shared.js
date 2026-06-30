'use strict';

/**
 * Shared helpers for the Broken Access Control lab.
 *
 * The authorization check (or its absence) lives in each stage file — that's the
 * code the learner reads in the source panel. This file holds only what DOESN'T
 * change between stages: HTML shell, the seeded user DB, the admin-panel and
 * dashboard rendering, and the nav/hint/source/goal/solved/recap panels.
 *
 * The "logged-in user" is alice (role `user`). We model it as a TRUSTED server
 * value (SESSION) — as if resolved from a session cookie after login — so the
 * lab is about authorization, not session forgery. A buggy stage that reads the
 * role from a *client* value instead is exactly the vulnerability.
 *
 * Spoiler policy: tag the security-relevant line with a trailing `//!` comment;
 * sourcePanel() highlights it but strips the `//!` text.
 */

const fs = require('fs');

// The authenticated session the server trusts. You are alice, a regular user.
const SESSION = { user: 'alice', role: 'user' };

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const STYLE = `
  body{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;background:#0d1117;color:#e6edf3;line-height:1.5}
  a{color:#58a6ff} h1{margin-bottom:.2rem}
  .banner{background:#3d1d1d;border:1px solid #f85149;padding:.6rem;border-radius:6px;color:#ffa198}
  .banner.ok{background:#0f2417;border-color:#3fb950;color:#3fb950}
  .meta{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
  .meta .defense{color:#d29922}
  .goal{background:#11203a;border:1px solid #1f6feb;color:#cae0ff;border-radius:8px;padding:.6rem 1rem;margin:1rem 0;font-size:.95rem}
  .solved{background:#1a7f37;border:1px solid #3fb950;color:#fff;font-weight:600;text-align:center;padding:.7rem 1rem;border-radius:8px;margin:0 0 1rem;animation:solvedDrop .5s ease}
  @keyframes solvedDrop{from{transform:translateY(-120%);opacity:0}to{transform:translateY(0);opacity:1}}
  button{padding:.5rem 1rem;background:#238636;color:#fff;border:0;border-radius:6px;cursor:pointer}
  pre{background:#161b22;border:1px solid #30363d;padding:.8rem;border-radius:6px;overflow:auto;white-space:pre-wrap;font-size:.85rem}
  code{font-family:ui-monospace,Menlo,monospace} .ok{color:#3fb950} .hint{color:#8b949e;font-size:.9rem}
  .card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
  .denied{background:#3d1d1d;border:1px solid #f85149;color:#ffa198;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
  table{width:100%;border-collapse:collapse;margin:.6rem 0}
  th,td{text-align:left;padding:.4rem .6rem;border-bottom:1px solid #30363d;font-size:.9rem}
  th{color:#8b949e} .role-admin{color:#f0883e;font-weight:600} .role-user{color:#8b949e}
  .nav{display:flex;flex-wrap:wrap;gap:.4rem;margin:1rem 0}
  .nav a{padding:.25rem .6rem;border:1px solid #30363d;border-radius:6px;text-decoration:none;font-size:.85rem}
  .nav a.cur{background:#1f6feb;border-color:#1f6feb;color:#fff} .nav a.secure{border-color:#3fb950;color:#3fb950}
  details.source,details.hint-box{margin:1rem 0;border:1px solid #30363d;border-radius:8px;overflow:hidden}
  details.source>summary{cursor:pointer;padding:.6rem .8rem;background:#161b22;font-weight:600}
  details.hint-box>summary{cursor:pointer;padding:.6rem .8rem;background:#161b22;color:#d29922;font-weight:600}
  details.hint-box .hint-body{padding:.6rem .8rem}
  details.source pre{margin:0;border:0;border-radius:0}
  .src-ln{display:block} .src-ln .num{display:inline-block;width:2.4em;color:#6e7681;text-align:right;margin-right:1em}
  .src-ln.hl{background:#3d2d12;border-left:3px solid #d29922;margin-left:-3px}
  .explain{background:#0f2417;border:1px solid #3fb950;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
  .explain h3{margin:.1rem 0 .5rem;color:#3fb950;font-size:1rem}
  .recap{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1rem;margin:1.5rem 0}
  .recap h2{margin-top:0;font-size:1.1rem}
  .recap table{margin-top:.6rem}
  .recap th{text-transform:uppercase;font-size:.7rem;letter-spacing:.05em}
`;

function page(title, body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`;
}

function nav(allStages, currentStage) {
  const links = allStages
    .map((s) => {
      const cls = [s.stage === currentStage ? 'cur' : '', s.status === 'secure' ? 'secure' : '']
        .filter(Boolean).join(' ');
      const label = s.status === 'secure' ? '🟢 Fixed' : `Stage ${s.stage}`;
      return `<a class="${cls}" href="${s.mount}">${label}</a>`;
    })
    .join('');
  return `<div class="nav">${links}</div>`;
}

function hintPanel(hint) {
  if (!hint) return '';
  return `<details class="hint-box"><summary>💡 Stuck? Reveal a hint</summary>
    <div class="hint-body">${hint}</div></details>`;
}

function goalBanner(ctx) {
  const g = ctx.status === 'secure'
    ? (ctx.goalSecure || 'Try the earlier attacks — the fix should resist them all, while valid use still works.')
    : ctx.goal;
  return g ? `<div class="goal">🎯 <strong>Goal:</strong> ${g}</div>` : '';
}

function solvedBanner(ctx, success) {
  return success && ctx.status !== 'secure'
    ? `<div class="solved">🎉 Solved! You exploited Stage ${ctx.stage} — ${escapeHtml(ctx.title)}.</div>`
    : '';
}

function sourcePanel(filePath) {
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
  const fileName = filePath.split('/').pop();
  const rendered = text.replace(/\s+$/, '').split('\n')
    .map((line, i) => {
      const spoiler = line.includes('//!');
      const shown = spoiler ? line.slice(0, line.indexOf('//!')).replace(/\s+$/, '') : line;
      const n = String(i + 1).padStart(2, ' ');
      const hl = spoiler ? ' hl' : '';
      return `<span class="src-ln${hl}"><span class="num">${n}</span>${escapeHtml(shown) || ' '}</span>`;
    })
    .join('');
  return `<details class="source"><summary>📄 Read the source — <code>${escapeHtml(fileName)}</code> (the bug is in here)</summary>
    <pre><code>${rendered}</code></pre></details>`;
}

function successExplanation(ctx) {
  if (!ctx.explanation) return '';
  return `<div class="explain"><h3>🧠 Why that worked</h3>${ctx.explanation}</div>`;
}

function recapPanel(ctx) {
  const recap = ctx.recap || {};
  const rows = (ctx.allStages || [])
    .map((s) => `<tr>
      <td>${s.status === 'secure' ? '🟢 Fixed' : 'Stage ' + s.stage}</td>
      <td>${escapeHtml(s.title || '')}</td>
      <td>${escapeHtml(s.defense || '')}</td>
      <td>${escapeHtml(s.lesson || '')}</td>
    </tr>`)
    .join('');
  const lessons = (recap.lessons || []).map((l) => `<li>${l}</li>`).join('');
  return `<div class="recap">
    <h2>📝 What you learned</h2>
    ${recap.rootCause ? `<p><strong>The vulnerability:</strong> ${recap.rootCause}</p>` : ''}
    ${lessons ? `<ul>${lessons}</ul>` : ''}
    <table><thead><tr><th>Stage</th><th></th><th>Check tried</th><th>Lesson</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>`;
}

/** Compose a full stage page. `success` = the exploit fired (drives the solved banner). */
function stagePage(ctx, { content = '', result = '', success = false } = {}) {
  const secure = ctx.status === 'secure';
  const afterResult = success && !secure ? successExplanation(ctx) : '';

  return page(ctx.title, `
    ${solvedBanner(ctx, success)}
    <p class="banner${secure ? ' ok' : ''}">${secure ? '🟢 Secure reference implementation.' : '🔴 Intentionally vulnerable — for learning only.'}</p>
    <h1>${escapeHtml(ctx.title)}</h1>
    <p class="hint">Stage ${ctx.stage} · mount <code>${ctx.mount}</code> · logged in as <strong>${SESSION.user}</strong> (role <code>${SESSION.role}</code>)</p>
    ${nav(ctx.allStages, ctx.stage)}
    ${goalBanner(ctx)}
    <div class="meta"><div class="defense"><strong>Defense:</strong> ${escapeHtml(ctx.defense)}</div></div>
    ${secure ? '' : hintPanel(ctx.hint)}
    ${content}
    ${result || ''}
    ${afterResult}
    ${sourcePanel(ctx.filePath)}
    ${secure ? recapPanel(ctx) : ''}`);
}

// ---------------------------------------------------------------------------
// Database + view helpers
// ---------------------------------------------------------------------------

/** Fresh in-memory DB seeded with users. Each stage gets its own (no shared state). */
function seedUsers(SQL) {
  const db = new SQL.Database();
  db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, role TEXT);`);
  db.run(`INSERT INTO users (id, name, role) VALUES
    (1,'alice','user'), (2,'bob','user'), (3,'carol','admin');`);
  return db;
}

function listUsers(db) {
  const rows = [];
  const stmt = db.prepare(`SELECT id, name, role FROM users ORDER BY id`);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/** Promote a user to admin (the privileged action). Returns the new role or null. */
function promote(db, name) {
  db.run(`UPDATE users SET role='admin' WHERE name=:n`, { ':n': name });
  const stmt = db.prepare(`SELECT role FROM users WHERE name=:n`);
  stmt.bind({ ':n': name });
  const role = stmt.step() ? stmt.getAsObject().role : null;
  stmt.free();
  return role;
}

/** The admin panel body: a user table + a promote form. The crown jewels. */
function adminPanel(mount, db) {
  const rows = listUsers(db)
    .map((u) => `<tr><td>${u.id}</td><td>${escapeHtml(u.name)}</td>
      <td class="role-${u.role}">${u.role}</td></tr>`)
    .join('');
  return `<div class="card">
    <h2>🔑 Admin panel — user management</h2>
    <table><thead><tr><th>ID</th><th>User</th><th>Role</th></tr></thead><tbody>${rows}</tbody></table>
    <form method="POST" action="${mount}/admin/promote">
      <input type="hidden" name="user" value="alice">
      <button type="submit">Promote alice to admin</button>
    </form>
  </div>`;
}

/** The regular-user dashboard (no privilege needed) — used as the positive control. */
function dashboard() {
  return `<div class="card"><h2>Your dashboard</h2>
    <p>Welcome, <strong>${SESSION.user}</strong>. You're a regular user.</p></div>`;
}

function deniedBanner() {
  return `<div class="denied">⛔ Access denied — admin only.</div>`;
}

module.exports = {
  SESSION, escapeHtml, page, nav, hintPanel, goalBanner, solvedBanner,
  sourcePanel, successExplanation, recapPanel, stagePage,
  seedUsers, listUsers, promote, adminPanel, dashboard, deniedBanner,
};
