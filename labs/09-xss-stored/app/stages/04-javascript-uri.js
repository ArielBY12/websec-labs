'use strict';

// Stage 4 — the comment text is fully encoded, and a reviewer may attach a "website"
// link. The text is safe, but the link's scheme isn't checked.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'javascript-uri',
  title: 'javascript: URI in a link',
  defense: 'HTML-encodes the comment; renders a website link.',
  hint: "The comment body is properly encoded now. But your <em>website</em> becomes <code>&lt;a href=\"…\"&gt;</code> and the URL scheme isn't validated. Set website to <code>javascript:alert(1)</code> — it runs when the link is clicked.",
  lesson: 'HTML-encoding a URL isn’t enough — an unvalidated scheme lets javascript:/data: URIs execute; allowlist http(s).',
  explanation:
    "Encoding stopped tag injection, but a URL sink needs scheme validation too: <code>href=\"javascript:…\"</code> executes on click regardless of HTML-encoding. Only allow <code>http:</code>/<code>https:</code> (and reject <code>javascript:</code>, <code>data:</code>, etc.).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const comments = [];
    const render = () => comments.map((c) => {
      const link = c.website ? ` — <a href="${shared.escapeHtml(c.website)}">website</a>` : '';   //! the href scheme is never validated — a javascript: URI executes on click
      return `<p>${shared.escapeHtml(c.text)}${link}</p>`;
    }).join('');

    const view = () => {
      const html = render();
      return { content: shared.commentForm(ctx, [
        { name: 'text', label: 'Comment', placeholder: 'Say something…' },
        { name: 'website', label: 'Your website (optional)', placeholder: 'https://…' },
      ]) + shared.board(html), success: shared.looksExecutable(html) };
    };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, view())));
    r.post('/comment', (req, res) => {
      comments.push({ text: req.body.text || '', website: req.body.website || '' });
      res.send(shared.stagePage(ctx, view()));
    });
    return r;
  },
};
