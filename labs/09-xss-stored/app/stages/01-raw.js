'use strict';

// Stage 1 — reviews are stored and rendered back with no output encoding at all.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 1,
  slug: 'raw',
  title: 'Raw stored output',
  defense: 'None — comments are echoed verbatim.',
  hint: "Whatever you post is stored and shown to every visitor exactly as typed. Post a review containing <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> and reload — it runs.",
  lesson: 'Stored input rendered without output encoding executes in every viewer’s browser.',
  explanation:
    "The comment was written straight into the page HTML, so the browser parsed your <code>&lt;script&gt;</code> as a real script tag. Stored XSS is worse than reflected: it fires for everyone who views the page. The fix is contextual output encoding at render time.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const comments = [];
    const render = () => comments.map((c) => `<p>${c.text}</p>`).join('');   //! stored comment is written into the page with no output encoding — stored XSS

    const view = () => {
      const html = render();
      return { content: shared.commentForm(ctx) + shared.board(html), success: shared.looksExecutable(html) };
    };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, view())));
    r.post('/comment', (req, res) => {
      comments.push({ text: req.body.text || '' });
      res.send(shared.stagePage(ctx, view()));
    });
    return r;
  },
};
