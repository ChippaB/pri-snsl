# PRI Serial Number Log (SNSL)

A mobile-friendly Progressive Web App (PWA) for tracking production serial numbers through barcode scanning.

## Current Version: v8.6.4

**Latest Changes (Jan 7, 2026):**
- Fixed HIBC check digit stripping for mixed barcode formats
- Handles 6-digit serials without check digits
- Service worker error handling for offline scenarios
- Dashboard fixes

## What It Does

- **Scan Barcodes**: Operators scan boxes using mobile phones/tablets
- **Track Everything**: Every scan saved with operator, part, serial, station, and timestamp
- **Live Dashboard**: Real-time analytics with filters, search, and Excel export
- **Daily Reports**: Automatic email reports every night at midnight EST
- **Works Offline**: IndexedDB cache + service worker for spotty WiFi

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML/CSS/JavaScript (PWA) |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel (free tier) |
| Reports | GitHub Actions + Python |
| Offline | IndexedDB + Service Worker |

## Project Structure

```
pri-snsl/
├── index.html              # Main scanning app
├── dashboard.html          # Analytics dashboard (edit/delete, export)
├── my-scans.html          # Operator's personal scan history
├── app.js                 # Core application logic (parsing, validation)
├── service-worker.js       # PWA offline support (cache strategy)
├── manifest.json          # PWA manifest (installable)
├── icon-*.png            # App icons (192x512px)
├── favicon.ico            # Browser favicon
├── vercel.json            # Vercel hosting config
├── README.md              # This file (project overview)
├── CLIENT_SUMMARY.md       # Client-facing documentation
├── supabase_schema.md     # Database schema reference
├── scripts/
│   ├── daily_report.py     # Daily email report generation
│   ├── SETUP_GUIDE.md     # Report setup instructions
│   ├── requirements.txt     # Python dependencies
│   └── run_daily_report_manual.ps1  # Manual report runner
├── tests/
│   ├── test_hibc_check_digit.js  # HIBC parsing tests
│   ├── test_mgc_fix.py            # MGC variant tests
│   └── test_validation.js          # Barcode validation tests
├── archive/
│   ├── fix_hibc_serials.sql       # Historical data fixes
│   ├── fix_scan_part_ids.sql       # Part ID corrections
│   ├── supabase_flagged_scans.sql  # Flagged scans trigger
│   └── supabase_rls_fix.sql       # RLS policy fixes
└── .github/workflows/
    └── daily-report.yml    # Scheduled automation (11:59 PM EST)
```

## Barcode Format Support

| Format | Pattern | Example | Parsing |
|--------|----------|----------|----------|
| GS1-128 | `01` + 14 digits + serial | `0112345678901234...` | Standard GS1 parsing |
| HIBC | `/$+` delimiter | `+B446757WM1/$+R757WM102698%` | Modulo 43 check digit stripping |
| MGC | Alphanumeric (5-digit serials) | `MGC1S17754` | Part number extraction |
| Custom | Various patterns | `R756PUL12345` | Format detection |

### HIBC Barcode Handling

**v8.6.4 Logic:**
- Special character/letter check digits: Always stripped (unambiguous)
- Digit check digits with >6 trailing chars: Stripped (must have check digit)
- Digit check digits with ≤6 trailing chars: NOT stripped (could be serial without check digit)

**Examples:**
- `R757WM102698%` → `R757WM102698` (special char stripped)
- `R757WM1026990` → `R757WM102699` (7 trailing, digit stripped)
- `R757WM102694` → `R757WM102694` (6 trailing, NO strip - no check digit)
- `R757WM102698` → `R757WM102698` (5 trailing, NO strip - no check digit)

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
