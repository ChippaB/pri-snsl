-- ============================================
-- DIAGNOSTIC: Check serial_units table structure
-- ============================================
-- Run this first to see what columns actually exist

-- Check if serial_units table exists and what columns it has
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'serial_units'
ORDER BY ordinal_position;

-- Check all foreign key constraints on serial_units
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
  AND tc.table_name = 'serial_units';

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Run this query in Supabase SQL Editor
-- 2. Copy the results and share them
-- 3. This will show us the actual table structure
-- 4. Then we can create the correct fix
-- ============================================
