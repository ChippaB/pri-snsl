// Test for v8.8.3 fix - 757E2 serial truncation bug
// Barcode: +B446757E21/$+R757E210173
// Expected serial: R757E210173 (not R757E21017)

const BARCODE_VALIDATION = {
    HIBC_MAX_TRAILING_BEFORE_STRIP: {
        '100756E2': 6, '100757E2': 6, '100758E2': 6,
        '100759E2': 7,
        '757E2': 6      // v8.8.3 fix - 6 trailing chars after last letter
    }
};

function parsePN_SN(s) {
    const raw = String(s).toUpperCase().trim();

    if (raw.includes('/$+')) {
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

        // Resolve part id before stripping
        let partForStrip = p;
        if (p.startsWith('446') && p.length > 4) {
            if (p === '4461007801') partForStrip = '100780W';
            else if (p.includes('PUL') || p.endsWith('1') || p.endsWith('0')) partForStrip = p.substring(3, p.length - 1);
        }

        // HIBC Check Digit Stripping (v8.8.3)
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

                    const maxTrailing = (BARCODE_VALIDATION.HIBC_MAX_TRAILING_BEFORE_STRIP && BARCODE_VALIDATION.HIBC_MAX_TRAILING_BEFORE_STRIP[partForStrip]) ?? 5;
                    if (trailingChars.length > maxTrailing) {
                        sNum = sNum.substring(0, sNum.length - 1);
                    }
                } else {
                    sNum = sNum.substring(0, sNum.length - 1);
                }
            }
        }

        // Apply 446 -> part id
        if (p.startsWith('446') && p.length > 4) {
            if (p === '4461007801') p = '100780W';
            else if (p.includes('PUL') || p.endsWith('1') || p.endsWith('0')) p = p.substring(3, p.length - 1);
        }

        return { part: p, serial: sNum };
    }

    return { part: '', serial: '' };
}

// Test cases
const tests = [
    {
        input: '+B446757E21/$+R757E210173',
        expectedPart: '757E2',
        expectedSerial: 'R757E210173',
        description: 'v8.8.3 fix - 757E2 with 5-digit serial should NOT strip last digit'
    },
    {
        input: '+B446757E21/$+R757E2123456',
        expectedPart: '757E2',
        expectedSerial: 'R757E212345',  // 6 digits after E, should strip last (check digit)
        description: '757E2 with 6-digit serial SHOULD strip last digit (check digit)'
    },
    {
        input: '+B446100757E21/$+R757E210173',
        expectedPart: '100757E2',
        expectedSerial: 'R757E210173',
        description: '100757E2 with 100 prefix should still work (6 digit max)'
    }
];

let passed = 0;
let failed = 0;

console.log('🧪 Testing v8.8.3 Fix: 757E2 Serial Truncation Bug\n');

tests.forEach((test, i) => {
    const result = parsePN_SN(test.input);
    const partMatch = result.part === test.expectedPart;
    const serialMatch = result.serial === test.expectedSerial;
    const ok = partMatch && serialMatch;

    console.log(`Test ${i + 1}: ${test.description}`);
    console.log(`  Input:    ${test.input}`);
    console.log(`  Expected: part=${test.expectedPart}, serial=${test.expectedSerial}`);
    console.log(`  Got:      part=${result.part}, serial=${result.serial}`);
    console.log(`  Status:   ${ok ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    if (ok) passed++;
    else failed++;
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
