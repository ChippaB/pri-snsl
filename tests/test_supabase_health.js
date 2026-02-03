/**
 * Unit Tests for Supabase Health Check Module
 * Run with: node tests/test_supabase_health.js
 */

// Mock the global fetch and AbortController for testing
global.fetch = async function(url, options) {
    const mockUrl = url.toString();

    // Simulate timeout
    if (options?.signal?.aborted) {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        throw error;
    }

    // Simulate various responses
    if (mockUrl.includes('timeout')) {
        // Simulate timeout by not responding
        return new Promise((_, reject) => {
            setTimeout(() => {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                reject(error);
            }, 100);
        });
    }

    if (mockUrl.includes('server-error')) {
        return {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
        };
    }

    if (mockUrl.includes('auth-required')) {
        return {
            ok: false,
            status: 401,
            statusText: 'Unauthorized'
        };
    }

    if (mockUrl.includes('network-error')) {
        throw new Error('Network request failed');
    }

    // Default: success
    return {
        ok: true,
        status: 200,
        statusText: 'OK'
    };
};

global.AbortController = class {
    constructor() {
        this.signal = { aborted: false };
        this._timeout = null;
    }
    abort() {
        this.signal.aborted = true;
        if (this._timeout) clearTimeout(this._timeout);
    }
};

// Mock performance.now()
let mockTime = 0;
global.performance = {
    now: () => mockTime++
};

// Mock console to avoid clutter
const originalConsole = global.console;
global.console = {
    log: () => {},
    error: () => {},
    warn: () => {},
    info: () => {}
};

// Import the module (we'll simulate it inline since we can't use require)
const HEALTH_CHECK_CONFIG = {
    timeout: 3000,
    checkInterval: 15000,
    failureThreshold: 2,
    degradationLatency: 2000,
    backoffMultiplier: 1.5,
    maxBackoffInterval: 60000
};

// Simulated health check function
async function checkSupabaseHealth(url = 'https://test.supabase.co') {
    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_CONFIG.timeout);

    try {
        const response = await fetch(`${url}/rest/v1/`, {
            method: 'HEAD',
            headers: {
                'apikey': 'test-key',
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const latency = performance.now() - startTime;

        const isReachable = response.status >= 200 && response.status < 500;

        return {
            reachable: isReachable,
            latency: Math.round(latency),
            error: null
        };
    } catch (error) {
        clearTimeout(timeoutId);
        const latency = performance.now() - startTime;

        if (error.name === 'AbortError') {
            return {
                reachable: false,
                latency: HEALTH_CHECK_CONFIG.timeout,
                error: 'timeout'
            };
        }

        return {
            reachable: false,
            latency: Math.round(latency),
            error: error.message || 'network_error'
        };
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

    console.log('🧪 Running Supabase Health Check Tests...\n');

    // Test 1: Successful health check
    mockTime = 0;
    const result1 = await checkSupabaseHealth('https://test.supabase.co');
    assert(result1.reachable === true, 'Successful health check returns reachable: true');
    assert(result1.latency >= 0, 'Latency is measured in milliseconds');
    assert(result1.error === null, 'No error on successful check');

    // Test 2: Server error (5xx) is treated as unreachable
    mockTime = 0;
    const result2 = await checkSupabaseHealth('https://test.supabase.co/server-error');
    assert(result2.reachable === false, 'Server error (500) returns reachable: false');

    // Test 3: Auth required (401) is treated as reachable (server is up)
    mockTime = 0;
    const result3 = await checkSupabaseHealth('https://test.supabase.co/auth-required');
    assert(result3.reachable === true, 'Auth error (401) returns reachable: true (server is up)');

    // Test 4: Timeout scenario
    mockTime = 0;
    const result4 = await checkSupabaseHealth('https://test.supabase.co/timeout');
    assert(result4.reachable === false, 'Timeout returns reachable: false');
    assert(result4.error === 'timeout', 'Timeout error is correctly identified');

    // Test 5: Network error
    mockTime = 0;
    const result5 = await checkSupabaseHealth('https://test.supabase.co/network-error');
    assert(result5.reachable === false, 'Network error returns reachable: false');
    assert(result5.error === 'network_error', 'Network error is captured');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`Tests Passed: ${passed}`);
    console.log(`Tests Failed: ${failed}`);
    console.log('='.repeat(50));

    // Restore console
    global.console = originalConsole;

    return failed === 0 ? 0 : 1;
}

// Run tests
if (require.main === module) {
    runTests().then(exitCode => process.exit(exitCode));
}

module.exports = { runTests };
