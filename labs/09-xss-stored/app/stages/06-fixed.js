'use strict';

// Stage 6 — the fix: encode every value for the exact context it lands in, allowlist
// link schemes, and add a Content-Security-Policy as defense-in-depth.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 6,
  slug: 'fixed',
  title: 'Contextual output encoding + CSP',
  defense: 'Encodes each value for its context; allowlists href schemes; sets a CSP.',
  hint: '',
  lesson: 'Encode output for its exact context (text/attribute/URL), allowlist URL schemes, and layer a CSP — don’t blacklist input.',
  explanation:
    "Every value is HTML-encoded for where it lands — element text and attribute values both escape quotes — and links are allowed only for <code>http(s)</code> schemes, so tags, event handlers, attribute breakouts, and <code>javascript:</code> URIs are all inert. A <code>script-src 'none'</code> CSP is a second line of defense. Encoding at the sink, not filtering at the source, is what closes the whole class.",
  status: 'secure',

  createRouter(ctx) {
    const r = express.Router();
    const comments = [];
    const safeHref = (u) => /^https?:\/\//i.test(u) ? ` — <a href="${shared.escapeHtml(u)}">website</a>` : '';
    const render = () => comments.map((c) =>
      `<p title="${shared.escapeHtml(c.author)}">${shared.escapeHtml(c.text)}${safeHref(c.website)}</p>`).join('');   //! encode every value for its context (quotes included) and allow only http(s) hrefs

    const send = (res) => {
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'none'");
      const html = render();
      res.send(shared.stagePage(ctx, {
        content: shared.commentForm(ctx, [
          { name: 'author', label: 'Your name', placeholder: 'name' },
          { name: 'text', label: 'Comment', placeholder: 'Say something…' },
          { name: 'website', label: 'Your website (optional)', placeholder: 'https://…' },
        ]) + shared.board(html),
      }));
    };

    r.get('/', (req, res) => send(res));
    r.post('/comment', (req, res) => {
      comments.push({ author: req.body.author || 'anon', text: req.body.text || '', website: req.body.website || '' });
      send(res);
    });
    return r;
  },
};
