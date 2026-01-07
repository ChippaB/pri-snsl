-- ========================================
-- Refined SOS v2: Supabase RLS Fix Script
-- ========================================
-- IMPORTANT: Execute this in your Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query -> Paste -> Run
-- ========================================

-- Step 1: Check current RLS status (read-only, safe to run first)
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('operators', 'stations', 'part_map', 'scans');

-- ========================================
-- Step 2: Enable RLS on all tables (if not already enabled)
-- ========================================
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Step 3: Drop existing policies (to avoid conflicts)
-- These will silently succeed even if policies don't exist
-- ========================================
DROP POLICY IF EXISTS "allow insert" ON scans;
DROP POLICY IF EXISTS "anon_select_operators" ON operators;
DROP POLICY IF EXISTS "anon_select_stations" ON stations;
DROP POLICY IF EXISTS "anon_select_part_map" ON part_map;
DROP POLICY IF EXISTS "anon_insert_scans" ON scans;
DROP POLICY IF EXISTS "anon_select_scans" ON scans;

-- ========================================
-- Step 4: Create correct policies
-- ========================================

-- Config tables: Allow anonymous SELECT (read-only)
CREATE POLICY "anon_select_operators" ON operators 
    FOR SELECT 
    USING (true);

CREATE POLICY "anon_select_stations" ON stations 
    FOR SELECT 
    USING (true);

CREATE POLICY "anon_select_part_map" ON part_map 
    FOR SELECT 
    USING (true);

-- Scans table: Allow anonymous INSERT and SELECT
CREATE POLICY "anon_insert_scans" ON scans 
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "anon_select_scans" ON scans 
    FOR SELECT 
    USING (true);

-- ========================================
-- Step 5: Add idempotency key column (for duplicate prevention)
-- ========================================
ALTER TABLE scans ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index (allows NULL values, only enforces uniqueness on non-NULL)
CREATE UNIQUE INDEX IF NOT EXISTS scans_idempotency_key_idx 
    ON scans (idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- ========================================
-- Step 6: Verify policies were created
-- ========================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('operators', 'stations', 'part_map', 'scans')
ORDER BY tablename, policyname;

-- ========================================
-- Done! Expected output after Step 6:
-- - 3 SELECT policies (one per config table)
-- - 2 policies on scans (INSERT and SELECT)
-- ========================================
