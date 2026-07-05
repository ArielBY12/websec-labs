'use strict';

/**
 * Shared helpers for the ReDoS lab: the HTML shell + panels and a timed validator.
 * Each stage validates input with a different regex; catastrophic backtracking makes
 * a small input take a long time — the security-relevant code in the source panel.
 *
 * Spoiler policy: tag the security-relevant line with a trailing `//!` comment;
 * sourcePanel() shows a focused window around it and strips the `//!` text.
 */

const fs = require('fs');

const THRESHOLD_MS = 50;   // above this, the validation is considered a ReDoS

/** Time a single `re.test(input)`; returns { ms, matched }. */
function timeRegex(re, input) {
  const t = process.hrtime.bigint();
  let matched = false;
  try { matched = re.test(input); } catch { /* ignore */ }
  return { ms: Number(process.hrtime.bigint() - t) / 1e6, matched };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || '').split(/;\s*/).filter(Boolean).map((c) => {
      const i = c.indexOf('=');
      return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    })
  );
}

// ---------------------------------------------------------------------------
// HTML shell + panels
// ---------------------------------------------------------------------------

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
  input{display:block;width:100%;padding:.6rem;margin:.4rem 0;background:#0d1117;border:1px solid #30363d;color:#e6edf3;border-radius:6px}
  label{font-size:.85rem;color:#8b949e} button{padding:.6rem 1.2rem;background:#238636;color:#fff;border:0;border-radius:6px;cursor:pointer}
  pre{background:#161b22;border:1px solid #30363d;padding:.8rem;border-radius:6px;overflow:auto;white-space:pre-wrap;word-break:break-all;font-size:.85rem}
  code{font-family:ui-monospace,Menlo,monospace} .ok{color:#3fb950} .hint{color:#8b949e;font-size:.9rem}
  .card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
  .denied{background:#3d1d1d;border:1px solid #f85149;color:#ffa198;border-radius:8px;padding:.8rem 1rem;margin:1rem 0}
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

function goalBanner(ctx) {
  const g = ctx.status === 'secure'
    ? (ctx.goalSecure || 'Try the earlier attacks — the fix should resist them all, while valid use still works.')
    : ctx.goal;
  return g ? `<div class="goal">🎯 <strong>Goal:</strong> ${g}</div>` : '';
}

function solvedBanner(ctx, success) {
  return success && ctx.status !== 'secure'
    ? `<div class="solved">🎉 Solved! Your input caused catastrophic backtracking at Stage ${ctx.stage} — ${escapeHtml(ctx.title)}.</div>`
    : '';
}

function sourcePanel(filePath) {
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); } catch { return ''; }
  const fileName = filePath.split('/').pop();
  const lines = text.replace(/\s+$/, '').split('\n');

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
    <table><thead><tr><th>Stage</th><th></th><th>Defense tried</th><th>Lesson</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>`;
}

function stagePage(ctx, { content = '', result = '', success = false } = {}) {
  const secure = ctx.status === 'secure';
  const afterResult = success && !secure ? successExplanation(ctx) : '';
  return page(ctx.title, `
    ${solvedBanner(ctx, success)}
    <p class="banner${secure ? ' ok' : ''}">${secure ? '🟢 Secure reference implementation.' : '🔴 Intentionally vulnerable — for learning only.'}</p>
    <h1>${escapeHtml(ctx.title)}</h1>
    <p class="hint">Stage ${ctx.stage} · mount <code>${ctx.mount}</code></p>
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
// Validator views
// ---------------------------------------------------------------------------

/** The input-validation form. */
function validateForm(ctx, value = 'hello') {
  return `<div class="card">
    <h2>✅ Input validator</h2>
    <form method="POST" action="${ctx.mount}/validate">
      <label>Value to validate</label><input name="input" value="${escapeHtml(value)}">
      <button>Validate</button>
    </form>
    <p class="hint">The server validates your input with a regular expression. Craft an
      input that makes it take a long time (catastrophic backtracking).</p>
  </div>`;
}

/** Show how long validation took. */
function timingPanel(ms, matched) {
  return `<div class="card"><h3>Result</h3>
    <pre>valid: ${matched}
time:  ${ms.toFixed(1)} ms  ${ms > THRESHOLD_MS ? '(⚠️ pathological — ReDoS)' : '(fast)'}</pre></div>`;
}

function deniedBanner(msg = '⛔ Rejected.') {
  return `<div class="denied">${escapeHtml(msg)}</div>`;
}

module.exports = {
  THRESHOLD_MS, timeRegex, escapeHtml, parseCookies,
  page, nav, hintPanel, goalBanner, solvedBanner, sourcePanel, successExplanation,
  recapPanel, stagePage, validateForm, timingPanel, deniedBanner,
};
