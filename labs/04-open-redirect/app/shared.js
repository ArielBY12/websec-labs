'use strict';

/**
 * Shared helpers for the Open Redirect lab.
 *
 * Keep the destination-validation logic OUT of here — it lives in each stage
 * file, because the source panel shows that code to the learner. This file only
 * handles the parts that DON'T change between stages (HTML shell, the URL form,
 * the redirect interstitial, nav/hint/source/recap panels).
 *
 * Spoiler policy: in stage files, tag the security-relevant line with a trailing
 * `//!` comment. sourcePanel() highlights that line but strips the `//!` text.
 */

const fs = require('fs');

/** Our own site's host — the only place redirects are supposed to lead. */
const SITE_HOST = 'websec-labs.local';

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
  input{display:block;width:100%;padding:.6rem;margin:.4rem 0;background:#161b22;border:1px solid #30363d;color:#e6edf3;border-radius:6px}
  button{padding:.6rem 1.2rem;background:#238636;color:#fff;border:0;border-radius:6px;cursor:pointer}
  pre{background:#161b22;border:1px solid #30363d;padding:.8rem;border-radius:6px;overflow:auto;white-space:pre-wrap;font-size:.85rem}
  code{font-family:ui-monospace,Menlo,monospace} .ok{color:#3fb950} .hint{color:#8b949e;font-size:.9rem}
  .result{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:.2rem 1rem;margin:1rem 0}
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

/** The "return URL" form. `mount` is the stage's base path (e.g. /stage/2 or /fixed). */
function urlForm(mount, value = '') {
  return `
    <form method="GET" action="${mount}/go">
      <label>Return URL — where should we send you back to?</label>
      <input name="url" value="${escapeHtml(value)}" autocomplete="off" placeholder="/account/settings">
      <button type="submit">Continue</button>
    </form>
    <p class="hint">It's meant for a path on this site (it starts with <code>/</code>)… what if you pass a full URL elsewhere?</p>`;
}

/** Collapsible hint. */
function hintPanel(hint) {
  if (!hint) return '';
  return `<details class="hint-box"><summary>💡 Stuck? Reveal a hint</summary>
    <div class="hint-body">${hint}</div></details>`;
}

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

/**
 * Does this redirect target leave our site? Relative paths stay on-site;
 * protocol-relative (//host) and absolute URLs to any host but ours are off-site.
 */
function isOffsite(target) {
  if (/^[/\\]{2}/.test(target)) return true;                   // //evil, /\evil, \/evil — all protocol-relative to browsers
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) {               // scheme://host…
    return !new RegExp(`^https?://${SITE_HOST.replace(/\./g, '\\.')}(?:[:/]|$)`, 'i').test(target);
  }
  return false;                                                 // relative path → on-site
}

/**
 * The redirect interstitial. Shows where you're being sent (the `data-target`
 * attribute is what the exploit test inspects), warns on off-site, and uses a
 * meta-refresh so it really does redirect.
 */
function redirectView(target, offsite) {
  const t = escapeHtml(target);
  const note = offsite
    ? `<div class="denied">⚠️ Off-site redirect — you're being sent to an external site you never chose. That's an open redirect: a phishing link that <em>looks</em> like it stays on the trusted site.</div>`
    : `<p class="ok">↪️ Redirecting you within the site.</p>`;
  return `${note}
    <p>Destination: <code data-target="${t}">${t}</code></p>
    <p><a id="dest" href="${t}">Continue now →</a></p>
    <meta http-equiv="refresh" content="3;url=${t}">`;
}

/** Compose a full stage page. Pass `content` and/or `result` HTML, plus `success`. */
function stagePage(ctx, { content = '', result = '', success = false } = {}) {
  const secure = ctx.status === 'secure';
  const afterResult = success && !secure ? successExplanation(ctx) : '';

  return page(ctx.title, `
    ${solvedBanner(ctx, success)}
    <p class="banner${secure ? ' ok' : ''}">${secure ? '🟢 Secure reference implementation.' : '🔴 Intentionally vulnerable — for learning only.'}</p>
    <h1>${escapeHtml(ctx.title)}</h1>
    <p class="hint">Stage ${ctx.stage} · mount <code>${ctx.mount}</code> · this site is <code>${SITE_HOST}</code></p>
    ${nav(ctx.allStages, ctx.stage)}
    ${goalBanner(ctx)}
    <div class="meta"><div class="defense"><strong>Defense:</strong> ${escapeHtml(ctx.defense)}</div></div>
    ${secure ? '' : hintPanel(ctx.hint)}
    ${content}
    ${result ? `<div class="result">${result}</div>` : ''}
    ${afterResult}
    ${sourcePanel(ctx.filePath)}
    ${secure ? recapPanel(ctx) : ''}`);
}

module.exports = {
  SITE_HOST, escapeHtml, page, nav, urlForm, hintPanel, goalBanner,
  sourcePanel, successExplanation, recapPanel, isOffsite, redirectView, stagePage,
};
