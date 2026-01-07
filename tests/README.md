# Test Suite

This folder contains automated tests for the barcode scanning system.

## Tests

### test_validation.js
**Purpose:** Test client-side barcode validation logic

**Tests:**
- GS1-128 format validation
- HIBC format validation
- Custom format validation
- Minimum length checks
- Suspicious character detection
- Empty/null input handling

**Run:** `node test_validation.js`

**Expected Result:** 8/8 tests passing

---

### test_hibc_check_digit.js
**Purpose:** Test HIBC barcode check digit stripping logic (v8.6.4)

**Tests:**
- Letter check digits (always stripped)
- Special character check digits (always stripped)
- Digit check digits with >6 trailing chars (stripped)
- Digit check digits with 6 trailing chars (NOT stripped - could be serial)
- Digit check digits with ≤5 trailing chars (NOT stripped)
- All-numeric serials (last digit stripped)
- Edge cases (single char, two chars)

**Key Logic (v8.6.4):**
```javascript
// >6 trailing digits → strip (must have check digit)
// =6 trailing digits → don't strip (ambiguous: 5+check or 6-digit serial)
// ≤5 trailing digits → don't strip (serial too short)
```

**Run:** `node test_hibc_check_digit.js`

**Expected Result:** 14/14 tests passing

**Examples:**
- `R757WM102694` → `R757WM102694` (6-digit serial, no check digit)
- `R757WM1026990` → `R757WM102699` (5-digit serial + check digit '0')
- `R757WM102698%` → `R757WM102698` (special char check digit stripped)

---

### test_mgc_fix.py
**Purpose:** Test MGC part number variant suffix detection (v8.6.3)

**Tests:**
- MGC1S, MGC2S (S suffix)
- MGC4C, MGCK2S (C suffix)
- Pattern matching: `^MGC.*(S|C)$`

**Run:** `python test_mgc_fix.py`

**Expected Result:** 9/9 tests passing

**Examples:**
- MGC1S17775 → append 'S' suffix
- MGC4C93025 → append 'C' suffix
- MGCK1S58198 → append 'S' suffix

---

## Running All Tests

```bash
# JavaScript tests
node test_validation.js
node test_hibc_check_digit.js

# Python test
python test_mgc_fix.py
```

## Test Coverage

Current test coverage focuses on:
- ✅ Barcode validation (rejection criteria)
- ✅ HIBC parsing (check digit stripping)
- ✅ MGC variants (suffix detection)

**Not covered:**
- GS1-128 parsing (assumed working)
- Custom format parsing (format-specific logic)
- Database operations (requires live Supabase connection)
