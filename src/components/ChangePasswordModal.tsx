import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, changePassword } = useApp();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setIsSuccess(false);
    setShowOldPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Ketentuan 1: Masukan password lama
    if (!oldPassword.trim()) {
      setErrorMessage('Silakan masukkan password lama Anda.');
      return;
    }

    // Ketentuan 2: Buat password baru
    if (!newPassword.trim()) {
      setErrorMessage('Silakan buat password baru Anda.');
      return;
    }

    if (newPassword.trim().length < 6) {
      setErrorMessage('Password baru minimal harus terdiri dari 6 karakter.');
      return;
    }

    if (newPassword === oldPassword) {
      setErrorMessage('Password baru tidak boleh sama dengan password lama.');
      return;
    }

    // Ketentuan 3: Validasi password baru
    if (!confirmPassword.trim()) {
      setErrorMessage('Silakan ketik ulang untuk validasi password baru.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Validasi password baru tidak cocok. Pastikan password yang diketik sama.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = changePassword(oldPassword.trim(), newPassword.trim());
      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(res.message || 'Gagal mengubah password. Silakan periksa kembali.');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat memperbarui password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Ganti Password Akun</h2>
              <p className="text-xs text-teal-200">
                {currentUser.name} ({currentUser.role.toUpperCase()})
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Password Berhasil Diubah!</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                Kata sandi akun Anda telah berhasil diperbarui dan tersimpan di sistem.
              </p>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Ketentuan Ganti Password:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-500">
                  <li>Masukkan password lama dengan benar</li>
                  <li>Buat password baru (minimal 6 karakter)</li>
                  <li>Validasi password baru (harus sama persis)</li>
                </ol>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Masukan Password Lama */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Masukkan Password Lama <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password lama Anda"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 2. Buat Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Buat Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 3. Validasi Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Validasi Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru Anda"
                    className={`w-full pl-9 pr-10 py-2 text-xs border rounded-xl outline-none transition ${
                      confirmPassword && newPassword !== confirmPassword
                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-400'
                        : confirmPassword && newPassword === confirmPassword
                        ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-400'
                        : 'border-slate-300 focus:ring-2 focus:ring-teal-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Validasi cocok dengan password baru.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
