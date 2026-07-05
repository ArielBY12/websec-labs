'use strict';

// Stage 4 — logins are properly authenticated, but the session id is taken from the
// client and kept across the login boundary.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'session-fixation',
  title: 'Session fixation',
  defense: 'Real login; session id carried in a cookie.',
  hint: "The password checks are solid now. But notice the session id: the server accepts one you supply (cookie or <code>?sid=</code>) and keeps the <em>same</em> id after login instead of issuing a fresh one. Fix a session id, get the admin to authenticate on it (the demo <code>GET /victim-visit</code> stands in for the phished admin following your link), then use that same id yourself.",
  lesson: 'If the session id is attacker-settable and not rotated on login, an attacker fixes an id, the victim authenticates it, and the attacker rides the session.',
  explanation:
    "The server honored a client-chosen session id and did not regenerate it when the user logged in, so a session id you fixed in advance became authenticated the moment the victim signed in on it. Always issue a brand-new session id at login (and never accept one from a URL).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const users = {
      admin: { password: crypto.randomBytes(24).toString('hex'), role: 'admin' },
      wiener: { password: 'peter', role: 'user' },
    };
    const sessions = new Map();

    function sidOf(req, res) {
      let sid = shared.parseCookies(req).lab8_sid || req.query.sid;   //! session id is taken from the client and reused across login — it is never regenerated (session fixation)
      if (!sid) sid = crypto.randomBytes(16).toString('hex');
      res.setHeader('Set-Cookie', `lab8_sid=${sid}; Path=/`);
      return sid;
    }

    r.get('/', (req, res) => {
      const sid = sidOf(req, res);
      const u = sessions.get(sid);
      res.send(shared.stagePage(ctx, {
        content: u ? shared.dashboard(u.name, u.role)
          : shared.loginForm(ctx) + `<div class="card"><h3>Demo</h3>
              <p class="hint"><code>GET /victim-visit</code> simulates the admin following your
              link and logging in on the current session id.</p></div>`,
        success: u?.role === 'admin',
      }));
    });

    r.post('/login', (req, res) => {
      const sid = sidOf(req, res);
      const { username = '', password = '' } = req.body;
      const acct = users[username];
      if (!acct || acct.password !== password)
        return res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx), result: shared.deniedBanner() }));
      sessions.set(sid, { name: username, role: acct.role });   // note: same sid kept, not rotated
      res.send(shared.stagePage(ctx, { content: shared.dashboard(username, acct.role), success: acct.role === 'admin' }));
    });

    // Stand-in for the phished admin: authenticates admin on whatever sid is present.
    r.get('/victim-visit', (req, res) => {
      const sid = sidOf(req, res);
      sessions.set(sid, { name: 'admin', role: 'admin' });
      res.json({ ok: true, message: 'The admin logged in on the current session id.' });
    });

    return r;
  },
};
