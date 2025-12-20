-- ============================================
-- FIX INCORRECT PART_IDs IN SCANS TABLE (v2)
-- ============================================
-- Handles duplicate constraint by only updating records
-- that won't create duplicates
-- ============================================

-- Step 1: First, let's see which records would cause duplicates
-- Run this query first to understand the situation:
/*
SELECT s1.id, s1.raw_scan, s1.part_id as current_part, s1.serial_number, 
       'Would conflict with ID: ' || s2.id as conflict_note
FROM scans s1
JOIN scans s2 ON s1.serial_number = s2.serial_number 
             AND s1.id != s2.id
WHERE (s1.raw_scan LIKE '0100810016250258%' AND s2.part_id = '536713-001')
   OR (s1.raw_scan LIKE '0100810016250265%' AND s2.part_id = '536713-002')
   OR (s1.raw_scan LIKE '0100810016250272%' AND s2.part_id = '536719-004')
   OR (s1.raw_scan LIKE '0100810016250289%' AND s2.part_id = '536723-001')
   OR (s1.raw_scan LIKE '0100810016250296%' AND s2.part_id = '536713-005')
   OR (s1.raw_scan LIKE '0100810016250302%' AND s2.part_id = '536719-001')
   OR (s1.raw_scan LIKE '0100810016250326%' AND s2.part_id = '536713-004')
   OR (s1.raw_scan LIKE '0100810016250333%' AND s2.part_id = '536723-004');
*/

-- Step 2: Delete duplicate scans that have wrong part_ids
-- (Keep the one with the correct part_id, delete the one with wrong part_id)
-- This deletes records that would cause conflicts after update

DELETE FROM scans s1
WHERE EXISTS (
    SELECT 1 FROM scans s2 
    WHERE s2.serial_number = s1.serial_number 
      AND s2.id != s1.id
      AND (
        -- s1 has wrong part_id for 536713-001, s2 has correct one
        (s1.raw_scan LIKE '0100810016250258%' AND s1.part_id != '536713-001' AND s2.part_id = '536713-001') OR
        (s1.raw_scan LIKE '0100810016250265%' AND s1.part_id != '536713-002' AND s2.part_id = '536713-002') OR
        (s1.raw_scan LIKE '0100810016250272%' AND s1.part_id != '536719-004' AND s2.part_id = '536719-004') OR
        (s1.raw_scan LIKE '0100810016250289%' AND s1.part_id != '536723-001' AND s2.part_id = '536723-001') OR
        (s1.raw_scan LIKE '0100810016250296%' AND s1.part_id != '536713-005' AND s2.part_id = '536713-005') OR
        (s1.raw_scan LIKE '0100810016250302%' AND s1.part_id != '536719-001' AND s2.part_id = '536719-001') OR
        (s1.raw_scan LIKE '0100810016250326%' AND s1.part_id != '536713-004' AND s2.part_id = '536713-004') OR
        (s1.raw_scan LIKE '0100810016250333%' AND s1.part_id != '536723-004' AND s2.part_id = '536723-004')
      )
);

-- Step 3: Now update the remaining records safely
-- Each update only runs if it won't create a duplicate

UPDATE scans s1
SET part_id = '536713-001' 
WHERE raw_scan LIKE '0100810016250258%' 
  AND part_id != '536713-001'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = '536713-001' AND s2.id != s1.id);

UPDATE scans s1
SET part_id = '536713-002' 
WHERE raw_scan LIKE '0100810016250265%' 
  AND part_id != '536713-002'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = '536713-002' AND s2.id != s1.id);

UPDATE scans s1
SET part_id = '536719-004' 
WHERE raw_scan LIKE '0100810016250272%' 
  AND part_id != '536719-004'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = '536719-004' AND s2.id != s1.id);

UPDATE scans s1
SET part_id = '536723-001' 
WHERE raw_scan LIKE '0100810016250289%' 
  AND part_id != '536723-001'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = '536723-001' AND s2.id != s1.id);

UPDATE scans s1
SET part_id = '536713-005' 
WHERE raw_scan LIKE '0100810016250296%' 
  AND part_id != '536713-005'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = '536713-005' AND s2.id != s1.id);

UPDATE scans s1
SET part_id = '536719-001' 
WHERE raw_scan LIKE '0100810016250302%' 
  AND part_id != '536719-001'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = '536719-001' AND s2.id != s1.id);

UPDATE scans s1
SET part_id = '536713-004' 
WHERE raw_scan LIKE '0100810016250326%' 
  AND part_id != '536713-004'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = '536713-004' AND s2.id != s1.id);

UPDATE scans s1
SET part_id = '536723-004' 
WHERE raw_scan LIKE '0100810016250333%' 
  AND part_id != '536723-004'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = '536723-004' AND s2.id != s1.id);

-- PFR patterns
UPDATE scans s1 SET part_id = 'PFR80W' WHERE raw_scan LIKE '0100812574024722%' AND part_id != 'PFR80W'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR80W' AND s2.id != s1.id);

UPDATE scans s1 SET part_id = 'PFR60W' WHERE raw_scan LIKE '0100812574024753%' AND part_id != 'PFR60W'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR60W' AND s2.id != s1.id);

UPDATE scans s1 SET part_id = 'PFR8WK' WHERE raw_scan LIKE '0100812574024982%' AND part_id != 'PFR8WK'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR8WK' AND s2.id != s1.id);

UPDATE scans s1 SET part_id = 'PFR60WE2' WHERE raw_scan LIKE '0100812574026597%' AND part_id != 'PFR60WE2'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR60WE2' AND s2.id != s1.id);

UPDATE scans s1 SET part_id = 'PFR60WEL' WHERE raw_scan LIKE '0100812574026603%' AND part_id != 'PFR60WEL'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR60WEL' AND s2.id != s1.id);

UPDATE scans s1 SET part_id = 'PFR60WK' WHERE raw_scan LIKE '0100812574026610%' AND part_id != 'PFR60WK'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR60WK' AND s2.id != s1.id);

UPDATE scans s1 SET part_id = 'PFR70WE2N' WHERE raw_scan LIKE '0100812574024746%' AND part_id != 'PFR70WE2N'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR70WE2N' AND s2.id != s1.id);

UPDATE scans s1 SET part_id = 'PFR80WE2' WHERE raw_scan LIKE '0100812574026672%' AND part_id != 'PFR80WE2'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR80WE2' AND s2.id != s1.id);

UPDATE scans s1 SET part_id = 'PFR8WE2' WHERE raw_scan LIKE '0100812574026719%' AND part_id != 'PFR8WE2'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR8WE2' AND s2.id != s1.id);

UPDATE scans s1 SET part_id = 'PFR80WKN' WHERE raw_scan LIKE '0100812574026689%' AND part_id != 'PFR80WKN'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR80WKN' AND s2.id != s1.id);

UPDATE scans s1 SET part_id = 'PFR80WN' WHERE raw_scan LIKE '0100812574026696%' AND part_id != 'PFR80WN'
  AND NOT EXISTS (SELECT 1 FROM scans s2 WHERE s2.serial_number = s1.serial_number AND s2.part_id = 'PFR80WN' AND s2.id != s1.id);


-- ============================================
-- VERIFICATION - After running above
-- ============================================
-- Check for any remaining incorrect part_ids
/*
SELECT id, raw_scan, part_id, serial_number, created_at
FROM scans 
WHERE (raw_scan LIKE '0100810016250%' OR raw_scan LIKE '0100812574024%' OR raw_scan LIKE '0100812574026%')
ORDER BY created_at DESC
LIMIT 30;
*/
