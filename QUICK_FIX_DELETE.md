# Quick Fix: Dashboard Delete Not Working

## The Problem
❌ Delete button shows: "Could not remove related unit data. Please try again."

## The Solution (2 Steps)

### Step 1: Run SQL in Supabase ⚡
1. Go to https://supabase.com/dashboard
2. Open **SQL Editor**
3. Copy/paste this SQL and click **Run**:

```sql
-- Fix DELETE permissions for dashboard
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE serial_units ENABLE ROW LEVEL SECURITY;

-- Allow anon to delete scans
DROP POLICY IF EXISTS "anon_delete_scans" ON scans;
CREATE POLICY "anon_delete_scans" ON scans 
    FOR DELETE TO anon USING (true);

-- Allow anon to delete serial_units
DROP POLICY IF EXISTS "anon_delete_serial_units" ON serial_units;
CREATE POLICY "anon_delete_serial_units" ON serial_units 
    FOR DELETE TO anon USING (true);
```

### Step 2: Test It ✅
1. Open `dashboard.html`
2. Click 🗑️ on any record
3. Confirm deletion
4. Should work now!

## What Changed?
- **Code:** `dashboard.html` now uses CASCADE delete (simpler, more reliable)
- **Database:** Added RLS policies so `anon` role can delete records

## Files
- 📄 `fix_delete_rls.sql` - Full SQL script with all policies
- 📝 `docs/FIX_DELETE_FUNCTIONALITY.md` - Detailed guide
- 🌐 `dashboard.html` - Updated delete function

---
**Note:** The full SQL script (`fix_delete_rls.sql`) includes all policies (SELECT, INSERT, UPDATE, DELETE) for both tables. The quick fix above just adds the DELETE policies.
