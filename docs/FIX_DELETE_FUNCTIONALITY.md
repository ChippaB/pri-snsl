# Dashboard Delete Functionality Fix

**Date:** 2026-01-23  
**Issue:** Delete button on dashboard fails with "Could not remove related unit data. Please try again."  
**Root Cause:** Missing Row Level Security (RLS) DELETE policies in Supabase

## Problem

The dashboard delete functionality was failing because:
1. The `serial_units` table has RLS enabled
2. The `anon` role (used by the dashboard) didn't have DELETE permission
3. The dashboard was trying to manually delete `serial_units` records before deleting the scan

## Solution

### Two-Part Fix:

#### 1. **Run SQL Script in Supabase** (REQUIRED)

You need to run the `fix_delete_rls.sql` script in your Supabase SQL Editor to add the necessary RLS policies.

**Steps:**
1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Open the file `fix_delete_rls.sql` from your project
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run** to execute the script

**What it does:**
- Adds DELETE policy for `anon` role on `scans` table
- Adds DELETE policy for `anon` role on `serial_units` table
- Ensures other necessary policies (SELECT, INSERT, UPDATE) are in place
- Verifies the ON DELETE CASCADE foreign key is configured

#### 2. **Updated Dashboard Code** (ALREADY DONE)

The `dashboard.html` file has been updated to:
- Rely on ON DELETE CASCADE instead of manually deleting `serial_units`
- Provide better error messages if RLS policies are missing
- Simplify the delete logic for better reliability

## How It Works Now

### Before (Manual Delete):
```javascript
// Delete serial_units first
await supabaseClient.from('serial_units').delete().eq('scan_id', recordId);
// Then delete scan
await supabaseClient.from('scans').delete().eq('id', recordId);
```
**Problem:** Required DELETE permission on both tables

### After (CASCADE Delete):
```javascript
// Delete scan only - CASCADE handles serial_units automatically
await supabaseClient.from('scans').delete().eq('id', recordId);
```
**Benefit:** Only requires DELETE permission on `scans` table, database handles the rest

## Testing

After running the SQL script:

1. Open the dashboard: `dashboard.html`
2. Find a scan record to delete
3. Click the 🗑️ delete button
4. Confirm the deletion
5. The record should be deleted successfully
6. Related `serial_units` records are automatically deleted via CASCADE

## Verification Queries

Run these in Supabase SQL Editor to verify the fix:

### Check RLS Policies:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('scans', 'serial_units')
ORDER BY tablename, policyname;
```

You should see policies like:
- `anon_delete_scans` on `scans` table
- `anon_delete_serial_units` on `serial_units` table

### Check Foreign Key CASCADE:
```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'serial_units'
  AND kcu.column_name = 'scan_id';
```

The `delete_rule` should be `CASCADE`.

## Files Modified

1. **`fix_delete_rls.sql`** (NEW)
   - SQL script to add RLS policies
   - Run this in Supabase SQL Editor

2. **`dashboard.html`** (MODIFIED)
   - Updated `confirmDelete()` function
   - Simplified delete logic
   - Better error messages

## Security Notes

- The RLS policies use `USING (true)` which allows all rows to be deleted
- This is safe for internal dashboards with password protection
- For production with user authentication, consider adding user-based restrictions:
  ```sql
  CREATE POLICY "user_delete_scans" ON scans 
      FOR DELETE TO authenticated 
      USING (auth.uid() = user_id);
  ```

## Troubleshooting

### If delete still fails after running SQL:

1. **Check if RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename IN ('scans', 'serial_units');
   ```
   Both should show `true`.

2. **Check if policies exist:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('scans', 'serial_units');
   ```

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Look for error messages in Console tab
   - Check Network tab for failed requests

4. **Verify Supabase connection:**
   - Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in `dashboard.html`
   - Test with a simple SELECT query first

## Related Documentation

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- Original setup: `setup_serial_units.sql`
