"""
Compare Supabase scans against MASTER TRUTH from serial_numbers.db
Identifies records with incorrect serial number formats
"""

import sqlite3
import re

# Database paths
SUPABASE_DB = "serial_numbers.db"


def count_digits_after_prefix(serial):
    """Count digits after last letter in serial number."""
    if not serial:
        return 0, ""
    serial = serial.split("-")[0] if "-" in serial else serial

    # Find last letter and count digits after
    match = re.search(r"[A-Z]([0-9]*)$", serial)
    if match:
        return len(match.group(1)), match.group(0)
    return 0, ""


def analyze_supabase_serials():
    """Analyze Supabase scans (from serial_numbers.db analysis)"""
    print("=" * 70)
    print("ANALYZING SUPABASE SERIALS vs MASTER TRUTH")
    print("=" * 70)
    print()

    conn = sqlite3.connect(SUPABASE_DB)
    cursor = conn.cursor()

    # Get all Supabase scans
    cursor.execute("""
        SELECT id, part_id, serial_number, created_at
        FROM scans
        WHERE serial_number IS NOT NULL
        ORDER BY part_id, created_at
    """)

    supabase_scans = cursor.fetchall()
    print(f"Total Supabase scans: {len(supabase_scans)}")
    print()

    # Get MASTER TRUTH rules
    cursor.execute("SELECT * FROM product_variants ORDER BY part_id")
    master_variants = cursor.fetchall()

    # Create lookup: part_id -> (serial_prefix, expected_digits)
    master_rules = {}
    for variant in master_variants:
        pid = variant[1]  # part_id
        serial_prefix = variant[3] or ""  # serial_prefix

        # Count digits in serial_prefix
        if serial_prefix:
            match = re.search(r"[A-Z]([0-9]*)$", serial_prefix)
            if match:
                expected_digits = len(match.group(1))
            else:
                expected_digits = 0
        else:
            expected_digits = 0

        master_rules[pid] = (serial_prefix, expected_digits)

    # Analyze each scan
    issues = []
    by_part = {}

    for scan in supabase_scans:
        scan_id = scan[0]
        pid = scan[1] or "UNKNOWN"
        serial = scan[2]

        if pid not in master_rules:
            continue  # Skip if no master rule exists

        master_prefix, expected_digits = master_rules[pid]

        # Count digits in Supabase serial
        sb_digits, sb_prefix = count_digits_after_prefix(serial)

        # Check if format matches
        if sb_digits != expected_digits:
            issues.append(
                {
                    "id": scan_id,
                    "part_id": pid,
                    "supabase_serial": serial,
                    "supabase_digits": sb_digits,
                    "supabase_prefix": sb_prefix,
                    "master_prefix": master_prefix,
                    "master_digits": expected_digits,
                    "issue": f"Expected {expected_digits} digits, found {sb_digits}",
                }
            )

            if pid not in by_part:
                by_part[pid] = []
            by_part[pid].append(
                {
                    "id": scan_id,
                    "serial": serial,
                    "found_digits": sb_digits,
                    "expected_digits": expected_digits,
                }
            )

    # Summary
    print("=" * 70)
    print("ISSUES FOUND BY PART ID")
    print("=" * 70)
    print()

    for pid, scans_list in sorted(by_part.items()):
        print(f"{pid}:")
        for s in scans_list[:5]:  # Show first 5 examples
            print(
                f"  ID {s['id']:8} | {s['serial']:25} | Found {s['found_digits']} digits, Expected {s['expected_digits']} digits"
            )
        if len(scans_list) > 5:
            print(f"  ... and {len(scans_list) - 5} more records with same issue")
        print()

    print("=" * 70)
    print(f"Total issues found: {len(issues)} scans")
    print()

    # Generate SQL fix script
    generate_sql_fix_script(by_part, master_rules)

    conn.close()


def generate_sql_fix_script(by_part, master_rules):
    """Generate SQL script to fix incorrect serials"""
    print("=" * 70)
    print("GENERATING SQL FIX SCRIPT")
    print("=" * 70)
    print()

    lines = [
        "-- ============================================",
        "-- FIX SERIAL NUMBERS BASED ON MASTER TRUTH",
        "-- Generated: 2025-01-07",
        "-- Based on: serial_numbers.db (31,188 MASTER records)",
        "-- ============================================",
        "",
        "-- This script fixes serial_number values in Supabase scans table",
        "-- using the correct digit count from MASTER TRUTH.",
        "",
        "-- Each UPDATE fixes serials that don't match the expected pattern",
        "",
    ]

    for pid, scans_list in sorted(by_part.items()):
        if pid not in master_rules:
            continue

        master_prefix, expected_digits = master_rules[pid]

        if expected_digits == 0:
            continue  # Skip parts with no trailing digit requirement

        # Build SQL UPDATE statement
        serials_to_fix = [f"'{s['serial']}'" for s in scans_list]

        # Split into batches of 100 to avoid huge queries
        for i in range(0, len(serials_to_fix), 100):
            batch = serials_to_fix[i : i + 100]
            serial_list = ", ".join(batch)

            lines.append(f"-- Fix {pid} (batch {i // 100 + 1})")
            lines.append(f"-- Expected: {master_prefix} + {expected_digits} digits")
            lines.append(f"UPDATE scans")
            lines.append(
                f"SET serial_number = REGEXP_REPLACE(serial_number, '^(.*\\\\\\\\d{{{expected_digits}}}).*$', '\\\\1{expected_digits}')"
            )
            lines.append(f"WHERE part_id = '{pid}'")
            lines.append(f"  AND serial_number IN ({serial_list})")
            lines.append(
                f"  AND serial_number NOT REGEXP '^({master_prefix}\\\\\\d{{{expected_digits}}})$';"
            )
            lines.append(";")
            lines.append("")

    # Add verification query
    lines.append("")
    lines.append("-- ============================================")
    lines.append("-- VERIFICATION QUERIES")
    lines.append("-- ============================================")
    lines.append("")
    lines.append("-- Check for remaining issues after fix")
    lines.append("")

    for pid, scans_list in sorted(by_part.items()):
        if pid not in master_rules:
            continue

        master_prefix, expected_digits = master_rules[pid]

        if expected_digits == 0:
            continue

        lines.append(f"-- Verify {pid} has no issues")
        lines.append(f"SELECT COUNT(*) FROM scans")
        lines.append(f"WHERE part_id = '{pid}'")
        lines.append(
            f"  AND serial_number NOT REGEXP '^({master_prefix}\\\\\\d{{{expected_digits}}})$';"
        )
        lines.append(";")
        lines.append("")

    # Write to file
    output_file = "fix_supabase_serials.sql"
    with open(output_file, "w") as f:
        f.write("\n".join(lines))

    print(f"SQL script saved to: {output_file}")
    print()
    print("=" * 70)
    print("INSTRUCTIONS:")
    print("=" * 70)
    print("1. Review the issues listed above")
    print("2. Verify the MASTER TRUTH patterns are correct")
    print("3. Run fix_supabase_serials.sql in your Supabase SQL editor")
    print("   Or use Supabase dashboard: https://app.supabase.com")
    print("4. Run verification queries to confirm all fixes")
    print()
    print("⚠️  BACKUP YOUR DATA BEFORE RUNNING UPDATES!")
    print()


def main():
    analyze_supabase_serials()


if __name__ == "__main__":
    main()
