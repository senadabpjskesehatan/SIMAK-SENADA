import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Filter,
  Users,
  Calendar,
  Layers,
  BarChart2,
  FileText,
  CheckCircle2,
  Award,
  ShieldAlert,
} from 'lucide-react';

export const DashboardAnalysisView: React.FC = () => {
  const { filteredEvaluations, evaluations, indicators, currentUser } = useApp();

  const isPetugas = currentUser?.role === 'petugas';
  const isTeamLeader = currentUser?.role === 'team_leader';

  // Filters for analysis
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all', 'YYYY-MM'
  const [teamFilter, setTeamFilter] = useState('all'); // 'all', 'TIM 1' ...
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'Informasi', 'Permintaan', 'Pengaduan'
  const [agentFilter, setAgentFilter] = useState('all'); // 'all', agent name

  // Auto set filters on role change or mount
  useEffect(() => {
    if (isPetugas && currentUser?.name) {
      setAgentFilter(currentUser.name);
    } else if (isTeamLeader && currentUser?.team) {
      setTeamFilter(currentUser.team);
    }
  }, [currentUser, isPetugas, isTeamLeader]);

  // Unique list values for filters
  const periodList = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach((e) => {
      if (e.tanggalSampling) {
        set.add(e.tanggalSampling.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [evaluations]);

  const teamList = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach((e) => {
      if (e.petugasTeam) set.add(e.petugasTeam);
    });
    return Array.from(set).sort();
  }, [evaluations]);

  const categoryList = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach((e) => {
      if (e.ticket?.kategori) set.add(e.ticket.kategori);
    });
    return Array.from(set).sort();
  }, [evaluations]);

  const agentList = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach((e) => {
      if (isTeamLeader && currentUser?.team && e.petugasTeam !== currentUser.team) return;
      if (teamFilter !== 'all' && e.petugasTeam !== teamFilter) return;
      if (e.ticket?.namaPetugas) set.add(e.ticket.namaPetugas);
    });
    return Array.from(set).sort();
  }, [evaluations, teamFilter, isTeamLeader, currentUser]);

  // Apply filters
  const analyzedEvaluations = useMemo(() => {
    return evaluations.filter((e) => {
      // Role restrictions
      if (isPetugas && currentUser) {
        if (e.ticket.namaPetugas.toLowerCase() !== currentUser.name.toLowerCase()) {
          return false;
        }
      } else if (isTeamLeader && currentUser) {
        if (currentUser.team && e.petugasTeam !== currentUser.team) {
          return false;
        }
      } else if (currentUser?.role === 'qa') {
        if (e.qaId !== currentUser.id && e.qaName.toLowerCase() !== (currentUser?.name || '').toLowerCase()) {
          return false;
        }
      }

      if (periodFilter !== 'all' && (!e.tanggalSampling || !e.tanggalSampling.startsWith(periodFilter))) {
        return false;
      }
      if (teamFilter !== 'all' && e.petugasTeam !== teamFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && e.ticket?.kategori !== categoryFilter) {
        return false;
      }
      if (agentFilter !== 'all' && e.ticket?.namaPetugas !== agentFilter) {
        return false;
      }
      return true;
    });
  }, [evaluations, periodFilter, teamFilter, categoryFilter, agentFilter, currentUser, isPetugas, isTeamLeader]);

  // 1. Weak Indicator Analysis
  const indicatorAnalysis = useMemo(() => {
    const stats: Record<string, { totalScore: number; count: number; name: string }> = {};

    indicators.forEach((ind) => {
      stats[ind.id] = { totalScore: 0, count: 0, name: ind.nama };
    });

    analyzedEvaluations.forEach((e) => {
      e.scores.forEach((s) => {
        if (stats[s.indicatorId]) {
          stats[s.indicatorId].totalScore += s.score;
          stats[s.indicatorId].count += 1;
        }
      });
    });

    return Object.entries(stats).map(([id, st]) => ({
      indicatorId: id,
      name: st.name,
      averageScore: st.count > 0 ? Math.round((st.totalScore / st.count) * 10) / 10 : 100,
      count: st.count,
    })).sort((a, b) => a.averageScore - b.averageScore); // Lowest score first (most problematic)
  }, [analyzedEvaluations, indicators]);

  // 2. Weakest Topic Issues Analysis
  const topicAnalysis = useMemo(() => {
    const stats: Record<string, { totalScore: number; count: number; issues: Set<string> }> = {};

    analyzedEvaluations.forEach((e) => {
      const topic = e.ticket?.topikMasalah || 'Layanan Umum';
      if (!stats[topic]) {
        stats[topic] = { totalScore: 0, count: 0, issues: new Set() };
      }
      stats[topic].totalScore += e.nilaiFinal;
      stats[topic].count += 1;
      if (e.ticket?.pokokMasalah) {
        stats[topic].issues.add(e.ticket.pokokMasalah);
      }
    });

    return Object.entries(stats).map(([topic, st]) => ({
      topic,
      averageScore: st.count > 0 ? Math.round((st.totalScore / st.count) * 10) / 10 : 100,
      count: st.count,
      pokokMasalah: Array.from(st.issues).join(', '),
    })).sort((a, b) => a.averageScore - b.averageScore);
  }, [analyzedEvaluations]);

  // 3. Agent Performance & Weakness Analysis
  const agentAnalysis = useMemo(() => {
    const stats: Record<string, { totalScore: number; count: number; team: string; lowScoresCount: number }> = {};

    analyzedEvaluations.forEach((e) => {
      const agent = e.ticket?.namaPetugas || 'Unknown';
      const team = e.petugasTeam || 'TIM 1';
      if (!stats[agent]) {
        stats[agent] = { totalScore: 0, count: 0, team, lowScoresCount: 0 };
      }
      stats[agent].totalScore += e.nilaiFinal;
      stats[agent].count += 1;
      if (e.nilaiFinal < 90) {
        stats[agent].lowScoresCount += 1;
      }
    });

    return Object.entries(stats).map(([agent, st]) => ({
      agent,
      team: st.team,
      averageScore: st.count > 0 ? Math.round((st.totalScore / st.count) * 10) / 10 : 0,
      count: st.count,
      lowScoresCount: st.lowScoresCount,
    })).sort((a, b) => a.averageScore - b.averageScore);
  }, [analyzedEvaluations]);

  const handleResetFilters = () => {
    setPeriodFilter('all');
    if (!isTeamLeader) setTeamFilter('all');
    setCategoryFilter('all');
    if (!isPetugas) setAgentFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Role Scope Notice Banner */}
      {isPetugas && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Menampilkan Analisis & Rekomendasi Mutu Layanan khusus untuk Petugas: <strong>{currentUser?.name}</strong></span>
          </div>
          <span className="bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-[11px]">Petugas Mandiri</span>
        </div>
      )}

      {isTeamLeader && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-600" />
            <span>Menampilkan Analisis & Rekomendasi Mutu Layanan untuk Tim: <strong>{currentUser?.team ? `Tim ${currentUser.team}` : 'Tim Anda'}</strong> (Seluruh Petugas dalam Tim)</span>
          </div>
          <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[11px]">Team Leader</span>
        </div>
      )}

      {/* Header & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Analisis & Rekomendasi Mutu Layanan
              </h1>
              <p className="text-xs text-slate-500">
                Analisis mendalam berdasarkan petugas, topik masalah, dan indikator penilaian mutu yang memerlukan perbaikan (di bawah standar kelulusan 90)
              </p>
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition self-start md:self-auto"
          >
            <Filter className="w-3.5 h-3.5" /> Reset Filter
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-teal-600" /> Periode Bulan
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Semua Periode Bulan</option>
              {periodList.map((p) => (
                <option key={p} value={p}>
                  Bulan {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-teal-600" /> Tim Petugas
            </label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              disabled={isTeamLeader && Boolean(currentUser?.team)}
              className={`w-full border rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isTeamLeader && currentUser?.team
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <option value="all">Semua Tim (1 - 6)</option>
              {teamList.map((t) => (
                <option key={t} value={t}>
                  TIM {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-teal-600" /> Kategori Layanan
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Semua Kategori</option>
              {categoryList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-teal-600" /> Nama Petugas
            </label>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              disabled={isPetugas}
              className={`w-full border rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isPetugas
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <option value="all">{isPetugas ? currentUser?.name : 'Semua Petugas'}</option>
              {agentList.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Total Sampel Dianalisis</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{analyzedEvaluations.length} Sampling</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Rata-rata Skor Mutu</div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {analyzedEvaluations.length > 0
                ? Math.round((analyzedEvaluations.reduce((acc, c) => acc + c.nilaiFinal, 0) / analyzedEvaluations.length) * 10) / 10
                : 0}
              {' / 100'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Indikator Perlu Perbaikan (&lt;80)</div>
            <div className="text-xl font-bold text-rose-600 mt-1">
              {indicatorAnalysis.filter((i) => i.averageScore < 80).length} Indikator
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Indikator Penilaian Mutu Kurang / Perlu Perbaikan */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" /> Analisis Indikator Mutu Lemah
            </h3>
            <span className="text-[11px] px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-full">
              Prioritas Perbaikan
            </span>
          </div>

          <div className="space-y-3 flex-grow overflow-y-auto max-h-[400px]">
            {indicatorAnalysis.map((ind) => (
              <div key={ind.indicatorId} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-800">{ind.name}</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    ind.averageScore < 75
                      ? 'bg-rose-100 text-rose-800'
                      : ind.averageScore < 85
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {ind.averageScore} / 100
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${
                      ind.averageScore < 75 ? 'bg-rose-500' : ind.averageScore < 85 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, ind.averageScore))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  {ind.averageScore < 80
                    ? `Perlu perhatian khusus pada indikator ${ind.name} (Rata-rata ${ind.averageScore}). Tingkatkan pemahaman panduan layanan.`
                    : `Kinerja indikator ${ind.name} sudah cukup baik (Rata-rata ${ind.averageScore}). Pertahankan konsistensi.`}
                </p>
              </div>
            ))}
            {indicatorAnalysis.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">Belum ada data indikator mutu.</div>
            )}
          </div>
        </div>

        {/* Column 2: Analisis Topik Masalah & Kendala */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Analisis Topik & Masalah Sering
            </h3>
            <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded-full">
              Fokus Kompetensi
            </span>
          </div>

          <div className="space-y-3 flex-grow overflow-y-auto max-h-[400px]">
            {topicAnalysis.map((top) => (
              <div key={top.topic} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800 line-clamp-1">{top.topic}</span>
                  <span className="text-[11px] font-bold text-slate-600">{top.count} Kasus</span>
                </div>
                <div className="text-[11px] text-slate-500 mb-1.5">
                  Pokok Masalah: <span className="text-slate-700 font-medium">{top.pokokMasalah || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Rata-rata Skor:</span>
                  <span className={`font-bold ${top.averageScore < 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {top.averageScore} / 100
                  </span>
                </div>
              </div>
            ))}
            {topicAnalysis.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">Belum ada data topik masalah.</div>
            )}
          </div>
        </div>

        {/* Column 3: Analisis Performa Petugas & Kebutuhan Coaching */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Performa & Kebutuhan Coaching
            </h3>
            <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full">
              Evaluasi Petugas
            </span>
          </div>

          <div className="space-y-3 flex-grow overflow-y-auto max-h-[400px]">
            {agentAnalysis.map((ag) => (
              <div key={ag.agent} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800">{ag.agent}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                    TIM {ag.team}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                  <span>Sampling: {ag.count} Tiket</span>
                  <span className={`font-bold ${ag.averageScore < 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    Skor: {ag.averageScore}
                  </span>
                </div>
                {ag.lowScoresCount > 0 && (
                  <div className="text-[10px] text-rose-700 bg-rose-50 border border-rose-100 p-1.5 rounded mt-1">
                    ⚠️ {ag.lowScoresCount} sampel memiliki skor di bawah 80 (Direkomendasikan *Coaching Clinic*).
                  </div>
                )}
              </div>
            ))}
            {agentAnalysis.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">Belum ada data petugas.</div>
            )}
          </div>
        </div>
      </div>

      {/* Strategic AI / Quality Recommendations Action Plan */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center gap-3 mb-4">
          <span className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
            <Lightbulb className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Rekomendasi Strategis & Rencana Tindak Lanjut (Action Plan)
            </h3>
            <p className="text-xs text-slate-500">
              Rekomendasi otomatis berdasarkan analisis silang indikator, topik masalah, dan capaian nilai sampling
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-2">
              <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs">1</span>
              <span>Perbaikan Indikator Kritis</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fokuskan pelatihan internal pada indikator mutu dengan skor terendah. Lakukan sosialisasi ulang SOP penanganan informasi dan edukasi tambahan bagi peserta.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs">2</span>
              <span>Pendalaman Topik Kompleks</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Topik masalah dengan frekuensi tinggi dan nilai di bawah 80 memerlukan pembuatan *cheat sheet* / FAQ cepat serta *refresher training* bagi petugas terkait.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">3</span>
              <span>Coaching & Monitoring Tim</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Team Leader dan Quality Assurance disarankan mengadakan sesi *coaching clinic* mingguan secara berkala bagi petugas yang memiliki catatan nilai di bawah standar 80.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
