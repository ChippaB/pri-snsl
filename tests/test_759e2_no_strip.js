/**
 * Test: 100759E2 HIBC serial must keep full 759E + 7 digits (no trailing digit stripped).
 * Problem record: raw +B446100759E21/$+759E2109879 was stored as 759E210987 (last 9 dropped).
 * Run: node tests/test_759e2_no_strip.js
 */

const VALIDATION_CONFIG = {
    HIBC_MAX_TRAILING_BEFORE_STRIP: {
        '100756E2': 6, '100757E2': 6, '100758E2': 6,
        '100759E2': 7
    }
};

const PRODUCT_SERIAL_RULES = {
    '100759E2': {
        pattern: /^(759E\d{7}).*$/,
        extractGroup: 1
    }
};

function applyProductSpecificSerialExtraction(partCode, serial) {
    if (!partCode || !serial) return serial;
    const rule = PRODUCT_SERIAL_RULES[partCode];
    if (!rule) return serial;
    const match = serial.match(rule.pattern);
    if (match && match[rule.extractGroup]) return match[rule.extractGroup];
    return serial;
}

function parseHIBC_759E2(raw) {
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
    let partForStrip = p;
    if (p.startsWith('446') && p.length > 4) {
        if (p === '4461007801') partForStrip = '100780W';
        else if (p.includes('PUL') || p.endsWith('1') || p.endsWith('0')) partForStrip = p.substring(3, p.length - 1);
    }
    if (sNum.length > 1) {
        const lastChar = sNum.charAt(sNum.length - 1);
        const isLetter = /^[A-Z]$/i.test(lastChar);
        const isSpecialChar = /^[\-\.\$\/\+\%]$/.test(lastChar);
        if (isLetter || isSpecialChar) {
            sNum = sNum.substring(0, sNum.length - 1);
        } else {
            const letterMatches = sNum.match(/[A-Z]/gi);
            if (letterMatches) {
                const lastLetter = letterMatches[letterMatches.length - 1];
                const lastLetterPos = sNum.lastIndexOf(lastLetter);
                const trailingChars = sNum.substring(lastLetterPos + 1);
                const maxTrailing = (VALIDATION_CONFIG.HIBC_MAX_TRAILING_BEFORE_STRIP && VALIDATION_CONFIG.HIBC_MAX_TRAILING_BEFORE_STRIP[partForStrip]) ?? 5;
                if (trailingChars.length > maxTrailing) {
                    sNum = sNum.substring(0, sNum.length - 1);
                }
            } else {
                sNum = sNum.substring(0, sNum.length - 1);
            }
        }
    }
    if (p.startsWith('446') && p.length > 4) {
        if (p === '4461007801') p = '100780W';
        else if (p.includes('PUL') || p.endsWith('1') || p.endsWith('0')) p = p.substring(3, p.length - 1);
    }
    const serial = applyProductSpecificSerialExtraction(p, sNum);
    return { part: p, serial };
}

const raw = '+B446100759E21/$+759E2109879';
const result = parseHIBC_759E2(raw);
const expectedSerial = '759E2109879';
const ok = result.serial === expectedSerial && result.part === '100759E2';

console.log('759E2 no-strip test:', ok ? 'PASS' : 'FAIL');
console.log('  Raw:', raw);
console.log('  Part:', result.part, result.part === '100759E2' ? '✓' : '✗');
console.log('  Serial:', result.serial, result.serial === expectedSerial ? '✓' : '✗ (expected ' + expectedSerial + ')');
process.exit(ok ? 0 : 1);
