import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Indicator, IndicatorNilaiOption, IndicatorNilaiKey } from '../types';
import { DEFAULT_NILAI_OPTIONS, INITIAL_INDICATORS } from '../data/mockData';
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Info,
  X,
  Save,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Scale,
  Minus,
  Check,
} from 'lucide-react';

export const IndicatorManagerView: React.FC = () => {
  const {
    indicators,
    addIndicator,
    updateIndicator,
    updateMultipleIndicators,
    applyStandardSopWeights,
    deleteIndicator,
    resetIndicators,
    totalIndicatorWeight,
  } = useApp();

  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showQuickTable, setShowQuickTable] = useState(true);

  // New indicator form state
  const [newNomorSOP, setNewNomorSOP] = useState<number | ''>('');
  const [newNama, setNewNama] = useState('');
  const [newBobot, setNewBobot] = useState<number>(10);
  const [newDeskripsi, setNewDeskripsi] = useState('');
  const [newPilihanNilai, setNewPilihanNilai] = useState<IndicatorNilaiOption[]>(
    DEFAULT_NILAI_OPTIONS.map((opt) => ({ ...opt }))
  );

  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Track expanded referensi ketentuan on cards
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCardExpanded = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const getNilaiBadgeColor = (nilai: IndicatorNilaiKey) => {
    switch (nilai) {
      case 'N/A':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case '0':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case '1':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case '2':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case '3':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-teal-100 text-teal-800 border-teal-300';
    }
  };

  const handleStartEdit = (ind: Indicator) => {
    const existingPilihan =
      ind.pilihanNilai && ind.pilihanNilai.length > 0
        ? ind.pilihanNilai.map((p) => ({ ...p }))
        : DEFAULT_NILAI_OPTIONS.map((opt) => ({ ...opt }));

    setEditingIndicator({
      ...ind,
      pilihanNilai: existingPilihan,
    });
    setIsCreating(false);
  };

  const handleToggleEditNilaiOption = (nilaiKey: IndicatorNilaiKey, enabled: boolean) => {
    if (!editingIndicator) return;
    const updated = (editingIndicator.pilihanNilai || DEFAULT_NILAI_OPTIONS).map((opt) =>
      opt.nilai === nilaiKey ? { ...opt, enabled } : opt
    );
    setEditingIndicator({ ...editingIndicator, pilihanNilai: updated });
  };

  const handleUpdateEditNilaiReferensi = (nilaiKey: IndicatorNilaiKey, referensiKetentuan: string) => {
    if (!editingIndicator) return;
    const updated = (editingIndicator.pilihanNilai || DEFAULT_NILAI_OPTIONS).map((opt) =>
      opt.nilai === nilaiKey ? { ...opt, referensiKetentuan } : opt
    );
    setEditingIndicator({ ...editingIndicator, pilihanNilai: updated });
  };

  const handleToggleNewNilaiOption = (nilaiKey: IndicatorNilaiKey, enabled: boolean) => {
    setNewPilihanNilai((prev) =>
      prev.map((opt) => (opt.nilai === nilaiKey ? { ...opt, enabled } : opt))
    );
  };

  const handleUpdateNewNilaiReferensi = (nilaiKey: IndicatorNilaiKey, referensiKetentuan: string) => {
    setNewPilihanNilai((prev) =>
      prev.map((opt) => (opt.nilai === nilaiKey ? { ...opt, referensiKetentuan } : opt))
    );
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIndicator) return;

    if (!editingIndicator.nama.trim()) {
      setFormError('Nama indikator tidak boleh kosong.');
      return;
    }

    const hasAtLeastOneNilai = (editingIndicator.pilihanNilai || []).some((opt) => opt.enabled);
    if (!hasAtLeastOneNilai) {
      setFormError('Minimal harus ada 1 pilihan nilai (N/A, 0, 1, 2, atau 3) yang diceklist.');
      return;
    }

    await updateIndicator(editingIndicator.id, {
      nama: editingIndicator.nama.trim(),
      nomorSOP: Number(editingIndicator.nomorSOP) || undefined,
      bobot: Number(editingIndicator.bobot) || 0,
      deskripsi: editingIndicator.deskripsi.trim(),
      pilihanNilai: editingIndicator.pilihanNilai,
    });

    setEditingIndicator(null);
    showToast(`Indikator "${editingIndicator.nama}" berhasil diperbarui.`);
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newNama.trim()) {
      setFormError('Nama indikator harus diisi.');
      return;
    }

    if (newBobot <= 0) {
      setFormError('Bobot nilai harus lebih besar dari 0%.');
      return;
    }

    const hasAtLeastOneNilai = newPilihanNilai.some((opt) => opt.enabled);
    if (!hasAtLeastOneNilai) {
      setFormError('Minimal harus ada 1 pilihan nilai (N/A, 0, 1, 2, atau 3) yang diceklist.');
      return;
    }

    await addIndicator({
      nama: newNama.trim(),
      nomorSOP: typeof newNomorSOP === 'number' ? newNomorSOP : undefined,
      bobot: Number(newBobot),
      deskripsi: newDeskripsi.trim() || 'Evaluasi kepatuhan terhadap indikator mutu layanan.',
      skalaMin: 0,
      skalaMax: 100,
      pilihanNilai: newPilihanNilai,
    });

    setNewNama('');
    setNewNomorSOP('');
    setNewBobot(10);
    setNewDeskripsi('');
    setNewPilihanNilai(DEFAULT_NILAI_OPTIONS.map((opt) => ({ ...opt })));
    setIsCreating(false);
    showToast(`Indikator baru berhasil ditambahkan.`);
  };

  const handleDelete = async (ind: Indicator) => {
    if (indicators.length <= 1) {
      alert('Minimal harus ada 1 indikator dalam sistem penilaian mutu.');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus indikator "${ind.nama}"?`)) {
      await deleteIndicator(ind.id);
      showToast(`Indikator "${ind.nama}" berhasil dihapus.`);
    }
  };

  // Quick weight step adjustment (+ or -)
  const handleQuickAdjustWeight = async (indId: string, delta: number) => {
    const target = indicators.find((i) => i.id === indId);
    if (!target) return;
    const currentBobot = Number(target.bobot) || 0;
    const nextBobot = Math.max(1, Math.min(100, currentBobot + delta));
    if (nextBobot === currentBobot) return;

    await updateIndicator(indId, { bobot: nextBobot });
  };

  // Direct weight input change
  const handleDirectWeightChange = async (indId: string, val: number) => {
    const safeVal = Math.max(0, Math.min(100, val || 0));
    await updateIndicator(indId, { bobot: safeVal });
  };

  // Apply Official Standard SOP Weights:
  // 1. Salam Pembuka 5%
  // 2. Menyapa Peserta 5%
  // 14. Pemilihan Topik Masalah 10%
  // 15. Analisis 15%
  // 16. Akurasi Informasi 20%
  // 17. Edukasi Tambahan 5%
  // 18. Kesesuaian Tindak Lanjut 10%
  // 19. Pemilihan Kata Dan Bahasa 10%
  // 20. Kemampuan Presentasi 10%
  // 21. Edukasi Rating 5%
  // 22. Salam Penutup 5%
  const handleApplyOfficialStandardSOP = async () => {
    if (
      confirm(
        'Terapkan pembobotan baku SOP resmi BPJS Kesehatan?\n\n' +
        '1. Salam Pembuka (5%)\n' +
        '2. Menyapa Peserta (5%)\n' +
        '14. Pemilihan Topik Masalah (10%)\n' +
        '15. Analisis (15%)\n' +
        '16. Akurasi Informasi (20%)\n' +
        '17. Edukasi Tambahan (5%)\n' +
        '18. Kesesuaian Tindak Lanjut (10%)\n' +
        '19. Pemilihan Kata Dan Bahasa (10%)\n' +
        '20. Kemampuan Presentasi (10%)\n' +
        '21. Edukasi Rating (5%)\n' +
        '22. Salam Penutup (5%)\n\n' +
        'Total Akumulasi: Tepat 100%'
      )
    ) {
      await applyStandardSopWeights();
      showToast('Berhasil menerapkan pembobotan baku SOP resmi BPJS Kesehatan (Tepat 100%).');
    }
  };

  const handleResetToStandard = async () => {
    if (
      confirm(
        'Reset seluruh indikator kembali ke standar baku SOP (11 Indikator Mutu dengan total bobot 100%)?'
      )
    ) {
      await resetIndicators();
      showToast('Indikator berhasil direset ke standar SOP resmi BPJS Kesehatan.');
    }
  };

  const isWeightValid = totalIndicatorWeight === 100;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 shadow-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <p className="text-xs font-semibold">{successToast}</p>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  Konfigurasi Indikator & Bobot Penilaian Mutu
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                  SOP Terstandar
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Standar rubrik evaluasi mutu jawaban petugas Senada BPJS Kesehatan: No. SOP, Nama Indikator, Bobot (%), dan Pilihan Nilai (N/A, 0, 1, 2, 3).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleApplyOfficialStandardSOP}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
              title="Terapkan bobot baku resmi: 1 (5%), 2 (5%), 14 (10%), 15 (15%), 16 (20%), 17 (5%), 18 (10%), 19 (10%), 20 (10%), 21 (5%), 22 (5%)"
            >
              <Check className="w-4 h-4" />
              Terapkan Bobot Baku SOP (100%)
            </button>

            <button
              onClick={() => {
                setIsCreating(true);
                setEditingIndicator(null);
              }}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Indikator
            </button>

            <button
              onClick={handleResetToStandard}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Reset ke indikator standar SOP"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset SOP
            </button>
          </div>
        </div>

        {/* Total Weight Status Bar */}
        <div
          className={`mt-5 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
            isWeightValid
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
              : totalIndicatorWeight > 100
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-3">
            {isWeightValid ? (
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm">
                  Total Akumulasi Bobot: {totalIndicatorWeight}%
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isWeightValid
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {isWeightValid ? 'Ideal (100%)' : totalIndicatorWeight > 100 ? `Lebih ${totalIndicatorWeight - 100}%` : `Kurang ${100 - totalIndicatorWeight}%`}
                </span>
              </div>
              <p className="text-[11px] opacity-85 mt-0.5">
                {isWeightValid
                  ? 'Total seluruh bobot tepat 100%. Rumrik penilaian mutu AI dan QA terkalibrasi secara optimal dan presisi.'
                  : `Peringatan: Total bobot saat ini ${totalIndicatorWeight}%. Gunakan tombol "Terapkan Bobot Baku SOP" untuk menyeimbangkan tepat 100%.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isWeightValid && (
              <button
                onClick={handleApplyOfficialStandardSOP}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs transition"
              >
                Terapkan Standar 100%
              </button>
            )}
            <button
              onClick={() => setShowQuickTable((prev) => !prev)}
              className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-teal-600" />
              <span>{showQuickTable ? 'Sembunyikan Tabel Bobot' : 'Tampilkan Tabel Bobot'}</span>
            </button>
          </div>
        </div>

        {/* Quick Weight Adjuster Table */}
        {showQuickTable && (
          <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <div className="p-3.5 bg-slate-100/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-700" />
                <span className="font-bold text-slate-800">
                  Tabel Pengaturan Cepat Bobot Indikator (Terkoneksi Server Real-Time)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Nilai bobot otomatis tersimpan di server saat Anda mengubah angka atau menekan tombol +/-
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2.5 w-16 text-center">No. SOP</th>
                    <th className="px-3.5 py-2.5">Nama Indikator Mutu</th>
                    <th className="px-3.5 py-2.5 w-60 text-center">Atur Bobot (%)</th>
                    <th className="px-3.5 py-2.5 w-24 text-right">Proporsi</th>
                    <th className="px-3.5 py-2.5 w-28 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {indicators.map((ind, idx) => {
                    const sopNum = ind.nomorSOP ?? idx + 1;
                    return (
                      <tr key={ind.id} className="hover:bg-teal-50/30 transition">
                        <td className="px-3.5 py-2.5 text-center font-extrabold text-teal-700">
                          <span className="inline-block w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 leading-7 text-xs">
                            {sopNum}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-slate-800">{ind.nama}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-md">
                            {ind.deskripsi}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustWeight(ind.id, -5)}
                              className="px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold"
                              title="Kurangi 5%"
                            >
                              -5%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustWeight(ind.id, -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
                              title="Kurangi 1%"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={ind.bobot}
                                onChange={(e) =>
                                  handleDirectWeightChange(ind.id, Number(e.target.value))
                                }
                                className="w-16 py-1 px-2 text-center text-xs font-extrabold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-slate-50"
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500">%</span>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustWeight(ind.id, 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
                              title="Tambah 1%"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustWeight(ind.id, 5)}
                              className="px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold"
                              title="Tambah 5%"
                            >
                              +5%
                            </button>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-semibold text-slate-700">
                          {totalIndicatorWeight > 0
                            ? `${Math.round(((ind.bobot || 0) / totalIndicatorWeight) * 100)}%`
                            : '0%'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(ind)}
                            className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-[11px] inline-flex items-center gap-1 transition"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            Edit Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 text-slate-800 font-extrabold text-xs border-t border-slate-200">
                  <tr>
                    <td colSpan={2} className="px-3.5 py-2.5 text-right">
                      Total Akumulasi Seluruh Indikator:
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span
                        className={`text-sm font-extrabold px-3 py-1 rounded-lg border ${
                          isWeightValid
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {totalIndicatorWeight}%
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {isWeightValid ? '100%' : `${totalIndicatorWeight}%`}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="text-[11px] text-teal-700 font-bold">
                        {isWeightValid ? '✓ Pas 100%' : '! Perlu Penyesuaian'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Form Tambah Indikator Baru */}
      {isCreating && (
        <div className="bg-white rounded-xl border border-teal-300 p-5 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-700" />
              Formulir Tambah Indikator Mutu Baru
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateNew} className="space-y-4 text-xs">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {formError}
              </div>
            )}

            {/* Nomor SOP, Nama Indikator, Bobot */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-3">
                <label className="block font-bold text-slate-700 mb-1">
                  Nomor Urut SOP (Opsional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={newNomorSOP}
                  onChange={(e) =>
                    setNewNomorSOP(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="Contoh: 14"
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 font-bold"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Indikator Mutu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: Kecepatan Respon & Ketepatan Istilah Teknis"
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-bold text-slate-700 mb-1">
                  Bobot : (%) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={newBobot}
                  onChange={(e) => setNewBobot(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 font-bold"
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Deskripsi Indikator <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={newDeskripsi}
                onChange={(e) => setNewDeskripsi(e.target.value)}
                placeholder="Jelaskan kriteria jawaban yang dinilai dan parameter pembeda kepatuhan SOP..."
                className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Pilihan Nilai: N/A, 0, 1, 2, 3 */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-teal-600" />
                  Pilihan Nilai Berlaku (N/A, 0, 1, 2, 3) beserta Nilai Referensi Ketentuan
                </label>
                <span className="text-[11px] text-slate-500">
                  Ceklist nilai yang aktif dan lengkapi deskripsi ketentuan jika diperlukan.
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {newPilihanNilai.map((opt) => (
                  <div
                    key={opt.nilai}
                    className={`p-3 rounded-xl border transition ${
                      opt.enabled
                        ? 'bg-white border-slate-300 shadow-2xs'
                        : 'bg-slate-100/70 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={opt.enabled}
                          onChange={(e) => handleToggleNewNilaiOption(opt.nilai, e.target.checked)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getNilaiBadgeColor(
                            opt.nilai
                          )}`}
                        >
                          Nilai: {opt.nilai}
                        </span>
                        <span className="font-semibold text-xs text-slate-800">{opt.label}</span>
                      </label>
                      <span className="text-[10px] font-medium text-slate-400">
                        {opt.enabled ? '✓ Diceklist (Aktif)' : 'Nonaktif'}
                      </span>
                    </div>

                    {opt.enabled && (
                      <div className="mt-2.5 pl-6">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nilai Referensi Ketentuan (Deskripsi Panduan Nilai {opt.nilai}):
                        </label>
                        <input
                          type="text"
                          value={opt.referensiKetentuan}
                          onChange={(e) => handleUpdateNewNilaiReferensi(opt.nilai, e.target.value)}
                          placeholder="Masukkan kriteria panduan pemberian nilai ini..."
                          className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Indikator Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingIndicator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold">
                  Edit Indikator Mutu: {editingIndicator.nama} (ID: {editingIndicator.id})
                </h3>
              </div>
              <button
                onClick={() => setEditingIndicator(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              {/* Nomor SOP, Nama Indikator, Bobot */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Urut SOP
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={editingIndicator.nomorSOP ?? ''}
                    onChange={(e) =>
                      setEditingIndicator({
                        ...editingIndicator,
                        nomorSOP: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder="Contoh: 14"
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-bold focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Indikator Mutu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingIndicator.nama}
                    onChange={(e) =>
                      setEditingIndicator({ ...editingIndicator, nama: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">
                    Bobot : (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={editingIndicator.bobot}
                    onChange={(e) =>
                      setEditingIndicator({
                        ...editingIndicator,
                        bobot: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-bold focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deskripsi Indikator <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingIndicator.deskripsi}
                  onChange={(e) =>
                    setEditingIndicator({ ...editingIndicator, deskripsi: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Pilihan Nilai: N/A, 0, 1, 2, 3 dengan referensi ketentuan */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-teal-600" />
                    Pilihan Nilai & Deskripsi Nilai Referensi Ketentuan
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Lakukan ceklist pada nilai yang berlaku dan sesuaikan uraian referensinya.
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {(editingIndicator.pilihanNilai || DEFAULT_NILAI_OPTIONS).map((opt) => (
                    <div
                      key={opt.nilai}
                      className={`p-3 rounded-xl border transition ${
                        opt.enabled
                          ? 'bg-white border-slate-300 shadow-2xs'
                          : 'bg-slate-100/70 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={opt.enabled}
                            onChange={(e) =>
                              handleToggleEditNilaiOption(opt.nilai, e.target.checked)
                            }
                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                          <span
                            className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getNilaiBadgeColor(
                              opt.nilai
                            )}`}
                          >
                            Nilai: {opt.nilai}
                          </span>
                          <span className="font-semibold text-xs text-slate-800">{opt.label}</span>
                        </label>
                        <span className="text-[10px] font-medium text-slate-400">
                          {opt.enabled ? '✓ Diceklist (Aktif)' : 'Nonaktif'}
                        </span>
                      </div>

                      {opt.enabled && (
                        <div className="mt-2.5 pl-6">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Nilai Referensi Ketentuan untuk Nilai {opt.nilai}:
                          </label>
                          <input
                            type="text"
                            value={opt.referensiKetentuan}
                            onChange={(e) =>
                              handleUpdateEditNilaiReferensi(opt.nilai, e.target.value)
                            }
                            placeholder="Deskripsi kriteria panduan SOP untuk nilai ini..."
                            className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingIndicator(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Indicator Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indicators.map((ind, idx) => {
          const pilihanNilai =
            ind.pilihanNilai && ind.pilihanNilai.length > 0
              ? ind.pilihanNilai
              : DEFAULT_NILAI_OPTIONS;
          const isExpanded = !!expandedCards[ind.id];
          const enabledNilaiList = pilihanNilai.filter((p) => p.enabled);
          const sopNumber = ind.nomorSOP ?? idx + 1;

          return (
            <div
              key={ind.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-teal-300 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header: Nomor SOP, Nama Indikator, & Bobot */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-teal-700 text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      {sopNumber}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                          SOP #{sopNumber}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {ind.id}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {ind.nama}
                      </h3>
                    </div>
                  </div>

                  {/* Bobot Badge with Quick +/- controls */}
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      Bobot Nilai:
                    </div>
                    <div className="flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-lg border border-teal-200 text-teal-800">
                      <button
                        type="button"
                        onClick={() => handleQuickAdjustWeight(ind.id, -1)}
                        className="w-5 h-5 rounded hover:bg-teal-200 text-teal-700 flex items-center justify-center transition"
                        title="Kurangi 1%"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-extrabold text-xs px-1">
                        {ind.bobot}%
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickAdjustWeight(ind.id, 1)}
                        className="w-5 h-5 rounded hover:bg-teal-200 text-teal-700 flex items-center justify-center transition"
                        title="Tambah 1%"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Deskripsi */}
                <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Deskripsi Indikator:
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {ind.deskripsi}
                  </p>
                </div>

                {/* Nilai Pilihan: N/A, 0, 1, 2, 3 */}
                <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                      Pilihan Nilai ({enabledNilaiList.length} Aktif Diceklist)
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCardExpanded(ind.id)}
                      className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 transition"
                    >
                      <span>{isExpanded ? 'Tutup Referensi' : 'Lihat Referensi'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Checklist chips representation */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {pilihanNilai.map((opt) => (
                      <span
                        key={opt.nilai}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          opt.enabled
                            ? getNilaiBadgeColor(opt.nilai)
                            : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-50'
                        }`}
                        title={opt.enabled ? opt.referensiKetentuan : 'Nilai tidak diceklist/nonaktif'}
                      >
                        {opt.enabled && <span className="text-[10px]">✓</span>}
                        <span>{opt.nilai}</span>
                      </span>
                    ))}
                  </div>

                  {/* Nilai Referensi Ketentuan detail list */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Nilai Referensi Ketentuan:
                      </div>
                      {enabledNilaiList.map((opt) => (
                        <div
                          key={opt.nilai}
                          className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-xs flex items-start gap-2"
                        >
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border ${getNilaiBadgeColor(
                              opt.nilai
                            )}`}
                          >
                            {opt.nilai}
                          </span>
                          <div className="flex-1">
                            <span className="font-semibold text-[11px] text-slate-800 block">
                              {opt.label}
                            </span>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                              {opt.referensiKetentuan || 'Belum ada deskripsi referensi.'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Bobot {ind.bobot}% dari 100%
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(ind)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1 transition"
                  >
                    <Edit2 className="w-3 h-3 text-slate-500" />
                    Edit & Ceklist Nilai
                  </button>
                  <button
                    onClick={() => handleDelete(ind)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                    title="Hapus Indikator"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
