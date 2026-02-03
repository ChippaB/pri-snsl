// ===== CLIENT-SIDE SCAN CACHE (v8.8.2) =====
// Prevents duplicate scans within a session
// Works offline and online
// Stores last N serials per operator

const SCAN_CACHE_CONFIG = {
    MAX_CACHE_SIZE: 100,          // Keep last 100 serials per operator
    CACHE_TTL: 12 * 60 * 60 * 1000, // 12 hours expiry
    DUPLICATE_WINDOW_MS: 5000     // 5 seconds - same serial within this = duplicate
};

/**
 * In-memory scan cache: Map<operatorName, Array<{serial, timestamp}>>
 */
const scanCache = new Map();

/**
 * Initialize scan cache from localStorage (persists across refreshes)
 */
function initScanCache() {
    try {
        const saved = localStorage.getItem('scanCache');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Restore cache, filtering expired entries
            const now = Date.now();
            for (const [operator, entries] of Object.entries(parsed)) {
                const validEntries = entries.filter(e =>
                    e.timestamp && (now - e.timestamp) < SCAN_CACHE_CONFIG.CACHE_TTL
                );
                if (validEntries.length > 0) {
                    scanCache.set(operator, validEntries);
                }
            }
            console.log(`📋 Scan cache restored: ${scanCache.size} operators`);
        }
    } catch (e) {
        console.warn('Failed to restore scan cache:', e);
    }
}

/**
 * Save scan cache to localStorage
 */
function saveScanCache() {
    try {
        const obj = Object.fromEntries(scanCache);
        localStorage.setItem('scanCache', JSON.stringify(obj));
    } catch (e) {
        console.warn('Failed to save scan cache:', e);
    }
}

/**
 * Check if a serial is a duplicate
 * @param {string} operator - Operator name
 * @param {string} serial - Serial number
 * @returns {boolean} - True if duplicate detected
 */
function isDuplicateScan(operator, serial) {
    if (!operator || !serial) return false;

    const operatorCache = scanCache.get(operator);
    if (!operatorCache || operatorCache.length === 0) {
        return false; // No previous scans for this operator
    }

    // Check for exact serial match in recent scans
    const now = Date.now();
    for (let i = operatorCache.length - 1; i >= 0; i--) {
        const entry = operatorCache[i];

        // Check time window first (most recent scans)
        if ((now - entry.timestamp) > SCAN_CACHE_CONFIG.DUPLICATE_WINDOW_MS) {
            // Too old, no need to check further back for time-based duplicate
            break;
        }

        // Same serial within time window = duplicate
        if (entry.serial === serial) {
            console.log(`🔄 Duplicate detected: ${serial} scanned ${Math.round((now - entry.timestamp) / 1000)}s ago`);
            return true;
        }
    }

    return false;
}

/**
 * Add a scan to the cache
 * @param {string} operator - Operator name
 * @param {string} serial - Serial number
 */
function addScanToCache(operator, serial) {
    if (!operator || !serial) return;

    // Get or create operator cache
    let operatorCache = scanCache.get(operator);
    if (!operatorCache) {
        operatorCache = [];
        scanCache.set(operator, operatorCache);
    }

    // Add new entry
    operatorCache.push({
        serial: serial,
        timestamp: Date.now()
    });

    // Trim to max size (FIFO - remove oldest)
    if (operatorCache.length > SCAN_CACHE_CONFIG.MAX_CACHE_SIZE) {
        operatorCache.shift();
    }

    // Persist to localStorage
    saveScanCache();
}

/**
 * Clear scan cache for a specific operator (or all)
 * @param {string} [operator] - Operator name, or undefined to clear all
 */
function clearScanCache(operator) {
    if (operator) {
        scanCache.delete(operator);
    } else {
        scanCache.clear();
    }
    saveScanCache();
    console.log('🗑️ Scan cache cleared');
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
function getScanCacheStats() {
    let totalEntries = 0;
    for (const entries of scanCache.values()) {
        totalEntries += entries.length;
    }

    return {
        operators: scanCache.size,
        totalEntries: totalEntries,
        maxSize: SCAN_CACHE_CONFIG.MAX_CACHE_SIZE,
        ttl: SCAN_CACHE_CONFIG.CACHE_TTL
    };
}

/**
 * Clean up expired entries (run periodically)
 */
function cleanupScanCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [operator, entries] of scanCache.entries()) {
        const beforeLength = entries.length;
        // Remove expired entries
        const validEntries = entries.filter(e =>
            e.timestamp && (now - e.timestamp) < SCAN_CACHE_CONFIG.CACHE_TTL
        );

        if (validEntries.length === 0) {
            scanCache.delete(operator);
        } else if (validEntries.length < beforeLength) {
            scanCache.set(operator, validEntries);
        }

        cleaned += beforeLength - validEntries.length;
    }

    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
        saveScanCache();
    }
}

// Auto-cleanup every 30 minutes
setInterval(cleanupScanCache, 30 * 60 * 1000);

// Initialize on load
initScanCache();

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isDuplicateScan,
        addScanToCache,
        clearScanCache,
        getScanCacheStats,
        cleanupScanCache
    };
}
