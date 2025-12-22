// Copied from original app.js
// ===== SeeScan Supa1.0.1 - Supabase Migration =====
// Supa1.0.1: Replaced Flask/Google Sheets backend with Supabase.
//         Ported Python parsing logic (MGC, R756, etc.) to client-side JavaScript (`app.js`).
// v8.5.4: HIBC check digit stripped ONLY if 6+ trailing digits (5 digit min safety net for misconfigured barcodes)
// v8.5.3: (superseded by v8.5.4)
// v8.5.2: (superseded by v8.5.3)
// v8.5.1: Scan field now locked until Part Number Map loads - prevents UNKNOWN entries from premature scanning
// v8.5.0: Operators and Stations now managed via Google Sheet CONFIG tab - clients can add/remove without code updates
// v8.4.3: Fixed edge case where serials without end caps had last digit incorrectly stripped - now uses trailing digit count (6+ = check digit, ≤5 = keep all)
// v8.4.0: Migrated Part Number Map to Google Sheet PART_MAP tab with enhanced logging
// v8.3.8: Multi-Tablet Fix

// ===== SUPABASE CONFIGURATION =====
// Instructions: Replace these values with your actual Supabase URL and Anon Key.
// ===== SUPABASE CONFIGURATION =====
// Instructions: Replace these values with your actual Supabase URL and Anon Key.
// NOTE: We use the global 'supabase' object provided by the script tag in index.html
const SUPABASE_URL = 'https://ospedluufxgpfvqtznej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zcGVkbHV1ZnhncGZ2cXR6bmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODgyMTUsImV4cCI6MjA4MTU2NDIxNX0.1AhtuANYs-eVrQIdW9gqt_KLhBxF4Vm0j6pqtrrJAag'; // <--- PASTE YOUR KEY HERE

// Initialize Client (Global variable from CDN)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Endpoint usage is replaced by Client usage in send()
// But we keep the constant if needed or refactor send() below.
const ENDPOINT = `${SUPABASE_URL}/rest/v1/scans`;

// Legacy fallbacks (kept for reference or reverting)
const SHARED_SECRET = 'qk92X3vE7LrT8c59H1zUM4Bn0ySDFwGp';

// Stores
let PART_NUMBER_MAP = {};
let OPERATORS_LIST = [];
let STATIONS_LIST = [];

// ===== OFFLINE QUEUE (IndexedDB) =====
// Stores scans locally when offline, syncs when connectivity returns
const QUEUE_DB_NAME = 'sosv2-offline';
const QUEUE_DB_VERSION = 1;
const QUEUE_STORE_NAME = 'pendingScans';
let queueDb = null;

/**
 * Initialize IndexedDB for offline queue
 */
async function initOfflineQueue() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(QUEUE_DB_NAME, QUEUE_DB_VERSION);

        request.onerror = () => {
            console.error('❌ IndexedDB failed to open:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            queueDb = request.result;
            console.log('📦 Offline queue initialized');
            resolve(queueDb);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
                const store = db.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'idempotencyKey' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('status', 'status', { unique: false });
                console.log('📦 Created offline queue store');
            }
        };
    });
}

/**
 * Add a scan to the offline queue
 */
async function queueScan(payload, idempotencyKey) {
    if (!queueDb) await initOfflineQueue();

    return new Promise((resolve, reject) => {
        const tx = queueDb.transaction(QUEUE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(QUEUE_STORE_NAME);

        const record = {
            idempotencyKey,
            payload,
            timestamp: Date.now(),
            status: 'pending',
            retries: 0
        };

        const request = store.put(record);
        request.onsuccess = () => resolve(record);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Remove a scan from the queue (after successful sync)
 */
async function dequeueScan(idempotencyKey) {
    if (!queueDb) return;

    return new Promise((resolve, reject) => {
        const tx = queueDb.transaction(QUEUE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(QUEUE_STORE_NAME);
        const request = store.delete(idempotencyKey);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all pending scans from queue
 */
async function getPendingScans() {
    if (!queueDb) await initOfflineQueue();

    return new Promise((resolve, reject) => {
        const tx = queueDb.transaction(QUEUE_STORE_NAME, 'readonly');
        const store = tx.objectStore(QUEUE_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get count of pending scans
 */
async function getPendingCount() {
    if (!queueDb) return 0;

    return new Promise((resolve) => {
        const tx = queueDb.transaction(QUEUE_STORE_NAME, 'readonly');
        const store = tx.objectStore(QUEUE_STORE_NAME);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
    });
}

/**
 * Flush queue - attempt to sync all pending scans to Supabase
 */
let isFlushingQueue = false;
async function flushQueue() {
    if (isFlushingQueue) return;
    if (!navigator.onLine) return;

    isFlushingQueue = true;
    console.log('🔄 Flushing offline queue...');

    try {
        const pending = await getPendingScans();
        if (pending.length === 0) {
            console.log('✅ Queue empty, nothing to flush');
            isFlushingQueue = false;
            updateQueueUI();
            return;
        }

        console.log(`📤 Syncing ${pending.length} queued scan(s)...`);

        for (const record of pending) {
            try {
                const result = await syncScanToSupabase(record.payload, record.idempotencyKey);
                if (result === 'OK' || result === 'DUPLICATE') {
                    await dequeueScan(record.idempotencyKey);
                    updateLastSyncTime(); // Track successful sync
                    console.log(`✅ Synced: ${record.payload.serial_number}`);
                } else {
                    console.warn(`⚠️ Failed to sync: ${record.payload.serial_number}`);
                }
            } catch (e) {
                console.error('Sync error:', e);
            }
        }

        updateQueueUI();
    } finally {
        isFlushingQueue = false;
    }
}

/**
 * Direct sync to Supabase (used by queue flush)
 */
async function syncScanToSupabase(payload, idempotencyKey) {
    const supabasePayload = {
        operator_name: payload.operator,
        station_id: payload.station,
        raw_scan: payload.raw_scan,
        part_id: payload.part_number,
        serial_number: payload.serial_number,
        batch_comment: payload.batch_comment,
        idempotency_key: idempotencyKey
    };

    try {
        const { error, status } = await supabaseClient
            .from('scans')
            .insert([supabasePayload]);

        if (error) {
            // Duplicate (already synced) - treat as success
            if (error.code === '23505' || status === 409) return 'DUPLICATE';
            return 'ERROR';
        }
        return 'OK';
    } catch (e) {
        return 'ERROR';
    }
}

// Track last successful sync time
let lastSyncTime = localStorage.getItem('lastSyncTime') ? new Date(localStorage.getItem('lastSyncTime')) : null;

/**
 * Update sync time after successful sync
 */
function updateLastSyncTime() {
    lastSyncTime = new Date();
    localStorage.setItem('lastSyncTime', lastSyncTime.toISOString());
    updateSyncStatusUI();
}

/**
 * Format time as relative or absolute
 */
function formatSyncTime(date) {
    if (!date) return '—';
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Update UI to show pending queue count and sync status
 */
async function updateSyncStatusUI() {
    const count = await getPendingCount();
    const pendingDisplay = document.getElementById('pendingCountDisplay');
    const lastSyncedEl = document.getElementById('lastSyncedTime');
    const queueWarning = document.getElementById('queueWarning');
    const syncCard = document.getElementById('syncStatusCard');

    // Update pending count display
    if (pendingDisplay) {
        pendingDisplay.textContent = count;
        if (count > 0) {
            pendingDisplay.style.color = '#f59e0b'; // Orange/warning
        } else {
            pendingDisplay.style.color = '#10b981'; // Green/success
        }
    }

    // Update last synced time
    if (lastSyncedEl) {
        lastSyncedEl.textContent = formatSyncTime(lastSyncTime);
    }

    // Show/hide warning
    if (queueWarning) {
        queueWarning.style.display = count > 0 ? 'block' : 'none';
    }

    // Highlight card if pending
    if (syncCard) {
        if (count > 0) {
            syncCard.style.background = 'linear-gradient(135deg, #fef3c7, #fde68a)';
            syncCard.style.border = '2px solid #f59e0b';
        } else {
            syncCard.style.background = 'linear-gradient(135deg, #f0f9ff, #e0f2fe)';
            syncCard.style.border = '1px solid var(--border)';
        }
    }
}

/**
 * Legacy updateQueueUI - now calls updateSyncStatusUI
 */
async function updateQueueUI() {
    await updateSyncStatusUI();

    // Also update the old queueInfo element if it exists (backwards compat)
    const count = await getPendingCount();
    const queueInfo = document.getElementById('queueInfo');
    if (queueInfo) {
        queueInfo.innerHTML = ''; // Hidden, we use new sync card now
    }
}

// ===== BATTERY MONITORING =====
async function initBattery() {
    const batEl = document.getElementById('batteryStatus');
    if (!batEl) return;

    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();

            const updateBat = () => {
                const level = Math.round(battery.level * 100);
                const charging = battery.charging ? '⚡' : '🔋';
                batEl.textContent = `${charging} ${level}%`;

                // Color coding
                if (level <= 20) batEl.style.backgroundColor = '#ef4444'; // Red
                else if (level <= 50) batEl.style.backgroundColor = '#f59e0b'; // Orange
                else batEl.style.backgroundColor = '#6b7280'; // Gray
            };

            updateBat();
            battery.addEventListener('levelchange', updateBat);
            battery.addEventListener('chargingchange', updateBat);
        } catch (e) {
            console.warn('Battery API error:', e);
            batEl.textContent = '🔋 --%';
        }
    } else {
        batEl.textContent = '🔋 --%'; // Not supported
    }
}

// ===== LIVE CLOCK =====
function initClock() {
    const clockEl = document.getElementById('clockStatus');
    if (!clockEl) return;

    function update() {
        const now = new Date();
        // 12-hour format with AM/PM
        const timeString = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        clockEl.textContent = timeString;
    }

    update(); // Initial call
    setInterval(update, 1000); // Update every second
}

/**
 * Fetches Config (Operators, Stations, Part Map) from Supabase.
 */
async function fetchConfig() {
    console.log('🔄 Fetching config from Supabase...');

    try {
        // 1. Fetch Operators
        const { data: opsData, error: opsError } = await supabaseClient
            .from('operators')
            .select('name')
            .eq('active', true)
            .order('name');

        if (opsData && !opsError) {
            OPERATORS_LIST = opsData.map(o => o.name);
            console.log(`✅ Loaded ${OPERATORS_LIST.length} Operators`);
        }

        // 2. Fetch Stations
        const { data: stData, error: stError } = await supabaseClient
            .from('stations')
            .select('name')
            .eq('active', true)
            .order('name');

        if (stData && !stError) {
            STATIONS_LIST = stData.map(s => s.name);
            console.log(`✅ Loaded ${STATIONS_LIST.length} Stations`);
        }

        // 3. Fetch Part Map
        const { data: pmData, error: pmError } = await supabaseClient
            .from('part_map')
            .select('barcode_prefix, part_number')
            .eq('active', true);

        if (pmData && !pmError) {
            PART_NUMBER_MAP = {};
            pmData.forEach(row => {
                PART_NUMBER_MAP[row.barcode_prefix] = row.part_number;
            });
            console.log(`✅ Loaded ${Object.keys(PART_NUMBER_MAP).length} Part Mappings`);
        } else {
            console.warn('⚠️ Failed to load part_map (using defaults if any):', pmError);
        }

        return true;
    } catch (e) {
        console.error('Config fetch error:', e);
        return false;
    }
}

// Alias for compatibility with initApp
const fetchPartNumberMap = fetchConfig;

function populateOperators() {
    const operatorSelect = $('#operator');
    if (!operatorSelect) return;
    const savedOperator = localStorage.getItem('operator');
    operatorSelect.innerHTML = '<option value="" disabled selected>Select Operator</option>';

    OPERATORS_LIST.forEach(op => {
        const option = document.createElement('option');
        option.value = op;
        option.textContent = op;
        operatorSelect.appendChild(option);
    });

    // Restore saved operator if it exists in the list
    if (savedOperator && OPERATORS_LIST.includes(savedOperator)) {
        operatorSelect.value = savedOperator;
    }
}

function populateStations() {
    const stationSelect = $('#station');
    if (!stationSelect) return;
    const savedStation = localStorage.getItem('station');
    stationSelect.innerHTML = '';

    STATIONS_LIST.forEach(station => {
        const option = document.createElement('option');
        option.value = station;
        option.textContent = station;
        stationSelect.appendChild(option);
    });

    // Restore saved station if it exists in the list
    if (savedStation && STATIONS_LIST.includes(savedStation)) {
        stationSelect.value = savedStation;
    } else {
        stationSelect.value = 'MAIN';
    }
}

// ===== DATE/TIME FORMATTING HELPERS =====
function formatDateMMDDYY(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${month}/${day}/${year}`;
}

function formatTimestamp(date) {
    const d = new Date(date);
    const dateStr = formatDateMMDDYY(d);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${dateStr} ${timeStr}`;
}

function getRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec} secs ago`;
    if (diffMin === 1) return '1 min ago';
    if (diffMin < 60) return `${diffMin} mins ago`;
    if (diffHr === 1) return '1 hour ago';
    if (diffHr < 24) return `${diffHr} hours ago`;
    return formatDateMMDDYY(then);
}

// ===== HELPERS =====
let audioUnlocked = false;
function unlockAudioOnFirstTap() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    initAudio();
    document.body.removeEventListener('touchstart', unlockAudioOnFirstTap);
}

// ===== DOM Elements =====
const $ = s => document.querySelector(s);
const statusBox = $('#status'), lastSerial = $('#lastSerial'), lastPart = $('#lastPart');
const scanInput = $('#scan'), operatorInput = $('#operator'), stationSel = $('#station');
const clearBtn = $('#clearBtn');
const historyToggle = $('#historyToggle'), historyPanel = $('#historyPanel');
const lastScanStatus = $('#lastScanStatus');
const lastScanTime = $('#lastScanTime');
const lastScanRelative = $('#lastScanRelative');
const lockBtn = $('#lockBtn'), unlockBtn = $('#unlockBtn')
const correctionModal = $('#correctionModal');
const modalContext = $('#modalContext');
const correctionText = $('#correctionText');
const btnCancelCorrection = $('#cancelCorrection');
const btnSaveCorrection = $('#saveCorrection');
// Batch Comment Elements
const generalNote = $('#generalNote');
const lockBatchBtn = $('#lockBatchBtn');
const clearNoteBtn = $('#clearNoteBtn');
let currentEditItem = null;

// Audio
let audioContext;
function initAudio() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
}

function playBeep(freq, type = 'sine') {
    try {
        initAudio();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain); gain.connect(audioContext.destination);
        osc.frequency.value = freq; osc.type = type;
        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        osc.start(); osc.stop(audioContext.currentTime + 0.1);
    } catch (e) { }
}

function playSoundSuccess() {
    playBeep(880, 'sine');
    document.body.style.transition = 'background-color 0.3s';
    document.body.style.backgroundColor = '#10b981';
    setTimeout(() => { document.body.style.backgroundColor = ''; }, 300);
}

function playSoundDuplicate() {
    playBeep(440, 'sine');
    document.body.style.transition = 'background-color 0.3s';
    document.body.style.backgroundColor = '#f59e0b';
    setTimeout(() => { document.body.style.backgroundColor = ''; }, 300);
}

function playSoundError() {
    playBeep(220, 'sawtooth');
    document.body.style.transition = 'background-color 0.3s';
    document.body.style.backgroundColor = '#ef4444';
    setTimeout(() => { document.body.style.backgroundColor = ''; }, 300);
}

function show(msg, cls) {
    statusBox.textContent = msg;
    statusBox.className = 'status show ' + cls;
    setTimeout(() => statusBox.classList.remove('show'), 2500);
}

function savePrefs() {
    localStorage.setItem('operator', operatorInput.value.trim());
    localStorage.setItem('station', stationSel.value);
}

function loadPrefs() {
    // Load preferences after dropdowns are populated
    const savedOperator = localStorage.getItem('operator');
    const savedStation = localStorage.getItem('station');

    if (savedOperator) {
        operatorInput.value = savedOperator;
    }
    if (savedStation) {
        stationSel.value = savedStation;
    } else {
        stationSel.value = 'MAIN';
    }
}

// Save and restore lock states
function saveLockStates() {
    localStorage.setItem('operatorLocked', operatorInput.disabled ? 'true' : 'false');
    localStorage.setItem('batchLocked', generalNote.disabled ? 'true' : 'false');
    localStorage.setItem('batchComment', generalNote.value);
}

function restoreLockStates() {
    const operatorLocked = localStorage.getItem('operatorLocked') === 'true';
    const batchLocked = localStorage.getItem('batchLocked') === 'true';
    const savedBatchComment = localStorage.getItem('batchComment') || '';

    // Restore batch comment text
    if (generalNote) {
        generalNote.value = savedBatchComment;
    }

    // Restore operator/station lock state
    if (operatorLocked) {
        operatorInput.disabled = true;
        stationSel.disabled = true;
        lockBtn.style.display = 'none';
        unlockBtn.style.display = 'inline-flex';
    }

    // Restore batch comment lock state
    if (batchLocked && generalNote) {
        generalNote.disabled = true;
        lockBatchBtn.innerHTML = '🔓 Unlock Comment';
        lockBatchBtn.style.background = '#f59e0b';
        clearNoteBtn.disabled = true;
        clearNoteBtn.style.opacity = '0.5';
    }
}

// =======================================================
// PORTED PARSING LOGIC (from scripts/scan_api.py)
// =======================================================

/**
 * Clean serial number using Python-equivalent regex logic.
 * Handles delimiters like $ and + and preserves 5+ digit endings.
 */
function cleanSerialNumber(rawSerial) {
    if (!rawSerial) return "";
    let cleaned = String(rawSerial).trim();

    if (cleaned.startsWith("'")) cleaned = cleaned.substring(1);

    // Remove content after '$' or '+' (they are delimiters)
    if (cleaned.includes('$')) cleaned = cleaned.split('$')[0];
    if (cleaned.includes('+')) cleaned = cleaned.split('+')[0];

    // Regex: Capture prefix up until the last block of digits that has at least 5 digits.
    // This preserves serials like MGC1S17754 but strips trailing non-digit junk.
    const match = cleaned.match(/^(.*?)(\d{5,})[^0-9]*$/);

    if (match) {
        // Reconstruct: prefix + trailing 5+ digits
        // match[1] is prefix, match[2] is digits
        return (match[1] + match[2]).trim();
    } else {
        // Fallback: strip trailing non-digits
        return cleaned.replace(/[^0-9]+$/, '').trim();
    }
}

/**
 * Auto-detect part number from serial prefix.
 * Ported from extract_part_from_serial in python.
 */
function extractPartFromSerial(serial) {
    if (!serial) return null;
    const s = serial.toUpperCase();

    // MGC patterns (Medgraphics)
    if (s.startsWith('MGC1S')) return '536713-001S';
    if (s.startsWith('MGC2S')) return '536713-002S';
    if (s.startsWith('MGC1C')) return '536713-001C';
    if (s.startsWith('MGC2C')) return '536713-002C';
    if (s.startsWith('MGCK1S')) return '536719-001S';
    if (s.startsWith('MGCK')) return '536719-001';
    if (s.startsWith('MGC')) return 'MGC';

    // Respitech R756 patterns
    if (s.startsWith('R756EL')) return 'R756EL';
    if (s.startsWith('R756EW')) return 'R756EW';
    if (s.startsWith('R756E2')) return 'R756E2';
    if (s.startsWith('R756W')) return 'R756W';
    if (s.startsWith('R756')) return 'R756';

    // Standard 756 patterns
    if (s.startsWith('756EL')) return '100756EL';
    if (s.startsWith('756EW')) return '100756EW';
    if (s.startsWith('756E2')) return '100756E2';
    if (s.startsWith('756NW')) return '100756NW';
    if (s.startsWith('756NKNW')) return '100756NKNW';
    if (s.startsWith('756')) return '100756';

    // PFT Diagnostics patterns
    if (s.startsWith('1100E')) return 'P5551100E';
    if (s.startsWith('1100')) return 'P5551100';
    if (s.startsWith('3100E')) return 'P5553100E';
    if (s.startsWith('3100')) return 'P5553100';
    if (s.startsWith('4100E')) return 'P5554100E';
    if (s.startsWith('4100')) return 'P5554100';
    if (s.startsWith('6100E')) return 'P5556100E';
    if (s.startsWith('6100')) return 'P5556100';
    if (s.startsWith('7100E')) return 'P5557100E';
    if (s.startsWith('7100')) return 'P5557100';
    if (s.startsWith('9100E')) return 'P5559100E';
    if (s.startsWith('9100')) return 'P5559100';

    // PulmOne patterns
    if (s.startsWith('PUL9000N')) return 'PUL9000N';
    if (s.startsWith('PUL9000E2')) return 'PUL9000E2';
    if (s.startsWith('PUL9000K')) return 'PUL9000K';
    if (s.startsWith('LPUL9000K')) return 'LPUL9000K';
    if (s.startsWith('PUL')) return 'PUL9000';

    // EBS patterns
    if (s.startsWith('EBS756')) return 'EBS756';
    if (s.startsWith('EBS757')) return 'EBS757';
    if (s.startsWith('EBS758')) return 'EBS758';
    if (s.startsWith('EBS759')) return 'EBS759';
    if (s.startsWith('EBS780')) return 'EBS780';
    if (s.startsWith('EBS')) return 'EBS';

    // Morgan FIL patterns
    if (s.startsWith('FIL7958')) return 'FIL7958';
    if (s.startsWith('FIL9000')) return 'FIL9000';
    if (s.startsWith('FIL5050EL')) return 'FIL5050EL';
    if (s.startsWith('FIL')) return 'FIL';

    return null;
}

function parsePN_SN(s) {
    const raw = String(s).toUpperCase().trim();

    // GS1-128 FORMAT (Starts with 01)
    if (raw.startsWith('01')) {
        const prefix = raw.substring(0, 16);
        let part = PART_NUMBER_MAP[prefix];
        let remainder = raw.substring(16);
        let serial = '';

        if (remainder.startsWith('11') || remainder.startsWith('17') || remainder.startsWith('13')) {
            remainder = remainder.substring(8);
        }
        if (remainder.startsWith('21')) {
            serial = remainder.substring(2);
        } else {
            serial = remainder;
        }

        if (!part && serial) {
            // Try to find part inside the serial using PFR logic
            const pfrMatch = serial.match(/^(PFR[A-Z0-9]{3,10})/i);
            if (pfrMatch) {
                const identifiedPartId = pfrMatch[1].toUpperCase();
                part = identifiedPartId;
                serial = serial.substring(identifiedPartId.length);
                if (!serial) {
                    serial = identifiedPartId;
                } else {
                    serial = serial.replace(/^[^A-Z0-9]+/, '');
                }
                return { part, serial };
            }
        }
        return sectionResult(part, serial);
    }

    // HIBC FORMAT (Contains /$+)
    if (raw.includes('/$+')) {
        const parts = raw.split('/$+');
        if (parts.length < 2) return { part: '', serial: '' };
        let p = parts[0], sNum = parts[1];

        if (p.startsWith('+B')) {
            p = p.substring(1);
            if (p.startsWith('B')) p = p.substring(1);
            if (sNum.startsWith('+')) sNum = sNum.substring(1);
        } else {
            if (sNum.startsWith('+')) sNum = sNum.substring(1);
        }

        // HIBC Check Digit Stripping (v8.5.4):
        // HIBC standard: Serial format is PART_PREFIX + 5-DIGIT-SERIAL + CHECK_DIGIT
        // Examples:
        //   760E2 + 10718 + 5 = 760E2107185 → strip last → 760E210718
        //   757EN + 11203 + 6 = 757EN112036 → strip last → 757EN11203
        //   TNN102 + 12238 + F = TNN10212238F → strip last → TNN10212238
        //
        // Rule: Strip the last character IF it would leave at least 5 trailing digits
        // Safety: If barcode is misconfigured (no check digit), don't over-strip
        if (sNum.length > 1) {
            // Find the last letter to determine trailing digits after stripping
            const lastLetterMatch = sNum.match(/[A-Z]/gi);
            if (lastLetterMatch) {
                const lastLetter = lastLetterMatch[lastLetterMatch.length - 1];
                const lastLetterPos = sNum.lastIndexOf(lastLetter);
                const currentTrailingDigits = sNum.substring(lastLetterPos + 1);

                // Only strip if we'd still have 5+ digits after the last letter
                if (currentTrailingDigits.length > 5) {
                    sNum = sNum.substring(0, sNum.length - 1);
                }
                // If exactly 5 or fewer digits, assume no check digit - keep as-is
            } else {
                // No letters found (all numeric serial) - always strip last char
                sNum = sNum.substring(0, sNum.length - 1);
            }
        }

        if (p.startsWith('446') && p.length > 4 && (p.includes('PUL') || p.endsWith('1') || p.endsWith('0'))) {
            p = p.substring(3, p.length - 1);
        }

        return sectionResult(p, sNum);
    }

    return { part: '', serial: '' };
}

function sectionResult(part, serial) {
    return part ? { part, serial } : { part: 'UNKNOWN', serial };
}

// History and Status helpers
function getLastScanKey() {
    const op = operatorInput.value.trim() || 'UNNAMED';
    const st = stationSel.value || 'MAIN';
    return `lastScan_${op}_${st}`;
}

function saveLastScan(part, serial, status) {
    const key = getLastScanKey();
    const scanData = { part, serial, status, timestamp: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(scanData));
    updateLastScanDisplay(scanData);
}

function updateLastScanDisplay(data) {
    if (!data) {
        lastPart.textContent = '—';
        lastSerial.textContent = '—';
        lastScanStatus.textContent = '';
        if (lastScanTime) lastScanTime.textContent = '';
        if (lastScanRelative) lastScanRelative.textContent = '';
        return;
    }

    lastPart.textContent = data.part || '—';
    lastSerial.textContent = data.serial || '—';
    lastScanStatus.textContent = data.status || '';

    if (data.status === 'OK') {
        lastScanStatus.style.cssText = 'background:#d1fae5; color:#065f46;';
    } else if (data.status === 'DUPLICATE') {
        lastScanStatus.style.cssText = 'background:#fef3c7; color:#92400e;';
    } else {
        lastScanStatus.style.cssText = 'background:#fee2e2; color:#991b1b;';
    }

    if (data.timestamp) {
        if (lastScanTime) lastScanTime.textContent = formatTimestamp(data.timestamp);
        if (lastScanRelative) lastScanRelative.textContent = getRelativeTime(data.timestamp);
    }
}

function loadLastScan() {
    const key = getLastScanKey();
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            const data = JSON.parse(stored);
            updateLastScanDisplay(data);
            return;
        } catch (e) { }
    }
    updateLastScanDisplay(null);
}

// Update relative time every 30 seconds
let relativeTimeInterval;
function startRelativeTimeUpdates() {
    if (relativeTimeInterval) clearInterval(relativeTimeInterval);
    relativeTimeInterval = setInterval(() => {
        const key = getLastScanKey();
        const stored = localStorage.getItem(key);
        if (stored && lastScanRelative) {
            try {
                const data = JSON.parse(stored);
                if (data.timestamp) {
                    lastScanRelative.textContent = getRelativeTime(data.timestamp);
                }
            } catch (e) { }
        }
    }, 30000);
}
startRelativeTimeUpdates();

// ===== REMOTE HISTORY (Supabase) =====
let currentHistory = [];

async function fetchHistory() {
    const op = operatorInput.value;
    const st = stationSel.value;

    if (!op || !st) {
        historyPanel.innerHTML = '<div style="padding:12px;color:#888">Select Operator and Station to view history.</div>';
        return;
    }

    // Loading indicator
    const loadLabel = document.createElement('div');
    loadLabel.textContent = 'Refreshing history...';
    loadLabel.style.padding = '12px';
    loadLabel.style.color = '#aa';
    historyPanel.innerHTML = '';
    historyPanel.appendChild(loadLabel);

    try {
        const { data, error } = await supabaseClient
            .from('scans')
            .select('*')
            .eq('operator_name', op)
            .eq('station_id', st)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (data) {
            currentHistory = data.map(row => ({
                part: row.part_id,
                serial: row.serial_number,
                status: 'OK', // Records in DB are by definition successful
                timestamp: row.created_at
            }));
            renderHistory();
        }
    } catch (e) {
        console.error('History Error:', e);
        historyPanel.innerHTML = '<div style="padding:12px;color:var(--error)">Error loading history.</div>';
    }
}

// Just updates the local view optimistically (for immediate feedback)
// The actual source of truth is Supabase, which we can refresh.
function addToHistory(item) {
    currentHistory.unshift(item);
    renderHistory();
}

function renderHistory() {
    historyPanel.innerHTML = '';
    if (!currentHistory.length) {
        historyPanel.innerHTML = '<div style="padding:12px;color:#888">No scans found for this operator/station.</div>';
        return;
    }

    currentHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';

        // Status Logic
        let statusClass = (item.status || 'OK').toLowerCase();
        if (statusClass.includes('dup')) statusClass = 'dup';
        else if (statusClass.includes('err') || statusClass.includes('off') || statusClass.includes('queued')) statusClass = 'queued';
        else statusClass = 'ok';

        let badgeStyle = '';
        if (statusClass === 'ok') badgeStyle = 'background:#d1fae5; color:#065f46;';
        if (statusClass === 'dup') badgeStyle = 'background:#fef3c7; color:#92400e;';
        if (statusClass === 'queued') badgeStyle = 'background:#dbeafe; color:#1e40af;';

        const partCol = document.createElement('div');
        partCol.className = 'scan-data-col';
        partCol.innerHTML = '<div class="data-label">Ref</div><div class="history-part-num"></div>';
        partCol.querySelector('.history-part-num').textContent = item.part;

        const serialCol = document.createElement('div');
        serialCol.className = 'scan-data-col';
        serialCol.innerHTML = '<div class="data-label">Serial</div><div class="history-serial-num"></div>';
        serialCol.querySelector('.history-serial-num').textContent = item.serial;

        const statusCol = document.createElement('div');
        statusCol.className = 'scan-data-col';
        statusCol.innerHTML = '<div class="data-label">Status</div><div class="history-status"></div><div class="history-time"></div>';
        const statusEl = statusCol.querySelector('.history-status');
        statusEl.textContent = item.status || 'OK';
        statusEl.style.cssText = badgeStyle;
        statusCol.querySelector('.history-time').textContent = formatTimestamp(item.timestamp);

        div.appendChild(partCol);
        div.appendChild(serialCol);
        div.appendChild(statusCol);

        historyPanel.appendChild(div);
    });
}

// ===== CONNECTIVITY =====
let consecutiveFailures = 0;
const MAX_FAILURES_BEFORE_OFFLINE = 3;

function updateNetworkStatus(online) {
    const net = document.getElementById('netStatus');
    const warning = document.getElementById('offlineWarning');

    if (online) {
        consecutiveFailures = 0;
        if (net) {
            net.textContent = 'ONLINE (SUPABASE)';
            net.style.background = '#10b981';
        }
        if (warning) warning.classList.remove('show');
    } else {
        if (net) {
            net.textContent = 'OFFLINE';
            net.style.background = '#ef4444';
        }
        if (warning) warning.classList.add('show');
    }
}

window.addEventListener('online', () => {
    updateNetworkStatus(true);
    // Auto-flush queue when connectivity returns
    setTimeout(flushQueue, 1000);
});
window.addEventListener('offline', () => updateNetworkStatus(false));

// === Send Function - OFFLINE-FIRST ===
// 1. Generate idempotency key
// 2. Queue locally (guaranteed persistence)
// 3. Attempt immediate sync if online
// 4. Return status for UI feedback
async function send(payload) {
    // Generate idempotency key: serial + station + timestamp
    const idempotencyKey = `${payload.serial_number}-${payload.station}-${Date.now()}`;

    // Always queue locally first (guarantees no scan loss)
    try {
        await queueScan(payload, idempotencyKey);
        console.log(`📦 Queued: ${payload.serial_number}`);
    } catch (e) {
        console.error('Queue error:', e);
        // Even if queue fails, try network
    }

    // Update queue UI
    updateQueueUI();

    // If offline, return immediately with QUEUED status
    if (!navigator.onLine) {
        return 'QUEUED';
    }

    // Attempt immediate sync
    try {
        const result = await syncScanToSupabase(payload, idempotencyKey);

        if (result === 'OK' || result === 'DUPLICATE') {
            // Successfully synced - remove from queue
            await dequeueScan(idempotencyKey);
            updateQueueUI();
            updateLastSyncTime(); // Track successful sync
            consecutiveFailures = 0;
            updateNetworkStatus(true);
            return result;
        } else {
            // Failed to sync - stays in queue for later
            consecutiveFailures++;
            if (consecutiveFailures >= MAX_FAILURES_BEFORE_OFFLINE) {
                updateNetworkStatus(false);
            }
            return 'QUEUED'; // Will be synced later
        }
    } catch (e) {
        console.error('Sync error:', e);
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_FAILURES_BEFORE_OFFLINE) {
            updateNetworkStatus(false);
        }
        return 'QUEUED'; // Stays in queue
    }
}

// Scan lock to prevent double-scanning
let isProcessing = false;
let processingTimeout = null;

function unlockScanner() {
    if (processingTimeout) {
        clearTimeout(processingTimeout);
        processingTimeout = null;
    }
    isProcessing = false;
    scanInput.disabled = false;
    scanInput.style.opacity = '1';
    scanInput.focus();
}

scanInput.addEventListener('keydown', async (ev) => {
    if (ev.key !== 'Enter') return;
    if (isProcessing) { playSoundError(); return; }

    let raw = scanInput.value.trim();
    if (!raw) return;

    // Sanitize
    raw = raw.replace(/[\x00-\x1F\x7F]/g, '');
    if (raw.startsWith("'")) raw = raw.substring(1);

    // 1. Try GS1 / HIBC Parsing
    let parsed = parsePN_SN(raw);

    // 2. Fallback / Custom Logic Parsing
    // If no part detected or empty serial, try to treat raw as the serial and extract part
    if (!parsed.part || parsed.part === 'UNKNOWN' || !parsed.serial) {
        // If GS1/HIBC didn't give us a clear serial, use the raw input as the potential serial
        const candidateSerial = parsed.serial || cleanSerialNumber(raw);

        // Try to extract part from this candidate serial (MGC, R756, etc.)
        const extractedPart = extractPartFromSerial(candidateSerial);

        if (extractedPart) {
            parsed.part = extractedPart;
            parsed.serial = candidateSerial;
        } else {
            // Still no part found, just use the cleaned serial
            parsed.serial = candidateSerial;
        }
    }

    // Final Clean
    const cleanedSerial = cleanSerialNumber(parsed.serial); // Apply final robust cleaning
    const cleanedPart = parsed.part || 'UNKNOWN';

    if (!cleanedSerial) {
        show('INVALID FORMAT', 'err');
        playSoundError();
        return;
    }

    // LOCK scanner
    scanInput.value = '';
    clearBtn.style.display = 'none';
    isProcessing = true;
    scanInput.disabled = true;
    scanInput.style.opacity = '0.5';

    // SAFETY TIMEOUT
    processingTimeout = setTimeout(() => {
        show('⚠️ Timeout - Please retry scan', 'dup');
        playSoundError();
        unlockScanner();
    }, 35000);

    try {
        show('⏳ Sending...', 'queued');

        lastPart.textContent = cleanedPart || 'N/A';
        lastSerial.textContent = cleanedSerial;
        lastScanStatus.textContent = 'SENDING';
        lastScanStatus.style.cssText = 'background:#dbeafe; color:#1e40af;';
        if (lastScanTime) lastScanTime.textContent = 'Sending...';
        if (lastScanRelative) lastScanRelative.textContent = '';

        const payload = {
            operator: operatorInput.value || 'UNNAMED',
            station: stationSel.value,
            raw_scan: raw,
            part_number: cleanedPart,
            serial_number: cleanedSerial,
            batch_comment: $('#generalNote').value || '' // Capture Batch Comment
        };

        const status = await send(payload);

        lastScanStatus.textContent = status;

        if (status === 'OK') {
            lastScanStatus.style.cssText = 'background:#d1fae5; color:#065f46;';
            playSoundSuccess();
            show('✅ SAVED', 'ok');
        } else if (status === 'DUPLICATE') {
            lastScanStatus.style.cssText = 'background:#fef3c7; color:#92400e;';
            playSoundDuplicate();
            show('⚠️ DUPLICATE', 'dup');
        } else if (status === 'QUEUED') {
            // QUEUED is a success state - scan is saved locally, will sync later
            lastScanStatus.style.cssText = 'background:#dbeafe; color:#1e40af;';
            playSoundSuccess(); // Success beep - scan IS saved (locally)
            show('📤 QUEUED (will sync)', 'queued');
        } else {
            lastScanStatus.style.cssText = 'background:#fee2e2; color:#991b1b;';
            lastScanStatus.textContent = 'ERROR';
            playSoundError();
            show('❌ ERROR', 'err');
        }

        saveLastScan(cleanedPart, cleanedSerial, status);
        addToHistory({
            part: cleanedPart,
            serial: cleanedSerial,
            status: status,
            timestamp: new Date().toISOString()
        });

    } catch (e) {
        console.error(e);
        lastScanStatus.textContent = 'ERR';
        playSoundError();
        show('❌ ERROR', 'err');
    } finally {
        unlockScanner();
    }
});

// Handle scan field clear button
scanInput.addEventListener('input', () => {
    clearBtn.style.display = scanInput.value ? 'flex' : 'none';
});
clearBtn.addEventListener('click', () => {
    scanInput.value = '';
    clearBtn.style.display = 'none';
    scanInput.focus();
});

// Initialization
async function initApp() {
    initBattery(); // Start Battery Monitor
    initClock(); // Start Live Clock

    // Initialize offline queue
    try {
        await initOfflineQueue();
        updateQueueUI();
        // Flush any pending scans from previous session
        if (navigator.onLine) {
            setTimeout(flushQueue, 2000);
        }
    } catch (e) {
        console.warn('Queue init failed:', e);
    }

    loadLastScan();

    // Fetch config FIRST, then populate dropdowns
    const success = await fetchPartNumberMap();

    populateOperators();
    populateStations();

    // Restore lock states AFTER dropdowns are populated
    restoreLockStates();

    // Refresh history now that we have prefs loaded and dropdowns potentially set
    fetchHistory();

    scanInput.disabled = false;
    scanInput.classList.add('ready');
    scanInput.placeholder = '✅ Ready to scan';

    // Register Service Worker for PWA caching
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('📦 Service Worker registered:', reg.scope))
            .catch(err => console.error('❌ Service Worker registration failed:', err));
    }

    console.log('🚀 App initialized');
}

initApp();

// Modals & Listeners
// Refresh history when user changes Operator or Station
operatorInput.addEventListener('change', () => { savePrefs(); fetchHistory(); });
stationSel.addEventListener('change', () => { savePrefs(); fetchHistory(); });

lockBtn.addEventListener('click', () => {
    operatorInput.disabled = true;
    stationSel.disabled = true;
    lockBtn.style.display = 'none';
    unlockBtn.style.display = 'inline-flex';
    savePrefs();
    saveLockStates();
});

unlockBtn.addEventListener('click', () => {
    operatorInput.disabled = false;
    stationSel.disabled = false;
    lockBtn.style.display = 'inline-flex';
    unlockBtn.style.display = 'none';
    saveLockStates();
});

historyToggle.addEventListener('click', () => historyPanel.classList.toggle('expanded'));

// Batch Comment Logic
lockBatchBtn.addEventListener('click', () => {
    const isLocked = generalNote.disabled;
    if (isLocked) {
        // UNLOCK
        generalNote.disabled = false;
        lockBatchBtn.innerHTML = '🔒 Lock Comment';
        lockBatchBtn.style.background = '#10b981'; // var(--success)
        clearNoteBtn.disabled = false;
        clearNoteBtn.style.opacity = '1';
    } else {
        // LOCK
        generalNote.disabled = true;
        lockBatchBtn.innerHTML = '🔓 Unlock Comment';
        lockBatchBtn.style.background = '#f59e0b'; // var(--warning)
        clearNoteBtn.disabled = true;
        clearNoteBtn.style.opacity = '0.5';
    }
    saveLockStates();
});

clearNoteBtn.addEventListener('click', () => {
    generalNote.value = '';
    generalNote.focus();
    saveLockStates(); // Save that the comment was cleared
});

// Also save batch comment when it changes
generalNote.addEventListener('input', () => {
    localStorage.setItem('batchComment', generalNote.value);
});

// Update sync status display periodically
setInterval(() => {
    updateSyncStatusUI();
}, 30000);
