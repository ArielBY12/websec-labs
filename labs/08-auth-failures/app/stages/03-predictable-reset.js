'use strict';

// Stage 3 — the admin password is now strong, but the password-reset flow mints
// tokens an attacker can predict.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'predictable-reset',
  title: 'Predictable reset token',
  defense: 'Strong admin password; reset via a token link.',
  hint: "Brute force is hopeless (the admin password is long and random). But look at the reset flow: <code>POST /forgot</code> issues a reset token, and <code>POST /reset</code> sets a new password for whoever owns that token. Request a reset for <em>your own</em> account and read the token in your inbox (<code>GET /inbox?user=wiener</code>). Notice its shape — then request one for admin and <strong>predict</strong> admin's token.",
  lesson: 'A reset token must be unpredictable; a sequential/timestamp token lets an attacker forge the next one and hijack any account.',
  explanation:
    "Reset tokens were a simple incrementing counter, so after seeing one from your own reset request you could predict the very next value — the admin's. Reset tokens must be long, random (CSPRNG), single-use, and expiring, so knowing one tells you nothing about any other.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const users = {
      admin: { password: crypto.randomBytes(24).toString('hex'), role: 'admin' },
      wiener: { password: 'peter', role: 'user' },
    };
    const sessions = new Map();
    const tokens = new Map();     // username -> reset token
    let counter = 1000;
    const who = (req) => sessions.get(shared.parseCookies(req).lab8_sid);

    r.get('/', (req, res) => {
      const u = who(req);
      res.send(shared.stagePage(ctx, {
        content: u ? shared.dashboard(u.name, u.role)
          : shared.loginForm(ctx) + `<div class="card"><h3>Forgot password?</h3>
              <p class="hint"><code>POST /forgot</code> {username} sends a reset link;
              <code>GET /inbox?user=</code> reads a (non-admin) mailbox;
              <code>POST /reset</code> {token,password} sets a new password.</p></div>`,
        success: u?.role === 'admin',
      }));
    });

    r.post('/login', (req, res) => {
      const { username = '', password = '' } = req.body;
      const acct = users[username];
      if (!acct || acct.password !== password)
        return res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx), result: shared.deniedBanner() }));
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, { name: username, role: acct.role });
      res.setHeader('Set-Cookie', `lab8_sid=${sid}; Path=/`);
      res.send(shared.stagePage(ctx, { content: shared.dashboard(username, acct.role), success: acct.role === 'admin' }));
    });

    r.post('/forgot', (req, res) => {
      const { username = '' } = req.body;
      if (users[username]) tokens.set(username, String(counter++));   //! reset token is a predictable sequential counter — the next value is trivially guessable
      res.json({ ok: true, message: 'If the account exists, a reset link was sent.' });
    });

    // A user can read their own (non-admin) mailbox; the admin mailbox is off-limits.
    r.get('/inbox', (req, res) => {
      const user = req.query.user || '';
      if (!users[user] || users[user].role === 'admin') return res.json({ error: 'mailbox unavailable' });
      res.json({ user, resetToken: tokens.get(user) || null });
    });

    r.post('/reset', (req, res) => {
      const { token = '', password = '' } = req.body;
      const entry = [...tokens.entries()].find(([, t]) => t === token);
      if (!entry) return res.json({ error: 'invalid token' });
      users[entry[0]].password = password;
      tokens.delete(entry[0]);
      res.json({ ok: true, message: `Password updated for ${entry[0]}.` });
    });

    return r;
  },
};
