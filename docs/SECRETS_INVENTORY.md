# Secrets Inventory

## Purpose

This document lists PRI-SNSL credentials, account access, and secret storage locations so the system can be recovered without relying on original developer memory.

Do not paste live secret values into this file. Use this file to track what exists, where it is stored, who owns it, what breaks when it changes, and how rotation should be handled.

Repository inspection found several committed credential values. They are intentionally described here without reproducing the values.

## Secret Inventory Table

| Name | Purpose | Where used | Where stored | Rotation impact | Failure symptoms | Rotation procedure summary | Recovery owner | Backup owner | Criticality | Notes/TODO gaps |
|---|---|---|---|---|---|---|---|---|---|---|
| Supabase anon/browser key | Allows browser scanner, dashboard, and my-scans pages to read/write permitted Supabase data. | `app.js`, `dashboard.html`, `my-scans.html`, `supabase-health.js` via frontend globals. | Hardcoded in browser source files. | Requires code update, redeploy, service-worker/cache refresh, and tablet verification. | Operator/station lists fail; Supabase badge fails; scans queue and do not sync; dashboard/my-scans fail. | Rotate in Supabase, update all frontend hardcoded copies, deploy, verify version badge/cache, test scan insert and dashboard read. | TODO: name Supabase owner | TODO: name backup Supabase owner | Critical | Same key appears in multiple committed files. Do not assume GitHub Actions secret rotation updates the browser app. |
| Supabase report key | Lets report script query scan data for daily reports. | `scripts/daily_report.py`; `.github/workflows/daily-report.yml`; local report scripts. | GitHub Actions secret `SUPABASE_KEY`; also committed fallback defaults in report/admin scripts. | Report automation fails until GitHub secret and any local runner environment are updated. | Daily report workflow fails with Supabase auth errors or no data. | Rotate in Supabase, update GitHub Actions `SUPABASE_KEY`, update local secure runner env if used, run workflow in test mode, then rerun missing report. | TODO: name Supabase/report owner | TODO: name backup owner | Critical | `scripts/QUICK_REPORT_README.md` calls this a service role key, but repo inspection cannot confirm live privilege level. |
| Supabase project URL | Identifies the Supabase project endpoint. | Browser app, dashboard, my-scans, health check, report script. | Hardcoded in frontend files and fallback script defaults; GitHub Actions secret `SUPABASE_URL` for reports. | Project migration requires coordinated frontend update, GitHub secret update, redeploy, report test, and schema/RLS verification. | App points at wrong/missing project; reports query wrong/missing data. | Update `SUPABASE_URL` secret and all frontend/script config, deploy, test scanner/dashboard/report. | TODO | TODO | Critical | URL is not secret by itself but is operationally sensitive configuration. |
| Gmail SMTP sender account | Sender identity for daily report emails. | `scripts/daily_report.py`; GitHub Actions daily report. | GitHub Actions secret `SMTP_EMAIL`; fallback sender in `scripts/daily_report.py`. | Sender/account change requires updating GitHub secret and validating Gmail SMTP/app-password setup. | Report may generate but email sends from wrong account or fails. | Confirm sender account ownership, update `SMTP_EMAIL`, ensure app password exists, rerun workflow. | TODO: name Gmail account owner | TODO: name backup owner/recovery email owner | High | Account recovery/2FA owner is not documented. |
| Gmail SMTP app password | Authenticates report script to Gmail SMTP. | `scripts/daily_report.py` email send. | GitHub Actions secret `SMTP_PASSWORD`; committed fallback value exists in `scripts/daily_report.py`. | Email delivery fails until updated; scanning unaffected. | SMTP login failure; report email missing; workflow fails during send. | Generate new Gmail app password, update GitHub Actions `SMTP_PASSWORD`, run workflow in test/non-test as appropriate, rerun missed report. | TODO: name Gmail owner | TODO: name backup owner | High | Committed fallback app-password-like value is a security risk and should be audited/rotated. |
| Report recipients | Controls who receives emailed report attachments. | `scripts/daily_report.py`; manual PowerShell wrapper. | GitHub Actions secret `REPORT_RECIPIENTS`; committed fallback recipient list in scripts. | Wrong recipients receive reports, or expected recipients miss them. | Report succeeds but goes to wrong/missing recipients. | Update GitHub Actions `REPORT_RECIPIENTS`; confirm with manual workflow run. | TODO: report business owner | TODO: backup report owner | Medium | Contains personal email addresses in committed fallbacks; treat recipient list as operationally sensitive. |
| Google service account JSON | Authenticates optional Google Sheets backup. | `scripts/daily_report.py` `backup_to_google_sheets()`. | GitHub Actions secret `GSHEET_CREDENTIALS_JSON`; expected base64-encoded service account JSON. | Sheets backup fails; main email report should continue. | Workflow logs show Google Sheets backup warning/error; spreadsheet missing rows. | Create/rotate service account key, base64 encode JSON as expected by script, update GitHub secret, confirm spreadsheet sharing, rerun test. | TODO: Google Cloud/service account owner | TODO: spreadsheet backup owner | Medium if backup is used; low if unused | Live service account, project, and spreadsheet owner are undocumented. |
| Google spreadsheet ID | Selects target Sheets backup spreadsheet. | `scripts/daily_report.py`. | GitHub Actions secret `GSHEET_SPREADSHEET_ID`. | Backup writes to wrong sheet or fails. | Backup warning/error; expected sheet not updated. | Update `GSHEET_SPREADSHEET_ID`, confirm service account access, rerun report/test. | TODO | TODO | Medium/Low | Confirm whether Sheets backup is required operationally. |
| cron-job.org trigger/auth | External automatic scheduler trigger for daily report. | External cron-job.org job; GitHub workflow only keeps manual `workflow_dispatch`. | Not stored in repo. Likely in cron-job.org account/job settings. | Automatic reports silently stop if trigger/auth changes or account is lost. | No daily email and no scheduled GitHub Actions failure to inspect. | Identify cron job owner, rotate/recreate trigger token or URL, test manual workflow, test scheduled trigger, document schedule and alerting. | TODO: cron-job.org owner | TODO: backup cron owner | Critical | Job URL, account, trigger method, auth, and alert recipients are unknown. |
| GitHub repository admin access | Maintains source, docs, Actions secrets, workflow runs, and likely deploy integration. | GitHub repository and Actions settings. | GitHub organization/repo permissions outside repo. | Lockout blocks secret rotation, workflow repair, code changes, and likely Vercel-linked deployment. | Cannot update secrets, run reports, merge fixes, or inspect workflow settings. | Ensure at least two PRI-controlled admins; audit Actions permissions; document recovery path. | TODO: repo admin owner | TODO: second repo admin | Critical | Owner/admin list is not documented in repo. |
| GitHub Actions secrets access | Stores report and backup credentials. | `.github/workflows/daily-report.yml`. | GitHub repo Settings -> Secrets and variables -> Actions. | Report and backup credentials cannot be rotated or repaired. | Workflow env vars missing; report fails. | Admin opens Actions secrets, updates specific secret, runs workflow manually. | TODO | TODO | Critical | Secret values cannot be read back from GitHub; keep recoverable source-of-truth outside GitHub. |
| Vercel account/project access | Controls production static hosting, deploys, and rollback. | Vercel project; `vercel.json` in repo. | Vercel account/team outside repo. | Loss blocks deploy/rollback and may break GitHub integration. | App cannot be updated; rollback unavailable; deployment integration fails. | Transfer/add PRI-controlled Vercel owner, verify GitHub integration, document project name and rollback path. | TODO: Vercel owner | TODO: backup Vercel owner | Critical | Project name/team/owner not documented in repo. |
| Dashboard password | Controls simple client-side dashboard unlock. | `dashboard.html`. | Hardcoded in `dashboard.html`. | Changing requires code update and redeploy; current value is visible to anyone with source/browser access. | Dashboard access denied for users with old password; no server-side auth protection. | Update hardcoded value, deploy, verify dashboard unlock, communicate new password through secure channel. | TODO: dashboard/admin owner | TODO | Medium | This is not strong security; it is client-side and committed. |
| Legacy `SHARED_SECRET` | Leftover pre-Supabase shared secret. Current operational use is unclear from inspected files. | Defined in `app.js`. | Hardcoded in `app.js`. | Unknown; changing/removing requires code review to confirm no dependency. | Unknown. | Audit references, confirm dead/active status, then rotate/remove through normal code change if needed. | TODO: technical owner | TODO | Unknown/Medium | Treat as exposed until proven unused. Do not rely on it for security. |
| Local/manual report environment variables | Allows local report generation outside GitHub Actions. | `scripts/daily_report.py`, `scripts/quick_report.py`, `scripts/run_daily_report_manual.ps1`. | Operator/admin shell environment; no `.env` file found in repo. | Local reports fail or use committed fallbacks if env is missing. | Local script hits wrong project, wrong sender, wrong recipients, or fails. | Set env vars from approved secret source, run in test mode first, avoid editing secrets into scripts. | TODO: local report runner owner | TODO | Medium | No `.env.example` or secure local secret procedure exists. |

## Hardcoded Credential Risks

- **Frontend Supabase config is hardcoded.** `app.js`, `dashboard.html`, and `my-scans.html` contain the Supabase project URL and anon/browser key. Rotation is a code-and-deploy task, not just a GitHub secret update.
- **Root/admin scripts also contain Supabase fallback credentials.** Targeted secret scanning found Supabase key fallback values in `scripts/daily_report.py`, and broader env scanning found hardcoded Supabase keys in root analysis/repair scripts. These should be treated as exposed unless already rotated.
- **Gmail SMTP fallback credentials are committed.** `scripts/daily_report.py` includes fallback SMTP sender/password-style configuration. Production should rely on GitHub Actions secrets, but committed fallbacks are still a security exposure.
- **Dashboard password is client-side and committed.** `dashboard.html` contains a hardcoded dashboard password. Anyone with source access or browser dev tools can discover it.
- **Legacy `SHARED_SECRET` is committed.** `app.js` defines a legacy shared secret with unclear current use. It should be audited before relying on it or removing it.
- **GitHub secrets are write-only after saving.** If no external record exists, losing the original source of a secret means it must be regenerated, not recovered.

## Rotation Procedures

### Supabase Keys

1. Identify which key is rotating: browser anon key, report key, or both.
2. Confirm a GitHub/Vercel deploy owner and Supabase owner are available.
3. Rotate the key in Supabase.
4. Update GitHub Actions `SUPABASE_KEY` for report automation if the report key changed.
5. Update hardcoded frontend copies if the browser key changed.
6. Deploy the frontend and verify `service-worker.js`/version behavior so tablets receive the new key.
7. Test operator/station load, one scan insert, dashboard read, my-scans read, and daily report test mode.
8. Record date, owner, and reason for rotation in the secure credential log outside this repo.

### SMTP Password

1. Confirm access to the Gmail sender account and 2-Step Verification.
2. Generate a new Gmail app password.
3. Update GitHub Actions secret `SMTP_PASSWORD`.
4. Run the daily report manually for a known date.
5. Confirm email delivery to expected recipients.
6. Revoke the old app password if not automatically invalidated.

### Google Service Account

1. Confirm the Google Cloud project/service account and target spreadsheet.
2. Create a new service account key.
3. Base64 encode the JSON if continuing to use the current script format.
4. Update GitHub Actions secret `GSHEET_CREDENTIALS_JSON`.
5. Confirm `GSHEET_SPREADSHEET_ID` is still correct.
6. Confirm the service account has spreadsheet access.
7. Run report in test mode and verify rows append.
8. Delete/revoke the old service account key.

### GitHub Actions Secrets

1. Open GitHub repository Settings -> Secrets and variables -> Actions.
2. Update the specific secret name used by `.github/workflows/daily-report.yml`.
3. Run the `Daily Build Report` workflow manually.
4. Check logs for missing env vars, Supabase auth, SMTP auth, and Sheets backup errors.
5. Record the change in the secure credential log.

### cron Trigger/Auth

1. Identify the cron-job.org account and job.
2. Confirm what it triggers: GitHub workflow dispatch endpoint or another URL.
3. Rotate any token, URL secret, or auth header in the scheduler and target system together.
4. Trigger a test run from cron-job.org.
5. Confirm the GitHub workflow appears and report behavior is correct.
6. Document job name, schedule, owner, backup owner, alert email, and recovery path.

### Vercel/GitHub Ownership Transfer

1. Add at least two PRI-controlled admins to GitHub and Vercel before removing any existing owner.
2. Verify GitHub Actions secrets access for both admins.
3. Verify Vercel project access, deployment history, rollback access, and GitHub integration.
4. Confirm a small documentation-only deploy can be performed and rolled back if needed.
5. Store account recovery contacts outside the repo.

## Credential Loss Scenarios

### Sole owner leaves company

- Risk: Supabase, Vercel, GitHub, Gmail, cron-job.org, or Google access may become unrecoverable.
- Immediate action: verify at least two PRI-controlled admins for each external system.
- Gap: current owners are not documented in repo.

### Gmail account inaccessible

- Risk: daily report generation may work, but email delivery fails.
- Immediate action: recover Gmail account or configure a new sender, update `SMTP_EMAIL` and `SMTP_PASSWORD`, then rerun missed reports.
- Gap: sender account recovery owner is not documented.

### cron-job.org lost

- Risk: automatic daily reports stop silently.
- Immediate action: run reports manually from GitHub Actions, then recreate scheduler once trigger details are confirmed.
- Gap: cron account, job URL, auth, schedule, and alerts are undocumented.

### GitHub admin removed

- Risk: no one can update Actions secrets, repair workflow, change docs/code, or maintain deployment integration.
- Immediate action: use organization owner recovery path; ensure multiple repo admins.
- Gap: repo admin/backup admin list is undocumented.

### Supabase project ownership issue

- Risk: cannot rotate keys, inspect RLS, repair schema, add admins, or recover data.
- Immediate action: recover organization/project ownership through Supabase; run manual report/scanner checks once access returns.
- Gap: Supabase owner and backup owner are undocumented.

### Vercel owner unavailable

- Risk: app may keep serving, but deploy and rollback are blocked.
- Immediate action: recover Vercel team/project ownership or deploy static files to a replacement host after confirming Supabase config and cache behavior.
- Gap: Vercel project/team owner is undocumented.

## Immediate Operational Recommendations

- Create a secure credential log outside this repo with live secret values, owner, backup owner, last rotated date, and recovery contact.
- Add at least two PRI-controlled admins to Supabase, Vercel, GitHub, cron-job.org, Gmail/Google, and any Google Cloud project used for Sheets.
- Rotate or revoke committed fallback credentials after confirming production replacements are in GitHub Actions secrets and frontend config.
- Confirm whether the report `SUPABASE_KEY` is anon, service role, or another role; document its minimum required permissions.
- Document the cron-job.org job details immediately: account, job name, schedule, target URL, auth method, and alerts.
- Replace local script secret editing with a secure local environment procedure and `.env.example` that contains names only, not values.
- Treat the dashboard password as convenience gating, not real authentication.
- Add a short credential-rotation checklist to the future deployment/runbook docs so frontend key rotation includes deploy and tablet cache verification.
