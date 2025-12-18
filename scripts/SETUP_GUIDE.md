# Daily Build Report - Setup Guide

This guide explains how to set up the automated daily email reports for Polytechnic Resources.

## Overview

The system automatically:
1. Runs every day at **6:00 AM EST**
2. Queries Supabase for **previous day's scan data**
3. Generates an **Excel report** in the Build_Report format
4. Emails it to configured recipients

---

## Step 1: Create Gmail App Password

Since you're using Gmail (`polytechnicresources.dev@gmail.com`), you need an **App Password** instead of your regular password.

1. Go to https://myaccount.google.com/apppasswords
2. Sign in with `polytechnicresources.dev@gmail.com`
3. Select "Mail" as the app
4. Select "Other" as the device, name it "Build Report"
5. Click **Generate**
6. Copy the 16-character password (it looks like: `xxxx xxxx xxxx xxxx`)

> **Note:** If you don't see "App passwords", you may need to enable 2-Step Verification first at https://myaccount.google.com/security

---

## Step 2: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → **New repository secret**

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_URL` | `https://ospedluufxgpfvqtznej.supabase.co` |
| `SUPABASE_KEY` | Your Supabase anon key (the one in app.js) |
| `SMTP_EMAIL` | `polytechnicresources.dev@gmail.com` |
| `SMTP_PASSWORD` | The 16-character App Password from Step 1 |
| `REPORT_RECIPIENTS` | `chip.brandner@gmail.com` |

### Adding Multiple Recipients

To send to multiple people, use a comma-separated list:
```
chip.brandner@gmail.com, another@email.com, client@company.com
```

---

## Step 3: Test the Report

After adding secrets, you can manually trigger a test run:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **Daily Build Report** in the left sidebar
4. Click **Run workflow** button
5. Optionally enter a specific date or check "Test mode"
6. Click **Run workflow**

Watch the logs to ensure it completes successfully.

---

## Step 4: Verify Automatic Runs

The workflow runs automatically at 6:00 AM EST every day. You can see run history in the **Actions** tab.

---

## Troubleshooting

### Email not sending?
- Verify the App Password is correct (no spaces)
- Check that 2-Step Verification is enabled on Gmail
- Look at the GitHub Actions logs for error messages

### No data in report?
- Check that scans exist for the target date in Supabase
- Verify the timezone handling (scans should be in UTC)

### Wrong scan count?
- The script fetches scans for the previous day in EST timezone
- Check the date range being queried in the logs

---

## Local Testing

You can also test locally:

```bash
# Install dependencies
pip install -r scripts/requirements.txt

# Set environment variables
export SUPABASE_URL="https://ospedluufxgpfvqtznej.supabase.co"
export SUPABASE_KEY="your-key-here"
export SMTP_EMAIL="polytechnicresources.dev@gmail.com"
export SMTP_PASSWORD="your-app-password"
export REPORT_RECIPIENTS="chip.brandner@gmail.com"

# Run in test mode (generates Excel but doesn't email)
python scripts/daily_report.py --test

# Run for a specific date
python scripts/daily_report.py 2025-12-17
```

---

## Modifying Settings

### Change recipient emails
Update the `REPORT_RECIPIENTS` secret in GitHub.

### Change send time
Edit `.github/workflows/daily-report.yml` and modify the cron schedule:
```yaml
schedule:
  - cron: '0 11 * * *'  # 11:00 UTC = 6:00 AM EST
```

Common times:
- `0 11 * * *` = 6:00 AM EST
- `0 12 * * *` = 7:00 AM EST
- `0 13 * * *` = 8:00 AM EST

### Change pieces per box multiplier
Edit the workflow file and change `PIECES_PER_BOX: '100'`
