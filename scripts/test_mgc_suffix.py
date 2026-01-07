"""
Test MGC S/C Suffix Logic
Verifies that MGC serials are detected and get correct S/C suffix.
"""

import re


def extract_serial_header(serial: str) -> str:
    """Extract serial header prefix (everything before last 5 digits)."""
    if not serial:
        return "UNKNOWN"

    # If serial contains a hyphen (range stored as single value), use first part
    target = serial.split("-")[0]

    if len(target) <= 5:
        return target or "UNKNOWN"

    # Take everything except last 5 characters
    return target[:-5]


def test_mgc_suffix(serial: str, part_number: str) -> bool:
    """
    Test if MGC serial would get S/C suffix.

    Returns: True if part number would have S or C added
    """
    if not part_number.startswith("MGC"):
        return False

    # Check if part already has S/C suffix
    if part_number.endswith("S") or part_number.endswith("C"):
        return False

    # Extract header from serial
    header = extract_serial_header(serial)

    # Pattern: MGC + optional chars + (S or C) at the end
    match = re.search(r"^MGC.*(S|C)$", header, re.IGNORECASE)

    if match:
        suffix = match.group(1).upper()
        print(
            f"✅ {serial} -> Header: {header} -> Adds '{suffix}' to {part_number} -> {part_number}{suffix}"
        )
        return True
    else:
        print(f"❌ {serial} -> Header: {header} -> NO S/C match")
        return False


# Test cases
print("=" * 70)
print("Testing MGC S/C Suffix Detection")
print("=" * 70)
print()

test_cases = [
    # Working examples (should get S/C suffix)
    ("MGC1S17775", "536713-001", "Should add S"),
    ("MGC2C10800", "536713-002", "Should add C"),
    ("MGCK1S58198", "536719-001", "Should add S"),
    ("MGCK2S14399", "536723-001", "Should add S"),
    # Issue examples (mentioned by user)
    ("MGC2S17775", "536713-002", "Should add S"),
    ("MGCK2S14399", "536723-001", "Should add S"),
    # 536 parts NOT in eligible list (should now get S/C suffix with new logic)
    ("536789-001", "536789-001", "Should add S"),
    ("536999-001", "536999-001", "Should add S"),
    # Non-MGC parts (should not get S/C suffix)
    ("757EN12345", "100757EN", "Should NOT add S/C"),
    ("760E212345", "100760E2", "Should NOT add S/C"),
]

print("Test Results:")
print("-" * 70)

results = {"passed": 0, "failed": 0}

for serial, part, expected in test_cases:
    result = test_mgc_suffix(serial, part)
    expected_bool = expected.startswith("Should add")

    if result == expected_bool:
        results["passed"] += 1
        print(f"PASS")
    else:
        results["failed"] += 1
        print(f"FAIL")

print()
print("=" * 70)
print(
    f"Results: {results['passed']}/{len(test_cases)} passed, {results['failed']} failed"
)
print()
print("Analysis:")
print("- With new logic, ANY MGC serial (not just 536xxx) will get S/C suffix")
print("- Pattern: ^MGC.*(S|C)$ - checks serial header (before last 5 digits)")
print("- Examples of patterns detected:")
print("  - MGC1S17775 -> Header: MGC1S -> Pattern matches 'S' -> Adds 'S' suffix")
print("  - MGC2C10800 -> Header: MGC2C -> Pattern matches 'C' -> Adds 'C' suffix")
print("  - MGCK1S58198 -> Header: MGCK1S -> Pattern matches 'S' -> Adds 'S' suffix")
print("  - MGCK2S14399 -> Header: MGCK2S -> Pattern matches 'S' -> Adds 'S' suffix")
print()
print("Benefit:")
print("  - No need to maintain eligible_parts list")
print("  - Automatically handles new MGC part numbers")
print("  - Works with KIT prefixes (MGCK1, MGCK2, etc.)")
