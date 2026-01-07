# Force Service Worker Cache Clear
## Why You Need This

Your scanning tablet may show an outdated version badge due to browser caching the old app.js file.

This happens because:
1. Browsers cache JavaScript aggressively
2. Even with cache version bump, old files can stay in cache
3. Service worker may serve cached app.js even after new deployment
4. PUL9000K serials with check digits need v8.6.5+ to extract correctly

### What v8.6.5 Fixes

**Before (v8.6.4 and earlier):**
- Raw barcode: `+B446PUL9000K0/$+PUL9000K296890`
- Saved: `PUL9000K296890` ❌ (includes trailing '0' check digit)

**After (v8.6.5):**
- Raw barcode: `+B446PUL9000K0/$+PUL9000K296890`
- Saved: `PUL9000K29689` ✅ (exactly 5 digits, check digit ignored)

### New Product-Specific Rules System

v8.6.5 introduces `PRODUCT_SERIAL_RULES` configuration that allows targeted handling of problematic barcodes:
- PUL9000K: Extract exactly 5 digits after 'K', ignore trailing check digits/padding
- Easy to add new product rules without changing parsing logic
- Non-matching products pass through unchanged

## Methods to Clear Cache

### Method 1: Chrome DevTools (Recommended)

1. On the tablet, open the scanning app
2. Press F12 (or right-click → Inspect)
3. Go to "Application" tab
4. Click "Service Workers"
5. Find "seescan-v8.6.3-offline" (or any old version)
6. Click "Unregister"
7. Refresh the page (F5 or Ctrl+Shift+R)
8. Wait 30 seconds for cache update

### Method 2: Hard Refresh (If above doesn't work)

1. Close all Chrome tabs completely
2. Reopen the scanning app
3. Wait 30 seconds

### Method 3: Clear Site Data (Nuclear Option)

⚠️ This also clears your offline queue!
1. Open Chrome settings (chrome://settings/clearSiteData)
2. Click "Clear browsing data"
3. This forces full reload of all cached resources

## Verification

After clearing cache, check:
1. Look at version badge in top-right corner
2. Should show: **v8.6.5** (current version)
3. Test barcode: `+B446PUL9000K0/$+PUL9000K296890`
4. Verify serial saved as: `PUL9000K29689` (exactly 5 digits)

## If Problem Persists

If cache clear doesn't work, check:
1. Version badge shows v8.6.5
2. But PUL9000K serials still include trailing digits
3. Check browser Console for errors

This may indicate:
- Cache not fully cleared
- Another issue with barcode parsing
- Need to add product rule for different part number
