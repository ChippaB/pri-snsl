
import re

def extract_serial_header_old(serial):
    if not serial:
        return "UNKNOWN"
    target = serial.split("-")[0]
    if len(target) <= 5:
        return target or "UNKNOWN"
    mgc_match = re.match(r"^(MGC[0-9K]*[SC])(\d{5,})$", target, re.IGNORECASE)
    if mgc_match:
        return mgc_match.group(1)
    return target[:-5]

def extract_serial_header_new(serial):
    if not serial:
        return "UNKNOWN"
    target = serial.split("-")[0]
    
    # Use greedy regex to find the longest trailing digit sequence of 5 or more
    # We use (.*?) for header (non-greedy) and (\d{5,})$ for serial (greedy check?)
    # Actually (\d{5,}) is greedy by default.
    match = re.search(r'^(.*?)(\d{5,})$', target)
    if match:
        return match.group(1) or "UNKNOWN" # Return header
        
    return target[:-5] # Fallback if no 5+ digit sequence found

test_cases = [
    ("MGC2900527", "MGC2"),
    ("R756EL119984", "R756EL"),
    ("758EL11198", "758EL"),
    ("MGCK1S58198", "MGCK1S"),
    ("MGC1S17775", "MGC1S"),
    ("123456", "1"), # Header "1", serial "23456"? Or Header "" Serial "123456"?
                     # With .*?, header is "" (empty), serial 123456.
                     # User probably wants UNKNOWN or empty.
    ("12345", ""),   # serial 12345
    ("ABC1234", "ABC"), # serial 1234 (4 digits) -> regex fails? \d{5,} needs 5.
                        # Fallback target[:-5] -> ABC1234 -> ABC12 (7-5=2). NO.
                        # target[:-5] on ABC1234 is AB.
                        # New logic: match fails. Fallback target[:-5]?
                        # Wait, for ABC1234 (7 chars). Old Logic: AB. 
                        # Is that desired? Probably not important for this task.
    ("R758EL11200", "R758EL"),
    ("756EW15488", "756EW")
]

print("Testing OLD vs NEW logic:")
for serial, expected in test_cases:
    old = extract_serial_header_old(serial)
    new = extract_serial_header_new(serial)
    print(f"Serial: {serial:15} Expected: {expected:10} Old: {old:10} New: {new:10} {'✅' if new == expected else '❌'}")

