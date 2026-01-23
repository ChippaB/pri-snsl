-- ============================================
-- FIX DELETE CASCADE FOR SERIAL_UNITS
-- ============================================
-- This script fixes the foreign key constraint to enable CASCADE delete
-- 
-- Error: "update or delete on table 'scans' violates foreign key constraint 
--         'fk_screl_units_scan' on table 'serial_units'"
--
-- Root Cause: Foreign key constraint is NOT configured with ON DELETE CASCADE
-- Solution: Drop and recreate the constraint with CASCADE
-- ============================================

-- Step 1: Drop the existing foreign key constraint
-- (The constraint name is 'fk_screl_units_scan' based on the error message)
ALTER TABLE serial_units 
    DROP CONSTRAINT IF EXISTS fk_screl_units_scan;

-- Also drop the default constraint name if it exists
ALTER TABLE serial_units 
    DROP CONSTRAINT IF EXISTS serial_units_scan_id_fkey;

-- Step 2: Recreate the foreign key with ON DELETE CASCADE
ALTER TABLE serial_units 
    ADD CONSTRAINT fk_screl_units_scan 
    FOREIGN KEY (scan_id) 
    REFERENCES scans(id) 
    ON DELETE CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================
-- This query will show the delete_rule for the foreign key
-- It should show "CASCADE" after running this script
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

-- Expected result:
-- constraint_name: fk_screl_units_scan
-- table_name: serial_units
-- column_name: scan_id
-- foreign_table_name: scans
-- foreign_column_name: id
-- delete_rule: CASCADE  <-- This should be CASCADE, not NO ACTION

-- ============================================
-- NOTES
-- ============================================
-- After running this script:
-- 1. Deleting a scan will automatically delete related serial_units
-- 2. The dashboard delete function will work without errors
-- 3. No need to manually delete serial_units first
-- ============================================
