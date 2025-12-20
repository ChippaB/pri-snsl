-- ============================================
-- FLAGGED SCANS FEATURE - Database Setup
-- ============================================
-- Run this script in Supabase SQL Editor
-- 
-- SAFE TO RUN: This adds new tables/triggers only.
-- Does NOT modify existing scan data or PWA behavior.
-- ============================================

-- 1. Create the flagged_scans table
-- This stores records of suspicious scans for review
CREATE TABLE IF NOT EXISTS flagged_scans (
    id SERIAL PRIMARY KEY,
    scan_id INTEGER REFERENCES scans(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL,       -- 'UNKNOWN_PART', 'SHORT_SERIAL', 'SHORT_RAW_SCAN'
    flag_details TEXT,             -- Human-readable description
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ
);

-- 2. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_flagged_unresolved 
    ON flagged_scans(resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flagged_scan_id 
    ON flagged_scans(scan_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE flagged_scans ENABLE ROW LEVEL SECURITY;

-- Allow anon read access (for dashboard)
DROP POLICY IF EXISTS "anon_select_flagged" ON flagged_scans;
CREATE POLICY "anon_select_flagged" ON flagged_scans 
    FOR SELECT TO anon USING (true);

-- Allow anon insert (triggered by database function)
DROP POLICY IF EXISTS "anon_insert_flagged" ON flagged_scans;
CREATE POLICY "anon_insert_flagged" ON flagged_scans 
    FOR INSERT TO anon WITH CHECK (true);

-- Allow anon update (for resolving flags from dashboard)
DROP POLICY IF EXISTS "anon_update_flagged" ON flagged_scans;
CREATE POLICY "anon_update_flagged" ON flagged_scans 
    FOR UPDATE TO anon USING (true) WITH CHECK (true);


-- ============================================
-- 4. Create the trigger function
-- This automatically flags suspicious scans AFTER insert
-- ============================================
CREATE OR REPLACE FUNCTION check_suspicious_scan()
RETURNS TRIGGER AS $$
BEGIN
    -- Flag 1: UNKNOWN part_id
    IF NEW.part_id = 'UNKNOWN' OR NEW.part_id IS NULL THEN
        INSERT INTO flagged_scans (scan_id, flag_type, flag_details)
        VALUES (NEW.id, 'UNKNOWN_PART', 'Part ID not found in part_map');
    END IF;

    -- Flag 2: Short serial number (< 5 characters)
    IF NEW.serial_number IS NOT NULL AND LENGTH(NEW.serial_number) < 5 THEN
        INSERT INTO flagged_scans (scan_id, flag_type, flag_details)
        VALUES (NEW.id, 'SHORT_SERIAL', 
            'Serial "' || NEW.serial_number || '" is only ' || LENGTH(NEW.serial_number) || ' chars');
    END IF;

    -- Flag 3: Short raw scan (< 20 characters)
    IF NEW.raw_scan IS NOT NULL AND LENGTH(NEW.raw_scan) < 20 THEN
        INSERT INTO flagged_scans (scan_id, flag_type, flag_details)
        VALUES (NEW.id, 'SHORT_RAW_SCAN', 
            'Raw scan is only ' || LENGTH(NEW.raw_scan) || ' chars');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 5. Create the trigger (AFTER INSERT - non-blocking)
-- ============================================
-- Drop existing trigger if it exists (for re-runs)
DROP TRIGGER IF EXISTS trg_check_suspicious_scan ON scans;

-- Create the trigger
CREATE TRIGGER trg_check_suspicious_scan
AFTER INSERT ON scans
FOR EACH ROW EXECUTE FUNCTION check_suspicious_scan();


-- ============================================
-- VERIFICATION QUERIES
-- Run these after setup to verify it works
-- ============================================

-- Check table was created
-- SELECT * FROM flagged_scans LIMIT 5;

-- Check trigger exists
-- SELECT trigger_name, event_manipulation, action_statement 
-- FROM information_schema.triggers 
-- WHERE trigger_name = 'trg_check_suspicious_scan';

-- Test with a manual insert (OPTIONAL - creates test data)
-- INSERT INTO scans (operator_name, station_id, raw_scan, part_id, serial_number)
-- VALUES ('TEST', 'TEST', 'test123', 'UNKNOWN', 'AB');
-- 
-- Then check flagged_scans:
-- SELECT * FROM flagged_scans ORDER BY created_at DESC LIMIT 5;
-- 
-- Clean up test:
-- DELETE FROM scans WHERE operator_name = 'TEST';
