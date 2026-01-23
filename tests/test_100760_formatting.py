"""
Test script to verify Part ID 100760 formatting rule
Tests that 100760 is formatted as "100 760" in the daily report functions
"""

import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from daily_report import apply_part_number_variant

def test_100760_formatting():
    """Test that Part ID 100760 is formatted with a space"""
    
    # Test data
    test_cases = [
        {
            "part": "100760",
            "serials": ["760E12345"],
            "expected": "100 760",
            "description": "Part 100760 should be formatted as '100 760'"
        },
        {
            "part": "100760E",
            "serials": ["760E12345"],
            "expected": "100760E",
            "description": "Part 100760E should NOT be modified (different part)"
        },
        {
            "part": "100759",
            "serials": ["759E12345"],
            "expected": "100759",
            "description": "Part 100759 should NOT be modified (different part)"
        },
        {
            "part": "PFR60W",
            "serials": ["PFR6W12345"],
            "expected": "301-PFR60W",
            "description": "PFR parts should still get 301- prefix"
        },
        {
            "part": "536713-001",
            "serials": ["MGC1S17775"],
            "expected": "536713-001S",
            "description": "MGC variants should still work"
        }
    ]
    
    print("=" * 70)
    print("Testing Part ID 100760 Formatting Rule")
    print("=" * 70)
    
    all_passed = True
    
    for i, test in enumerate(test_cases, 1):
        result = apply_part_number_variant(test["part"], test["serials"])
        passed = result == test["expected"]
        
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"\nTest {i}: {status}")
        print(f"  Description: {test['description']}")
        print(f"  Input Part:  '{test['part']}'")
        print(f"  Expected:    '{test['expected']}'")
        print(f"  Got:         '{result}'")
        
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 70)
    if all_passed:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("=" * 70)
    
    return all_passed

if __name__ == "__main__":
    success = test_100760_formatting()
    sys.exit(0 if success else 1)
