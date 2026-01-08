"""
Quick Local Report Runner
Runs daily_report.py in test mode and saves output files to local directory.

Usage:
    python quick_report.py                    # Use yesterday's date
    python quick_report.py 2025-01-07         # Specific date
    python quick_report.py --today             # Use today's date

Output files saved to: ./output/
    - Build_Report_MM-DD-YYYY.xlsx          # Daily build report
    - QB_Build_Assembly_MM-DD-YYYY.xlsx   # QuickBooks import file
"""

import os
import sys
import shutil
import subprocess
from datetime import datetime, timedelta


def ensure_output_dir():
    """Create output directory if it doesn't exist"""
    output_dir = os.path.join(os.path.dirname(__file__), "..", "output")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"[INFO] Created output directory: {output_dir}")

    return output_dir


def copy_output_files(target_date, output_dir):
    """Copy generated Excel files from temp to local output directory"""
    import tempfile

    date_str = target_date.strftime("%m-%d-%Y")

    # Files that daily_report.py generates in temp directory
    files_to_find = [
        f"Build_Report_{date_str}.xlsx",
        f"QB_Build_Assembly_{date_str}.xlsx",
    ]

    # Get temp directory path
    temp_dir = tempfile.gettempdir()

    copied_files = []

    print(f"\n[INFO] Looking for output files in: {temp_dir}")

    for filename in files_to_find:
        source = os.path.join(temp_dir, filename)
        dest = os.path.join(output_dir, filename)

        if os.path.exists(source):
            shutil.copy2(source, dest)
            copied_files.append(filename)
            print(f"[OK] Copied: {filename}")
        else:
            print(f"[WARN] Not found: {filename}")

    return copied_files


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Run daily report locally and save to output/",
        epilog="Example: python quick_report.py 2025-01-07",
    )
    parser.add_argument(
        "date", nargs="?", help="Report date (YYYY-MM-DD). Default: yesterday"
    )
    parser.add_argument(
        "--today", action="store_true", help="Use today's date instead of yesterday"
    )
    args = parser.parse_args()

    # Determine target date
    if args.today:
        target_date = datetime.now()
    elif args.date:
        try:
            target_date = datetime.strptime(args.date, "%Y-%m-%d")
        except ValueError:
            print(f"[ERROR] Invalid date format: {args.date}. Use YYYY-MM-DD")
            sys.exit(1)
    else:
        target_date = datetime.now() - timedelta(days=1)

    date_str = target_date.strftime("%Y-%m-%d")

    # Ensure output directory exists
    output_dir = ensure_output_dir()

    # Run daily_report.py with --test flag
    print(f"\n{'=' * 60}")
    print(f"Running Daily Report - TEST MODE")
    print(f"{'=' * 60}")
    print(f"\nTarget Date: {date_str}")
    print(f"Output Directory: {output_dir}\n")

    try:
        cmd = [sys.executable, "daily_report.py"]

        # Add date argument if provided
        if args.date:
            cmd.append(args.date)

        # Add --test flag
        cmd.append("--test")

        print(f"[INFO] Executing: python daily_report.py {' '.join(cmd[2:])}\n")

        result = subprocess.run(
            cmd, capture_output=True, text=True, cwd=os.path.dirname(__file__)
        )

        # Print output from daily_report.py
        if result.stdout:
            print(result.stdout)

        if result.stderr:
            print(result.stderr)

        if result.returncode != 0:
            print(
                f"\n[ERROR] daily_report.py failed with exit code {result.returncode}"
            )
            sys.exit(1)

        # Copy output files from temp to local directory
        print(f"\n{'=' * 60}")
        print("Copying output files...")
        print(f"{'=' * 60}\n")

        copied_files = copy_output_files(target_date, output_dir)

        if copied_files:
            print(f"\n{'=' * 60}")
            print(f"SUCCESS! {len(copied_files)} file(s) copied to output/")
            print(f"{'=' * 60}\n")
            print(f"Generated files:")
            for filename in copied_files:
                print(f"   - {filename}")
            print(f"\nLocation: {os.path.abspath(output_dir)}")
            print(f"\nTip: Open the files from here to review before using")
        else:
            print("\n[WARN] No output files found. This could mean:")
            print("   1. No scans for this date")
            print("   2. daily_report.py encountered an error")
            print("   Check the output above for details.")

    except FileNotFoundError:
        print(
            "[ERROR] daily_report.py not found. Ensure you're in the scripts/ directory."
        )
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
