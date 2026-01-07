# Product-Specific Serial Extraction Rules (v8.6.5)

## Overview

This update introduces a configurable system for handling problematic barcode formats where products have specific serial number patterns (e.g., fixed digit count after a prefix, check digits, padding, etc.).

## Problem Solved

### PUL9000K Issue
- **Raw barcode scan**: `+B446PUL9000K0/$+PUL9000K296890`
- **Current behavior (v8.6.4)**: Saves `PUL9000K296890` (WRONG - includes trailing `0`)
- **New behavior (v8.6.5)**: Saves `PUL9000K29689` (CORRECT - extracts exactly 5 digits)

The root cause: PUL9000K barcodes have pre-printed labels where the serial is exactly 5 digits after the "K", but sometimes include a check digit or padding that should be ignored.

## Implementation

### 1. Configuration Object (`PRODUCT_SERIAL_RULES`)

Located at the top of `app.js` (after `BARCODE_VALIDATION`):

```javascript
const PRODUCT_SERIAL_RULES = {
    'PUL9000K': {
        pattern: /^PUL9000K(\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract 5 digits after PUL9000K, ignore trailing check digits/padding'
    }
    // Add more products here as needed...
};
```

### 2. Extraction Function (`applyProductSpecificSerialExtraction`)

```javascript
function applyProductSpecificSerialExtraction(partCode, serial) {
    if (!partCode || !serial) return serial;

    const rule = PRODUCT_SERIAL_RULES[partCode];
    if (!rule) return serial;

    const match = serial.match(rule.pattern);
    if (match && match[rule.extractGroup]) {
        const extracted = match[rule.extractGroup];
        console.log(`📋 Product Rule Applied: ${partCode} → "${serial}" → "${extracted}"`);
        return extracted;
    }

    return serial;
}
```

### 3. Integration

Applied in `parsePN_SN()` function, in the HIBC parsing section, just before calling `sectionResult()`:

```javascript
// Apply product-specific serial extraction rules (v8.6.5)
const extractedSerial = applyProductSpecificSerialExtraction(p, sNum);
return sectionResult(p, extractedSerial);
```

## Adding New Rules

To add support for another product (e.g., ABC123 which requires exactly 4 digits):

```javascript
const PRODUCT_SERIAL_RULES = {
    'PUL9000K': {
        pattern: /^PUL9000K(\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract 5 digits after PUL9000K, ignore trailing check digits/padding'
    },
    'ABC123': {
        pattern: /^ABC123(\d{4}).*$/,
        extractGroup: 1,
        description: 'Extract 4 digits after ABC123, ignore check digits'
    }
};
```

### Rule Structure

| Field | Type | Required | Description |
|--------|-------|-----------|-------------|
| `pattern` | RegExp | Yes | Regex pattern to match the serial number. Use capture groups `()` to extract the desired digits. |
| `extractGroup` | Number | Yes | Which capture group to extract (1 = first set of parentheses). |
| `description` | String | No | Human-readable description for documentation. |

### Common Patterns

| Scenario | Example Pattern | Description |
|-----------|-----------------|-------------|
| Exact N digits after prefix | `/^ABC123(\d{5}).*$/` | Extract exactly 5 digits after "ABC123" |
| Prefix + N digits + optional suffix | `/^XYZ(\d{6})[A-Z]?$/` | Extract 6 digits, optional letter suffix ignored |
| Prefix + check digit (any char) | `/^PART(\d+).$/` | Extract all digits except last char |

## Testing

Run the test file to verify rules work correctly:

```bash
node test_product_rules.js
```

Expected output: `=== RESULTS: 9/9 passed, 0 failed ===`

## Benefits

1. **Targeted fixes**: Only affects products with known issues, no impact on other products
2. **Easy maintenance**: Add new rules without changing parsing logic
3. **Future-proof**: Handles check digits, padding, and other barcode anomalies
4. **Backward compatible**: Products without rules pass through unchanged

## Files Changed

- `app.js` - Added `PRODUCT_SERIAL_RULES`, `applyProductSpecificSerialExtraction()`, updated `parsePN_SN()`
- `index.html` - Updated version to v8.6.5
- `test_product_rules.js` - New test file for product rule validation

## Migration Notes

No database changes required. Existing scans are not affected - only new scans will use the new extraction logic.

To fix existing incorrect PUL9000K entries in the database, run:

```sql
UPDATE scans
SET serial_number = 'PUL9000K' || LEFT(serial_number, LENGTH(serial_number) - 6)
WHERE part_id = 'PUL9000K'
  AND LENGTH(serial_number) = LENGTH('PUL9000K296890');
```

(This is a generic example - adjust based on actual data.)
