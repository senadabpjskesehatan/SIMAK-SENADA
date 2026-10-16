import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SamplingEvaluation } from '../types';
import * as XLSX from 'xlsx';
import {
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Scale,
  FileSpreadsheet,
} from 'lucide-react';

export const HistorySanggahanView: React.FC = () => {
  const { evaluations, indicators, currentUser, importEvaluationsFromExcel } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ success: boolean; text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const templateRows = [
      [
        'Nomor Tiket', 'Tanggal Tiket', 'Kategori', 'Pokok Masalah', 'Topik Masalah', 'Isi Keluhan', 'Isi Jawaban', 'Rating', 'Nama Petugas',
        'Tanggal Sampling', 'Quality Aasurance',
        'Salam Pembuka', 'Menyapa Peserta', 'Pemilihan Topik Masalah', 'Anaisis', 'Akurasi Informasi', 'Edukasi Tambahan', 'Kesesuaian Tindak Lanjut', 'Pemilihan Kata Dan Bahasa', 'Kemampuan Presentasi', 'Edukasi Rating', 'Salam Penutup',
        'Catatan'
      ],
      [
        'TKT-2025-9001', '01/02/2025', 'Informasi', 'Pelayanan Faskes', 'Syarat Pendaftaran', 'Peserta menanyakan syarat faskes.', 'Petugas menjelaskan persyaratan KTP & KK.', 5, 'DINDA MUTIA HIDAYATI',
        '02/02/2025', 'SITI QA SPECIALIST',
        3, 3, 3, 2, 3, 3, 3, 2, 3, 3, 3,
        'Pelayanan sangat baik dan komunikatif.'
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Upload History');
    XLSX.writeFile(wb, 'template_upload_history_dan_nilai_akhir.xlsx');
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    const res = await importEvaluationsFromExcel(file);
    setUploading(false);
    setUploadMsg({ success: res.success, text: res.message });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Unique sampling months
  const samplingMonthList = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach((e) => {
      if (e.tanggalSampling) {
        const m = e.tanggalSampling.slice(0, 7); // YYYY-MM
        if (m) set.add(m);
      }
    });
    return Array.from(set).sort().reverse();
  }, [evaluations]);

  // Filtered list
  const filteredList = useMemo(() => {
    return evaluations.filter((e) => {
      // Role restrictions
      if (currentUser?.role === 'petugas') {
        if (e.ticket.namaPetugas.toLowerCase() !== (currentUser?.name || '').toLowerCase()) {
          return false;
        }
      } else if (currentUser?.role === 'team_leader') {
        if (currentUser?.team && e.petugasTeam !== currentUser.team) {
          return false;
        }
      } else if (currentUser?.role === 'qa') {
        // QA only sees data evaluated by themselves
        if (e.qaId !== currentUser.id && e.qaName.toLowerCase() !== (currentUser?.name || '').toLowerCase()) {
          return false;
        }
      }

      if (selectedAgent !== 'all' && e.ticket.namaPetugas !== selectedAgent) return false;

      if (selectedMonth !== 'all') {
        if (!e.tanggalSampling || !e.tanggalSampling.startsWith(selectedMonth)) {
          return false;
        }
      }

      if (selectedStatus !== 'all') {
        if (selectedStatus === 'SELESAI_DITERIMA' && e.status !== 'SELESAI_DITERIMA') return false;
        if (selectedStatus === 'KEPUTUSAN_AKHIR' && e.status !== 'KEPUTUSAN_AKHIR') return false;
        if (selectedStatus === 'PROSES_SANGGAHAN' && e.status !== 'PROSES_SANGGAHAN') return false;
        if (selectedStatus === 'MENUNGGU_REVIEW_PETUGAS' && e.status !== 'MENUNGGU_REVIEW_PETUGAS') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          e.nomorTiket.toLowerCase().includes(q) ||
          e.ticket.namaPetugas.toLowerCase().includes(q) ||
          e.ticket.pokokMasalah.toLowerCase().includes(q) ||
          (e.petugasTeam || '').toLowerCase().includes(q) ||
          (e.sanggahan?.alasanSanggahan || '').toLowerCase().includes(q) ||
          (e.keputusanAkhir?.catatanPutusanQA || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [evaluations, selectedAgent, selectedMonth, selectedStatus, searchQuery, currentUser]);

  // Unique agents
  const agentList = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach((e) => {
      if (e.ticket.namaPetugas) set.add(e.ticket.namaPetugas);
    });
    return Array.from(set).sort();
  }, [evaluations]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const dataToExport = filteredList.map((e) => ({
      'Nomor Tiket': e.nomorTiket,
      'Tanggal Sampling': e.tanggalSampling,
      'Tanggal Tiket': e.ticket.tanggalTiket,
      'Petugas': e.ticket.namaPetugas,
      'Tim Petugas': e.petugasTeam || '-',
      'Kategori': e.ticket.kategori,
      'Pokok Masalah': e.ticket.pokokMasalah,
      'Topik Masalah': e.ticket.topikMasalah || '-',
      'Asesor QA': e.qaName,
      'Nilai Awal QA': e.nilaiAwal,
      'Catatan Awal QA': e.catatanAwalQA || '-',
      'Ada Sanggahan': e.sanggahan ? 'Ya' : 'Tidak',
      'Alasan Sanggahan': e.sanggahan?.alasanSanggahan || '-',
      'Argumen Petugas': e.sanggahan?.argumenPetugas || '-',
      'Status Putusan QA': e.keputusanAkhir?.statusPutusan || '-',
      'Catatan Putusan QA': e.keputusanAkhir?.catatanPutusanQA || '-',
      'Nilai Akhir Final': e.nilaiFinal,
      'Status': e.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Mutu & Sanggahan');
    XLSX.writeFile(workbook, `rekap_mutu_dan_sanggahan_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getStatusBadge = (e: SamplingEvaluation) => {
    if (e.status === 'KEPUTUSAN_AKHIR') {
      const putusan = e.keputusanAkhir?.statusPutusan;
      if (putusan === 'DITERIMA_PENUH') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sanggahan Diterima Penuh
          </span>
        );
      }
      if (putusan === 'DITERIMA_SEBAGIAN') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Sanggahan Diterima Sebagian
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Sanggahan Ditolak
        </span>
      );
    }

    if (e.status === 'SELESAI_DITERIMA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Disetujui Petugas Langsung
        </span>
      );
    }

    if (e.status === 'PROSES_SANGGAHAN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-amber-600" /> Proses Telaah QA
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        Menunggu Review Petugas
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                History Sanggahan & Rekap Nilai Akhir Petugas
              </h1>
              <p className="text-xs text-slate-500">
                Jejak audit resmi pergerakan nilai dari sampling awal, sanggahan petugas, hingga putusan final Quality Assurance
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              title="Unduh Template Excel 23 Kolom"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Unduh Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {uploading ? 'Mengimpor...' : 'Upload Excel History & Nilai'}
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Ekspor Rekap
            </button>
          </div>
        </div>

        {uploadMsg && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-medium flex items-center justify-between ${uploadMsg.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
            <span>{uploadMsg.text}</span>
            <button onClick={() => setUploadMsg(null)} className="text-xs font-bold opacity-75 hover:opacity-100">Tutup</button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no tiket, alasan, petugas..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
              />
            </div>

            {/* Petugas Filter */}
            {currentUser?.role !== 'petugas' && (
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              >
                <option value="all">Semua Petugas ({agentList.length})</option>
                {agentList.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>
            )}

            {/* Sampling Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="all">Semua Bulan Sampling</option>
              {samplingMonthList.map((m) => {
                const [year, month] = m.split('-');
                const monthNames = [
                  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ];
                const monthName = monthNames[parseInt(month, 10)] || month;
                return (
                  <option key={m} value={m}>
                    {monthName} {year}
                  </option>
                );
              })}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="all">Semua Status Hasil</option>
              <option value="KEPUTUSAN_AKHIR">Selesai Putusan Sanggahan</option>
              <option value="SELESAI_DITERIMA">Disetujui Tanpa Sanggahan</option>
              <option value="PROSES_SANGGAHAN">Sedang Disanggah</option>
              <option value="MENUNGGU_REVIEW_PETUGAS">Menunggu Review Petugas</option>
            </select>
          </div>

          <div className="text-xs text-slate-500">
            Total tercatat: <strong className="text-slate-800">{filteredList.length}</strong> tiket
          </div>
        </div>
      </div>

      {/* History Items Cards */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs text-slate-400">
          Tidak ada data riwayat yang cocok dengan filter saat ini.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item) => {
            const isExpanded = expandedId === item.id;
            const hasRebuttal = Boolean(item.sanggahan);
            const scoreChanged = item.nilaiFinal !== item.nilaiAwal;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition"
              >
                {/* Main Card Header */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.nomorTiket}
                      </span>
                      {getStatusBadge(item)}
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">
                        Sampling: {item.tanggalSampling}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700">
                      <span>Petugas: <strong>{item.ticket.namaPetugas}</strong></span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {item.petugasTeam || 'TIM'}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>Kategori: <strong>{item.ticket.kategori}</strong></span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{item.ticket.pokokMasalah}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">Asesor QA: <strong className="text-slate-700">{item.qaName}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Nilai Awal QA
                        </span>
                        <span className="text-base font-bold text-slate-600">
                          {item.nilaiAwal}
                        </span>
                      </div>

                      {hasRebuttal && (
                        <>
                          <span className="text-slate-300 text-xs">→</span>
                          <div className="text-center">
                            <span className="text-[10px] uppercase font-semibold text-amber-600 block">
                              Usulan Petugas
                            </span>
                            <span className="text-base font-bold text-amber-700">
                              {item.sanggahan?.usulanNilai || '-'}
                            </span>
                          </div>
                        </>
                      )}

                      <span className="text-slate-300 text-xs">→</span>
                      <div className="text-center bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">
                        <span className="text-[10px] uppercase font-bold text-teal-800 block">
                          Nilai Akhir Final
                        </span>
                        <span className={`text-xl font-extrabold ${scoreChanged ? 'text-teal-700' : 'text-slate-900'}`}>
                          {item.nilaiFinal}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition flex items-center gap-1 text-xs font-semibold"
                    >
                      <span>{isExpanded ? 'Tutup Detail' : 'Jejak Audit'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Audit Trail Timeline */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-5 space-y-5 animate-in fade-in">
                    {/* Step-by-Step Chronology */}
                    <div className="space-y-4">
                      {/* Step 1: Penilaian Awal QA */}
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
                            1
                          </div>
                          <div className="w-0.5 grow bg-slate-200 my-1"></div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 grow space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>Sampling & Penilaian Awal oleh Quality Assurance</span>
                            <span className="text-slate-400 font-normal">
                              Asesor: {item.qaName}
                            </span>
                          </div>
                          <p className="text-slate-600 italic">
                            "{item.catatanAwalQA}"
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                            {item.scores.map((s) => {
                              const ind = indicators.find((i) => i.id === s.indicatorId);
                              return (
                                <div key={s.indicatorId} className="bg-slate-50 p-2 rounded border border-slate-100">
                                  <span className="text-slate-500 truncate block">{ind?.nama || s.indicatorId}</span>
                                  <strong className="text-slate-800 text-xs">{s.score} / 100</strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Step 2: Sanggahan Petugas (if exists) */}
                      {item.sanggahan && (
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                              2
                            </div>
                            <div className="w-0.5 grow bg-slate-200 my-1"></div>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-amber-200 grow space-y-2 text-xs">
                            <div className="flex items-center justify-between font-bold text-amber-900">
                              <span>Pengajuan Sanggahan oleh Petugas</span>
                              <span className="text-slate-400 font-normal">
                                {item.sanggahan.tanggalSanggah}
                              </span>
                            </div>
                            <div className="text-[11px] text-amber-800 font-semibold">
                              Alasan: {item.sanggahan.alasanSanggahan}
                            </div>
                            <p className="text-slate-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100 whitespace-pre-wrap">
                              "{item.sanggahan.argumenPetugas}"
                            </p>
                            {item.sanggahan.buktiPendukung && (
                              <div className="text-[11px] text-slate-600">
                                <strong>Dasar SOP/Bukti:</strong> {item.sanggahan.buktiPendukung}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Step 3: Putusan Akhir QA */}
                      {item.keputusanAkhir && (
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                              3
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-teal-300 grow space-y-2 text-xs">
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span className="flex items-center gap-2">
                                Putusan Akhir Quality Assurance:
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  item.keputusanAkhir.statusPutusan === 'DITERIMA_PENUH'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.keputusanAkhir.statusPutusan === 'DITERIMA_SEBAGIAN'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {item.keputusanAkhir.statusPutusan.replace('_', ' ')}
                                </span>
                              </span>
                              <span className="text-slate-400 font-normal">
                                {item.keputusanAkhir.tanggalKeputusan}
                              </span>
                            </div>

                            <p className="text-slate-800 bg-teal-50/40 p-3 rounded-lg border border-teal-100 whitespace-pre-wrap">
                              "{item.keputusanAkhir.catatanPutusanQA}"
                            </p>

                            <div className="text-[11px] text-slate-600 font-medium pt-1">
                              Nilai akhir resmi yang tercatat: <strong className="text-teal-800 text-sm">{item.keputusanAkhir.nilaiAkhir}</strong> (Diputuskan oleh {item.keputusanAkhir.qaName})
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ticket Excerpt */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="font-bold text-slate-800">Konteks Jawaban Tiket Layanan</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Keluhan:</span>
                          <p className="text-slate-700 text-[11px]">{item.ticket.isiKeluhan}</p>
                        </div>
                        <div className="bg-teal-50/30 p-2.5 rounded border border-teal-100">
                          <span className="text-[10px] font-bold text-teal-800 uppercase block mb-1">Jawaban Petugas:</span>
                          <p className="text-slate-800 text-[11px]">{item.ticket.isiJawaban}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
