"""
Daily Build Report Generator for Polytechnic Resources
Queries Supabase for previous day's scans, generates Excel report, emails to recipients.

Usage:
    python daily_report.py                  # Uses yesterday's date
    python daily_report.py 2025-12-17       # Specific date
    python daily_report.py --test           # Test mode (prints output, no email)
"""

import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
import tempfile

# Third-party imports
try:
    from supabase import create_client, Client
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Run: pip install supabase openpyxl")
    sys.exit(1)

# Optional: Google Sheets backup (gspread)
try:
    import gspread
    from google.oauth2.service_account import Credentials
    GSPREAD_AVAILABLE = True
except ImportError:
    GSPREAD_AVAILABLE = False
    print("[WARN] gspread not installed - Google Sheets backup disabled")

# ============================================
# CONFIGURATION (from environment variables)
# ============================================

# Supabase
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://ospedluufxgpfvqtznej.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcGVkbHV1ZnhncGZ2cXR6bmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODgyMTUsImV4cCI6MjA4MTU2NDIxNX0.1AhtuANYs-eVrQIdW9gqt_KLhBxF4Vm0j6pqtrrJAag')

# Email Configuration
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', 'polytechnicresources.dev@gmail.com')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', 'jppg ytea oqzc lsdn')  # Gmail App Password

# Recipients (comma-separated in a single string)
REPORT_RECIPIENTS = os.environ.get('REPORT_RECIPIENTS', 'chip.brandner@gmail.com, ksilesky1@verizon.net')

# Report settings
PIECES_PER_BOX = int(os.environ.get('PIECES_PER_BOX', '100'))

# Google Sheets Backup Configuration
# GSHEET_CREDENTIALS_JSON: Base64-encoded service account JSON (from GitHub Secret)
# GSHEET_SPREADSHEET_ID: The ID from the Google Sheet URL
GSHEET_CREDENTIALS_JSON = os.environ.get('GSHEET_CREDENTIALS_JSON', '')
GSHEET_SPREADSHEET_ID = os.environ.get('GSHEET_SPREADSHEET_ID', '')
GSHEET_ENABLED = bool(GSHEET_CREDENTIALS_JSON and GSHEET_SPREADSHEET_ID and GSPREAD_AVAILABLE)


def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    if not SUPABASE_KEY:
        raise ValueError("SUPABASE_KEY environment variable not set")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_scans_for_date(supabase: Client, target_date: datetime) -> list:
    """
    Fetch all scans for a specific date (in EST/Eastern Time).
    Supabase stores timestamps in UTC, so we need to convert.
    """
    # Calculate UTC range for the target EST date
    # EST is UTC-5, so midnight EST = 5:00 AM UTC
    start_utc = target_date.replace(hour=5, minute=0, second=0, microsecond=0)
    end_utc = start_utc + timedelta(days=1)
    
    start_str = start_utc.strftime('%Y-%m-%dT%H:%M:%S+00:00')
    end_str = end_utc.strftime('%Y-%m-%dT%H:%M:%S+00:00')
    
    print(f"[INFO] Fetching scans from {start_str} to {end_str}")
    
    response = supabase.table('scans').select('*').gte(
        'created_at', start_str
    ).lt(
        'created_at', end_str
    ).order('operator_name').order('station_id').order('part_id').execute()
    
    return response.data if response.data else []


def format_serial_ranges(serials: list) -> str:
    """
    Convert a list of serial numbers into formatted ranges.
    Uses '-' for consecutive sequences, '/' for breaks.
    Example: ['MGCK173156', 'MGCK173157', 'MGCK173158', 'MGCK173170'] 
             -> 'MGCK173156-173158 / MGCK173170'
    """
    if not serials:
        return ""
    
    # Sort serials
    serials = sorted(set(serials))
    
    if len(serials) == 1:
        return serials[0]
    
    def extract_prefix_and_num(serial):
        """
        Extract prefix and trailing numeric portion.
        'PUL9000K29498' -> ('PUL9000K', 29498)
        'MGCK173156' -> ('MGCK', 173156)
        """
        import re
        # Find trailing digits
        match = re.match(r'^(.+?)(\d+)$', serial)
        if match:
            prefix = match.group(1)
            num = int(match.group(2))
            return prefix, num
        return serial, None
    
    # Build ranges
    ranges = []
    current_prefix = None
    current_start = None
    current_end = None
    
    for serial in serials:
        prefix, num = extract_prefix_and_num(serial)
        
        if num is None:
            # No numeric portion, output current range and add this as-is
            if current_start is not None:
                ranges.append(format_range(current_prefix, current_start, current_end))
                current_start = None
            ranges.append(serial)
            continue
        
        if current_start is None:
            # Start new range
            current_prefix = prefix
            current_start = num
            current_end = num
        elif prefix == current_prefix and num == current_end + 1:
            # Extend current range (consecutive)
            current_end = num
        else:
            # End current range, start new one
            ranges.append(format_range(current_prefix, current_start, current_end))
            current_prefix = prefix
            current_start = num
            current_end = num
    
    # Don't forget the last range
    if current_start is not None:
        ranges.append(format_range(current_prefix, current_start, current_end))
    
    return " / ".join(ranges)


def format_range(prefix: str, start: int, end: int) -> str:
    """Format a range like 'MGCK173156-173158' or 'MGCK173156' if single"""
    if start == end:
        return f"{prefix}{start}"
    else:
        return f"{prefix}{start}-{end}"


def group_scans(scans: list) -> dict:
    """
    Group scans by Operator -> Station -> Part Number
    Returns nested dict with scan details
    """
    grouped = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    
    for scan in scans:
        operator = scan.get('operator_name') or 'Unknown'
        station = scan.get('station_id') or 'Unknown'
        part = scan.get('part_id') or 'Unknown'
        serial = scan.get('serial_number') or ''
        
        grouped[operator][station][part].append(serial)
    
    return grouped


def generate_excel_report(grouped_data: dict, scans: list, report_date: datetime) -> str:
    """
    Generate Excel report matching Build_Report format.
    Returns path to temporary Excel file.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = f"Build Report {report_date.strftime('%m-%d-%Y')}"
    
    # Styles
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="072549", end_color="072549", fill_type="solid")
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Headers
    headers = ['Operator', 'Station', 'Part Number', 'Context', 'Total Scans (Boxes)', 'Total Pieces', 'Serial Numbers Logged']
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
        cell.border = border
    
    # Data rows
    row = 2
    part_totals = defaultdict(lambda: {'scans': 0, 'pieces': 0})
    
    for operator in sorted(grouped_data.keys()):
        for station in sorted(grouped_data[operator].keys()):
            for part in sorted(grouped_data[operator][station].keys()):
                serials = grouped_data[operator][station][part]
                scan_count = len(serials)
                pieces = scan_count * PIECES_PER_BOX
                serial_ranges = format_serial_ranges(serials)
                
                # Track totals
                part_totals[part]['scans'] += scan_count
                part_totals[part]['pieces'] += pieces
                
                # Write row
                ws.cell(row=row, column=1, value=operator).border = border
                ws.cell(row=row, column=2, value=station).border = border
                ws.cell(row=row, column=3, value=part).border = border
                ws.cell(row=row, column=4, value='').border = border  # Context column (empty)
                ws.cell(row=row, column=5, value=scan_count).border = border
                ws.cell(row=row, column=6, value=pieces).border = border
                ws.cell(row=row, column=7, value=serial_ranges).border = border
                
                row += 1
    
    # Blank rows before Grand Total
    row += 2
    
    # Grand Total Header
    ws.cell(row=row, column=1, value="Grand Total by Part Number").font = Font(bold=True, size=12)
    row += 1
    
    # Grand Total column headers
    gt_headers = ['Part Number', 'Total Scans (Boxes)', 'Total Pieces']
    for col, header in enumerate(gt_headers, 1):
        cell = ws.cell(row=row, column=col, value=header)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
        cell.border = border
    row += 1
    
    # Grand Total data
    for part in sorted(part_totals.keys()):
        ws.cell(row=row, column=1, value=part).border = border
        ws.cell(row=row, column=2, value=part_totals[part]['scans']).border = border
        ws.cell(row=row, column=3, value=part_totals[part]['pieces']).border = border
        row += 1
    
    # Auto-adjust column widths for main sheet
    for col in range(1, 8):
        max_length = 0
        column_letter = get_column_letter(col)
        for cell in ws[column_letter]:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width
    
    # ===== CREATE SUMMARY SHEET =====
    ws_summary = wb.create_sheet(title="Summary")
    
    # Title
    ws_summary.cell(row=1, column=1, value=f"Daily Build Assembly Report Summary - {report_date.strftime('%m-%d-%Y')}")
    ws_summary['A1'].font = Font(bold=True, size=14)
    
    # Total scans
    total_scans = len(scans)
    ws_summary.cell(row=3, column=1, value="Total Scans:")
    ws_summary.cell(row=3, column=2, value=total_scans)
    ws_summary['A3'].font = Font(bold=True)
    
    ws_summary.cell(row=4, column=1, value="Total Pieces:")
    ws_summary.cell(row=4, column=2, value=total_scans * PIECES_PER_BOX)
    ws_summary['A4'].font = Font(bold=True)
    
    # By Station
    row = 6
    ws_summary.cell(row=row, column=1, value="By Station:")
    ws_summary[f'A{row}'].font = Font(bold=True, size=12)
    row += 1
    
    station_counts = defaultdict(int)
    for scan in scans:
        station = scan.get('station_id') or 'Unknown'
        station_counts[station] += 1
    
    for station, count in sorted(station_counts.items(), key=lambda x: -x[1]):
        ws_summary.cell(row=row, column=1, value=station)
        ws_summary.cell(row=row, column=2, value=count)
        ws_summary.cell(row=row, column=3, value=f"({count * PIECES_PER_BOX} pcs)")
        row += 1
    
    # By Operator
    row += 1
    ws_summary.cell(row=row, column=1, value="By Operator:")
    ws_summary[f'A{row}'].font = Font(bold=True, size=12)
    row += 1
    
    operator_counts = defaultdict(int)
    for scan in scans:
        operator = scan.get('operator_name') or 'Unknown'
        operator_counts[operator] += 1
    
    for operator, count in sorted(operator_counts.items(), key=lambda x: -x[1]):
        ws_summary.cell(row=row, column=1, value=operator)
        ws_summary.cell(row=row, column=2, value=count)
        ws_summary.cell(row=row, column=3, value=f"({count * PIECES_PER_BOX} pcs)")
        row += 1
    
    # Batch Comment (SO Context) Summary
    row += 2
    ws_summary.cell(row=row, column=1, value="Batch Comment ('SO' Context) Summary:")
    ws_summary[f'A{row}'].font = Font(bold=True, size=12)
    row += 1
    
    # Count scans with and without SO context
    scans_with_so = 0
    scans_without_so = 0
    for scan in scans:
        comment = (scan.get('batch_comment') or '').upper()
        if 'SO' in comment:
            scans_with_so += 1
        else:
            scans_without_so += 1
    
    ws_summary.cell(row=row, column=1, value="Scans with 'SO' context:")
    ws_summary.cell(row=row, column=2, value=f"{scans_with_so} ({scans_with_so * PIECES_PER_BOX} pieces)")
    row += 1
    
    ws_summary.cell(row=row, column=1, value="Scans without 'SO' context:")
    ws_summary.cell(row=row, column=2, value=f"{scans_without_so} ({scans_without_so * PIECES_PER_BOX} pieces)")
    
    # Auto-adjust column widths for summary sheet
    ws_summary.column_dimensions['A'].width = 35
    ws_summary.column_dimensions['B'].width = 20
    ws_summary.column_dimensions['C'].width = 15
    
    # Save to temp file
    temp_path = tempfile.mktemp(suffix='.xlsx')
    wb.save(temp_path)
    print(f"[OK] Generated Excel report: {temp_path}")
    
    return temp_path


def send_email(excel_path: str, report_date: datetime, scan_count: int):
    """Send email with Excel attachment"""
    recipients = [r.strip() for r in REPORT_RECIPIENTS.split(',')]
    
    if not SMTP_PASSWORD:
        print("[WARN] SMTP_PASSWORD not set, skipping email send")
        return
    
    msg = MIMEMultipart()
    msg['From'] = SMTP_EMAIL
    msg['To'] = ', '.join(recipients)
    msg['Subject'] = f"Daily Build Report - {report_date.strftime('%B %d, %Y')}"
    
    # Email body
    body = f"""
Good morning,

Please find attached the Daily Build Report for {report_date.strftime('%B %d, %Y')}.

Summary:
- Total Scans: {scan_count}
- Total Pieces: {scan_count * PIECES_PER_BOX:,}

This report was automatically generated from the Polytechnic Resources Serial Number Scan Log system.

Best regards,
Polytechnic Resources Automation
    """
    msg.attach(MIMEText(body, 'plain'))
    
    # Attach Excel file
    filename = f"Build_Report_{report_date.strftime('%m-%d-%Y')}.xlsx"
    with open(excel_path, 'rb') as f:
        part = MIMEBase('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
        msg.attach(part)
    
    # Send
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, recipients, msg.as_string())
        print(f"[OK] Email sent to: {', '.join(recipients)}")
    except Exception as e:
        print(f"[ERROR] Email failed: {e}")
        raise


def backup_to_google_sheets(scans: list, report_date: datetime):
    """
    Backup daily scans to a Google Sheet.
    Appends rows to the first worksheet with: Date, Timestamp, Serial, Part, Operator, Station, Comment
    """
    if not GSHEET_ENABLED:
        print("[WARN] Google Sheets backup not configured - skipping")
        return
    
    import base64
    import json
    
    try:
        # Decode service account credentials from base64
        creds_json = base64.b64decode(GSHEET_CREDENTIALS_JSON).decode('utf-8')
        creds_dict = json.loads(creds_json)
        
        # Authenticate with Google Sheets
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
        credentials = Credentials.from_service_account_info(creds_dict, scopes=scopes)
        gc = gspread.authorize(credentials)
        
        # Open spreadsheet
        spreadsheet = gc.open_by_key(GSHEET_SPREADSHEET_ID)
        worksheet = spreadsheet.sheet1  # First worksheet
        
        # Format rows for append
        date_str = report_date.strftime('%Y-%m-%d')
        rows_to_append = []
        
        for scan in scans:
            # Convert UTC timestamp to EST for display
            ts = scan.get('created_at', '')
            if ts:
                try:
                    dt = datetime.fromisoformat(ts.replace('+00:00', '').replace('Z', ''))
                    ts_display = (dt - timedelta(hours=5)).strftime('%Y-%m-%d %H:%M:%S')
                except:
                    ts_display = ts
            else:
                ts_display = ''
            
            rows_to_append.append([
                date_str,
                ts_display,
                scan.get('serial_number', ''),
                scan.get('part_id', ''),
                scan.get('operator_name', ''),
                scan.get('station_id', ''),
                scan.get('batch_comment', '')
            ])
        
        # Append all rows at once
        if rows_to_append:
            worksheet.append_rows(rows_to_append, value_input_option='USER_ENTERED')
            print(f"[OK] Google Sheets backup: {len(rows_to_append)} rows appended")
        else:
            print("[WARN] No rows to backup to Google Sheets")
            
    except Exception as e:
        print(f"[ERROR] Google Sheets backup failed: {e}")
        # Don't raise - backup failure shouldn't stop the main report

def main():
    """Main entry point"""
    # Determine target date
    if len(sys.argv) > 1:
        if sys.argv[1] == '--test':
            test_mode = True
            target_date = datetime.now() - timedelta(days=1)
        else:
            test_mode = False
            target_date = datetime.strptime(sys.argv[1], '%Y-%m-%d')
    else:
        test_mode = False
        target_date = datetime.now() - timedelta(days=1)
    
    print(f"[INFO] Generating Build Report for {target_date.strftime('%Y-%m-%d')}")
    print(f"   Test mode: {test_mode}")
    
    # Fetch data
    supabase = get_supabase_client()
    scans = fetch_scans_for_date(supabase, target_date)
    
    print(f"[INFO] Found {len(scans)} scans")
    
    if len(scans) == 0:
        print("[WARN] No scans found for this date. Skipping report.")
        return
    
    # Group data
    grouped = group_scans(scans)
    
    # Generate Excel (pass scans for summary sheet)
    excel_path = generate_excel_report(grouped, scans, target_date)
    
    # Send email (unless test mode)
    if not test_mode:
        send_email(excel_path, target_date, len(scans))
    else:
        print(f"[TEST] Test mode - Excel saved to: {excel_path}")
        print(f"   Would send to: {REPORT_RECIPIENTS}")
    
    # Backup to Google Sheets (always, including test mode)
    backup_to_google_sheets(scans, target_date)
    
    # Cleanup (unless test mode)
    if not test_mode:
        os.remove(excel_path)
    
    print("[OK] Report complete!")


if __name__ == '__main__':
    main()
