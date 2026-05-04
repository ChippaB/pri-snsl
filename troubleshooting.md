# Troubleshooting Guide

## Overview

Use this guide when the scanner shows an unexpected result or scanning cannot continue normally. The first sections are written for operators and do not require browser developer tools.

## Purpose

Troubleshooting should answer three questions:

1. What do I see on the screen?
2. What is the likely cause?
3. What should I do next?

## Quick Symptom Map

| Symptom | Likely cause | Fix |
|---|---|---|
| `SCAN REJECTED`, `INVALID SCAN`, or red error | Barcode was incomplete, too short, damaged, or not recognized. | Clean the label, scan the full barcode once more, then set aside if it fails again. |
| `DUPLICATE` | The same serial was recently scanned or already exists in the database. | Do not keep rescanning. Check recent scans and set aside if unclear. |
| `QUEUED` | Scan saved on the tablet but not yet sent to the database. | Keep scanning if needed. Leave the app open until pending count returns to zero. |
| Pending count stays above zero | Wi-Fi, internet, database reachability, or sync retry issue. | Check badges, wait 30 to 60 seconds, then reload once only if both badges are green. |
| Operator or station list does not load | Tablet cannot reach configuration data yet. | Check Wi-Fi, refresh once, and contact a supervisor if still missing. |
| Scan box is gray or locked | A scan is still processing or the app is loading. | Wait. If locked longer than 35 seconds, retry after it unlocks or contact a supervisor. |
| App seems outdated | Browser cache is serving an old app version. | Hard refresh or clear browser cache only after pending count is zero. |
| Daily report missing | No scans, delayed workflow, missing secret, or email issue. | Supervisor/admin should check GitHub Actions and report settings. |

## Step-by-Step Instructions

### Scan Not Accepted

Symptoms:

- Red screen flash.
- Message says `SCAN REJECTED`, `INVALID SCAN`, `Too short`, `Contains invalid characters`, or `INVALID FORMAT`.
- The scan does not appear as saved.

Likely causes:

- The scanner did not capture the full barcode.
- The label is dirty, damaged, wrinkled, or partly covered.
- The barcode format is not one the scanner recognizes.
- Operator or station was not ready yet.

Fix:

1. Read the message on the screen.
2. Clean the label.
3. Make sure the scan beam crosses the full barcode.
4. Scan once more.
5. If the same item fails again, set it aside for supervisor review.
6. If every item of the same product fails, stop that product type and notify a supervisor.

### Duplicate Confusion

Symptoms:

- Amber warning.
- Message says `DUPLICATE` or `DUPLICATE (recent scan)`.

Likely causes:

- Same operator scanned the same serial within about 5 seconds.
- The serial already exists in the main database.
- A queued scan was retried and the database recognized it as already saved.

Fix:

1. Do not keep rescanning the same label.
2. Check the recent scan list for that serial.
3. If it is listed, move on.
4. If it is not listed and the item should be new, set it aside for supervisor review.

Notes:

- `DUPLICATE (recent scan)` is blocked on the tablet before sending.
- `DUPLICATE` without the recent-scan text came back from the database and is treated as complete for sync cleanup.

### Offline Scanning

Symptoms:

- Internet badge shows offline.
- Database badge shows down or checking.
- Scan result says `QUEUED`.
- Pending scan count increases.

Likely causes:

- Tablet lost Wi-Fi or internet.
- Internet is available, but the database is not reachable.
- Database response was too slow.

Fix:

1. Keep scanning if production needs to continue.
2. Keep the app open.
3. Watch the pending count.
4. When badges return to green or OK, wait 30 to 60 seconds.
5. Do not clear browser data while pending count is above zero.
6. At end of shift, notify a supervisor if pending count is still above zero.

### Stuck Queue

Symptoms:

- Pending scan count stays above zero.
- Scans keep showing `QUEUED`.
- Internet badge is online but database badge is down, slow, or checking.

Likely causes:

- Database is still unreachable.
- The browser has not retried the queue yet.
- A retryable failure is still pending.

Fix:

1. If internet badge is offline, reconnect Wi-Fi.
2. If database badge is down, leave the app open and wait.
3. If both badges are green or OK, wait 30 to 60 seconds.
4. If the count does not move and both badges are green or OK, reload the page once.
5. After reload, wait another 30 to 60 seconds.
6. If still stuck, leave the app open and notify a supervisor.

Supervisor notes:

- Queue records are stored in browser IndexedDB.
- Startup and browser online events trigger queue flush attempts.
- Do not clear site data unless pending scans have already synced or the data has been recovered another way.

### Login, Operator, or Station Issues

Symptoms:

- Operator list shows loading.
- Your name is missing.
- Station is wrong or missing.
- Scan happened under the wrong operator or station.

Likely causes:

- Configuration data did not load yet.
- Operator or station is not active in the database.
- Previous tablet selection was saved locally.

Fix:

1. Wait a few seconds for lists to finish loading.
2. Check Wi-Fi.
3. Refresh once.
4. Select the correct operator and station before scanning.
5. If your name or station is still missing, ask a supervisor to verify the active operator/station list.
6. If scans were recorded under the wrong operator or station, use the dashboard correction process instead of deleting blindly.

### Locked Scan Box

Symptoms:

- Scan field is gray.
- You cannot type or scan.
- Message says sending or timeout.

Likely causes:

- The app is processing the last scan.
- The app is still loading.
- A slow network request hit the safety timeout.

Fix:

1. Wait for the scan box to unlock.
2. If a timeout message appears, scan the item once more.
3. If the scan box stays locked longer than 35 seconds, notify a supervisor.
4. Refresh only if a supervisor confirms pending scans are safe.

### Stale Version or Cache Issue

Symptoms:

- Version badge does not match the expected version.
- A recently fixed issue still happens on one tablet.
- Other tablets behave differently.

Likely causes:

- Browser cache or service worker still has older app files.

Fix:

1. Confirm pending scan count is zero.
2. Try a hard refresh.
3. If using a tablet browser, close all scanner tabs and reopen the app.
4. If still stale, clear browser cache for the site.
5. Do not clear site data while pending scans are above zero.

### Daily Report Missing

Symptoms:

- Expected daily email did not arrive.
- Report attachment is missing.

Likely causes:

- No scans existed for the report date.
- GitHub scheduled workflow was delayed or skipped.
- GitHub secret is missing or expired.
- Email sending failed.
- Report date/timezone did not match expectations.

Fix for supervisor/admin:

1. Open GitHub Actions.
2. Check the `Daily Build Report` workflow.
3. Confirm whether the scheduled run completed.
4. If needed, run the workflow manually with the target date in `YYYY-MM-DD` format.
5. If the run failed, check whether `SUPABASE_URL`, `SUPABASE_KEY`, `SMTP_EMAIL`, `SMTP_PASSWORD`, and `REPORT_RECIPIENTS` are present.
6. If no scans were found, verify the date range in Supabase before rerunning.

## Edge Cases and Warnings

- `QUEUED` is a success state for the operator because the scan was saved locally.
- A database duplicate is removed from the queue because the database already has that idempotency key or equivalent record.
- Repeated rescans can create confusion. Stop after one retry unless instructed.
- Clearing browser site data can remove queued scans.
- Browser private/incognito mode should not be used for production scanning.

## Notes and Limitations

- Operator-safe fixes should not require developer tools.
- Technical behavior is documented in [Idempotency and Deduplication Contract](idempotency-dedup.md) and [Barcode Parsing Contract](barcode-parsing.md).
- If docs and code disagree, active runtime code wins until the documentation is corrected.
