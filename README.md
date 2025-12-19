# PRI Serial Number Log (SNSL)

A mobile-friendly barcode scanning app for tracking production serial numbers.

## What It Does

- **Scan Barcodes**: Operators scan boxes using their phones
- **Track Everything**: Every scan is saved with who, what, when, and where
- **Live Dashboard**: See all scans in real-time with filters and search
- **Daily Reports**: Automatic email reports every night at midnight
- **Works Offline**: Keeps working even with spotty WiFi

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML/CSS/JavaScript (PWA) |
| Database | Supabase (cloud PostgreSQL) |
| Hosting | Vercel (free tier) |
| Reports | GitHub Actions + Python |

## Files

```
pri-snsl/
├── index.html          # Main scanning app
├── dashboard.html      # Analytics dashboard
├── app.js              # App logic
├── service-worker.js   # Offline support
├── manifest.json       # PWA settings
├── icon-*.png          # App icons
├── vercel.json         # Hosting config
├── scripts/
│   └── daily_report.py # Daily email report
└── .github/workflows/
    └── daily-report.yml # Scheduled automation
```

## Setup

### 1. Deploy to Vercel
Connect this repo to Vercel for automatic deployments.

### 2. Configure Supabase
The app connects to Supabase using these credentials in `app.js`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### 3. Set Up Daily Reports
Add these secrets to GitHub repository settings:
| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key |
| `SMTP_EMAIL` | Gmail address for sending |
| `SMTP_PASSWORD` | Gmail app password |
| `REPORT_RECIPIENTS` | Comma-separated email list |

## Dashboard Features

- **Live Operator Cards**: See who's scanning right now
- **Multi-Select Filters**: Filter by operator, station, part
- **Export to Excel**: Download filtered data as .xlsx
- **Auto-Refresh**: Updates every 60 seconds
- **Edit/Delete**: Modify records with full audit trail

## Daily Reports

Runs automatically at 11:59 PM EST via GitHub Actions.

**Report Contents:**
- Build summary grouped by operator/station/part
- Grand totals by part number and operator
- Raw data sheet with all barcodes
- Individual sheets for each operator

**Backup:**
- Copies data to Google Sheets (optional)

## License

Private - Polytechnic Resources Inc.
