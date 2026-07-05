'use strict';

// Stage 3 — the comment body is HTML-encoded, but the author name is placed inside
// an attribute and only < > are encoded there.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'attribute-context',
  title: 'Attribute-context breakout',
  defense: 'Encodes < and > in the author name.',
  hint: "The body is safely encoded, but your <em>author name</em> is dropped into <code>title=\"…\"</code> and only <code>&lt;</code>/<code>&gt;</code> are encoded there — not the quote. Close the attribute and add your own handler: author = <code>x\" onmouseover=\"alert(1)</code>.",
  lesson: 'Encoding must match the context — inside a quoted attribute the quote char is the delimiter that must be encoded.',
  explanation:
    "Escaping <code>&lt;</code>/<code>&gt;</code> is right for element text but useless inside an attribute: your <code>\"</code> ended the <code>title</code> value and started a new <code>onmouseover</code> handler. Encode for the exact sink — attribute values must escape quotes (and ideally use a strict encoder).",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    const comments = [];
    const encTextOnly = (s) => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');   //! inside a quoted attribute this encodes < > but NOT the quote — a " breaks out into a new handler
    const render = () => comments.map((c) =>
      `<p title="${encTextOnly(c.author)}">${shared.escapeHtml(c.text)}</p>`).join('');

    const view = () => {
      const html = render();
      return { content: shared.commentForm(ctx, [
        { name: 'author', label: 'Your name', placeholder: 'name' },
        { name: 'text', label: 'Comment', placeholder: 'Say something…' },
      ]) + shared.board(html), success: shared.looksExecutable(html) };
    };

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, view())));
    r.post('/comment', (req, res) => {
      comments.push({ author: req.body.author || 'anon', text: req.body.text || '' });
      res.send(shared.stagePage(ctx, view()));
    });
    return r;
  },
};
