import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SamplingEvaluation, IndicatorScore, CalibrationRecord } from '../types';
import {
  GitCompare,
  History,
  BarChart3,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Sliders,
  Send,
  Download,
  Scale,
  RefreshCw,
  X,
  TrendingUp,
  Percent,
  CheckCheck,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const CalibrationView: React.FC = () => {
  const {
    currentUser,
    indicators,
    evaluations,
    uncalibratedEvaluations,
    calibrations,
    createCalibration,
    calibrationFilters,
    setCalibrationFilters,
    filteredCalibrations,
    evaluateTicketWithAI,
  } = useApp();

  // Sub-tabs: 'isi' | 'history' | 'dashboard'
  // If role is QA, default to dashboard since QA can't perform calibration (only Admin & Pusat)
  const isQA = currentUser.role === 'qa';
  const canPerformCalibration = currentUser.role === 'admin' || currentUser.role === 'pusat';

  const [activeSubTab, setActiveSubTab] = useState<'isi' | 'history' | 'dashboard'>(
    canPerformCalibration ? 'isi' : 'dashboard'
  );

  // Calibration Form State (Sub-tab: Isi Kalibrasi)
  const [selectedEvaluation, setSelectedEvaluation] = useState<SamplingEvaluation | null>(null);
  const [calibratorScores, setCalibratorScores] = useState<Record<string, number>>({});
  const [calibratorNotes, setCalibratorNotes] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter in Isi Kalibrasi list (all | uncalibrated | calibrated)
  const [isiStatusFilter, setIsiStatusFilter] = useState<'all' | 'uncalibrated' | 'calibrated'>('all');
  const [isiSearch, setIsiSearch] = useState('');

  // History Filter State (Sub-tab: History Kalibrasi)
  const [historyCalibratorFilter, setHistoryCalibratorFilter] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState('');

  // History detail inspection modal
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<CalibrationRecord | null>(null);

  // Filtered History List (by user / search)
  const filteredHistoryList = useMemo(() => {
    return calibrations.filter((item) => {
      if (historyCalibratorFilter !== 'all' && item.calibratorId !== historyCalibratorFilter) {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matches =
          item.nomorTiket.toLowerCase().includes(q) ||
          item.ticket.namaPetugas.toLowerCase().includes(q) ||
          item.qaName.toLowerCase().includes(q) ||
          item.calibratorName.toLowerCase().includes(q) ||
          item.ticket.kategori.toLowerCase().includes(q) ||
          item.ticket.pokokMasalah.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [calibrations, historyCalibratorFilter, historySearch]);

  // --- SUBTAB 1: ISI KALIBRASI HANDLERS ---
  const handleStartCalibration = (item: SamplingEvaluation) => {
    setSelectedEvaluation(item);
    setCalibratorNotes('');

    // Pre-populate with baseline or neutral values
    const initScores: Record<string, number> = {};
    indicators.forEach((ind) => {
      // Find QA's score as reference or start fresh
      const qaScore = item.scores.find((s) => s.indicatorId === ind.id)?.score ?? 85;
      initScores[ind.id] = qaScore;
    });
    setCalibratorScores(initScores);
  };

  // Random pick among uncalibrated evaluations
  const handleRandomPick = () => {
    if (uncalibratedEvaluations.length === 0) {
      alert('Tidak ada tiket hasil sampling QA yang belum dikalibrasi.');
      return;
    }
    const randomIndex = Math.floor(Math.random() * uncalibratedEvaluations.length);
    handleStartCalibration(uncalibratedEvaluations[randomIndex]);
  };

  // Run AI assist for calibrator
  const handleRunAiAssist = async () => {
    if (!selectedEvaluation) return;
    setIsAiLoading(true);
    try {
      const res = await evaluateTicketWithAI(selectedEvaluation.ticket);
      if (res.success && res.scores) {
        const newScores: Record<string, number> = {};
        res.scores.forEach((s) => {
          newScores[s.indicatorId] = s.score;
        });
        setCalibratorScores(newScores);
        if (res.aiAnalysis?.saran) {
          setCalibratorNotes(`Catatan kalibrator: ${res.aiAnalysis.saran}`);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Live calculation of calibrator score & comparison percentage
  const liveCalibratorScore = useMemo(() => {
    if (indicators.length === 0) return 0;
    const totalBobot = indicators.reduce((acc, i) => acc + (Number(i.bobot) || 0), 0) || 100;
    const weightedSum = indicators.reduce((acc, ind) => {
      const sc = calibratorScores[ind.id] ?? 85;
      return acc + (sc * (ind.bobot || 0));
    }, 0);
    return Math.round((weightedSum / totalBobot) * 10) / 10;
  }, [indicators, calibratorScores]);

  const liveComparison = useMemo(() => {
    if (!selectedEvaluation) return { gap: 0, percentage: 100 };
    const qaScore = selectedEvaluation.nilaiAwal;
    const gap = Math.round(Math.abs(qaScore - liveCalibratorScore) * 10) / 10;
    const percentage = Math.max(
      0,
      Math.min(100, Math.round((1 - gap / Math.max(liveCalibratorScore, 1)) * 1000) / 10)
    );
    return { gap, percentage };
  }, [selectedEvaluation, liveCalibratorScore]);

  // Submit calibration
  const handleSubmitCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvaluation) return;

    const formattedScores: IndicatorScore[] = indicators.map((ind) => ({
      indicatorId: ind.id,
      score: calibratorScores[ind.id] ?? 85,
      notes: `Kalibrasi: ${calibratorScores[ind.id] ?? 85}`,
    }));

    const result = createCalibration({
      samplingEvaluation: selectedEvaluation,
      scores: formattedScores,
      catatanKalibrasi:
        calibratorNotes.trim() ||
        `Hasil kalibrasi kesesuaian nilai sampling QA oleh ${currentUser.name} (${currentUser.role.toUpperCase()}).`,
    });

    const targetNo = selectedEvaluation.nomorTiket;
    setSelectedEvaluation(null);
    setToastMessage(
      `Kalibrasi tiket ${targetNo} berhasil disimpan! Persentase kesesuaian: ${result.persentaseKesesuaian}%. Tiket ini telah tercatat dan terkunci (maksimal 1 kali kalibrasi).`
    );
    setTimeout(() => setToastMessage(null), 6000);
    setActiveSubTab('history');
  };

  // --- SUBTAB 2: HISTORY KALIBRASI EXPORT ---
  const handleExportHistoryCSV = () => {
    const headers = [
      'ID Kalibrasi',
      'No. Tiket',
      'Tanggal Kalibrasi',
      'Petugas',
      'Asesor QA',
      'Kalibrator',
      'Role Kalibrator',
      'Nilai Sampling QA',
      'Nilai Kalibrasi',
      'Selisih GAP',
      'Persentase Kesesuaian (%)',
      'Catatan Kalibrasi',
    ];

    const rows = filteredCalibrations.map((c) => [
      `"${c.id}"`,
      `"${c.nomorTiket}"`,
      `"${c.tanggalKalibrasi}"`,
      `"${c.ticket.namaPetugas}"`,
      `"${c.qaName}"`,
      `"${c.calibratorName}"`,
      `"${c.calibratorRole}"`,
      c.nilaiSamplingQA,
      c.nilaiKalibrasi,
      c.selisihNilai,
      `${c.persentaseKesesuaian}%`,
      `"${c.catatanKalibrasi}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_history_kalibrasi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- SUBTAB 3: DASHBOARD KALIBRASI AGGREGATES ---
  // Unique filter lists
  const filterOptions = useMemo(() => {
    const petugasSet = new Set<string>();
    const qaSet = new Set<string>();
    const kategoriSet = new Set<string>();
    const pokokSet = new Set<string>();
    const topikSet = new Set<string>();

    calibrations.forEach((c) => {
      if (c.ticket.namaPetugas) petugasSet.add(c.ticket.namaPetugas);
      if (c.qaName) qaSet.add(c.qaName);
      if (c.ticket.kategori) kategoriSet.add(c.ticket.kategori);
      if (c.ticket.pokokMasalah) pokokSet.add(c.ticket.pokokMasalah);
      if (c.ticket.topikMasalah) topikSet.add(c.ticket.topikMasalah);
    });

    return {
      petugas: Array.from(petugasSet).sort(),
      qa: Array.from(qaSet).sort(),
      kategori: Array.from(kategoriSet).sort(),
      pokok: Array.from(pokokSet).sort(),
      topik: Array.from(topikSet).sort(),
    };
  }, [calibrations]);

  const dashboardMetrics = useMemo(() => {
    const list = filteredCalibrations;
    if (list.length === 0) {
      return {
        avgKesesuaian: 0,
        avgQa: 0,
        avgKalibrasi: 0,
        avgGap: 0,
        total: 0,
        highSyncCount: 0, // >= 95%
        medSyncCount: 0, // 85-94%
        lowSyncCount: 0, // < 85%
      };
    }

    const sumKesesuaian = list.reduce((a, b) => a + b.persentaseKesesuaian, 0);
    const sumQa = list.reduce((a, b) => a + b.nilaiSamplingQA, 0);
    const sumKalibrasi = list.reduce((a, b) => a + b.nilaiKalibrasi, 0);
    const sumGap = list.reduce((a, b) => a + b.selisihNilai, 0);

    let high = 0;
    let med = 0;
    let low = 0;

    list.forEach((c) => {
      if (c.persentaseKesesuaian >= 95) high++;
      else if (c.persentaseKesesuaian >= 85) med++;
      else low++;
    });

    return {
      avgKesesuaian: Math.round((sumKesesuaian / list.length) * 10) / 10,
      avgQa: Math.round((sumQa / list.length) * 10) / 10,
      avgKalibrasi: Math.round((sumKalibrasi / list.length) * 10) / 10,
      avgGap: Math.round((sumGap / list.length) * 10) / 10,
      total: list.length,
      highSyncCount: high,
      medSyncCount: med,
      lowSyncCount: low,
    };
  }, [filteredCalibrations]);

  // Indicator alignment breakdown (QA vs Kalibrator GAP per indicator)
  const indicatorAlignment = useMemo(() => {
    return indicators.map((ind) => {
      let gapSum = 0;
      let count = 0;

      filteredCalibrations.forEach((c) => {
        const qaScore = c.scoresQA.find((s) => s.indicatorId === ind.id)?.score;
        const calScore = c.scoresKalibrasi.find((s) => s.indicatorId === ind.id)?.score;
        if (typeof qaScore === 'number' && typeof calScore === 'number') {
          gapSum += Math.abs(qaScore - calScore);
          count++;
        }
      });

      const avgGap = count > 0 ? Math.round((gapSum / count) * 10) / 10 : 0;
      const alignmentRate = Math.max(0, Math.min(100, Math.round((1 - avgGap / 100) * 1000) / 10));

      return {
        ...ind,
        avgGap,
        alignmentRate,
        sampleCount: count,
      };
    });
  }, [indicators, filteredCalibrations]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 shadow-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <p className="text-xs font-semibold">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Main Header & Sub-Tab Switcher */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <GitCompare className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  Modul Kalibrasi Penilaian Mutu Jawaban
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  Pusat & Admin QA
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Uji banding berkala penilaian sampling Quality Assurance terhadap standar objektif Admin/Pusat
              </p>
            </div>
          </div>

          {/* Quick random pick for admin/pusat on 'isi' tab */}
          {activeSubTab === 'isi' && canPerformCalibration && (
            <button
              onClick={handleRandomPick}
              className="px-4 py-2 bg-gradient-to-r from-purple-700 to-teal-700 hover:from-purple-800 hover:to-teal-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Sampling Acak Kalibrasi
            </button>
          )}
        </div>

        {/* 3 Sub-menus Bar */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          {canPerformCalibration && (
            <button
              onClick={() => setActiveSubTab('isi')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'isi'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Scale className="w-4 h-4" />
              1. Isi Kalibrasi
              <span className="ml-1 text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full">
                {uncalibratedEvaluations.length} Tersedia
              </span>
            </button>
          )}

          {canPerformCalibration && (
            <button
              onClick={() => setActiveSubTab('history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'history'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              2. History Kalibrasi
              <span className="ml-1 text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full">
                {calibrations.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'dashboard'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            3. Dashboard Kalibrasi
          </button>
        </div>
      </div>

      {/* ======================================================================== */}
      {/* SUB-MENU 1: ISI KALIBRASI (Admin & Pusat)                                 */}
      {/* ======================================================================== */}
      {activeSubTab === 'isi' && canPerformCalibration && (
        <div className="space-y-4">
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Ketentuan & Prosedur Kalibrasi:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-purple-800">
                <li>Menilai sampling jawaban yang <strong>telah disampling oleh Quality Assurance</strong>.</li>
                <li>Gunakan tombol <strong>Sampling Acak Kalibrasi</strong> untuk pengujian acak tanpa bias.</li>
                <li>Metode penilaian menggunakan indikator mutu dan bobot yang sama dengan sampling QA.</li>
                <li>Hasil nilai berupa <strong>persentase keselarasan (%)</strong> perbandingan nilai QA terhadap nilai Admin/Pusat.</li>
                <li><strong>Setiap tiket hasil sampling hanya dapat dikalibrasi 1 (satu) kali</strong> untuk menjaga integritas data.</li>
              </ul>
            </div>
          </div>

          {/* List of QA-Sampled Tickets */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Jawaban Hasil Sampling QA untuk Kalibrasi
                </h3>
                <p className="text-xs text-slate-500">
                  Setiap jawaban hasil sampling QA hanya dapat dikalibrasi 1 (satu) kali oleh user Admin atau Pusat. Jawaban terkalibrasi akan otomatis terkunci dan masuk ke History Kalibrasi.
                </p>
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={isiSearch}
                  onChange={(e) => setIsiSearch(e.target.value)}
                  placeholder="Cari no tiket, QA, petugas, tim..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Filter Pills: Semua / Siap Dikalibrasi / Sudah Dikalibrasi */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsiStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isiStatusFilter === 'all'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Jawaban Ternilai QA ({evaluations.length})
              </button>

              <button
                type="button"
                onClick={() => setIsiStatusFilter('uncalibrated')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isiStatusFilter === 'uncalibrated'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Menunggu Kalibrasi ({uncalibratedEvaluations.length})
              </button>

              <button
                type="button"
                onClick={() => setIsiStatusFilter('calibrated')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isiStatusFilter === 'calibrated'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sudah Dikalibrasi ({evaluations.filter((e) => e.isCalibrated).length})
              </button>
            </div>

            {evaluations.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">Belum ada jawaban yang disampling oleh Quality Assurance.</p>
                <p className="text-[11px] text-slate-400">Quality Assurance perlu melakukan sampling dan penilaian terlebih dahulu pada menu "Sampling & Penilaian AI".</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3">No. Tiket</th>
                      <th className="py-3 px-3">Petugas & Tim</th>
                      <th className="py-3 px-3">Kategori & Masalah</th>
                      <th className="py-3 px-3">Asesor QA Asal</th>
                      <th className="py-3 px-3 text-center">Nilai QA</th>
                      <th className="py-3 px-3 text-center">Status Kalibrasi</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {evaluations
                      .filter((e) => {
                        if (isiStatusFilter === 'uncalibrated' && e.isCalibrated) return false;
                        if (isiStatusFilter === 'calibrated' && !e.isCalibrated) return false;

                        if (!isiSearch.trim()) return true;
                        const q = isiSearch.toLowerCase();
                        return (
                          e.nomorTiket.toLowerCase().includes(q) ||
                          e.ticket.namaPetugas.toLowerCase().includes(q) ||
                          e.qaName.toLowerCase().includes(q) ||
                          e.ticket.pokokMasalah.toLowerCase().includes(q) ||
                          (e.petugasTeam || '').toLowerCase().includes(q)
                        );
                      })
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {item.nomorTiket}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-900 block">{item.ticket.namaPetugas}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 inline-block mt-0.5">
                              {item.petugasTeam || 'TIM'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-700 block">{item.ticket.pokokMasalah}</span>
                            <span className="text-[11px] text-slate-400">{item.ticket.topikMasalah}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            <span className="font-medium text-slate-800 block">{item.qaName}</span>
                            <span className="text-[10px] text-slate-400">Tgl: {item.tanggalSampling}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                              {item.nilaiAwal}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.isCalibrated ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Sudah Dikalibrasi (Terkunci)
                                </span>
                                <div className="text-[10px] text-slate-500">
                                  Oleh: <strong>{item.calibratedBy?.name || 'Admin / Pusat'}</strong> ({item.calibratedBy?.role === 'admin' ? 'Admin' : 'Pusat'})
                                </div>
                                <div className="text-[10px] text-purple-700 font-semibold">
                                  Nilai: {item.calibratedBy?.nilaiKalibrasi || '-'} · Keselarasan: {item.calibratedBy?.kesesuaian || '-'}%
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Belum Dikalibrasi
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {item.isCalibrated ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-md text-[10px] font-semibold border border-slate-200 cursor-not-allowed">
                                  🔒 Maks 1x Kalibrasi
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSubTab('history');
                                    setHistorySearch(item.nomorTiket);
                                  }}
                                  className="text-[11px] text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer"
                                >
                                  Lihat di History
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartCalibration(item)}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-700 to-teal-700 hover:from-purple-800 hover:to-teal-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs"
                              >
                                <Scale className="w-3.5 h-3.5 text-amber-300" />
                                Lakukan Kalibrasi
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal / Dialog Pengisian Kalibrasi */}
          {selectedEvaluation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold">Penilaian Kalibrasi Sampling Jawaban</h2>
                        <span className="font-mono text-xs text-purple-200 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                          {selectedEvaluation.nomorTiket}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Petugas: <strong className="text-white">{selectedEvaluation.ticket.namaPetugas}</strong> · Asesor QA: <strong className="text-white">{selectedEvaluation.qaName}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Live Comparison Gauge */}
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-white/10 px-3 py-1 rounded-lg border border-white/20">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block">Nilai QA Asal</span>
                      <span className="text-lg font-extrabold text-teal-300">{selectedEvaluation.nilaiAwal}</span>
                    </div>
                    <span className="text-slate-400">vs</span>
                    <div className="text-center bg-white/10 px-3 py-1 rounded-lg border border-white/20">
                      <span className="text-[10px] uppercase font-bold text-purple-200 block">Nilai Kalibrator</span>
                      <span className="text-lg font-extrabold text-purple-300">{liveCalibratorScore}</span>
                    </div>
                    <div className="text-center bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-400/40">
                      <span className="text-[10px] uppercase font-bold text-emerald-300 block">Keselarasan (%)</span>
                      <span className="text-lg font-extrabold text-emerald-300">{liveComparison.percentage}%</span>
                    </div>

                    <button
                      onClick={() => setSelectedEvaluation(null)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmitCalibration} className="p-6 overflow-y-auto space-y-5 flex-grow text-xs">
                  {/* Context: Keluhan & Jawaban */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                        Keluhan Peserta ({selectedEvaluation.ticket.pokokMasalah}):
                      </span>
                      <p className="text-slate-800 whitespace-pre-wrap leading-relaxed text-xs">
                        {selectedEvaluation.ticket.isiKeluhan}
                      </p>
                    </div>
                    <div className="bg-teal-50/30 p-4 rounded-xl border border-teal-200">
                      <span className="text-[10px] font-bold uppercase text-teal-800 block mb-1">
                        Jawaban Petugas ({selectedEvaluation.ticket.namaPetugas}):
                      </span>
                      <p className="text-slate-900 whitespace-pre-wrap leading-relaxed text-xs">
                        {selectedEvaluation.ticket.isiJawaban}
                      </p>
                    </div>
                  </div>

                  {/* QA Review Benchmark Box */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-teal-700" />
                        Catatan & Nilai Awal Quality Assurance ({selectedEvaluation.qaName}):
                      </span>
                      <span className="font-mono text-xs text-teal-800 font-bold">
                        Skor QA: {selectedEvaluation.nilaiAwal}
                      </span>
                    </div>
                    <p className="text-slate-600 italic">
                      "{selectedEvaluation.catatanAwalQA}"
                    </p>
                  </div>

                  {/* AI Assistance for Calibrator */}
                  <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-purple-700 shrink-0" />
                      <div>
                        <span className="font-bold text-purple-950">Bantuan AI untuk Penilaian Kalibrator</span>
                        <p className="text-[11px] text-purple-800">
                          Jalankan analisis AI untuk mendapatkan panduan penilaian objektif berdasarkan indikator.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isAiLoading}
                      onClick={handleRunAiAssist}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      {isAiLoading ? 'Menganalisis...' : 'Analisis AI'}
                    </button>
                  </div>

                  {/* Scoring Sliders per Indicator */}
                  <div className="space-y-3">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Penilaian Kalibrator per Indikator Mutu (Metode Sampling Standar):</span>
                      <span className="text-[11px] text-purple-800 font-semibold">
                        Geser slider atau masukkan angka 0-100
                      </span>
                    </div>

                    <div className="space-y-3">
                      {indicators.map((ind) => {
                        const score = calibratorScores[ind.id] ?? 85;
                        const qaScore = selectedEvaluation.scores.find((s) => s.indicatorId === ind.id)?.score ?? '-';
                        return (
                          <div key={ind.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="font-bold text-slate-900">{ind.nama}</span>
                                <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded ml-2">
                                  Bobot {ind.bobot}%
                                </span>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Skor QA Sebelumnya: <strong className="text-teal-700 font-bold">{qaScore}</strong>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-slate-500">Nilai Kalibrator:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={score}
                                  onChange={(e) => {
                                    const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                    setCalibratorScores((prev) => ({ ...prev, [ind.id]: val }));
                                  }}
                                  className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-slate-400">/ 100</span>
                              </div>
                            </div>

                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={score}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setCalibratorScores((prev) => ({ ...prev, [ind.id]: val }));
                              }}
                              className="w-full accent-purple-700 h-2 bg-slate-200 rounded-lg cursor-pointer"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Catatan Kalibrasi */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Catatan Evaluasi Kalibrasi (Admin / Pusat) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={calibratorNotes}
                      onChange={(e) => setCalibratorNotes(e.target.value)}
                      placeholder="Tuliskan justifikasi perbandingan nilai, alasan perbedaan persepsi indikator (bila ada), dan rekomendasi standarisasi..."
                      className="w-full p-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500">
                      Nilai Kalibrasi: <strong className="text-purple-900">{liveCalibratorScore}</strong> · Selisih GAP: <strong className="text-slate-800">{liveComparison.gap}</strong> · Keselarasan: <strong className="text-emerald-700">{liveComparison.percentage}%</strong>.
                      (Hanya dapat dikalibrasi 1 kali).
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEvaluation(null)}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg shadow-xs flex items-center gap-2 transition"
                      >
                        <CheckCheck className="w-4 h-4" />
                        Simpan Hasil Kalibrasi
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* SUB-MENU 2: HISTORY KALIBRASI (Admin & Pusat)                             */}
      {/* ======================================================================== */}
      {activeSubTab === 'history' && canPerformCalibration && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Riwayat & Hasil Kalibrasi Penilaian Mutu ({calibrations.length} Tiket)
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar seluruh tiket sampling QA yang telah dilakukan kalibrasi oleh masing-masing user Admin atau Pusat
                </p>
              </div>

              <button
                onClick={handleExportHistoryCSV}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor Riwayat Kalibrasi CSV
              </button>
            </div>

            {/* Filter History by User & Search */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                  <Filter className="w-3.5 h-3.5 text-purple-700" />
                  <span>Filter Kalibrator:</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setHistoryCalibratorFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      historyCalibratorFilter === 'all'
                        ? 'bg-purple-700 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({calibrations.length})
                  </button>
                  <button
                    onClick={() => setHistoryCalibratorFilter(currentUser.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      historyCalibratorFilter === currentUser.id
                        ? 'bg-purple-700 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Oleh Saya ({currentUser.name}) ({calibrations.filter((c) => c.calibratorId === currentUser.id).length})
                  </button>
                </div>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Cari no tiket, nama petugas, QA..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {calibrations.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Belum ada riwayat kalibrasi yang dilakukan. Silakan buka menu <strong>Isi Kalibrasi</strong> untuk mulai mengkalibrasi.
            </div>
          ) : filteredHistoryList.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Tidak ada data riwayat kalibrasi yang sesuai dengan filter kalibrator atau pencarian kata kunci.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistoryList.map((item) => {
                const isHigh = item.persentaseKesesuaian >= 95;
                const isMed = item.persentaseKesesuaian >= 85 && item.persentaseKesesuaian < 95;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-purple-200 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded">
                          {item.nomorTiket}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.tanggalKalibrasi}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600">
                          Petugas: <strong>{item.ticket.namaPetugas}</strong>
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600">
                          Asesor QA: <strong>{item.qaName}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                            isHigh
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isMed
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          <Percent className="w-3 h-3" /> Keselarasan: {item.persentaseKesesuaian}%
                        </span>
                      </div>
                    </div>

                    {/* Score comparison metrics row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Nilai Sampling QA</span>
                        <span className="text-base font-extrabold text-teal-700">{item.nilaiSamplingQA}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Nilai Kalibrator ({item.calibratorRole.toUpperCase()})</span>
                        <span className="text-base font-extrabold text-purple-700">{item.nilaiKalibrasi}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Selisih GAP Deviasi</span>
                        <span className="text-base font-extrabold text-slate-800">{item.selisihNilai} poin</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Kalibrator</span>
                        <span className="text-xs font-semibold text-slate-800 truncate block">{item.calibratorName}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700">
                      <strong>Catatan Kalibrasi:</strong> "{item.catatanKalibrasi}"
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setSelectedHistoryItem(item)}
                        className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline"
                      >
                        Lihat Rincian Perbandingan Indikator →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* History Detail Modal */}
          {selectedHistoryItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
                <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
                  <h3 className="text-sm font-bold">
                    Rincian Kalibrasi Tiket: {selectedHistoryItem.nomorTiket}
                  </h3>
                  <button
                    onClick={() => setSelectedHistoryItem(null)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Asesor QA:</span>
                      <strong className="text-slate-900">{selectedHistoryItem.qaName}</strong> (Nilai: {selectedHistoryItem.nilaiSamplingQA})
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Kalibrator:</span>
                      <strong className="text-purple-900">{selectedHistoryItem.calibratorName}</strong> (Nilai: {selectedHistoryItem.nilaiKalibrasi})
                    </div>
                  </div>

                  <div className="font-bold text-slate-800">Perbandingan Nilai per Indikator Mutu:</div>
                  <div className="space-y-2 border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="py-2 px-3">Indikator</th>
                          <th className="py-2 px-3 text-center">Skor QA</th>
                          <th className="py-2 px-3 text-center">Skor Kalibrator</th>
                          <th className="py-2 px-3 text-center">Selisih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {indicators.map((ind) => {
                          const qa = selectedHistoryItem.scoresQA.find((s) => s.indicatorId === ind.id)?.score ?? '-';
                          const cal = selectedHistoryItem.scoresKalibrasi.find((s) => s.indicatorId === ind.id)?.score ?? '-';
                          const gap = typeof qa === 'number' && typeof cal === 'number' ? Math.abs(qa - cal) : '-';
                          return (
                            <tr key={ind.id}>
                              <td className="py-2 px-3 font-medium text-slate-800">{ind.nama}</td>
                              <td className="py-2 px-3 text-center text-teal-700 font-bold">{qa}</td>
                              <td className="py-2 px-3 text-center text-purple-700 font-bold">{cal}</td>
                              <td className="py-2 px-3 text-center font-semibold text-slate-700">{gap}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setSelectedHistoryItem(null)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* SUB-MENU 3: DASHBOARD KALIBRASI (QA, Admin, & Pusat)                      */}
      {/* ======================================================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 5 Filters Bar: Periode, Nama, Kategori, Pokok Masalah, Topik Masalah */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-purple-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Filter Dashboard Kalibrasi (5 Kriteria)
                </h3>
              </div>
              <button
                onClick={() =>
                  setCalibrationFilters({
                    periode: 'all',
                    namaPetugas: 'all',
                    namaQA: 'all',
                    kategori: 'all',
                    pokokMasalah: 'all',
                    topikMasalah: 'all',
                  })
                }
                className="text-xs text-purple-700 hover:text-purple-900 underline font-medium"
              >
                Reset Semua Filter
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* 1. Periode */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  1. Periode Tanggal
                </label>
                <select
                  value={calibrationFilters.periode}
                  onChange={(e) =>
                    setCalibrationFilters((prev) => ({ ...prev, periode: e.target.value as any }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Semua Periode</option>
                  <option value="today">Hari Ini</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="30days">30 Hari Terakhir</option>
                </select>
              </div>

              {/* 2. Nama (Petugas / QA) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  2. Nama Petugas / Asesor
                </label>
                <select
                  value={calibrationFilters.namaPetugas}
                  onChange={(e) =>
                    setCalibrationFilters((prev) => ({ ...prev, namaPetugas: e.target.value }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Semua Nama (Petugas & QA)</option>
                  {filterOptions.petugas.length > 0 && (
                    <optgroup label="Nama Petugas">
                      {filterOptions.petugas.map((p) => (
                        <option key={`petugas-${p}`} value={p}>
                          {p}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {filterOptions.qa.length > 0 && (
                    <optgroup label="Asesor QA">
                      {filterOptions.qa.map((q) => (
                        <option key={`qa-${q}`} value={q}>
                          {q}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* 3. Kategori */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  3. Kategori Layanan
                </label>
                <select
                  value={calibrationFilters.kategori}
                  onChange={(e) =>
                    setCalibrationFilters((prev) => ({ ...prev, kategori: e.target.value }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Semua Kategori</option>
                  {filterOptions.kategori.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Pokok Masalah */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  4. Pokok Masalah
                </label>
                <select
                  value={calibrationFilters.pokokMasalah}
                  onChange={(e) =>
                    setCalibrationFilters((prev) => ({ ...prev, pokokMasalah: e.target.value }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Semua Pokok Masalah</option>
                  {filterOptions.pokok.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Topik Masalah */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  5. Topik Masalah
                </label>
                <select
                  value={calibrationFilters.topikMasalah}
                  onChange={(e) =>
                    setCalibrationFilters((prev) => ({ ...prev, topikMasalah: e.target.value }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Semua Topik Masalah</option>
                  {filterOptions.topik.map((tm) => (
                    <option key={tm} value={tm}>
                      {tm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Keselarasan Mutu Rata-rata */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Rata-rata Keselarasan Kalibrasi
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-purple-900">
                  {dashboardMetrics.avgKesesuaian}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Tingkat akurasi perbandingan sampling QA terhadap Pusat/Admin
              </p>
            </div>

            {/* KPI 2: Total Dikalibrasi */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Sampel Dikalibrasi
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {dashboardMetrics.total}
                </span>
                <span className="text-xs text-slate-400">tiket</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {uncalibratedEvaluations.length} tiket QA belum dikalibrasi
              </div>
            </div>

            {/* KPI 3: Nilai QA vs Kalibrator */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Rata-rata Nilai: QA vs Pusat
              </span>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-teal-700">{dashboardMetrics.avgQa}</span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-2xl font-extrabold text-purple-700">{dashboardMetrics.avgKalibrasi}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Selisih deviasi rata-rata: <strong className="text-slate-800">{dashboardMetrics.avgGap} poin</strong>
              </p>
            </div>

            {/* KPI 4: Kategori Keselarasan */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Distribusi Keselarasan
              </span>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 font-semibold">Tinggi (≥95%):</span>
                  <span className="font-bold text-slate-900">{dashboardMetrics.highSyncCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-700 font-semibold">Sedang (85-94%):</span>
                  <span className="font-bold text-slate-900">{dashboardMetrics.medSyncCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rose-700 font-semibold">Rendah (&lt;85%):</span>
                  <span className="font-bold text-slate-900">{dashboardMetrics.lowSyncCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Analysis: Per-Indicator Alignment Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tingkat Keselarasan per Indikator Mutu (QA vs Kalibrator)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Menunjukkan indikator mana yang persepsi nilainya paling seragam dan indikator yang memerlukan penyelarasan SOP
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {indicatorAlignment.map((ind) => (
                <div key={ind.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{ind.nama}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">
                        Deviasi Rata-rata: {ind.avgGap} poin
                      </span>
                      <span className="font-bold text-purple-900">
                        {ind.alignmentRate}% Selaras
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        ind.alignmentRate >= 95
                          ? 'bg-emerald-500'
                          : ind.alignmentRate >= 85
                          ? 'bg-purple-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${ind.alignmentRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filtered Calibration Records Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Kalibrasi Berdasarkan Filter ({filteredCalibrations.length} Data)
            </h3>

            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">No. Tiket</th>
                    <th className="py-2.5 px-3">Petugas</th>
                    <th className="py-2.5 px-3">Asesor QA</th>
                    <th className="py-2.5 px-3">Kalibrator</th>
                    <th className="py-2.5 px-3 text-center">Nilai QA</th>
                    <th className="py-2.5 px-3 text-center">Nilai Kalibrasi</th>
                    <th className="py-2.5 px-3 text-center">Keselarasan (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCalibrations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Tidak ada data kalibrasi yang cocok dengan kombinasi 5 filter di atas.
                      </td>
                    </tr>
                  ) : (
                    filteredCalibrations.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{c.nomorTiket}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{c.ticket.namaPetugas}</td>
                        <td className="py-2.5 px-3 text-slate-600">{c.qaName}</td>
                        <td className="py-2.5 px-3 text-purple-900 font-medium">{c.calibratorName}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-teal-700">{c.nilaiSamplingQA}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-purple-700">{c.nilaiKalibrasi}</td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-emerald-700">{c.persentaseKesesuaian}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
