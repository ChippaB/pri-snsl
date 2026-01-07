# Quick Report Runner

Easy way to run the daily report locally for testing.

## What It Does

Runs `daily_report.py` in **test mode** (no email sent), then automatically copies the generated Excel files to your local `output/` folder for easy access.

## Usage

```bash
# Navigate to scripts folder
cd scripts

# Run for yesterday (default)
python quick_report.py

# Run for specific date
python quick_report.py 2025-01-07

# Run for today
python quick_report.py --today
```

## Output Files

After running, check the `output/` folder (created in project root):

```
pri-snsl/output/
├── Build_Report_01-07-2026.xlsx      # Daily build report with all sheets
└── QB_Build_Assembly_01-07-2026.xlsx   # QuickBooks import file
```

## Requirements

- Python 3.x installed
- Required packages (see `requirements.txt`):
  ```bash
  pip install -r requirements.txt
  ```

## Prerequisites

Your `.env` file or GitHub Secrets must have these configured:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase service role key

If credentials aren't set, the script will fail with:
```
[ERROR] SUPABASE_KEY not configured
```

## What the Script Does

1. **Creates output folder** (if it doesn't exist)
2. **Runs daily_report.py** in test mode
   - Queries Supabase for scans on specified date
   - Generates Excel reports in system temp directory
   - Skips email sending (--test flag)
3. **Copies Excel files** from temp to `output/`
4. **Shows results** - Lists all generated files

## Test Mode vs Production Mode

| Mode | Email Sent | Files Saved To |
|-------|-------------|-----------------|
| `--test` (this script) | ❌ No | `output/` folder |
| Production (GitHub Actions) | ✅ Yes | Email attachments only |

## Troubleshooting

### "daily_report.py not found"
You must be in the `scripts/` directory:
```bash
cd path/to/pri-snsl/scripts
python quick_report.py
```

### "SUPABASE_KEY not configured"
Your environment doesn't have Supabase credentials. Set them in:
- GitHub repository secrets (for production)
- OR edit `daily_report.py` lines 47-49 (for local testing)

### No output files copied
This could mean:
1. No scans found for that date
2. `daily_report.py` encountered an error

Check the output above for error messages.

## Example Output

```
============================================================
Running Daily Report - TEST MODE
============================================================

Target Date: 2026-01-07
Output Directory: C:\Users\chipb\Documents\Github\pri-snsl\output\

[INFO] Executing: python daily_report.py --test
[INFO] Generating Build Report for 2026-01-07
[INFO] Found 150 scans
[OK] Generated Excel report: C:\Users\chipb\AppData\Local\Temp\tmp12345.xlsx
[OK] Generated QuickBooks import file: C:\Users\chipb\AppData\Local\Temp\tmp67890.xlsx

============================================================
Copying output files...
============================================================

[INFO] Looking for output files in: C:\Users\chipb\AppData\Local\Temp
[OK] Copied: Build_Report_01-07-2026.xlsx
[OK] Copied: QB_Build_Assembly_01-07-2026.xlsx

============================================================
✅ SUCCESS! 2 file(s) copied to output/
============================================================

Generated files:
   - Build_Report_01-07-2026.xlsx
   - QB_Build_Assembly_01-07-2026.xlsx

📁 Location: C:\Users\chipb\Documents\Github\pri-snsl\output

💡 Tip: Open the files from here to review before using
```

## Why Use This Instead of GitHub Actions?

✅ **Faster feedback** - See report in seconds vs waiting for workflow
✅ **No GitHub Secrets needed** - Use local .env file
✅ **Easier debugging** - Console output shows all details
✅ **Review before sending** - Check Excel files before production run
✅ **Test different dates** - Run historical reports without changing workflow
