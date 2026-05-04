# Daily Build Report Setup Guide

## Overview

The daily report workflow reads the previous day's scans from Supabase, generates Excel files, and emails them to configured recipients.

The workflow is defined in `.github/workflows/daily-report.yml` and currently runs at `10:07 UTC` each day. That is approximately `5:07 AM EST` or `6:07 AM EDT`.

## Purpose

Use this guide to configure report credentials, test report generation, and recover from missing report emails.

## Step-by-Step Instructions

### 1. Create a Gmail App Password

If Gmail is used for `SMTP_EMAIL`, use an app password rather than the regular Gmail password.

1. Go to `https://myaccount.google.com/apppasswords`.
2. Sign in to the sending Gmail account.
3. Create an app password for mail/report sending.
4. Store the generated password as the GitHub `SMTP_PASSWORD` secret.

If app passwords are not available, confirm that 2-Step Verification is enabled for the Gmail account.

### 2. Add GitHub Actions Secrets

In GitHub, open the repository settings and go to Secrets and variables, then Actions.

Required secrets:

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase key used by `scripts/daily_report.py` |
| `SMTP_EMAIL` | Gmail account used to send reports |
| `SMTP_PASSWORD` | Gmail app password |
| `REPORT_RECIPIENTS` | Comma-separated email recipient list |

Optional Google Sheets backup secrets:

| Secret | Purpose |
|---|---|
| `GSHEET_CREDENTIALS_JSON` | Google service account credentials JSON |
| `GSHEET_SPREADSHEET_ID` | Target backup spreadsheet ID |

### 3. Test the Workflow

1. Open the repository in GitHub.
2. Go to Actions.
3. Select `Daily Build Report`.
4. Click `Run workflow`.
5. Enter a report date in `YYYY-MM-DD` format if testing a specific day.
6. Use test mode when you want files generated without sending email.
7. Open the workflow run and confirm it completed successfully.

### 4. Run Locally

Install dependencies:

```bash
pip install -r scripts/requirements.txt
```

Set required environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-key"
export SMTP_EMAIL="sender@example.com"
export SMTP_PASSWORD="gmail-app-password"
export REPORT_RECIPIENTS="recipient@example.com"
```

Run in test mode:

```bash
python scripts/daily_report.py --test
```

Run for a specific date:

```bash
python scripts/daily_report.py 2026-05-03
```

## Edge Cases and Warnings

- GitHub scheduled workflows can run late.
- If no scans exist for the target date, no normal production email may be sent.
- During daylight saving time, confirm the report date boundaries match production expectations.
- Do not put secrets directly in committed files.
- Treat the Supabase report key as sensitive.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No email arrived | Workflow did not run, found no scans, or email failed | Check GitHub Actions run history |
| Workflow failed before report generation | Missing Python dependency or checkout/setup issue | Open the failed step logs |
| Supabase error | Bad or missing `SUPABASE_URL` or `SUPABASE_KEY` | Verify GitHub secrets |
| SMTP error | Bad Gmail app password or sender account issue | Regenerate `SMTP_PASSWORD` |
| Wrong date or count | Timezone/date mismatch or no scans in range | Rerun manually with explicit `YYYY-MM-DD` |
| Google Sheets backup failed | Optional Sheets secrets missing or invalid | Verify `GSHEET_CREDENTIALS_JSON` and `GSHEET_SPREADSHEET_ID` |

## Notes and Limitations

- Reports are separate from production scanner behavior.
- Report setup does not change scanner queue or duplicate handling.
- The workflow uses `PIECES_PER_BOX: 100` unless changed in the workflow file.
