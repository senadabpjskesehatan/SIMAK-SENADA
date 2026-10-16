export type UserRole = 'admin' | 'pusat' | 'qa' | 'team_leader' | 'petugas';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  avatar?: string;
  division?: string;
  nip?: string;
  password?: string;
  team?: string;
}

export interface Ticket {
  nomorTiket: string;      // Nomor Tiket (e.g. TKT-2025-001)
  tanggalTiket: string;    // Tanggal Tiket (YYYY-MM-DD)
  kategori: string;        // Kategori (Informasi / Permintaan / Pengaduan)
  pokokMasalah: string;    // Pokok Masalah
  topikMasalah: string;    // Topik Masalah
  isiKeluhan: string;      // Isi Keluhan Peserta / Pelapor
  isiJawaban: string;      // Isi Jawaban Petugas
  rating: number;          // Rating (1-5)
  namaPetugas: string;     // Nama Petugas
  sampled?: boolean;
  samplingId?: string;
}

export type IndicatorNilaiKey = 'N/A' | '0' | '1' | '2' | '3';

export interface IndicatorNilaiOption {
  nilai: IndicatorNilaiKey;
  label: string;
  enabled: boolean;
  referensiKetentuan: string;
}

export interface Indicator {
  id: string;
  nama: string;
  deskripsi: string;
  bobot: number;           // Persentase bobot nilai (e.g. 20)
  skalaMin?: number;       // Skala minimal (default 0)
  skalaMax?: number;       // Skala maksimal (default 100)
  kriteriaContoh?: string[];
  pilihanNilai?: IndicatorNilaiOption[]; // Pilihan nilai N/A, 0, 1, 2, 3 beserta nilai referensi ketentuan
}

export interface IndicatorScore {
  indicatorId: string;
  score: number;           // 0 - 100
  selectedNilai?: string;  // N/A, 0, 1, 2, 3
  notes?: string;
}


export type SamplingStatus = 
  | 'TERSEDIA'                 // Belum disampling
  | 'MENUNGGU_REVIEW_PETUGAS'  // QA telah menilai, masuk inbox hasil petugas
  | 'PROSES_SANGGAHAN'         // Petugas mengajukan sanggahan, masuk inbox sanggah QA
  | 'SELESAI_DITERIMA'         // Petugas menyetujui nilai (tanpa sanggahan)
  | 'KEPUTUSAN_AKHIR';         // QA telah memutuskan hasil akhir sanggahan, masuk history

export interface SanggahanData {
  tanggalSanggah: string;
  alasanSanggahan: string;
  argumenPetugas: string;
  buktiPendukung?: string;
  usulanNilai?: number;
  petugasName: string;
}

export interface KeputusanAkhirData {
  tanggalKeputusan: string;
  qaName: string;
  statusPutusan: 'DITERIMA_PENUH' | 'DITERIMA_SEBAGIAN' | 'DITOLAK';
  nilaiAkhir: number;
  finalScores: IndicatorScore[];
  catatanPutusanQA: string;
}

export interface AuditLog {
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  note?: string;
}

export interface SamplingEvaluation {
  id: string;
  nomorTiket: string;
  ticket: Ticket;
  qaId: string;
  qaName: string;
  tanggalSampling: string;
  scores: IndicatorScore[];
  nilaiAwal: number;          // Rata-rata terbobot nilai awal QA
  catatanAwalQA: string;
  isAiEvaluated?: boolean;
  aiAnalysis?: {
    ringkasan: string;
    kelebihan: string[];
    kekurangan: string[];
    saran: string;
  };
  status: SamplingStatus;
  sanggahan?: SanggahanData;
  keputusanAkhir?: KeputusanAkhirData;
  nilaiFinal: number;         // Nilai akhir final (tercatat di dashboard & history)
  history: AuditLog[];
  isCalibrated?: boolean;     // Menandakan apakah hasil sampling sudah pernah dikalibrasi (maks 1x)
  calibrationId?: string;
  petugasTeam?: string;       // Kelompok TIM petugas (TIM 1 - TIM 6)
  calibratedBy?: {
    id: string;
    name: string;
    role: 'admin' | 'pusat';
    tanggal: string;
    nilaiKalibrasi: number;
    kesesuaian: number;
  };
}

export interface CalibrationRecord {
  id: string;
  samplingEvaluationId: string;
  nomorTiket: string;
  ticket: Ticket;
  qaId: string;
  qaName: string;
  nilaiSamplingQA: number;
  scoresQA: IndicatorScore[];
  calibratorId: string;
  calibratorName: string;
  calibratorRole: 'admin' | 'pusat';
  tanggalKalibrasi: string;
  scoresKalibrasi: IndicatorScore[];
  nilaiKalibrasi: number;
  persentaseKesesuaian: number; // Persentase hasil perbandingan nilai sampling QA terhadap nilai Admin/Pusat
  selisihNilai: number;         // Deviasi absolut
  catatanKalibrasi: string;
}

export interface CalibrationFilterState {
  periode: 'all' | 'today' | '7days' | '30days';
  namaPetugas: string;
  namaQA: string;
  kategori: string;
  pokokMasalah: string;
  topikMasalah: string;
}

export interface FilterState {
  periode: 'all' | 'today' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
  namaPetugas: string;
  kategori: string;
  status: string;
}

export interface GoogleSheetConfig {
  url: string;
  lastSyncedAt?: string;
  autoSync: boolean;
  totalSyncedRows: number;
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}
