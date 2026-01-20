/**
 * Test script to verify the 100760E end-cap fix
 * Run with: node test_760e_endcap_fix.js
 */

// Simulated PRODUCT_SERIAL_RULES (copy from app.js)
const PRODUCT_SERIAL_RULES = {
    '100760E': {
        pattern: /^(760E\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 760E + 5 digits, ignore trailing check digits/padding (end-cap fix 2026-01-20)'
    }
};

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

// Simulate check digit stripping (from app.js lines 1268-1299)
function stripCheckDigit(sNum) {
    if (sNum.length <= 1) return sNum;

    const lastChar = sNum.charAt(sNum.length - 1);
    const isLetter = /^[A-Z]$/i.test(lastChar);
    const isSpecialChar = /^[\-\.\$\/\+\%]$/.test(lastChar);

    if (isLetter || isSpecialChar) {
        return sNum.substring(0, sNum.length - 1);
    } else {
        const letterMatches = sNum.match(/[A-Z]/gi);
        if (letterMatches) {
            const lastLetter = letterMatches[letterMatches.length - 1];
            const lastLetterPos = sNum.lastIndexOf(lastLetter);
            const trailingChars = sNum.substring(lastLetterPos + 1);

            if (trailingChars.length > 6) {
                return sNum.substring(0, sNum.length - 1);
            }
        } else {
            return sNum.substring(0, sNum.length - 1);
        }
    }
    return sNum;
}

// Simulate parsePN_SN for HIBC format (simplified)
function parseHIBC(raw) {
    const parts = raw.split('/$+');
    if (parts.length < 2) return { part: '', serial: '' };
    let p = parts[0], sNum = parts[1];

    if (p.startsWith('+B')) {
        p = p.substring(1);
        if (p.startsWith('B')) p = p.substring(1);
        if (sNum.startsWith('+')) sNum = sNum.substring(1);
    } else {
        if (sNum.startsWith('+')) sNum = sNum.substring(1);
    }

    // Strip check digit from serial
    sNum = stripCheckDigit(sNum);

    // Special handling for 446-prefix HIBC barcodes
    if (p.startsWith('446') && p.length > 4) {
        if (p === '4461007801') {
            p = '100780W';
        } else if (p.includes('PUL') || p.endsWith('1') || p.endsWith('0')) {
            p = p.substring(3, p.length - 1);
        }
    }

    // Apply product-specific serial extraction rules
    const extractedSerial = applyProductSpecificSerialExtraction(p, sNum);

    return { part: p, serial: extractedSerial };
}

// TEST CASES
console.log('\n=== 100760E END-CAP FIX TEST ===\n');

const testCases = [
    {
        raw: '+B446100760E1/$+760E132864',
        expectedPart: '100760E',
        expectedSerial: '760E13286',
        desc: 'Original incident barcode - end-cap should be stripped'
    },
    {
        raw: '+B446100760E1/$+760E132735',
        expectedPart: '100760E',
        expectedSerial: '760E13273',
        desc: 'Another 100760E barcode - 5 digit serial'
    }
];

let passed = 0, failed = 0;

testCases.forEach((test, i) => {
    const result = parseHIBC(test.raw);
    const partOk = result.part === test.expectedPart;
    const serialOk = result.serial === test.expectedSerial;
    const status = partOk && serialOk ? '✓ PASS' : '✗ FAIL';

    if (partOk && serialOk) passed++; else failed++;

    console.log(`${i + 1}. ${status}: ${test.desc}`);
    console.log(`   Raw:      "${test.raw}"`);
    console.log(`   Part:     "${result.part}" (expected: "${test.expectedPart}") ${partOk ? '✓' : '✗'}`);
    console.log(`   Serial:   "${result.serial}" (expected: "${test.expectedSerial}") ${serialOk ? '✓' : '✗'}`);
    console.log('');
});

console.log(`=== RESULTS: ${passed}/${testCases.length} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
