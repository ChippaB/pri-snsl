-- ============================================
-- FIX DELETE FUNCTIONALITY FOR DASHBOARD
-- ============================================
-- This script fixes Row Level Security (RLS) policies to enable
-- delete functionality on the dashboard.
--
-- Issue: Dashboard delete fails with "Could not remove related unit data"
-- Root Cause: Missing or incorrect RLS policies for DELETE operations
-- Solution: Ensure proper RLS policies for both scans and serial_units tables
-- ============================================

-- ============================================
-- SCANS TABLE - RLS POLICIES
-- ============================================

-- Enable RLS on scans table (if not already enabled)
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Allow anon role to DELETE from scans table
DROP POLICY IF EXISTS "anon_delete_scans" ON scans;
CREATE POLICY "anon_delete_scans" ON scans 
    FOR DELETE TO anon USING (true);

-- Ensure other necessary policies exist for scans
DROP POLICY IF EXISTS "anon_insert_scans" ON scans;
CREATE POLICY "anon_insert_scans" ON scans 
    FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_scans" ON scans;
CREATE POLICY "anon_select_scans" ON scans 
    FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_update_scans" ON scans;
CREATE POLICY "anon_update_scans" ON scans 
    FOR UPDATE TO anon USING (true);

-- ============================================
-- SERIAL_UNITS TABLE - RLS POLICIES
-- ============================================

-- Enable RLS on serial_units table (if not already enabled)
ALTER TABLE serial_units ENABLE ROW LEVEL SECURITY;

-- Allow anon role to DELETE from serial_units table
DROP POLICY IF EXISTS "anon_delete_serial_units" ON serial_units;
CREATE POLICY "anon_delete_serial_units" ON serial_units 
    FOR DELETE TO anon USING (true);

-- Ensure other necessary policies exist for serial_units
DROP POLICY IF EXISTS "anon_insert_serial_units" ON serial_units;
CREATE POLICY "anon_insert_serial_units" ON serial_units 
    FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_serial_units" ON serial_units;
CREATE POLICY "anon_select_serial_units" ON serial_units 
    FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_update_serial_units" ON serial_units;
CREATE POLICY "anon_update_serial_units" ON serial_units 
    FOR UPDATE TO anon USING (true);

-- ============================================
-- VERIFY FOREIGN KEY CASCADE SETTING
-- ============================================
-- Check if ON DELETE CASCADE is properly configured
-- Run this query to verify:
/*
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
*/

-- ============================================
-- OPTIONAL: RECREATE FOREIGN KEY WITH CASCADE
-- ============================================
-- If the foreign key doesn't have ON DELETE CASCADE, uncomment and run:
/*
-- Drop existing foreign key constraint
ALTER TABLE serial_units 
    DROP CONSTRAINT IF EXISTS serial_units_scan_id_fkey;

-- Recreate with ON DELETE CASCADE
ALTER TABLE serial_units 
    ADD CONSTRAINT serial_units_scan_id_fkey 
    FOREIGN KEY (scan_id) 
    REFERENCES scans(id) 
    ON DELETE CASCADE;
*/

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, verify the policies:
/*
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('scans', 'serial_units')
ORDER BY tablename, policyname;
*/

-- ============================================
-- TESTING
-- ============================================
-- Test delete functionality:
-- 1. Go to the dashboard
-- 2. Try to delete a scan record
-- 3. It should now work without errors
-- 4. Related serial_units records should be automatically deleted (CASCADE)
-- ============================================

-- ============================================
-- NOTES
-- ============================================
-- With ON DELETE CASCADE:
-- - Deleting a scan automatically deletes related serial_units
-- - The dashboard code tries to delete serial_units first (defensive)
-- - Even if serial_units delete fails, CASCADE will handle it
-- - This is the recommended approach for data integrity
--
-- RLS Policies:
-- - 'anon' role needs DELETE permission on both tables
-- - USING (true) allows all rows to be deleted (no restrictions)
-- - This is safe for internal dashboards with password protection
-- - For production, consider adding user-based restrictions
-- ============================================
