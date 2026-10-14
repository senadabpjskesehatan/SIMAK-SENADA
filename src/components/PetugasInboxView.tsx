import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SamplingEvaluation, SanggahanData } from '../types';
import {
  Inbox,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Scale,
  Send,
  HelpCircle,
  Clock,
  User,
  Star,
  FileText,
  X,
  ExternalLink,
  ShieldAlert,
  Users,
  CheckCheck,
  RotateCcw,
  AlertTriangle,
  Award,
} from 'lucide-react';

export const PetugasInboxView: React.FC = () => {
  const {
    evaluations,
    currentUser,
    indicators,
    users,
    submitPetugasAcceptance,
    submitPetugasSanggahan,
    setActiveTab,
  } = useApp();

  const isPetugas = currentUser.role === 'petugas';
  const isTeamLeader = currentUser.role === 'team_leader';

  // Subtabs: 'pending' (perlu ditinjau) | 'rebuttal' (sedang sanggahan) | 'final' (nilai akhir) | 'all'
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'rebuttal' | 'final' | 'all'>('pending');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active item for sanggahan modal
  const [sanggahanTarget, setSanggahanTarget] = useState<SamplingEvaluation | null>(null);
  const [alasanSanggahan, setAlasanSanggahan] = useState('Kesesuaian dengan SOP / Regulasi Terbaru');
  const [argumenPetugas, setArgumenPetugas] = useState('');
  const [buktiPendukung, setBuktiPendukung] = useState('');
  const [usulanNilai, setUsulanNilai] = useState<number | ''>('');
  const [formError, setFormError] = useState('');

  // Toast confirmation
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter base evaluations based on role
  const relevantEvaluations = useMemo(() => {
    return evaluations.filter((e) => {
      if (isPetugas) {
        // Petugas only sees tickets where namaPetugas matches their name
        return e.ticket.namaPetugas.toLowerCase() === currentUser.name.toLowerCase();
      }
      if (isTeamLeader) {
        // Team Leader only sees tickets belonging to their TIM
        if (currentUser.team) {
          return e.petugasTeam === currentUser.team;
        }
        return true;
      }
      // For Admin, QA, or Pusat viewing this page
      return true;
    });
  }, [evaluations, isPetugas, isTeamLeader, currentUser]);

  // List of agents in the current scope for filter dropdown
  const scopeAgents = useMemo(() => {
    const set = new Set<string>();
    relevantEvaluations.forEach((e) => {
      if (e.ticket.namaPetugas) set.add(e.ticket.namaPetugas);
    });
    return Array.from(set).sort();
  }, [relevantEvaluations]);

  // Subtab counts
  const pendingCount = relevantEvaluations.filter((e) => e.status === 'MENUNGGU_REVIEW_PETUGAS').length;
  const rebuttalCount = relevantEvaluations.filter((e) => e.status === 'PROSES_SANGGAHAN').length;
  const finalCount = relevantEvaluations.filter((e) => e.status === 'KEPUTUSAN_AKHIR' || e.status === 'SELESAI_DITERIMA').length;

  // Filtered displayed items
  const displayedItems = useMemo(() => {
    return relevantEvaluations.filter((e) => {
      // Subtab filter
      if (activeSubTab === 'pending' && e.status !== 'MENUNGGU_REVIEW_PETUGAS') return false;
      if (activeSubTab === 'rebuttal' && e.status !== 'PROSES_SANGGAHAN') return false;
      if (activeSubTab === 'final' && e.status !== 'KEPUTUSAN_AKHIR' && e.status !== 'SELESAI_DITERIMA') return false;

      // Agent filter (for Team Leader)
      if (agentFilter !== 'all' && e.ticket.namaPetugas !== agentFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          e.nomorTiket.toLowerCase().includes(q) ||
          e.ticket.namaPetugas.toLowerCase().includes(q) ||
          e.ticket.pokokMasalah.toLowerCase().includes(q) ||
          e.ticket.isiKeluhan.toLowerCase().includes(q) ||
          e.ticket.isiJawaban.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [relevantEvaluations, activeSubTab, agentFilter, searchQuery]);

  const handleOpenSanggahanModal = (item: SamplingEvaluation) => {
    setSanggahanTarget(item);
    setAlasanSanggahan('Kesesuaian dengan SOP / Regulasi Terbaru');
    setArgumenPetugas('');
    setBuktiPendukung('');
    setUsulanNilai(Math.min(100, Math.round(item.nilaiAwal + 10)));
    setFormError('');
  };

  const handleAcceptScore = (item: SamplingEvaluation) => {
    if (confirm(`Apakah Anda yakin menerima nilai mutu ${item.nilaiFinal} untuk tiket ${item.nomorTiket}?`)) {
      submitPetugasAcceptance(item.id);
      setToastMessage(`Nilai untuk tiket ${item.nomorTiket} (${item.nilaiFinal}) berhasil disetujui tanpa sanggahan.`);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleSubmitSanggahan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sanggahanTarget) return;

    if (!argumenPetugas.trim() || argumenPetugas.length < 15) {
      setFormError('Mohon berikan argumen sanggahan secara jelas dan komprehensif (minimal 15 karakter).');
      return;
    }

    const payload: SanggahanData = {
      tanggalSanggah: new Date().toISOString().replace('T', ' ').slice(0, 19),
      alasanSanggahan,
      argumenPetugas: argumenPetugas.trim(),
      buktiPendukung: buktiPendukung.trim() || undefined,
      usulanNilai: typeof usulanNilai === 'number' ? usulanNilai : undefined,
      petugasName: currentUser.name,
    };

    submitPetugasSanggahan(sanggahanTarget.id, payload);
    const targetNo = sanggahanTarget.nomorTiket;
    const targetQA = sanggahanTarget.qaName;
    setSanggahanTarget(null);

    setToastMessage(`Sanggahan tiket ${targetNo} berhasil diajukan dan diteruskan kembali ke QA Penilai (${targetQA}).`);
    setTimeout(() => setToastMessage(null), 6000);
    setActiveSubTab('rebuttal');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 shadow-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <p className="text-xs font-semibold">{toastMessage}</p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-xs text-teal-700 hover:text-teal-800 font-bold underline"
          >
            Lihat di History & Nilai Akhir
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-xl ${isTeamLeader ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
              {isTeamLeader ? <Users className="w-6 h-6" /> : <Inbox className="w-6 h-6" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  {isTeamLeader
                    ? `Inbox Pengawasan Sampling Tim: ${currentUser.team || 'Tim Pelayanan'}`
                    : `Inbox Hasil Sampling Petugas (${currentUser.name})`}
                </h1>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isTeamLeader ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>
                  {isTeamLeader ? `Team Leader · ${currentUser.team || 'TIM'}` : `Petugas · ${currentUser.team || 'TIM'}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isTeamLeader
                  ? `Memantau hasil sampling mutu jawaban petugas kelompok ${currentUser.team || 'TIM'}, status sanggahan ke QA, dan nilai akhir.`
                  : 'Hasil penilaian mutu sampling dari Quality Assurance. Anda dapat menyetujui nilai atau mengajukan sanggahan resmi.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isTeamLeader && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Anggota Tim: {scopeAgents.length} Petugas
              </span>
            )}
          </div>
        </div>

        {/* Informational banner if role is admin or pusat viewing this tab */}
        {!isPetugas && !isTeamLeader && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-purple-700 shrink-0" />
            <span>
              Anda sedang login sebagai <strong>{currentUser.role.toUpperCase()}</strong>. Menu ini menampilkan seluruh sampling petugas untuk monitoring.
            </span>
          </div>
        )}

        {/* Subtabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab('pending')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'pending'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Perlu Ditinjau
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${activeSubTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 font-bold'}`}>
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('rebuttal')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'rebuttal'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Sedang Sanggahan ke QA
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${activeSubTab === 'rebuttal' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 font-bold'}`}>
                {rebuttalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('final')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'final'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Nilai Akhir Masuk
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${activeSubTab === 'final' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 font-bold'}`}>
                {finalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({relevantEvaluations.length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isTeamLeader && scopeAgents.length > 0 && (
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Semua Anggota Tim</option>
                {scopeAgents.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no tiket / keluhan..."
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* List of Items */}
      {displayedItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Tidak Ada Data pada Kategori Ini
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeSubTab === 'pending'
              ? 'Tidak ada tiket hasil sampling QA yang menunggu konfirmasi saat ini.'
              : activeSubTab === 'rebuttal'
              ? 'Tidak ada tiket yang sedang dalam proses sanggahan ke QA.'
              : 'Belum ada data tiket dengan filter yang dipilih.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedItems.map((item) => {
            const isPending = item.status === 'MENUNGGU_REVIEW_PETUGAS';
            const isRebuttal = item.status === 'PROSES_SANGGAHAN';
            const isCompleted = item.status === 'KEPUTUSAN_AKHIR' || item.status === 'SELESAI_DITERIMA';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border shadow-2xs p-5 transition space-y-4 ${
                  isPending
                    ? 'border-blue-200 hover:border-blue-300'
                    : isRebuttal
                    ? 'border-amber-200 hover:border-amber-300 bg-amber-50/15'
                    : 'border-emerald-200 hover:border-emerald-300'
                }`}
              >
                {/* Item Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.nomorTiket}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.ticket.tanggalTiket}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-700 font-semibold">
                      Petugas: <strong>{item.ticket.namaPetugas}</strong>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {item.petugasTeam || 'TIM'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">
                      Asesor QA: <strong className="text-slate-800">{item.qaName}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Status Badge */}
                    {isPending && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Menunggu Review Petugas
                      </span>
                    )}
                    {isRebuttal && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> Sedang Diproses QA ({item.qaName})
                      </span>
                    )}
                    {item.status === 'SELESAI_DITERIMA' && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCheck className="w-3 h-3" /> Nilai Disetujui
                      </span>
                    )}
                    {item.status === 'KEPUTUSAN_AKHIR' && (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                        <Award className="w-3 h-3" /> Keputusan Akhir QA Resmi
                      </span>
                    )}

                    {/* Score display */}
                    <div className="text-right pl-3 border-l border-slate-200">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        {isCompleted ? 'Nilai Akhir Final' : 'Nilai Awal QA'}
                      </span>
                      <span className={`text-lg font-extrabold ${isCompleted ? 'text-emerald-700' : 'text-blue-700'}`}>
                        {item.nilaiFinal} <span className="text-xs font-normal text-slate-400">/ 100</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Keluhan & Jawaban */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>KELUHAN / PERTANYAAN PESERTA</span>
                      <span className="text-amber-600">Rating: {item.ticket.rating} ★</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {item.ticket.isiKeluhan}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                      Kategori: {item.ticket.kategori} · Pokok: {item.ticket.pokokMasalah} · Topik: {item.ticket.topikMasalah}
                    </div>
                  </div>

                  <div className="bg-teal-50/40 p-3.5 rounded-lg border border-teal-200">
                    <div className="text-[11px] font-bold text-teal-800 mb-1">
                      JAWABAN YANG DIBERIKAN PETUGAS ({item.ticket.namaPetugas})
                    </div>
                    <p className="text-slate-900 leading-relaxed whitespace-pre-wrap">
                      {item.ticket.isiJawaban}
                    </p>
                  </div>
                </div>

                {/* Scores Breakdown */}
                <div className="bg-slate-50/80 rounded-lg p-3.5 border border-slate-200">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Penilaian per Indikator Mutu (Asesor QA: {item.qaName} · Tgl: {item.tanggalSampling})</span>
                    <span className="text-[11px] text-slate-500">
                      Catatan Awal QA: <em className="text-slate-700">"{item.catatanAwalQA}"</em>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {item.scores.map((s) => {
                      const ind = indicators.find((i) => i.id === s.indicatorId);
                      return (
                        <div key={s.indicatorId} className="bg-white p-2.5 rounded-md border border-slate-200 text-xs">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span className="truncate pr-2">{ind?.nama || s.indicatorId}</span>
                            <span className="font-bold text-blue-700 shrink-0">{s.score}</span>
                          </div>
                          {s.notes && (
                            <p className="text-[10px] text-slate-500 mt-1 italic">
                              "{s.notes}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SANGGAHAN BOX (If in rebuttal or final decision) */}
                {item.sanggahan && (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between text-amber-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        Sanggahan Diajukan oleh Petugas ({item.sanggahan.petugasName})
                      </span>
                      <span className="text-[11px] text-amber-700 font-normal">
                        {item.sanggahan.tanggalSanggah}
                      </span>
                    </div>
                    <div className="text-slate-800 bg-white p-2.5 rounded border border-amber-100">
                      <div className="text-[11px] font-semibold text-amber-800 mb-1">
                        Alasan: {item.sanggahan.alasanSanggahan} {item.sanggahan.usulanNilai ? `· Usulan Nilai: ${item.sanggahan.usulanNilai}` : ''}
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{item.sanggahan.argumenPetugas}</p>
                      {item.sanggahan.buktiPendukung && (
                        <div className="mt-1 text-[11px] text-slate-500 font-medium">
                          <strong>Bukti / Dasar SOP:</strong> {item.sanggahan.buktiPendukung}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* KEPUTUSAN AKHIR QA BOX (If QA has resolved rebuttal) */}
                {item.keputusanAkhir && (
                  <div className="bg-emerald-50/70 border border-emerald-300 rounded-lg p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between text-emerald-950 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-700" />
                        Keputusan Akhir Resmi Asesor QA ({item.keputusanAkhir.qaName})
                      </span>
                      <span className="text-[11px] text-emerald-700 font-normal">
                        {item.keputusanAkhir.tanggalKeputusan}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.keputusanAkhir.statusPutusan === 'DITERIMA_PENUH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.keputusanAkhir.statusPutusan === 'DITERIMA_SEBAGIAN'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            PUTUSAN: {item.keputusanAkhir.statusPutusan.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-slate-800 leading-relaxed italic">
                          "{item.keputusanAkhir.catatanPutusanQA}"
                        </p>
                      </div>

                      <div className="text-right shrink-0 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 font-bold uppercase block">
                          Nilai Akhir Masuk
                        </span>
                        <span className="text-xl font-extrabold text-emerald-700">
                          {item.keputusanAkhir.nilaiAkhir}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions Footer: Petugas can Accept or Rebut if status is MENUNGGU_REVIEW_PETUGAS */}
                {isPending && isPetugas && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      Silakan periksa kesesuaian nilai mutu. Jika sudah sesuai, klik Setujui Nilai. Jika terdapat ketidaksesuaian regulasi, ajukan sanggahan.
                    </span>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleOpenSanggahanModal(item)}
                        className="w-full sm:w-auto px-4 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        Ajukan Sanggahan Resmi
                      </button>

                      <button
                        onClick={() => handleAcceptScore(item)}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Setujui Nilai ({item.nilaiAwal})
                      </button>
                    </div>
                  </div>
                )}

                {/* Team Leader view notice */}
                {isPending && isTeamLeader && (
                  <div className="pt-2 border-t border-slate-100 text-xs text-amber-700 flex items-center justify-between">
                    <span>
                      Menunggu konfirmasi atau sanggahan dari petugas yang bersangkutan (<strong>{item.ticket.namaPetugas}</strong>).
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Team Leader Monitoring
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SANGGAHAN MODAL */}
      {sanggahanTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    Form Pengajuan Sanggahan Hasil Sampling Mutu
                  </h3>
                  <p className="text-xs text-amber-100">
                    Nomor Tiket: <strong className="font-mono">{sanggahanTarget.nomorTiket}</strong> · Asesor QA Penilai: <strong>{sanggahanTarget.qaName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSanggahanTarget(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSanggahan} className="p-6 space-y-4 text-xs">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900">
                <p className="font-medium">
                  Sanggahan yang Anda kirimkan akan <strong>masuk kembali ke user Quality Assurance yang melakukan sampling ({sanggahanTarget.qaName})</strong> pada jawaban ini. QA akan meninjau dan menetapkan nilai akhir yang resmi.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kategori / Alasan Pokok Sanggahan *
                </label>
                <select
                  value={alasanSanggahan}
                  onChange={(e) => setAlasanSanggahan(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
                >
                  <option value="Kesesuaian dengan SOP / Regulasi Terbaru">
                    Kesesuaian dengan SOP / Regulasi Terbaru (Perpres, Permenkes, Buku Panduan Layanan)
                  </option>
                  <option value="Jawaban Sudah Lengkap & Menuntaskan Keluhan">
                    Jawaban Sudah Lengkap & Menuntaskan Keluhan Peserta
                  </option>
                  <option value="Penulisan EYD, Format & Kerapian Teks Sudah Baku">
                    Penulisan EYD, Format & Kerapian Teks Sudah Baku
                  </option>
                  <option value="Edukasi Kanal Digital / PANDAWA Telah Disampaikan">
                    Edukasi Kanal Digital / PANDAWA Telah Disampaikan
                  </option>
                  <option value="Faktor Kendala Sistem Faskes / Kondisi Khusus">
                    Faktor Kendala Sistem Faskes / Kondisi Khusus Peserta
                  </option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Penjelasan & Argumentasi Lengkap Petugas *
                </label>
                <textarea
                  rows={4}
                  required
                  value={argumenPetugas}
                  onChange={(e) => setArgumenPetugas(e.target.value)}
                  placeholder="Jelaskan secara komprehensif mengapa jawaban Anda telah memenuhi standar atau mengapa indikator tertentu layak mendapatkan penilaian lebih tinggi..."
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Bukti Pendukung / Nomor Dokumen SOP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={buktiPendukung}
                    onChange={(e) => setBuktiPendukung(e.target.value)}
                    placeholder="Contoh: Buku Panduan Layanan JKN 2024 Hal. 42 / SE Dir 12"
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Usulan Nilai Baru Petugas (Opsional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={usulanNilai}
                    onChange={(e) => setUsulanNilai(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="misal: 88"
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSanggahanTarget(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-2 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  Kirimkan Sanggahan ke QA ({sanggahanTarget.qaName})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
