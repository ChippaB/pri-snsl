# Offline Scanning Architecture

## Overview

The pri-snsl scanning app (v8.8.0+) implements a robust **offline-first scanning system** that ensures no scan is ever lost, even when Supabase is unreachable. The system distinguishes between internet connectivity and Supabase service availability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Scans                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Parse Barcode      │
                    │   (GS1/HIBC/MGC)     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Validate Barcode    │
                    │  (Fail-fast v8.6.0)  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Check Supabase Health│◄─────┐
                    │ (supabase-health.js) │      │
                    └──────────┬───────────┘      │
                               │                  │
                    ┌──────────┴──────────┐       │
                    │    Reachable?       │       │
                    └──────────┬──────────┘       │
                      ┌────────┴────────┐        │
                      │                 │        │
                     YES               NO        │
                      │                 │        │
                      ▼                 ▼        │
              ┌─────────────┐   ┌─────────────┐  │
              │Try Supabase │   │Queue Local  │  │
              │Insert (5s)  │   │(IndexedDB)  │  │
              └──────┬──────┘   └──────┬──────┘  │
                     │                 │        │
              ┌──────┴──────┐          │        │
              │  Success?   │          │        │
              └──────┬──────┘          │        │
                 ┌────┴────┐           │        │
                 │         │           │        │
               YES         NO           │        │
                 │         │           │        │
                 ▼         ▼           │        │
            ┌─────┐   ┌─────┐          │        │
            │Show │   │Show │          │        │
            │ OK  │   │QUEUED◄──────────┘        │
            └─────┘   └─────┘                   │
                                                 │
                                    Periodic Health Check
                                    (every 15s, or on events)
                                    - Visibility change
                                    - Online/offline events
                                    - After flush attempts
                                                 │
                                                 ▼
                                    ┌─────────────────────┐
                                    │   Auto-Flush Queue  │
                                    │ (when reachable)    │
                                    └─────────────────────┘
```

## Key Components

### 1. Supabase Health Check (`supabase-health.js`)

**Purpose:** Accurately distinguish "internet online" from "Supabase reachable"

**Features:**
- Lightweight `HEAD` request to Supabase REST endpoint
- 3-second timeout (configurable)
- Exponential backoff when down (15s → 22.5s → 33.75s → max 60s)
- Degraded state detection (latency > 2s)
- Event-driven checks (visibility change, online/offline)

**API:**
```javascript
// Get current status
getConnectivityStatus() // Returns: { internetOnline, supabaseReachable, supabaseDegraded, lastLatencyMs, lastCheckedAt }

// Force immediate check
await forceHealthCheck()

// Start/stop periodic checks
startHealthChecks()
stopHealthChecks()
```

**Configuration:**
```javascript
const HEALTH_CHECK_CONFIG = {
    timeout: 3000,           // 3 second timeout
    checkInterval: 15000,    // Check every 15 seconds
    failureThreshold: 2,     // 2 consecutive failures = DOWN
    degradationLatency: 2000 // Latency > 2s = DEGRADED
};
```

### 2. Offline Queue (IndexedDB)

**Database:** `sosv2-offline` (IndexedDB)
**Store:** `pendingScans`
**Key:** `idempotencyKey` (generated as `{serial}-{station}-{timestamp}`)

**Record Structure:**
```javascript
{
    idempotencyKey: "R756E123456-MAIN-1704567890123",
    payload: {
        operator: "John Doe",
        station: "MAIN",
        raw_scan: "+B446757E2/$+R757E2123456%",
        part_number: "100757E2",
        serial_number: "757E2123456",
        batch_comment: "QC Hold"
    },
    timestamp: 1704567890123,
    status: "pending",
    retries: 0
}
```

**API:**
```javascript
await queueScan(payload, idempotencyKey)  // Add to queue
await dequeueScan(idempotencyKey)         // Remove after sync
await getPendingScans()                    // Get all pending
await getPendingCount()                    // Get count
```

### 3. Scan Submit Flow (`app.js` - `send()` function)

**v8.8.0 Flow:**

1. **Always queue locally first** (guarantees no data loss)
2. **Check internet connectivity** (`navigator.onLine`)
3. **Check Supabase reachability** (if health check available)
4. **Attempt immediate sync** if reachable (with 5s timeout)
5. **Return appropriate status** for UI feedback

**Possible Return Values:**
- `'OK'` - Successfully synced to Supabase, removed from queue
- `'DUPLICATE'` - Duplicate scan (idempotency key already exists)
- `'QUEUED'` - Queued locally (internet offline OR Supabase unreachable OR timeout)
- `'ERROR'` - Sync failed (will retry on next flush)

### 4. Queue Flush Logic

**Triggers:**
- App startup (2s delay)
- Internet comes back online
- Supabase health check recovers
- Visibility change (tab regains focus)
- Periodic (every 30s via sync status update interval)

**Flush Behavior:**
```javascript
async function flushQueue() {
    // Guard: Don't run if already flushing
    if (isFlushingQueue) return;

    // Guard: Don't run if no internet
    if (!navigator.onLine) return;

    // Guard: Don't run if Supabase unreachable
    if (getConnectivityStatus().supabaseReachable === false) return;

    // Process queue...
    // - Batch inserts where possible
    // - Remove successful items
    // - Keep failed items (with retry count)
    // - Stop on timeout to avoid spamming
}
```

## UI States

### Status Badges

| Badge | State | Appearance | Meaning |
|-------|-------|------------|---------|
| **Internet** | 🌐 ONLINE | Green | Device has internet connectivity |
| | 🌐 OFFLINE | Red | No internet (WiFi off, airplane mode, etc.) |
| **Supabase** | ☁️ OK (45ms) | Green | Supabase is reachable and responsive |
| | ☁️ SLOW (3200ms) | Orange | Supabase is reachable but slow (>2s latency) |
| | ☁️ DOWN | Red | Supabase is unreachable (timeout, 5xx errors) |
| | ☁️ CHECKING... | Gray | Initial health check in progress |

### Scan Status States

| Status | Appearance | Meaning |
|--------|------------|---------|
| **OK** | Green | Successfully synced to Supabase |
| **DUPLICATE** | Orange | Duplicate scan (already in database) |
| **QUEUED** | Blue | Queued locally, will sync when reachable |
| **SENDING** | Blue | Currently attempting to sync |
| **ERROR** | Red | Sync failed (check connectivity) |

## Failure Modes

### 1. Supabase Outage (Internet OK)

**Detection:** Health check timeout or 5xx errors

**Behavior:**
- Scans queue immediately
- Status shows "☁️ DOWN"
- Warning banner: "⚠️ SUPABASE UNREACHABLE - Scans will queue automatically"
- Queue count increments
- Exponential backoff on health checks (15s → 22.5s → 33.75s → max 60s)

**Recovery:**
- Health check succeeds → Auto-flush queue
- Status shows "☁️ OK"
- Queue count returns to 0

### 2. Internet Outage (WiFi Off, Airplane Mode)

**Detection:** `navigator.onLine === false`

**Behavior:**
- Scans queue immediately
- Status shows "🌐 OFFLINE"
- Warning banner: "⚠️ NO INTERNET - Scans will queue automatically"
- Health checks paused

**Recovery:**
- Browser `online` event fires → Force health check
- If Supabase reachable → Flush queue
- Status returns to normal

### 3. Supabase Degraded (Slow but Working)

**Detection:** Latency > 2s

**Behavior:**
- Status shows "☁️ SLOW (3200ms)"
- Scans still sync immediately (just slower)
- May show "QUEUED" temporarily if timeout hit

**Recovery:**
- Latency returns to normal → Status shows "☁️ OK"

### 4. IndexedDB Full or Disabled

**Detection:** `queueScan()` throws error

**Behavior:**
- Console error logged
- Attempt network sync anyway (best effort)
- Warning to user (if implemented)

**Mitigation:**
- Most modern browsers support IndexedDB
- Queue typically holds thousands of scans
- Consider implementing cleanup for old failed records

## Idempotency and Deduplication

### Strategy

1. **Client-side idempotency key** generated before queueing:
   ```javascript
   const idempotencyKey = `${serial}-${station}-${timestamp}`;
   ```

2. **Server-side unique constraint** on `idempotency_key` column:
   - If duplicate insert attempted → PostgreSQL error 23505
   - Client catches this and returns `'DUPLICATE'`

3. **Queue cleanup:**
   - Only remove from queue after successful insert
   - Duplicate inserts treated as success (removed from queue)

### Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Scan queued, sync succeeds, flushed | ✅ Normal flow - queue item removed |
| Scan queued, sync timeout, retry succeeds | ✅ Retry uses same idempotency key - treated as duplicate, removed |
| Scan queued, sync fails, app closed | ✅ Queue persists in IndexedDB, flushed on next app start |
| Same scan submitted twice (same ms) | ⚠️ Different timestamps = different keys - both inserted (rare edge case) |
| Rescan after 1 second | ✅ Different timestamp = different key - treated as new scan |

## Testing

### Manual Testing Checklist

#### Test 1: Supabase Outage (Internet OK)

**Setup:**
1. Open browser DevTools → Network tab
2. Block requests to `*.supabase.co`
3. Keep internet connected

**Expected:**
- [ ] Status shows "🌐 ONLINE" and "☁️ DOWN"
- [ ] Warning banner appears
- [ ] Scanning works immediately
- [ ] Status shows "QUEUED OFFLINE"
- [ ] Queue count increments
- [ ] Input clears after each scan

**Recovery:**
1. Unblock Supabase requests
2. Expected:
   - [ ] Status flips to "☁️ OK"
   - [ ] Queue flushes automatically
   - [ ] Queue count returns to 0
   - [ ] Scans appear in history

#### Test 2: Internet Outage

**Setup:**
1. Enable airplane mode OR disable WiFi
2. (Alternatively: Block all network requests in DevTools)

**Expected:**
- [ ] Status shows "🌐 OFFLINE"
- [ ] Warning banner appears
- [ ] Scanning works immediately
- [ ] Status shows "QUEUED OFFLINE"

**Recovery:**
1. Re-enable WiFi
2. Expected:
   - [ ] Status flips to "🌐 ONLINE"
   - [ ] Health check runs
   - [ ] If Supabase reachable, queue flushes

#### Test 3: No Regression (Healthy State)

**Setup:**
1. Normal connectivity
2. Supabase reachable

**Expected:**
- [ ] Status shows "🌐 ONLINE" and "☁IE OK"
- [ ] Scans sync immediately
- [ ] Status shows "OK"
- [ ] Queue count stays at 0
- [ ] History updates normally

#### Test 4: Queue Persistence

**Setup:**
1. Block Supabase
2. Scan 3 items
3. Close browser/tab
4. Reopen app

**Expected:**
- [ ] Queue count shows 3
- [ ] Queue persists across refresh
5. Unblock Supabase
6. Expected:
   - [ ] All 3 items sync
   - [ ] Queue count returns to 0

### Unit Tests

```bash
cd pri-snsl
node tests/test_supabase_health.js
```

**Expected output:**
```
🧪 Running Supabase Health Check Tests...

✅ PASS: Successful health check returns reachable: true
✅ PASS: Latency is measured in milliseconds
✅ PASS: No error on successful check
✅ PASS: Server error (500) returns reachable: false
✅ PASS: Auth error (401) returns reachable: true (server is up)
✅ PASS: Timeout returns reachable: false
✅ PASS: Timeout error is correctly identified
✅ PASS: Network error returns reachable: false
✅ PASS: Network error is captured

==================================================
Tests Passed: 9
Tests Failed: 0
==================================================
```

## Configuration

### Tuning Timeouts

Edit `supabase-health.js`:

```javascript
const HEALTH_CHECK_CONFIG = {
    timeout: 3000,           // Health check timeout
    checkInterval: 15000,    // How often to check
    failureThreshold: 2,     // Failures before marking DOWN
    degradationLatency: 2000 // Latency threshold for DEGRADED
};
```

Edit `app.js` (in `syncScanToSupabase()`):

```javascript
const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s sync timeout
```

### Changing Backoff Behavior

Edit `supabase-health.js`:

```javascript
backoffMultiplier: 1.5,  // Multiplier for each failure
maxBackoffInterval: 60000 // Max 60 seconds between checks
```

## Troubleshooting

### Issue: Queue not flushing

**Check:**
1. Is internet connected? (🌐 badge)
2. Is Supabase reachable? (☁️ badge)
3. Are there items in queue? (Pending count)
4. Is `flushQueue()` running? (Console logs)

**Debug:**
```javascript
// In browser console:
await getPendingCount()  // Should return > 0
getConnectivityStatus()  // Check status
await flushQueue()       // Manual flush
```

### Issue: Health check always shows DOWN

**Possible causes:**
1. Supabase URL/KEY misconfigured (check `app.js`)
2. CORS issues (check Supabase dashboard)
3. Network blocking Supabase (check firewall/proxy)
4. Supabase actually down (check status.supabase.com)

**Debug:**
```javascript
// In browser console:
fetch('https://your-project.supabase.co/rest/v1/', {
    method: 'HEAD',
    headers: { 'apikey': 'your-anon-key' }
})
.then(r => console.log('Status:', r.status))
.catch(e => console.error('Error:', e))
```

### Issue: Scans lost

**Note:** Scans should NEVER be lost. If scans are missing:

**Check:**
1. IndexedDB not cleared? (DevTools → Application → IndexedDB)
2. Browser not in private/incognito mode? (IndexedDB disabled)
3. Storage quota not exceeded? (DevTools → Application → Storage)

**Recover:**
```javascript
// In browser console:
await getPendingScans()  // See what's queued
```

## Future Enhancements

### Potential Improvements

1. **Background Sync API** - Sync even when app is closed (requires service worker)
2. **Retry with exponential backoff** - Per-item retry logic
3. **Compression** - Compress queue data before storage
4. **Queue priorities** - Prioritize older scans
5. **Admin panel** - View/manage queue remotely
6. **Metrics** - Track queue size, flush success rate, latency trends

### Database Schema (Optional Enhancement)

Add a dedicated `idempotency_keys` table for tracking:

```sql
CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON idempotency_keys (key);
```

This allows client-side deduplication checks before insert.

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **v8.8.0** | Feb 2026 | Offline-first scanning with accurate Supabase health detection |
| v8.7.4 | Feb 2026 | Fixed 759E2 last digit drop; part-aware HIBC stripping |
| v8.6.0 | Jan 2026 | Client-side barcode validation (fail-fast) |

## Support

For issues or questions:
1. Check console logs for errors
2. Verify Supabase configuration in `app.js`
3. Test connectivity manually using DevTools
4. Review this document's troubleshooting section
