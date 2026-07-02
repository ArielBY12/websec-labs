'use strict';

// Stage 5 — tokens are RS256 (asymmetric): signed with a private key, verified with
// the public key. The public key is published (as a real JWKS would be).

const express = require('express');
const shared = require('../shared');

// The exact public-key string we publish — and (buggily) reuse as an HMAC secret.
// Using one canonical form means a learner can copy the shown key and it matches.
const PUB = shared.RSA_PUBLIC.trim();

module.exports = {
  stage: 5,
  slug: 'alg-confusion',
  title: 'RS256 / HS256 algorithm confusion',
  defense: 'Verifies the token with the RSA public key.',
  hint: "Tokens are RS256 now and you don't have the private key — so you can't forge an RS256 signature. But the verifier picks its method from the token's <code>alg</code>. The RSA <strong>public</strong> key is shown on the page (it's public). What if you switch <code>alg</code> to <code>HS256</code> and sign with HMAC, using that public-key PEM as the secret?",
  lesson: "Pin the algorithm to the key type — verifying an HS256 token with an RSA public key turns that public value into a usable HMAC secret (algorithm confusion).",
  explanation:
    "The verifier chose HS256 vs RS256 from the token's own <code>alg</code> header, and reused the RSA <em>public</em> key for both. The public key is, by definition, known — so signing a token with HMAC-SHA256 using the public-key PEM as the secret produced a signature the server accepted. " +
    "Pin the expected algorithm and use a key appropriate to it; never let the token pick.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => {
      let token = shared.tokenFrom(req);
      if (!token) {
        token = shared.signRS256({ user: 'alice', role: 'user' }, shared.RSA_PRIVATE);
        res.cookie('lab6_token', token);
      }
      const payload = shared.parseJwt(token).payload || {};
      const pubBox = `<div class="card"><h3>Public key (JWKS)</h3><pre>${shared.escapeHtml(PUB)}</pre>
        <p class="hint">This is published on purpose — it's the <em>public</em> key.</p></div>`;
      res.send(shared.stagePage(ctx, { content: shared.dashboard(payload) + shared.tokenBox(token) + pubBox }));
    });

    r.get('/admin', (req, res) => {
      const token = shared.tokenFrom(req);
      const { header, payload } = shared.parseJwt(token);
      let ok = false;
      if (header?.alg === 'RS256') ok = shared.verifyRS256(token, shared.RSA_PUBLIC);
      else if (header?.alg === 'HS256') ok = shared.verifyHS256(token, PUB);   //! verifies an HS256 token using the RSA *public* key as the HMAC secret — algorithm confusion
      if (!ok || payload?.role !== 'admin') return res.send(shared.stagePage(ctx, { result: shared.deniedBanner() }));
      res.send(shared.stagePage(ctx, { result: shared.adminView(), success: true }));
    });

    return r;
  },
};
