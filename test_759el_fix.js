// Test the 100759EL rule fix
const PRODUCT_SERIAL_RULES = {
    '100759EL': {
        pattern: /^(759EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 759EL + 5 digits (6 records), ignore trailing check digits/padding'
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

// Test case from the issue
const testPartCode = '100759EL';
const testSerial = '759EL104116';
const expectedResult = '759EL10411';

console.log('Testing the fix for scan: +B446100759EL1/$+759EL104116');
console.log('');
console.log('Input:');
console.log(`  Part Code: ${testPartCode}`);
console.log(`  Serial:    ${testSerial}`);
console.log('');

const result = applyProductSpecificSerialExtraction(testPartCode, testSerial);

console.log('Output:');
console.log(`  Extracted: ${result}`);
console.log(`  Expected:  ${expectedResult}`);
console.log('');

if (result === expectedResult) {
    console.log('✅ TEST PASSED! The fix works correctly.');
} else {
    console.log('❌ TEST FAILED! Expected:', expectedResult, 'but got:', result);
}
