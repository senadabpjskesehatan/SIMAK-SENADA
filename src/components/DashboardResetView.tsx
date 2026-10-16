import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  RotateCcw,
  Trash2,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  FileText,
  Users,
} from 'lucide-react';

export const DashboardResetView: React.FC = () => {
  const { evaluations, deleteEvaluationsByPeriod, currentUser } = useApp();

  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Extract unique periods (YYYY-MM) from evaluations
  const periodList = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach((e) => {
      if (e.tanggalSampling) {
        set.add(e.tanggalSampling.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [evaluations]);

  // Filtered evaluations for the selected period
  const targetEvaluations = useMemo(() => {
    if (selectedPeriod === 'all') return evaluations;
    return evaluations.filter((e) => e.tanggalSampling && e.tanggalSampling.startsWith(selectedPeriod));
  }, [evaluations, selectedPeriod]);

  const handleDeleteExecution = async () => {
    setIsDeleting(true);
    setToastMessage(null);
    try {
      const res = await deleteEvaluationsByPeriod(selectedPeriod);
      if (res.success) {
        setToastMessage({ success: true, text: res.message });
        setIsConfirmOpen(false);
      } else {
        setToastMessage({ success: false, text: res.message });
      }
    } catch (err: any) {
      setToastMessage({ success: false, text: err?.message || 'Terjadi kesalahan sistem saat menghapus data.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const isAdminOrQa = currentUser?.role === 'admin' || currentUser?.role === 'qa' || currentUser?.role === 'pusat';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center gap-3 mb-2">
          <span className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
            <RotateCcw className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              Reset & Hapus Nilai Evaluasi per Periode
            </h1>
            <p className="text-xs text-slate-500">
              Hapus data hasil sampling dan nilai akhir berdasarkan periode bulan tertentu. Tindakan ini akan mengembalikan status tiket menjadi belum disampling.
            </p>
          </div>
        </div>

        {!isAdminOrQa && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Catatan: Fitur reset dan hapus data nilai umumnya dikelola oleh Administrator atau Quality Assurance.</span>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 ${
          toastMessage.success
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toastMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Period Selection & Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-600" /> Pilih Periode Bulan yang Akan Dihapus / Direset
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">⚠️ Semua Periode (Semua Data Evaluasi)</option>
              {periodList.map((p) => (
                <option key={p} value={p}>
                  Bulan {p} ({evaluations.filter(e => e.tanggalSampling?.startsWith(p)).length} Sampling)
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Jumlah Data Terdampak</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{targetEvaluations.length} Sampling</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={() => setIsConfirmOpen(true)}
            disabled={targetEvaluations.length === 0 || isDeleting}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              targetEvaluations.length === 0 || isDeleting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
            }`}
          >
            <Trash2 className="w-4 h-4" /> Hapus Nilai Periode Ini ({targetEvaluations.length})
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-md:w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Data Evaluasi</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan menghapus permanen sebanyak <strong className="text-slate-900">{targetEvaluations.length}</strong> data evaluasi/sampling untuk periode <strong className="text-slate-900">{selectedPeriod === 'all' ? 'Semua Periode' : `Bulan ${selectedPeriod}`}</strong>. Tiket terkait akan dikembalikan ke status belum disampling. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteExecution}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
