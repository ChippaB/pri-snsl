/**
 * Test for HIBC Check Digit Validation Fix (v8.6.3)
 * Tests that check digits are only stripped when they are valid HIBC characters
 */

// Simulate the check digit stripping logic (v8.6.3)
function stripCheckDigit(sNum) {
    if (sNum.length <= 1) return sNum;

    const lastChar = sNum.charAt(sNum.length - 1);
    const isLetter = /^[A-Z]$/i.test(lastChar);
    const isSpecialChar = /^[\-\.\$\/\+\%]$/.test(lastChar);
    const hasLetters = /[A-Z]/i.test(sNum);

    // Always strip letters and special chars (they're clearly check digits)
    if (isLetter || isSpecialChar) {
        return sNum.substring(0, sNum.length - 1);
    }
    // For digits: check if we have enough trailing chars to safely strip
    else {
        const letterMatches = sNum.match(/[A-Z]/gi);
        if (letterMatches) {
            const lastLetter = letterMatches[letterMatches.length - 1];
            const lastLetterPos = sNum.lastIndexOf(lastLetter);
            const trailingChars = sNum.substring(lastLetterPos + 1);

            // Only strip if we have >5 trailing chars (leaves 5+ after strip)
            if (trailingChars.length > 5) {
                return sNum.substring(0, sNum.length - 1);
            }
        } else {
            // All numeric serial - strip last digit
            return sNum.substring(0, sNum.length - 1);
        }
    }
    return sNum;
}

// Test cases
const tests = [
    // Letters and special chars - always stripped (unambiguous check digits)
    { input: 'R757WM102689%', expected: 'R757WM102689', desc: 'Alphanumeric with % - % stripped' },
    { input: 'R757WM102689Y', expected: 'R757WM102689', desc: 'Alphanumeric with letter Y - Y stripped' },
    { input: 'R757WM102689.', expected: 'R757WM102689', desc: 'Alphanumeric with . - . stripped' },
    { input: 'TNN10212238F', expected: 'TNN10212238', desc: 'Alphanumeric with letter F - F stripped' },

    // All-numeric serials - last digit stripped (assumed check digit)
    { input: '1234567890', expected: '123456789', desc: 'Pure numeric - last digit stripped' },

    // Alphanumeric with >5 trailing digits - last digit stripped
    { input: '760E2107185', expected: '760E210718', desc: 'Alphanumeric with 7 trailing digits - digit stripped (6 remain)' },
    { input: '757EN112036', expected: '757EN11203', desc: 'Alphanumeric with 6 trailing digits - digit stripped (5 remain)' },

    // Alphanumeric with ≤5 trailing digits - NOT stripped
    { input: 'R757WM10269', expected: 'R757WM10269', desc: 'Exactly 5 trailing digits - NOT stripped' },
    { input: 'MGC1S17754', expected: 'MGC1S17754', desc: '5 trailing digits - NOT stripped' },

    // NOTE: R757WM102694 (6 trailing digits, ends in '4') would be stripped to R757WM10269
    // BUT: This barcode will be REJECTED at validation stage (before parsing) because
    // R757WM barcodes must end with letter/special char, not digit (see app.js:745-756)

    // Edge cases
    { input: 'A', expected: 'A', desc: 'Single char - not stripped' },
    { input: 'AB', expected: 'A', desc: 'Two letters - last stripped' },
];

console.log('\n=== HIBC CHECK DIGIT VALIDATION TESTS ===\n');
let passed = 0, failed = 0;

tests.forEach((test, i) => {
    const result = stripCheckDigit(test.input);
    const status = result === test.expected ? 'PASS' : 'FAIL';
    if (result === test.expected) passed++; else failed++;

    console.log(`${i + 1}. ${status}: ${test.desc}`);
    console.log(`   Input:    "${test.input}"`);
    console.log(`   Expected: "${test.expected}"`);
    console.log(`   Got:      "${result}"`);
    console.log('');
});

console.log(`=== RESULTS: ${passed}/${tests.length} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
