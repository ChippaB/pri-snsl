# External Dependencies

## Purpose

This document lists the external systems PRI-SNSL depends on so a non-developer admin can understand what keeps scanning, reporting, hosting, and recovery working.

It exists to reduce bus-factor risk. If reports stop, tablets show stale code, Supabase is unavailable, or an account owner leaves, this file should help an admin identify which outside system is involved, where it is configured, what failure looks like, and what ownership or access information still needs to be confirmed.

This inventory is based on repository inspection only. Account owners, live dashboard settings, and current credential holders are not documented in the repo unless noted below.

## Dependency Inventory

### Supabase

| Field | Details |
|---|---|
| Name | Supabase project `ospedluufxgpfvqtznej` |
| Purpose | Primary database for operators, stations, part mappings, and scan records. Also used as the scanner health-check target. |
| Used by what workflow | Scanner app configuration loading and scan writes; dashboard review/edit/delete/export; my-scans history; daily report generation; optional admin/repair scripts. |
| Where configured | Browser files hardcode the project URL and anon key in `app.js`, `dashboard.html`, and `my-scans.html`. Report automation reads `SUPABASE_URL` and `SUPABASE_KEY` from GitHub Actions secrets, with fallback defaults in `scripts/daily_report.py`. Schema expectations are documented in `supabase_schema.md`. |
| Criticality | Critical. Scanning can queue locally during short outages, but long outages block sync, reports, dashboard review, and admin correction. |
| Failure symptoms | Operator or station lists do not load; Supabase badge shows `DOWN` or `CHECKING`; scans show `QUEUED` and pending count rises; dashboard cannot load or save; daily report workflow fails with Supabase errors; reports show no scans for a date that should have scans. |
| Recovery owner | Undocumented. Needs a named PRI admin or technical owner with Supabase project access. |
| Required credentials/accounts | Supabase dashboard access; project URL; anon key used by browser app; report key stored as `SUPABASE_KEY` in GitHub Actions secrets; permissions/RLS that allow expected scanner and dashboard operations. |
| Rotation/access notes | Browser key rotation requires updating committed frontend files, redeploying, and ensuring tablets receive the new service worker/app version. Report key rotation requires updating GitHub Actions secrets. RLS, constraints, and rebuild steps are not fully documented in the repo. |
| Documented elsewhere | Partially: `README.md`, `supabase_schema.md`, `docs/OFFLINE_SCANNING.md`, `idempotency-dedup.md`, `troubleshooting.md`, and `scripts/SETUP_GUIDE.md`. |

### Vercel

| Field | Details |
|---|---|
| Name | Vercel static hosting |
| Purpose | Hosts the static PWA files for scanner, dashboard, my-scans, service worker, manifest, and related browser assets. |
| Used by what workflow | Production scanner access from tablets/phones and dashboard access from browsers. |
| Where configured | `README.md` says to host static files on Vercel or another static host. `vercel.json` configures a static output directory of `.` and sets `Cache-Control: no-cache` for `/service-worker.js`. |
| Criticality | Critical for loading the app. Already-open tablets may keep operating from browser cache for a while, but new sessions and updates depend on hosting. |
| Failure symptoms | App URL unavailable; new tablets cannot load scanner; dashboard unreachable; service worker or new release not deployed; stale assets persist after release. |
| Recovery owner | Undocumented. Needs a named PRI admin or technical owner with Vercel project access. |
| Required credentials/accounts | Vercel account/team access, project access, and GitHub repository integration access if deployments are connected to GitHub. |
| Rotation/access notes | Deployment and rollback ownership are not documented. If Vercel ownership is lost, production hosting and rollback capability may be lost. Service worker cache behavior also means a hosting rollback may not be enough unless clients receive the intended cached version. |
| Documented elsewhere | Minimal: `README.md` and `vercel.json`. No deployment or rollback runbook exists in the repo. |

### GitHub

| Field | Details |
|---|---|
| Name | GitHub repository and GitHub Actions |
| Purpose | Source control, manual daily report workflow execution, repository secrets for reporting, and likely deployment source for Vercel. |
| Used by what workflow | Manual `Daily Build Report` workflow; storage of report secrets; code/documentation changes; Vercel deployment trigger if linked externally. |
| Where configured | `.github/workflows/daily-report.yml`; GitHub Actions secrets named in `README.md` and `scripts/SETUP_GUIDE.md`. |
| Criticality | Critical for report execution and maintaining the app. Not required for already-loaded scanner runtime, but required to change, redeploy, or manually run reports. |
| Failure symptoms | Cannot run daily report manually; report secrets unavailable; workflow cannot install dependencies or execute; Vercel deployment integration may stop if GitHub access/integration is broken. |
| Recovery owner | Undocumented. Needs repository owner/admin(s) named outside the repo. |
| Required credentials/accounts | GitHub repository admin access; Actions permissions; repository secrets access; branch/deployment permissions. |
| Rotation/access notes | Secret rotation occurs in GitHub Actions secrets for report credentials. The repo contains only one workflow, `daily-report.yml`; there is no CI test workflow. |
| Documented elsewhere | Partially: `README.md`, `scripts/SETUP_GUIDE.md`, `scripts/QUICK_REPORT_README.md`, and `.github/workflows/daily-report.yml`. |

### cron-job.org

| Field | Details |
|---|---|
| Name | cron-job.org external scheduler |
| Purpose | Primary scheduler for daily report execution. |
| Used by what workflow | Daily report automation. The repo workflow keeps `workflow_dispatch` enabled for manual runs, but no longer has an internal GitHub `schedule` block. |
| Where configured | Not configured in the repo. The only repository evidence is a comment in `.github/workflows/daily-report.yml`: `cron-job.org is now the primary scheduler; keep workflow_dispatch enabled.` |
| Criticality | Critical for automatic daily reports. Manual report runs are still possible through GitHub Actions if GitHub access and secrets are intact. |
| Failure symptoms | Daily report email does not arrive and there is no scheduled GitHub Actions run to inspect; only manual workflow runs appear in GitHub Actions history. |
| Recovery owner | Undocumented. The cron-job.org account owner, job URL, schedule, authentication method, and alert recipients are not recorded in the repo. |
| Required credentials/accounts | cron-job.org account with access to the job that triggers the GitHub workflow or report endpoint. Exact trigger URL and credentials are unknown from repository inspection. |
| Rotation/access notes | Losing the cron-job.org account can silently stop daily reports. Any trigger token or URL should be treated as sensitive and inventoried in a separate secrets/runbook document. |
| Documented elsewhere | Only the workflow comment. `README.md` and `scripts/SETUP_GUIDE.md` still describe a GitHub scheduled run, which contradicts the workflow file. |

### Gmail SMTP

| Field | Details |
|---|---|
| Name | Gmail SMTP via `smtp.gmail.com` |
| Purpose | Sends daily build report emails with Excel attachments. |
| Used by what workflow | `scripts/daily_report.py` through GitHub Actions, and local/manual report runs when not in test mode. |
| Where configured | `.github/workflows/daily-report.yml` passes `SMTP_EMAIL`, `SMTP_PASSWORD`, and `REPORT_RECIPIENTS`. `scripts/daily_report.py` defaults to `smtp.gmail.com`, port `587`, a sender address, a Gmail app-password fallback, and default recipients if environment variables are absent. `scripts/SETUP_GUIDE.md` documents Gmail app-password setup. |
| Criticality | High. Scanning continues without Gmail, but daily report delivery fails. |
| Failure symptoms | GitHub workflow fails during email send; SMTP authentication errors; expected report email missing; report can still generate in test/manual mode but not send. |
| Recovery owner | Undocumented. Needs owner of the sender Gmail account and GitHub Actions secrets access. |
| Required credentials/accounts | Gmail account used as `SMTP_EMAIL`; Gmail app password stored as `SMTP_PASSWORD`; recipient list in `REPORT_RECIPIENTS`; GitHub Actions secrets access. |
| Rotation/access notes | Regenerate the Gmail app password and update the GitHub `SMTP_PASSWORD` secret. Confirm 2-Step Verification remains enabled for the Gmail account. Remove or audit committed fallback credentials separately; this document does not paste secret values. |
| Documented elsewhere | Partially: `README.md`, `scripts/SETUP_GUIDE.md`, `troubleshooting.md`, and `scripts/daily_report.py`. |

### Google Sheets

| Field | Details |
|---|---|
| Name | Google Sheets / Google Drive API |
| Purpose | Optional backup of daily scan rows to a Google Sheet. |
| Used by what workflow | `scripts/daily_report.py` after report generation, including test mode. Backup failure is logged but does not stop the main report. |
| Where configured | `.github/workflows/daily-report.yml` passes optional `GSHEET_CREDENTIALS_JSON` and `GSHEET_SPREADSHEET_ID`. `scripts/daily_report.py` uses `gspread`, Google service-account credentials, Sheets and Drive scopes, and appends to the first worksheet. `scripts/requirements.txt` includes `gspread`. |
| Criticality | Medium if used as a backup or audit trail; low if not configured. The main email report does not depend on Sheets. |
| Failure symptoms | Workflow logs show Google Sheets backup warning or error; rows are not appended; email report may still arrive normally. |
| Recovery owner | Undocumented. Needs owner of the Google Cloud service account and the target spreadsheet. |
| Required credentials/accounts | Google service account JSON, target spreadsheet ID, service account sharing/access to the spreadsheet, GitHub Actions secrets access. |
| Rotation/access notes | Rotate the service account key and update `GSHEET_CREDENTIALS_JSON`. Confirm the service account still has access to the target spreadsheet. The repo does not identify the live spreadsheet or service account owner. |
| Documented elsewhere | Partially: `README.md`, `scripts/SETUP_GUIDE.md`, `.github/workflows/daily-report.yml`, and `scripts/daily_report.py`. |

### Browser Storage And Service Worker

| Field | Details |
|---|---|
| Name | Browser IndexedDB, localStorage, sessionStorage, Cache Storage, and service worker |
| Purpose | Keeps scanning usable during outages, stores pending scans locally, remembers operator/station selections, caches app shell assets, and controls stale-version behavior. |
| Used by what workflow | Operator scanning, offline queue, duplicate/last-scan displays, dashboard unlock persistence, my-scans operator selection, PWA app loading, release/cache refresh. |
| Where configured | IndexedDB queue constants are in `app.js` (`sosv2-offline`, `pendingScans`). Service worker cache version is in `service-worker.js` (`CACHE_VERSION = 'v8.8.3'`, cache name `seescan-v8.8.3-offline`). Version badge is in `index.html`. Cache-clearing helper exists as `force-cache-clear.html`. |
| Criticality | Critical for offline scanning and safe recovery from short Supabase/network outages. |
| Failure symptoms | Pending scans disappear after site data is cleared; scans stay queued on one tablet only; stale app behavior after deploy; version badge does not match expected release; dashboard remains unlocked because localStorage persists. |
| Recovery owner | Undocumented. Operator docs say not to clear site data while pending count is above zero, but supervisor-level IndexedDB recovery ownership is not documented. |
| Required credentials/accounts | No external account, but requires browser profile/site data continuity on production devices. |
| Rotation/access notes | `CACHE_VERSION` must be bumped when releases need clients to refresh. `force-cache-clear.html` references old versions and requires manual browser/devtools actions. Clearing all site data can remove queued scans. |
| Documented elsewhere | Partially: `README.md`, `docs/OFFLINE_SCANNING.md`, `idempotency-dedup.md`, `troubleshooting.md`, `service-worker.js`, and `force-cache-clear.html`. |

### External Browser CDNs

| Field | Details |
|---|---|
| Name | Supabase JS CDN, SheetJS CDN, and Google Fonts |
| Purpose | Browser-delivered libraries/assets for Supabase client access, dashboard XLSX export, and font loading. |
| Used by what workflow | Scanner, dashboard, my-scans, and dashboard XLSX export. |
| Where configured | `index.html`, `dashboard.html`, and `my-scans.html` load Supabase JS from `https://unpkg.com/@supabase/supabase-js@2`. `dashboard.html` loads SheetJS dynamically for XLSX export. `index.html`, `dashboard.html`, and `my-scans.html` use Google Fonts. `service-worker.js` treats external HTTPS and `unpkg.com` requests as network-only. |
| Criticality | Medium. Already-cached app assets may continue loading, but fresh browser sessions and dashboard XLSX export can be affected by CDN/network failures. |
| Failure symptoms | Supabase client unavailable in the browser; dashboard XLSX export fails or alerts that export library could not load; fonts fall back or load slowly. |
| Recovery owner | Undocumented. Usually a developer/deployment owner because fallback or vendoring would require code changes. |
| Required credentials/accounts | None for public CDN access. |
| Rotation/access notes | No credentials. Availability depends on external CDN/network access. |
| Documented elsewhere | Not operationally documented elsewhere; visible in HTML and service worker source. |

## Hidden/Implicit Dependencies

- **cron-job.org replaced GitHub cron.** The `Daily Build Report` workflow has no `schedule:` block. Automatic scheduling is external to GitHub and not recoverable from repo settings alone.
- **`CACHE_VERSION` controls service-worker refresh behavior.** `service-worker.js` uses `CACHE_VERSION` to name caches and clean up older caches. A deploy that does not move clients to the intended cache can leave tablets on stale code.
- **`force-cache-clear.html` is an undiscoverable manual recovery tool.** It exists at the repo root, references older versions, and expects manual browser cache/service-worker clearing.
- **Browser IndexedDB is production data until synced.** Accepted scans are queued in browser IndexedDB before network sync. Clearing site data while pending count is above zero can delete unsynced production scans.
- **Browser localStorage/sessionStorage affect operations.** Operator, station, batch comment, dashboard unlock state, and last-scan state persist locally.
- **GitHub Actions is no longer the automatic scheduler.** It is still the manual execution environment for the daily report, but the automatic trigger lives outside the repo.
- **Report script has committed fallback configuration.** `scripts/daily_report.py` contains fallback values for Supabase, SMTP, and recipients if environment variables are missing. Operationally, GitHub secrets should be treated as the intended production configuration.
- **Dashboard export has a runtime CDN dependency.** CSV export is local browser logic, but XLSX export loads SheetJS from an external CDN at runtime.

## Failure Scenarios

### cron-job.org account lost

Symptoms:

- Daily report email stops arriving.
- GitHub Actions does not show a failed scheduled run because there is no GitHub `schedule:` block.
- Manual `workflow_dispatch` may still work.

Operational recovery:

1. Run the `Daily Build Report` workflow manually in GitHub Actions for the missing date.
2. Confirm GitHub secrets are still present.
3. Find the cron-job.org account/job owner.
4. Recreate or repair the external scheduler once the intended trigger URL, schedule, and authentication method are confirmed.

Gap: The repo does not document the cron-job.org account, job URL, schedule settings, or owner.

### Supabase credentials rotated

Symptoms:

- Operator/station lists fail to load.
- Supabase badge shows down/checking or inserts fail.
- Scans queue but do not sync.
- Daily report fails with Supabase authentication errors.

Operational recovery:

1. Identify whether the browser anon key, report key, or both changed.
2. Update GitHub Actions secrets for the report key.
3. If browser key changed, update the hardcoded frontend configuration, redeploy, and confirm tablets receive the new version.
4. Verify active operators, stations, part_map, and scan insert permissions.

Gap: No documented key-rotation runbook or named Supabase owner exists in the repo.

### Gmail app password expires or is revoked

Symptoms:

- Report generation succeeds but email sending fails.
- Workflow logs show SMTP authentication or send errors.
- Recipients do not receive daily report email.

Operational recovery:

1. Generate a new Gmail app password for the sender account.
2. Update GitHub Actions secret `SMTP_PASSWORD`.
3. Rerun the report manually for the missed date.

Gap: Sender account owner and recovery email/2FA owner are not documented in the repo.

### Vercel access lost

Symptoms:

- Admins cannot deploy fixes or roll back bad releases.
- App URL may continue serving current files, but ownership and recovery are blocked.
- GitHub changes may stop deploying if integration ownership breaks.

Operational recovery:

1. Identify current Vercel team/project owner outside the repo.
2. Confirm the production project and GitHub integration.
3. Restore admin access or create a replacement static deployment.
4. Verify `service-worker.js` cache behavior after the hosting change.

Gap: No Vercel project name, account owner, deployment path, or rollback runbook exists in the repo.

### Stale service-worker deployment

Symptoms:

- One or more tablets show old behavior after a fix.
- Version badge does not match expected version.
- Browser cache/service worker continues serving stale app assets.

Operational recovery:

1. Confirm pending scan count is zero before clearing browser data.
2. Confirm `service-worker.js` has the intended `CACHE_VERSION`.
3. Hard refresh or close/reopen scanner tabs.
4. Use cache-clearing instructions only after unsynced queue risk is handled.

Gap: `force-cache-clear.html` exists but is stale and not integrated into an admin runbook.

### Google Sheets backup fails

Symptoms:

- Workflow logs warn or error during Google Sheets backup.
- Email report may still send.
- Backup spreadsheet is missing expected rows.

Operational recovery:

1. Confirm whether Sheets backup is required for operations.
2. Verify `GSHEET_CREDENTIALS_JSON` and `GSHEET_SPREADSHEET_ID`.
3. Confirm the service account still has access to the spreadsheet.
4. Rerun the report for the date if backup rows are required.

Gap: Live spreadsheet, service account owner, and intended backup criticality are not documented in the repo.

## Ownership / Access Gaps

- Supabase project owner is not documented.
- Vercel project/team owner is not documented.
- GitHub repository owner/admin list is not documented.
- cron-job.org account owner, job URL, schedule, and trigger method are not documented.
- Gmail sender account owner, recovery method, and app-password owner are not documented.
- Google service account owner and target spreadsheet owner are not documented.
- No single recovery owner is named for stuck IndexedDB queues on production tablets.
- No deployment/rollback owner is named.
- No credential rotation owner is named.
- Several dependencies are single-person risks unless account access is shared and recorded outside the original developer's memory.

## Immediate Recommendations

- Record the live owner and backup owner for Supabase, Vercel, GitHub, cron-job.org, Gmail SMTP, and Google Sheets.
- Record the cron-job.org job details: account, job name, schedule, target URL or trigger method, authentication method, and alert recipients.
- Create a separate secrets inventory covering where each credential lives and how to rotate it. Include the frontend Supabase anon key, report `SUPABASE_KEY`, Gmail app password, Google service account JSON, and any cron trigger token.
- Create a short daily-report recovery note that starts with the current reality: cron-job.org is the automatic scheduler; GitHub Actions is the manual execution path.
- Document the release/cache checklist: deploy host, expected version badge, `CACHE_VERSION`, and what to do before clearing browser data.
- Document the supervisor recovery path for stuck IndexedDB queues before telling operators to escalate to a supervisor.
- Confirm whether Google Sheets backup is operationally required or optional, then label it accordingly in report runbooks.
- Remove contradictions in existing docs after this P0 document is accepted: `README.md` and `scripts/SETUP_GUIDE.md` should no longer say GitHub Actions itself runs daily at `10:07 UTC` unless a GitHub `schedule:` block is restored.
