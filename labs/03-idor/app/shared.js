'use strict';

/**
 * Shared helpers for the IDOR lab.
 *
 * Keep the access-control logic OUT of here — the ownership check (or its
 * absence) lives in each stage file, because the source panel shows that code to
 * the learner. This file only handles the parts that DON'T change between stages
 * (HTML shell, DB seed/queries, invoice rendering, nav/hint/source/recap panels).
 *
 * Spoiler policy: in stage files, tag the security-relevant line with a trailing
 * `//!` comment. sourcePanel() highlights that line but strips the `//!` text.
 */

const fs = require('fs');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const STYLE = `
  body{font-family:system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;background:#0d1117;color:#e6edf3;line-height:1.5}
  a{color:#58a6ff} h1{margin-bottom:.2rem}
  .banner{background:#3d1d1d;border:1px solid #f85149;padding:.6rem;border-radius:6px;color:#ffa198}
  .meta{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
  .meta .defense{color:#d29922}
  button{padding:.6rem 1.2rem;background:#238636;color:#fff;border:0;border-radius:6px;cursor:pointer}
  pre{background:#161b22;border:1px solid #30363d;padding:.8rem;border-radius:6px;overflow:auto;white-space:pre-wrap;font-size:.85rem}
  code{font-family:ui-monospace,Menlo,monospace} .ok{color:#3fb950} .hint{color:#8b949e;font-size:.9rem}
  .card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
  .card h3{margin:.1rem 0 .5rem} .card .amount{font-size:1.3rem;color:#3fb950}
  .card .owner{color:#d29922}
  .denied{background:#3d1d1d;border:1px solid #f85149;color:#ffa198;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
  .goal{background:#11203a;border:1px solid #1f6feb;color:#cae0ff;border-radius:8px;padding:.6rem 1rem;margin:1rem 0;font-size:.95rem}
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
  .recap table{width:100%;border-collapse:collapse;margin-top:.6rem}
  .recap th,.recap td{text-align:left;padding:.4rem .6rem;border-bottom:1px solid #30363d;font-size:.85rem;vertical-align:top}
  .recap th{color:#8b949e;text-transform:uppercase;font-size:.7rem;letter-spacing:.05em}
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
    <table><thead><tr><th>Stage</th><th></th><th>Guard tried</th><th>Lesson</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>`;
}

/**
 * Compose a full stage page. Pass `content` and optional `result` HTML, plus
 * `success` — true when you accessed an invoice that ISN'T yours (the stage
 * decides this). On a vulnerable stage that reveals the "why it worked" panel.
 */
/** The blue "🎯 Goal" banner — the lab's objective, from lab.json (ctx.goal/goalSecure). */
function goalBanner(ctx) {
  const g = ctx.status === 'secure'
    ? (ctx.goalSecure || 'Try the earlier attacks — the fix should resist them all, while valid use still works.')
    : ctx.goal;
  return g ? `<div class="goal">🎯 <strong>Goal:</strong> ${g}</div>` : '';
}

function stagePage(ctx, { content = '', result = '', success = false } = {}) {
  const secure = ctx.status === 'secure';
  const afterResult = success && !secure ? successExplanation(ctx) : '';

  return page(ctx.title, `
    <p class="banner">${secure ? '🟢 Secure reference implementation.' : '🔴 Intentionally vulnerable — for learning only.'}</p>
    <h1>${escapeHtml(ctx.title)}</h1>
    <p class="hint">Stage ${ctx.stage} · mount <code>${ctx.mount}</code> · logged in as <strong>alice</strong></p>
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
// Database helpers
// ---------------------------------------------------------------------------

/** Create a fresh in-memory DB seeded with users + invoices. Each stage gets its own. */
function seedInvoices(SQL) {
  const db = new SQL.Database();
  db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);`);
  db.run(`CREATE TABLE invoices (id INTEGER PRIMARY KEY, owner_id INTEGER, amount REAL, note TEXT);`);
  db.run(`INSERT INTO users (id, name) VALUES (1,'alice'), (2,'bob'), (3,'carol');`);
  db.run(`INSERT INTO invoices (id, owner_id, amount, note) VALUES
    (101, 1,     49.00, 'Gym membership — monthly'),
    (102, 2, 250000.00, 'Project Nighthawk — retention bonus'),
    (103, 3,   1200.00, 'Standing desk reimbursement'),
    (104, 1,     19.99, 'Cloud storage — annual');`);
  return db;
}

/** Fetch one invoice (joined with its owner's name) by id, or null. */
function getInvoice(db, id) {
  const stmt = db.prepare(
    `SELECT i.id, i.owner_id, u.name AS owner, i.amount, i.note
       FROM invoices i JOIN users u ON u.id = i.owner_id
      WHERE i.id = :id`
  );
  stmt.bind({ ':id': id });
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

/** List invoices owned by a user — used to render "your invoices". */
function myInvoices(db, ownerId) {
  const stmt = db.prepare(`SELECT id, amount, note FROM invoices WHERE owner_id = :o ORDER BY id`);
  stmt.bind({ ':o': ownerId });
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/** Render an invoice as a card. */
function invoiceCard(inv) {
  return `<div class="card">
    <h3>Invoice #${escapeHtml(inv.id)}</h3>
    <div class="owner">Account holder: ${escapeHtml(inv.owner)}</div>
    <div class="amount">$${escapeHtml(Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }))}</div>
    <div>${escapeHtml(inv.note)}</div>
  </div>`;
}

/** Access-denied banner (used by the guarded stages). */
function deniedBanner(id) {
  return `<div class="denied">⛔ Access denied — invoice #${escapeHtml(id)} doesn't belong to you.</div>`;
}

module.exports = {
  escapeHtml, page, nav, hintPanel, sourcePanel, successExplanation, recapPanel, stagePage,
  seedInvoices, getInvoice, myInvoices, invoiceCard, deniedBanner,
};
