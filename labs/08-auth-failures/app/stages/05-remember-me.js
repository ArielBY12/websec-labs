'use strict';

// Stage 5 — a "remember me" cookie keeps users logged in across visits. It encodes
// the username, but nothing stops you from rewriting it.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'remember-me',
  title: 'Forgeable "remember me" cookie',
  defense: 'Persistent login via a "remember me" cookie.',
  hint: "Check the box and log in as your own account, then look at the <code>lab8_remember</code> cookie. It's just <code>base64(username)</code> — no signature, no MAC. Decode it, swap in <code>admin</code>, re-encode, and set the cookie yourself.",
  lesson: 'A persistent-auth token that encodes identity without an integrity signature is attacker-forgeable — sign it (or store a random handle server-side).',
  explanation:
    "The remember-me cookie carried the username in reversible base64 with no integrity protection, so the server trusted whatever identity you encoded. Persistent tokens must be signed/encrypted (or be an opaque random handle mapped to a session server-side) so their contents can't be rewritten.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const users = {
      admin: { password: crypto.randomBytes(24).toString('hex'), role: 'admin' },
      sam: { password: 'bluebird', role: 'user' },
    };
    const sessions = new Map();

    function identify(req) {
      const c = shared.parseCookies(req);
      const sess = sessions.get(c.lab8_sid);
      if (sess) return sess;
      if (c.lab8_remember) {
        const name = Buffer.from(c.lab8_remember, 'base64').toString('utf8');   //! the "remember me" cookie is just base64(username) with no signature — forge it to any user
        if (users[name]) return { name, role: users[name].role };
      }
      return null;
    }

    r.get('/', (req, res) => {
      const u = identify(req);
      res.send(shared.stagePage(ctx, {
        content: u ? shared.dashboard(u.name, u.role) : shared.loginForm(ctx, { remember: true }),
        success: u?.role === 'admin',
      }));
    });

    r.post('/login', (req, res) => {
      const { username = '', password = '', remember = '' } = req.body;
      const acct = users[username];
      if (!acct || acct.password !== password)
        return res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx, { remember: true }), result: shared.deniedBanner() }));
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, { name: username, role: acct.role });
      const cookies = [`lab8_sid=${sid}; Path=/`];
      if (remember) cookies.push(`lab8_remember=${Buffer.from(username).toString('base64')}; Path=/`);
      res.setHeader('Set-Cookie', cookies);
      res.send(shared.stagePage(ctx, { content: shared.dashboard(username, acct.role), success: acct.role === 'admin' }));
    });

    return r;
  },
};
