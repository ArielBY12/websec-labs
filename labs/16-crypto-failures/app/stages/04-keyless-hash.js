'use strict';

// Stage 4 — integrity via a keyless hash (md5) appended to the payload.

const express = require('express');
const crypto = require('crypto');
const shared = require('../shared');

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

module.exports = {
  stage: 4,
  slug: 'keyless-hash',
  title: 'Keyless hash as "MAC"',
  defense: 'Appends md5(payload) to detect tampering.',
  hint: "The token is <code>base64(payload).md5(payload)</code>. But md5 needs no secret — you can compute it too. Build <code>admin|admin</code>, append its md5, and present it.",
  lesson: 'A plain hash is not a MAC — without a secret key, anyone can recompute it for forged data.',
  explanation:
    "Integrity requires a secret the attacker lacks. Since <code>md5</code> is keyless, recomputing it for <code>admin|admin</code> produced a valid-looking token. Use a keyed MAC (HMAC) with a secret key.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const issue = (u, role) => { const p = `${u}|${role}`; return `${Buffer.from(p).toString('base64')}.${md5(p)}`; };
    const verify = (t) => {
      const [b, sig] = String(t).split('.');
      if (!b || !sig) return null;
      const p = Buffer.from(b, 'base64').toString('utf8');
      if (md5(p) !== sig) return null;   //! integrity via a keyless hash — anyone can recompute md5(payload) for a forged payload
      const [user, role] = p.split('|'); return { user, role };
    };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.tokenCard(ctx, issue('alice', 'user')) })));
    r.get('/verify', (req, res) => res.send(shared.verifyPage(ctx, verify(req.query.token || ''), issue('alice', 'user'))));
    return r;
  },
};
