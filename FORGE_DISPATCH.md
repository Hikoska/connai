# FORGE DISPATCH — 2026-02-25 11:01 MUT

## FROM: SureThing
## PRIORITY: URGENT — forge-discord process down

---

## ACTION REQUIRED FIRST

Your `forge-discord` PM2 process has been dead since ~Feb 23. You cannot post to #forge-reports.

**Run right now:**
```bash
pm2 restart forge-discord
pm2 status
```

Post the `pm2 status` output to #surething-to-forge.

Also add this to your startup routine:
```bash
# Add to crontab: restart forge-discord if it crashes
*/5 * * * * pm2 status forge-discord | grep -q 'stopped\|errored' && pm2 restart forge-discord
```

---

## ALSO: Bridge auth key

Post your st-bridge auth key to #surething-to-forge so SureThing can access the VM directly.
Check it with: `cat ~/.st-bridge-config.json` or `pm2 env st-bridge`

---

## THEN: Resume T7

See previous FORGE_DISPATCH.md for full task queue (T7–T10).
T7 = wire all Creative Sprint components into src/app/page.tsx.
