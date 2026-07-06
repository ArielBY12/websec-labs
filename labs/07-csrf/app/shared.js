'use strict';

/**
 * Shared helpers for the CSRF lab: the HTML shell + panels, a tiny in-memory
 * session store, and cookie/token primitives. How each stage *guards* (or fails
 * to guard) the state-changing request is the security-relevant code, and lives
 * in the stage files.
 *
 * Spoiler policy: tag the security-relevant line with a trailing `//!` comment;
 * sourcePanel() shows a focused window around it and strips the `//!` text.
 */

const fs = require('fs');
const crypto = require('crypto');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Sessions (each stage owns its own store — no global state shared between stages)
// ---------------------------------------------------------------------------

const SITE = 'bank.example';
const DEFAULT_EMAIL = 'alice@bank.example';
const ATTACKER_EMAIL = 'attacker@evil.example';

const randomToken = () => crypto.randomBytes(16).toString('hex');

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || '').split(/;\s*/).filter(Boolean).map((c) => {
      const i = c.indexOf('=');
      return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    })
  );
}

/**
 * Return this request's session (creating one on first visit), always setting the
 * session cookie. `sameSite` hardens the cookie on the fixed stage.
 */
function getSession(req, res, store, { sameSite = false } = {}) {
  const sid = parseCookies(req).lab7_sid;
  let sess = sid && store.get(sid);
  if (!sess) {
    const newSid = randomToken();
    sess = { email: DEFAULT_EMAIL, token: randomToken() };
    store.set(newSid, sess);
    res.setHeader('Set-Cookie',
      `lab7_sid=${newSid}; Path=/${sameSite ? '; SameSite=Strict' : ''}`);
  }
  return sess;
}

/**
 * The Referer we judge the request by. In a real attack the browser sets this; our
 * attacker console runs on the same origin as the lab, so a real cross-site Referer
 * can't be produced from the page. To let the learner *choose* the delivery origin,
 * the console sends a simulated `x-sim-referer` header. A genuine `Referer` (what the
 * exploit tests and alice's own form send) always wins, so the tests are unaffected.
 */
function effectiveReferer(req) {
  return req.headers.referer || req.headers['x-sim-referer'] || null;
}

/**
 * Is this a cross-site request? A same-site form submit carries a Referer whose host
 * matches ours; a cross-site CSRF payload omits the Referer (or sends a different host).
 * We key on Referer only — a same-origin POST still sends an Origin header, so it can't
 * be used to tell victim from attacker within one origin.
 */
function isCrossSite(req) {
  const ref = effectiveReferer(req);
  if (!ref) return true;
  try { return new URL(ref).host !== req.headers.host; } catch { return true; }
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
  button{padding:.6rem 1.2rem;background:#238636;color:#fff;border:0;border-radius:6px;cursor:pointer}
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
    ? `<div class="solved">🎉 Solved! You forged the request at Stage ${ctx.stage} — ${escapeHtml(ctx.title)}.</div>`
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
// View helpers
// ---------------------------------------------------------------------------

/** Alice's own account page — her *legitimate*, same-site change-email form. */
function accountCard(ctx, sess, { tokenField = null } = {}) {
  const hidden = tokenField
    ? `<input type="hidden" name="csrf" value="${escapeHtml(tokenField)}">`
    : '';
  return `<div class="card">
    <h2>👤 alice's account</h2>
    <p>Current email: <strong>${escapeHtml(sess.email)}</strong></p>
    <form method="POST" action="${ctx.mount}/change-email">
      ${hidden}
      <label>New email</label>
      <input name="email" value="alice.new@bank.example">
      <button>Update email</button>
    </form>
    <p class="hint">This is alice's real form. Submitting it yourself is a <strong>legitimate,
      same-site</strong> change — not an attack. To solve the lab, deliver the
      <em>cross-site</em> request from the attacker's page below.</p>
  </div>`;
}

/**
 * The attacker's console — the "external cross-site request" element. The learner must
 * *assemble* the request that defeats this stage's defense: pick where it appears to come
 * from (the delivery origin), the HTTP method, and a CSRF token if the server demands one.
 * Delivering it carries alice's cookie automatically. The delivery origin defaults to
 * *same-site*, which is a legitimate action — a blind click never solves anything; the
 * learner has to consciously send it cross-site, and pick the delivery that defeats the
 * stage. A pre-built one-click exploit would teach nothing, so there isn't one.
 *
 * Because the console runs on the lab's own origin it can't emit a real cross-site Referer,
 * so it simulates the chosen origin with an `x-sim-referer` header (see effectiveReferer).
 */
function attackerConsole(ctx) {
  const url = `${ctx.mount}/change-email`;
  return `<div class="card" style="border-color:#f85149">
    <h3>🎭 Attacker's page — <code>evil.example</code></h3>
    <p class="hint">A page on another site. Assemble the request it should send while alice is
      logged in — her cookie rides along automatically. It starts out looking like alice's own
      <strong>same-site</strong> action (which is legitimate, not an attack); to forge, you must
      deliver it <strong>cross-site</strong> in a way this stage's server still <em>accepts</em>.</p>
    <label>Delivery origin (where the request appears to come from)</label>
    <select id="atk-referer">
      <option value="same">🏠 Same-site (bank.example) — looks like alice's own request</option>
      <option value="cross">🌐 Cross-site (evil.example) — the attacker's real origin</option>
      <option value="none">🚫 No Referer — stripped (no-referrer)</option>
    </select>
    <label>HTTP method</label>
    <select id="atk-method"><option value="POST">POST</option><option value="GET">GET</option></select>
    <label>CSRF token (only if the server requires one)</label>
    <input id="atk-token" placeholder="leave blank — or find a token the server will accept">
    <p class="hint">Target: change alice's email to <code>${escapeHtml(ATTACKER_EMAIL)}</code>.</p>
    <button id="atk-fire" style="background:#a4331f">▶ Deliver the request to alice</button>
    <script>(function(){
      var url=${JSON.stringify(url)}, back=${JSON.stringify(`${ctx.mount}/`)}, email=${JSON.stringify(ATTACKER_EMAIL)};
      document.getElementById('atk-fire').addEventListener('click',function(){
        var m=document.getElementById('atk-method').value, t=document.getElementById('atk-token').value;
        var ref=document.getElementById('atk-referer').value;
        var p=new URLSearchParams({email:email}); if(t) p.set('csrf',t);
        var headers={};
        if(ref==='same') headers['x-sim-referer']=location.origin+back;
        else if(ref==='cross') headers['x-sim-referer']='https://evil.example/';
        // 'none' → send no Referer at all
        var opts={credentials:'include',referrerPolicy:'no-referrer'}, target=url;
        if(m==='GET'){ target=url+'?'+p.toString(); if(Object.keys(headers).length) opts.headers=headers; }
        else { headers['content-type']='application/x-www-form-urlencoded'; opts.method='POST'; opts.headers=headers; opts.body=p.toString(); }
        fetch(target,opts).then(function(res){ return res.text(); }).then(function(html){
          document.open(); document.write(html); document.close();
        });
      });
    })();</script>
  </div>`;
}

/** alice's account page + the attacker's console, together. */
function accountView(ctx, sess, { tokenField = null } = {}) {
  return accountCard(ctx, sess, { tokenField }) + attackerConsole(ctx);
}

/**
 * Build the change-email response. A change is a *solved CSRF* only when it arrived as a
 * cross-site request; alice's own same-site submit is legitimate and never "solves".
 */
function afterChange(ctx, sess, req, view = {}) {
  const crossSite = isCrossSite(req);
  if (crossSite) sess.csrfSolved = true;
  return {
    content: accountView(ctx, sess, view),
    result: crossSite ? changedBanner(sess) : legitBanner(sess),
    success: crossSite,
  };
}

/** Result banner after a change-email attempt. */
function changedBanner(sess) {
  return `<div class="explain"><h3>🎯 Cross-site request forged</h3>
    alice's email is now <code>${escapeHtml(sess.email)}</code> — changed by a
    <strong>cross-site</strong> request that rode her cookie but carried none of her
    session's secret. That is a successful CSRF.</div>`;
}

function legitBanner(sess) {
  return `<p class="ok">✅ You updated alice's email to <code>${escapeHtml(sess.email)}</code>
    yourself — a legitimate, same-site request (not CSRF).</p>`;
}

function deniedBanner(msg = '⛔ Request rejected — CSRF check failed.') {
  return `<div class="denied">${escapeHtml(msg)}</div>`;
}

module.exports = {
  escapeHtml, SITE, DEFAULT_EMAIL, ATTACKER_EMAIL, randomToken,
  parseCookies, getSession, effectiveReferer, isCrossSite,
  page, nav, hintPanel, goalBanner, solvedBanner, sourcePanel, successExplanation,
  recapPanel, stagePage, accountCard, attackerConsole, accountView, afterChange,
  changedBanner, legitBanner, deniedBanner,
};
