import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Indicator, IndicatorNilaiOption, IndicatorNilaiKey } from '../types';
import { DEFAULT_NILAI_OPTIONS } from '../data/mockData';
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
  Square,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';

export const IndicatorManagerView: React.FC = () => {
  const {
    indicators,
    addIndicator,
    updateIndicator,
    deleteIndicator,
    resetIndicators,
    totalIndicatorWeight,
  } = useApp();

  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New indicator form state
  const [newNama, setNewNama] = useState('');
  const [newBobot, setNewBobot] = useState<number>(20);
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

  const handleSaveEdit = (e: React.FormEvent) => {
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

    updateIndicator(editingIndicator.id, {
      nama: editingIndicator.nama.trim(),
      bobot: Number(editingIndicator.bobot) || 0,
      deskripsi: editingIndicator.deskripsi.trim(),
      pilihanNilai: editingIndicator.pilihanNilai,
    });

    setEditingIndicator(null);
    setSuccessToast(`Indikator "${editingIndicator.nama}" berhasil diperbarui.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleCreateNew = (e: React.FormEvent) => {
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

    addIndicator({
      nama: newNama.trim(),
      bobot: Number(newBobot),
      deskripsi: newDeskripsi.trim() || 'Evaluasi kepatuhan terhadap indikator mutu layanan.',
      skalaMin: 0,
      skalaMax: 100,
      pilihanNilai: newPilihanNilai,
    });

    setNewNama('');
    setNewBobot(15);
    setNewDeskripsi('');
    setNewPilihanNilai(DEFAULT_NILAI_OPTIONS.map((opt) => ({ ...opt })));
    setIsCreating(false);
    setSuccessToast(`Indikator baru berhasil ditambahkan.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDelete = (ind: Indicator) => {
    if (indicators.length <= 1) {
      alert('Minimal harus ada 1 indikator dalam sistem penilaian mutu.');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus indikator "${ind.nama}"?`)) {
      deleteIndicator(ind.id);
      setSuccessToast(`Indikator "${ind.nama}" berhasil dihapus.`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  const handleResetToStandard = () => {
    if (
      confirm(
        'Reset seluruh indikator kembali ke standar baku SOP Penanganan Keluhan (5 Indikator Mutu dengan nilai N/A, 0, 1, 2, 3)?'
      )
    ) {
      resetIndicators();
      setSuccessToast('Indikator berhasil direset ke standar SOP resmi BPJS Kesehatan.');
      setTimeout(() => setSuccessToast(null), 4000);
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

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Konfigurasi Indikator & Bobot Penilaian Mutu
              </h1>
              <p className="text-xs text-slate-500">
                Rubrik evaluasi mutu jawaban petugas: Nama Indikator, Deskripsi, Bobot, dan Pilihan Nilai (N/A, 0, 1, 2, 3) beserta Nilai Referensi Ketentuan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsCreating(true);
                setEditingIndicator(null);
              }}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Indikator Baru
            </button>
            <button
              onClick={handleResetToStandard}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title="Reset ke indikator standar SOP"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset SOP
            </button>
          </div>
        </div>

        {/* Total Weight Status Bar */}
        <div
          className={`mt-5 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isWeightValid
              ? 'bg-teal-50/70 border-teal-200 text-teal-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isWeightValid ? (
              <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="font-bold">Total Akumulasi Bobot: {totalIndicatorWeight}%</span>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isWeightValid
                  ? 'Total bobot tepat 100%. Rubrik penilaian AI dan QA terkalibrasi secara optimal.'
                  : `Peringatan: Total bobot saat ini ${totalIndicatorWeight}%. Total seluruh bobot idealnya tepat 100%.`}
              </p>
            </div>
          </div>

          <div className="text-[11px] font-semibold bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/80 shrink-0">
            {indicators.length} Indikator Aktif
          </div>
        </div>
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

            {/* 1. Nama Indikator, 2. Deskripsi, 3. Bobot */}
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
              <div className="sm:col-span-4">
                <label className="block font-bold text-slate-700 mb-1">
                  1. Nama Indikator Mutu <span className="text-rose-500">*</span>
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

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  3. Bobot : (%) <span className="text-rose-500">*</span>
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

            {/* 2. Deskripsi */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                2. Deskripsi Indikator <span className="text-rose-500">*</span>
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

            {/* 4. Nilai : dengan pilihan N/A, 0, 1, 2, 3 */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-teal-600" />
                  4. Nilai : dengan pilihan N/A, 0, 1, 2, 3
                </label>
                <span className="text-[11px] text-slate-500">
                  Ceklist opsi nilai yang berlaku untuk indikator ini.
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
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
                <h3 className="text-sm font-bold">Edit Indikator Mutu: {editingIndicator.id}</h3>
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

              {/* 1. Nama Indikator, 2. Deskripsi, 3. Bobot */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <div className="sm:col-span-4">
                  <label className="block font-bold text-slate-700 mb-1">
                    1. Nama Indikator Mutu <span className="text-rose-500">*</span>
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

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    3. Bobot : (%) <span className="text-rose-500">*</span>
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

              {/* 2. Deskripsi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Deskripsi Indikator <span className="text-rose-500">*</span>
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

              {/* 4. Nilai : dengan pilihan N/A, 0, 1, 2, 3 */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-teal-600" />
                    4. Nilai : dengan pilihan N/A, 0, 1, 2, 3
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Lakukan ceklist pada nilai yang berlaku untuk indikator ini.
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
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

      {/* Indicator Cards List (Target element of focus mode selector) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {indicators.map((ind, idx) => {
          const pilihanNilai =
            ind.pilihanNilai && ind.pilihanNilai.length > 0
              ? ind.pilihanNilai
              : DEFAULT_NILAI_OPTIONS;
          const isExpanded = !!expandedCards[ind.id];
          const enabledNilaiList = pilihanNilai.filter((p) => p.enabled);

          return (
            <div
              key={ind.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-teal-300 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* 1. Nama Indikator & 3. Bobot */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-0.5">
                        1. Nama Indikator:
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {ind.nama}
                      </h3>
                      <span className="font-mono text-[10px] text-slate-400">
                        {ind.id}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                      3. Bobot :
                    </div>
                    <div className="bg-teal-50 text-teal-800 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-teal-200">
                      {ind.bobot}%
                    </div>
                  </div>
                </div>

                {/* 2. Deskripsi */}
                <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    2. Deskripsi:
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {ind.deskripsi}
                  </p>
                </div>

                {/* 4. Nilai : dengan pilihan N/A, 0, 1, 2, 3 */}
                <div className="rounded-lg border border-slate-200 p-3 bg-white space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                      4. Nilai : Pilihan N/A, 0, 1, 2, 3 ({enabledNilaiList.length} Aktif Diceklist)
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
                  Rubrik Terstandar SOP
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
