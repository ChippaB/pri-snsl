# Archived Database Fixes

This folder contains SQL scripts used to fix historical data issues. These scripts are no longer needed but kept for reference.

## Scripts

### fix_hibc_serials.sql
**Date:** Dec 22, 2025  
**Version:** v8.5.4  
**Purpose:** Fixed serial numbers where HIBC check digits were not stripped

**Issues Fixed:**
- 759E2 series: Had 7 digits after E (should be 6)
- 760E2 series: Had 6 digits after E2 (should be 5)
- 760E series: Had 6 digits after E (should be 5)
- 757EN series: Had 6 digits after N (should be 5)
- TNN102 series: Had 6 digits after 2 (should be 5)

---

### fix_scan_part_ids.sql
**Date:** Dec 19, 2025  
**Purpose:** Corrected part IDs for specific serial patterns

**Issues Fixed:**
- Mismatched part_id values for certain serial numbers
- Part number mapping corrections

---

### supabase_flagged_scans.sql
**Date:** Dec 23, 2025  
**Purpose:** Database triggers for detecting suspicious scans

**Features:**
- Automatic flagging of UNKNOWN part_id entries
- Detection of short serial numbers (< 5 chars)
- Detection of short raw scans (< 20 chars)
- Detection of suspicious characters in scans

Creates `flagged_scans` table and `check_suspicious_scan()` trigger function.

---

### supabase_rls_fix.sql
**Date:** Dec 19, 2025  
**Purpose:** Row Level Security (RLS) policy fixes

**Features:**
- Enabled RLS on tables
- Created appropriate policies for scan operations

---

## Usage

⚠️ **DO NOT RUN THESE SCRIPTS** unless:
1. You understand what they do
2. You have a database backup
3. You're sure the same issue exists

These are historical fixes for specific data corruption issues that occurred during early deployment phases.
