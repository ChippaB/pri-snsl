// Tests for truncated GS1-128 recovery and UNKNOWN reject.
// Run: node tests/test_truncated_gs1.js

const PART_NUMBER_MAP = {
    '0100810016250258': '536713-001',
    '0100810016250265': '536713-002',
    '0100810016250289': '536723-001',
    '0100810016250302': '536719-001',
};

function looksLikeTruncatedGs1(raw) {
    if (!raw || typeof raw !== 'string') return false;
    const s = raw.toUpperCase().trim();
    if (s.startsWith('01') || s.includes('/$+')) return false;
    return /(?:11|17|13)\d{6}21[A-Z0-9]/.test(s) || /^\d{8,}21(?:MGCK|MGC|PUL|R756|EBS|FIL)/.test(s);
}

function recoverTruncatedGs1(raw, partMap) {
    if (!raw) return null;
    const s = String(raw).toUpperCase().trim();
    if (s.startsWith('01') || s.includes('/$+')) return null;

    const serialMatch = s.match(/(?:11|17|13)\d{6}21([A-Z0-9]+)$/) || s.match(/21((?:MGCK|MGC|PUL|R756|EBS|FIL)[A-Z0-9]+)$/);
    const serial = serialMatch ? serialMatch[1] : '';

    let part = null;
    let bestLen = 0;
    for (const [prefix, mapped] of Object.entries(partMap)) {
        const gtin = prefix.startsWith('01') ? prefix.slice(2) : prefix;
        const needles = [gtin, gtin.slice(1), gtin.slice(2), gtin.replace(/^0+/, '')];
        for (const needle of needles) {
            if (needle && needle.length >= 6 && s.includes(needle) && needle.length > bestLen) {
                part = mapped;
                bestLen = needle.length;
            }
        }
    }

    if (!part && serial) {
        if (serial.startsWith('MGCK1S') || /^MGCK1\d/.test(serial)) part = '536719-001';
        else if (serial.startsWith('MGCK2S') || /^MGCK2\d/.test(serial)) part = '536723-001';
        else if (serial.startsWith('MGC2C')) part = '536713-002C';
        else if (serial.startsWith('MGC2S') || /^MGC2\d/.test(serial)) part = '536713-002';
        else if (serial.startsWith('MGCK')) part = '536719-001';
    }

    if (!part || !serial) return null;
    return { part, serial };
}

function shouldRejectUnknown(part) {
    return !part || part === 'UNKNOWN';
}

const tests = [
    {
        desc: 'full GS1 is not truncated',
        raw: '01008100162503021126081021MGCK1S60950',
        truncated: false,
        recover: null,
    },
    {
        desc: 'missing 01 prefix recovers 536719-001',
        raw: '08100162503021126080421MGCK1175735',
        truncated: true,
        recover: { part: '536719-001', serial: 'MGCK1175735' },
    },
    {
        desc: 'missing more GTIN head still recovers 536713-002',
        raw: '8100162502651126072121MGC2902795',
        truncated: true,
        recover: { part: '536713-002', serial: 'MGC2902795' },
    },
    {
        desc: 'date+serial only still recovers serial family',
        raw: '1126072121MGC2902931',
        truncated: true,
        recover: { part: '536713-002', serial: 'MGC2902931' },
    },
    {
        desc: 'direct MGC serial is not truncated GS1',
        raw: 'MGC1S17754ABCDEFGHIJK',
        truncated: false,
        recover: null,
    },
];

let passed = 0;
let failed = 0;
for (const t of tests) {
    const truncated = looksLikeTruncatedGs1(t.raw);
    const recovered = recoverTruncatedGs1(t.raw, PART_NUMBER_MAP);
    const okTrunc = truncated === t.truncated;
    const okRec = JSON.stringify(recovered) === JSON.stringify(t.recover);
    if (okTrunc && okRec) {
        passed++;
        console.log('PASS', t.desc);
    } else {
        failed++;
        console.log('FAIL', t.desc, { truncated, recovered, expectedTrunc: t.truncated, expectedRec: t.recover });
    }
}

if (shouldRejectUnknown('UNKNOWN') && shouldRejectUnknown('') && !shouldRejectUnknown('536719-001')) {
    passed++;
    console.log('PASS reject UNKNOWN part');
} else {
    failed++;
    console.log('FAIL reject UNKNOWN part');
}

console.log(`RESULT ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
