---
name: verify-lab
description: Validate a WebSec Labs challenge before committing — run its exploit tests, confirm every vulnerable stage is still exploitable and only the fixed stage resists all PoCs, and check lab.json stages match the modules on disk. Use after editing a lab or before a commit (e.g. "verify the SQLi lab", "is the lab still green?").
---

# verify-lab

The safety net that catches the most likely mistakes: an accidentally-hardened
vulnerable stage, a broken fix, or lab.json drifting from the stage modules.

## Steps
1. **Run the exploit tests** for the lab:
   ```bash
   cd labs/<id>/exploit && npm install && npm test
   ```
   All must pass:
   - each vulnerable stage's PoC **succeeds** (the bug is real),
   - the `secure` stage **resists every PoC**,
   - valid input still works (positive control),
   - the **drift guard** (lab.json stages == modules) passes.
2. **Smoke-test the app** (optional but recommended):
   ```bash
   cd labs/<id>/app && npm install && PORT=<free-port> npm start
   ```
   Open `/`, confirm the stage menu lists every stage, hit a PoC on `/s/1` and on
   `/fixed`, and confirm each stage page shows its "Vulnerable source" panel.
3. **Manual drift check** if there's no drift test yet: the count, slugs, and
   statuses in `lab.json.stages` must match `app/stages/NN-slug.js`.
4. **Report**: list what passed/failed. If a vulnerable stage is no longer
   exploitable, that's a regression — the defense leaked from a later stage; fix
   the stage, don't relax the test.

## Notes
- Don't mark a lab `done` (in lab.json / root README) until this passes.
- If you can't run tests, say so explicitly rather than assuming green.
