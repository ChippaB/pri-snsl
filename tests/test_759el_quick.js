/**
 * Quick test for 759EL serial number parsing
 * Run with: node test_759el_quick.js
 */

// Simulated product rule
const PRODUCT_SERIAL_RULES = {
    '759EL': {
        pattern: /^(R?759EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full R759EL or 759EL + 5 digits, ignore trailing check digits/padding'
    }
};

function applyProductSpecificSerialExtraction(partCode, serial) {
    if (!partCode || !serial) return serial;
    const rule = PRODUCT_SERIAL_RULES[partCode];
    if (!rule) return serial;
    const match = serial.match(rule.pattern);
    if (match && match[rule.extractGroup]) {
        return match[rule.extractGroup];
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

            // FIXED: >5 instead of >6
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

    console.log(`  After prefix removal: part="${p}", serial="${sNum}"`);

    // Strip check digit
    const beforeStrip = sNum;
    sNum = stripCheckDigit(sNum);
    console.log(`  After check digit strip: "${beforeStrip}" → "${sNum}"`);

    // Handle 446-prefix
    if (p.startsWith('446') && p.length > 4) {
        if (p === '4461007801') {
            p = '100780W';
        } else if (p.includes('PUL') || p.endsWith('1') || p.endsWith('0')) {
            p = p.substring(3, p.length - 1);
        }
    }

    console.log(`  After 446 handling: part="${p}"`);

    // Apply product-specific rules
    const extractedSerial = applyProductSpecificSerialExtraction(p, sNum);
    console.log(`  After product rule: serial="${extractedSerial}"`);

    return { part: p, serial: extractedSerial };
}

// TEST
console.log('\n=== Testing 759EL Serial ===\n');
const raw = '+B446759EL1/$+R759EL140793';
console.log(`Raw scan: "${raw}"\n`);

const result = parseHIBC(raw);

console.log('\n=== RESULT ===');
console.log(`Part ID: ${result.part}`);
console.log(`Serial Number: ${result.serial}`);
console.log('\n=== ANALYSIS ===');
console.log(`Current in DB: R759EL140793 (6 digits after L)`);
console.log(`Should be:     ${result.serial} (5 digits after L)`);
console.log(`Match: ${result.serial === 'R759EL14079' ? '✓ CORRECT' : '✗ INCORRECT'}`);
