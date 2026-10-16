import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, IndicatorScore } from '../types';
import { DEFAULT_NILAI_OPTIONS } from '../data/mockData';
import { cleanCategory } from '../utils/csvParser';
import {
  Scale,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  Sliders,
  MessageSquare,
  User,
  Star,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  X,
  Layers,
  Check,
  Info,
  Download,
} from 'lucide-react';

export const SamplingView: React.FC = () => {
  const {
    tickets,
    indicators,
    createSamplingEvaluation,
    evaluateTicketWithAI,
    totalIndicatorWeight,
    setActiveTab,
  } = useApp();

  // 4 Required Filter states: Nama Petugas, Kategori, Pokok Masalah, Topik Masalah
  // 4 Required Filter states: Nama Petugas, Kategori, Pokok Masalah, Topik Masalah
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPokokMasalah, setSelectedPokokMasalah] = useState('all');
  const [selectedTopikMasalah, setSelectedTopikMasalah] = useState('all');
  const [filterSampled, setFilterSampled] = useState<'unsampled' | 'sampled' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Default: does not display all data until "Sampling Acak Otomatis" is clicked
  const [sampledTicketsList, setSampledTicketsList] = useState<Ticket[]>([]);
  const [hasSampledClicked, setHasSampledClicked] = useState(false);

  // Active scoring modal
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [selectedNilaiMap, setSelectedNilaiMap] = useState<Record<string, string>>({});
  const [indicatorNotes, setIndicatorNotes] = useState<Record<string, string>>({});
  const [qaGeneralNote, setQaGeneralNote] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiUsed, setIsAiUsed] = useState(false);

  // Success message after submission
  const [successToast, setSuccessToast] = useState<{ show: boolean; ticketNo: string; agent: string } | null>(null);

  // Symmetrical cascading matcher: checks if ticket matches all OTHER active filters
  const ticketMatchesFilters = (
    t: Ticket,
    excludeKey?: 'agent' | 'category' | 'pokok' | 'topik'
  ) => {
    // 1. Sampling status filter
    if (filterSampled === 'unsampled' && t.sampled) return false;
    if (filterSampled === 'sampled' && !t.sampled) return false;

    // 2. Nama Petugas
    if (excludeKey !== 'agent' && selectedAgent !== 'all') {
      if (t.namaPetugas !== selectedAgent) return false;
    }

    // 3. Kategori
    if (excludeKey !== 'category' && selectedCategory !== 'all') {
      if (cleanCategory(t.kategori) !== selectedCategory) return false;
    }

    // 4. Pokok Masalah
    if (excludeKey !== 'pokok' && selectedPokokMasalah !== 'all') {
      if (t.pokokMasalah !== selectedPokokMasalah) return false;
    }

    // 5. Topik Masalah
    if (excludeKey !== 'topik' && selectedTopikMasalah !== 'all') {
      if (t.topikMasalah !== selectedTopikMasalah) return false;
    }

    return true;
  };

  // 1. Available Agent options (cascading with Category, Pokok Masalah, Topik Masalah, filterSampled)
  const agentOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      if (ticketMatchesFilters(t, 'agent')) {
        const name = t.namaPetugas?.trim();
        if (name) {
          counts[name] = (counts[name] || 0) + 1;
        }
      }
    });

    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        value: name,
        label: `${name} (${counts[name]})`,
        count: counts[name],
      }));
  }, [tickets, selectedCategory, selectedPokokMasalah, selectedTopikMasalah, filterSampled]);

  // 2. Available Category options (cascading with Agent, Pokok Masalah, Topik Masalah, filterSampled)
  // Only shows categories that actually exist in the matching data!
  const categoryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      if (ticketMatchesFilters(t, 'category')) {
        const cat = cleanCategory(t.kategori);
        if (cat) {
          counts[cat] = (counts[cat] || 0) + 1;
        }
      }
    });

    const standardOrder: Record<string, number> = {
      'Informasi': 1,
      'Permintaan': 2,
      'Pengaduan': 3,
    };

    return Object.keys(counts)
      .sort((a, b) => (standardOrder[a] || 99) - (standardOrder[b] || 99) || a.localeCompare(b))
      .map((cat) => ({
        value: cat,
        label: `${cat} (${counts[cat]})`,
        count: counts[cat],
      }));
  }, [tickets, selectedAgent, selectedPokokMasalah, selectedTopikMasalah, filterSampled]);

  // 3. Available Pokok Masalah options (cascading with Agent, Category, Topik Masalah, filterSampled)
  const pokokMasalahOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      if (ticketMatchesFilters(t, 'pokok')) {
        const pm = t.pokokMasalah?.trim();
        if (pm) {
          counts[pm] = (counts[pm] || 0) + 1;
        }
      }
    });

    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .map((pm) => ({
        value: pm,
        label: `${pm} (${counts[pm]})`,
        count: counts[pm],
      }));
  }, [tickets, selectedAgent, selectedCategory, selectedTopikMasalah, filterSampled]);

  // 4. Available Topik Masalah options (cascading with Agent, Category, Pokok Masalah, filterSampled)
  const topikMasalahOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      if (ticketMatchesFilters(t, 'topik')) {
        const tm = t.topikMasalah?.trim();
        if (tm) {
          counts[tm] = (counts[tm] || 0) + 1;
        }
      }
    });

    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .map((tm) => ({
        value: tm,
        label: `${tm} (${counts[tm]})`,
        count: counts[tm],
      }));
  }, [tickets, selectedAgent, selectedCategory, selectedPokokMasalah, filterSampled]);

  // Auto-reset dependent filter values if they are no longer in the cascading options list
  useEffect(() => {
    if (selectedAgent !== 'all' && !agentOptions.some((o) => o.value === selectedAgent)) {
      setSelectedAgent('all');
    }
  }, [agentOptions, selectedAgent]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !categoryOptions.some((o) => o.value === selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categoryOptions, selectedCategory]);

  useEffect(() => {
    if (selectedPokokMasalah !== 'all' && !pokokMasalahOptions.some((o) => o.value === selectedPokokMasalah)) {
      setSelectedPokokMasalah('all');
    }
  }, [pokokMasalahOptions, selectedPokokMasalah]);

  useEffect(() => {
    if (selectedTopikMasalah !== 'all' && !topikMasalahOptions.some((o) => o.value === selectedTopikMasalah)) {
      setSelectedTopikMasalah('all');
    }
  }, [topikMasalahOptions, selectedTopikMasalah]);

  // Check if any filter is active
  const hasActiveFilters =
    selectedAgent !== 'all' ||
    selectedCategory !== 'all' ||
    selectedPokokMasalah !== 'all' ||
    selectedTopikMasalah !== 'all';

  const handleResetFilters = () => {
    setSelectedAgent('all');
    setSelectedCategory('all');
    setSelectedPokokMasalah('all');
    setSelectedTopikMasalah('all');
  };

  // Live matching tickets according to current filters & search
  const matchingTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (!ticketMatchesFilters(t)) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          t.nomorTiket.toLowerCase().includes(query) ||
          t.namaPetugas.toLowerCase().includes(query) ||
          t.pokokMasalah.toLowerCase().includes(query) ||
          t.topikMasalah.toLowerCase().includes(query) ||
          t.isiKeluhan.toLowerCase().includes(query) ||
          t.isiJawaban.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [tickets, filterSampled, selectedAgent, selectedCategory, selectedPokokMasalah, selectedTopikMasalah, searchQuery]);

  const matchingTicketsCount = matchingTickets.length;

  // Action: Sampling Acak Otomatis (Menampilkan 10 data berdasarkan filter)
  const handleRandomSamplePick = () => {
    if (matchingTickets.length === 0) {
      setSampledTicketsList([]);
      setHasSampledClicked(true);
      return;
    }

    // Shuffle and pick up to 10
    const shuffled = [...matchingTickets].sort(() => 0.5 - Math.random());
    const selected10 = shuffled.slice(0, 10);

    setSampledTicketsList(selected10);
    setHasSampledClicked(true);
  };

  // Displayed tickets: default empty until Sampling Acak Otomatis is clicked
  const displayedTickets = useMemo(() => {
    if (!hasSampledClicked) return [];
    return sampledTicketsList;
  }, [hasSampledClicked, sampledTicketsList]);

  // Download Excel / CSV for Sampling Data
  const handleDownloadExcel = () => {
    const headers = [
      'Nomor Tiket',
      'Tanggal Tiket',
      'Petugas',
      'Kategori',
      'Pokok Masalah',
      'Topik Masalah',
      'Status Sampling',
      'Rating'
    ];
    const targetTickets = hasSampledClicked ? displayedTickets : tickets.filter(t => t.sampled);
    const rows = targetTickets.map((t) => [
      `"${t.nomorTiket}"`,
      `"${t.tanggalTiket}"`,
      `"${t.namaPetugas}"`,
      `"${t.kategori}"`,
      `"${t.pokokMasalah}"`,
      `"${t.topikMasalah}"`,
      t.sampled ? 'Sudah Disampling' : 'Belum Disampling',
      t.rating,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `data_sampling_mutu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open scoring modal for a ticket
  const handleOpenScoring = (ticket: Ticket) => {
    setActiveTicket(ticket);
    setIsAiUsed(false);
    setAiAnalysis(null);
    setQaGeneralNote('');

    const initialScores: Record<string, number> = {};
    const initialNilaiMap: Record<string, string> = {};
    const initialNotes: Record<string, string> = {};
    indicators.forEach((ind) => {
      const pilihan = (ind.pilihanNilai && ind.pilihanNilai.length > 0) ? ind.pilihanNilai.filter(p => p.enabled) : DEFAULT_NILAI_OPTIONS.filter(p => p.enabled);
      const defaultOpt = pilihan[pilihan.length - 1] || pilihan[0] || { nilai: '3' };
      initialNilaiMap[ind.id] = defaultOpt.nilai;

      let numScore = 100;
      if (defaultOpt.nilai === '0') numScore = 0;
      else if (defaultOpt.nilai === '1') numScore = 50;
      else if (defaultOpt.nilai === '2') numScore = 75;
      else if (defaultOpt.nilai === '3') numScore = 100;
      else if (defaultOpt.nilai === 'N/A') numScore = 100;

      initialScores[ind.id] = numScore;
      initialNotes[ind.id] = '';
    });
    setScores(initialScores);
    setSelectedNilaiMap(initialNilaiMap);
    setIndicatorNotes(initialNotes);
  };

  // Run AI automated evaluation
  const handleRunAiEvaluation = async () => {
    if (!activeTicket) return;
    setIsAiLoading(true);

    try {
      const res = await evaluateTicketWithAI(activeTicket);
      if (res.success && res.scores) {
        const newScores: Record<string, number> = {};
        const newNilaiMap: Record<string, string> = {};
        const newNotes: Record<string, string> = {};

        res.scores.forEach((s) => {
          newScores[s.indicatorId] = s.score;
          if (s.selectedNilai) {
            newNilaiMap[s.indicatorId] = s.selectedNilai;
          } else {
            // infer from score
            if (s.score >= 100) newNilaiMap[s.indicatorId] = '3';
            else if (s.score >= 75) newNilaiMap[s.indicatorId] = '2';
            else if (s.score >= 50) newNilaiMap[s.indicatorId] = '1';
            else newNilaiMap[s.indicatorId] = '0';
          }
          if (s.notes) newNotes[s.indicatorId] = s.notes;
        });

        setScores(newScores);
        setSelectedNilaiMap(newNilaiMap);
        setIndicatorNotes(newNotes);
        setAiAnalysis(res.aiAnalysis);
        setIsAiUsed(true);

        if (res.aiAnalysis?.saran) {
          setQaGeneralNote(`Rekomendasi QA & AI: ${res.aiAnalysis.saran}`);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Calculate live weighted score
  const calculatedTotalScore = useMemo(() => {
    if (indicators.length === 0) return 0;
    const totalBobot = indicators.reduce((acc, i) => acc + (Number(i.bobot) || 0), 0) || 100;
    const weightedSum = indicators.reduce((acc, ind) => {
      const score = scores[ind.id] ?? 100;
      return acc + (score * (ind.bobot || 0));
    }, 0);
    return Math.round((weightedSum / totalBobot) * 10) / 10;
  }, [indicators, scores]);

  // Submit sampling to Petugas Inbox
  const handleSubmitSampling = () => {
    if (!activeTicket) return;

    const formattedScores: IndicatorScore[] = indicators.map((ind) => ({
      indicatorId: ind.id,
      score: scores[ind.id] ?? 100,
      selectedNilai: selectedNilaiMap[ind.id] || '3',
      notes: indicatorNotes[ind.id] || undefined,
    }));

    createSamplingEvaluation({
      ticket: activeTicket,
      scores: formattedScores,
      catatanAwalQA: qaGeneralNote || 'Evaluasi sampling jawaban berkala sesuai indikator mutu.',
      isAiEvaluated: isAiUsed,
      aiAnalysis: aiAnalysis || undefined,
    });

    const submittedTicket = activeTicket;
    setActiveTicket(null);

    // Update local sampledTicketsList status
    setSampledTicketsList((prev) =>
      prev.map((t) => (t.nomorTiket === submittedTicket.nomorTiket ? { ...t, sampled: true } : t))
    );

    setSuccessToast({
      show: true,
      ticketNo: submittedTicket.nomorTiket,
      agent: submittedTicket.namaPetugas,
    });

    setTimeout(() => {
      setSuccessToast(null);
    }, 6000);
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <div>
              <p className="text-xs font-bold">
                Sampling Jawaban Berhasil Dikirim ke Inbox Petugas!
              </p>
              <p className="text-xs text-teal-700 mt-0.5">
                Tiket <span className="font-semibold">{successToast.ticketNo}</span> ({successToast.agent}) telah masuk ke Inbox Hasil Sampling Petugas dan siap direview atau disanggah.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('inbox-petugas')}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shrink-0 transition"
          >
            Buka Inbox Petugas
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
              <Scale className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Sampling Jawaban Petugas & Penilaian AI
              </h1>
              <p className="text-xs text-slate-500">
                Pilih filter Nama Petugas, Kategori, Pokok Masalah, dan Topik Masalah, lalu klik Sampling Acak Otomatis untuk menampilkan 10 data sampling.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRandomSamplePick}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Sampling Acak Otomatis (10 Data)
            </button>
          </div>
        </div>

        {/* Filters Grid (Nama Petugas, Kategori, Pokok Masalah, Topik Masalah) */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Nama Petugas */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                1. Nama Petugas
              </label>
              {selectedAgent !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedAgent('all')}
                  className="text-[10px] text-teal-600 hover:text-teal-800 font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 transition"
            >
              <option value="all">Semua Petugas ({agentOptions.length})</option>
              {agentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Kategori */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                2. Kategori
              </label>
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="text-[10px] text-teal-600 hover:text-teal-800 font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 transition"
            >
              <option value="all">Semua Kategori ({categoryOptions.length})</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pokok Masalah */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                3. Pokok Masalah
              </label>
              {selectedPokokMasalah !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedPokokMasalah('all')}
                  className="text-[10px] text-teal-600 hover:text-teal-800 font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <select
              value={selectedPokokMasalah}
              onChange={(e) => setSelectedPokokMasalah(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 transition"
            >
              <option value="all">Semua Pokok Masalah ({pokokMasalahOptions.length})</option>
              {pokokMasalahOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Topik Masalah */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                4. Topik Masalah
              </label>
              {selectedTopikMasalah !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedTopikMasalah('all')}
                  className="text-[10px] text-teal-600 hover:text-teal-800 font-semibold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <select
              value={selectedTopikMasalah}
              onChange={(e) => setSelectedTopikMasalah(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 transition"
            >
              <option value="all">Semua Topik Masalah ({topikMasalahOptions.length})</option>
              {topikMasalahOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional search & status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative min-w-[240px] flex-grow">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata kunci keluhan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
              />
            </div>

            <select
              value={filterSampled}
              onChange={(e) => setFilterSampled(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="all">Semua Status (Disampling & Belum)</option>
              <option value="unsampled">Belum Disampling</option>
              <option value="sampled">Sudah Disampling</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 transition cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>

          <div className="text-slate-500 font-medium flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-semibold">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              Tersedia: <strong className="text-teal-700">{matchingTicketsCount}</strong> tiket sesuai filter
            </span>
            {hasSampledClicked ? (
              <span className="text-slate-600">
                | Menampilkan <strong className="text-slate-800">{displayedTickets.length}</strong> data sampling terpilih
              </span>
            ) : (
              <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold hidden md:inline-block">
                Klik "Sampling Acak Otomatis" untuk memilih 10 data
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Nomor Tiket & Tgl</th>
                <th className="py-3 px-4">Kategori & Masalah</th>
                <th className="py-3 px-4 max-w-xs">Isi Keluhan & Jawaban Petugas</th>
                <th className="py-3 px-4">Petugas & Rating</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {!hasSampledClicked ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 bg-slate-50/50">
                    <div className="max-w-md mx-auto space-y-3 p-6">
                      <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 mx-auto flex items-center justify-center border border-teal-200">
                        <Filter className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">Belum Ada Data Sampling Ditampilkan</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Sesuai ketentuan, sistem tidak menampilkan data keseluruhan secara default. Silakan tentukan filter <strong>Nama Petugas</strong>, <strong>Kategori</strong>, <strong>Pokok Masalah</strong>, dan <strong>Topik Masalah</strong> di atas, lalu klik tombol <strong>Sampling Acak Otomatis</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={handleRandomSamplePick}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Sampling Acak Otomatis Sekarang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : displayedTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada tiket yang sesuai dengan kriteria filter dan pencarian saat ini. Silakan ubah filter atau coba lagi.
                  </td>
                </tr>
              ) : (
                displayedTickets.map((ticket) => (
                  <tr key={ticket.nomorTiket} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 font-mono text-[11px]">
                        {ticket.nomorTiket}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {ticket.tanggalTiket}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          ticket.kategori.toLowerCase() === 'pengaduan'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {ticket.kategori}
                      </span>
                      <div className="font-medium text-slate-800 text-xs mt-1 truncate max-w-[200px]" title={ticket.pokokMasalah}>
                        {ticket.pokokMasalah}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={ticket.topikMasalah}>
                        {ticket.topikMasalah}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-md">
                      <div className="space-y-1.5">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Keluhan Peserta:
                          </span>
                          <p className="text-slate-700 line-clamp-2 text-[11px]">
                            {ticket.isiKeluhan}
                          </p>
                        </div>
                        <div className="bg-teal-50/50 p-2 rounded-lg border border-teal-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block mb-0.5">
                            Jawaban Petugas:
                          </span>
                          <p className="text-slate-800 line-clamp-2 text-[11px]">
                            {ticket.isiJawaban}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ticket.namaPetugas}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < ticket.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                        <span className="text-[11px] text-slate-500 ml-1 font-semibold">
                          {ticket.rating}.0
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {ticket.sampled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Disampling
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Belum Sampling
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenScoring(ticket)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto ${
                          ticket.sampled
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-teal-700 hover:bg-teal-800 text-white shadow-2xs'
                        }`}
                      >
                        <Scale className="w-3.5 h-3.5" />
                        {ticket.sampled ? 'Ubah Penilaian' : 'Nilai Jawaban'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scoring Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-tight">
                      Penilaian Mutu Jawaban Petugas
                    </h2>
                    <span className="font-mono text-xs text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800">
                      {activeTicket.nomorTiket}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Petugas: <span className="text-slate-200 font-semibold">{activeTicket.namaPetugas}</span> · Tanggal: {activeTicket.tanggalTiket}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    Nilai Mutu Awal (Live)
                  </div>
                  <div className="text-xl font-extrabold text-teal-300">
                    {calculatedTotalScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTicket(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              {/* Ticket Inspection: Keluhan vs Jawaban Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Keluhan */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Isi Keluhan / Pertanyaan Peserta
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Rating: {activeTicket.rating} / 5 ★
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed mt-2">
                    {activeTicket.isiKeluhan}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span><strong>Pokok:</strong> {activeTicket.pokokMasalah}</span>
                    <span><strong>Topik:</strong> {activeTicket.topikMasalah}</span>
                  </div>
                </div>

                {/* Right: Jawaban Petugas */}
                <div className="bg-teal-50/40 rounded-xl border border-teal-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded border border-teal-200">
                      Isi Jawaban Petugas ({activeTicket.namaPetugas})
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {activeTicket.isiJawaban.length} Karakter
                    </span>
                  </div>
                  <p className="text-xs text-slate-900 whitespace-pre-wrap leading-relaxed mt-2 font-normal">
                    {activeTicket.isiJawaban}
                  </p>
                </div>
              </div>

              {/* AI Auto-Evaluation Trigger Bar */}
              <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-blue-50 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Penilaian Otomatis Berbasis AI (Gemini 3.8 Flash)
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      AI membaca isi keluhan & jawaban, mencocokkan dengan seluruh {indicators.length} indikator & bobot aktif.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={handleRunAiEvaluation}
                  className="w-full sm:w-auto px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition shrink-0"
                >
                  {isAiLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Menganalisis Teks Jawaban...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Jalankan Penilaian Otomatis (AI)
                    </>
                  )}
                </button>
              </div>

              {/* AI Insights Card if available */}
              {aiAnalysis && (
                <div className="bg-white border border-teal-300 rounded-xl p-4 shadow-2xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      Hasil Ringkasan Analisis AI
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Skor Terhitung: {calculatedTotalScore}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 italic">
                    "{aiAnalysis.ringkasan}"
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                    {aiAnalysis.kelebihan?.length > 0 && (
                      <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                        <span className="font-bold text-emerald-800 text-[11px] block mb-1">
                          Poin Kelebihan:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                          {aiAnalysis.kelebihan.map((k: string, i: number) => (
                            <li key={i}>{k}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiAnalysis.kekurangan?.length > 0 && (
                      <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                        <span className="font-bold text-amber-800 text-[11px] block mb-1">
                          Poin Perhatian:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                          {aiAnalysis.kekurangan.map((k: string, i: number) => (
                            <li key={i}>{k}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Indikator Penilaian Sliders & Inputs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-teal-700" />
                    Penilaian per Indikator Mutu (Dapat Diedit & Disesuaikan)
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Total Bobot: <span className={totalIndicatorWeight === 100 ? 'text-teal-700 font-bold' : 'text-rose-600 font-bold'}>{totalIndicatorWeight}%</span>
                  </span>
                </div>

                <div className="space-y-4">
                  {indicators.map((ind, idx) => {
                    const currentNilai = selectedNilaiMap[ind.id] || '3';
                    const currentScore = scores[ind.id] ?? 100;
                    const pilihanNilai = (ind.pilihanNilai && ind.pilihanNilai.length > 0)
                      ? ind.pilihanNilai.filter(p => p.enabled)
                      : DEFAULT_NILAI_OPTIONS.filter(p => p.enabled);

                    const selectedOptObj = pilihanNilai.find(p => p.nilai === currentNilai) || pilihanNilai[0];

                    return (
                      <div
                        key={ind.id}
                        className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-teal-700 text-white font-bold text-[10px] flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <h4 className="font-bold text-xs text-slate-900">{ind.nama}</h4>
                              <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">
                                Bobot {ind.bobot}%
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 pl-7">
                              {ind.deskripsi}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
                            <label className="text-[11px] font-bold text-slate-600">Pilih Nilai:</label>
                            <select
                              value={currentNilai}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedNilaiMap((prev) => ({ ...prev, [ind.id]: val }));
                                let numScore = 100;
                                if (val === '0') numScore = 0;
                                else if (val === '1') numScore = 50;
                                else if (val === '2') numScore = 75;
                                else if (val === '3') numScore = 100;
                                else if (val === 'N/A') numScore = 100;
                                setScores((prev) => ({ ...prev, [ind.id]: numScore }));
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              {pilihanNilai.map((opt) => (
                                <option key={opt.nilai} value={opt.nilai}>
                                  Nilai {opt.nilai} - {opt.label}
                                </option>
                              ))}
                            </select>
                            <span className="bg-teal-700 text-white font-extrabold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs">
                              {currentScore} Poin
                            </span>
                          </div>
                        </div>

                        {selectedOptObj?.referensiKetentuan && (
                          <div className="pl-7 bg-white/80 rounded-lg p-2.5 border border-slate-200 text-[11px] text-slate-600">
                            <span className="font-bold text-teal-800">Referensi Nilai {currentNilai}:</span> {selectedOptObj.referensiKetentuan}
                          </div>
                        )}

                        {/* Note per indicator */}
                        <div className="pl-7">
                          <input
                            type="text"
                            value={indicatorNotes[ind.id] || ''}
                            onChange={(e) => {
                              const text = e.target.value;
                              setIndicatorNotes((prev) => ({ ...prev, [ind.id]: text }));
                            }}
                            placeholder={`Catatan penilai untuk indikator ${ind.nama}...`}
                            className="w-full px-3 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* General QA Review Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Umum Asesor Quality Assurance
                </label>
                <textarea
                  rows={2}
                  value={qaGeneralNote}
                  onChange={(e) => setQaGeneralNote(e.target.value)}
                  placeholder="Berikan umpan balik menyeluruh atau arahan perbaikan untuk petugas..."
                  className="w-full p-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                Nilai Akhir Terbobot: <strong className="text-teal-800 text-sm">{calculatedTotalScore}</strong>.
                Hasil akan langsung dikirim ke <span className="font-semibold text-slate-800">Inbox Petugas ({activeTicket.namaPetugas})</span>.
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTicket(null)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmitSampling}
                  className="w-full sm:w-auto px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirim Hasil Sampling ke Inbox Petugas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
