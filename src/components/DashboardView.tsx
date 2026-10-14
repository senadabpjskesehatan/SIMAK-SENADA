import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  Award,
  AlertCircle,
  Star,
  CheckCircle2,
  Clock,
  Filter,
  Users,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    tickets,
    evaluations,
    indicators,
    filters,
    setFilters,
    filteredTickets,
    filteredEvaluations,
    setActiveTab,
    currentUser,
  } = useApp();

  // List of unique agents
  const agentList = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.namaPetugas) set.add(t.namaPetugas);
    });
    return Array.from(set).sort();
  }, [tickets]);

  // Real-time KPIs
  const totalTickets = filteredTickets.length;
  const sampledTickets = filteredEvaluations.length;
  const samplingRate = totalTickets > 0 ? Math.round((sampledTickets / totalTickets) * 100) : 0;

  // Average Quality Score (based on nilaiFinal)
  const averageQualityScore = useMemo(() => {
    if (filteredEvaluations.length === 0) return 0;
    const sum = filteredEvaluations.reduce((acc, curr) => acc + curr.nilaiFinal, 0);
    return Math.round((sum / filteredEvaluations.length) * 10) / 10;
  }, [filteredEvaluations]);

  // Score Predicate
  const getScorePredicate = (score: number) => {
    if (score >= 90) return { label: 'Sangat Baik (A)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 80) return { label: 'Baik (B)', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    if (score >= 70) return { label: 'Cukup (C)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Perlu Perbaikan (D)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  // Rebuttal / Dispute Rate
  const rebuttedEvaluations = useMemo(() => {
    return filteredEvaluations.filter((e) => e.sanggahan !== undefined);
  }, [filteredEvaluations]);

  const disputeRate = sampledTickets > 0
    ? Math.round((rebuttedEvaluations.length / sampledTickets) * 100)
    : 0;

  // Participant Satisfaction (Rating 1-5)
  const averageCustomerRating = useMemo(() => {
    if (filteredTickets.length === 0) return 0;
    const sum = filteredTickets.reduce((acc, curr) => acc + (curr.rating || 5), 0);
    return Math.round((sum / filteredTickets.length) * 10) / 10;
  }, [filteredTickets]);

  // Performance per Agent Leaderboard
  const agentPerformance = useMemo(() => {
    const map = new Map<string, { total: number; sampled: number; scoreSum: number; disputes: number; ratings: number[] }>();

    filteredTickets.forEach((t) => {
      const current = map.get(t.namaPetugas) || { total: 0, sampled: 0, scoreSum: 0, disputes: 0, ratings: [] };
      current.total += 1;
      if (t.rating) current.ratings.push(t.rating);
      map.set(t.namaPetugas, current);
    });

    filteredEvaluations.forEach((e) => {
      const agent = e.ticket.namaPetugas;
      const current = map.get(agent) || { total: 0, sampled: 0, scoreSum: 0, disputes: 0, ratings: [] };
      current.sampled += 1;
      current.scoreSum += e.nilaiFinal;
      if (e.sanggahan) current.disputes += 1;
      map.set(agent, current);
    });

    return Array.from(map.entries()).map(([name, stat]) => {
      const avgScore = stat.sampled > 0 ? Math.round((stat.scoreSum / stat.sampled) * 10) / 10 : 0;
      const avgRating = stat.ratings.length > 0
        ? Math.round((stat.ratings.reduce((a, b) => a + b, 0) / stat.ratings.length) * 10) / 10
        : 5;
      return {
        name,
        totalTickets: stat.total,
        sampledCount: stat.sampled,
        averageScore: avgScore,
        disputes: stat.disputes,
        rating: avgRating,
      };
    }).sort((a, b) => b.averageScore - a.averageScore);
  }, [filteredTickets, filteredEvaluations]);

  // Performance per Indicator breakdown
  const indicatorStats = useMemo(() => {
    return indicators.map((ind) => {
      let scoreSum = 0;
      let count = 0;

      filteredEvaluations.forEach((evalItem) => {
        const found = evalItem.scores.find((s) => s.indicatorId === ind.id);
        if (found) {
          scoreSum += found.score;
          count += 1;
        }
      });

      const avg = count > 0 ? Math.round(scoreSum / count) : 85;
      return {
        ...ind,
        averageScore: avg,
        evalCount: count,
      };
    });
  }, [indicators, filteredEvaluations]);

  // Category Distribution
  const categoryStats = useMemo(() => {
    let informasiCount = 0;
    let pengaduanCount = 0;
    filteredTickets.forEach((t) => {
      if (t.kategori.toLowerCase() === 'pengaduan') pengaduanCount++;
      else informasiCount++;
    });
    return { informasiCount, pengaduanCount };
  }, [filteredTickets]);

  const predicate = getScorePredicate(averageQualityScore);

  return (
    <div className="space-y-6">
      {/* Realtime Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Filter Realtime Evaluasi
            </h2>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">
              Perubahan filter langsung memperbarui seluruh grafik & metrik
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Periode Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Periode:
              </span>
              <select
                value={filters.periode}
                onChange={(e) => setFilters((prev) => ({ ...prev, periode: e.target.value as any }))}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">Semua Periode</option>
                <option value="today">Hari Ini</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="30days">30 Hari Terakhir</option>
              </select>
            </div>

            {/* Nama Petugas Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Petugas:
              </span>
              <select
                value={filters.namaPetugas}
                onChange={(e) => setFilters((prev) => ({ ...prev, namaPetugas: e.target.value }))}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[180px]"
              >
                <option value="all">Semua Petugas ({agentList.length})</option>
                {agentList.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            {(filters.periode !== 'all' || filters.namaPetugas !== 'all') && (
              <button
                onClick={() => setFilters({ periode: 'all', namaPetugas: 'all', kategori: 'all', status: 'all' })}
                className="text-xs text-slate-500 hover:text-slate-800 underline transition"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Nilai Mutu Akhir */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Rata-rata Nilai Mutu
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {averageQualityScore > 0 ? averageQualityScore.toFixed(1) : '-'}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${predicate.color}`}>
              {predicate.label}
            </span>
            <span className="text-[11px] text-slate-400">dari {sampledTickets} sampling</span>
          </div>
        </div>

        {/* Card 2: Sampling Coverage */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Rasio Sampling Jawaban
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{samplingRate}%</span>
            <span className="text-xs text-slate-500">
              ({sampledTickets} / {totalTickets} tiket)
            </span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, samplingRate)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 3: Dispute / Sanggahan Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tingkat Sanggahan (Dispute)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{disputeRate}%</span>
            <span className="text-xs text-slate-500">
              ({rebuttedEvaluations.length} sanggahan diajukan)
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              {filteredEvaluations.filter((e) => e.status === 'PROSES_SANGGAHAN').length} Menunggu Putusan QA
            </span>
          </div>
        </div>

        {/* Card 4: Kepuasan Peserta */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Rating Kepuasan Peserta
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {averageCustomerRating.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">/ 5.0 Bintang</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
            <span className="text-emerald-700 font-medium">Berdasarkan ulasan peserta</span>
          </div>
        </div>
      </div>

      {/* Row 2: Visual Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Agent Performance Leaderboard */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Peringkat & Kinerja Mutu Jawaban Petugas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nilai akhir resmi setelah rekonsiliasi sanggahan QA
              </p>
            </div>
            {['qa', 'team_leader', 'petugas'].includes(currentUser.role) ? (
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
              >
                Lihat History <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('kalibrasi')}
                className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1"
              >
                Lihat Kalibrasi <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Petugas</th>
                  <th className="py-2.5 px-3 text-center">Tiket</th>
                  <th className="py-2.5 px-3 text-center">Disampling</th>
                  <th className="py-2.5 px-3 text-center">Sanggahan</th>
                  <th className="py-2.5 px-3">Skor Mutu Rata-rata</th>
                  <th className="py-2.5 px-3 text-right">Predikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {agentPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Tidak ada data petugas yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  agentPerformance.map((agent, idx) => {
                    const agentPred = getScorePredicate(agent.averageScore);
                    return (
                      <tr key={agent.name} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800">{agent.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">{agent.totalTickets}</td>
                        <td className="py-3 px-3 text-center font-medium text-teal-700">
                          {agent.sampledCount}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {agent.disputes > 0 ? (
                            <span className="text-amber-700 font-semibold">{agent.disputes}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 w-8">
                              {agent.averageScore > 0 ? agent.averageScore : '-'}
                            </span>
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${
                                  agent.averageScore >= 85
                                    ? 'bg-emerald-500'
                                    : agent.averageScore >= 75
                                    ? 'bg-teal-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, agent.averageScore)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${agentPred.color}`}>
                            {agentPred.label.split(' ')[0]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Performance per Indikator Mutu */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Capaian per Indikator Mutu</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi nilai berdasarkan bobot indikator aktif
                </p>
              </div>
              {currentUser.role === 'qa' && (
                <button
                  onClick={() => setActiveTab('indicators')}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  Ubah Bobot
                </button>
              )}
            </div>

            <div className="space-y-4">
              {indicatorStats.map((ind) => (
                <div key={ind.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[200px]" title={ind.nama}>
                      {ind.nama}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        Bobot {ind.bobot}%
                      </span>
                      <span className="font-bold text-slate-900">{ind.averageScore}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${ind.averageScore}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category distribution footer */}
          <div className="pt-5 mt-5 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700 mb-2">Komposisi Tiket</div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-teal-600"></span>
                <span className="text-slate-600">Pengaduan:</span>
                <span className="font-bold text-slate-900">{categoryStats.pengaduanCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-slate-600">Informasi:</span>
                <span className="font-bold text-slate-900">{categoryStats.informasiCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Quick Action & Live Stream */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">
              {currentUser.role === 'qa'
                ? 'Ingin Melakukan Sampling Jawaban Sekarang?'
                : currentUser.role === 'admin' || currentUser.role === 'pusat'
                ? 'Uji Banding & Kalibrasi Nilai Sampling'
                : 'Pusat Layanan & Monitoring Mutu Petugas'}
            </h4>
            <p className="text-xs text-teal-200 mt-0.5">
              {currentUser.role === 'qa'
                ? 'Ambil sampel jawaban petugas secara acak atau pilih spesifik, lalu manfaatkan penilaian otomatis AI berbasis indikator aktif.'
                : currentUser.role === 'admin' || currentUser.role === 'pusat'
                ? 'Lakukan kalibrasi objektif dari jawaban yang telah disampling oleh Quality Assurance dengan sistem acak.'
                : 'Pantau hasil penilaian mutu sampling dan perkembangan sanggahan layanan informasi dan pengaduan.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          {currentUser.role === 'qa' && (
            <>
              <button
                onClick={() => setActiveTab('sampling')}
                className="w-full md:w-auto px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition"
              >
                Mulai Sampling Jawaban QA
              </button>
              <button
                onClick={() => setActiveTab('google-sheet')}
                className="w-full md:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-xs transition"
              >
                Sinkronkan Data Sheet
              </button>
            </>
          )}

          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('kalibrasi')}
                className="w-full md:w-auto px-4 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition"
              >
                Isi Kalibrasi Mutu
              </button>
              <button
                onClick={() => setActiveTab('users-management')}
                className="w-full md:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-xs transition"
              >
                Kelola Manajemen User
              </button>
            </>
          )}

          {currentUser.role === 'pusat' && (
            <button
              onClick={() => setActiveTab('kalibrasi')}
              className="w-full md:w-auto px-4 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition"
            >
              Buka Modul Kalibrasi Mutu
            </button>
          )}

          {(currentUser.role === 'petugas' || currentUser.role === 'team_leader') && (
            <>
              <button
                onClick={() => setActiveTab('inbox-petugas')}
                className="w-full md:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition"
              >
                Inbox Hasil Sampling
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className="w-full md:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-xs transition"
              >
                Lihat History & Nilai Akhir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
