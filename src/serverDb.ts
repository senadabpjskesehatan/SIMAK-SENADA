import fs from 'fs';
import path from 'path';
import {
  User,
  Indicator,
  Ticket,
  SamplingEvaluation,
  CalibrationRecord,
  GoogleSheetConfig,
} from './types';
import { INITIAL_USERS, INITIAL_INDICATORS } from './data/mockData';

export interface ServerDatabase {
  version: number;
  lastUpdated: string;
  users: User[];
  indicators: Indicator[];
  tickets: Ticket[];
  evaluations: SamplingEvaluation[];
  calibrations: CalibrationRecord[];
  sheetConfig: GoogleSheetConfig;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'senada_db.json');
const DB_TMP = path.join(DB_DIR, 'senada_db.tmp.json');

// In-memory cache
let memoryDb: ServerDatabase | null = null;

function ensureDbDirectory() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

export function loadServerDb(): ServerDatabase {
  if (memoryDb) {
    return memoryDb;
  }

  ensureDbDirectory();

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memoryDb = {
          version: typeof parsed.version === 'number' ? parsed.version : 1,
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : INITIAL_USERS,
          indicators: Array.isArray(parsed.indicators) && parsed.indicators.length > 0 ? parsed.indicators : INITIAL_INDICATORS,
          tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
          evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations : [],
          calibrations: Array.isArray(parsed.calibrations) ? parsed.calibrations : [],
          sheetConfig: parsed.sheetConfig || {
            url: '',
            autoSync: false,
            totalSyncedRows: 0,
            status: 'idle',
          },
        };
        return memoryDb;
      }
    } catch (err) {
      console.error('[ServerDB] Error parsing existing db file, will reinitialize safely:', err);
    }
  }

  // Initialize fresh database
  memoryDb = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    users: [...INITIAL_USERS],
    indicators: [...INITIAL_INDICATORS],
    tickets: [],
    evaluations: [],
    calibrations: [],
    sheetConfig: {
      url: '',
      autoSync: false,
      totalSyncedRows: 0,
      status: 'idle',
    },
  };

  saveServerDb(memoryDb);
  return memoryDb;
}

export function saveServerDb(db: ServerDatabase): void {
  ensureDbDirectory();
  db.version = (db.version || 0) + 1;
  db.lastUpdated = new Date().toISOString();
  memoryDb = db;

  try {
    const jsonStr = JSON.stringify(db, null, 2);
    fs.writeFileSync(DB_TMP, jsonStr, 'utf8');
    fs.renameSync(DB_TMP, DB_FILE);
  } catch (err) {
    console.error('[ServerDB] Error writing db file:', err);
  }
}

export function getServerDb(): ServerDatabase {
  return loadServerDb();
}

/**
 * Synchronize tickets with server database based on user requirements:
 * 1. 'use_data': Replace unsampled data with new data, preserve sampled/calibrated data
 * 2. 'append_data': Append new data without duplicating (by nomorTiket + tanggalTiket)
 */
export function syncTicketsInDb(
  incomingTickets: Ticket[],
  mode: 'use_data' | 'append_data' = 'use_data',
  sheetUrl?: string
): { tickets: Ticket[]; addedCount: number; totalCount: number; message: string } {
  const db = loadServerDb();

  // Create set of tickets that have already been sampled
  const sampledSet = new Set<string>();
  const evalMap = new Map<string, string>();
  db.evaluations.forEach((e) => {
    const num = String(e.nomorTiket || '').trim();
    if (num) {
      sampledSet.add(num);
      evalMap.set(num, e.id);
    }
  });

  // Preserve existing sampled tickets
  const existingSampledTickets: Ticket[] = [];
  const existingTicketMap = new Map<string, Ticket>();

  db.tickets.forEach((t) => {
    const key = `${String(t.nomorTiket || '').trim()}__${String(t.tanggalTiket || '').trim()}`;
    existingTicketMap.set(key, t);
    if (t.sampled || sampledSet.has(String(t.nomorTiket || '').trim())) {
      existingSampledTickets.push({
        ...t,
        sampled: true,
        samplingId: t.samplingId || evalMap.get(String(t.nomorTiket || '').trim()),
      });
    }
  });

  let finalTickets: Ticket[] = [];
  let addedCount = 0;

  if (mode === 'append_data') {
    // Mode Tambah Data: Only add tickets that do not already exist based on nomorTiket and tanggalTiket
    finalTickets = [...db.tickets];
    for (const inc of incomingTickets) {
      const key = `${String(inc.nomorTiket || '').trim()}__${String(inc.tanggalTiket || '').trim()}`;
      if (!existingTicketMap.has(key)) {
        // Check if previously sampled
        const num = String(inc.nomorTiket || '').trim();
        const isSampled = sampledSet.has(num);
        const ticketToAdd: Ticket = {
          ...inc,
          sampled: isSampled,
          samplingId: isSampled ? evalMap.get(num) : undefined,
        };
        finalTickets.push(ticketToAdd);
        existingTicketMap.set(key, ticketToAdd);
        addedCount++;
      }
    }
  } else {
    // Mode Gunakan Data: Replace unsampled tickets with new data, keep all sampled tickets
    const sampledTicketNumberMap = new Map<string, Ticket>();
    existingSampledTickets.forEach((t) => {
      sampledTicketNumberMap.set(String(t.nomorTiket || '').trim(), t);
    });

    const incomingMap = new Map<string, Ticket>();
    for (const inc of incomingTickets) {
      const num = String(inc.nomorTiket || '').trim();
      const isSampled = sampledSet.has(num) || sampledTicketNumberMap.has(num);
      const existingSampled = sampledTicketNumberMap.get(num);

      const processedTicket: Ticket = {
        ...inc,
        sampled: isSampled,
        samplingId: isSampled ? (existingSampled?.samplingId || evalMap.get(num)) : undefined,
      };

      const key = `${num}__${String(inc.tanggalTiket || '').trim()}`;
      incomingMap.set(key, processedTicket);
    }

    // Merge: All incoming tickets + any sampled tickets not present in incoming
    finalTickets = Array.from(incomingMap.values());
    for (const sTicket of existingSampledTickets) {
      const key = `${String(sTicket.nomorTiket || '').trim()}__${String(sTicket.tanggalTiket || '').trim()}`;
      if (!incomingMap.has(key)) {
        finalTickets.unshift(sTicket);
      }
    }
    addedCount = incomingTickets.length;
  }

  // Update sheetConfig
  db.tickets = finalTickets;
  db.sheetConfig = {
    ...db.sheetConfig,
    url: sheetUrl || db.sheetConfig.url,
    totalSyncedRows: finalTickets.length,
    lastSyncedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    status: 'success',
  };

  saveServerDb(db);

  return {
    tickets: db.tickets,
    addedCount,
    totalCount: db.tickets.length,
    message:
      mode === 'append_data'
        ? `Berhasil menambah ${addedCount} data baru tanpa duplikasi. Total tiket tersimpan: ${finalTickets.length}.`
        : `Berhasil menyimpan ${finalTickets.length} data baru ke server (data sampled & kalibrasi tetap terjaga).`,
  };
}

/**
 * Save sampling evaluation and update ticket in server DB
 */
export function saveEvaluationInDb(evaluation: SamplingEvaluation): ServerDatabase {
  const db = loadServerDb();

  // Upsert evaluation
  const idx = db.evaluations.findIndex((e) => e.id === evaluation.id);
  if (idx >= 0) {
    db.evaluations[idx] = evaluation;
  } else {
    db.evaluations.unshift(evaluation);
  }

  // Mark ticket as sampled
  db.tickets = db.tickets.map((t) => {
    if (String(t.nomorTiket).trim() === String(evaluation.nomorTiket).trim()) {
      return { ...t, sampled: true, samplingId: evaluation.id };
    }
    return t;
  });

  saveServerDb(db);
  return db;
}

/**
 * Save calibration record and update evaluation in server DB
 */
export function saveCalibrationInDb(calibration: CalibrationRecord): ServerDatabase {
  const db = loadServerDb();

  // Upsert calibration
  const idx = db.calibrations.findIndex((c) => c.id === calibration.id);
  if (idx >= 0) {
    db.calibrations[idx] = calibration;
  } else {
    db.calibrations.unshift(calibration);
  }

  // Update evaluation as calibrated
  db.evaluations = db.evaluations.map((e) => {
    if (e.id === calibration.samplingEvaluationId) {
      return {
        ...e,
        isCalibrated: true,
        calibrationId: calibration.id,
        calibratedBy: {
          id: calibration.calibratorId,
          name: calibration.calibratorName,
          role: calibration.calibratorRole,
          tanggal: calibration.tanggalKalibrasi,
          nilaiKalibrasi: calibration.nilaiKalibrasi,
          kesesuaian: calibration.persentaseKesesuaian,
        },
      };
    }
    return e;
  });

  saveServerDb(db);
  return db;
}

/**
 * Update evaluation status (e.g. Petugas sanggahan / penerimaan, QA rebuttal decision)
 */
export function updateEvaluationInDb(
  evaluationId: string,
  updates: Partial<SamplingEvaluation>
): ServerDatabase {
  const db = loadServerDb();
  db.evaluations = db.evaluations.map((e) => {
    if (e.id === evaluationId) {
      return { ...e, ...updates };
    }
    return e;
  });

  // If status or scores changed, also check if calibrated
  if (updates.ticket) {
    db.tickets = db.tickets.map((t) => {
      if (t.nomorTiket === updates.nomorTiket) {
        return { ...t, ...updates.ticket };
      }
      return t;
    });
  }

  saveServerDb(db);
  return db;
}

/**
 * Delete evaluations by period and reset ticket sampled status
 */
export function deleteEvaluationsByPeriodInDb(period: string): {
  count: number;
  db: ServerDatabase;
  message: string;
} {
  const db = loadServerDb();
  let toDelete: SamplingEvaluation[] = [];

  if (period === 'all') {
    toDelete = [...db.evaluations];
  } else {
    toDelete = db.evaluations.filter(
      (e) => e.tanggalSampling && e.tanggalSampling.startsWith(period)
    );
  }

  if (toDelete.length === 0) {
    return { count: 0, db, message: 'Tidak ada data evaluasi pada periode tersebut.' };
  }

  const deleteIds = new Set(toDelete.map((e) => e.id));
  const deleteTicketNumbers = new Set(toDelete.map((e) => String(e.nomorTiket).trim()));

  db.evaluations = db.evaluations.filter((e) => !deleteIds.has(e.id));
  db.calibrations = db.calibrations.filter(
    (c) => !deleteIds.has(c.samplingEvaluationId)
  );

  db.tickets = db.tickets.map((t) => {
    if (deleteTicketNumbers.has(String(t.nomorTiket).trim())) {
      return { ...t, sampled: false, samplingId: undefined };
    }
    return t;
  });

  saveServerDb(db);
  return {
    count: toDelete.length,
    db,
    message: `Berhasil menghapus ${toDelete.length} data evaluasi untuk periode ${period === 'all' ? 'Semua' : period}.`,
  };
}

/**
 * Indicators management in server DB
 */
export function updateIndicatorsInDb(indicators: Indicator[]): ServerDatabase {
  const db = loadServerDb();
  db.indicators = indicators;
  saveServerDb(db);
  return db;
}

export function resetIndicatorsInDb(): ServerDatabase {
  const db = loadServerDb();
  db.indicators = [...INITIAL_INDICATORS];
  saveServerDb(db);
  return db;
}

/**
 * Users management in server DB
 */
export function updateUsersInDb(users: User[]): ServerDatabase {
  const db = loadServerDb();
  db.users = users;
  saveServerDb(db);
  return db;
}

/**
 * Reset all data to empty state
 */
export function clearAllDataInDb(): ServerDatabase {
  const db = loadServerDb();
  db.tickets = [];
  db.evaluations = [];
  db.calibrations = [];
  db.sheetConfig = {
    url: '',
    autoSync: false,
    totalSyncedRows: 0,
    status: 'idle',
  };
  saveServerDb(db);
  return db;
}
