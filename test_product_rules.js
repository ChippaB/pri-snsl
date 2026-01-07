/**
 * Test for Product-Specific Serial Extraction (v8.6.6)
 * Tests the PRODUCT_SERIAL_RULES system for targeted serial number extraction
 */

const PRODUCT_SERIAL_RULES = {
    'PUL9000K': {
        pattern: /^(PUL9000K\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full PUL9000K + 5 digits, ignore trailing check digits/padding'
    }
};

function applyProductSpecificSerialExtraction(partCode, serial) {
    if (!partCode || !serial) return serial;

    const rule = PRODUCT_SERIAL_RULES[partCode];
    if (!rule) return serial;

    const match = serial.match(rule.pattern);
    if (match && match[rule.extractGroup]) {
        const extracted = match[rule.extractGroup];
        return extracted;
    }

    return serial;
}

const tests = [
    // PUL9000K patterns - should extract full PUL9000K + 5 digits
    { part: 'PUL9000K', input: 'PUL9000K29689', expected: 'PUL9000K29689', desc: 'PUL9000K with exactly 5 digits' },
    { part: 'PUL9000K', input: 'PUL9000K296890', expected: 'PUL9000K29689', desc: 'PUL9000K with trailing 0 (check digit)' },
    { part: 'PUL9000K', input: 'PUL9000K123456', expected: 'PUL9000K12345', desc: 'PUL9000K with extra trailing digit' },
    { part: 'PUL9000K', input: 'PUL9000K99999F', expected: 'PUL9000K99999', desc: 'PUL9000K with letter check digit' },

    // Non-matching product - should pass through unchanged
    { part: 'MGC1S', input: 'MGC1S17754', expected: 'MGC1S17754', desc: 'MGC1S - no rule, pass through' },
    { part: 'R756W', input: 'R756W12345', expected: 'R756W12345', desc: 'R756W - no rule, pass through' },

    // Edge cases
    { part: 'PUL9000K', input: 'PUL9000K1234', expected: 'PUL9000K1234', desc: 'PUL9000K with only 4 digits (no match)' },
    { part: '', input: 'PUL9000K296890', expected: 'PUL9000K296890', desc: 'Empty part code - pass through' },
    { part: null, input: 'PUL9000K296890', expected: 'PUL9000K296890', desc: 'Null part code - pass through' },
];

console.log('\n=== PRODUCT-SPECIFIC SERIAL EXTRACTION TESTS ===\n');
let passed = 0, failed = 0;

tests.forEach((test, i) => {
    const result = applyProductSpecificSerialExtraction(test.part, test.input);
    const status = result === test.expected ? 'PASS' : 'FAIL';
    if (result === test.expected) passed++; else failed++;

    console.log(`${i + 1}. ${status}: ${test.desc}`);
    console.log(`   Part:     ${test.part || '(none)'}`);
    console.log(`   Input:    "${test.input}"`);
    console.log(`   Expected:  "${test.expected}"`);
    console.log(`   Got:       "${result}"`);
    console.log('');
});

console.log(`=== RESULTS: ${passed}/${tests.length} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
