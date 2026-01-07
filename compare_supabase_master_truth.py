"""
Compare Supabase scans against MASTER TRUTH from serial_numbers.db
Identies records with incorrect serial number formats and generates fix SQL
"""

import os
import re
from supabase import create_client, Client

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://ospedluufxgpfvqtznej.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcGVkbHV1ZnhncGZ2cXR6bmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODgyMTUsImV4cCI6MjA4MTU2NDIxNX0.1AhtuANYs-eVrQIdW9gqt_KLhBxF4Vm0j6pqtrrJAag')
MASTER_TRUTH_DB = 'serial_numbers.db'

def count_digits_after_prefix(serial):
    """Count digits after last letter in serial number."""
    if not serial:
        return 0, ''
    serial = serial.split('-')[0] if '-' in serial else serial
    
    match = re.search(r'[A-Z]([0-9]*)$', serial)
    if match:
        return len(match.group(1)), match.group(0)
    return 0, ''

def get_master_rules():
    """Load MASTER TRUTH rules from serial_numbers.db"""
    import sqlite3
    
    conn = sqlite3.connect(MASTER_TRUTH_DB)
    cursor = conn.cursor()
    
    cursor.execute('SELECT part_id, serial_prefix FROM product_variants ORDER BY part_id')
    variants = cursor.fetchall()
    
    master_rules = {}
    for variant in variants:
        pid = variant[1]  # part_id (column index 1)
        prefix = variant[3] or ''  # serial_prefix (column index 3)
        
        if prefix:
            match = re.search(r'[A-Z]([0-9]*)$', prefix)
            if match:
                expected_digits = len(match.group(1))
            else:
                expected_digits = 0
        else:
            expected_digits = 0
        
        master_rules[pid] = (prefix, expected_digits)
    
    conn.close()
    
    print(f'Loaded {len(master_rules)} MASTER TRUTH rules from serial_numbers.db')
    return master_rules

def analyze_supabase_scans(master_rules):
    """Analyze Supabase scans and identify incorrect serials"""
    print('=' * 70)
    print('ANALYZING SUPABASE SCANS VS MASTER TRUTH')
    print('=' * 70)
    print()
    
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    all_scans = []
    page = 0
    page_size = 1000
    has_more = True
    
    print('Fetching scans from Supabase...')
    while has_more:
        start = page * page_size
        end = start + page_size - 1
        
        response = client.table('scans').select('*').range(start, end).execute()
        
        if response.data and len(response.data) > 0:
            all_scans.extend(response.data)
            page += 1
            has_more = len(response.data) == page_size
            if page % 5 == 0:
                print(f'  Fetched {len(all_scans)} records...')
        else:
            has_more = False
        
        if page > 50:
            print('  Warning: Reached safety limit (50,000 records)')
            break
    
    print(f'Total Supabase scans fetched: {len(all_scans)}')
    print()
    
    issues_by_part = {}
    by_part = {}
    
    for scan in all_scans:
        scan_id = scan['id']
        pid = scan.get('part_id') or 'UNKNOWN'
        serial = scan.get('serial_number') or ''
        
        if pid not in master_rules:
            continue
        
        master_prefix, expected_digits = master_rules[pid]
        
        if expected_digits == 0:
            continue
        
        sb_digits, sb_prefix = count_digits_after_prefix(serial)
        
        if sb_digits != expected_digits:
            issues_by_part[pid] = issues_by_part.get(pid, [])
            issues_by_part[pid].append({
                'id': scan_id,
                'supabase_serial': serial,
                'supabase_digits': sb_digits,
                'supabase_prefix': sb_prefix,
                'master_prefix': master_prefix,
                'master_digits': expected_digits,
                'issue': f'Expected {expected_digits} digits, found {sb_digits}'
            })
        
        if pid not in by_part:
            by_part[pid] = []
        by_part[pid].append(scan)
    
    print('=' * 70)
    print('SUMMARY OF ISSUES BY PART ID')
    print('=' * 70)
    print()
    
    total_issues = 0
    for pid in sorted(issues_by_part.keys()):
        issues = issues_by_part[pid]
        if not issues:
            continue
        
        total_issues += len(issues)
        master_prefix, expected_digits = master_rules[pid]
        
        print(f'{pid}:')
        print(f'  MASTER TRUTH: {master_prefix} + {expected_digits} digits')
        print(f'  Issues found: {len(issues)} records')
        print(f'  Examples:')
        
        for issue in issues[:5]:
            print(f'    ID {issue["id"]:8} | {issue["supabase_serial"]:30} | {issue["issue"]}')
        
        if len(issues) > 5:
            print(f'    ... and {len(issues) - 5} more records with same issue')
        
        print()
    
    print('=' * 70)
    print(f'TOTAL ISSUES: {total_issues} records across {len(issues_by_part)} part IDs')
    print('=' * 70)
    print()
    
    generate_sql_fix_script(issues_by_part, master_rules)
    generate_detailed_report(by_part, issues_by_part)
    
    print('=' * 70)
    print('COMPLETE!')
    print('=' * 70)
    print()
    print('Generated files:')
    print('  1. fix_supabase_serials.sql - SQL fix script for Supabase')
    print('  2. supabase_issues_report.txt - Detailed report of issues')
    print()
    print('Next steps:')
    print('  1. Review the detailed report to understand the issues')
    print('  2. Verify MASTER TRUTH patterns are correct')
    print('  3. BACKUP your Supabase data before running fixes!')
    print('  4. Run fix_supabase_serials.sql in Supabase SQL editor')
    print('  5. Run verification queries to confirm all fixes')
    print()

def generate_sql_fix_script(issues_by_part, master_rules):
    """Generate SQL UPDATE script to fix incorrect serials"""
    print('Generating SQL fix script...')
    
    lines = [
        "-- ===========================================",
        "-- FIX SUPABASE SERIALS BASED ON MASTER TRUTH",
        "-- ===========================================",
        "-- Generated: 2025-01-07",
        "-- Source: serial_numbers.db (31,188 MASTER records)",
        "",
        "-- This script fixes serial_number values in Supabase scans table",
        "-- using the correct digit count from MASTER TRUTH.",
        "",
        "-- Each UPDATE fixes serials that don't match the expected pattern",
        "",
        "-- ⚠️  BACKUP YOUR DATA BEFORE RUNNING UPDATES!",
        "-- ===========================================",
        ""
    ]
    
    for pid in sorted(issues_by_part.keys()):
        issues = issues_by_part[pid]
        if not issues:
            continue
        
        master_prefix, expected_digits = master_rules[pid]
        
        if expected_digits == 0:
            continue
        
        lines.append("")
        lines.append(f"-- Fix {pid} ({len(issues)} records)")
        lines.append(f"-- Expected: {master_prefix} + {expected_digits} digits")
        lines.append("")
        
        for i in range(0, len(issues), 100):
            batch = issues[i:i+100]
            serial_list = ', '.join([f"'{issue[\"supabase_serial']}'" for issue in batch])
            id_list = ', '.join([str(issue["id"]) for issue in batch])
            
            lines.append("UPDATE scans")
            lines.append(f"SET serial_number = REGEXP_REPLACE(serial_number, '^.*\\\\d{{{expected_digits}}}).*$', '\\1{expected_digits}')")
            lines.append(f"WHERE id IN ({id_list})")
            lines.append(f"  AND part_id = '{pid}'")
            lines.append(f"  AND serial_number NOT REGEXP '^({master_prefix.replace('\\', '\\\\')}\\d{{{expected_digits}}})$';")
            lines.append(";")
            lines.append("")
        
        lines.append("")
        lines.append(f"-- Verify {pid} fixes")
        lines.append(f"SELECT COUNT(*) FROM scans")
        lines.append(f"WHERE part_id = '{pid}'")
        lines.append(f"  AND serial_number NOT REGEXP '^({master_prefix.replace('\\', '\\\\')}\\d{{{e
