'use strict';

// Stage 4 — the developer is almost there: instead of blacklisting bad URLs, only
// allow what looks like a path on this site — it must start with "/" and must not
// be a protocol-relative "//host". This blocks every earlier payload… but the
// browser treats a backslash in the authority position like a slash, so "/\host"
// is protocol-relative too — and this check never looks for it.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'require-slash',
  title: 'Require a leading-slash path',
  defense: 'Must start with "/" and not be "//".',
  hint: "Now the URL must start with <code>/</code> and can't start with <code>//</code> — so absolute and protocol-relative URLs are out. But browsers treat a <strong>backslash</strong> like a slash in this position. What does the browser do with <code>/\\evil.example</code>?",
  lesson: 'Browsers normalize backslashes to slashes, so "/\\host" and "\\/host" are protocol-relative — blocking only "//" misses them.',
  explanation:
    "The check required a leading <code>/</code> and rejected <code>//</code>, which felt like \"relative paths only\". But the browser reads backslashes in the authority position as slashes, so <code>/\\evil.example</code> is parsed as <code>//evil.example</code> — a protocol-relative URL to an external host. " +
    "Your input started with a single <code>/</code> (passes) and wasn't literally <code>//</code> (passes), yet it still left the site. A string check that doesn't model the parser keeps losing.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();

    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.urlForm(ctx.mount) })));

    r.get('/go', (req, res) => {
      let target = req.query.url || '/';
      if (!target.startsWith('/') || target.startsWith('//')) target = '/';   //! requires a leading "/" and blocks "//" — but "/\\host" starts with "/", isn't "//", and the browser still treats it as protocol-relative
      const offsite = shared.isOffsite(target);
      res.send(shared.stagePage(ctx, { result: shared.redirectView(target, offsite), success: offsite }));
    });

    return r;
  },
};
