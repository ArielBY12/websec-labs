'use strict';

// Stage 5 — the filter removes <script> tags, but only in a single pass over the
// original string.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 5,
  slug: 'nonrecursive-strip',
  title: 'Non-recursive tag stripping',
  defense: 'Strips <script>…</script> from comments.',
  hint: "The filter deletes <code>&lt;script&gt;</code> — but it runs once and doesn't re-scan its own output. Nest the tag so that deleting the inner one re-forms it: <code>&lt;scr&lt;script&gt;ipt&gt;alert(1)&lt;/scr&lt;script&gt;ipt&gt;</code>.",
  lesson: 'A single-pass strip can re-create the very pattern it removed — sanitizers must loop to a fixed point (or, better, encode).',
  explanation:
    "Removing <code>&lt;script&gt;</code> once from <code>&lt;scr&lt;script&gt;ipt&gt;</code> leaves <code>&lt;script&gt;</code> behind — the replacement isn't re-scanned. Iterative-strip sanitizers are notoriously bypassable; prefer output encoding or a vetted sanitizer that parses to a DOM.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const comments = [];
    const clean = (s) => String(s).replace(/<script>/gi, '').replace(/<\/script>/gi, '');   //! strips <script> once, non-recursively — <scr<script>ipt> collapses back into <script>
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
