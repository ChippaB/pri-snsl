// Quick validation test - extract and test the validation function
const BARCODE_VALIDATION = {
    MIN_RAW_LENGTH: 20,
    FORMATS: {
        GS1_128: { minLength: 28, pattern: /^01[0-9]{14}/ },
        HIBC: { minLength: 12, pattern: /\/\$\+/ }
    },
    SUSPICIOUS_CHARS: /[*#@!~`%^&()={}|[\]<>;:'"]/
};

function validateRawBarcode(rawScan) {
    if (!rawScan || typeof rawScan !== 'string') {
        return { valid: false, reason: 'Empty scan' };
    }

    const cleaned = rawScan.trim().replace(/[\x00-\x1F\x7F]/g, '');

    if (cleaned.length < BARCODE_VALIDATION.MIN_RAW_LENGTH) {
        return { valid: false, reason: `Too short: ${cleaned.length} chars (need ${BARCODE_VALIDATION.MIN_RAW_LENGTH}+)` };
    }

    if (BARCODE_VALIDATION.SUSPICIOUS_CHARS.test(cleaned)) {
        return { valid: false, reason: 'Contains invalid characters - possible scanner error' };
    }

    const isGS1 = cleaned.startsWith('01');
    const isHIBC = cleaned.includes('/$+');

    if (!isGS1 && !isHIBC) {
        if (cleaned.length >= BARCODE_VALIDATION.MIN_RAW_LENGTH) {
            return { valid: true };
        }
        return { valid: false, reason: 'Unknown barcode format' };
    }

    if (isGS1 && cleaned.length < BARCODE_VALIDATION.FORMATS.GS1_128.minLength) {
        return { valid: false, reason: `GS1-128 too short: ${cleaned.length} chars (need ${BARCODE_VALIDATION.FORMATS.GS1_128.minLength}+)` };
    }

    if (isHIBC && cleaned.length < BARCODE_VALIDATION.FORMATS.HIBC.minLength) {
        return { valid: false, reason: `HIBC too short: ${cleaned.length} chars (need ${BARCODE_VALIDATION.FORMATS.HIBC.minLength}+)` };
    }

    return { valid: true };
}

// Test cases
const tests = [
    // VALID cases - should pass
    { input: '0112345678901234211234567890123', expected: true, desc: 'Valid GS1-128 (31 chars)' },
    { input: '+B446PUL9000N1234/$+760E2107185', expected: true, desc: 'Valid HIBC (31 chars)' },
    { input: 'MGC1S17754ABCDEFGHIJK', expected: true, desc: 'Valid custom format (21 chars)' },

    // INVALID cases - should reject
    { input: 'ABC123', expected: false, desc: 'Too short (6 chars)' },
    { input: '0112345678901234', expected: false, desc: 'GS1-128 too short (16 chars)' },
    { input: '01234567890*1234567890', expected: false, desc: 'Contains suspicious char (*)' },
    { input: '', expected: false, desc: 'Empty string' },
    { input: null, expected: false, desc: 'Null input' },
];

console.log('\\n=== BARCODE VALIDATION TESTS ===\\n');
let passed = 0, failed = 0;

tests.forEach((test, i) => {
    const result = validateRawBarcode(test.input);
    const status = result.valid === test.expected ? '✓ PASS' : '✗ FAIL';
    if (result.valid === test.expected) passed++; else failed++;
    console.log(`${i + 1}. ${status}: ${test.desc}`);
    console.log(`   Input: "${test.input}" (${test.input ? test.input.length : 0} chars)`);
    console.log(`   Result: ${result.valid ? 'VALID' : 'INVALID - ' + result.reason}`);
    console.log('');
});

console.log(`=== RESULTS: ${passed}/${tests.length} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
