# Supabase Schema Reference

## Overview

This is a documentation reference for the Supabase tables used by PRI-SNSL. It is not a migration plan and should not be applied blindly to a live project.

This documentation cleanup does not change the Supabase schema.

## Purpose

The scanner app reads configuration data from Supabase and writes accepted scans to the `scans` table. The report script reads scan records for daily report generation.

## Tables

### `operators`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `name` | Operator display name |
| `active` | Whether the operator appears in the scanner |

### `stations`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `name` | Station display name or identifier |
| `active` | Whether the station appears in the scanner |

### `part_map`

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `barcode_prefix` | Prefix used by scanner parsing |
| `part_number` | Part number assigned to that prefix |
| `active` | Whether the mapping should be used |

### `scans`

The scanner insert payload currently maps to these fields:

| Column | Written from |
|---|---|
| `operator_name` | selected operator |
| `station_id` | selected station |
| `raw_scan` | sanitized raw barcode |
| `part_id` | parsed part number, or `UNKNOWN` |
| `serial_number` | cleaned serial number |
| `batch_comment` | optional note |
| `idempotency_key` | generated scanner key |
| `created_at` | database timestamp/default |

The table may also have an `id` primary key and other live constraints or policies. Verify the live Supabase project before changing anything.

## Step-by-Step Operational Checks

1. Confirm active operators appear in the scanner Operator list.
2. Confirm active stations appear in the scanner Station list.
3. Confirm expected barcode prefixes are active in `part_map`.
4. Confirm new scans insert into `scans` with `idempotency_key`.
5. Confirm dashboard and reports can read the expected scan records.

## Edge Cases and Warnings

- Do not remove active operator, station, or part map rows during production scanning.
- Do not change scan constraints without checking duplicate and queue behavior.
- If `idempotency_key` is missing from the live schema, scanner inserts can fail or stay queued.
- RLS and permissions must allow the scanner's configured key to insert scans.

## Troubleshooting

| Symptom | Likely schema/config cause | Fix |
|---|---|---|
| Operator list does not load | `operators` unavailable, inactive rows, or permission issue | Check active operators and Supabase access |
| Station list does not load | `stations` unavailable, inactive rows, or permission issue | Check active stations and Supabase access |
| Part shows `UNKNOWN` | Missing or inactive `part_map` prefix | Add or activate the correct prefix mapping after verification |
| Scans stay queued while badges are OK | Insert blocked by schema, constraint, RLS, or permission issue | Inspect queued error metadata and Supabase logs |
| Duplicate behavior changed | Constraint changed or missing | Verify `idempotency_key` and any serial uniqueness constraints |

## Notes and Limitations

- This file documents expected scanner-facing columns only.
- It does not replace migrations or live database inspection.
- The scanner app does not create or update schema at runtime.
