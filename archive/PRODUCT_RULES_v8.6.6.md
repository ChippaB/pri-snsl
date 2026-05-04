# Product-Specific Serial Extraction Rules (v8.6.6)

## Overview

This update introduces a configurable system for handling problematic barcode formats where products have specific serial number patterns (e.g., fixed digit count after prefix, check digits, padding, etc.).

## Problem Solved

### PUL9000K Issue
- **Raw barcode scan**: `+B446PUL9000K0/$+PUL9000K296890`
- **Previous behavior (v8.6.5)**: Saves `29689` (WRONG - missing PUL9000K prefix)
- **New behavior (v8.6.6)**: Saves `PUL9000K29689` (CORRECT - includes part prefix + 5 digits)

The root cause: v8.6.5 extracted only the serial digits, but client needs the full serial including the part number prefix for their workflow.

## Implementation

### 1. Configuration Object (`PRODUCT_SERIAL_RULES`)

Located at the top of `app.js` (after `BARCODE_VALIDATION`):

```javascript
const PRODUCT_SERIAL_RULES = {
    'PUL9000K': {
        pattern: /^(PUL9000K\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full PUL9000K + 5 digits, ignore trailing check digits/padding'
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
// Apply product-specific serial extraction rules (v8.6.6)
const extractedSerial = applyProductSpecificSerialExtraction(p, sNum);
return sectionResult(p, extractedSerial);
```

## Adding New Rules

To add support for another product (e.g., ABC123 which requires exactly 4 digits):

```javascript
const PRODUCT_SERIAL_RULES = {
    'PUL9000K': {
        pattern: /^(PUL9000K\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full PUL9000K + 5 digits, ignore trailing check digits/padding'
    },
    'ABC123': {
        pattern: /^(ABC123\d{4}).*$/,
        extractGroup: 1,
        description: 'Extract 4 digits after ABC123, ignore check digits'
    }
};
```

### Rule Structure

| Field | Type | Required | Description |
|--------|-------|-----------|-------------|
| `pattern` | RegExp | Yes | Regex pattern to match serial number. Use capture groups `()` to extract desired data. Use group 0 to extract entire matched pattern. |
| `extractGroup` | Number | Yes | Which capture group to extract (0 = entire match, 1 = first capture group, etc.). |
| `description` | String | No | Human-readable description for documentation. |

### Common Patterns

| Scenario | Example Pattern | Description |
|-----------|-----------------|-------------|
| Full match with prefix + N digits | `/^(PUL9000K\d{5}).*$/` | Extract PUL9000K + 5 digits, ignore anything after |
| Just N digits after prefix | `/^ABC123(\d{5}).*$/` | Extract only 5 digits after "ABC123" |
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
5. **Flexible extraction**: Can extract full match or specific capture groups

## Files Changed

- `app.js` - Added `PRODUCT_SERIAL_RULES`, `applyProductSpecificSerialExtraction()`, updated `parsePN_SN()`
- `index.html` - Updated version to v8.6.6
- `test_product_rules.js` - New test file for product rule validation
- `service-worker.js` - Updated cache name to force browser refresh

## Migration Notes

No database changes required. Existing scans are not affected - only new scans will use the new extraction logic.

The service worker cache name change from `seescan-v8.6.4-offline` to `seescan-v8.6.6-offline` forces all browsers to re-download the new JavaScript files on next load.
