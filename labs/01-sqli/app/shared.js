'use strict';

/**
 * Shared helpers for the SQL-injection lab.
 *
 * Every stage is a small file under stages/. These helpers handle the parts
 * that DON'T change between stages (HTML shell, DB seeding, result rendering,
 * and the "view source" panel) so that each stage file contains ONLY the
 * security-relevant logic — which is exactly the code we show the learner.
 */

const fs = require('fs');

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STYLE = `
  body{font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;background:#0d1117;color:#e6edf3;line-height:1.5}
  a{color:#58a6ff}
  h1{margin-bottom:.2rem}
  .banner{background:#3d1d1d;border:1px solid #f85149;padding:.6rem;border-radius:6px;color:#ffa198}
  .banner.ok{background:#0f2417;border-color:#3fb950;color:#3fb950}
  .meta{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
  .meta .defense{color:#d29922}
  .goal{background:#11203a;border:1px solid #1f6feb;color:#cae0ff;border-radius:8px;padding:.6rem 1rem;margin:1rem 0;font-size:.95rem}
  .solved{background:#1a7f37;border:1px solid #3fb950;color:#fff;font-weight:600;text-align:center;padding:.7rem 1rem;border-radius:8px;margin:0 0 1rem;animation:solvedDrop .5s ease}
  @keyframes solvedDrop{from{transform:translateY(-120%);opacity:0}to{transform:translateY(0);opacity:1}}
  .meta .hint{color:#8b949e;font-size:.9rem}
  input{display:block;width:100%;padding:.6rem;margin:.4rem 0;background:#161b22;border:1px solid #30363d;color:#e6edf3;border-radius:6px}
  button{padding:.6rem 1.2rem;background:#238636;color:#fff;border:0;border-radius:6px;cursor:pointer}
  pre{background:#161b22;border:1px solid #30363d;padding:.8rem;border-radius:6px;overflow:auto;white-space:pre-wrap;font-size:.85rem}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .ok{color:#3fb950}
  .nav{display:flex;flex-wrap:wrap;gap:.4rem;margin:1rem 0}
  .nav a{padding:.25rem .6rem;border:1px solid #30363d;border-radius:6px;text-decoration:none;font-size:.85rem}
  .nav a.cur{background:#1f6feb;border-color:#1f6feb;color:#fff}
  .nav a.secure{border-color:#3fb950;color:#3fb950}
  details.source{margin:1rem 0;border:1px solid #30363d;border-radius:8px;overflow:hidden}
  details.source>summary{cursor:pointer;padding:.6rem .8rem;background:#161b22;font-weight:600}
  details.source pre{margin:0;border:0;border-radius:0}
  .src-ln{display:block}
  .src-ln .num{display:inline-block;width:2.4em;color:#6e7681;user-select:none;text-align:right;margin-right:1em}
  .src-ln.hl{background:#3d2d12;border-left:3px solid #d29922;margin-left:-3px}
  details.hint-box{margin:1rem 0;border:1px solid #30363d;border-radius:8px;overflow:hidden}
  details.hint-box>summary{cursor:pointer;padding:.6rem .8rem;background:#161b22;color:#d29922;font-weight:600}
  details.hint-box .hint-body{padding:.6rem .8rem;color:#e6edf3}
  .explain{background:#0f2417;border:1px solid #3fb950;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
  .explain h3{margin:.1rem 0 .5rem;color:#3fb950;font-size:1rem}
  .recap{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1rem;margin:1.5rem 0}
  .recap h2{margin-top:0;font-size:1.1rem}
  .recap table{width:100%;border-collapse:collapse;margin-top:.6rem}
  .recap th,.recap td{text-align:left;padding:.4rem .6rem;border-bottom:1px solid #30363d;font-size:.85rem;vertical-align:top}
  .recap th{color:#8b949e;text-transform:uppercase;font-size:.7rem;letter-spacing:.05em}
`;

function page(title, body) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title><style>${STYLE}</style></head>
<body>${body}</body></html>`;
}

/** Stage navigation bar (links to every sibling stage). */
function nav(allStages, currentStage) {
  const links = allStages
    .map((s) => {
      const cls = [s.stage === currentStage ? 'cur' : '', s.status === 'secure' ? 'secure' : '']
        .filter(Boolean)
        .join(' ');
      const label = s.status === 'secure' ? '🟢 Fixed' : `Stage ${s.stage}`;
      return `<a class="${cls}" href="${s.mount}">${label}</a>`;
    })
    .join('');
  return `<div class="nav">${links}</div>`;
}

/** Collapsible hint — the nudge stays hidden until the learner asks for it. */
function hintPanel(hint) {
  if (!hint) return '';
  return `<details class="hint-box"><summary>💡 Stuck? Reveal a hint</summary>
    <div class="hint-body">${hint}</div></details>`;
}

/** The login form. `mount` is the stage's base path, e.g. /stage/2 or /fixed. */
function loginForm(mount, message = '') {
  return `
    ${message}
    <form method="POST" action="${mount}/login">
      <label>Username</label><input name="username" autocomplete="off" autofocus>
      <label>Password</label><input name="password" type="password" autocomplete="off">
      <button type="submit">Log in</button>
    </form>
    <p class="hint">Seeded users: <code>admin</code>, <code>alice</code>, <code>bob</code>. You don't know their passwords… or do you need them?</p>`;
}

/**
 * Render the outcome of a login attempt.
 * `executedQuery` is shown so the learner sees what their input did (the effect).
 * Pass `paramNote` for the fixed stage to explain bound parameters.
 */
function renderResult({ rows, executedQuery, error, paramNote }) {
  if (error) {
    return `<p class="banner">SQL error: ${escapeHtml(error)}</p>
      <p>Executed query:</p><pre>${escapeHtml(executedQuery)}</pre>`;
  }
  const queryBlock = executedQuery
    ? `<p>${paramNote || 'Executed query:'}</p><pre>${escapeHtml(executedQuery)}</pre>`
    : '';
  if (rows && rows.length > 0) {
    const [id, name, role] = rows[0];
    return `<p class="ok">✅ Logged in as <strong>${escapeHtml(name)}</strong> (role: ${escapeHtml(role)}, id: ${escapeHtml(id)}).</p>
      ${rows.length > 1 ? `<p>(query returned ${rows.length} rows)</p>` : ''}
      ${queryBlock}`;
  }
  return `<p class="banner">❌ Invalid credentials.</p>${queryBlock}`;
}

/**
 * Read a stage file and render it as a collapsible "view source" panel.
 *
 * The challenge is to spot the flaw yourself, so we DON'T show the giveaway:
 * any `//!` comment is a spoiler — we highlight that line (it points you at the
 * security-relevant code) but strip the spoiler text from `//!` to end-of-line.
 * The full file on GitHub keeps the comment for readers; the app hides it.
 */
function sourcePanel(filePath) {
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
  const fileName = filePath.split('/').pop();
  const lines = text.replace(/\s+$/, '').split('\n');

  // Show only a focused window around the //! marked line(s), starting no higher
  // than createRouter — this hides the top comment block AND the hint/explanation
  // fields, so the source panel doesn't spoil the lab.
  const CONTEXT = 10;
  const marked = lines.reduce((a, l, i) => { if (l.includes('//!')) a.push(i); return a; }, []);
  let from = 0, to = lines.length - 1;
  if (marked.length) {
    const router = lines.findIndex((l) => /createRouter/.test(l));
    from = Math.max(Math.min(...marked) - CONTEXT, router >= 0 ? router : 0);
    to = Math.min(Math.max(...marked) + CONTEXT, lines.length - 1);
  }

  const out = [];
  const ellipsis = (n, where) =>
    `<span class="src-ln"><span class="num">…</span>… ${n} line${n === 1 ? '' : 's'} ${where} hidden …</span>`;
  if (from > 0) out.push(ellipsis(from, 'above'));
  for (let i = from; i <= to; i++) {
    const line = lines[i];
    const spoiler = line.includes('//!');
    const shown = spoiler ? line.slice(0, line.indexOf('//!')).replace(/\s+$/, '') : line;
    const n = String(i + 1).padStart(2, ' ');
    const hl = spoiler ? ' hl' : '';
    out.push(`<span class="src-ln${hl}"><span class="num">${n}</span>${escapeHtml(shown) || ' '}</span>`);
  }
  const below = lines.length - 1 - to;
  if (below > 0) out.push(ellipsis(below, 'below'));

  return `<details class="source"><summary>📄 Read the source — <code>${escapeHtml(fileName)}</code> (the relevant code)</summary>
    <pre><code>${out.join('')}</code></pre></details>`;
}

/**
 * The "why it worked" block, revealed ONLY after a successful bypass.
 * `ctx.explanation` is trusted authored HTML (may contain <code>/<br>).
 */
function successExplanation(ctx) {
  if (!ctx.explanation) return '';
  return `<div class="explain"><h3>🧠 Why that worked</h3>${ctx.explanation}</div>`;
}

/**
 * Recap shown on the fixed stage: the root cause, the lessons, and a
 * defense → lesson table built from every stage (ctx.allStages is enriched
 * with title/defense/lesson by the server).
 */
function recapPanel(ctx) {
  const recap = ctx.recap || {};
  const rows = (ctx.allStages || [])
    .map(
      (s) => `<tr>
        <td>${s.status === 'secure' ? '🟢 Fixed' : 'Stage ' + s.stage}</td>
        <td>${escapeHtml(s.title || '')}</td>
        <td>${escapeHtml(s.defense || '')}</td>
        <td>${escapeHtml(s.lesson || '')}</td>
      </tr>`
    )
    .join('');
  const lessons = (recap.lessons || []).map((l) => `<li>${l}</li>`).join('');
  return `<div class="recap">
    <h2>📝 What you learned</h2>
    ${recap.rootCause ? `<p><strong>The vulnerability:</strong> ${recap.rootCause}</p>` : ''}
    ${lessons ? `<ul>${lessons}</ul>` : ''}
    <table>
      <thead><tr><th>Stage</th><th></th><th>Defense tried</th><th>Lesson</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/**
 * Compose a full stage page: banner, title, nav, neutral defense line, hint
 * button, content, result, and the source panel. After a successful bypass on a
 * vulnerable stage the "why it worked" block is revealed; the fixed stage shows
 * the recap. `ctx` = { stage, title, defense, hint, explanation, status, mount,
 * filePath, allStages, recap }.
 */
/** The blue "🎯 Goal" banner — the lab's objective, from lab.json (ctx.goal/goalSecure). */
function goalBanner(ctx) {
  const g = ctx.status === 'secure'
    ? (ctx.goalSecure || 'Try the earlier attacks — the fix should resist them all, while valid use still works.')
    : ctx.goal;
  return g ? `<div class="goal">🎯 <strong>Goal:</strong> ${g}</div>` : '';
}

/** Celebratory "solved" banner — drops in at the top when you exploit a vulnerable stage. */
function solvedBanner(ctx, success) {
  return success && ctx.status !== 'secure'
    ? `<div class="solved">🎉 Solved! You exploited Stage ${ctx.stage} — ${escapeHtml(ctx.title)}.</div>`
    : '';
}

function stagePage(ctx, { content = '', result = null } = {}) {
  const secure = ctx.status === 'secure';
  const success = !!(result && result.rows && result.rows.length > 0);

  let afterResult = '';
  if (success && !secure) {
    afterResult = successExplanation(ctx);
  } else if (success && secure) {
    afterResult = `<div class="explain"><h3>✅ Correct login</h3>That's a genuine match on valid credentials — not an injection. The same payloads that broke the earlier stages fail here.</div>`;
  }

  const body = `
    ${solvedBanner(ctx, success)}
    <p class="banner${secure ? ' ok' : ''}">${secure ? '🟢 Secure reference implementation.' : '🔴 Intentionally vulnerable — for learning only.'}</p>
    <h1>${escapeHtml(ctx.title)}</h1>
    <p class="hint">Stage ${ctx.stage} · mount <code>${ctx.mount}</code></p>
    ${nav(ctx.allStages, ctx.stage)}
    ${goalBanner(ctx)}
    <div class="meta">
      <div class="defense"><strong>Defense:</strong> ${escapeHtml(ctx.defense)}</div>
    </div>
    ${secure ? '' : hintPanel(ctx.hint)}
    ${content}
    ${result ? renderResult(result) : ''}
    ${afterResult}
    ${sourcePanel(ctx.filePath)}
    ${secure ? recapPanel(ctx) : ''}`;
  return page(ctx.title, body);
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

/** Create a fresh in-memory DB seeded with users. Each stage gets its own. */
function seedUsers(SQL) {
  const db = new SQL.Database();
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT,
    role TEXT
  );`);
  db.run(`INSERT INTO users (username, password, role) VALUES
    ('admin', 'Gk7!q2_Zr9xLmW', 'admin'),
    ('alice', 'alice-pass-123', 'user'),
    ('bob',   'bobby2024',      'user');`);
  return db;
}

/** Run a raw query string (the vulnerable path). Returns { rows, error }. */
function runRawQuery(db, query) {
  try {
    const result = db.exec(query);
    return { rows: result.length ? result[0].values : [] };
  } catch (err) {
    return { rows: [], error: err.message };
  }
}

/** Run a parameterized query (the safe path). Returns { rows, error }. */
function runParamQuery(db, sql, params) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      const o = stmt.getAsObject();
      rows.push([o.id, o.username, o.role]);
    }
    stmt.free();
    return { rows };
  } catch (err) {
    return { rows: [], error: err.message };
  }
}

module.exports = {
  escapeHtml,
  page,
  nav,
  loginForm,
  renderResult,
  sourcePanel,
  stagePage,
  seedUsers,
  runRawQuery,
  runParamQuery,
};
