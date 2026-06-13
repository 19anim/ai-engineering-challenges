# Challenge 15 - Multi-Tenant Configuration Platform

Open `index.html` through a static/local server. The admin UI supports tenant create/update/delete in browser memory, validation, preview mode via `processClaim`, config diff, version history, and rollback. `tenants.json` includes the three requested tenants.

## Run

Use a static/local server because the admin UI loads `tenants.json` with `fetch()`.

```bash
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/Challenge_15/`.

## Submission

- Provide a live URL for the admin UI.
- Include `tenants.json` and `demo_script.md`.

## Approach

- Tenant config covers branding, claim types, documents, approval tiers, notifications, SLA, and custom fields.
- `processClaim(tenantId, claimData)` returns required documents, routing, notifications, SLA deadline, custom field requirements, and validation misses.
- Config diff and version history expose operational changes without code changes.
