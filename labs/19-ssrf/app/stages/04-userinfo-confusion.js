'use strict';

// Stage 4 — the host is extracted with a regex that also captures userinfo.

const express = require('express');
const shared = require('../shared');

module.exports = {
  stage: 4,
  slug: 'userinfo-confusion',
  title: 'URL parser confusion (userinfo)',
  defense: 'Extracts the host with a regex, then blocks internal.',
  hint: "The host is pulled out with a regex that grabs everything after <code>://</code> up to the first slash — including any <code>user@</code> part. A real URL parser ignores userinfo. Try <code>http://foo@169.254.169.254/</code>.",
  lesson: 'A homemade URL parser disagrees with the real client about the host — userinfo, backslashes, and fragments cause SSRF.',
  explanation:
    "The regex saw <code>foo@169.254.169.254</code> (not a recognized internal host), while the actual fetch used the real hostname <code>169.254.169.254</code>. Parse URLs with the same library the client uses, and validate its <code>hostname</code>.",
  status: 'vulnerable',

  createRouter(ctx) {
    const r = express.Router();
    r.get('/', (req, res) => res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, 'http://foo@169.254.169.254/') })));
    r.post('/fetch', (req, res) => {
      const url = req.body.url || '';
      const host = (url.match(/^https?:\/\/([^/?#]+)/) || [])[1] || '';   //! host extracted with a regex that includes userinfo — user@internal defeats the check
      if (shared.isInternalHost(host))
        return res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url), result: shared.deniedBanner('⛔ Internal host blocked.') }));
      const resp = shared.fakeFetch(url);
      res.send(shared.stagePage(ctx, { content: shared.fetchForm(ctx, url) + shared.responsePanel(url, resp), success: shared.ssrfLeaked(resp.body) }));
    });
    return r;
  },
};
