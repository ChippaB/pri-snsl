# Onboarding Guide

## Purpose

This guide trains new PRI-SNSL operators, supervisors, temporary backups, and newly assigned admins on safe daily use of the scanning system.

The goal is simple: scan the right item under the right operator and station, read the result, protect queued scans, and ask for help before doing anything that could lose data.

This guide does not cover deployment, credential management, engineering changes, or disaster recovery.

## What PRI-SNSL Does

PRI-SNSL records production barcode scans.

When an operator scans a label, the scanner tries to capture:

- operator name
- station
- raw barcode
- part number
- serial number
- batch comment, if one is entered
- scan time

If the tablet is online and the database is reachable, the scan is saved immediately. If the tablet is offline or the database is temporarily unavailable, an accepted scan can be saved locally on that tablet as `QUEUED` and sent later.

Important idea:

`QUEUED` does not mean lost. It means the scan is waiting on that tablet.

## Basic Scanner Workflow

Use this process every time.

1. Open the scanner page on the production tablet.
2. Wait until the scan box says it is ready.
3. Select your correct operator name.
4. Select the correct station.
5. If your operator/station fields are locked, confirm they are correct before scanning.
6. If using a batch comment, enter it before scanning and clear it when it no longer applies.
7. Scan one complete barcode.
8. Read the result message.
9. Continue only after you understand the result.

Safe result rule:

- Continue on `SAVED`.
- Continue on `QUEUED`, but keep the scanner open and watch pending count.
- Stop and check before rescanning on `DUPLICATE`.
- Clean and rescan once on `INVALID` or `ERROR`; ask for help if it repeats.

## Understanding The Screen

| Screen item | What it tells you | What to do |
|---|---|---|
| Version badge | The scanner app version running on that tablet. | Tell a supervisor if your tablet shows a different version than other tablets. |
| Internet badge | Whether the tablet appears connected to the internet. | If offline, keep the scanner open and reconnect Wi-Fi. |
| Supabase badge | Whether the database is reachable. It may show checking, OK, slow, or down. | If down/checking for a long time and scans are queued, tell a supervisor. |
| Pending count | Number of accepted scans still waiting on that tablet. | Do not close/clear/reset the browser while this is above zero unless a supervisor tells you. |
| Recent scan/last scan area | Last part, serial, status, and recent scan history for the selected operator/station. | Use it to confirm the last scan before rescanning. |
| Operator selector | The person credited for the scan. | Confirm this before scanning. Wrong operator requires correction later. |
| Station selector | The station credited for the scan. | Confirm this before scanning. Wrong station requires correction later. |
| Batch comment | A note applied to scans while it remains entered. | Clear it when it no longer applies. |

## Understanding Scan Results

| Result | What it means | What you should do | When to ask for help |
|---|---|---|---|
| `SAVED` | The scan was accepted and saved to the database. | Continue scanning. | Ask for help only if the dashboard/history later does not show it. |
| `QUEUED` | The scan was accepted and saved locally on the tablet, but has not synced yet. | Continue if production needs to keep moving. Leave the scanner open. Watch pending count. | Ask for help if many scans queue, the count does not go down after connection returns, or it is still queued near end of shift. |
| `DUPLICATE (recent scan)` | The same operator scanned the same serial again very recently. The second scan was blocked before saving. | Do not keep rescanning. Check the recent scan area. Move on if it was already scanned. | Ask for help if you believe the item has not been scanned. |
| `DUPLICATE` | The database or sync process says this scan already exists or has already been handled. | Do not keep rescanning. Set the item aside if unsure. | Ask for help if the duplicate conflicts with production paperwork or expected work. |
| `INVALID SCAN`, `INVALID FORMAT`, red error, or `ERROR` | The barcode was not accepted, could not be read correctly, or the scanner hit an error. Rejected scans are not queued. | Clean the label, aim at the full barcode, and scan once more. | Ask for help if the same item fails again or many labels from the same product fail. |

Examples:

| You see | Good response |
|---|---|
| `SAVED` | Continue to the next item. |
| `QUEUED (will sync)` and pending count becomes `1` | Keep scanning if needed, but leave the tablet open until it syncs. |
| `DUPLICATE (recent scan)` right after scanning the same label twice | Do not scan it again. Check recent scan and move on if correct. |
| `Too short` | The scanner probably captured only part of the barcode. Clean and rescan once. |

## Queue Awareness Training

This is the most important safety rule in PRI-SNSL.

Queued scans live on the tablet until they sync. If the tablet is cleared or reset before sync, scan data may be lost.

Remember:

- `QUEUED` does not mean lost.
- `QUEUED` does mean the tablet is holding important scan data.
- Pending count above zero means unsynced scans still exist on that tablet.
- Leave the scanner open while scans are pending.
- Keep the tablet powered and connected to Wi-Fi.
- Do not clear browser data.
- Do not clear site data.
- Do not uninstall/reinstall the browser.
- Do not factory reset the tablet.
- Do not repeatedly rescan the same items to "force" them through.

If scans are queued:

1. Keep the scanner open.
2. Check Wi-Fi.
3. Watch the internet and Supabase badges.
4. Wait 30-60 seconds after badges recover.
5. If pending count does not go down, tell a supervisor.

If you are unsure, stop and ask. Protecting queued scans matters more than trying random fixes.

## Safe Daily Habits

Start of shift:

- [ ] Open the scanner.
- [ ] Confirm the scan box is ready.
- [ ] Confirm your operator name.
- [ ] Confirm your station.
- [ ] Confirm pending count is zero or report it if not.
- [ ] Confirm internet/database badges do not show a persistent problem.

During scanning:

- [ ] Read every result message.
- [ ] Continue normally on `SAVED`.
- [ ] Treat `QUEUED` as saved locally and keep the tablet open.
- [ ] Stop repeated rescans after duplicate messages.
- [ ] Clean and rescan once after invalid scan messages.
- [ ] Report repeated invalid scans for the same product or label type.
- [ ] Clear batch comments when they no longer apply.
- [ ] Tell a supervisor if operator or station looks wrong.

Before leaving the tablet:

- [ ] Check pending count.
- [ ] If pending count is zero, normal closing is lower risk.
- [ ] If pending count is above zero, leave the scanner open, keep the tablet powered, and tell a supervisor.

## Unsafe Actions

Do not do these unless a supervisor or trained admin has checked queue safety:

- Clear browser data.
- Clear site data.
- Clear cache as a first response.
- Use private/incognito mode for production scanning.
- Reinstall the browser/app.
- Factory reset the tablet.
- Close the browser when many scans are pending.
- Keep rescanning the same label after duplicate messages.
- Change operator or station casually after scanning has started.
- Scan under another operator just to keep moving.
- Delete or edit dashboard records without approval.
- Mass rescan items without reconciliation.

Why these are unsafe:

| Action | Risk |
|---|---|
| Clearing browser/site data | Can delete queued scans before they sync. |
| Blind rescanning | Can create duplicate confusion and reconciliation work. |
| Wrong operator/station | Records production under the wrong person or location. |
| Incognito/private mode | Browser storage may not persist correctly for production use. |
| Resetting tablet | Can remove the only local copy of queued scans. |

## Common Problems

| Problem | What you may see | What to do first | What not to do | When to escalate |
|---|---|---|---|---|
| Scanner will not load | Blank page, browser error, or old-looking page | Check Wi-Fi, close and reopen the scanner tab once | Do not clear site data if pending count was not checked | If multiple tablets fail or one tablet had pending scans |
| No operator list | Operator list says loading or your name is missing | Wait a few seconds, check Wi-Fi, refresh once | Do not scan under the wrong name | If your name should be active but is still missing |
| No station list | Station list says loading or station is missing | Wait, check Wi-Fi, refresh once | Do not choose a wrong station just to continue | If station should be available but is missing |
| Stuck queued scans | Scans keep saying `QUEUED`; pending count stays above zero | Keep scanner open, reconnect Wi-Fi, wait after badges recover | Do not clear browser data or rescan everything | If pending count does not clear after recovery |
| Stale version | Your tablet behaves differently or shows a different version | Tell a supervisor; check pending count | Do not clear site data with pending scans | If version stays different or pending count is nonzero |
| Duplicate confusion | `DUPLICATE` appears and you are unsure why | Check recent scan area and set item aside if unclear | Do not keep rescanning | If the item should be new or dashboard/history does not match |
| Invalid scan | Red error, too short, invalid format, scanner rejected | Clean label, aim at full barcode, scan once more | Do not keep scanning the same bad label repeatedly | If same item fails again or a product group keeps failing |
| Scan box locked | Scan box is gray or says sending/timeout | Wait for it to unlock | Do not rapid-scan into a locked field | If locked longer than about 35 seconds |

## End-of-Shift Checklist

Operators:

- [ ] Confirm pending count.
- [ ] If pending count is zero, normal handoff is OK.
- [ ] If pending count is above zero, leave scanner open.
- [ ] Keep tablet powered and connected.
- [ ] Tell supervisor the pending count.
- [ ] Report any repeated invalid scans.
- [ ] Report any duplicate confusion not resolved during the shift.
- [ ] Report any operator/station mistakes.
- [ ] Clear any batch comment that should not carry into the next shift.

Supervisors:

- [ ] Ask whether any tablet still has pending scans.
- [ ] Record device, operator, station, pending count, and approximate time if pending count is above zero.
- [ ] Do not approve browser/site data clearing until queued scans are verified safe.
- [ ] Check dashboard/my-scans only after remembering that queued scans may not appear yet.
- [ ] Escalate stuck queues before devices are reset, wiped, reassigned, or powered down for long periods.

## When To Escalate

Ask a supervisor or admin for help when:

- Scans repeatedly show `QUEUED`.
- Pending count is above zero and does not clear.
- Operator list is missing or your name is missing.
- Station list is missing or wrong.
- Same product repeatedly shows invalid scan errors.
- A scan seems missing from history/dashboard after it said `SAVED`.
- Duplicate messages do not make sense.
- Version badge differs from other tablets.
- The tablet was accidentally closed, cleared, reset, or switched while scans may have been queued.
- You are unsure whether it is safe to close, clear, reset, or rescan.

What to tell the supervisor:

| Question | Example answer |
|---|---|
| Which tablet/device? | `Line 2 tablet` |
| Operator? | `Maria` |
| Station? | `MAIN` |
| What result did you see? | `QUEUED` |
| Pending count? | `4` |
| Internet badge? | `ONLINE` or `OFFLINE` |
| Supabase badge? | `OK`, `SLOW`, `DOWN`, or `CHECKING` |
| Approximate time? | `About 3:20 PM` |
| Product/serial if known? | `756EW...` |

## Quick Reference

Remember these rules:

- Pick the right operator.
- Pick the right station.
- Read the scan result.
- `SAVED` means saved.
- `QUEUED` means saved locally and waiting.
- Pending count above zero means protect the tablet.
- Do not clear browser/site data with pending scans.
- Do not keep rescanning duplicates.
- Clean and rescan once after invalid scan messages.
- Ask for help before reset, reinstall, clear data, or mass rescan.

## Suggested Future Improvements

Operational/documentation improvements only:

- Create a one-page printed operator quick card with scan results and queue safety rules.
- Add production-floor labels to tablets so operators can report the correct device name.
- Define the official trainer for new operators and backups.
- Define who approves scanning under an alternate operator/station during unusual circumstances.
- Create a short supervisor sign-off checklist for first-day operator training.
- Add a standard end-of-shift queue log.
- Confirm whether `my-scans` is intended for all operators or supervisor/admin use only.
- Create a simple process for reporting repeated invalid labels by product family.
- Add a visible posted rule near tablets: "If pending count is above zero, do not clear or reset."

## Unresolved Onboarding Ambiguity

- TODO: Who is responsible for training new operators?
- TODO: Who is responsible for training supervisors and temporary backups?
- TODO: What is the official production scanner URL shown to trainees?
- TODO: What is the expected current version badge operators should see?
- TODO: What is the official process if a trainee cannot find their operator name?
- TODO: What is the official process if the correct station is missing?
- TODO: Who may approve scanning under another operator or station?
- TODO: Who should operators call first for stuck queued scans?
- TODO: Is `my-scans` operator-facing, supervisor-facing, or both?
- TODO: Where should end-of-shift pending queue counts be recorded?
