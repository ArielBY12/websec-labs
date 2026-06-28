---
name: new-stage
description: Add a progressive stage to an existing WebSec Labs challenge — append app/stages/NN-slug.js with one stronger-but-still-bypassable defense, add its PoC to the exploit test, update lab.json stages[] and the README, keeping each stage a minimal diff from the previous. Use when the user wants to add a level/stage to a lab (e.g. "add a harder stage to the SQLi lab", "add a WAF-bypass stage").
---

# new-stage

Add one stage to a challenge. A stage adds exactly **one** new defense that is
still bypassable (unless it's the fix). Keep it a minimal diff from the prior
stage so `git diff` reads as the lesson.

## Steps
1. **Read context:** `CLAUDE.md`, the lab's `lab.json`, the previous stage file,
   and `exploit/*.test.js`. Note the current numbering and which stage is `secure`.
2. **Pick the defense + intended bypass.** It must be plausible (a real developer
   mistake) and bypassable. Write down the exact PoC payload you'll use.
3. **Create `app/stages/NN-slug.js`:** copy the previous stage and change *only*
   the security-relevant lines. Mark them with 🟠 (vulnerable) / 🟢 (secure).
   Update `stage`, `slug`, `title`, `defense`, `hint`. Each stage owns its own DB.
   - The fixed stage must stay **last**. If inserting before it, renumber so
     `fixed` keeps the highest `stage` number (and `/fixed` mount via `status`).
4. **Update `lab.json` `stages[]`** to match the new module (stage, slug, title,
   defense, status). Count/slug/status must match the files on disk.
5. **Add the PoC to `exploit/*.test.js`:** an entry in `POCS` so the new vulnerable
   stage is asserted exploitable, and so `/fixed` is asserted to resist it.
6. **Update `README.md`:** a new stage section (defense · exploit · why it fails).
7. **Verify:** run the `verify-lab` skill (or `cd exploit && npm test`). The new
   stage's PoC must pass and `/fixed` must still resist everything.

## Guardrails
- One new defense per stage; don't fix earlier stages.
- Minimal diff; keep the file short and the key line marked.
- Don't accidentally make a non-final stage unbypassable — the test will catch it,
  but aim for a real, demonstrable bypass.
