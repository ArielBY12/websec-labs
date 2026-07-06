'use strict';

// Stage 6 — the fix: constant-time password verification with one generic error,
// lockout, random single-use reset tokens, a fresh session id at login, and a
// signed remember-me cookie.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

const REMEMBER_SECRET = crypto.randomBytes(32);
const DUMMY_SALT = crypto.randomBytes(16);
const GENERIC = '⛔ Invalid username or password.';
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32);
const makeUser = (pw, role) => { const salt = crypto.randomBytes(16); return { salt, hash: hashPw(pw, salt), role }; };
const signRemember = (user) => {
  const mac = crypto.createHmac('sha256', REMEMBER_SECRET).update(user).digest('base64url');
  return `${Buffer.from(user).toString('base64url')}.${mac}`;
};
function verifyRemember(cookie) {
  const [u, mac] = String(cookie).split('.');
  if (!u || !mac) return null;
  const user = Buffer.from(u, 'base64url').toString('utf8');
  const expected = crypto.createHmac('sha256', REMEMBER_SECRET).update(user).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? user : null;
}

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Verified, hardened authentication',
  defense: 'Constant-time check, one generic error, lockout, random tokens, session rotation, signed cookie.',
  hint: '',
  lesson: 'Authenticate in constant time with a strong hash; give one generic error; lock out brute force; use random single-use reset tokens; rotate the session id at login; sign persistent cookies.',
  explanation:
    "Every earlier attack fails here: the admin password is strong-hashed and lockout stops brute force; one generic error and equalized timing kill enumeration; reset tokens are CSPRNG and single-use; the session id is regenerated at login (and never read from the URL); and the remember-me cookie is HMAC-signed so it can't be rewritten. A genuine login still works.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const users = {
      admin: makeUser(crypto.randomBytes(24).toString('hex'), 'admin'),
      sam: makeUser('bluebird', 'user'),
    };
    const sessions = new Map();
    const tokens = new Map();
    const fails = new Map();

    function verify(username, password) {
      const acct = users[username];
      if (!acct) { hashPw(password, DUMMY_SALT); return false; }   // equalize timing for unknown users
      const cand = hashPw(password, acct.salt);
      return cand.length === acct.hash.length && crypto.timingSafeEqual(cand, acct.hash);
    }

    function identify(req) {
      const c = shared.parseCookies(req);
      const sess = sessions.get(c.lab8_sid);
      if (sess) return sess;
      const user = c.lab8_remember && verifyRemember(c.lab8_remember);
      return user && users[user] ? { name: user, role: users[user].role } : null;
    }

    r.get('/', (req, res) => {
      const u = identify(req);
      res.send(shared.stagePage(ctx, { content: u ? shared.dashboard(u.name, u.role) : shared.loginForm(ctx, { remember: true }) }));
    });

    r.post('/login', (req, res) => {
      const { username = '', password = '', remember = '' } = req.body;
      if ((fails.get(username) || 0) >= 5)
        return res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx, { remember: true }), result: shared.deniedBanner(GENERIC) }));
      if (!verify(username, password)) {
        fails.set(username, (fails.get(username) || 0) + 1);
        return res.send(shared.stagePage(ctx, { content: shared.loginForm(ctx, { remember: true }), result: shared.deniedBanner(GENERIC) }));
      }
      fails.delete(username);
      const sid = crypto.randomBytes(16).toString('hex');   //! issue a fresh session id at login (rotation), never from the client; verify in constant time with one generic error
      sessions.set(sid, { name: username, role: users[username].role });
      const cookies = [`lab8_sid=${sid}; Path=/; HttpOnly`];
      if (remember) cookies.push(`lab8_remember=${signRemember(username)}; Path=/; HttpOnly`);
      res.setHeader('Set-Cookie', cookies);
      res.send(shared.stagePage(ctx, { content: shared.dashboard(username, users[username].role) }));
    });

    r.post('/forgot', (req, res) => {
      const { username = '' } = req.body;
      if (users[username]) tokens.set(username, crypto.randomBytes(32).toString('hex'));   // unpredictable, single-use
      res.json({ ok: true, message: 'If the account exists, a reset link was sent.' });
    });

    r.get('/inbox', (req, res) => {
      const user = req.query.user || '';
      if (!users[user] || users[user].role === 'admin') return res.json({ error: 'mailbox unavailable' });
      res.json({ user, resetToken: tokens.get(user) || null });
    });

    r.post('/reset', (req, res) => {
      const { token = '', password = '' } = req.body;
      const entry = [...tokens.entries()].find(([, t]) => t === token);
      if (!entry) return res.json({ error: 'invalid token' });
      const salt = crypto.randomBytes(16);
      users[entry[0]] = { salt, hash: hashPw(password, salt), role: users[entry[0]].role };
      tokens.delete(entry[0]);
      res.json({ ok: true, message: `Password updated for ${entry[0]}.` });
    });

    return r;
  },
};
