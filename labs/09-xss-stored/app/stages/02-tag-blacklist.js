'use strict';

// Stage 2 — a filter strips <script> tags before storing the comment.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 2,
  slug: 'tag-blacklist',
  title: 'Script-tag blacklist',
  defense: 'Removes <script> tags from comments.',
  hint: "Plain <code>&lt;script&gt;</code> is stripped now. But scripts aren't the only way to run JS — an element with an event handler does too. Try an image that fails to load: <code>&lt;img src=x onerror=alert(1)&gt;</code>.",
  lesson: 'A tag blacklist misses the huge space of other vectors — event-handler attributes need no <script> tag.',
  explanation:
    "Only <code>&lt;script&gt;</code> was filtered, so an <code>onerror</code> handler on a broken image executed instead. Blacklisting elements/attributes is a losing game — there are countless vectors (event handlers, <code>&lt;svg&gt;</code>, <code>&lt;iframe&gt;</code>). Encode output instead.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const comments = [];
    const clean = (s) => String(s).replace(/<script\b[^>]*>|<\/script>/gi, '');   //! blacklists only <script> tags — event-handler attributes (onerror/onload) still execute
    const render = () => comments.map((c) => `<p>${c.text}</p>`).join('');

    const view = () => {
      const html = render();
      return { content: shared.commentForm(ctx) + shared.board(html), success: shared.looksExecutable(html) };
    };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, view())));
    r.post('/comment', (req, res) => {
      comments.push({ text: clean(req.body.text || '') });
      res.send(shared.stagePage(ctx, view()));
    });
    return r;
  },
};
