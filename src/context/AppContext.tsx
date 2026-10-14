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
import { parseCSV, parseExcelFile, generateSampleGoogleSheetCSV } from '../utils/csvParser';
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
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (role: User['role']) => void;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updated: Partial<User>) => void;
  deleteUser: (id: string) => void;
  resetUsersToDefault: () => void;
  changePassword: (oldPass: string, newPass: string) => { success: boolean; message: string };

  // Indicators management
  indicators: Indicator[];
  addIndicator: (indicator: Omit<Indicator, 'id'>) => void;
  updateIndicator: (id: string, updated: Partial<Indicator>) => void;
  deleteIndicator: (id: string) => void;
  resetIndicators: () => void;
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

  clearAllData: () => void;
  bulkUsersCreate: (users: Omit<User, 'id'>[]) => void;
  handleBulkCreate: () => void;

  // Active view
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'senada_user_v10_nodata',
  USERS_LIST: 'senada_users_list_v10_nodata',
  INDICATORS: 'senada_indicators_v10_nodata',
  TICKETS: 'senada_tickets_v10_nodata',
  EVALUATIONS: 'senada_evaluations_v10_nodata',
  CALIBRATIONS: 'senada_calibrations_v10_nodata',
  SHEET: 'senada_sheet_v10_nodata',
};

// Safe storage wrapper to prevent QuotaExceededError or restricted environments from crashing React
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
['v1', 'v2', 'v3', 'v4', 'v4_clean', 'v5', 'v6', 'v7', 'v7_complete', 'v8_flow', 'v9'].forEach((ver) => {
  safeStorage.removeItem(`senada_tickets_${ver}`);
  safeStorage.removeItem(`senada_evaluations_${ver}`);
  safeStorage.removeItem(`senada_calibrations_${ver}`);
  safeStorage.removeItem(`senada_sheet_${ver}`);
  safeStorage.removeItem(`senada_user_${ver}`);
  safeStorage.removeItem(`senada_users_list_${ver}`);
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Current User (Default to Administrator Senada so all menus including Manajemen User are immediately accessible)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = safeStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    // Default to Administrator Senada (Admin role)
    return INITIAL_USERS[0];
  });

  // 2. Users list synced with Firestore
  const [users, setUsers] = useState<User[]>([]);
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
  const [indicators, setIndicators] = useState<Indicator[]>(INITIAL_INDICATORS);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'indicators'),
      async (snapshot) => {
        const indList: Indicator[] = [];
        snapshot.forEach((doc) => {
          indList.push(doc.data() as Indicator);
        });
        if (indList.length > 0) {
          setIndicators(indList);
        } else {
          for (const ind of INITIAL_INDICATORS) {
            await safeSetDoc(doc(db, 'indicators', ind.id), ind);
          }
          setIndicators(INITIAL_INDICATORS);
        }
      },
      (error) => {
        handleFirestoreError(error, 'onSnapshot', 'indicators');
        setIndicators((prev) => (prev.length > 0 ? prev : INITIAL_INDICATORS));
      }
    );
    return () => unsubscribe();
  }, []);

  // 5. Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'tickets'),
      (snapshot) => {
        const ticketsList: Ticket[] = [];
        snapshot.forEach((doc) => {
          ticketsList.push(doc.data() as Ticket);
        });
        setTickets(ticketsList.length > 0 ? ticketsList : INITIAL_TICKETS);
      },
      (error) => {
        handleFirestoreError(error, 'onSnapshot', 'tickets');
        setTickets((prev) => (prev.length > 0 ? prev : INITIAL_TICKETS));
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

  // Sync to LocalStorage with safeStorage
  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
  }, [currentUser]);

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
  const addUser = async (newUser: Omit<User, 'id'>) => {
    const id = `USR-${Date.now().toString().slice(-6)}`;
    const avatar = newUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    const userObj = { ...newUser, id, avatar };
    try {
      await safeSetDoc(doc(db, 'users', id), userObj);
    } catch (e) {
      console.error(e);
    }
  };

  const updateUser = async (id: string, updated: Partial<User>) => {
    try {
      await safeSetDoc(doc(db, 'users', id), updated, { merge: true });
      const target = users.find((u) => u.id === id);
      if (target && currentUser.id === id) {
        setCurrentUser({ ...target, ...updated });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUser = async (id: string) => {
    if (id === currentUser.id) {
      alert('Tidak dapat menghapus akun yang sedang aktif digunakan.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (e) {
      console.error(e);
    }
  };

  const resetUsersToDefault = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'users', d.id));
      }
      for (const u of INITIAL_USERS) {
        await safeSetDoc(doc(db, 'users', u.id), u);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const bulkUsersCreate = async (newUsers: Omit<User, 'id'>[]) => {
    try {
      for (const u of newUsers) {
        const id = `USR-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substr(2, 5)}`;
        const userObj = {
          ...u,
          id,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        };
        await safeSetDoc(doc(db, 'users', id), userObj);
      }
    } catch (e) {
      console.error(e);
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

  const changePassword = (oldPass: string, newPass: string): { success: boolean; message: string } => {
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

  // Switch role convenience with active tab guard
  const switchRole = (role: User['role']) => {
    const targetUser = users.find((u) => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
      const roleAllowedTabs: Record<UserRole, string[]> = {
        admin: ['dashboard', 'kalibrasi', 'users-management'],
        pusat: ['dashboard', 'kalibrasi'],
        team_leader: ['dashboard', 'inbox-petugas', 'history'],
        petugas: ['dashboard', 'inbox-petugas', 'history'],
        qa: ['dashboard', 'sampling', 'inbox-sanggah-qa', 'history', 'kalibrasi', 'indicators', 'google-sheet'],
      };
      if (!roleAllowedTabs[role]?.includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  };

  // Indicator Management Handlers
  const addIndicator = async (newInd: Omit<Indicator, 'id'>) => {
    const id = `IND-${String(indicators.length + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
    const indObj = { ...newInd, id };
    try {
      await safeSetDoc(doc(db, 'indicators', id), indObj);
    } catch (e) {
      console.error(e);
    }
  };

  const updateIndicator = async (id: string, updated: Partial<Indicator>) => {
    try {
      await safeSetDoc(doc(db, 'indicators', id), updated, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteIndicator = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'indicators', id));
    } catch (e) {
      console.error(e);
    }
  };

  const resetIndicators = async () => {
    try {
      const snap = await getDocs(collection(db, 'indicators'));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'indicators', d.id));
      }
      for (const ind of INITIAL_INDICATORS) {
        await safeSetDoc(doc(db, 'indicators', ind.id), ind);
      }
    } catch (e) {
      console.error(e);
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
      onProgress?.(40, 'Mengunduh data spreadsheet melalui proxy...');

      const res = await fetch('/api/proxy-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal sinkronisasi dari Google Sheet');
      }

      onProgress?.(65, 'Menganalisis baris data & memetakan 9 kolom standar...');

      const parsed = parseCSV(json.csv);
      if (parsed.data.length === 0) {
        throw new Error('Tidak ada baris data tiket valid yang dapat diimpor dari file tersebut.');
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

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal melakukan penilaian otomatis AI');
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
      qaId: currentUser.id,
      qaName: currentUser.name,
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
          actor: currentUser.name,
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
                actor: currentUser.name,
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
                actor: currentUser.name,
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
                actor: currentUser.name,
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
      calibratorId: currentUser.id,
      calibratorName: currentUser.name,
      calibratorRole: currentUser.role as 'admin' | 'pusat',
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
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role as 'admin' | 'pusat',
        tanggal: nowStr,
        nilaiKalibrasi,
        kesesuaian: persentase,
      },
      history: [
        ...samplingEvaluation.history,
        {
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          actor: currentUser.name,
          role: currentUser.role === 'admin' ? ('Administrator' as const) : ('Pimpinan Pusat' as const),
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
        switchRole,
        users,
        addUser,
        updateUser,
        deleteUser,
        resetUsersToDefault,
        changePassword,
        indicators,
        addIndicator,
        updateIndicator,
        deleteIndicator,
        resetIndicators,
        totalIndicatorWeight,
        tickets,
        sheetConfig,
        syncGoogleSheet,
        importExcelFile,
        loadSampleSheetData,
        importCSVText,
        clearAllData,
        bulkUsersCreate,
        handleBulkCreate,
        evaluations,
        createSamplingEvaluation,
        evaluateTicketWithAI,
        submitPetugasAcceptance,
        submitPetugasSanggahan,
        submitQaKeputusanAkhir,
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
