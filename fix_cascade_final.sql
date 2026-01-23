-- ============================================
-- FIX: Change serial_units foreign key to CASCADE
-- ============================================
-- Problem: serial_units.produced_scan_id references scans.id with NO ACTION
-- Solution: Change to CASCADE so deleting a scan auto-deletes related units
-- ============================================

-- Step 1: Drop the existing constraint
ALTER TABLE serial_units 
    DROP CONSTRAINT IF EXISTS fk_serial_units_scan;

-- Step 2: Recreate with CASCADE delete
ALTER TABLE serial_units 
    ADD CONSTRAINT fk_serial_units_scan 
    FOREIGN KEY (produced_scan_id) 
    REFERENCES scans(id) 
    ON DELETE CASCADE;

-- Step 3: Verify the fix
SELECT
    tc.table_name AS referencing_table,
    tc.constraint_name,
    kcu.column_name AS referencing_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'scans'
ORDER BY tc.table_name;

-- ============================================
-- EXPECTED RESULT AFTER FIX:
-- ============================================
-- Both constraints should show delete_rule = 'CASCADE':
-- 
-- 1. flagged_scans.scan_id -> scans.id (CASCADE) ✓
-- 2. serial_units.produced_scan_id -> scans.id (CASCADE) ✓ (was NO ACTION)
-- ============================================
