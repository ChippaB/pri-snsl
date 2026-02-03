/**
 * Unit Tests for Client-Side Scan Cache
 * Run with: node tests/test_scan_cache.js
 */

// Mock localStorage
const mockStorage = {};
global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, value) => { mockStorage[key] = value; },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Note: console is NOT mocked so we can see test output

// Simulate scan-cache.js functionality
const SCAN_CACHE_CONFIG = {
    MAX_CACHE_SIZE: 100,
    CACHE_TTL: 12 * 60 * 60 * 1000,
    DUPLICATE_WINDOW_MS: 5000
};

const scanCache = new Map();

function isDuplicateScan(operator, serial) {
    if (!operator || !serial) return false;

    const operatorCache = scanCache.get(operator);
    if (!operatorCache || operatorCache.length === 0) {
        return false;
    }

    const now = Date.now();
    for (let i = operatorCache.length - 1; i >= 0; i--) {
        const entry = operatorCache[i];

        if ((now - entry.timestamp) > SCAN_CACHE_CONFIG.DUPLICATE_WINDOW_MS) {
            break;
        }

        if (entry.serial === serial) {
            return true;
        }
    }

    return false;
}

function addScanToCache(operator, serial) {
    if (!operator || !serial) return;

    let operatorCache = scanCache.get(operator);
    if (!operatorCache) {
        operatorCache = [];
        scanCache.set(operator, operatorCache);
    }

    operatorCache.push({
        serial: serial,
        timestamp: Date.now()
    });

    if (operatorCache.length > SCAN_CACHE_CONFIG.MAX_CACHE_SIZE) {
        operatorCache.shift();
    }
}

// ===== TEST CASES =====

async function runTests() {
    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${testName}`);
            failed++;
        }
    }

    console.log('🧪 Running Scan Cache Tests...\n');

    // Test 1: First scan is not a duplicate
    scanCache.clear();
    assert(!isDuplicateScan('John', 'ABC123'), 'First scan is not a duplicate');

    // Test 2: Adding scan to cache works
    addScanToCache('John', 'ABC123');
    assert(scanCache.get('John').length === 1, 'Scan added to cache');
    assert(scanCache.get('John')[0].serial === 'ABC123', 'Serial stored correctly');

    // Test 3: Immediate rescan is detected as duplicate
    assert(isDuplicateScan('John', 'ABC123'), 'Immediate rescan is duplicate');

    // Test 4: Different operator with same serial is not duplicate
    assert(!isDuplicateScan('Jane', 'ABC123'), 'Different operator, same serial = not duplicate');

    // Test 5: Different serial is not duplicate
    assert(!isDuplicateScan('John', 'ABC456'), 'Different serial is not duplicate');

    // Test 6: Old scan (outside time window) is not duplicate
    scanCache.clear();
    const oldTimestamp = Date.now() - 6000; // 6 seconds ago
    scanCache.set('John', [{ serial: 'OLD123', timestamp: oldTimestamp }]);
    assert(!isDuplicateScan('John', 'OLD123'), 'Scan older than 5s is not duplicate');

    // Test 7: Scan within time window is duplicate
    const recentTimestamp = Date.now() - 3000; // 3 seconds ago
    scanCache.set('John', [{ serial: 'NEW123', timestamp: recentTimestamp }]);
    assert(isDuplicateScan('John', 'NEW123'), 'Scan within 5s window is duplicate');

    // Test 8: Cache size limit (FIFO)
    scanCache.clear();
    for (let i = 0; i < SCAN_CACHE_CONFIG.MAX_CACHE_SIZE + 10; i++) {
        addScanToCache('TestOp', `SERIAL${i}`);
    }
    assert(scanCache.get('TestOp').length === SCAN_CACHE_CONFIG.MAX_CACHE_SIZE, 'Cache respects max size');
    // First entries should be removed (FIFO)
    assert(!isDuplicateScan('TestOp', 'SERIAL0'), 'Oldest entries removed (FIFO)');
    assert(isDuplicateScan('TestOp', `SERIAL${SCAN_CACHE_CONFIG.MAX_CACHE_SIZE - 1}`), 'Recent entries kept');

    // Test 9: Multiple operators tracked separately
    scanCache.clear();
    addScanToCache('Op1', 'SAME123');
    addScanToCache('Op2', 'SAME123');
    assert(isDuplicateScan('Op1', 'SAME123'), 'Op1 sees their scan as duplicate');
    assert(isDuplicateScan('Op2', 'SAME123'), 'Op2 sees their scan as duplicate');
    assert(scanCache.size === 2, 'Two operators tracked separately');

    // Test 10: Empty/null inputs handled gracefully
    scanCache.clear();
    assert(!isDuplicateScan('', 'ABC123'), 'Empty operator handled');
    assert(!isDuplicateScan('John', ''), 'Empty serial handled');
    assert(!isDuplicateScan(null, null), 'Null inputs handled');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Tests Passed: ${passed}`);
    console.log(`Tests Failed: ${failed}`);
    console.log('='.repeat(50));

    return failed === 0 ? 0 : 1;
}

// Run tests
if (require.main === module) {
    runTests().then(exitCode => process.exit(exitCode));
}

module.exports = { runTests };
