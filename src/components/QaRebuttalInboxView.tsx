import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SamplingEvaluation, KeputusanAkhirData, IndicatorScore } from '../types';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  Send,
  MessageSquare,
  FileCheck,
  ShieldCheck,
  Clock,
  User,
  Sliders,
  X,
  Sparkles,
  RotateCcw,
  Users,
  Award,
} from 'lucide-react';

export const QaRebuttalInboxView: React.FC = () => {
  const {
    evaluations,
    indicators,
    currentUser,
    submitQaKeputusanAkhir,
    setActiveTab,
  } = useApp();

  // All pending rebuttals
  const pendingRebuttals = useMemo(() => {
    return evaluations.filter((e) => e.status === 'PROSES_SANGGAHAN');
  }, [evaluations]);

  // Rebuttals targeted to the currently logged in QA
  const myRebuttals = useMemo(() => {
    return pendingRebuttals.filter(
      (e) => e.qaId === currentUser.id || e.qaName.toLowerCase() === currentUser.name.toLowerCase()
    );
  }, [pendingRebuttals, currentUser]);

  // QA Filter: 'mine' (Sanggahan untuk Saya) vs 'all' (Semua Sanggahan)
  const [qaScope, setQaScope] = useState<'mine' | 'all'>('mine');

  const displayedRebuttals = useMemo(() => {
    if (qaScope === 'mine') {
      return myRebuttals.length > 0 ? myRebuttals : pendingRebuttals;
    }
    return pendingRebuttals;
  }, [qaScope, myRebuttals, pendingRebuttals]);

  // Active item being reviewed
  const [activeItem, setActiveItem] = useState<SamplingEvaluation | null>(null);
  const [decisionType, setDecisionType] = useState<'DITERIMA_PENUH' | 'DITERIMA_SEBAGIAN' | 'DITOLAK'>('DITERIMA_SEBAGIAN');
  const [adjustedScores, setAdjustedScores] = useState<Record<string, number>>({});
  const [catatanPutusan, setCatatanPutusan] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  const handleOpenReview = (item: SamplingEvaluation) => {
    setActiveItem(item);
    setDecisionType('DITERIMA_SEBAGIAN');
    setCatatanPutusan('');
    setErrorMessage('');

    // Pre-populate adjusted scores with current scores
    const current: Record<string, number> = {};
    item.scores.forEach((s) => {
      current[s.indicatorId] = s.score;
    });
    setAdjustedScores(current);
  };

  // Calculate live revised score
  const calculatedRevisedTotal = (scoresRecord: Record<string, number>) => {
    const totalBobot = indicators.reduce((acc, i) => acc + (Number(i.bobot) || 0), 0) || 100;
    const weightedSum = indicators.reduce((acc, ind) => {
      const score = scoresRecord[ind.id] ?? 80;
      return acc + (score * (ind.bobot || 0));
    }, 0);
    return Math.round((weightedSum / totalBobot) * 10) / 10;
  };

  const handleDecisionTypeChange = (type: 'DITERIMA_PENUH' | 'DITERIMA_SEBAGIAN' | 'DITOLAK') => {
    setDecisionType(type);
    if (!activeItem) return;

    if (type === 'DITOLAK') {
      // Revert to initial scores
      const initial: Record<string, number> = {};
      activeItem.scores.forEach((s) => {
        initial[s.indicatorId] = s.score;
      });
      setAdjustedScores(initial);
      setCatatanPutusan(`Sanggahan ditolak. Argumentasi belum memenuhi klausul standar pelayanan mutu BPJS Kesehatan. Nilai awal ${activeItem.nilaiAwal} dipertahankan.`);
    } else if (type === 'DITERIMA_PENUH') {
      // Grant suggested score or boost
      const boosted: Record<string, number> = {};
      activeItem.scores.forEach((s) => {
        boosted[s.indicatorId] = Math.min(100, s.score + 10);
      });
      setAdjustedScores(boosted);
      setCatatanPutusan(`Sanggahan diterima penuh setelah mempertimbangkan bukti regulasi dan dasar SOP yang dilampirkan oleh petugas ${activeItem.ticket.namaPetugas}.`);
    } else {
      setCatatanPutusan(`Sanggahan diterima sebagian. Penyesuaian nilai dilakukan pada indikator terkait pemahaman regulasi dan kelengkapan tindak lanjut.`);
    }
  };

  const handleSubmitDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    if (!catatanPutusan.trim() || catatanPutusan.length < 15) {
      setErrorMessage('Mohon berikan catatan pertimbangan putusan akhir QA secara jelas (minimal 15 karakter).');
      return;
    }

    const finalScores: IndicatorScore[] = indicators.map((ind) => ({
      indicatorId: ind.id,
      score: adjustedScores[ind.id] ?? 80,
      notes: `Putusan QA: ${adjustedScores[ind.id] ?? 80}`,
    }));

    const finalTotal = calculatedRevisedTotal(adjustedScores);

    const payload: KeputusanAkhirData = {
      tanggalKeputusan: new Date().toISOString().replace('T', ' ').slice(0, 19),
      qaName: currentUser.name,
      statusPutusan: decisionType,
      nilaiAkhir: finalTotal,
      finalScores,
      catatanPutusanQA: catatanPutusan.trim(),
    };

    submitQaKeputusanAkhir(activeItem.id, payload);
    const targetNo = activeItem.nomorTiket;
    const targetPetugas = activeItem.ticket.namaPetugas;
    const targetTeam = activeItem.petugasTeam || 'TIM';
    setActiveItem(null);

    setToastSuccess(
      `Keputusan akhir tiket ${targetNo} berhasil diterbitkan dengan nilai resmi ${finalTotal}. Nilai akhir telah masuk ke user Petugas (${targetPetugas}) dan user Team Leader (${targetTeam}).`
    );
    setTimeout(() => setToastSuccess(null), 7000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Success */}
      {toastSuccess && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 shadow-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <p className="text-xs font-semibold">{toastSuccess}</p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-xs text-teal-700 hover:text-teal-800 font-bold underline"
          >
            Lihat Rekap di History & Nilai Akhir
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Bell className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  Inbox Sanggahan Quality Assurance
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                  Asesor: {currentUser.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sanggahan yang diajukan petugas masuk kembali ke user QA yang melakukan sampling untuk telaah ulang dan penetapan nilai akhir resmi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              {pendingRebuttals.length} Total Sanggahan Masuk
            </span>
          </div>
        </div>

        {/* Filter scope buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQaScope('mine')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                qaScope === 'mine'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Sanggahan untuk Saya (QA Penilai)
              <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${qaScope === 'mine' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 font-bold'}`}>
                {myRebuttals.length}
              </span>
            </button>

            <button
              onClick={() => setQaScope('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                qaScope === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Semua Sanggahan ({pendingRebuttals.length})
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            Nilai akhir yang ditetapkan QA akan masuk ke <strong>Petugas</strong> dan <strong>Team Leader</strong> sesuai kelompok TIM.
          </div>
        </div>
      </div>

      {/* List of Rebuttals */}
      {displayedRebuttals.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-teal-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Tidak Ada Sanggahan Menunggu Putusan
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Semua sanggahan dari petugas telah diselesaikan dan diputuskan oleh tim Quality Assurance.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('history')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              Buka History & Nilai Akhir
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedRebuttals.map((item) => {
            const isAssignedToMe = item.qaId === currentUser.id || item.qaName.toLowerCase() === currentUser.name.toLowerCase();

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-amber-200/90 shadow-2xs p-5 hover:border-amber-300 transition space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                      {item.nomorTiket}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Tanggal Sanggah: {item.sanggahan?.tanggalSanggah}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-700 font-semibold">
                      Petugas: <strong>{item.sanggahan?.petugasName || item.ticket.namaPetugas}</strong>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {item.petugasTeam || 'TIM'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-600">
                      Asesor Penilai: <strong className={isAssignedToMe ? 'text-teal-700' : 'text-slate-700'}>{item.qaName} {isAssignedToMe ? '(Anda)' : ''}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Nilai Awal QA
                      </span>
                      <span className="text-lg font-extrabold text-slate-800">
                        {item.nilaiAwal}
                      </span>
                    </div>
                    {item.sanggahan?.usulanNilai && (
                      <div className="text-right pl-3 border-l border-slate-200">
                        <span className="text-[10px] uppercase font-semibold text-amber-600 block">
                          Usulan Petugas
                        </span>
                        <span className="text-lg font-extrabold text-amber-700">
                          {item.sanggahan.usulanNilai}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sanggahan Highlight Box */}
                <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-900 text-xs">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Alasan Sanggahan: {item.sanggahan?.alasanSanggahan}
                    </span>
                  </div>

                  <p className="text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-amber-100">
                    "{item.sanggahan?.argumenPetugas}"
                  </p>

                  {item.sanggahan?.buktiPendukung && (
                    <div className="text-[11px] text-amber-800 font-medium">
                      <strong>Dasar Bukti / Regulasi SOP:</strong> {item.sanggahan.buktiPendukung}
                    </div>
                  )}
                </div>

                {/* Context Summary: Keluhan vs Jawaban */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Keluhan Peserta ({item.ticket.pokokMasalah}):
                    </span>
                    <p className="text-slate-700 line-clamp-3 text-[11px]">
                      {item.ticket.isiKeluhan}
                    </p>
                  </div>
                  <div className="bg-teal-50/30 p-3 rounded-lg border border-teal-200">
                    <span className="text-[10px] font-bold text-teal-800 uppercase block mb-1">
                      Jawaban Petugas ({item.ticket.namaPetugas}):
                    </span>
                    <p className="text-slate-800 line-clamp-3 text-[11px]">
                      {item.ticket.isiJawaban}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-500">
                    {isAssignedToMe
                      ? 'Sanggahan ini masuk ke akun Anda karena Anda yang melakukan sampling pada tiket ini.'
                      : `Sanggahan ini ditujukan kepada ${item.qaName}.`}
                  </span>

                  <button
                    onClick={() => handleOpenReview(item)}
                    className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Scale className="w-4 h-4" />
                    Telaah Sanggahan & Tetapkan Nilai Akhir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Telaah & Putusan Akhir QA */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Keputusan Akhir Sanggahan Mutu oleh Quality Assurance
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tiket: <span className="text-white font-mono">{activeItem.nomorTiket}</span> · Petugas: <strong className="text-white">{activeItem.ticket.namaPetugas}</strong> ({activeItem.petugasTeam || 'TIM'})
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-semibold text-slate-400">
                  Nilai Akhir Resmi (Live)
                </div>
                <div className="text-xl font-extrabold text-amber-300">
                  {calculatedRevisedTotal(adjustedScores)} <span className="text-xs font-normal text-slate-400">/ 100</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmitDecision} className="p-6 overflow-y-auto space-y-5 flex-grow text-xs">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Sanggahan Details Summary */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="font-bold text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Argumen Petugas ({activeItem.sanggahan?.alasanSanggahan}):
                </div>
                <p className="text-slate-800 bg-white p-3 rounded-lg border border-amber-100 whitespace-pre-wrap">
                  "{activeItem.sanggahan?.argumenPetugas}"
                </p>
                {activeItem.sanggahan?.buktiPendukung && (
                  <div className="text-[11px] text-amber-800">
                    <strong>Dasar Regulasi:</strong> {activeItem.sanggahan.buktiPendukung}
                  </div>
                )}
              </div>

              {/* Putusan Choice Buttons */}
              <div>
                <label className="block font-bold text-slate-700 mb-2">
                  Pilih Bentuk Putusan Akhir QA *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleDecisionTypeChange('DITERIMA_PENUH')}
                    className={`p-3 rounded-xl border text-left font-medium transition cursor-pointer ${
                      decisionType === 'DITERIMA_PENUH'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Terima Penuh
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Sanggahan terbukti benar sesuai regulasi, nilai disesuaikan penuh.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecisionTypeChange('DITERIMA_SEBAGIAN')}
                    className={`p-3 rounded-xl border text-left font-medium transition cursor-pointer ${
                      decisionType === 'DITERIMA_SEBAGIAN'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1">
                      <Sliders className="w-4 h-4 text-amber-600" />
                      Terima Sebagian
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Sebagian argumen dapat diterima, revisi indikator tertentu.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecisionTypeChange('DITOLAK')}
                    className={`p-3 rounded-xl border text-left font-medium transition cursor-pointer ${
                      decisionType === 'DITOLAK'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      Tolak Sanggahan
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pertahankan nilai awal QA, penjelasan belum memenuhi SOP.
                    </p>
                  </button>
                </div>
              </div>

              {/* Adjust Indikator Scores if accepted partial/full */}
              {decisionType !== 'DITOLAK' && (
                <div className="space-y-3 pt-2">
                  <div className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Penyesuaian Skor per Indikator Mutu:</span>
                    <span className="text-[11px] font-semibold text-teal-800">
                      Geser slider untuk mengubah nilai
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {indicators.map((ind) => {
                      const cur = adjustedScores[ind.id] ?? 80;
                      return (
                        <div key={ind.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-slate-800">{ind.nama} (Bobot {ind.bobot}%)</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={cur}
                                onChange={(e) => {
                                  const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                  setAdjustedScores((prev) => ({ ...prev, [ind.id]: val }));
                                }}
                                className="w-14 px-1.5 py-0.5 rounded border border-slate-300 text-center font-bold text-xs bg-white"
                              />
                              <span className="text-slate-400">/ 100</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={cur}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setAdjustedScores((prev) => ({ ...prev, [ind.id]: val }));
                            }}
                            className="w-full accent-amber-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Catatan Putusan QA */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Resmi Putusan Akhir Asesor Quality Assurance *
                </label>
                <textarea
                  rows={3}
                  required
                  value={catatanPutusan}
                  onChange={(e) => setCatatanPutusan(e.target.value)}
                  placeholder="Jelaskan dasar pertimbangan putusan akhir ini secara objektif. Catatan ini akan masuk ke Petugas dan Team Leader..."
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500">
                  Nilai akhir akan langsung masuk ke user Petugas (<strong>{activeItem.ticket.namaPetugas}</strong>) dan Team Leader (<strong>{activeItem.petugasTeam || 'TIM'}</strong>).
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveItem(null)}
                    className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-200" />
                    Tetapkan Nilai Akhir Resmi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
