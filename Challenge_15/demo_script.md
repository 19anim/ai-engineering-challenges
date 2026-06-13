# Challenge 15 Demo Script

Use the deployed admin UI or run locally through a static server.

## 1. Compare Existing Tenants

1. Open the admin UI.
2. Select `SafeGuard Insurance`.
3. In Config diff, compare against `HealthFirst`.
4. Confirm highlighted differences across claim types, approval thresholds, notifications, SLA, and custom fields.

## 2. Process the Same Claim Across Tenants

1. Select claim type `OUTPATIENT`.
2. Set amount to `15000`.
3. Switch between SafeGuard, HealthFirst, and GovHealth.
4. Confirm the preview output changes:
   - SafeGuard can auto-approve under its threshold and requires Employee ID.
   - HealthFirst routes above its lower threshold and has no custom fields.
   - GovHealth routes to manual review and requires Department and Budget Code.

## 3. Create a Fourth Tenant

1. Enter `Demo Mutual` in New tenant name.
2. Click Create Tenant.
3. Edit the JSON config to set desired claim types, SLA, documents, approval threshold, and notifications.
4. Click Save Version.
5. Select the tenant and process a sample claim in Preview mode.

## 4. Roll Back a Version

1. Make a small config change in the JSON editor.
2. Click Save Version.
3. Select an older version in Config history / rollback.
4. Click Rollback and confirm the editor and preview return to the older configuration.
