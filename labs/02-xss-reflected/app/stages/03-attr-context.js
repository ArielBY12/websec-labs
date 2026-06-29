'use strict';

// Stage 3 — the dev stops blacklisting and actually HTML-encodes the term, so
// `<`, `>` and `&` become entities and NO tag can be injected any more (the
// Stage 1 & 2 payloads all die here). But the term is reflected into a
// double-quoted attribute, and the encoder never touches the quote `"` that
// delimits it — so the value can break OUT of the attribute. Right idea
// (encode on output), wrong scope for the context.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 3,
  slug: 'attr-context',
  title: 'HTML-encoded — but inside an attribute',
  defense: 'Encodes <>& on output… but reflects into a quoted attribute.',
  hint: "Tag injection is dead — <code>&lt;</code> and <code>&gt;</code> are encoded now. But look <em>where</em> your term lands: inside <code>value=\"…\"</code>. Which character ends that attribute, and did the encoder touch it? You don't need a single <code>&lt;</code> to add a new attribute.",
  lesson: 'Encoding must fit the context: in a quoted attribute you must also encode the quote that delimits it.',
  explanation:
    "The encoder handled <code>&lt; &gt; &amp;</code> — perfect for HTML <em>text</em>, so no tag injection works. " +
    "But your term was written inside <code>value=\"…\"</code>, and the quote <code>\"</code> was never encoded. " +
    "Your <code>\"</code> closed the attribute early, and everything after it — <code>autofocus onfocus=alert(1)</code> — " +
    "became live attributes on the element. Same encode-on-output idea, wrong scope for the context.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => {
      const q = req.query.q;
      let result = '', fired = false;
      if (q !== undefined) {
        const enc = q.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        fired = enc.includes('"');
        result = `<label>You searched for</label><input class="echo" value="${enc}">`;   //! reflected into a "quoted" attribute, but the quote delimiter itself was never encoded → breakout
      }
      res.send(shared.stagePage(ctx, { content: shared.searchForm(ctx.mount, q || ''), result, success: fired }));
    });

    return r;
  },
};
