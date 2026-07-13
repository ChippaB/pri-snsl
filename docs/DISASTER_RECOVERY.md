# Disaster Recovery Guide

## Purpose

Use this guide during catastrophic or business-threatening PRI-SNSL failures.

The goal is operational continuity: preserve scan data first, keep production moving if safe, restore sync, then restore reporting and admin convenience. This is not an engineering redesign document.

If instructions conflict during an incident, choose the path that preserves unsynced scan data.

## Recovery Priorities

1. Preserve scan data.
2. Preserve operational continuity.
3. Restore syncing.
4. Restore reporting.
5. Restore convenience/admin functions.

## System Dependency Map

| Component | Role | Failure impact |
|---|---|---|
| Browser/tablets | Operator scanning surface | Scanning stops or local-only queue risk increases |
| IndexedDB queue | Stores accepted unsynced scans locally | Unsynced production data can be lost if site data is cleared |
| Service worker/cache | Loads app shell offline and controls stale-version behavior | Tablets may run stale or broken app assets |
| Supabase | Source of truth for operators, stations, part map, and scans | Sync, config loading, dashboard, and reports fail |
| Vercel/static hosting | Serves scanner/dashboard/my-scans files | New loads and deployments fail; cached tablets may keep running |
| GitHub Actions reports | Manual report execution and report secrets | Daily report recovery/manual runs blocked if inaccessible |
| cron-job.org scheduling | Primary automatic daily report scheduler | Daily reports silently stop if scheduler is lost |

## Critical Recovery Warnings

- Do not clear browser site data if pending scans exist.
- Do not clear site data just because a cache looks stale.
- Browser queues may temporarily contain the only production copy of accepted scans.
- Closing/reopening a tab is safer than clearing site data.
- Rollback can still leave stale service workers on tablets.
- `force-cache-clear.html` is stale and not safe as an operator-facing procedure.
- Frontend Supabase config is hardcoded in browser files. Secret rotation or project migration requires redeploy and cache verification.
- GitHub Actions secrets cannot be read back. If lost, regenerate them.
- The daily report automatic scheduler is cron-job.org, not a GitHub `schedule:` block.

## Incident Severity Levels

| Severity | Definition | Examples | Immediate posture |
|---|---|---|---|
| SEV-1 scanning outage | Operators cannot scan or accepted scans may be lost | App will not load anywhere; scan field unusable; queues at risk of deletion | Stop risky troubleshooting; preserve devices; escalate immediately |
| SEV-2 partial sync degradation | Scanning continues but sync is impaired | `QUEUED` increasing; Supabase `DOWN`; stuck pending counts | Keep tablets open; continue only if business approves local queue risk |
| SEV-3 reporting failure only | Scanning and sync work, reports fail | Missing daily email; GitHub workflow failure; Gmail/Sheets issue | Recover reports manually; no scanner disruption |
| SEV-4 stale cache/version mismatch | Some devices show old behavior or version | One tablet stale; dashboard mismatch; old service worker | Verify pending count before any cache action |

## Immediate Triage Checklist

First 5 to 10 minutes:

- [ ] Identify severity: SEV-1, SEV-2, SEV-3, or SEV-4.
- [ ] Ask operators: are scans still being accepted as `SAVED` or `QUEUED`?
- [ ] Check whether pending counts are growing.
- [ ] Check whether issue affects one tablet, several tablets, or all users.
- [ ] Check Internet badge and Supabase badge.
- [ ] Check whether operator/station lists load.
- [ ] Tell operators not to clear browser data.
- [ ] Tell operators with pending scans to leave the app open.
- [ ] If hosting/deploy issue is suspected, do not redeploy repeatedly before identifying rollback point.
- [ ] If report-only issue, do not disrupt scanner operations.

Decision tree:

1. If scans are accepted as `SAVED`, production scan path is currently working.
2. If scans are accepted as `QUEUED`, preserve tablets and investigate sync.
3. If scans are rejected or app cannot load, treat as SEV-1.
4. If only daily email is missing, treat as SEV-3.
5. If only one tablet is stale, treat as SEV-4 and protect its pending queue first.

## Scenario Playbooks

### Supabase Outage

Symptoms:

- Supabase badge shows `DOWN` or stays `CHECKING`.
- Operator/station lists fail to load.
- Scans show `QUEUED`.
- Pending count rises.
- Dashboard and reports cannot read current data.

Likely causes:

- Supabase service outage.
- Network path to Supabase unavailable.
- Supabase project auth/RLS/schema issue.
- Hardcoded frontend Supabase config mismatch.

Immediate actions:

1. Confirm whether scanner still accepts scans as `QUEUED`.
2. Tell operators to leave tablets open.
3. Do not clear site data.
4. Check whether all tablets are affected.
5. Check Supabase dashboard/status if account access is available.
6. If production must continue, decide whether local queuing risk is acceptable.

What NOT to do:

- Do not clear browser data.
- Do not delete/recreate Supabase tables.
- Do not rotate keys during triage unless confirmed as the cause.

Escalation point:

- TODO: Supabase recovery owner.
- TODO: backup Supabase owner.

Recovery verification:

- Supabase badge reaches `OK` or `SLOW`.
- Operator and station lists load.
- Pending count decreases to zero.
- Controlled scan saves or existing queued scans sync.
- Dashboard shows recent scans.

### Vercel/Hosting Outage

Symptoms:

- Scanner URL does not load on new sessions.
- Dashboard URL unavailable.
- Vercel deployment unavailable.
- Already-open tablets may still show cached app.

Likely causes:

- Vercel outage or project issue.
- Domain/DNS issue.
- Bad production deployment.
- Lost Vercel/GitHub integration.

Immediate actions:

1. Keep already-open scanner tablets open.
2. Determine whether cached tablets can continue scanning.
3. Check Vercel project status if access exists.
4. Identify last known-good deployment.
5. If hosting is broken but cached tablets still queue scans, preserve those devices.

What NOT to do:

- Do not close working cached tablets unnecessarily.
- Do not clear site data.
- Do not assume rollback fixes cached tablets immediately.

Escalation point:

- TODO: Vercel owner.
- TODO: backup Vercel owner.

Recovery verification:

- Scanner loads from production URL in a fresh browser.
- Version badge is expected.
- Supabase badge reaches `OK` or `SLOW`.
- Operator/station lists load.
- Controlled scan succeeds or queues for expected reason.

### Scanner Loads But Scans Never Sync

Symptoms:

- App loads.
- Scans show `QUEUED`.
- Pending count does not return to zero.
- Supabase badge may show `DOWN`, `SLOW`, or even `OK`.

Likely causes:

- Supabase unreachable.
- Auth/RLS/schema failure.
- Hardcoded Supabase key mismatch.
- Queue flush has not retried after recovery.
- One or more queued records are blocked.

Immediate actions:

1. Keep tablet app open.
2. Confirm Internet and Supabase badges.
3. If both badges are healthy, reload once only after noting pending count.
4. Wait 30 to 60 seconds.
5. If still stuck, escalate for queue metadata/Supabase log inspection.

What NOT to do:

- Do not clear site data.
- Do not repeatedly rescan the same items.
- Do not delete queued browser data.

Escalation point:

- TODO: supervisor queue recovery owner.
- TODO: Supabase admin.

Recovery verification:

- Pending count reaches zero.
- Dashboard shows the scanned records.
- New controlled scan returns `SAVED`.

### Stuck IndexedDB Queues

Symptoms:

- Pending count remains above zero after network/Supabase recover.
- Same tablet remains stuck while others work.
- Records may have retry/blocking metadata.

Likely causes:

- Blocked Supabase response such as auth/RLS/schema error.
- Queue flush trigger has not run.
- Browser-specific storage or service-worker state issue.

Immediate actions:

1. Preserve the tablet.
2. Keep scanner tab open.
3. Record operator, station, pending count, approximate scan time, and device.
4. Try one normal reload only if badges are healthy.
5. Escalate before any storage-clearing step.

What NOT to do:

- Do not clear IndexedDB.
- Do not clear site data.
- Do not uninstall/reinstall browser/app.
- Do not factory reset tablet.

Escalation point:

- TODO: technical admin trained to inspect IndexedDB.

Recovery verification:

- Pending count reaches zero.
- Supabase/dashboard contains the expected scans.
- Operator confirms no missing production scans.

### Broken Deployment

Symptoms:

- Issue begins immediately after deploy.
- Scanner fails to load or scan.
- Version badge changed.
- Dashboard or my-scans broken.

Likely causes:

- Bad frontend code.
- Bad hardcoded Supabase config.
- Missing static asset.
- Service worker cached broken release.

Immediate actions:

1. Stop further deploys.
2. Identify release commit and previous deployment.
3. Determine whether scanning can continue safely.
4. If scanner is broken globally, roll back using `docs/DEPLOYMENT.md`.
5. Tell operators not to clear site data.

What NOT to do:

- Do not keep pushing unverified fixes.
- Do not rotate credentials unless the deployment changed credentials.
- Do not clear tablet storage as a first response.

Escalation point:

- TODO: deployment owner.
- TODO: rollback approver.

Recovery verification:

- Production URL serves expected version.
- Scanner loads and scans.
- Supabase sync works.
- Dashboard reads data.
- Affected tablets no longer show broken behavior.

### Stale Service-Worker Deployment

Symptoms:

- One or more tablets show old behavior after a deploy.
- Version badge does not match expected release.
- Other devices behave correctly.

Likely causes:

- Old service worker/app cache still active.
- `CACHE_VERSION` was not bumped when needed.
- Browser cache did not refresh.

Immediate actions:

1. Check pending count on affected tablet.
2. If pending count is above zero, do not clear site data.
3. Close all scanner tabs and reopen.
4. Wait 30 to 60 seconds.
5. Escalate before using browser developer tools.

What NOT to do:

- Do not use `force-cache-clear.html` blindly.
- Do not clear site data while pending scans exist.
- Do not assume stale cache means scan data is safe.

Escalation point:

- TODO: tablet/cache recovery owner.

Recovery verification:

- Version badge matches expected version.
- Supabase badge healthy.
- Pending count remains safe.
- Controlled scan succeeds.

### Lost GitHub/Vercel/Supabase Access

Symptoms:

- No one can deploy, rollback, update Actions secrets, or access Supabase.
- Account owner left company or MFA/recovery is unavailable.

Likely causes:

- Single-person account ownership.
- Missing backup admins.
- Lost MFA/recovery email.

Immediate actions:

1. Preserve current working production state.
2. Do not start risky changes.
3. Identify which account is lost.
4. Use vendor account-recovery channels.
5. Confirm any remaining admins before removing old owners.

What NOT to do:

- Do not create replacement infrastructure without documenting cutover risk.
- Do not rotate frontend keys without deployment access.
- Do not assume GitHub secrets can be recovered.

Escalation point:

- TODO: business owner for account recovery.
- TODO: vendor support contacts.

Recovery verification:

- At least two PRI-controlled admins exist.
- Deployment/rollback access works.
- Supabase dashboard access works.
- GitHub Actions secrets can be updated.

### Lost cron-job.org Scheduler

Symptoms:

- Daily report email stops.
- GitHub Actions has no scheduled failure because workflow only has manual `workflow_dispatch`.

Likely causes:

- cron-job.org account lost.
- Job disabled.
- Trigger/auth URL expired or changed.

Immediate actions:

1. Run the `Daily Build Report` workflow manually in GitHub Actions for missed dates.
2. Confirm GitHub report secrets are present.
3. Locate cron-job.org owner and job.
4. Recreate scheduler only after trigger/auth method is confirmed.

What NOT to do:

- Do not assume GitHub is scheduling the report.
- Do not change report code just because the automatic email is missing.

Escalation point:

- TODO: cron-job.org owner.
- TODO: report business owner.

Recovery verification:

- Manual workflow produces expected report.
- cron-job.org trigger produces a GitHub workflow run.
- Next scheduled report arrives.

### Daily Reports Failing

Symptoms:

- Expected report email missing.
- GitHub workflow failed.
- SMTP, Supabase, or Sheets backup errors in logs.

Likely causes:

- No scans for date.
- Supabase report key missing/bad.
- Gmail app password expired.
- Recipient config wrong.
- Optional Google Sheets backup failed.
- cron-job.org scheduler did not trigger.

Immediate actions:

1. Confirm scanner/sync health first.
2. Open GitHub Actions `Daily Build Report`.
3. Run workflow manually for the target date.
4. Check logs for Supabase, SMTP, and Sheets errors.
5. If email failed but files generated, fix SMTP and rerun.

What NOT to do:

- Do not interrupt scanner operations for a report-only incident.
- Do not rotate all secrets at once.

Escalation point:

- TODO: report owner.
- TODO: GitHub Actions secrets owner.

Recovery verification:

- Manual report run completes.
- Email arrives to expected recipients.
- If Sheets backup is required, rows append to expected sheet.

### Tablet/Browser Corruption

Symptoms:

- Only one tablet fails.
- Other tablets scan and sync normally.
- App loads strangely, storage errors appear, or pending count is stuck.

Likely causes:

- Browser cache/storage corruption.
- Device network issue.
- Stale service worker.
- IndexedDB issue.

Immediate actions:

1. Check pending count.
2. If pending count is above zero, preserve tablet and escalate.
3. If pending count is zero, close/reopen scanner.
4. Try Wi-Fi reconnect.
5. If still broken and pending is zero, controlled cache clearing may be considered by a technical admin.

What NOT to do:

- Do not clear site data before checking pending count.
- Do not factory reset or replace device with pending scans.

Escalation point:

- TODO: device/tablet owner.
- TODO: queue recovery owner.

Recovery verification:

- Tablet loads expected version.
- Operator/station lists load.
- Controlled scan succeeds.
- Pending count returns to zero.

### Operator Accidentally Cleared Site Data

Symptoms:

- Pending count drops unexpectedly.
- Queued scans are missing from dashboard.
- Tablet lost operator/station selections.

Likely causes:

- Browser site data cleared.
- Browser profile reset.
- App reinstalled or storage wiped.

Immediate actions:

1. Stop scanning on that tablet until scope is understood.
2. Record operator, station, date/time range, product/labels likely affected.
3. Check Supabase/dashboard for scans from that period.
4. Compare physical production records/labels against dashboard data.
5. Re-scan only under supervisor-controlled reconciliation.

What NOT to do:

- Do not assume queued scans already synced.
- Do not mass-rescan without checking for duplicates.
- Do not delete database records to “start clean.”

Escalation point:

- TODO: production supervisor.
- TODO: Supabase/dashboard admin.

Recovery verification:

- Affected time range reconciled.
- Missing scans identified and re-entered only if needed.
- Duplicate risk reviewed.

### Unknown Production Version Mismatch

Symptoms:

- README, version badge, `app.js` comments, and `service-worker.js` disagree.
- Operators report mixed behavior across tablets.

Likely causes:

- Version references were not updated together.
- Some tablets cached old release.
- Rollback left mixed client state.

Immediate actions:

1. Identify expected production deployment in Vercel.
2. Check deployed `index.html` version badge.
3. Check deployed `service-worker.js` `CACHE_VERSION`.
4. Compare affected tablet version badge.
5. If source references disagree, prepare a corrective deployment.

What NOT to do:

- Do not clear site data just to force a version match.
- Do not rely on README alone as runtime proof.

Escalation point:

- TODO: deployment owner.

Recovery verification:

- Source version references align.
- Production deployment version is documented.
- Affected tablets show expected badge after safe refresh.

## Rollback vs Forward-Fix Guidance

Rollback when:

- Scanner is globally broken.
- Operators cannot scan.
- A deployment caused immediate production failure.
- A known-good previous deployment exists.
- No Supabase schema/credential change prevents rollback.

Forward-fix when:

- The issue is documentation-only.
- The issue is isolated to one stale tablet.
- A credential rotation or Supabase project change caused the issue and rollback cannot restore the old credential.
- The previous deployment has the same defect.
- The fix is small, understood, and can be verified safely.

Pause and escalate when:

- Pending scans may be lost.
- Account access is missing.
- Supabase ownership is unclear.
- Multiple systems failed at once.

## Data Preservation Guidance

IndexedDB queue rules:

- `QUEUED` means the scan was saved locally.
- Local queue database is browser IndexedDB.
- Queue records can be the only copy until Supabase sync succeeds.
- Clearing all site data can delete the queue.
- Browser cache and service-worker cache are separate from IndexedDB, but broad “clear site data” actions can remove both.

Operational rules:

1. Leave affected tablets powered on and browser open.
2. Record pending count before any action.
3. Record operator, station, product, and time range.
4. Prefer reload over storage clearing only when badges are healthy.
5. Use dashboard/Supabase to verify records before rescan.
6. Re-scan only under supervisor-controlled reconciliation.

## Recovery Verification Checklist

System is healthy again when:

- [ ] Scanner loads from production URL.
- [ ] Version badge is expected.
- [ ] Internet badge is online on production network.
- [ ] Supabase badge reaches `OK` or `SLOW`.
- [ ] Operator list loads.
- [ ] Station list loads.
- [ ] New controlled scan returns `SAVED`, or `QUEUED` only for a known accepted reason.
- [ ] Pending count returns to zero on affected tablets.
- [ ] Dashboard shows recent scans.
- [ ] My-scans works if used by operators/admins.
- [ ] Daily report can be run manually from GitHub Actions.
- [ ] Automatic scheduler is confirmed if the incident affected reports.
- [ ] No tablet with pending scans was cleared.
- [ ] Incident owner records what happened, what was recovered, and remaining risk.

## Ownership / Escalation Gaps

- TODO: production incident commander.
- TODO: Supabase owner and backup owner.
- TODO: Vercel owner and backup owner.
- TODO: GitHub repository owner and backup owner.
- TODO: GitHub Actions secrets owner.
- TODO: cron-job.org owner and backup owner.
- TODO: Gmail sender account owner and backup/recovery owner.
- TODO: Google Sheets/service account owner.
- TODO: tablet/device owner.
- TODO: IndexedDB queue recovery owner.
- TODO: deployment rollback approver.
- TODO: report business owner.

Dangerous single-person dependencies:

- cron-job.org account/job.
- Vercel project ownership.
- Supabase project ownership.
- GitHub repository/admin access.
- Gmail app-password ownership.
- Knowledge of how to inspect/recover browser IndexedDB queues.

## Immediate Recommendations

- Name a primary and backup owner for every TODO in this file.
- Create an incident contact sheet outside the repo.
- Create a supervisor runbook for IndexedDB queue inspection and recovery.
- Document the live Vercel project, production URL, production branch, and rollback method.
- Document cron-job.org job details and alert recipients.
- Create a secure credential recovery log per `docs/SECRETS_INVENTORY.md`.
- Replace or update `force-cache-clear.html` before using it in production recovery.
- Add a printable one-page outage card: “Do not clear site data; leave queued tablets open; call TODO.”
- Run a tabletop recovery drill for: Supabase down, tablet stuck queue, Vercel rollback, and missing daily report.
