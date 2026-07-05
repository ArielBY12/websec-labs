'use strict';

// Stage 1 — a plain login. The admin password is weak and there is no limit on
// how many guesses an attacker may make.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'no-lockout',
  title: 'No lockout — unlimited guesses',
  defense: 'None — a plain username/password check.',
  hint: "The admin username is known (<code>admin</code>) and there's no rate limit, lockout, or CAPTCHA — you can try passwords as fast as you like. The password is a common dictionary word. Point a small wordlist (think top-100 / rockyou head) at <code>POST /login</code> with <code>username=admin</code> until one succeeds.",
  lesson: 'Weak passwords plus no lockout or throttling let an attacker brute-force an account offline-fast, online.',
  explanation:
    "There was no attempt counter, delay, or lockout, so thousands of guesses per minute were possible — and the admin password was a common word, so a tiny wordlist cracked it. Defenses: rate-limit and lock accounts after repeated failures, and forbid weak/breached passwords.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const users = {
      admin: { password: 'sunshine', role: 'admin' },
      wiener: { password: 'peter', role: 'user' },
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
      if (!acct || acct.password !== password)   //! no attempt limit, delay, or lockout — an attacker can brute-force the weak admin password unhindered
        return res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx), result: shared.deniedBanner() }));
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, { name: username, role: acct.role });
      res.setHeader('Set-Cookie', `lab8_sid=${sid}; Path=/`);
      res.send(shared.stagePage(ctx, { content: shared.dashboard(username, acct.role), success: acct.role === 'admin' }));
    });

    return r;
  },
};
