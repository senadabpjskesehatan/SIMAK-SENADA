import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link2,
  Download,
  Search,
  Info,
  Users,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  ArrowRight,
  Database,
  Check,
  Sparkles,
} from 'lucide-react';
import { generateSampleGoogleSheetCSV } from '../utils/csvParser';
import { Ticket } from '../types';

export const GoogleSheetSyncView: React.FC = () => {
  const {
    sheetConfig,
    syncGoogleSheet,
    loadSampleSheetData,
    tickets,
    setActiveTab,
    currentUser,
  } = useApp();

  // Input state for Google Sheet URL
  const [inputUrl, setInputUrl] = useState(sheetConfig.url || '');

  // Sync / Loading Progress states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncStepText, setSyncStepText] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean;
    message: string;
    count?: number;
    source?: string;
  } | null>(null);

  // Detail Modal inspection
  const [inspectTicket, setInspectTicket] = useState<Ticket | null>(null);

  // Table filter & pagination
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewCategory, setPreviewCategory] = useState<string>('all');
  const [previewSampledFilter, setPreviewSampledFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Sync Steps Definition for the Progress UI
  const progressSteps = [
    { id: 1, label: 'Koneksi Sumber Data', minPercent: 15 },
    { id: 2, label: 'Pembacaan Lembar Kerja', minPercent: 40 },
    { id: 3, label: 'Pemetaan 9 Kolom Standar', minPercent: 65 },
    { id: 4, label: 'Validasi & Penyimpanan', minPercent: 85 },
  ];

  // Handler for Google Sheet URL Sync
  const handleSyncGoogleSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setIsSyncing(true);
    setSyncProgress(5);
    setSyncStepText('Memulai inisialisasi tautan Google Sheet...');
    setSyncStatus(null);

    const result = await syncGoogleSheet(inputUrl.trim(), (pct, text) => {
      setSyncProgress(pct);
      setSyncStepText(text);
    });

    setIsSyncing(false);
    setSyncStatus({
      success: result.success,
      message: result.message,
      count: result.count,
      source: 'Google Sheet Publik',
    });
    setCurrentPage(1);
  };

  // Handler for Loading Sample Dataset
  const handleLoadSample = async () => {
    setIsSyncing(true);
    setSyncProgress(10);
    setSyncStepText('Memulai sinkronisasi data simulasi BPJS Kesehatan...');
    setSyncStatus(null);

    const result = await loadSampleSheetData((pct, text) => {
      setSyncProgress(pct);
      setSyncStepText(text);
    });

    setIsSyncing(false);
    setSyncStatus({
      success: true,
      message: result.message,
      count: result.count,
      source: 'Template Simulasi BPJS',
    });
    setCurrentPage(1);
  };

  // Download format CSV sample
  const handleDownloadSampleCSV = () => {
    const csvContent = generateSampleGoogleSheetCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'format_standar_tiket_senada_bpjs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick statistics calculated from active tickets
  const statistics = useMemo(() => {
    const total = tickets.length;
    const pengaduanCount = tickets.filter((t) => t.kategori.toLowerCase().includes('pengaduan')).length;
    const infoCount = total - pengaduanCount;
    const uniqueAgents = Array.from(new Set(tickets.map((t) => t.namaPetugas).filter(Boolean)));
    const dates = tickets.map((t) => t.tanggalTiket).filter(Boolean).sort();
    const minDate = dates[0] || '-';
    const maxDate = dates[dates.length - 1] || '-';
    const sampledCount = tickets.filter((t) => t.sampled).length;

    return {
      total,
      pengaduanCount,
      infoCount,
      agentCount: uniqueAgents.length,
      dateRange: minDate === maxDate ? minDate : `${minDate} s.d. ${maxDate}`,
      sampledCount,
    };
  }, [tickets]);

  // Filtered Preview Data
  const filteredPreview = useMemo(() => {
    return tickets.filter((t) => {
      if (previewSearch.trim()) {
        const q = previewSearch.toLowerCase();
        const matches =
          t.nomorTiket.toLowerCase().includes(q) ||
          t.namaPetugas.toLowerCase().includes(q) ||
          t.pokokMasalah.toLowerCase().includes(q) ||
          t.topikMasalah.toLowerCase().includes(q) ||
          t.isiKeluhan.toLowerCase().includes(q) ||
          t.isiJawaban.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (previewCategory !== 'all') {
        if (t.kategori.toLowerCase() !== previewCategory.toLowerCase()) return false;
      }
      if (previewSampledFilter !== 'all') {
        const isSampled = previewSampledFilter === 'sampled';
        if (Boolean(t.sampled) !== isSampled) return false;
      }
      return true;
    });
  }, [tickets, previewSearch, previewCategory, previewSampledFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPreview.length / pageSize));
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPreview.slice(start, start + pageSize);
  }, [filteredPreview, currentPage, pageSize]);

  const requiredColumns = [
    { name: 'nomor tiket', desc: 'Identitas unik tiket (contoh: TKT-2025-001, No Tiket, ID)' },
    { name: 'tanggal tiket', desc: 'Tanggal pelaporan (YYYY-MM-DD atau format tanggal Excel)' },
    { name: 'kategori', desc: 'Informasi atau Pengaduan' },
    { name: 'pokok masalah', desc: 'Substansi masalah (contoh: Pelayanan Faskes, Iuran)' },
    { name: 'topik masalah', desc: 'Rincian spesifik masalah (contoh: Antrean, REHAB)' },
    { name: 'isi keluhan', desc: 'Teks pesan/pertanyaan lengkap dari peserta masyarakat' },
    { name: 'isi jawaban', desc: 'Teks lengkap respons/jawaban yang diberikan petugas' },
    { name: 'rating', desc: 'Rating kepuasan peserta (skala 1 s.d. 5 bintang)' },
    { name: 'nama petugas', desc: 'Nama lengkap petugas/agent yang menjawab tiket' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">
                  Sinkronisasi Data Google Sheet Resmi
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  Google Sheets Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Input dan sinkronisasi data layanan informasi dan pengaduan dilakukan secara eksklusif melalui tautan Google Sheet publik. Data yang tersinkronisasi akan tetap tersimpan aman meskipun sesi berakhir atau peramban ditutup.
              </p>
            </div>
          </div>

        </div>

        {/* Quick KPI stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-teal-600" />
              Total Tiket Aktif
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {statistics.total.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {statistics.sampledCount} sudah disampling
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Petugas Terdata
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {statistics.agentCount} Petugas
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Siap untuk sampling
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Komposisi Kategori
            </div>
            <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-2">
              <span className="text-rose-600">{statistics.pengaduanCount} Aduan</span>
              <span className="text-slate-300">·</span>
              <span className="text-blue-600">{statistics.infoCount} Info</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Rasio pengaduan/info
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              Rentang Tanggal
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1 truncate" title={statistics.dateRange}>
              {statistics.dateRange}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {sheetConfig.lastSyncedAt ? `Sinkron: ${sheetConfig.lastSyncedAt}` : 'Belum disinkronkan'}
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Synced Data Status & Re-sync Button */}
      {sheetConfig.lastSyncedAt && (
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="p-2.5 rounded-xl bg-white/10 text-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Data Tersimpan Permanen</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 rounded-full text-white">
                  {sheetConfig.totalSyncedRows} Tiket Aktif
                </span>
              </div>
              <div className="text-sm font-semibold text-white mt-1 font-mono truncate max-w-lg" title={sheetConfig.url}>
                {sheetConfig.url}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Terakhir disinkronkan pada {sheetConfig.lastSyncedAt}. Data tetap tersimpan aman meskipun web ditutup atau akun keluar (logout).
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (sheetConfig.url && sheetConfig.url.startsWith('https://')) {
                setIsSyncing(true);
                setSyncProgress(10);
                setSyncStepText('Menjalankan sinkron ulang untuk menambahkan data baru...');
                syncGoogleSheet(sheetConfig.url, (pct, text) => {
                  setSyncProgress(pct);
                  setSyncStepText(text);
                }).then((res) => {
                  setIsSyncing(false);
                  setSyncStatus({
                    success: res.success,
                    message: res.message,
                    count: res.count,
                    source: 'Sinkron Ulang Google Sheet',
                  });
                });
              } else {
                alert('Silakan masukkan URL Google Sheet yang valid terlebih dahulu.');
              }
            }}
            disabled={isSyncing}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Menyinkron Ulang...' : 'Sinkron Ulang Data (Tambah Baru)'}
          </button>
        </div>
      )}

      {/* Google Sheet Sync Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <form onSubmit={handleSyncGoogleSheet} className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-600" />
              Tautan Spreadsheet Google Sheet Publik
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukkan link Google Sheet. Pastikan dokumen telah diatur ke <em>&quot;Siapa saja yang memiliki link dapat melihat&quot;</em>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative w-full">
              <input
                type="url"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isSyncing}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Google Sheet'}
            </button>
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Ketentuan Sinkronisasi:</span> Sesuai kebijakan penjaminan mutu, input data wajib melalui sinkronisasi Google Sheet. Sinkronisasi ulang pada tautan yang sama akan mempertahankan catatan data penilaian sebelumnya dan hanya menambahkan data baru yang belum ada. Namun, jika terdapat tautan (link) Google Sheet baru yang disinkronkan, sistem akan otomatis mengganti data sebelumnya dengan data dari link baru tersebut.
            </div>
          </div>
        </form>

        {/* PROGRESS LOADING COMPONENT (User Request: "Buatkan progres loading") */}
        {isSyncing && (
          <div className="p-5 bg-gradient-to-br from-emerald-50/90 via-teal-50/80 to-white rounded-2xl border border-emerald-200 shadow-sm space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Sedang Memproses Sinkronisasi Google Sheet...
                  </h4>
                  <p className="text-xs font-medium text-emerald-800 mt-0.5">
                    {syncStepText || 'Menghubungkan ke sumber data...'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-lg font-black text-emerald-800 tabular-nums">
                  {syncProgress}%
                </span>
                <p className="text-[10px] text-emerald-600 font-semibold">Progres Berjalan</p>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full bg-emerald-100/70 h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                style={{ width: `${Math.min(100, Math.max(5, syncProgress))}%` }}
              />
            </div>

            {/* 4-Step Checklist Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {progressSteps.map((step) => {
                const isPassed = syncProgress >= step.minPercent;
                const isCurrent = syncProgress < step.minPercent && (step.id === 1 || syncProgress >= progressSteps[step.id - 2]?.minPercent);
                return (
                  <div
                    key={step.id}
                    className={`p-2 rounded-xl border text-[11px] flex items-center gap-2 transition ${
                      isPassed
                        ? 'bg-white border-emerald-300 text-emerald-900 shadow-2xs font-bold'
                        : isCurrent
                        ? 'bg-white/80 border-teal-400 text-teal-800 animate-pulse font-semibold'
                        : 'bg-emerald-50/50 border-emerald-100 text-emerald-600/70'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                        isPassed
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-teal-600 text-white'
                          : 'bg-emerald-200 text-emerald-700'
                      }`}
                    >
                      {isPassed ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.id}
                    </div>
                    <span className="truncate">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sync Status Feedback Banner (Success or Error) */}
        {syncStatus && !isSyncing && (
          <div
            className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
              syncStatus.success
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/90 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {syncStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-sm block">
                  {syncStatus.success ? 'Sinkronisasi Berhasil!' : 'Kendala Sinkronisasi Data'}
                </span>
                <p className="mt-0.5 leading-relaxed text-slate-700">
                  {syncStatus.message}
                </p>
                {syncStatus.source && (
                  <span className="inline-block mt-1 text-[11px] font-semibold text-slate-500 bg-white/70 px-2 py-0.5 rounded-md border border-slate-200/60">
                    Sumber: {syncStatus.source}
                  </span>
                )}
              </div>
            </div>

            {syncStatus.success && (
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('sampling')}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  Mulai Sampling Sekarang
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 9 Standard Columns Reference Cards */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
          <Info className="w-4 h-4 text-teal-700" />
          Acuan 9 Kolom Standar Google Sheet BPJS Kesehatan
        </div>
        <p className="text-xs text-slate-600">
          Sistem secara cerdas mendeteksi sinonim nama kolom bahasa Indonesia (huruf besar/kecil, spasi, atau garis bawah). Pastikan spreadsheet Anda memuat kolom-kolom berikut:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
          {requiredColumns.map((col, idx) => (
            <div key={col.name} className="bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 font-mono text-[11px]">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] flex items-center justify-center font-sans font-bold">
                  {idx + 1}
                </span>
                {col.name}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 pl-5.5 leading-relaxed">
                {col.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* PREVIEW SYNCHRONIZED TICKETS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Pratinjau Tiket Tersinkronisasi ({filteredPreview.length} Baris Ditemukan)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                Total {tickets.length} Tiket
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Data tiket tersimpan permanen dan siap digunakan untuk penarikan sampling acak oleh Quality Assurance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={previewSearch}
                onChange={(e) => {
                  setPreviewSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari no. tiket, petugas, masalah..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Category */}
            <select
              value={previewCategory}
              onChange={(e) => {
                setPreviewCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
            >
              <option value="all">Semua Kategori</option>
              <option value="Pengaduan">Pengaduan</option>
              <option value="Informasi">Informasi</option>
            </select>

            {/* Filter Sampled Status */}
            <select
              value={previewSampledFilter}
              onChange={(e) => {
                setPreviewSampledFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
            >
              <option value="all">Semua Status Sampling</option>
              <option value="unsampled">Belum Disampling</option>
              <option value="sampled">Sudah Disampling</option>
            </select>

            <button
              onClick={() => setActiveTab('sampling')}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-2xs cursor-pointer"
            >
              Buka Sampling QA
            </button>
          </div>
        </div>

        {/* Tickets Data Table */}
        {tickets.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Belum Ada Data Tiket yang Tersinkronkan</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Silakan masukkan tautan Google Sheet publik di atas atau klik tombol di bawah untuk memuat data sampel simulasi resmi.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleLoadSample}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Muat Dataset Contoh Sekarang
              </button>
            </div>
          </div>
        ) : filteredPreview.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-xl border border-slate-200 p-6 text-slate-500 text-xs">
            Tidak ditemukan data tiket yang cocok dengan kata kunci atau filter pencarian.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3.5">No. Tiket</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Pokok Masalah</th>
                    <th className="py-3 px-3">Petugas</th>
                    <th className="py-3 px-3 text-center">Rating</th>
                    <th className="py-3 px-3 text-center">Status Sampling</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTickets.map((t) => (
                    <tr key={t.nomorTiket} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {t.nomorTiket}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {t.tanggalTiket}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            t.kategori.toLowerCase().includes('pengaduan')
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {t.kategori}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-[200px]">
                        <div className="font-medium truncate">{t.pokokMasalah}</div>
                        <div className="text-[10px] text-slate-400 truncate">{t.topikMasalah}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {t.namaPetugas}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {t.rating} ★
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {t.sampled ? (
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                            Disampling
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Tersedia
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectTicket(t)}
                          className="px-2.5 py-1 text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg text-[11px] font-semibold flex items-center gap-1 mx-auto transition cursor-pointer"
                          title="Lihat keluhan dan jawaban lengkap"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>baris per halaman (Menampilkan {Math.min(filteredPreview.length, (currentPage - 1) * pageSize + 1)} s.d. {Math.min(filteredPreview.length, currentPage * pageSize)} dari {filteredPreview.length})</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 font-semibold text-slate-700">
                  Halaman {currentPage} dari {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal for Inspecting a Ticket's Full Content */}
      {inspectTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                  {inspectTicket.nomorTiket}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {inspectTicket.tanggalTiket}
                </span>
              </div>
              <button
                onClick={() => setInspectTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Petugas</span>
                <span className="font-bold text-slate-800">{inspectTicket.namaPetugas}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Kategori</span>
                <span className="font-bold text-slate-800">{inspectTicket.kategori}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Pokok Masalah</span>
                <span className="font-bold text-slate-800">{inspectTicket.pokokMasalah}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Rating Peserta</span>
                <span className="font-bold text-amber-600">{inspectTicket.rating} ★</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Isi Keluhan / Pertanyaan Peserta:
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed max-h-36 overflow-y-auto">
                  {inspectTicket.isiKeluhan}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Isi Jawaban / Respons Petugas:
                </label>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs text-slate-900 leading-relaxed max-h-48 overflow-y-auto">
                  {inspectTicket.isiJawaban}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Topik: {inspectTicket.topikMasalah}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectTicket(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInspectTicket(null);
                    setActiveTab('sampling');
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Sampling Tiket Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
