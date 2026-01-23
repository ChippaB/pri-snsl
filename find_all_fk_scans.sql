-- ============================================
-- FIND ALL FOREIGN KEYS THAT REFERENCE SCANS
-- ============================================
-- This will show us ALL tables that have foreign keys pointing to scans
-- ============================================

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
