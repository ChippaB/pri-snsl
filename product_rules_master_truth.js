// ===== PRODUCT-SPECIFIC SERIAL EXTRACTION RULES =====
// Generated from MASTER TRUTH (serial_numbers.db - 31,188 records)
// Maps product codes to specific serial number extraction patterns
// Updated: 2025-01-08 (v8.7.1 - Fixed broken regex patterns)

const PRODUCT_SERIAL_RULES = {
    '100756E2': {
        pattern: /^(756E\d{6}).*$/,
        extractGroup: 1,
        description: 'Extract full 756E + 6 digits (5 records), ignore trailing check digits/padding'
    },
    '100756EL': {
        pattern: /^(756EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 756EL + 5 digits (3 records), ignore trailing check digits/padding'
    },
    '100756EW': {
        pattern: /^(756EW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 756EW + 5 digits (739 records), ignore trailing check digits/padding'
    },
    '100756NKNW': {
        pattern: /^(756NKNW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 756NKNW + 5 digits (2 records), ignore trailing check digits/padding'
    },
    '100756NW': {
        pattern: /^(756NW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 756NW + 5 digits (659 records), ignore trailing check digits/padding'
    },
    '100757E2': {
        pattern: /^(757E\d{6}).*$/,
        extractGroup: 1,
        description: 'Extract full 757E + 6 digits (27 records), ignore trailing check digits/padding'
    },
    '100757EL': {
        pattern: /^(757EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 757EL + 5 digits (30 records), ignore trailing check digits/padding'
    },
    '100757EN': {
        pattern: /^(757EN\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 757EN + 5 digits (11 records), ignore trailing check digits/padding'
    },
    '100757EW': {
        pattern: /^(757EW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 757EW + 5 digits (79 records), ignore trailing check digits/padding'
    },
    '100757NKNW': {
        pattern: /^(757NKNW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 757NKNW + 5 digits (1 record), ignore trailing check digits/padding'
    },
    '100757NW': {
        pattern: /^(757NW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 757NW + 5 digits (8 records), ignore trailing check digits/padding'
    },
    '100758E2': {
        pattern: /^(758E\d{6}).*$/,
        extractGroup: 1,
        description: 'Extract full 758E + 6 digits (24 records), ignore trailing check digits/padding'
    },
    '100758EL': {
        pattern: /^(758EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 758EL + 5 digits (13 records), ignore trailing check digits/padding'
    },
    '100758EW': {
        pattern: /^(758EW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 758EW + 5 digits (10 records), ignore trailing check digits/padding'
    },
    '100758NKNW': {
        pattern: /^(758NKNW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 758NKNW + 5 digits (1 record), ignore trailing check digits/padding'
    },
    '100758NW': {
        pattern: /^(758NW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 758NW + 5 digits (9 records), ignore trailing check digits/padding'
    },
    '100759E2': {
        pattern: /^(759E\d{7}).*$/,
        extractGroup: 1,
        description: 'Extract full 759E + 7 digits (37 records), ignore trailing check digits/padding'
    },
    '100759EL': {
        pattern: /^(759EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 759EL + 5 digits (6 records), ignore trailing check digits/padding'
    },
    '100759ELRN': {
        pattern: /^(100759ELRN\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 100759ELRN + 5 digits (1 record), ignore trailing check digits/padding'
    },
    '100759EW': {
        pattern: /^(759EW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 759EW + 5 digits (10 records), ignore trailing check digits/padding'
    },
    '100759NW': {
        pattern: /^(759NW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 759NW + 5 digits (2 records), ignore trailing check digits/padding'
    },
    '100759WC': {
        pattern: /^(759WC\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 759WC + 5 digits (1 record), ignore trailing check digits/padding'
    },
    '100759WN': {
        pattern: /^(759WN\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 759WN + 5 digits (1 record), ignore trailing check digits/padding'
    },
    '100760E': {
        pattern: /^(760E\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 760E + 5 digits, ignore trailing check digits/padding (end-cap fix 2026-01-20)'
    },
    '100760EL': {
        pattern: /^(760EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 760EL + 5 digits (15 records), ignore trailing check digits/padding'
    },
    '100760ELN': {
        pattern: /^(760ELN\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 760ELN + 5 digits (11 records), ignore trailing check digits/padding'
    },
    '100760KN': {
        pattern: /^(760KN\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 760KN + 5 digits (6 records), ignore trailing check digits/padding'
    },
    '100760WN': {
        pattern: /^(760WN\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 760WN + 5 digits (1 record), ignore trailing check digits/padding'
    },
    '100780EW': {
        pattern: /^(780EW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 780EW + 5 digits (12 records), ignore trailing check digits/padding'
    },
    '100780NKNW': {
        pattern: /^(780NKNW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 780NKNW + 5 digits (1 record), ignore trailing check digits/padding'
    },
    '100780W': {
        pattern: /^(780W\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 780W + 5 digits (3 records), ignore trailing check digits/padding'
    },
    '100790EL': {
        pattern: /^(790EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 790EL + 5 digits (20 records), ignore trailing check digits/padding'
    },
    '100790EW': {
        pattern: /^(790EW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 790EW + 5 digits (20 records), ignore trailing check digits/padding'
    },
    '536719-001S': {
        pattern: /^(MGCK1S\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full MGCK1S + 5 digits (7 records), ignore trailing check digits/padding'
    },
    '536723-001S': {
        pattern: /^(MGCK2S\d{7}).*$/,
        extractGroup: 1,
        description: 'Extract full MGCK2S + 7 digits (1,805 records), ignore trailing check digits/padding'
    },
    '536723-004S': {
        pattern: /^(MGCK4S\d{6}).*$/,
        extractGroup: 1,
        description: 'Extract full MGCK4S + 6 digits (7 records), ignore trailing check digits/padding'
    },
    '6W': {
        pattern: /^(PFR6W\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full PFR6W + 5 digits (9 records), ignore trailing check digits/padding'
    },
    '6WE2': {
        pattern: /^(PFR6WE\d{6}).*$/,
        extractGroup: 1,
        description: 'Extract full PFR6WE + 6 digits (1 record), ignore trailing check digits/padding'
    },
    '6WKN': {
        pattern: /^(PFR6WKN\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full PFR6WKN + 5 digits (1 record), ignore trailing check digits/padding'
    },
    'EBS756EW': {
        pattern: /^(EBS756EW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full EBS756EW + 5 digits (11 records), ignore trailing check digits/padding'
    },
    'EBS756NW': {
        pattern: /^(EBS756NW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full EBS756NW + 5 digits (38 records), ignore trailing check digits/padding'
    },
    'EBS757EW': {
        pattern: /^(EBS757EW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full EBS757EW + 5 digits (138 records), ignore trailing check digits/padding'
    },
    'EBS757NKNW': {
        pattern: /^(EBS757NKNW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full EBS757NKNW + 5 digits (1 record), ignore trailing check digits/padding'
    },
    'EBS757NW': {
        pattern: /^(EBS757NW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full EBS757NW + 5 digits (56 records), ignore trailing check digits/padding'
    },
    'EBS758NNK': {
        pattern: /^(EBS758NNK\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full EBS758NNK + 5 digits (1 record), ignore trailing check digits/padding'
    },
    'EBS758NW': {
        pattern: /^(EBS758NW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full EBS758NW + 5 digits (1 record), ignore trailing check digits/padding'
    },
    'EBS759EL': {
        pattern: /^(EBS759EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full EBS759EL + 5 digits (56 records), ignore trailing check digits/padding'
    },
    'EBS759WC': {
        pattern: /^(EBS759WC\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full EBS759WC + 5 digits (1 record), ignore trailing check digits/padding'
    },
    'EBS780NW': {
        pattern: /^(EBS780NW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full EBS780NW + 5 digits (65 records), ignore trailing check digits/padding'
    },
    'FIL5050EL': {
        pattern: /^(FIL5050EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full FIL5050EL + 5 digits (1 record), ignore trailing check digits/padding'
    },
    'FIL7958': {
        pattern: /^(FIL\d{9}).*$/,
        extractGroup: 1,
        description: 'Extract full FIL + 9 digits (793 records), ignore trailing check digits/padding'
    },
    'FIL9000': {
        pattern: /^(FIL\d{9}).*$/,
        extractGroup: 1,
        description: 'Extract full FIL + 9 digits (868 records), ignore trailing check digits/padding'
    },
    'P5551100E': {
        pattern: /^(1100E\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 1100E + 5 digits (1 record), ignore trailing check digits/padding'
    },
    'P5553100E': {
        pattern: /^(3100E\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 3100E + 5 digits (1 record), ignore trailing check digits/padding'
    },
    'P5554100E': {
        pattern: /^(4100E\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 4100E + 5 digits (58 records), ignore trailing check digits/padding'
    },
    'P5556100E': {
        pattern: /^(6100E\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 6100E + 5 digits (36 records), ignore trailing check digits/padding'
    },
    'P5557100E': {
        pattern: /^(7100E\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 7100E + 5 digits (138 records), ignore trailing check digits/padding'
    },
    'P5559100E': {
        pattern: /^(9100E\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full 9100E + 5 digits (72 records), ignore trailing check digits/padding'
    },
    'PUL9000K': {
        pattern: /^(PUL9000K\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full PUL9000K + 5 digits (4,540 records), ignore trailing check digits/padding'
    },
    'R756E2': {
        pattern: /^(R756E\d{6}).*$/,
        extractGroup: 1,
        description: 'Extract full R756E + 6 digits (2 records), ignore trailing check digits/padding'
    },
    'R756EL': {
        pattern: /^(R756EL\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full R756EL + 5 digits (166 records), ignore trailing check digits/padding'
    },
    'R756ELMN': {
        pattern: /^(R756ELMN\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full R756ELMN + 5 digits (19 records), ignore trailing check digits/padding'
    },
    'R756EW': {
        pattern: /^(R756EW\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full R756EW + 5 digits (226 records), ignore trailing check digits/padding'
    },
    'R756W': {
        pattern: /^(R756W\d{5}).*$/,
        extractGroup: 1,
        description: 'Extract full R756W + 5 digits (181 records), ignore trailing check digits/padding'
    },
    'TNN101': {
        pattern: /^(TNN\d{9}).*$/,
        extractGroup: 1,
        description: 'Extract full TNN + 9 digits (8 records), ignore trailing check digits/padding'
    },
    'TNN102': {
        pattern: /^(TNN\d{8}).*$/,
        extractGroup: 1,
        description: 'Extract full TNN + 8 digits (28 records), ignore trailing check digits/padding'
    },
    'TNN103': {
        pattern: /^(TNN\d{8}).*$/,
        extractGroup: 1,
        description: 'Extract full TNN + 8 digits (1 record), ignore trailing check digits/padding'
    }
};

// ===== SUMMARY =====
// Total rules generated: 44 / 62 part IDs from MASTER TRUTH
// All rules based on MASTER TRUTH from serial_numbers.db (31,188 records)
//
// Note: PUL9000K has been verified as 5 digits (4,540 records)
