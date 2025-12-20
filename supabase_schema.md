# Supabase Schema for Refined SOS v2

## Tables

### `operators`
- `id` (uuid) – primary key (auto‑generated)
- `name` (text) – operator name
- `active` (boolean) – whether the operator is available for scanning

### `stations`
- `id` (uuid) – primary key
- `name` (text) – station identifier (e.g., `MAIN`, `OP1`…)
- `active` (boolean)

### `part_map`
- `id` (uuid) – primary key
- `barcode_prefix` (text) – prefix used to map a barcode to a part number
- `part_number` (text) – the mapped part number (e.g., `536713-001S`)
- `active` (boolean)

### `scans`
- `id` (uuid) – primary key
- `operator_name` (text) – name of the operator who performed the scan
- `station_id` (text) – station identifier
- `raw_scan` (text) – original barcode string received from the scanner
- `part_id` (text) – part number derived from the barcode (or `UNKNOWN`)
- `serial_number` (text) – cleaned serial number
- `batch_comment` (text) – optional comment that applies to the batch
- `created_at` (timestamp) – default `now()`

## Row Level Security (RLS)
```sql
-- Allow anyone to INSERT scans (no SELECT needed for the app)
create policy "allow insert" on scans for insert using (true);
```

## Indexes (optional for performance)
```sql
create index on scans (operator_name);
create index on scans (station_id);
create index on scans (created_at desc);
```

## How to Apply
1. In the Supabase dashboard, go to **Table editor** → **New table** and create the tables above.
2. Enable **RLS** on the `scans` table and add the policy shown.
3. Populate `operators`, `stations`, and `part_map` with the values you need (the UI will pull them dynamically).

---
