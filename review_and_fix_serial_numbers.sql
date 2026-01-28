-- ============================================
-- FINAL CORRECTED: Account for Part IDs in Serial
-- ============================================
-- Issue: Part IDs like "100757E2" have the serial as "757E210891"
--        The "E2" is part of the part code, not the serial!
-- Solution: Strip the part_id prefix from serial, then count digits
-- ============================================

-- ============================================
-- STEP 1: IDENTIFY RECORDS NEEDING CORRECTION  
-- ============================================

WITH serial_parts AS (
    SELECT 
        id,
        created_at,
        operator_name,
        part_id,
        serial_number,
        raw_scan,
        -- Remove part_id prefix from serial to get actual serial digits
        -- For "757E210891" with part "100757E2", we want to extract "10891"
        CASE 
            -- Handle parts ending in E2 (100757E2, 100758E2, 100760E2, PFR60WE2, PFR80WE2)
            WHEN part_id ~ 'E2$' THEN
                REGEXP_REPLACE(serial_number, '^.*E2', '', 'i')
            -- Handle parts ending in ELMSN (757ELMSN)
            WHEN part_id ~ 'ELMSN$' THEN
                REGEXP_REPLACE(serial_number, '^.*ELMSN', '', 'i')
            -- Handle parts ending in EW (760EW, etc.)
            WHEN part_id ~ 'EW$' THEN
                REGEXP_REPLACE(serial_number, '^.*EW', '', 'i')
            -- Handle parts ending in EL (756EL, 758EL, 759EL, etc.)
            WHEN part_id ~ 'EL$' THEN
                REGEXP_REPLACE(serial_number, '^.*EL', '', 'i')
            -- Handle parts ending in WM (757WM)
            WHEN part_id ~ 'WM$' THEN
                REGEXP_REPLACE(serial_number, '^.*WM', '', 'i')
            -- Default: use last letter
            ELSE
                REGEXP_REPLACE(serial_number, '^.*[A-Z]', '', 'i')
        END as actual_serial_digits
    FROM scans
    WHERE 
        part_id IN (
            '760EW', '758EL', '759EL',
            '760E2', '757E2', '758E2', '756EL',
            'PFR60WE2', 'PFR80WE2',
            '100760E2', '100757E2', '100758E2'
        )
        AND serial_number IS NOT NULL
        AND serial_number != ''
)
SELECT 
    id,
    created_at,
    operator_name,
    part_id,
    serial_number as current_serial,
    actual_serial_digits,
    LENGTH(actual_serial_digits) as trailing_digit_count,
    SUBSTRING(serial_number, 1, LENGTH(serial_number) - 1) as proposed_serial,
    raw_scan
FROM serial_parts
WHERE LENGTH(actual_serial_digits) > 5
ORDER BY created_at DESC
LIMIT 100;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- Should show records like:
-- - R760EW103664: actual_serial_digits='103664' (6 digits) → NEEDS FIX
-- - R756EL119995: actual_serial_digits='119995' (6 digits) → NEEDS FIX
--
-- Should NOT show:
-- - 757E210891 (part 100757E2): actual_serial_digits='10891' (5 digits) → CORRECT
-- - PFR60WE214555 (part PFR60WE2): actual_serial_digits='14555' (5 digits) → CORRECT
-- - R757ELMSN102356 (part 757ELMSN): actual_serial_digits='102356' (6 digits) → NEEDS FIX
-- ============================================


-- ============================================
-- STEP 2: BREAKDOWN BY PART ID
-- ============================================

WITH serial_parts AS (
    SELECT 
        part_id,
        serial_number,
        created_at,
        CASE 
            WHEN part_id ~ 'E2$' THEN REGEXP_REPLACE(serial_number, '^.*E2', '', 'i')
            WHEN part_id ~ 'ELMSN$' THEN REGEXP_REPLACE(serial_number, '^.*ELMSN', '', 'i')
            WHEN part_id ~ 'EW$' THEN REGEXP_REPLACE(serial_number, '^.*EW', '', 'i')
            WHEN part_id ~ 'EL$' THEN REGEXP_REPLACE(serial_number, '^.*EL', '', 'i')
            WHEN part_id ~ 'WM$' THEN REGEXP_REPLACE(serial_number, '^.*WM', '', 'i')
            ELSE REGEXP_REPLACE(serial_number, '^.*[A-Z]', '', 'i')
        END as actual_serial_digits
    FROM scans
    WHERE 
        part_id IN (
            '760EW', '758EL', '759EL',
            '760E2', '757E2', '758E2', '756EL',
            'PFR60WE2', 'PFR80WE2',
            '100760E2', '100757E2', '100758E2'
        )
),
examples AS (
    SELECT 
        part_id,
        STRING_AGG(serial_number, ', ') as example_serials
    FROM (
        SELECT DISTINCT part_id, serial_number
        FROM serial_parts
        WHERE LENGTH(actual_serial_digits) > 5
        ORDER BY part_id, serial_number
        LIMIT 50
    ) sub
    GROUP BY part_id
)
SELECT 
    sp.part_id,
    COUNT(*) as total_records,
    COUNT(CASE WHEN LENGTH(sp.actual_serial_digits) > 5 THEN 1 END) as affected_count,
    MIN(sp.created_at) as first_occurrence,
    MAX(sp.created_at) as last_occurrence,
    e.example_serials
FROM serial_parts sp
LEFT JOIN examples e ON sp.part_id = e.part_id
WHERE LENGTH(sp.actual_serial_digits) > 5
GROUP BY sp.part_id, e.example_serials
ORDER BY affected_count DESC;


-- ============================================
-- STEP 3: CHECK FOR DUPLICATES
-- ============================================

WITH serial_parts AS (
    SELECT 
        id,
        serial_number,
        part_id,
        created_at,
        CASE 
            WHEN part_id ~ 'E2$' THEN REGEXP_REPLACE(serial_number, '^.*E2', '', 'i')
            WHEN part_id ~ 'ELMSN$' THEN REGEXP_REPLACE(serial_number, '^.*ELMSN', '', 'i')
            WHEN part_id ~ 'EW$' THEN REGEXP_REPLACE(serial_number, '^.*EW', '', 'i')
            WHEN part_id ~ 'EL$' THEN REGEXP_REPLACE(serial_number, '^.*EL', '', 'i')
            WHEN part_id ~ 'WM$' THEN REGEXP_REPLACE(serial_number, '^.*WM', '', 'i')
            ELSE REGEXP_REPLACE(serial_number, '^.*[A-Z]', '', 'i')
        END as actual_serial_digits
    FROM scans
    WHERE 
        part_id IN (
            '760EW', '758EL', '759EL',
            '760E2', '757E2', '758E2', '756EL',
            'PFR60WE2', 'PFR80WE2',
            '100760E2', '100757E2', '100758E2'
        )
),
proposed_corrections AS (
    SELECT 
        id,
        serial_number as original_serial,
        SUBSTRING(serial_number, 1, LENGTH(serial_number) - 1) as corrected_serial,
        part_id,
        created_at
    FROM serial_parts
    WHERE LENGTH(actual_serial_digits) > 5
)
SELECT 
    pc.id,
    pc.original_serial,
    pc.corrected_serial,
    pc.part_id,
    pc.created_at,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM scans s 
            WHERE s.serial_number = pc.corrected_serial 
            AND s.part_id = pc.part_id
            AND s.id != pc.id
        ) THEN '⚠️ DUPLICATE EXISTS - DO NOT FIX'
        ELSE '✓ Safe to correct'
    END as duplicate_check
FROM proposed_corrections pc
ORDER BY duplicate_check DESC, pc.created_at DESC
LIMIT 100;


-- ============================================
-- STEP 4A: PREVIEW UPDATE (DRY RUN)
-- ============================================

WITH serial_parts AS (
    SELECT 
        id,
        created_at,
        part_id,
        serial_number,
        raw_scan,
        CASE 
            WHEN part_id ~ 'E2$' THEN REGEXP_REPLACE(serial_number, '^.*E2', '', 'i')
            WHEN part_id ~ 'ELMSN$' THEN REGEXP_REPLACE(serial_number, '^.*ELMSN', '', 'i')
            WHEN part_id ~ 'EW$' THEN REGEXP_REPLACE(serial_number, '^.*EW', '', 'i')
            WHEN part_id ~ 'EL$' THEN REGEXP_REPLACE(serial_number, '^.*EL', '', 'i')
            WHEN part_id ~ 'WM$' THEN REGEXP_REPLACE(serial_number, '^.*WM', '', 'i')
            ELSE REGEXP_REPLACE(serial_number, '^.*[A-Z]', '', 'i')
        END as actual_serial_digits
    FROM scans
    WHERE 
        part_id IN (
            '760EW', '758EL', '759EL',
            '760E2', '757E2', '758E2', '756EL',
            'PFR60WE2', 'PFR80WE2',
            '100760E2', '100757E2', '100758E2'
        )
)
SELECT 
    id,
    created_at,
    part_id,
    serial_number as current_serial,
    SUBSTRING(serial_number, 1, LENGTH(serial_number) - 1) as new_serial,
    actual_serial_digits,
    LENGTH(actual_serial_digits) as current_digits,
    raw_scan
FROM serial_parts
WHERE 
    LENGTH(actual_serial_digits) > 5
    -- Only safe records (no duplicates)
    AND NOT EXISTS (
        SELECT 1 FROM scans s2
        WHERE s2.serial_number = SUBSTRING(serial_parts.serial_number, 1, LENGTH(serial_parts.serial_number) - 1)
        AND s2.part_id = serial_parts.part_id
        AND s2.id != serial_parts.id
    )
ORDER BY part_id, created_at DESC
LIMIT 100;


-- ============================================
-- STEP 4B: EXECUTE UPDATE
-- ============================================
-- ⚠️ WARNING: Only run after reviewing STEP 4A!

BEGIN;

WITH serial_parts AS (
    SELECT 
        id,
        serial_number,
        part_id,
        CASE 
            WHEN part_id ~ 'E2$' THEN REGEXP_REPLACE(serial_number, '^.*E2', '', 'i')
            WHEN part_id ~ 'ELMSN$' THEN REGEXP_REPLACE(serial_number, '^.*ELMSN', '', 'i')
            WHEN part_id ~ 'EW$' THEN REGEXP_REPLACE(serial_number, '^.*EW', '', 'i')
            WHEN part_id ~ 'EL$' THEN REGEXP_REPLACE(serial_number, '^.*EL', '', 'i')
            WHEN part_id ~ 'WM$' THEN REGEXP_REPLACE(serial_number, '^.*WM', '', 'i')
            ELSE REGEXP_REPLACE(serial_number, '^.*[A-Z]', '', 'i')
        END as actual_serial_digits
    FROM scans
    WHERE 
        part_id IN (
            '760EW', '758EL', '759EL',
            '760E2', '757E2', '758E2', '756EL',
            'PFR60WE2', 'PFR80WE2',
            '100760E2', '100757E2', '100758E2'
        )
)
UPDATE scans
SET serial_number = SUBSTRING(scans.serial_number, 1, LENGTH(scans.serial_number) - 1)
FROM serial_parts sp
WHERE 
    scans.id = sp.id
    AND LENGTH(sp.actual_serial_digits) > 5
    AND NOT EXISTS (
        SELECT 1 FROM scans s2
        WHERE s2.serial_number = SUBSTRING(scans.serial_number, 1, LENGTH(scans.serial_number) - 1)
        AND s2.part_id = scans.part_id
        AND s2.id != scans.id
    );

-- Show summary
SELECT COUNT(*) as records_updated;

-- ⚠️ DECISION POINT:
-- COMMIT;   -- Uncomment to save changes
-- ROLLBACK; -- Uncomment to undo


-- ============================================
-- STEP 5: VERIFICATION
-- ============================================

WITH serial_parts AS (
    SELECT 
        part_id,
        serial_number,
        CASE 
            WHEN part_id ~ 'E2$' THEN REGEXP_REPLACE(serial_number, '^.*E2', '', 'i')
            WHEN part_id ~ 'ELMSN$' THEN REGEXP_REPLACE(serial_number, '^.*ELMSN', '', 'i')
            WHEN part_id ~ 'EW$' THEN REGEXP_REPLACE(serial_number, '^.*EW', '', 'i')
            WHEN part_id ~ 'EL$' THEN REGEXP_REPLACE(serial_number, '^.*EL', '', 'i')
            WHEN part_id ~ 'WM$' THEN REGEXP_REPLACE(serial_number, '^.*WM', '', 'i')
            ELSE REGEXP_REPLACE(serial_number, '^.*[A-Z]', '', 'i')
        END as actual_serial_digits
    FROM scans
    WHERE 
        part_id IN (
            '760EW', '758EL', '759EL',
            '760E2', '757E2', '758E2', '756EL',
            'PFR60WE2', 'PFR80WE2',
            '100760E2', '100757E2', '100758E2'
        )
)
SELECT 
    part_id,
    COUNT(*) as total_records,
    COUNT(CASE WHEN LENGTH(actual_serial_digits) = 5 THEN 1 END) as five_digit_count,
    COUNT(CASE WHEN LENGTH(actual_serial_digits) > 5 THEN 1 END) as six_plus_digit_count
FROM serial_parts
GROUP BY part_id
ORDER BY six_plus_digit_count DESC, part_id;


-- ============================================
-- BONUS: Manual Test Query
-- ============================================
-- Test the digit counting logic on specific serials

WITH test_serials AS (
    SELECT 
        id,
        part_id,
        serial_number,
        CASE 
            WHEN part_id ~ 'E2$' THEN REGEXP_REPLACE(serial_number, '^.*E2', '', 'i')
            WHEN part_id ~ 'ELMSN$' THEN REGEXP_REPLACE(serial_number, '^.*ELMSN', '', 'i')
            WHEN part_id ~ 'EW$' THEN REGEXP_REPLACE(serial_number, '^.*EW', '', 'i')
            WHEN part_id ~ 'EL$' THEN REGEXP_REPLACE(serial_number, '^.*EL', '', 'i')
            WHEN part_id ~ 'WM$' THEN REGEXP_REPLACE(serial_number, '^.*WM', '', 'i')
            ELSE REGEXP_REPLACE(serial_number, '^.*[A-Z]', '', 'i')
        END as actual_serial_digits
    FROM scans
    WHERE id IN (15973, 15887, 15778, 15513, 15444, 15438, 14082, 13901)
)
SELECT 
    id,
    part_id,
    serial_number,
    actual_serial_digits,
    LENGTH(actual_serial_digits) as digit_count,
    CASE 
        WHEN LENGTH(actual_serial_digits) = 5 THEN '✓ Correct (5 digits)'
        WHEN LENGTH(actual_serial_digits) > 5 THEN '⚠️ Too many digits - needs fix'
        ELSE '⚠️ Too few digits'
    END as status
FROM test_serials
ORDER BY id DESC;
