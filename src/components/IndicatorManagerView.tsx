import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Indicator, IndicatorNilaiOption, IndicatorNilaiKey } from '../types';
import { DEFAULT_NILAI_OPTIONS, INITIAL_INDICATORS, getOptionPercentage } from '../data/mockData';
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
  Percent,
  Settings2,
} from 'lucide-react';

export const IndicatorManagerView: React.FC = () => {
  const {
    indicators,
    addIndicator,
    updateIndicator,
    updateMultipleIndicators,
    updateAllIndicatorsNilaiPercentages,
    applyStandardSopWeights,
    deleteIndicator,
    resetIndicators,
    totalIndicatorWeight,
  } = useApp();

  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);
  const [indicatorToDelete, setIndicatorToDelete] = useState<Indicator | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResettingSOP, setIsResettingSOP] = useState(false);
  const [isConfirmResetModalOpen, setIsConfirmResetModalOpen] = useState(false);
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

  // Percentage setting modal state (N/A, 0, 1, 2, 3 antara 0 - 100%)
  const [isPercentageModalOpen, setIsPercentageModalOpen] = useState(false);
  const [isSavingPercentages, setIsSavingPercentages] = useState(false);
  const [percentageValues, setPercentageValues] = useState<Record<IndicatorNilaiKey, number>>({
    'N/A': 100,
    '0': 0,
    '1': 50,
    '2': 75,
    '3': 100,
  });
  const [applyPercentagesToAll, setApplyPercentagesToAll] = useState(true);
  const [selectedIndicatorIdsForPercentage, setSelectedIndicatorIdsForPercentage] = useState<string[]>([]);

  const handleOpenPercentageModal = (indId?: string) => {
    const sourceInd = indId ? indicators.find((i) => i.id === indId) : indicators[0];
    const initialValues: Record<IndicatorNilaiKey, number> = {
      'N/A': 100,
      '0': 0,
      '1': 50,
      '2': 75,
      '3': 100,
    };
    if (sourceInd?.pilihanNilai) {
      sourceInd.pilihanNilai.forEach((p) => {
        initialValues[p.nilai] = getOptionPercentage(p);
      });
    }
    setPercentageValues(initialValues);
    if (indId) {
      setApplyPercentagesToAll(false);
      setSelectedIndicatorIdsForPercentage([indId]);
    } else {
      setApplyPercentagesToAll(true);
      setSelectedIndicatorIdsForPercentage(indicators.map((i) => i.id));
    }
    setIsPercentageModalOpen(true);
  };

  const handleApplyPresetPercentages = (preset: 'standard' | 'linear' | 'strict' | 'flexible') => {
    switch (preset) {
      case 'standard':
        setPercentageValues({ 'N/A': 100, '0': 0, '1': 50, '2': 75, '3': 100 });
        break;
      case 'linear':
        setPercentageValues({ 'N/A': 100, '0': 0, '1': 33, '2': 67, '3': 100 });
        break;
      case 'strict':
        setPercentageValues({ 'N/A': 100, '0': 0, '1': 25, '2': 60, '3': 100 });
        break;
      case 'flexible':
        setPercentageValues({ 'N/A': 100, '0': 0, '1': 40, '2': 80, '3': 100 });
        break;
    }
  };

  const handleSavePercentageSettings = async () => {
    setIsSavingPercentages(true);
    try {
      const targetIds = applyPercentagesToAll ? undefined : selectedIndicatorIdsForPercentage;
      const count = targetIds ? targetIds.length : indicators.length;
      
      // Close modal immediately and show confirmation toast for instant feedback
      setIsPercentageModalOpen(false);
      showToast(`Besaran persentase nilai (N/A, 0, 1, 2, 3) berhasil diterapkan ke ${count} indikator.`);

      const res = await updateAllIndicatorsNilaiPercentages(percentageValues, targetIds);
      if (res && res.success === false) {
        showToast(`Catatan server: ${res.error || 'Terjadi keterlambatan sinkronisasi'}`);
      }
    } catch (err: any) {
      showToast(`Gagal menyimpan persentase: ${err?.message || 'Kesalahan sistem'}`);
    } finally {
      setIsSavingPercentages(false);
      setIsPercentageModalOpen(false);
    }
  };

  const handleUpdateEditNilaiPersentase = (nilaiKey: IndicatorNilaiKey, persentase: number) => {
    if (!editingIndicator) return;
    const safePct = Math.max(0, Math.min(100, isNaN(persentase) ? 0 : Math.round(persentase)));
    const updated = (editingIndicator.pilihanNilai || DEFAULT_NILAI_OPTIONS).map((opt) =>
      opt.nilai === nilaiKey ? { ...opt, persentase: safePct } : opt
    );
    setEditingIndicator({ ...editingIndicator, pilihanNilai: updated });
  };

  const handleUpdateNewNilaiPersentase = (nilaiKey: IndicatorNilaiKey, persentase: number) => {
    const safePct = Math.max(0, Math.min(100, isNaN(persentase) ? 0 : Math.round(persentase)));
    setNewPilihanNilai((prev) =>
      prev.map((opt) => (opt.nilai === nilaiKey ? { ...opt, persentase: safePct } : opt))
    );
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

    const idToUpdate = editingIndicator.id;
    const nameToUpdate = editingIndicator.nama.trim();
    const dataToUpdate = {
      nama: nameToUpdate,
      nomorSOP: Number(editingIndicator.nomorSOP) || undefined,
      bobot: Number(editingIndicator.bobot) || 0,
      deskripsi: editingIndicator.deskripsi.trim(),
      pilihanNilai: editingIndicator.pilihanNilai,
    };

    setEditingIndicator(null);
    showToast(`Indikator "${nameToUpdate}" berhasil diperbarui.`);

    try {
      await updateIndicator(idToUpdate, dataToUpdate);
    } catch (err: any) {
      console.warn('Error saving edit:', err);
    }
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

    const newIndData = {
      nama: newNama.trim(),
      nomorSOP: typeof newNomorSOP === 'number' ? newNomorSOP : undefined,
      bobot: Number(newBobot),
      deskripsi: newDeskripsi.trim() || 'Evaluasi kepatuhan terhadap indikator mutu layanan.',
      skalaMin: 0,
      skalaMax: 100,
      pilihanNilai: newPilihanNilai,
    };

    setIsCreating(false);
    setNewNama('');
    setNewNomorSOP('');
    setNewBobot(10);
    setNewDeskripsi('');
    setNewPilihanNilai(DEFAULT_NILAI_OPTIONS.map((opt) => ({ ...opt })));
    showToast(`Indikator baru "${newIndData.nama}" berhasil ditambahkan.`);

    await addIndicator(newIndData);
  };

  const handleDelete = (ind: Indicator) => {
    if (indicators.length <= 1) {
      showToast('Minimal harus ada 1 indikator dalam sistem penilaian mutu.');
      return;
    }
    setIndicatorToDelete(ind);
  };

  const confirmDeleteIndicator = async () => {
    if (!indicatorToDelete) return;
    const target = indicatorToDelete;
    setIsDeleting(true);
    try {
      const res = await deleteIndicator(target.id);
      if (res && res.success === false) {
        showToast(`Gagal menghapus: ${res.error || 'Terjadi kesalahan sistem'}`);
      } else {
        showToast(`Indikator "${target.nama}" berhasil dihapus dari sistem & server.`);
      }
    } catch (err: any) {
      showToast(`Gagal menghapus indikator: ${err?.message || 'Kesalahan sistem'}`);
    } finally {
      setIsDeleting(false);
      setIndicatorToDelete(null);
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

  // Apply Official Standard SOP Weights
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

  const handleExecuteResetSOP = async () => {
    setIsResettingSOP(true);
    setIsConfirmResetModalOpen(false);
    try {
      const res = await resetIndicators();
      if (res && res.success === false) {
        showToast(`Gagal reset SOP: ${res.error || 'Terjadi kesalahan server'}`);
      } else {
        showToast('Indikator mutu berhasil direset ke standar SOP resmi BPJS Kesehatan (11 Indikator Baku).');
      }
    } catch (err: any) {
      showToast(`Gagal reset SOP: ${err?.message || 'Kesalahan server'}`);
    } finally {
      setIsResettingSOP(false);
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
              type="button"
              onClick={() => handleOpenPercentageModal()}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Atur besaran persentase nilai N/A, 0, 1, 2, 3 (rentang 0 - 100%)"
            >
              <Percent className="w-4 h-4" />
              Setting Persentase Nilai (N/A, 0, 1, 2, 3)
            </button>

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
              type="button"
              onClick={() => setIsConfirmResetModalOpen(true)}
              disabled={isResettingSOP}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Reset ke indikator standar SOP resmi BPJS Kesehatan"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResettingSOP ? 'animate-spin text-teal-600' : ''}`} />
              <span>{isResettingSOP ? 'Mereset SOP...' : 'Reset SOP'}</span>
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
                      <tr key={`ind-row-${ind.id}-${idx}`} className="hover:bg-teal-50/30 transition">
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
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(ind)}
                              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                              title="Edit Detail & Rubrik Nilai"
                            >
                              <Edit2 className="w-3 h-3 text-slate-500" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(ind)}
                              className="p-1 rounded border border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition cursor-pointer"
                              title={`Hapus Indikator ${ind.nama}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
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
                {newPilihanNilai.map((opt, idx) => (
                  <div
                    key={`new-opt-${opt.nilai}-${idx}`}
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
                      <div className="mt-2.5 pl-6 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                          <div className="flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5 text-indigo-700" />
                            <span className="text-[11px] font-bold text-slate-700">
                              Besaran Persentase Nilai {opt.nilai} (0 - 100%):
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={opt.persentase ?? getOptionPercentage(opt)}
                              onChange={(e) => handleUpdateNewNilaiPersentase(opt.nilai, Number(e.target.value))}
                              className="w-24 accent-indigo-600 cursor-pointer"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={opt.persentase ?? getOptionPercentage(opt)}
                                onChange={(e) => handleUpdateNewNilaiPersentase(opt.nilai, Number(e.target.value))}
                                className="w-14 p-1 text-center font-bold text-xs rounded border border-slate-300 bg-white"
                              />
                              <span className="font-bold text-slate-600 text-xs">%</span>
                            </div>
                          </div>
                        </div>

                        <div>
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
                  {(editingIndicator.pilihanNilai || DEFAULT_NILAI_OPTIONS).map((opt, idx) => (
                    <div
                      key={`edit-opt-${opt.nilai}-${idx}`}
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
                        <div className="mt-2.5 pl-6 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                            <div className="flex items-center gap-1.5">
                              <Percent className="w-3.5 h-3.5 text-indigo-700" />
                              <span className="text-[11px] font-bold text-slate-700">
                                Besaran Persentase Nilai {opt.nilai} (0 - 100%):
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={1}
                                value={opt.persentase ?? getOptionPercentage(opt)}
                                onChange={(e) => handleUpdateEditNilaiPersentase(opt.nilai, Number(e.target.value))}
                                className="w-24 accent-indigo-600 cursor-pointer"
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={opt.persentase ?? getOptionPercentage(opt)}
                                  onChange={(e) => handleUpdateEditNilaiPersentase(opt.nilai, Number(e.target.value))}
                                  className="w-14 p-1 text-center font-bold text-xs rounded border border-slate-300 bg-white"
                                />
                                <span className="font-bold text-slate-600 text-xs">%</span>
                              </div>
                            </div>
                          </div>

                          <div>
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
              key={`ind-card-${ind.id}-${idx}`}
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
                    {pilihanNilai.map((opt, oIdx) => (
                      <span
                        key={`card-pill-${ind.id}-${opt.nilai}-${oIdx}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          opt.enabled
                            ? getNilaiBadgeColor(opt.nilai)
                            : 'bg-slate-50 text-slate-400 border-slate-200 line-through opacity-50'
                        }`}
                        title={
                          opt.enabled
                            ? `${opt.label} • Besaran Skor: ${getOptionPercentage(opt)}%`
                            : 'Nilai tidak diceklist/nonaktif'
                        }
                      >
                        {opt.enabled && <span className="text-[10px]">✓</span>}
                        <span>{opt.nilai}</span>
                        {opt.enabled && (
                          <span className="font-extrabold text-[10px] opacity-90">
                            ({getOptionPercentage(opt)}%)
                          </span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Nilai Referensi Ketentuan detail list */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Nilai Referensi Ketentuan:</span>
                        <span>Besaran Persentase</span>
                      </div>
                      {enabledNilaiList.map((opt, eIdx) => (
                        <div
                          key={`card-ref-${ind.id}-${opt.nilai}-${eIdx}`}
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
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[11px] text-slate-800">
                                {opt.label}
                              </span>
                              <span className="font-bold text-[10px] text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                {getOptionPercentage(opt)}%
                              </span>
                            </div>
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

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenPercentageModal(ind.id)}
                    className="px-2 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-800 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                    title={`Setting besaran persentase nilai (N/A, 0, 1, 2, 3) untuk ${ind.nama}`}
                  >
                    <Percent className="w-3 h-3 text-indigo-600" />
                    Atur %
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(ind)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-slate-500" />
                    Edit & Ceklist Nilai
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(ind);
                    }}
                    className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition cursor-pointer"
                    title={`Hapus Indikator ${ind.nama}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Indicator Confirmation Modal */}
      {indicatorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-rose-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Konfirmasi Hapus Indikator Mutu</h3>
              </div>
              <button
                type="button"
                onClick={() => setIndicatorToDelete(null)}
                disabled={isDeleting}
                className="p-1 rounded text-rose-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Apakah Anda yakin ingin menghapus indikator penilaian mutu berikut dari sistem dan server Firestore?
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px]">Nama Indikator:</span>
                  <span className="font-bold text-slate-900">{indicatorToDelete.nama}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px]">No. SOP / ID:</span>
                  <span className="font-mono font-semibold text-teal-800">
                    SOP #{indicatorToDelete.nomorSOP ?? '-'} ({indicatorToDelete.id})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[11px]">Bobot Nilai:</span>
                  <span className="font-bold text-slate-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {indicatorToDelete.bobot}%
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] leading-relaxed">
                Peringatan: Menghapus indikator akan mengubah total akumulasi bobot sistem. Pastikan untuk menyeimbangkan kembali total bobot ke 100%.
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIndicatorToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteIndicator}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? 'animate-spin' : ''}`} />
                  {isDeleting ? 'Menghapus dari Server...' : 'Ya, Hapus Indikator'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset SOP Confirmation Modal */}
      {isConfirmResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-teal-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Reset ke Standar SOP Resmi BPJS</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmResetModalOpen(false)}
                disabled={isResettingSOP}
                className="p-1 rounded text-teal-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Tindakan ini akan mengembalikan seluruh rubrik indikator dan bobot mutu ke <strong>11 Indikator Baku SOP BPJS Kesehatan</strong> dengan akumulasi bobot tepat 100%:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 max-h-48 overflow-y-auto space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-700 font-medium"><span>1. Salam Pembuka</span><span className="font-bold text-teal-800">5%</span></div>
                <div className="flex justify-between text-slate-700 font-medium"><span>2. Menyapa Peserta</span><span className="font-bold text-teal-800">5%</span></div>
                <div className="flex justify-between text-slate-700 font-medium"><span>14. Pemilihan Topik Masalah</span><span className="font-bold text-teal-800">10%</span></div>
                <div className="flex justify-between text-slate-700 font-medium"><span>15. Analisis</span><span className="font-bold text-teal-800">15%</span></div>
                <div className="flex justify-between text-slate-700 font-medium"><span>16. Akurasi Informasi</span><span className="font-bold text-teal-800">20%</span></div>
                <div className="flex justify-between text-slate-700 font-medium"><span>17. Edukasi Tambahan</span><span className="font-bold text-teal-800">5%</span></div>
                <div className="flex justify-between text-slate-700 font-medium"><span>18. Kesesuaian Tindak Lanjut</span><span className="font-bold text-teal-800">10%</span></div>
                <div className="flex justify-between text-slate-700 font-medium"><span>19. Pemilihan Kata Dan Bahasa</span><span className="font-bold text-teal-800">10%</span></div>
                <div className="flex justify-between text-slate-700 font-medium"><span>20. Kemampuan Presentasi</span><span className="font-bold text-teal-800">10%</span></div>
                <div className="flex justify-between text-slate-700 font-medium"><span>21. Edukasi Rating</span><span className="font-bold text-teal-800">5%</span></div>
                <div className="flex justify-between text-slate-700 font-medium"><span>22. Salam Penutup</span><span className="font-bold text-teal-800">5%</span></div>
              </div>

              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[11px] leading-relaxed">
                Data standar akan disimpan ke server Firestore dan disinkronkan secara real-time ke seluruh pengguna.
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsConfirmResetModalOpen(false)}
                  disabled={isResettingSOP}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteResetSOP}
                  disabled={isResettingSOP}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isResettingSOP ? 'animate-spin' : ''}`} />
                  {isResettingSOP ? 'Mereset ke Server...' : 'Ya, Terapkan Reset SOP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global & Per-Indicator Nilai Percentage Settings Modal */}
      {isPercentageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-indigo-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-indigo-800 text-indigo-300">
                  <Percent className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">
                    Setting Besaran Persentase Nilai (N/A, 0, 1, 2, 3)
                  </h3>
                  <p className="text-[11px] text-indigo-200">
                    Konfigurasi rentang persentase skor capaian 0% - 100% untuk setiap tingkatan nilai mutu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPercentageModalOpen(false)}
                disabled={isSavingPercentages}
                className="p-1 rounded text-indigo-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[82vh] overflow-y-auto">
              {/* Presets Row */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Pilihan Skala Baku Cepat (Preset Otomatis):
                  </span>
                  <span className="text-[10px] text-slate-500">Klik untuk menerapkan pola</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPresetPercentages('standard')}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition cursor-pointer"
                  >
                    <div className="font-bold text-slate-800 text-[11px]">Standar BPJS</div>
                    <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                      0 • 50 • 75 • 100%
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetPercentages('linear')}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition cursor-pointer"
                  >
                    <div className="font-bold text-slate-800 text-[11px]">Linear 1/3</div>
                    <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                      0 • 33 • 67 • 100%
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetPercentages('strict')}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition cursor-pointer"
                  >
                    <div className="font-bold text-slate-800 text-[11px]">Skala Ketat</div>
                    <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                      0 • 25 • 60 • 100%
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetPercentages('flexible')}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition cursor-pointer"
                  >
                    <div className="font-bold text-slate-800 text-[11px]">Skala Fleksibel</div>
                    <div className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                      0 • 40 • 80 • 100%
                    </div>
                  </button>
                </div>
              </div>

              {/* Individual Nilai Slider Cards */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Atur Besaran Persentase Masing-Masing Nilai (0 - 100%):</span>
                  <span className="text-[10px] text-slate-400">Rentang: 0 s/d 100%</span>
                </div>

                {(['N/A', '0', '1', '2', '3'] as IndicatorNilaiKey[]).map((key, kIdx) => {
                  const currentValue = percentageValues[key] ?? 100;
                  const labelMap: Record<IndicatorNilaiKey, { title: string; desc: string }> = {
                    'N/A': {
                      title: 'Not Applicable (Tidak Berlaku)',
                      desc: 'Diperuntukkan jika indikator tidak relevan/tidak berlaku pada tiket ini (standar 100% agar tidak mengurangi nilai petugas, atau dapat diset 0-100%).',
                    },
                    '0': {
                      title: 'Tidak Sesuai / Tidak Dilakukan',
                      desc: 'Prosedur atau standar pelayanan sama sekali tidak dijalankan.',
                    },
                    '1': {
                      title: 'Kurang Sesuai',
                      desc: 'Dilakukan sebagian kecil atau kurang dari standar ketentuan pelayanan.',
                    },
                    '2': {
                      title: 'Cukup Sesuai',
                      desc: 'Sebagian besar standar ketentuan terpenuhi dengan catatan minor.',
                    },
                    '3': {
                      title: 'Sangat Sesuai / Sempurna',
                      desc: 'Seluruh standar ketentuan terpenuhi dengan sangat baik dan optimal.',
                    },
                  };

                  const quickPills: Record<IndicatorNilaiKey, number[]> = {
                    'N/A': [0, 50, 100],
                    '0': [0, 10, 20],
                    '1': [25, 33, 50],
                    '2': [60, 67, 75, 80],
                    '3': [85, 90, 100],
                  };

                  return (
                    <div
                      key={`modal-pct-${key}-${kIdx}`}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition shadow-2xs space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getNilaiBadgeColor(
                              key
                            )}`}
                          >
                            Nilai: {key}
                          </span>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">
                              {labelMap[key].title}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {labelMap[key].desc}
                            </span>
                          </div>
                        </div>

                        {/* Direct input and percentage display */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={currentValue}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                              setPercentageValues((prev) => ({ ...prev, [key]: val }));
                            }}
                            className="w-16 p-1.5 text-center font-extrabold text-sm rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-slate-600 text-sm">%</span>
                        </div>
                      </div>

                      {/* Slider and quick buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-[10px] font-bold text-slate-400">0%</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={currentValue}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPercentageValues((prev) => ({ ...prev, [key]: val }));
                            }}
                            className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                          />
                          <span className="text-[10px] font-bold text-slate-400">100%</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-400 mr-1">Cepat:</span>
                          {quickPills[key].map((p, pIdx) => (
                            <button
                              key={`pill-${key}-${p}-${pIdx}`}
                              type="button"
                              onClick={() => setPercentageValues((prev) => ({ ...prev, [key]: p }))}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                currentValue === p
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Target Scope Section */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
                    <input
                      type="checkbox"
                      checked={applyPercentagesToAll}
                      onChange={(e) => setApplyPercentagesToAll(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Terapkan persentase ini ke seluruh indikator ({indicators.length} Indikator Aktif)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-700">
                    {applyPercentagesToAll ? 'Semua Indikator Terpilih' : `${selectedIndicatorIdsForPercentage.length} Indikator Terpilih`}
                  </span>
                </div>

                {!applyPercentagesToAll && (
                  <div className="pt-2 border-t border-indigo-100 space-y-1.5 animate-in fade-in">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Pilih indikator yang akan diubah besaran persentasenya:
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 bg-white rounded-lg p-2 border border-slate-200">
                      {indicators.map((ind, idx) => {
                        const isChecked = selectedIndicatorIdsForPercentage.includes(ind.id);
                        return (
                          <label
                            key={`target-ind-${ind.id}-${idx}`}
                            className="flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-50 p-1 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIndicatorIdsForPercentage((prev) => [...prev, ind.id]);
                                } else {
                                  setSelectedIndicatorIdsForPercentage((prev) => prev.filter((id) => id !== ind.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-indigo-600"
                            />
                            <span className="font-mono text-[10px] text-teal-800 font-bold">
                              #{ind.nomorSOP ?? idx + 1}
                            </span>
                            <span className="font-medium truncate">{ind.nama}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">({ind.bobot}%)</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Simulasi: Indikator bobot <strong>20%</strong> dengan Nilai 2 ({percentageValues['2']}%) = <strong>{Math.round((20 * percentageValues['2']) / 100 * 10) / 10} poin</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono font-bold text-[10px] text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  N/A:{percentageValues['N/A']}% • 0:{percentageValues['0']}% • 1:{percentageValues['1']}% • 2:{percentageValues['2']}% • 3:{percentageValues['3']}%
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsPercentageModalOpen(false)}
                  disabled={isSavingPercentages}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSavePercentageSettings}
                  disabled={isSavingPercentages || (!applyPercentagesToAll && selectedIndicatorIdsForPercentage.length === 0)}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isSavingPercentages ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan ke Server...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Terapkan & Simpan Persentase</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
