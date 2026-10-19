import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  User,
  UserRole,
  Indicator,
  Ticket,
  SamplingEvaluation,
  FilterState,
  GoogleSheetConfig,
  IndicatorScore,
  SanggahanData,
  KeputusanAkhirData,
  CalibrationRecord,
  CalibrationFilterState,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_INDICATORS,
  INITIAL_TICKETS,
  INITIAL_EVALUATIONS,
  INITIAL_CALIBRATIONS,
  DEFAULT_NILAI_OPTIONS,
} from '../data/mockData';
import { parseCSV, parseExcelFile, generateSampleGoogleSheetCSV, cleanCategory } from '../utils/csvParser';
import * as XLSX from 'xlsx';
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  updateDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const cleanFirestoreData = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreData);
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = cleanFirestoreData(val);
    }
  }
  return cleaned;
};

const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
  const errMessage = error instanceof Error ? error.message : String(error);
  console.warn(`[Firestore ${operationType} - ${path || 'general'}]:`, errMessage);
};

const safeSetDoc = async (docRef: any, data: any, options?: any) => {
  try {
    const cleaned = cleanFirestoreData(data);
    await setDoc(docRef, cleaned, options);
  } catch (err) {
    handleFirestoreError(err, 'safeSetDoc', docRef?.path || null);
  }
};

const batchSetDocs = async (items: { path: string; id: string; data: any }[]) => {
  if (!items || items.length === 0) return;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    try {
      const batch = writeBatch(db);
      for (const item of chunk) {
        const ref = doc(db, item.path, item.id);
        batch.set(ref, cleanFirestoreData(item.data));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'batchSetDocs', `${items[0]?.path || 'general'} chunk`);
      for (const item of chunk) {
        await safeSetDoc(doc(db, item.path, item.id), item.data);
      }
    }
  }
};

const batchDeleteDocs = async (docRefs: any[]) => {
  if (!docRefs || docRefs.length === 0) return;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docRefs.length; i += CHUNK_SIZE) {
    const chunk = docRefs.slice(i, i + CHUNK_SIZE);
    try {
      const batch = writeBatch(db);
      for (const ref of chunk) {
        batch.delete(ref);
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, 'batchDeleteDocs', 'chunk');
      for (const ref of chunk) {
        try {
          await deleteDoc(ref);
        } catch {
          // ignore
        }
      }
    }
  }
};


interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (usernameOrNip: string, password: string) => { success: boolean; message?: string };
  logout: (customMessage?: string) => void;
  switchRole: (role: User['role']) => void;
  sessionExpiresAt: number | null;
  sessionExpiredMessage: string | null;
  clearSessionExpiredMessage: () => void;
  users: User[];
  changePassword: (oldPass: string, newPass: string) => { success: boolean; message: string };

  // Indicators management
  indicators: Indicator[];
  addIndicator: (indicator: Omit<Indicator, 'id'>) => Promise<{ success: boolean; error?: string }> | void;
  updateIndicator: (id: string, updated: Partial<Indicator>) => Promise<{ success: boolean; error?: string }> | void;
  updateMultipleIndicators: (updates: { id: string; bobot?: number; nama?: string; deskripsi?: string; nomorSOP?: number }[]) => Promise<{ success: boolean; error?: string }>;
  applyStandardSopWeights: () => Promise<{ success: boolean; error?: string }>;
  deleteIndicator: (id: string) => Promise<{ success: boolean; error?: string }> | void;
  resetIndicators: () => Promise<{ success: boolean; error?: string }>;
  totalIndicatorWeight: number;

  // Tickets & Sheet Sync
  tickets: Ticket[];
  sheetConfig: GoogleSheetConfig;
  syncGoogleSheet: (
    customUrl?: string,
    onProgress?: (percent: number, stepText: string) => void
  ) => Promise<{ success: boolean; message: string; count?: number; error?: string }>;
  importExcelFile: (
    file: File,
    onProgress?: (percent: number, stepText: string) => void
  ) => Promise<{ success: boolean; message: string; count?: number; error?: string }>;
  loadSampleSheetData: (
    onProgress?: (percent: number, stepText: string) => void
  ) => Promise<{ success: boolean; message: string; count: number }>;
  importCSVText: (
    csvText: string,
    onProgress?: (percent: number, stepText: string) => void
  ) => Promise<{ success: boolean; count: number; error?: string }>;
  importEvaluationsFromExcel: (
    file: File,
    onProgress?: (percent: number, stepText: string) => void
  ) => Promise<{ success: boolean; message: string; count?: number; error?: string }>;

  // Sampling Evaluations & Workflow
  evaluations: SamplingEvaluation[];
  createSamplingEvaluation: (params: {
    ticket: Ticket;
    scores: IndicatorScore[];
    catatanAwalQA: string;
    isAiEvaluated?: boolean;
    aiAnalysis?: SamplingEvaluation['aiAnalysis'];
  }) => SamplingEvaluation;
  evaluateTicketWithAI: (ticket: Ticket) => Promise<{
    success: boolean;
    scores: IndicatorScore[];
    totalScore: number;
    aiAnalysis: any;
    isAi: boolean;
    error?: string;
  }>;
  submitPetugasAcceptance: (evaluationId: string) => void;
  submitPetugasSanggahan: (evaluationId: string, sanggahan: SanggahanData) => void;
  submitQaKeputusanAkhir: (evaluationId: string, keputusan: KeputusanAkhirData) => void;
  deleteEvaluationsByPeriod: (period: string) => Promise<{ success: boolean; message: string; count: number }>;

  // Calibration module
  calibrations: CalibrationRecord[];
  createCalibration: (params: {
    samplingEvaluation: SamplingEvaluation;
    scores: IndicatorScore[];
    catatanKalibrasi: string;
  }) => CalibrationRecord;
  uncalibratedEvaluations: SamplingEvaluation[];
  calibrationFilters: CalibrationFilterState;
  setCalibrationFilters: React.Dispatch<React.SetStateAction<CalibrationFilterState>>;
  filteredCalibrations: CalibrationRecord[];

  // Filtering
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filteredTickets: Ticket[];
  filteredEvaluations: SamplingEvaluation[];

  // Counters
  pendingPetugasCount: number;
  pendingQaRebuttalCount: number;

  // User Management Handlers (for QA and Admin)
  addUser: (user: Omit<User, 'id'>) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, updated: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  resetUsersToDefault: () => Promise<void>;
  bulkUsersCreate: (users: Omit<User, 'id'>[]) => Promise<void>;
  handleBulkCreate: () => void;
  clearAllData: () => void;

  // Active view
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'senada_user_session_v10',
  SESSION_START: 'senada_session_start_v10',
  SESSION_EXPIRES: 'senada_session_expires_v10',
  USERS_LIST: 'senada_users_list_v10_nodata',
  INDICATORS: 'senada_indicators_v10_nodata',
  TICKETS: 'senada_tickets_v10_nodata',
  EVALUATIONS: 'senada_evaluations_v10_nodata',
  CALIBRATIONS: 'senada_calibrations_v10_nodata',
  SHEET: 'senada_sheet_v10_nodata',
};

// Maximum session duration: 60 minutes (3,600,000 ms)
export const MAX_SESSION_DURATION_MS = 60 * 60 * 1000;

// SessionStorage wrapper: auto-cleared whenever browser window/tab is closed
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return null;
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      window.sessionStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[SENADA SessionStorage] Error setting "${key}"`, err);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
  clear: (): void => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      window.sessionStorage.clear();
    } catch {
      // Ignore
    }
  },
};

// Safe storage wrapper for app data (tickets, evaluations, indicators)
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[SENADA Storage] QuotaExceededError on key "${key}". Cleaning non-essential keys...`, err);
      try {
        const allowed = Object.values(STORAGE_KEYS);
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const k = window.localStorage.key(i);
          if (k && !allowed.includes(k)) {
            window.localStorage.removeItem(k);
          }
        }
        window.localStorage.setItem(key, value);
      } catch (retryErr) {
        console.warn(`[SENADA Storage] Could not persist "${key}". Operating in memory.`, retryErr);
      }
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

// Cleanup old legacy storage with default dummy data & previous user caches
['v1', 'v2', 'v3', 'v4', 'v4_clean', 'v5', 'v6', 'v7', 'v7_complete', 'v8_flow', 'v9', 'v10_nodata'].forEach((ver) => {
  safeStorage.removeItem(`senada_tickets_${ver}`);
  safeStorage.removeItem(`senada_evaluations_${ver}`);
  safeStorage.removeItem(`senada_calibrations_${ver}`);
  safeStorage.removeItem(`senada_sheet_${ver}`);
  safeStorage.removeItem(`senada_user_${ver}`);
  safeStorage.removeItem(`senada_users_list_${ver}`);
});
// Purge any lingering user in localStorage so browser close strictly requires login
safeStorage.removeItem('senada_user_session_v10');
safeStorage.removeItem('senada_user_v10_nodata');

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Session expired notification state
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(() => {
    const expiresStr = safeSessionStorage.getItem(STORAGE_KEYS.SESSION_EXPIRES);
    if (expiresStr) {
      const exp = Number(expiresStr);
      if (Date.now() < exp) return exp;
    }
    return null;
  });

  // 1. Current User: Stored exclusively in sessionStorage and bounded by 60 minutes
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Check if session has expired or if browser was closed
    const expiresStr = safeSessionStorage.getItem(STORAGE_KEYS.SESSION_EXPIRES);
    const saved = safeSessionStorage.getItem(STORAGE_KEYS.USER);

    if (saved && expiresStr) {
      const exp = Number(expiresStr);
      if (Date.now() < exp) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) return parsed;
        } catch (e) {
          console.error('Error parsing session user', e);
        }
      } else {
        // Expired after 60 minutes
        safeSessionStorage.removeItem(STORAGE_KEYS.USER);
        safeSessionStorage.removeItem(STORAGE_KEYS.SESSION_START);
        safeSessionStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRES);
      }
    }
    return null;
  });

  // 2. Users list synced with Firestore
  const [users, setUsers] = useState<User[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEYS.USERS_LIST);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_USERS;
  });
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      async (snapshot) => {
        const usersList: User[] = [];
        snapshot.forEach((doc) => {
          usersList.push(doc.data() as User);
        });
        if (usersList.length > 0) {
          setUsers(usersList);
          safeStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(usersList));
        } else {
          for (const u of INITIAL_USERS) {
            await safeSetDoc(doc(db, 'users', u.id), u);
          }
          setUsers(INITIAL_USERS);
        }
      },
      (error) => {
        handleFirestoreError(error, 'onSnapshot', 'users');
        setUsers((prev) => (prev.length > 0 ? prev : INITIAL_USERS));
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. Active Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // 4. Indicators synced with Firestore
  const [indicators, setIndicators] = useState<Indicator[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEYS.INDICATORS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_INDICATORS;
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'indicators'),
      async (snapshot) => {
        const indList: Indicator[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          indList.push({ id: docSnap.id, ...data } as Indicator);
        });
        if (indList.length > 0) {
          indList.sort((a, b) => {
            const noA = a.nomorSOP ?? 999;
            const noB = b.nomorSOP ?? 999;
            if (noA !== noB) return noA - noB;
            return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
          });

          // Periksa apakah indikator standar masih memakai nomor urut atau bobot lama (misal 9% atau 10%)
          const needsCalibration = indList.some((ind) => {
            const def = INITIAL_INDICATORS.find(
              (d) => d.id === ind.id || d.nama.toLowerCase() === ind.nama.toLowerCase()
            );
            if (!def) return false;
            return ind.nomorSOP === undefined || (def.bobot !== ind.bobot && (ind.bobot === 9 || (ind.id === 'ind-5' && ind.bobot === 10)));
          });

          if (needsCalibration) {
            const updatedList = indList.map((ind) => {
              const def = INITIAL_INDICATORS.find(
                (d) => d.id === ind.id || d.nama.toLowerCase() === ind.nama.toLowerCase()
              );
              if (def) {
                const newBobot = (ind.bobot === 9 || (ind.id === 'ind-5' && ind.bobot === 10)) ? def.bobot : ind.bobot;
                return { ...ind, nomorSOP: def.nomorSOP, bobot: newBobot };
              }
              return ind;
            });
            setIndicators(updatedList);
            safeStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(updatedList));
            // Sinkronkan pembaruan bobot resmi ke server Firestore
            for (const ind of updatedList) {
              await safeSetDoc(doc(db, 'indicators', ind.id), { bobot: ind.bobot, nomorSOP: ind.nomorSOP }, { merge: true });
            }
          } else {
            setIndicators(indList);
            safeStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(indList));
          }
        } else {
          for (const ind of INITIAL_INDICATORS) {
            await safeSetDoc(doc(db, 'indicators', ind.id), ind);
          }
          setIndicators(INITIAL_INDICATORS);
          safeStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(INITIAL_INDICATORS));
        }
      },
      (error) => {
        handleFirestoreError(error, 'onSnapshot', 'indicators');
      }
    );
    return () => unsubscribe();
  }, []);

  // 5. Tickets (Tanpa Data Default - semata-mata berasal dari sinkronisasi Google Sheet)
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'tickets'),
      (snapshot) => {
        const ticketsList: Ticket[] = [];
        snapshot.forEach((doc) => {
          const t = doc.data() as Ticket;
          ticketsList.push({
            ...t,
            kategori: cleanCategory(t.kategori),
          });
        });
        setTickets(ticketsList);
      },
      (error) => {
        handleFirestoreError(error, 'onSnapshot', 'tickets');
        setTickets([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // 6. Sampling Evaluations synced with Firestore
  const [evaluations, setEvaluations] = useState<SamplingEvaluation[]>([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'evaluations'),
      (snapshot) => {
        const evalList: SamplingEvaluation[] = [];
        snapshot.forEach((doc) => {
          evalList.push(doc.data() as SamplingEvaluation);
        });
        setEvaluations(evalList);
      },
      (error) => {
        handleFirestoreError(error, 'onSnapshot', 'evaluations');
      }
    );
    return () => unsubscribe();
  }, []);

  // 7. Calibrations synced with Firestore
  const [calibrations, setCalibrations] = useState<CalibrationRecord[]>([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'calibrations'),
      (snapshot) => {
        const calList: CalibrationRecord[] = [];
        snapshot.forEach((doc) => {
          calList.push(doc.data() as CalibrationRecord);
        });
        setCalibrations(calList);
      },
      (error) => {
        handleFirestoreError(error, 'onSnapshot', 'calibrations');
      }
    );
    return () => unsubscribe();
  }, []);

  // 8. Google Sheet Config synced with Firestore
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>({
    url: '',
    autoSync: false,
    totalSyncedRows: 0,
    status: 'idle',
  });
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'config', 'sheetConfig'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSheetConfig(docSnap.data() as GoogleSheetConfig);
        }
      },
      (error) => {
        handleFirestoreError(error, 'onSnapshot', 'config/sheetConfig');
      }
    );
    return () => unsubscribe();
  }, []);

  // 9. Filters
  const [filters, setFilters] = useState<FilterState>({
    periode: 'all',
    namaPetugas: 'all',
    kategori: 'all',
    status: 'all',
  });

  const [calibrationFilters, setCalibrationFilters] = useState<CalibrationFilterState>({
    periode: 'all',
    namaPetugas: 'all',
    namaQA: 'all',
    kategori: 'all',
    pokokMasalah: 'all',
    topikMasalah: 'all',
  });

  // Sync currentUser session exclusively to sessionStorage
  useEffect(() => {
    if (currentUser) {
      safeSessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      safeSessionStorage.removeItem(STORAGE_KEYS.USER);
      safeSessionStorage.removeItem(STORAGE_KEYS.SESSION_START);
      safeSessionStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRES);
    }
    // Strictly remove user from localStorage to ensure closing browser forces logout
    safeStorage.removeItem(STORAGE_KEYS.USER);
  }, [currentUser]);

  // Session monitor: Automatically logs out when 60 minutes limit is reached or on browser focus
  const resetSessionTimer = React.useCallback(() => {
    const now = Date.now();
    const newExpiresAt = now + MAX_SESSION_DURATION_MS;
    setSessionExpiresAt(newExpiresAt);
    safeSessionStorage.setItem(STORAGE_KEYS.SESSION_EXPIRES, newExpiresAt.toString());
  }, []);

  useEffect(() => {
    if (!currentUser || !sessionExpiresAt) return;

    const checkSessionExpiration = () => {
      const now = Date.now();
      if (now >= sessionExpiresAt) {
        logout('Sesi login Anda telah berakhir (maksimal 60 menit). Silakan masuk kembali.');
      }
    };

    // Initial check
    checkSessionExpiration();

    // Check periodically every 5 seconds
    const interval = setInterval(checkSessionExpiration, 5000);

    // Also check when tab becomes active / window receives focus
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkSessionExpiration();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Activity tracker
    let lastActivityTime = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime > 10000) { // Throttle resets to max once per 10s
        lastActivityTime = now;
        resetSessionTimer();
      }
    };
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [currentUser, sessionExpiresAt, resetSessionTimer]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(indicators));
  }, [indicators]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(evaluations));
  }, [evaluations]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.CALIBRATIONS, JSON.stringify(calibrations));
  }, [calibrations]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.SHEET, JSON.stringify(sheetConfig));
  }, [sheetConfig]);

  // Total Indicator Weight
  const totalIndicatorWeight = useMemo(() => {
    return indicators.reduce((acc, ind) => acc + (Number(ind.bobot) || 0), 0);
  }, [indicators]);

  // User Management Handlers (for QA and Admin)
  const addUser = async (newUser: Omit<User, 'id'>): Promise<{ success: boolean; error?: string }> => {
    const id = `USR-${Date.now().toString().slice(-6)}`;
    const avatar = newUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    const userObj: User = { ...newUser, id, avatar };
    
    // Optimistically update React state and local storage immediately
    setUsers((prev) => {
      const filtered = prev.filter(
        (u) => u.id !== id && u.username.toLowerCase() !== newUser.username.toLowerCase()
      );
      const nextUsers = [userObj, ...filtered];
      safeStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(nextUsers));
      return nextUsers;
    });

    try {
      await safeSetDoc(doc(db, 'users', id), userObj);
    } catch (e: any) {
      console.warn('Firestore user sync deferred:', e);
    }
    return { success: true };
  };

  const updateUser = async (id: string, updated: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    setUsers((prev) => {
      const nextUsers = prev.map((u) => (u.id === id ? { ...u, ...updated } : u));
      safeStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(nextUsers));
      return nextUsers;
    });

    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updated } : prev));
    }

    try {
      await safeSetDoc(doc(db, 'users', id), updated, { merge: true });
    } catch (e: any) {
      console.warn('Firestore user update deferred:', e);
    }
    return { success: true };
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser && id === currentUser.id) {
      return { success: false, error: 'Tidak dapat menghapus akun yang sedang aktif.' };
    }

    setUsers((prev) => {
      const nextUsers = prev.filter((u) => u.id !== id);
      safeStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(nextUsers));
      return nextUsers;
    });

    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (e: any) {
      console.warn('Firestore user delete deferred:', e);
    }
    return { success: true };
  };

  const resetUsersToDefault = async () => {
    setUsers(INITIAL_USERS);
    safeStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(INITIAL_USERS));
    try {
      const snap = await getDocs(collection(db, 'users'));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'users', d.id));
      }
      for (const u of INITIAL_USERS) {
        await safeSetDoc(doc(db, 'users', u.id), u);
      }
    } catch (e) {
      console.warn('Reset to default Firestore sync deferred:', e);
    }
  };

  const bulkUsersCreate = async (newUsers: Omit<User, 'id'>[]) => {
    const createdList: User[] = newUsers.map((u, idx) => ({
      ...u,
      id: `USR-${Date.now().toString().slice(-4)}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    }));

    setUsers((prev) => {
      const userMap = new Map<string, User>();
      prev.forEach((u) => userMap.set(u.username.toLowerCase(), u));
      createdList.forEach((u) => userMap.set(u.username.toLowerCase(), u));
      const nextUsers = Array.from(userMap.values());
      safeStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(nextUsers));
      return nextUsers;
    });

    try {
      for (const u of createdList) {
        await safeSetDoc(doc(db, 'users', u.id), u);
      }
    } catch (e) {
      console.warn('Bulk users create Firestore sync deferred:', e);
    }
  };

  const handleBulkCreate = () => {
    const rawData = `No;Nama;NPP;USER;PASSWORD;HAK AKSES;TIM
1;EGHILIA HEAVY MOURITA;230283;230283;kualitas99;Petugas;4
2;RIZKA LAILATUL AMALIA;230284;230284;kualitas99;Quality Assurance;
3;FITRIANA KUSUMA DEWI;230287;230287;kualitas99;Petugas;4
4;RIZKI WULAN SARI;230293;230293;kualitas99;Petugas;3
5;EDHO ARSENA RONALDIPURA;230294;230294;kualitas99;Team Leader;
6;SITI NUR FIKRIYYATUL AZIZAH;230295;230295;kualitas99;Petugas;4
7;GALUH DIAN PUSPITA;230296;230296;kualitas99;Petugas;6
8;MALIK MUBAROK;230297;230297;kualitas99;Team Leader;
9;KHURIYYAH INDRASWARI UTAMI;230298;230298;kualitas99;Quality Assurance;
10;SALSABILA AULIA PUTRI;230299;230299;kualitas99;Petugas;3
11;WAHYU MUSTIKA FITRI;230300;230300;kualitas99;Team Leader;
12;NUR FITRI ANISA;230302;230302;kualitas99;Petugas;2
13;NANDA AULIA DEVIANTARI;240428;240428;kualitas99;Petugas;2
14;RAYMOND PUTRA ARISHTA;240431;240431;kualitas99;Petugas;5
15;PUTRI AMARANGGANA KUSUMANINGRUM;240429;240429;kualitas99;Petugas;4
16;RANIA AKMALIA;240430;240430;kualitas99;Petugas;3
17;SANIA ZAHRA;240432;240432;kualitas99;Petugas;4
18;APRILIA RIFKA SAVITRI;240420;240420;kualitas99;Petugas;1
19;EBIET PANCA NUGROHO PUTRA;240423;240423;kualitas99;Petugas;2
20;ZAHRAH VITA APRIANTI;240435;240435;kualitas99;Petugas;6
21;LAILA PUTRI WAHYUNI;240425;240425;kualitas99;Team Leader;
22;MARIZKA ULFA AMELIA;240426;240426;kualitas99;Petugas;1
23;AMALIA KUSUMANINGTYAS;240418;240418;kualitas99;Petugas;5
24;ANNISA CHAIRANI;240419;240419;kualitas99;Petugas;1
25;ARIESTA DAMAYANTI;240421;240421;kualitas99;Petugas;1
26;TRIAN WISJAYANTO;240433;240433;kualitas99;Petugas;4
27;MAULINA ISTIGHFAROH;240427;240427;kualitas99;Quality Assurance;
28;YULIANTI LESTARI;240434;240434;kualitas99;Petugas;2
29;JENI FOURLIAN KRISTIANI HAREFA;240424;240424;kualitas99;Petugas;2
30;RAHMANIAR ADE KHOIRUNNISA;240436;240436;kualitas99;Petugas;1
31;AFIFUDDIN YUSUF;240437;240437;kualitas99;Petugas;1
32;DIVANADIA DELLA ROSANIA;240438;240438;kualitas99;Petugas;3
33;PRIMANISA BETARI;240439;240439;kualitas99;Petugas;3
34;MARIA GITA YUDASARI;240964;240964;kualitas99;Petugas;6
35;SAFRIDA ISNA SIFA;241092;241092;kualitas99;Petugas;1
36;FARIDA WAHYU NOVITASARI;241120;241120;kualitas99;Petugas;2
37;ERIN DIAN ASTUTIK;250555;250555;kualitas99;Petugas;6
38;WINDA PANGESTU;250554;250554;kualitas99;Petugas;3
39;FARIS ABID DARMAWAN;250553;250553;kualitas99;Petugas;5
40;AGNI CAHYA PRATIWI;250552;250552;kualitas99;Petugas;5
41;ROZI RISANG PAHLAWAN;250551;250551;kualitas99;Petugas;5
42;DEAN ARISTYA VIERO;251015;251015;kualitas99;Petugas;3
43;DIFA NUR ARDYANI;251014;251014;kualitas99;Petugas;2
44;MUHAMMAD WAFIQ NAJA;251013;251013;kualitas99;Petugas;4
45;SALSABILA ASYSYIFATUL 'ULLIYA;251012;251012;kualitas99;Petugas;5
46;ZULFANI RACHMADANTI;251052;251052;kualitas99;Petugas;6
47;HASNA FARAH SALSABELLA;251053;251053;kualitas99;Petugas;6
48;RAHISNA NURFI BARIDA;251054;251054;kualitas99;Petugas;3
49;JIHAN FADILATUR ROHMAH;251055;251055;kualitas99;Petugas;2
50;DWI APRILIANA;251056;251056;kualitas99;Petugas;4
51;ADRIAN MUHAMAD FAJAR;230279;230279;kualitas99;Quality Assurance;
52;AVI AFIAN SYAH;230276;230276;kualitas99;Team Leader;
53;BUNGA RAHMAWATI;230273;230273;kualitas99;Petugas;1
54;EKA NUR MAGHFIROH;230278;230278;kualitas99;Petugas;2
55;ELLY RISKA DWI SAMGARI;230282;230282;kualitas99;Petugas;3
56;HIILFI AULIA;230272;230272;kualitas99;Petugas;3
57;MAR'ATUL SARIFAH;230270;230270;kualitas99;Petugas;6
58;MAZRO'ATUL KHASANAH;230271;230271;kualitas99;Team Leader;
59;NICKY NASTITI KARYA DEWI;230275;230275;kualitas99;Petugas;5
60;NOVA FARAH DIBA;230359;230359;kualitas99;Petugas;6
61;SALSABILA AUDREY PUSPITASARI;230277;230277;kualitas99;Petugas;5
62;SHINTA NURANI;230281;230281;kualitas99;Petugas;1
63;IKHSAN BURHANUDIN;240967;240967;kualitas99;Petugas;4
64;DANIEL EVAN WIJAYA;250550;250550;kualitas99;Petugas;1
65;HAFIDZ MUHAMMAD WILDAN;251016;251016;kualitas99;Petugas;2
66;RAFARLA MARITZA ARDYA KUSUMA;251245;251245;kualitas99;Petugas;5
67;DIAH RAHMAWATI SUKMA;251246;251246;kualitas99;Petugas;6
68;CLARA MELINDA SEKAR TANJUNG;251250;251250;kualitas99;Petugas;1
69;SHOFI MUTIARA AZMI;260074;260074;kualitas99;Petugas;2
70;LELY RAHMAWATININGRUM;260073;260073;kualitas99;Petugas;3
71;RISKA RIADANI;260374;260374;kualitas99;Petugas;1
72;ANANDA SATRIATAMA;260377;260377;kualitas99;Petugas;1
73;YUWAN PRADANA;260378;260378;kualitas99;Petugas;1
74;RHANINDRA AVIANA YUMNA SHAFIRA;260381;260381;kualitas99;Petugas;2
75;MELANI ARINA PRADITA;260382;260382;kualitas99;Petugas;2
76;ELI WULANDARI;260388;260388;kualitas99;Petugas;2
77;FRIDA ANANTA;260384;260384;kualitas99;Petugas;3
78;ANISA NUR ANDRIYANI;260385;260385;kualitas99;Petugas;3
79;MUHAMMAD A'INUL HAKIM;260390;260390;kualitas99;Petugas;3
80;NUR ARIFAH;260375;260375;kualitas99;Petugas;4
81;NOVITA WIBOWO;260379;260379;kualitas99;Petugas;4
82;DITA ANGGUN DWI PUSPITA;260383;260383;kualitas99;Petugas;4
83;RIVALDO ARYA DUTA;260391;260391;kualitas99;Petugas;4
84;ROSYIAN SALSABILA;260386;260386;kualitas99;Petugas;5
85;NAELA MUKAROMAH;260389;260389;kualitas99;Petugas;5
86;DELIA AYU RAHMAWATI;260376;260376;kualitas99;Petugas;6
87;ANINDA LATHIFFAH;260380;260380;kualitas99;Petugas;6
88;DINDA MUTIA HIDAYATI;260387;260387;kualitas99;Petugas;6
89;WIDURI PUTRI NINGSIH;260544;260544;kualitas99;Petugas;6
90;PUTRI VADIA DHAMAYANTI;260516;260516;kualitas99;Petugas;4`;
    const lines = rawData.split('\\n').slice(1);
    const newUsers: Omit<User, 'id'>[] = lines.map(line => {
      const [no, name, nip, username, password, roleLabel, team] = line.split(';');
      let role: UserRole = 'petugas';
      if (roleLabel === 'Quality Assurance') role = 'qa';
      else if (roleLabel === 'Team Leader') role = 'team_leader';
      
      return {
        name,
        nip,
        username,
        password,
        role,
        team: team ? `TIM ${team}` : undefined,
        email: `${username}@bpjskesehatan.go.id`
      };
    });
    bulkUsersCreate(newUsers);
  };

  const login = (usernameInput: string, passwordInput: string): { success: boolean; message?: string } => {
    const trimmedUser = usernameInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    if (!trimmedUser || !trimmedPass) {
      return { success: false, message: 'Harap masukkan username atau NIP dan kata sandi.' };
    }

    const userList = users.length > 0 ? users : INITIAL_USERS;
    const found = userList.find(
      (u) =>
        u.username.toLowerCase() === trimmedUser ||
        (u.nip && u.nip.toLowerCase() === trimmedUser) ||
        (u.email && u.email.toLowerCase() === trimmedUser)
    );

    if (found) {
      const expectedPass = found.password || (found.role === 'admin' || found.role === 'pusat' ? '150bisa' : 'kualitas99');
      if (expectedPass !== trimmedPass) {
        return { success: false, message: 'Username atau kata sandi tidak sesuai. Silakan periksa kembali.' };
      }
      const expiresAt = Date.now() + MAX_SESSION_DURATION_MS;
      setSessionExpiresAt(expiresAt);
      setSessionExpiredMessage(null);
      safeSessionStorage.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());
      safeSessionStorage.setItem(STORAGE_KEYS.SESSION_EXPIRES, expiresAt.toString());
      safeSessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(found));
      safeStorage.removeItem(STORAGE_KEYS.USER);
      setCurrentUser(found);
      setActiveTab('dashboard');
      return { success: true };
    }

    if (trimmedUser === 'senada' && trimmedPass === '150bisa') {
      const adminUser: User = INITIAL_USERS[0];
      const expiresAt = Date.now() + MAX_SESSION_DURATION_MS;
      setSessionExpiresAt(expiresAt);
      setSessionExpiredMessage(null);
      safeSessionStorage.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());
      safeSessionStorage.setItem(STORAGE_KEYS.SESSION_EXPIRES, expiresAt.toString());
      safeSessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(adminUser));
      safeStorage.removeItem(STORAGE_KEYS.USER);
      setCurrentUser(adminUser);
      setActiveTab('dashboard');
      return { success: true };
    }

    return { success: false, message: 'Username atau kata sandi tidak sesuai. Silakan periksa kembali.' };
  };

  const logout = (customMessage?: string) => {
    setCurrentUser(null);
    setSessionExpiresAt(null);
    safeSessionStorage.removeItem(STORAGE_KEYS.USER);
    safeSessionStorage.removeItem(STORAGE_KEYS.SESSION_START);
    safeSessionStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRES);
    safeStorage.removeItem(STORAGE_KEYS.USER);
    if (customMessage) {
      setSessionExpiredMessage(customMessage);
    }
    setActiveTab('dashboard');
  };

  const clearSessionExpiredMessage = () => {
    setSessionExpiredMessage(null);
  };

  const changePassword = (oldPass: string, newPass: string): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'Sesi Anda telah berakhir. Silakan login kembali.' };
    }
    const expectedPass = currentUser.password || (currentUser.role === 'admin' || currentUser.role === 'pusat' ? '150bisa' : 'kualitas99');
    if (oldPass !== expectedPass) {
      return { success: false, message: 'Password lama yang Anda masukkan tidak sesuai.' };
    }
    if (!newPass || newPass.trim().length < 6) {
      return { success: false, message: 'Password baru minimal harus terdiri dari 6 karakter.' };
    }
    if (newPass === oldPass) {
      return { success: false, message: 'Password baru tidak boleh sama persis dengan password lama.' };
    }

    updateUser(currentUser.id, { password: newPass });
    return { success: true, message: 'Password Anda berhasil diperbarui.' };
  };

  // Switch role convenience with active tab guard & session refresh
  const switchRole = (role: User['role']) => {
    const targetUser = users.find((u) => u.role === role);
    if (targetUser) {
      const expiresAt = Date.now() + MAX_SESSION_DURATION_MS;
      setSessionExpiresAt(expiresAt);
      safeSessionStorage.setItem(STORAGE_KEYS.SESSION_START, Date.now().toString());
      safeSessionStorage.setItem(STORAGE_KEYS.SESSION_EXPIRES, expiresAt.toString());
      safeSessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(targetUser));
      safeStorage.removeItem(STORAGE_KEYS.USER);
      setCurrentUser(targetUser);
      const roleAllowedTabs: Record<UserRole, string[]> = {
        admin: ['dashboard', 'sampling', 'inbox-petugas', 'inbox-sanggah-qa', 'history', 'kalibrasi', 'indicators', 'google-sheet', 'users-management'],
        pusat: ['dashboard', 'kalibrasi', 'indicators', 'history'],
        team_leader: ['dashboard', 'inbox-petugas', 'history'],
        petugas: ['dashboard', 'inbox-petugas', 'history'],
        qa: ['dashboard', 'sampling', 'inbox-sanggah-qa', 'history', 'kalibrasi', 'indicators', 'google-sheet'],
      };
      if (!roleAllowedTabs[role]?.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  };

  // Indicator Management Handlers (Tersimpan di server Firestore & cache)
  const addIndicator = async (newInd: Omit<Indicator, 'id'>): Promise<{ success: boolean; error?: string }> => {
    const id = `IND-${Date.now().toString().slice(-6)}`;
    const indObj: Indicator = { ...newInd, id };
    setIndicators((prev) => {
      const next = [...prev, indObj];
      safeStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(next));
      return next;
    });

    try {
      await safeSetDoc(doc(db, 'indicators', id), indObj);
      return { success: true };
    } catch (e: any) {
      console.warn('Firestore addIndicator deferred:', e);
      return { success: true };
    }
  };

  const updateIndicator = async (id: string, updated: Partial<Indicator>): Promise<{ success: boolean; error?: string }> => {
    setIndicators((prev) => {
      const next = prev.map((ind) => (ind.id === id ? { ...ind, ...updated } : ind));
      safeStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(next));
      return next;
    });

    try {
      await safeSetDoc(doc(db, 'indicators', id), { ...updated, id }, { merge: true });
      return { success: true };
    } catch (e: any) {
      console.warn('Firestore updateIndicator deferred:', e);
      return { success: true };
    }
  };

  const updateMultipleIndicators = async (
    updates: { id: string; bobot?: number; nama?: string; deskripsi?: string; nomorSOP?: number }[]
  ): Promise<{ success: boolean; error?: string }> => {
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    setIndicators((prev) => {
      const next = prev.map((ind) => {
        const u = updateMap.get(ind.id);
        return u ? { ...ind, ...u } : ind;
      });
      safeStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(next));
      return next;
    });

    try {
      for (const u of updates) {
        await safeSetDoc(doc(db, 'indicators', u.id), u, { merge: true });
      }
      return { success: true };
    } catch (e: any) {
      console.warn('Firestore updateMultipleIndicators deferred:', e);
      return { success: true };
    }
  };

  const applyStandardSopWeights = async (): Promise<{ success: boolean; error?: string }> => {
    // Standar Resmi SOP BPJS Kesehatan:
    // 1. Salam Pembuka 5%
    // 2. Menyapa Peserta 5%
    // 14. Pemilihan Topik Masalah 10%
    // 15. Analisis 15%
    // 16. Akurasi Informasi 20%
    // 17. Edukasi Tambahan 5%
    // 18. Kesesuaian Tindak Lanjut 10%
    // 19. Pemilihan Kata Dan Bahasa 10%
    // 20. Kemampuan Presentasi 10%
    // 21. Edukasi Rating 5%
    // 22. Salam Penutup 5%
    const standardMap: Record<string, { nomorSOP: number; bobot: number }> = {
      'salam pembuka': { nomorSOP: 1, bobot: 5 },
      'menyapa peserta': { nomorSOP: 2, bobot: 5 },
      'pemilihan topik masalah': { nomorSOP: 14, bobot: 10 },
      'analisis': { nomorSOP: 15, bobot: 15 },
      'anaisis': { nomorSOP: 15, bobot: 15 },
      'akurasi informasi': { nomorSOP: 16, bobot: 20 },
      'edukasi tambahan': { nomorSOP: 17, bobot: 5 },
      'kesesuaian tindak lanjut': { nomorSOP: 18, bobot: 10 },
      'pemilihan kata dan bahasa': { nomorSOP: 19, bobot: 10 },
      'kemampuan presentasi': { nomorSOP: 20, bobot: 10 },
      'edukasi rating': { nomorSOP: 21, bobot: 5 },
      'salam penutup': { nomorSOP: 22, bobot: 5 },
    };

    const updated = indicators.map((ind, idx) => {
      const match = standardMap[ind.nama.trim().toLowerCase()] ||
                    INITIAL_INDICATORS.find((d) => d.id === ind.id) ||
                    INITIAL_INDICATORS[idx];
      if (match) {
        return {
          ...ind,
          nomorSOP: match.nomorSOP,
          bobot: match.bobot,
        };
      }
      return ind;
    });

    setIndicators(updated);
    safeStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(updated));

    try {
      for (const ind of updated) {
        await safeSetDoc(doc(db, 'indicators', ind.id), { bobot: ind.bobot, nomorSOP: ind.nomorSOP }, { merge: true });
      }
      return { success: true };
    } catch (e: any) {
      console.warn('applyStandardSopWeights deferred:', e);
      return { success: true };
    }
  };

  const deleteIndicator = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!id) return { success: false, error: 'ID indikator tidak valid' };

    setIndicators((prev) => {
      const next = prev.filter((ind) => ind.id !== id);
      safeStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(next));
      return next;
    });

    try {
      await deleteDoc(doc(db, 'indicators', id));
      const q = query(collection(db, 'indicators'), where('id', '==', id));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.id !== id) {
          await deleteDoc(d.ref);
        }
      }
      return { success: true };
    } catch (e: any) {
      console.warn('Firestore deleteIndicator deferred:', e);
      return { success: true };
    }
  };

  const resetIndicators = async (): Promise<{ success: boolean; error?: string }> => {
    setIndicators(INITIAL_INDICATORS);
    safeStorage.setItem(STORAGE_KEYS.INDICATORS, JSON.stringify(INITIAL_INDICATORS));
    try {
      const snap = await getDocs(collection(db, 'indicators'));
      const initialIds = new Set(INITIAL_INDICATORS.map((i) => i.id));
      for (const d of snap.docs) {
        if (!initialIds.has(d.id)) {
          await deleteDoc(doc(db, 'indicators', d.id));
        }
      }
      for (const ind of INITIAL_INDICATORS) {
        await safeSetDoc(doc(db, 'indicators', ind.id), ind);
      }
      return { success: true };
    } catch (e: any) {
      console.warn('Reset indicators Firestore deferred:', e);
      return { success: true };
    }
  };

  // Google Sheet & CSV Sync Handlers
  // Google Sheet & CSV/Excel Sync Handlers
  const syncGoogleSheet = async (
    customUrl?: string,
    onProgress?: (percent: number, stepText: string) => void
  ): Promise<{ success: boolean; message: string; count?: number; error?: string }> => {
    const targetUrl = customUrl || sheetConfig.url;
    if (!targetUrl || !targetUrl.trim()) {
      return { success: false, message: 'URL Google Sheet tidak boleh kosong' };
    }

    setSheetConfig((prev) => ({ ...prev, status: 'syncing', errorMessage: undefined }));
    onProgress?.(20, 'Menghubungkan ke Google Sheet...');

    try {
      onProgress?.(35, 'Mengunduh data spreadsheet melalui proxy server...');

      let rawData: string = '';
      let fetchError: string | null = null;

      // 1. Try server proxy endpoint first
      try {
        const res = await fetch('/api/proxy-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        });

        const rawText = await res.text();
        let json: any = null;

        if (rawText && rawText.trim()) {
          try {
            json = JSON.parse(rawText);
          } catch {
            // rawText might be direct CSV or plaintext
            if (res.ok && !rawText.trim().startsWith('<!DOCTYPE') && !rawText.trim().startsWith('<html')) {
              rawData = rawText;
            }
          }
        }

        if (json && json.success && json.csv) {
          rawData = json.csv;
        } else if (json && json.error) {
          fetchError = json.error;
        } else if (!res.ok) {
          fetchError = `Server proxy merespons HTTP ${res.status}: ${res.statusText || 'Terjadi gangguan jaringan'}`;
        }
      } catch (err: any) {
        console.warn('Proxy fetch failed, attempting direct browser fetch:', err);
        fetchError = err?.message || 'Gagal menghubungi server proxy';
      }

      // 2. Direct browser fetch fallback (for Google Apps Script Web Apps with CORS or public CSVs)
      if (!rawData) {
        onProgress?.(50, 'Mencoba koneksi langsung ke webservice/spreadsheet...');
        try {
          // Direct fetch
          const directRes = await fetch(targetUrl, {
            headers: { Accept: 'application/json, text/csv, text/plain, */*' },
          });
          const directText = await directRes.text();
          if (
            directRes.ok &&
            directText.trim() &&
            !directText.trim().startsWith('<!DOCTYPE') &&
            !directText.trim().startsWith('<html')
          ) {
            rawData = directText;
            fetchError = null;
          }
        } catch (directErr) {
          console.warn('Direct fetch notice:', directErr);
        }

        // If direct fetch didn't work and URL is a standard Google Sheet, try client-side gviz URL
        if (!rawData) {
          const sheetIdMatch =
            targetUrl.match(/\/spreadsheets(?:\/u\/\d+)?\/d\/([a-zA-Z0-9-_]+)/) ||
            targetUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
          const gidMatch = targetUrl.match(/[#&?]gid=([0-9]+)/);
          const gid = gidMatch ? gidMatch[1] : '0';

          if (sheetIdMatch) {
            const sheetId = sheetIdMatch[1];
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000);
              const gvizDirect = await fetch(
                `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
                { signal: controller.signal }
              );
              clearTimeout(timeoutId);
              const gvizText = await gvizDirect.text();
              if (
                gvizDirect.ok &&
                gvizText.trim() &&
                !gvizText.trim().startsWith('<!DOCTYPE') &&
                !gvizText.trim().startsWith('<html')
              ) {
                rawData = gvizText;
                fetchError = null;
              }
            } catch {
              // ignore
            }
          }
        }
      }

      if (!rawData || !rawData.trim()) {
        const detailedMsg =
          fetchError ||
          'Webservice atau Google Sheet mengembalikan data kosong (0 byte). Pastikan tautan aktif, Google Apps Script telah di-deploy dengan opsi "Who has access: Anyone", atau pengaturan Google Sheet diset ke "Anyone with the link can view".';
        throw new Error(detailedMsg);
      }

      onProgress?.(65, 'Menganalisis baris data & memetakan 9 kolom standar...');

      const parsed = parseCSV(rawData);
      if (parsed.data.length === 0) {
        throw new Error(
          'Tidak ada baris data tiket valid yang dapat diimpor dari tautan tersebut. Pastikan berkas memiliki header kolom atau data tiket (nomor tiket, isi keluhan, isi jawaban).'
        );
      }

      onProgress?.(85, `Memproses ${parsed.data.length} tiket secara batch...`);

      const isNewLink = sheetConfig.url && sheetConfig.url.trim() !== '' && sheetConfig.url !== targetUrl;
      let addedCount = 0;
      let totalCount = 0;

      if (isNewLink) {
        // Fast batch delete previous data
        const [ticketSnap, evalSnap, calSnap] = await Promise.all([
          getDocs(collection(db, 'tickets')),
          getDocs(collection(db, 'evaluations')),
          getDocs(collection(db, 'calibrations')),
        ]);

        await Promise.all([
          batchDeleteDocs(ticketSnap.docs),
          batchDeleteDocs(evalSnap.docs),
          batchDeleteDocs(calSnap.docs),
        ]);

        // Batch set all parsed tickets
        const itemsToSet = parsed.data.map((t) => ({
          path: 'tickets',
          id: t.nomorTiket,
          data: t,
        }));
        await batchSetDocs(itemsToSet);

        totalCount = parsed.data.length;
        addedCount = parsed.data.length;
        setTickets(parsed.data);
      } else {
        const existingMap = new Map(tickets.map((t) => [t.nomorTiket, t]));
        const itemsToSet: { path: string; id: string; data: Ticket }[] = [];

        for (const newT of parsed.data) {
          const oldT = existingMap.get(newT.nomorTiket);
          if (!oldT) {
            // Tiket baru yang belum ada pada sistem: ditambahkan tanpa menghapus atau mengganti data lama
            addedCount++;
            const normalizedT: Ticket = {
              ...newT,
              kategori: cleanCategory(newT.kategori),
              sampled: false,
            };
            existingMap.set(newT.nomorTiket, normalizedT);
            itemsToSet.push({ path: 'tickets', id: newT.nomorTiket, data: normalizedT });
          }
        }

        if (itemsToSet.length > 0) {
          await batchSetDocs(itemsToSet);
        }

        totalCount = existingMap.size;
        setTickets(Array.from(existingMap.values()));
      }

      const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const newConfig = {
        url: targetUrl,
        lastSyncedAt: now,
        autoSync: true,
        totalSyncedRows: totalCount,
        status: 'success' as const,
      };
      setSheetConfig(newConfig);
      await safeSetDoc(doc(db, 'config', 'sheetConfig'), newConfig);

      if (isNewLink) {
        onProgress?.(100, `Sinkronisasi selesai! Data baru menggantikan data sebelumnya (${totalCount} tiket).`);
        return {
          success: true,
          message: `Sinkronisasi berhasil. Link baru disinkronkan, data sebelumnya digantikan dengan ${totalCount} tiket baru.`,
          count: totalCount,
        };
      } else {
        onProgress?.(100, `Sinkronisasi selesai! ${addedCount} data baru ditambahkan (Total: ${totalCount} tiket).`);
        return {
          success: true,
          message: `Sinkronisasi berhasil. ${addedCount} data baru ditambahkan, total: ${totalCount} tiket aktif.`,
          count: totalCount,
        };
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Terjadi kesalahan jaringan saat sinkronisasi.';
      setSheetConfig((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: errorMsg,
      }));
      return { success: false, message: errorMsg, error: errorMsg };
    }
  };

  const importExcelFile = async (
    file: File,
    onProgress?: (percent: number, stepText: string) => void
  ): Promise<{ success: boolean; message: string; count?: number; error?: string }> => {
    setSheetConfig((prev) => ({ ...prev, status: 'syncing', errorMessage: undefined }));

    try {
      const parsed = await parseExcelFile(file, onProgress);
      if (parsed.data.length === 0) {
        throw new Error('Tidak ditemukan data baris tiket yang valid dalam berkas Excel ini.');
      }

      onProgress?.(90, `Menyimpan ${parsed.data.length} tiket secara batch...`);

      let addedCount = 0;
      let totalCount = 0;
      const existingMap = new Map(tickets.map((t) => [t.nomorTiket, t]));
      const itemsToSet: { path: string; id: string; data: Ticket }[] = [];

      for (const newT of parsed.data) {
        if (!existingMap.has(newT.nomorTiket)) {
          existingMap.set(newT.nomorTiket, newT);
          addedCount++;
          itemsToSet.push({ path: 'tickets', id: newT.nomorTiket, data: newT });
        }
      }

      if (itemsToSet.length > 0) {
        await batchSetDocs(itemsToSet);
      }

      totalCount = existingMap.size;
      setTickets(Array.from(existingMap.values()));

      const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const newConfig = {
        url: `Berkas Excel: ${file.name}`,
        lastSyncedAt: now,
        autoSync: false,
        totalSyncedRows: totalCount,
        status: 'success' as const,
      };
      setSheetConfig(newConfig);
      await safeSetDoc(doc(db, 'config', 'sheetConfig'), newConfig);

      onProgress?.(100, `Impor selesai! ${addedCount} data baru ditambahkan (Total: ${totalCount} tiket).`);

      return {
        success: true,
        message: `Impor Excel berhasil. ${addedCount} data baru ditambahkan, catatan data sebelumnya tetap aman.`,
        count: totalCount,
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Gagal memproses berkas Excel.';
      setSheetConfig((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: errorMsg,
      }));
      return { success: false, message: errorMsg, error: errorMsg };
    }
  };

  const loadSampleSheetData = async (
    onProgress?: (percent: number, stepText: string) => void
  ): Promise<{ success: boolean; message: string; count: number }> => {
    onProgress?.(25, 'Menyiapkan dataset simulasi BPJS Kesehatan...');

    const sampleCSV = generateSampleGoogleSheetCSV();
    const parsed = parseCSV(sampleCSV);

    onProgress?.(70, 'Memuat tiket secara batch...');

    const existingMap = new Map(tickets.map((t) => [t.nomorTiket, t]));
    const itemsToSet: { path: string; id: string; data: Ticket }[] = [];

    for (const t of parsed.data) {
      if (!existingMap.has(t.nomorTiket)) {
        existingMap.set(t.nomorTiket, t);
        itemsToSet.push({ path: 'tickets', id: t.nomorTiket, data: t });
      }
    }

    if (itemsToSet.length > 0) {
      await batchSetDocs(itemsToSet);
    }
    setTickets(Array.from(existingMap.values()));

    const newConfig = {
      url: 'Simulasi Dataset Resmi BPJS',
      lastSyncedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      autoSync: false,
      totalSyncedRows: existingMap.size,
      status: 'success' as const,
      errorMessage: undefined,
    };
    setSheetConfig(newConfig);
    await safeSetDoc(doc(db, 'config', 'sheetConfig'), newConfig);

    onProgress?.(100, `Dataset sampel berhasil dimuat (${parsed.data.length} tiket).`);

    return {
      success: true,
      message: `Berhasil memuat dataset simulasi resmi BPJS (${parsed.data.length} tiket).`,
      count: parsed.data.length,
    };
  };

  const importCSVText = async (
    csvText: string,
    onProgress?: (percent: number, stepText: string) => void
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      onProgress?.(30, 'Menganalisis teks CSV & mendeteksi pemisah...');
      const parsed = parseCSV(csvText);
      if (parsed.data.length === 0) {
        return { success: false, count: 0, error: 'Format CSV tidak valid atau baris kosong.' };
      }
      onProgress?.(80, `Memvalidasi ${parsed.data.length} baris tiket & menyimpan ke server...`);

      for (const t of parsed.data) {
        await safeSetDoc(doc(db, 'tickets', t.nomorTiket), t);
      }

      onProgress?.(100, `Berhasil mengimpor ${parsed.data.length} tiket.`);
      return { success: true, count: parsed.data.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e?.message || 'Gagal memproses data CSV' };
    }
  };

  // AI Automated Evaluation Caller
  const evaluateTicketWithAI = async (ticket: Ticket) => {
    try {
      const res = await fetch('/api/evaluate-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket,
          indicators,
        }),
      });

      const rawText = await res.text();
      let json: any = null;
      if (rawText && rawText.trim()) {
        try {
          json = JSON.parse(rawText);
        } catch {
          json = null;
        }
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Gagal melakukan penilaian otomatis AI (Status: ${res.status})`);
      }

      return {
        success: true,
        scores: json.scores as IndicatorScore[],
        totalScore: json.totalScore as number,
        aiAnalysis: json.aiAnalysis,
        isAi: json.isAi,
      };
    } catch (err: any) {
      console.error('AI Eval Error:', err);
      const fallbackScores: IndicatorScore[] = indicators.map((ind) => ({
        indicatorId: ind.id,
        score: 82,
        notes: `Penilaian standar indikator ${ind.nama}`,
      }));
      return {
        success: true,
        scores: fallbackScores,
        totalScore: 82,
        aiAnalysis: {
          ringkasan: 'Penilaian standar sistem berdasarkan kriteria responsifitas.',
          kelebihan: ['Penyampaian sopan dan jelas'],
          kekurangan: ['Perlu penegasan kembali batas waktu tindak lanjut'],
          saran: 'Lengkapi dengan nomor kanal layanan resmi.',
        },
        isAi: false,
        error: err?.message,
      };
    }
  };

  // Create Sampling by QA
  const createSamplingEvaluation = ({
    ticket,
    scores,
    catatanAwalQA,
    isAiEvaluated = false,
    aiAnalysis,
  }: {
    ticket: Ticket;
    scores: IndicatorScore[];
    catatanAwalQA: string;
    isAiEvaluated?: boolean;
    aiAnalysis?: SamplingEvaluation['aiAnalysis'];
  }): SamplingEvaluation => {
    const totalBobot = indicators.reduce((acc, i) => acc + (Number(i.bobot) || 0), 0) || 100;
    const weightedSum = scores.reduce((acc, s) => {
      const ind = indicators.find((i) => i.id === s.indicatorId);
      return acc + (s.score * (ind?.bobot || 0));
    }, 0);
    const nilaiAwal = Math.round((weightedSum / totalBobot) * 10) / 10;

    const samplingId = `SMP-${Date.now().toString().slice(-6)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Resolve petugas team from users list
    const petugasObj = users.find(
      (u) => u.name.toLowerCase() === ticket.namaPetugas.toLowerCase()
    );
    const petugasTeam = petugasObj?.team || 'TIM 1';

    const newEvaluation: SamplingEvaluation = {
      id: samplingId,
      nomorTiket: ticket.nomorTiket,
      ticket: { ...ticket, sampled: true, samplingId },
      qaId: currentUser?.id || '',
      qaName: currentUser?.name || '',
      petugasTeam,
      tanggalSampling: nowStr.slice(0, 10),
      scores,
      nilaiAwal,
      catatanAwalQA,
      isAiEvaluated,
      aiAnalysis,
      status: 'MENUNGGU_REVIEW_PETUGAS',
      nilaiFinal: nilaiAwal,
      isCalibrated: false,
      history: [
        {
          timestamp: nowStr,
          actor: currentUser?.name || '',
          role: 'Quality Assurance',
          action: 'Sampling jawaban dan penilaian awal',
          note: `Nilai Awal QA: ${nilaiAwal}. Hasil diteruskan ke Petugas (${ticket.namaPetugas}) dan Team Leader (${petugasTeam}).`,
        },
      ],
    };

    setTickets((prev) =>
      prev.map((t) =>
        t.nomorTiket === ticket.nomorTiket
          ? { ...t, sampled: true, samplingId }
          : t
      )
    );

    setEvaluations((prev) => [newEvaluation, ...prev]);

    safeSetDoc(doc(db, 'evaluations', samplingId), newEvaluation);
    safeSetDoc(doc(db, 'tickets', ticket.nomorTiket), { ...ticket, sampled: true, samplingId }, { merge: true });

    return newEvaluation;
  };

  const deleteEvaluationsByPeriod = async (period: string) => {
    try {
      let toDelete: SamplingEvaluation[] = [];
      if (period === 'all') {
        toDelete = evaluations;
      } else {
        toDelete = evaluations.filter((e) => e.tanggalSampling && e.tanggalSampling.startsWith(period));
      }

      if (toDelete.length === 0) {
        return { success: false, message: 'Tidak ada data evaluasi pada periode tersebut.', count: 0 };
      }

      const ticketNumbersToReset = new Set(toDelete.map((e) => e.nomorTiket));
      const docRefs = toDelete.map((e) => doc(db, 'evaluations', e.id));
      await batchDeleteDocs(docRefs);

      const deleteIds = new Set(toDelete.map((e) => e.id));
      setEvaluations((prev) => prev.filter((e) => !deleteIds.has(e.id)));

      setTickets((prev) =>
        prev.map((t) => {
          if (ticketNumbersToReset.has(t.nomorTiket)) {
            const updated = { ...t, sampled: false, samplingId: undefined };
            safeSetDoc(doc(db, 'tickets', t.nomorTiket), updated, { merge: true });
            return updated;
          }
          return t;
        })
      );

      return {
        success: true,
        message: `Berhasil menghapus ${toDelete.length} data evaluasi/sampling untuk periode ${period === 'all' ? 'Semua Periode' : period}.`,
        count: toDelete.length,
      };
    } catch (e: any) {
      handleFirestoreError(e, 'deleteEvaluationsByPeriod', null);
      return { success: false, message: e?.message || 'Gagal menghapus data evaluasi.', count: 0 };
    }
  };

  const importEvaluationsFromExcel = async (
    file: File,
    onProgress?: (percent: number, stepText: string) => void
  ): Promise<{ success: boolean; message: string; count?: number; error?: string }> => {
    try {
      onProgress?.(20, 'Membaca berkas Excel history & nilai akhir...');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return { success: false, message: 'File Excel tidak memiliki lembar kerja (sheet).' };
      }
      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rows || rows.length < 2) {
        return { success: false, message: 'File Excel kosong atau tidak memiliki baris data.' };
      }

      const activeIndicators = indicators.length > 0 ? indicators : INITIAL_INDICATORS;

      const userMapByName = new Map<string, User>();
      users.forEach((u) => userMapByName.set(u.name.trim().toLowerCase(), u));
      const newUsersToSave: User[] = [];

      const newEvaluations: SamplingEvaluation[] = [];
      const newTickets: Ticket[] = [];
      const totalRows = rows.length - 1;

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !Array.isArray(row) || row.every((c) => c === '' || c === undefined || c === null)) {
          continue;
        }

        const pct = Math.min(85, 20 + Math.round(((r - 1) / totalRows) * 60));
        if (r % 5 === 0 || r === 1) {
          onProgress?.(pct, `Memproses baris ${r} dari ${totalRows} (Menghitung nilai indikator)...`);
        }

        // Helper to parse dd/mm/yyyy or excel date
        const parseDmyDate = (val: any): string => {
          if (!val) return new Date().toISOString().slice(0, 10);
          if (val instanceof Date && !isNaN(val.getTime())) {
            return val.toISOString().slice(0, 10);
          }
          if (typeof val === 'number') {
            try {
              const parsed = XLSX.SSF.parse_date_code(val);
              if (parsed) {
                const y = parsed.y;
                const m = String(parsed.m).padStart(2, '0');
                const d = String(parsed.d).padStart(2, '0');
                return `${y}-${m}-${d}`;
              }
            } catch {
              const date = new Date(Math.round((val - 25569) * 86400 * 1000));
              if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
            }
          }
          const str = String(val).trim();
          const matchDmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
          if (matchDmy) {
            const d = matchDmy[1].padStart(2, '0');
            const m = matchDmy[2].padStart(2, '0');
            const y = matchDmy[3];
            return `${y}-${m}-${d}`;
          }
          if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
            return str.slice(0, 10);
          }
          const parsed = new Date(str);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
          }
          return new Date().toISOString().slice(0, 10);
        };

        const nomorTiket = String(row[0] || '').trim() || `TKT-${new Date().getFullYear()}-${String(r).padStart(4, '0')}`;
        const tanggalTiket = parseDmyDate(row[1]);
        const kategori = cleanCategory(row[2] || 'Informasi');
        const pokokMasalah = String(row[3] || 'Pelayanan Faskes').trim();
        const topikMasalah = String(row[4] || 'Layanan Umum').trim();
        const isiKeluhan = String(row[5] || 'Keluhan peserta dari upload history.').trim();
        const isiJawaban = String(row[6] || 'Jawaban petugas dari upload history.').trim();
        const rating = Number(row[7]) || 5;
        const namaPetugas = String(row[8] || 'Petugas Layanan').trim();
        const tanggalSampling = parseDmyDate(row[9]);
        const qaName = String(row[10] || currentUser?.name || 'Quality Assurance').trim();

        const scores: IndicatorScore[] = activeIndicators.map((ind, idx) => {
          const cellVal = row[11 + idx];
          let scoreNum = 100;
          if (cellVal !== undefined && cellVal !== '' && cellVal !== null) {
            const strVal = String(cellVal).trim().toUpperCase();
            if (strVal === 'N/A' || strVal === 'NA' || strVal === '-') {
              scoreNum = 100;
            } else {
              const num = Number(cellVal);
              if (!isNaN(num)) {
                if (num === 0) scoreNum = 0;
                else if (num === 1) scoreNum = 33;
                else if (num === 2) scoreNum = 67;
                else if (num === 3) scoreNum = 100;
                else if (num <= 3) {
                  scoreNum = Math.round((num / 3) * 100);
                } else if (num <= 5) {
                  scoreNum = Math.round((num / 5) * 100);
                } else {
                  scoreNum = Math.min(100, Math.max(0, num));
                }
              }
            }
          }
          return {
            indicatorId: ind.id,
            score: scoreNum,
            notes: `Nilai dari upload Excel: ${cellVal ?? scoreNum}`,
          };
        });

        const catatan = String(row[22] || 'Diimpor dari Excel History & Nilai Akhir.').trim();

        const totalBobot = activeIndicators.reduce((acc, i) => acc + (Number(i.bobot) || 0), 0) || 100;
        const weightedSum = scores.reduce((acc, s) => {
          const ind = activeIndicators.find((i) => i.id === s.indicatorId);
          return acc + (s.score * (ind?.bobot || 0));
        }, 0);
        const nilaiAwal = Math.round((weightedSum / totalBobot) * 10) / 10;
        const nilaiFinal = nilaiAwal;

        // Pastikan namaPetugas terdata di user list & server Firestore
        let petugasObj = userMapByName.get(namaPetugas.toLowerCase());
        if (!petugasObj && namaPetugas.trim() !== '') {
          const generatedId = `USR-P-${Date.now().toString().slice(-4)}-${r}`;
          const cleanUser = namaPetugas.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 15) || `petugas${r}`;
          petugasObj = {
            id: generatedId,
            name: namaPetugas.trim(),
            username: cleanUser,
            role: 'petugas',
            email: `${cleanUser}@bpjskesehatan.go.id`,
            team: 'TIM 1',
            nip: `260${String(r).padStart(3, '0')}`,
            password: 'kualitas99',
            division: 'Unit Layanan Informasi',
          };
          userMapByName.set(namaPetugas.toLowerCase(), petugasObj);
          newUsersToSave.push(petugasObj);
        }

        // Pastikan qaName terdata di user list & server Firestore
        let qaObj = userMapByName.get(qaName.toLowerCase());
        if (!qaObj && qaName.trim() !== '') {
          const generatedQaId = `USR-QA-${Date.now().toString().slice(-4)}-${r}`;
          const cleanQa = qaName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 15) || `qa${r}`;
          qaObj = {
            id: generatedQaId,
            name: qaName.trim(),
            username: cleanQa,
            role: 'qa',
            email: `${cleanQa}@bpjskesehatan.go.id`,
            team: '',
            nip: `198${String(r).padStart(4, '0')}`,
            password: 'kualitas99',
            division: 'Unit Penjaminan Mutu Layanan',
          };
          userMapByName.set(qaName.toLowerCase(), qaObj);
          newUsersToSave.push(qaObj);
        }

        const petugasTeam = petugasObj?.team || 'TIM 1';
        const samplingId = `SMP-IMP-${Date.now()}-${r}`;

        const ticket: Ticket = {
          nomorTiket,
          tanggalTiket,
          kategori,
          pokokMasalah,
          topikMasalah,
          isiKeluhan,
          isiJawaban,
          rating,
          namaPetugas: petugasObj?.name || namaPetugas,
          sampled: true,
          samplingId,
        };

        const newEval: SamplingEvaluation = {
          id: samplingId,
          nomorTiket,
          ticket,
          qaId: qaObj?.id || 'qa-imported',
          qaName: qaObj?.name || qaName,
          petugasTeam,
          tanggalSampling,
          scores,
          nilaiAwal,
          catatanAwalQA: catatan,
          status: 'SELESAI_DITERIMA',
          nilaiFinal: nilaiAwal,
          isCalibrated: false,
          history: [
            {
              timestamp: `${tanggalSampling} 09:00:00`,
              actor: qaObj?.name || qaName,
              role: 'Quality Assurance',
              action: 'Import data history dan nilai akhir via Excel',
              note: `Catatan QA (${qaObj?.name || qaName}): ${catatan}. Nilai Final: ${nilaiAwal}. Tercatat resmi pada akun Petugas (${petugasObj?.name || namaPetugas}) dan Team Leader (${petugasTeam}).`,
            },
            {
              timestamp: `${tanggalSampling} 10:00:00`,
              actor: petugasObj?.name || namaPetugas,
              role: 'Petugas',
              action: 'Menerima dan menyetujui hasil sampling',
              note: `Petugas (${petugasObj?.name || namaPetugas}) menyetujui hasil nilai akhir ${nilaiAwal}.`,
            }
          ]
        };

        newEvaluations.push(newEval);
        newTickets.push(ticket);
      }

      if (newEvaluations.length === 0) {
        return { success: false, message: 'Tidak ada baris data valid yang ditemukan pada file Excel.' };
      }

      // Persist any newly registered users from Excel to Firestore server
      if (newUsersToSave.length > 0) {
        const userBatchItems = newUsersToSave.map((u) => ({
          path: 'users',
          id: u.id,
          data: u,
        }));
        await batchSetDocs(userBatchItems);
        setUsers((prev) => {
          const updated = [...prev, ...newUsersToSave];
          safeStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(updated));
          return updated;
        });
      }

      setEvaluations((prev) => [...newEvaluations, ...prev]);
      setTickets((prev) => {
        const map = new Map(prev.map((t) => [t.nomorTiket, t]));
        newTickets.forEach((t) => map.set(t.nomorTiket, t));
        return Array.from(map.values());
      });

      const batchItems = newEvaluations.map((e) => ({
        path: 'evaluations',
        id: e.id,
        data: e,
      }));
      await batchSetDocs(batchItems);

      const ticketBatchItems = newTickets.map((t) => ({
        path: 'tickets',
        id: t.nomorTiket,
        data: t,
      }));
      await batchSetDocs(ticketBatchItems);

      return {
        success: true,
        message: `Berhasil mengimpor ${newEvaluations.length} data riwayat dan nilai akhir dari Excel.`,
        count: newEvaluations.length,
      };
    } catch (err: any) {
      console.error('Import evaluations error:', err);
      return { success: false, message: err?.message || 'Gagal membaca atau memproses berkas Excel.' };
    }
  };

  // Petugas Action: Accept Score
  const submitPetugasAcceptance = (evaluationId: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setEvaluations((prev) =>
      prev.map((item) => {
        if (item.id === evaluationId) {
          const updatedItem = {
            ...item,
            status: 'SELESAI_DITERIMA' as const,
            history: [
              ...item.history,
              {
                timestamp: nowStr,
                actor: currentUser?.name || '',
                role: 'Petugas' as const,
                action: 'Menerima dan menyetujui hasil sampling',
                note: `Petugas menyetujui nilai akhir ${item.nilaiFinal} tanpa sanggahan. Tercatat ke Team Leader (${item.petugasTeam || 'TIM'}).`,
              },
            ],
          };
          safeSetDoc(doc(db, 'evaluations', updatedItem.id), updatedItem);
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Petugas Action: Submit Rebuttal
  const submitPetugasSanggahan = (evaluationId: string, sanggahan: SanggahanData) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setEvaluations((prev) =>
      prev.map((item) => {
        if (item.id === evaluationId) {
          const updatedItem = {
            ...item,
            status: 'PROSES_SANGGAHAN' as const,
            sanggahan,
            history: [
              ...item.history,
              {
                timestamp: nowStr,
                actor: currentUser?.name || '',
                role: 'Petugas' as const,
                action: 'Mengajukan sanggahan penilaian mutu',
                note: `Alasan: "${sanggahan.alasanSanggahan}". Usulan nilai: ${sanggahan.usulanNilai || '-'}. Diteruskan kembali ke QA Penilai (${item.qaName}).`,
              },
            ],
          };
          safeSetDoc(doc(db, 'evaluations', updatedItem.id), updatedItem);
          return updatedItem;
        }
        return item;
      })
    );
  };

  // QA Action: Final Decision
  const submitQaKeputusanAkhir = (evaluationId: string, keputusan: KeputusanAkhirData) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setEvaluations((prev) =>
      prev.map((item) => {
        if (item.id === evaluationId) {
          const updatedItem = {
            ...item,
            status: 'KEPUTUSAN_AKHIR' as const,
            keputusanAkhir: keputusan,
            nilaiFinal: keputusan.nilaiAkhir,
            scores: keputusan.finalScores.length > 0 ? keputusan.finalScores : item.scores,
            history: [
              ...item.history,
              {
                timestamp: nowStr,
                actor: currentUser?.name || '',
                role: 'Quality Assurance' as const,
                action: `Keputusan akhir sanggahan: ${keputusan.statusPutusan.replace('_', ' ')}`,
                note: `Nilai akhir resmi: ${keputusan.nilaiAkhir}. Catatan QA: "${keputusan.catatanPutusanQA}". Nilai masuk ke Petugas (${item.ticket.namaPetugas}) dan Team Leader (${item.petugasTeam || 'TIM'}).`,
              },
            ],
          };
          safeSetDoc(doc(db, 'evaluations', updatedItem.id), updatedItem);
          return updatedItem;
        }
        return item;
      })
    );
  };

  // CALIBRATION MODULE HANDLERS (Admin & Pusat)
  // Tickets sampled by QA that have NOT been calibrated yet (only 1 calibration per sample allowed)
  const uncalibratedEvaluations = useMemo(() => {
    return evaluations.filter((e) => !e.isCalibrated);
  }, [evaluations]);

  const createCalibration = ({
    samplingEvaluation,
    scores,
    catatanKalibrasi,
  }: {
    samplingEvaluation: SamplingEvaluation;
    scores: IndicatorScore[];
    catatanKalibrasi: string;
  }): CalibrationRecord => {
    const totalBobot = indicators.reduce((acc, i) => acc + (Number(i.bobot) || 0), 0) || 100;
    const weightedSum = scores.reduce((acc, s) => {
      const ind = indicators.find((i) => i.id === s.indicatorId);
      return acc + (s.score * (ind?.bobot || 0));
    }, 0);
    const nilaiKalibrasi = Math.round((weightedSum / totalBobot) * 10) / 10;

    const nilaiQA = samplingEvaluation.nilaiAwal; // perbandingan terhadap nilai sampling QA
    const selisihNilai = Math.round(Math.abs(nilaiQA - nilaiKalibrasi) * 10) / 10;
    
    // Persentase kesesuaian / perbandingan nilai QA terhadap nilai Kalibrator:
    const persentase = Math.max(0, Math.min(100, Math.round((1 - selisihNilai / Math.max(nilaiKalibrasi, 1)) * 1000) / 10));

    const calId = `CAL-${Date.now().toString().slice(-6)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 10);

    const newCalibration: CalibrationRecord = {
      id: calId,
      samplingEvaluationId: samplingEvaluation.id,
      nomorTiket: samplingEvaluation.nomorTiket,
      ticket: samplingEvaluation.ticket,
      qaId: samplingEvaluation.qaId,
      qaName: samplingEvaluation.qaName,
      nilaiSamplingQA: nilaiQA,
      scoresQA: samplingEvaluation.scores,
      calibratorId: currentUser?.id || '',
      calibratorName: currentUser?.name || '',
      calibratorRole: (currentUser?.role as 'admin' | 'pusat') || 'admin',
      tanggalKalibrasi: nowStr,
      scoresKalibrasi: scores,
      nilaiKalibrasi,
      persentaseKesesuaian: persentase,
      selisihNilai,
      catatanKalibrasi,
    };

    const updatedEval = {
      ...samplingEvaluation,
      isCalibrated: true,
      calibrationId: calId,
      calibratedBy: {
        id: currentUser?.id || '',
        name: currentUser?.name || '',
        role: (currentUser?.role as 'admin' | 'pusat') || 'admin',
        tanggal: nowStr,
        nilaiKalibrasi,
        kesesuaian: persentase,
      },
      history: [
        ...samplingEvaluation.history,
        {
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actor: currentUser?.name || '',
          role: currentUser?.role === 'admin' ? ('Administrator' as const) : ('Pimpinan Pusat' as const),
          action: 'Melakukan uji sampling kalibrasi mutu',
          note: `Nilai Kalibrasi: ${nilaiKalibrasi}. Kesesuaian mutu: ${persentase}%. Terkunci maksimal 1 kali kalibrasi dan masuk ke history kalibrasi.`,
        },
      ],
    };

    setEvaluations((prev) =>
      prev.map((e) =>
        e.id === samplingEvaluation.id ? updatedEval : e
      )
    );

    // Save calibration record and update evaluation in Firestore
    safeSetDoc(doc(db, 'calibrations', calId), newCalibration);
    safeSetDoc(doc(db, 'evaluations', samplingEvaluation.id), updatedEval, { merge: true });

    setCalibrations((prev) => [newCalibration, ...prev]);

    return newCalibration;
  };

  // Filtered Calibrations
  const filteredCalibrations = useMemo(() => {
    return calibrations.filter((c) => {
      if (calibrationFilters.namaPetugas !== 'all') {
        const matchesPetugas = c.ticket.namaPetugas === calibrationFilters.namaPetugas;
        const matchesQA = c.qaName === calibrationFilters.namaPetugas;
        if (!matchesPetugas && !matchesQA) return false;
      }
      if (calibrationFilters.kategori !== 'all' && c.ticket.kategori !== calibrationFilters.kategori) {
        return false;
      }
      if (calibrationFilters.pokokMasalah !== 'all' && c.ticket.pokokMasalah !== calibrationFilters.pokokMasalah) {
        return false;
      }
      if (calibrationFilters.topikMasalah !== 'all' && c.ticket.topikMasalah !== calibrationFilters.topikMasalah) {
        return false;
      }
      if (calibrationFilters.periode !== 'all') {
        const calDate = new Date(c.tanggalKalibrasi);
        const today = new Date();
        if (calibrationFilters.periode === 'today') {
          const cDay = calDate.toISOString().slice(0, 10);
          const nowDay = today.toISOString().slice(0, 10);
          if (cDay !== nowDay) return false;
        } else if (calibrationFilters.periode === '7days') {
          const diffDays = (today.getTime() - calDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7 || diffDays < 0) return false;
        } else if (calibrationFilters.periode === '30days') {
          const diffDays = (today.getTime() - calDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30 || diffDays < 0) return false;
        }
      }
      return true;
    });
  }, [calibrations, calibrationFilters]);

  // Counters for UI Badges
  const pendingPetugasCount = useMemo(() => {
    if (!currentUser) return 0;
    return evaluations.filter((e) => {
      if (e.status !== 'MENUNGGU_REVIEW_PETUGAS') return false;
      if (currentUser.role === 'petugas') {
        return e.ticket.namaPetugas.toLowerCase() === currentUser.name.toLowerCase();
      }
      if (currentUser.role === 'team_leader') {
        return currentUser.team ? e.petugasTeam === currentUser.team : true;
      }
      return true;
    }).length;
  }, [evaluations, currentUser]);

  const pendingQaRebuttalCount = useMemo(() => {
    if (!currentUser) return 0;
    return evaluations.filter((e) => {
      if (e.status !== 'PROSES_SANGGAHAN') return false;
      if (currentUser.role === 'qa') {
        return e.qaId === currentUser.id || e.qaName.toLowerCase() === currentUser.name.toLowerCase();
      }
      return true;
    }).length;
  }, [evaluations, currentUser]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filters.namaPetugas !== 'all' && t.namaPetugas !== filters.namaPetugas) {
        return false;
      }
      if (filters.kategori !== 'all' && t.kategori !== filters.kategori) {
        return false;
      }
      if (filters.periode !== 'all') {
        const ticketDate = new Date(t.tanggalTiket);
        const today = new Date();
        if (filters.periode === 'today') {
          const tDay = ticketDate.toISOString().slice(0, 10);
          const nowDay = today.toISOString().slice(0, 10);
          if (tDay !== nowDay) return false;
        } else if (filters.periode === '7days') {
          const diffDays = (today.getTime() - ticketDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7 || diffDays < 0) return false;
        } else if (filters.periode === '30days') {
          const diffDays = (today.getTime() - ticketDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30 || diffDays < 0) return false;
        }
      }
      return true;
    });
  }, [tickets, filters]);

  // Filtered Evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((e) => {
      if (filters.namaPetugas !== 'all' && e.ticket.namaPetugas !== filters.namaPetugas) {
        return false;
      }
      if (filters.kategori !== 'all' && e.ticket.kategori !== filters.kategori) {
        return false;
      }
      if (filters.status !== 'all' && e.status !== filters.status) {
        return false;
      }
      if (filters.periode !== 'all') {
        const evalDate = new Date(e.tanggalSampling);
        const today = new Date();
        if (filters.periode === 'today') {
          const eDay = evalDate.toISOString().slice(0, 10);
          const nowDay = today.toISOString().slice(0, 10);
          if (eDay !== nowDay) return false;
        } else if (filters.periode === '7days') {
          const diffDays = (today.getTime() - evalDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7 || diffDays < 0) return false;
        } else if (filters.periode === '30days') {
          const diffDays = (today.getTime() - evalDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30 || diffDays < 0) return false;
        }
      }
      return true;
    });
  }, [evaluations, filters]);

  // Clear all default/stored tickets, evaluations, and calibrations
  const clearAllData = () => {
    setTickets([]);
    setEvaluations([]);
    setCalibrations([]);
    setUsers([]);
    setSheetConfig({
      url: '',
      autoSync: false,
      totalSyncedRows: 0,
      status: 'idle',
    });
    safeStorage.removeItem(STORAGE_KEYS.TICKETS);
    safeStorage.removeItem(STORAGE_KEYS.EVALUATIONS);
    safeStorage.removeItem(STORAGE_KEYS.CALIBRATIONS);
    safeStorage.removeItem(STORAGE_KEYS.USERS_LIST);
    safeStorage.removeItem(STORAGE_KEYS.SHEET);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        login,
        logout,
        switchRole,
        sessionExpiresAt,
        sessionExpiredMessage,
        clearSessionExpiredMessage,
        users,
        addUser,
        updateUser,
        deleteUser,
        resetUsersToDefault,
        changePassword,
        indicators,
        addIndicator,
        updateIndicator,
        updateMultipleIndicators,
        applyStandardSopWeights,
        deleteIndicator,
        resetIndicators,
        totalIndicatorWeight,
        tickets,
        sheetConfig,
        syncGoogleSheet,
        importExcelFile,
        loadSampleSheetData,
        importCSVText,
        importEvaluationsFromExcel,
        bulkUsersCreate,
        handleBulkCreate,
        clearAllData,
        evaluations,
        createSamplingEvaluation,
        evaluateTicketWithAI,
        submitPetugasAcceptance,
        submitPetugasSanggahan,
        submitQaKeputusanAkhir,
        deleteEvaluationsByPeriod,
        calibrations,
        createCalibration,
        uncalibratedEvaluations,
        calibrationFilters,
        setCalibrationFilters,
        filteredCalibrations,
        filters,
        setFilters,
        filteredTickets,
        filteredEvaluations,
        pendingPetugasCount,
        pendingQaRebuttalCount,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
