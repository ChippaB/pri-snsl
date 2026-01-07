"""
Generate PRODUCT_SERIAL_RULES from MASTER TRUTH (serial_numbers.db)
This script creates JavaScript rules based on actual data from 31,188 records.
"""

import sqlite3
import re

DB_PATH = "serial_numbers.db"
OUTPUT_FILE = "product_rules_master_truth.js"


def count_digits_after_prefix(serial):
    """Count digits after last letter in serial number."""
    if not serial:
        return 0, ""

    # Handle dash in part IDs
    serial = serial.split("-")[0] if "-" in serial else serial

    # Find last letter and count digits after
    match = re.search(r"[A-Z]([0-9]*)$", serial)
    if match:
        digits = len(match.group(1))
        # Extract prefix
        prefix_match = re.match(r"^(.+?)(\d+)$", serial)
        if prefix_match:
            prefix = prefix_match.group(1)
            return digits, prefix
    return 0, ""


def analyze_part_serials(cursor, part_id):
    """Analyze serials for a specific part ID."""
    cursor.execute(
        "SELECT serial_number FROM serial_ledger WHERE part_id = ?", (part_id,)
    )
    serials = [row[0] for row in cursor.fetchall()]

    if not serials:
        return None

    digit_counts = set()
    prefixes = {}

    for serial in serials:
        digits, prefix = count_digits_after_prefix(serial)
        digit_counts.add(digits)
        prefixes[prefix] = prefixes.get(prefix, 0) + 1

    unique_counts = sorted(digit_counts)

    # Find most common
    if digit_counts:
        most_common = max(
            digit_counts,
            key=lambda x: sum(
                1
                for s in serials
                if count_digits_after_prefix(s.split("-")[0] if "-" in s else s)[0] == x
            ),
        )
        most_common_prefix = (
            max(prefixes.items(), key=lambda x: x[1])[0] if prefixes else ""
        )
    else:
        most_common = 0
        most_common_prefix = ""

    # Only include if consistent
    if len(unique_counts) == 1 and most_common > 0:
        return {
            "part_id": part_id,
            "count": most_common,
            "prefix": most_common_prefix,
            "total_records": len(serials),
            "is_consistent": True,
        }

    return {"part_id": part_id, "total_records": len(serials), "is_consistent": False}


def generate_javascript_rules(rules):
    """Generate JavaScript PRODUCT_SERIAL_RULES code."""
    lines = [
        "// ===== PRODUCT-SPECIFIC SERIAL EXTRACTION RULES =====",
        "// Generated from MASTER TRUTH (serial_numbers.db - 31,188 records)",
        "// Maps product codes to specific serial number extraction patterns",
        "",
        "const PRODUCT_SERIAL_RULES = {",
    ]

    # Sort by part ID
    sorted_rules = sorted(rules, key=lambda x: x["part_id"])

    for rule in sorted_rules:
        pid = rule["part_id"]
        count = rule["count"]
        prefix = rule["prefix"]
        total = rule["total_records"]

        # Escape backslashes for JavaScript regex
        escaped_prefix = prefix.replace("\\", "\\\\")

        lines.append(f"    '{pid}': {{")
        lines.append(f"        pattern: /^(\\\\{escaped_prefix}\\d{{{count}}}).*$$/$,")
        lines.append(f"        extractGroup: 1,")
        lines.append(
            f"        description: 'Extract full {prefix} + {count} digits ({total:,} records), ignore trailing check digits/padding'"
        )
        lines.append(f"    }},")

    lines.append("};")

    # Add summary comment
    consistent_count = sum(1 for r in rules if r["is_consistent"])
    total_count = len(rules)

    lines.append("")
    lines.append("// ===== SUMMARY =====")
    lines.append(
        f"// Total rules generated: {consistent_count} / {total_count} part IDs"
    )
    lines.append("// All rules based on MASTER TRUTH from serial_numbers.db")

    return "\n".join(lines)


def main():
    print("=" * 70)
    print("GENERATING PRODUCT_SERIAL_RULES FROM MASTER TRUTH")
    print("=" * 70)
    print()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all unique part IDs
    cursor.execute(
        "SELECT DISTINCT part_id FROM serial_ledger WHERE serial_number IS NOT NULL ORDER BY part_id"
    )
    part_ids = [row[0] for row in cursor.fetchall()]

    print(f"Analyzing {len(part_ids)} unique part IDs...")
    print()

    # Analyze each part
    rules = []
    for part_id in part_ids:
        result = analyze_part_serials(cursor, part_id)
        if result and result.get("is_consistent"):
            rules.append(result)

    # Generate JavaScript
    js_code = generate_javascript_rules(rules)

    # Write to file
    with open(OUTPUT_FILE, "w") as f:
        f.write(js_code)

    print(f"Generated {len(rules)} consistent rules")
    print(f"Output saved to: {OUTPUT_FILE}")
    print()

    # Print summary
    print("PART ID SUMMARY:")
    print("-" * 70)
    for rule in sorted(rules, key=lambda x: x["part_id"]):
        print(
            f"  {rule['part_id']:20} | {rule['count']} digits | {rule['prefix']:20} | {rule['total_records']:6,} records"
        )

    conn.close()


if __name__ == "__main__":
    main()
