'use strict';

// Stage 2 — the admin username is no longer obvious, but the login form answers a
// little too honestly about which usernames exist.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'user-enumeration',
  title: 'Username enumeration',
  defense: 'Hides the admin username; rejects unknown users.',
  hint: "You don't know the admin's username this time. But compare the error you get for a username that <em>doesn't</em> exist versus one that does with a wrong password — they differ. Use that oracle to find the real admin account among candidates (administrator, root, sysadmin, superadmin…). Freshly provisioned accounts here start with their <strong>username as the password</strong>.",
  lesson: 'Different responses (or timings) for “no such user” vs “wrong password” leak which accounts exist — the first half of a takeover.',
  explanation:
    "The login distinguished “no such user” from “wrong password”, so probing a list of names revealed the real admin username; a lazy default-password policy (password = username) did the rest. Return one generic message for every failed login, and don't let timing differ either.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const users = {
      superadmin: { password: 'superadmin', role: 'admin' },   // provisioned with username-as-password
      sam: { password: 'bluebird', role: 'user' },
    };
    const sessions = new Map();
    const who = (req) => sessions.get(shared.parseCookies(req).lab8_sid);

    r.get('/', (req, res) => {
      const u = who(req);
      res.send(shared.stagePage(ctx, {
        content: u ? shared.dashboard(u.name, u.role) : shared.loginForm(ctx),
        success: u?.role === 'admin',
      }));
    });

    r.post('/login', (req, res) => {
      const { username = '', password = '' } = req.body;
      const acct = users[username];
      if (!acct)   //! the "unknown user" message differs from "wrong password" — a yes/no oracle for which usernames exist
        return res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx), result: shared.deniedBanner('⛔ No account with that username.') }));
      if (acct.password !== password)
        return res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx), result: shared.deniedBanner('⛔ Incorrect password for that account.') }));
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, { name: username, role: acct.role });
      res.setHeader('Set-Cookie', `lab8_sid=${sid}; Path=/`);
      res.send(shared.stagePage(ctx, { content: shared.dashboard(username, acct.role), success: acct.role === 'admin' }));
    });

    return r;
  },
};
