"""
Quick test for MGC part number S/C assignment fix
Tests the regex-based approach for identifying S/C suffix
"""
import re

def extract_serial_header(serial: str) -> str:
    """Extract serial header prefix (everything before last 5 digits)."""
    if not serial:
        return 'UNKNOWN'
    target = serial.split('-')[0]
    if len(target) <= 5:
        return target or 'UNKNOWN'
    return target[:-5]

def test_mgc_suffix_detection():
    """Test cases for MGC S/C suffix detection"""
    test_cases = [
        # (serial_number, expected_suffix, description)
        ('MGC1S17775', 'S', 'MGC1S pattern'),
        ('MGC2S10282', 'S', 'MGC2S pattern'),
        ('MGC1C10800', 'C', 'MGC1C pattern'),
        ('MGC2C20114', 'C', 'MGC2C pattern'),
        ('MGC4C93025', 'C', 'MGC4C pattern - previously failed'),
        ('MGCK1S58198', 'S', 'MGCK1S pattern'),
        ('MGCK2S14399', 'S', 'MGCK2S pattern - previously failed'),
        ('MGC3S12345', 'S', 'MGC3S pattern'),
        ('MGC17775', None, 'No S/C suffix in header'),
    ]

    print('\n=== MGC SUFFIX DETECTION TESTS ===\n')
    passed = 0
    failed = 0

    for serial, expected_suffix, description in test_cases:
        header = extract_serial_header(serial)
        match = re.search(r'^MGC.*(S|C)$', header, re.IGNORECASE)
        detected_suffix = match.group(1).upper() if match else None

        status = 'PASS' if detected_suffix == expected_suffix else 'FAIL'
        if detected_suffix == expected_suffix:
            passed += 1
        else:
            failed += 1

        print(f'{status}: {description}')
        print(f'  Serial: {serial}')
        print(f'  Header: {header}')
        print(f'  Expected: {expected_suffix}, Detected: {detected_suffix}')
        print()

    print(f'=== RESULTS: {passed}/{len(test_cases)} passed, {failed} failed ===\n')
    return failed == 0

if __name__ == '__main__':
    success = test_mgc_suffix_detection()
    exit(0 if success else 1)
