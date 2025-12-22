-- ============================================
-- FIX HIBC SERIAL NUMBERS (v8.5.4)
-- ============================================
-- This script corrects serial_number values for HIBC barcodes
-- where the check digit (last character) was not properly stripped.
--
-- Pattern: raw_scan contains '/$+' (HIBC format)
-- Rule: Serial = PART_PREFIX + 5 digits (strip trailing check digit)
-- 
-- Run this AFTER deploying app.js v8.5.4
-- ============================================

-- ============================================
-- STEP 1: PREVIEW - See what will be changed
-- ============================================
-- Run this SELECT first to preview affected records:
/*
SELECT id, raw_scan, part_id, serial_number, 
       LEFT(serial_number, LENGTH(serial_number) - 1) as corrected_serial
FROM scans
WHERE raw_scan LIKE '%/$+%'
  AND (
    -- 759E2 series: has 7 digits after E (should have 6)
    (part_id = '100759E2' AND serial_number ~ '^759E2\d{7}$')
    -- 760E2 series: has 7 digits after E
    OR (part_id = '100760E2' AND serial_number ~ '^760E2\d{6}$')
    -- 760E series: has 6 digits after E (should have 5)  
    OR (part_id = '100760E' AND serial_number ~ '^760E\d{6}$')
    -- 757EN series: has 6 digits after N
    OR (part_id = '100757EN' AND serial_number ~ '^757EN\d{6}$')
    -- TNN102 series: has 6 digits after 2
    OR (part_id = 'TNN102' AND serial_number ~ '^TNN102\d{6}$')
  )
ORDER BY created_at DESC;
*/

-- ============================================
-- STEP 2: FIX SPECIFIC KNOWN CORRUPT RECORDS
-- ============================================

-- Fix the % -> 9 corruption (ID 11824) - direct fix
UPDATE scans
SET serial_number = '760E13281'
WHERE id = 11824 
  AND serial_number = '760E132819';

-- ============================================
-- STEP 3: FIX ALL 759E2 SERIES
-- Pattern: 759E2XXXXXXX (7 digits after E) -> 759E2XXXXXX (6 digits)
-- ============================================
UPDATE scans
SET serial_number = LEFT(serial_number, LENGTH(serial_number) - 1)
WHERE raw_scan LIKE '%/$+%'
  AND part_id = '100759E2'
  AND serial_number ~ '^759E2\d{7}$';

-- ============================================
-- STEP 4: FIX ALL 760E2 SERIES  
-- Pattern: 760E2XXXXXX (6 digits after E2) -> 760E2XXXXX (5 digits)
-- ============================================
UPDATE scans
SET serial_number = LEFT(serial_number, LENGTH(serial_number) - 1)
WHERE raw_scan LIKE '%/$+%'
  AND part_id = '100760E2'
  AND serial_number ~ '^760E2\d{6}$';

-- ============================================
-- STEP 5: FIX ALL 760E SERIES (non-E2)
-- Pattern: 760EXXXXXX (6 digits after E) -> 760EXXXXX (5 digits)
-- ============================================
UPDATE scans
SET serial_number = LEFT(serial_number, LENGTH(serial_number) - 1)
WHERE raw_scan LIKE '%/$+%'
  AND part_id = '100760E'
  AND serial_number ~ '^760E\d{6}$';

-- ============================================
-- STEP 6: FIX ALL 757EN SERIES
-- Pattern: 757ENXXXXXX (6 digits after N) -> 757ENXXXXX (5 digits)
-- ============================================
UPDATE scans
SET serial_number = LEFT(serial_number, LENGTH(serial_number) - 1)
WHERE raw_scan LIKE '%/$+%'
  AND part_id = '100757EN'
  AND serial_number ~ '^757EN\d{6}$';

-- ============================================
-- STEP 7: FIX ALL TNN102 SERIES
-- Pattern: TNN102XXXXXX (6 digits after 2) -> TNN102XXXXX (5 digits)
-- ============================================
UPDATE scans
SET serial_number = LEFT(serial_number, LENGTH(serial_number) - 1)
WHERE raw_scan LIKE '%/$+%'
  AND part_id = 'TNN102'
  AND serial_number ~ '^TNN102\d{6}$';

-- ============================================
-- STEP 8: CATCH-ALL for any other HIBC with 6+ trailing digits
-- This is a safety net for patterns we may have missed
-- ============================================
UPDATE scans
SET serial_number = LEFT(serial_number, LENGTH(serial_number) - 1)
WHERE raw_scan LIKE '%/$+%'
  AND serial_number ~ '[A-Z]\d{6,}$'
  AND LENGTH(serial_number) > 10;

-- ============================================
-- STEP 9: VERIFICATION
-- ============================================
-- Run this after the updates to verify no remaining issues:
/*
SELECT id, raw_scan, part_id, serial_number, created_at
FROM scans
WHERE raw_scan LIKE '%/$+%'
  AND serial_number ~ '[A-Z]\d{6,}$'
ORDER BY created_at DESC;
*/

-- Expected result: 0 rows (all fixed)

-- ============================================
-- ROLLBACK INFO (if needed)
-- ============================================
-- The original serial numbers can be reconstructed from raw_scan:
-- SELECT id, raw_scan, 
--        CASE WHEN raw_scan LIKE '%/$+%' 
--             THEN REGEXP_REPLACE(SPLIT_PART(raw_scan, '/$+', 2), '^\+', '')
--        END as original_serial
-- FROM scans WHERE raw_scan LIKE '%/$+%';
