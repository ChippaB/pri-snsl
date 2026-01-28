/**
 * Test script to verify the 758EL end-cap fix and serial header extraction
 * Run with: node test_758el_and_header_fix.js
 */

// ===== SIMULATED PRODUCT RULES (from product_rules_master_truth.js) =====
const PRODUCT_SERIAL_RULES = {
    '758EL': {
        pattern: /^(R?758EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full R758EL or 758EL + 5 digits, ignore trailing check digits/padding (end-cap fix 2026-01-28)'
    },
    'R756EL': {
        pattern: /^(R756EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full R756EL + 5 digits, ignore trailing check digits/padding (end-cap fix 2026-01-28)'
    },
    'R757ELMSN': {
        pattern: /^(R757ELMSN\d{5,6}).*$/,
        extractGroup: 1,
        description: 'Extract full R757ELMSN + 5-6 digits, ignore trailing check digits/padding (end-cap fix 2026-01-28)'
    }
};

// ===== SIMULATED PARSING LOGIC (from app.js) =====

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

            // FIXED: Changed from >6 to >5
            // Only strip if we have >5 trailing chars (leaves 5+ after strip)
            // This handles cases like R758EL111991 (6 digits) → R758EL11199 (5 digits)
            if (trailingChars.length > 5) {
                return sNum.substring(0, sNum.length - 1);
            }
        } else {
            return sNum.substring(0, sNum.length - 1);
        }
    }
    return sNum;
}

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

// ===== SIMULATED SERIAL HEADER EXTRACTION (from daily_report.py) =====

function extractSerialHeader(serial) {
    if (!serial) return "UNKNOWN";

    const target = serial.split("-")[0];

    if (target.length <= 5) return target || "UNKNOWN";

    // Special handling for MGC serials with S/C suffix
    const mgcMatch = target.match(/^(MGC[0-9K]*[SC])(\d{5,})$/i);
    if (mgcMatch) {
        return mgcMatch[1];
    }

    // Special handling for MGC serials WITHOUT S/C suffix (e.g., MGC290527, MGC2900594)
    // Pattern: MGC + optional K + single digit + 5+ trailing digits
    const mgcNoSuffixMatch = target.match(/^(MGCK?\d)(\d{5,})$/i);
    if (mgcNoSuffixMatch) {
        return mgcNoSuffixMatch[1];
    }

    // FIXED: General pattern - extract prefix before trailing 5+ digits
    const generalMatch = target.match(/^(.+?)(\d{5,})$/);
    if (generalMatch) {
        return generalMatch[1];
    }

    return target;
}

// ===== TEST CASES =====

console.log('\n=== TEST 1: 758EL CHECK DIGIT STRIPPING (app.js fix) ===\n');

const test758EL = [
    {
        raw: '+B446758EL1/$+R758EL11200R',
        expectedPart: '758EL',
        expectedSerial: 'R758EL11200',
        desc: 'R758EL11200 - correct (has letter check digit R)'
    },
    {
        raw: '+B446758EL1/$+R758EL111991',
        expectedPart: '758EL',
        expectedSerial: 'R758EL11199',
        desc: 'R758EL111991 - should strip trailing 1 (6 digits → 5 digits)'
    },
    {
        raw: '+B446758EL1/$+R758EL111980',
        expectedPart: '758EL',
        expectedSerial: 'R758EL11198',
        desc: 'R758EL111980 - should strip trailing 0 (6 digits → 5 digits)'
    },
    {
        raw: '+B446758EL1/$+R758EL11196+',
        expectedPart: '758EL',
        expectedSerial: 'R758EL11196',
        desc: 'R758EL11196 - correct (has special char check digit +)'
    },
    {
        raw: '+B446758EL1/$+R758EL11194$',
        expectedPart: '758EL',
        expectedSerial: 'R758EL11194',
        desc: 'R758EL11194 - correct (has special char check digit $)'
    }
];

let passed = 0, failed = 0;

test758EL.forEach((test, i) => {
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

console.log(`=== RESULTS: ${passed}/${test758EL.length} passed, ${failed} failed ===\n`);

// ===== TEST 2: SERIAL HEADER EXTRACTION (daily_report.py fix) =====

console.log('\n=== TEST 2: SERIAL HEADER EXTRACTION (daily_report.py fix) ===\n');

const testHeaders = [
    { serial: 'MGC290527', expected: 'MGC2', desc: 'MGC2 with 6 digits' },
    { serial: 'MGC2900594', expected: 'MGC2', desc: 'MGC2 with 7 digits' },
    { serial: 'MGC2900611', expected: 'MGC2', desc: 'MGC2 with 7 digits (another)' },
    { serial: 'R756EL11984', expected: 'R756EL', desc: 'R756EL with 5 digits' },
    { serial: 'R756EL111984', expected: 'R756EL', desc: 'R756EL with 6 digits' },
    { serial: 'R756EL11999', expected: 'R756EL', desc: 'R756EL with 5 digits' },
    { serial: 'R757ELMSN102345', expected: 'R757ELMSN', desc: 'R757ELMSN with 6 digits' },
    { serial: 'R757ELMSN10234', expected: 'R757ELMSN', desc: 'R757ELMSN with 5 digits' },
    { serial: 'MGCK173156', expected: 'MGCK1', desc: 'MGCK1 with 5 digits (existing)' },
    { serial: 'MGC2S104549', expected: 'MGC2S', desc: 'MGC2S with 6 digits' }
];

let headerPassed = 0, headerFailed = 0;

testHeaders.forEach((test, i) => {
    const result = extractSerialHeader(test.serial);
    const ok = result === test.expected;
    const status = ok ? '✓ PASS' : '✗ FAIL';

    if (ok) headerPassed++; else headerFailed++;

    console.log(`${i + 1}. ${status}: ${test.desc}`);
    console.log(`   Serial:   "${test.serial}"`);
    console.log(`   Header:   "${result}" (expected: "${test.expected}") ${ok ? '✓' : '✗'}`);
    console.log('');
});

console.log(`=== RESULTS: ${headerPassed}/${testHeaders.length} passed, ${headerFailed} failed ===\n`);

// ===== FINAL SUMMARY =====
const totalPassed = passed + headerPassed;
const totalFailed = failed + headerFailed;
const totalTests = test758EL.length + testHeaders.length;

console.log('\n=== FINAL SUMMARY ===');
console.log(`Total: ${totalPassed}/${totalTests} tests passed, ${totalFailed} failed`);

process.exit(totalFailed > 0 ? 1 : 0);
