import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, sessionExpiredMessage, clearSessionExpiredMessage } = useApp();
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    clearSessionExpiredMessage();

    if (!usernameInput.trim()) {
      setErrorMessage('Silakan masukkan username, email, atau NIP Anda.');
      return;
    }

    if (!passwordInput.trim()) {
      setErrorMessage('Silakan masukkan kata sandi Anda.');
      return;
    }

    setIsLoading(true);

    // Call login method
    setTimeout(() => {
      const res = login(usernameInput.trim(), passwordInput.trim());
      if (!res.success) {
        setErrorMessage(res.message || 'Username atau kata sandi tidak sesuai. Silakan periksa kembali.');
        setIsLoading(false);
      } else {
        // Successful login will update currentUser and switch view
        setIsLoading(false);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 relative overflow-hidden select-none">
      {/* Background Glow & Geometric Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none transform -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none transform translate-y-1/2"></div>
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>

      {/* Top Bar Branding */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md ring-2 ring-teal-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  SIMAK - SENADA
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  BPJS Kesehatan
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sistem Monitoring dan Analisis Kualitas Senada
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Server Keamanan Terpusat</span>
          </div>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="relative z-10 flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Card Wrapper */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
            {/* Header of Card */}
            <div className="px-6 sm:px-8 pt-8 pb-6 text-center border-b border-slate-700/60 bg-gradient-to-b from-slate-800 to-slate-850">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Masuk ke Sistem SENADA
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                Silakan autentikasi menggunakan akun resmi BPJS Kesehatan Anda
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-4">
              {sessionExpiredMessage && !errorMessage && (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200 animate-in fade-in duration-200">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">{sessionExpiredMessage}</div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">{errorMessage}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username / NPP / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Masukkan username atau NPP"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-teal-900/40 hover:shadow-teal-800/60 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Sistem</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Security Notice Footer */}
            <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-850 text-center space-y-1">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Akses portal ini hanya diperuntukkan bagi pegawai dan pengelola mutu yang berwenang di lingkungan BPJS Kesehatan.
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-teal-400 font-medium">
                <Clock className="w-3 h-3 text-teal-400" />
                <span>Sesi dibatasi maksimal 60 menit & otomatis logout saat browser ditutup</span>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="text-center mt-6 text-xs text-slate-500 space-y-1">
            <p>SENADA BPJS Kesehatan · Versi 2.5 Mutu</p>
            <p className="text-[11px]">Biro Penjaminan Mutu & Kepesertaan © 2025</p>
          </div>
        </div>
      </main>
    </div>
  );
};
