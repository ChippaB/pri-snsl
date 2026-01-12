-- ============================================
-- SERIAL_UNITS TABLE SETUP
-- ============================================
-- This script sets up the serial_units table with proper
-- foreign key relationship to the scans table.
--
-- Two options are provided:
-- Option 1: ON DELETE CASCADE (recommended for atomic deletes)
-- Option 2: Manual deletion handling (requires client-side code)
-- ============================================

-- ============================================
-- CREATE THE serial_units TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS serial_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    unit_identifier TEXT,
    unit_status TEXT,
    unit_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_serial_units_scan_id 
    ON serial_units(scan_id);

CREATE INDEX IF NOT EXISTS idx_serial_units_identifier 
    ON serial_units(unit_identifier);

CREATE INDEX IF NOT EXISTS idx_serial_units_created_at 
    ON serial_units(created_at DESC);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE serial_units ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert serial_units (for scan creation)
DROP POLICY IF EXISTS "anon_insert_serial_units" ON serial_units;
CREATE POLICY "anon_insert_serial_units" ON serial_units 
    FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to select serial_units (for dashboard display)
DROP POLICY IF EXISTS "anon_select_serial_units" ON serial_units;
CREATE POLICY "anon_select_serial_units" ON serial_units 
    FOR SELECT TO anon USING (true);

-- Allow anon to delete serial_units (for record deletion)
DROP POLICY IF EXISTS "anon_delete_serial_units" ON serial_units;
CREATE POLICY "anon_delete_serial_units" ON serial_units 
    FOR DELETE TO anon USING (true);

-- ============================================
-- AUTOMATIC TIMESTAMP UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION update_serial_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_serial_units_timestamp
    BEFORE UPDATE ON serial_units
    FOR EACH ROW
    EXECUTE FUNCTION update_serial_units_updated_at();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check table exists
-- SELECT * FROM serial_units LIMIT 5;

-- Check foreign key constraint
-- SELECT
--     tc.constraint_name,
--     tc.table_name,
--     kcu.column_name,
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name,
--     rc.delete_rule
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_name = 'serial_units';

-- ============================================
-- USAGE NOTES
-- ============================================
--
-- With ON DELETE CASCADE configured:
-- When you delete a record from the 'scans' table, all related
-- rows in 'serial_units' will be automatically deleted by the
-- database. This ensures atomicity and simplifies client code.
--
-- If you prefer manual deletion handling:
-- 1. Remove 'ON DELETE CASCADE' from the REFERENCES clause
-- 2. Delete from serial_units first, then from scans (as done in dashboard.html)
-- 3. This gives you more control but requires proper error handling
--
-- Example manual deletion (from client):
-- await supabaseClient.from('serial_units').delete().eq('scan_id', recordId);
-- await supabaseClient.from('scans').delete().eq('id', recordId);
-- ============================================
