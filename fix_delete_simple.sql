-- ============================================
-- SIMPLE FIX: Just allow deletes on scans table
-- ============================================
-- The error suggests serial_units might not exist or has different structure
-- Let's focus on just making scans deletable
-- ============================================

-- Step 1: Ensure RLS is enabled on scans
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Step 2: Add DELETE policy for scans
DROP POLICY IF EXISTS "anon_delete_scans" ON scans;
CREATE POLICY "anon_delete_scans" ON scans 
    FOR DELETE TO anon USING (true);

-- Step 3: Check if serial_units table even exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'serial_units'
    ) THEN
        -- Table exists, enable RLS and add delete policy
        ALTER TABLE serial_units ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "anon_delete_serial_units" ON serial_units;
        CREATE POLICY "anon_delete_serial_units" ON serial_units 
            FOR DELETE TO anon USING (true);
        
        RAISE NOTICE 'serial_units table found and policies applied';
    ELSE
        RAISE NOTICE 'serial_units table does not exist - skipping';
    END IF;
END $$;

-- Step 4: Show all foreign keys that reference scans table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name LIKE '%scans%' OR tc.constraint_name LIKE '%screl%';

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Check the output/notices
-- 3. Share the results from the SELECT query at the end
-- 4. Then try deleting from dashboard again
-- ============================================
