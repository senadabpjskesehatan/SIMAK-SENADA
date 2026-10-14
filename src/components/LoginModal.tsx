import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, UserCheck, Lock, Mail, CheckCircle2, X } from 'lucide-react';
import { UserRole, User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, setCurrentUser, setActiveTab } = useApp();
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRolePreset, setSelectedRolePreset] = useState<UserRole | null>(null);

  if (!isOpen) return null;

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedUser = usernameInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    const found = users.find(
      (u) =>
        u.username.toLowerCase() === trimmedUser ||
        u.email.toLowerCase() === trimmedUser
    );

    if (found) {
      if (found.password && found.password !== trimmedPass) {
        setErrorMessage('Kata sandi salah. Gunakan sandi: 150bisa');
        return;
      }
      setCurrentUser(found);
      setActiveTab('dashboard');
      onClose();
    } else if (trimmedUser === 'senada' && trimmedPass === '150bisa') {
      const adminUser: User = {
        id: 'USR-ADMIN-SENADA',
        username: 'senada',
        name: 'Administrator Senada',
        role: 'admin',
        email: 'senada@bpjskesehatan.go.id',
        division: 'Biro Teknologi & Penjaminan Mutu',
        nip: '198704152010121001',
        password: '150bisa',
      };
      setCurrentUser(adminUser);
      setActiveTab('dashboard');
      onClose();
    } else {
      setErrorMessage('Username atau kata sandi salah. (Gunakan user: senada, password: 150bisa)');
    }
  };

  const handlePresetSelect = (role: UserRole) => {
    setSelectedRolePreset(role);
    const target = users.find((u) => u.role === role) || {
      id: 'USR-ADMIN-SENADA',
      username: 'senada',
      name: 'Administrator Senada',
      role: 'admin',
      email: 'senada@bpjskesehatan.go.id',
      division: 'Biro Teknologi & Penjaminan Mutu',
      nip: '198704152010121001',
      password: '150bisa',
    };
    setCurrentUser(target);
    setActiveTab('dashboard');
    onClose();
  };

  const roleCards: {
    role: UserRole;
    title: string;
    description: string;
    color: string;
    borderColor: string;
    sampleUser: string;
  }[] = [
    {
      role: 'admin',
      title: 'Administrator Senada',
      description: 'Manajemen pengguna & hak akses, integrasi data Google Sheet, dan kalibrasi mutu sampling.',
      color: 'bg-rose-50 hover:bg-rose-100 text-rose-900',
      borderColor: 'border-rose-200',
      sampleUser: 'senada | 150bisa',
    },
    {
      role: 'qa',
      title: 'Quality Assurance (QA)',
      description: 'Sampling tiket pelayanan, penilaian AI, penanganan sanggahan, dan manajemen indikator.',
      color: 'bg-teal-50 hover:bg-teal-100 text-teal-900',
      borderColor: 'border-teal-200',
      sampleUser: '230284 | kualitas99',
    },
    {
      role: 'team_leader',
      title: 'Team Leader',
      description: 'Monitoring kinerja tim pelayanan, verifikasi umpan balik dan pendampingan petugas.',
      color: 'bg-amber-50 hover:bg-amber-100 text-amber-900',
      borderColor: 'border-amber-200',
      sampleUser: '230294 | kualitas99',
    },
    {
      role: 'petugas',
      title: 'Petugas Pelayanan',
      description: 'Inbox hasil sampling jawaban tiket, persetujuan evaluasi, dan pengajuan sanggahan.',
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-900',
      borderColor: 'border-blue-200',
      sampleUser: '230283 | kualitas99',
    },
    {
      role: 'pusat',
      title: 'Pimpinan Pusat',
      description: 'Pemantauan tren mutu nasional, kalibrasi pengawasan mutu, dan analitik agregat.',
      color: 'bg-purple-50 hover:bg-purple-100 text-purple-900',
      borderColor: 'border-purple-200',
      sampleUser: 'pimpinan | 150bisa',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Portal Akses Pengguna SENADA</h2>
              <p className="text-xs text-teal-200">
                Pilih peran akses atau masuk dengan kredensial NIP/Username
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Access Role Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Akses Cepat Berdasarkan Hak Akses (5 Role)
              </h3>
              <span className="text-xs text-slate-400">Klik untuk langsung login</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roleCards.map((rc) => {
                const isCurrent = currentUser.role === rc.role;
                return (
                  <button
                    key={rc.role}
                    type="button"
                    onClick={() => handlePresetSelect(rc.role)}
                    className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      rc.color
                    } ${rc.borderColor} ${isCurrent ? 'ring-2 ring-teal-600' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{rc.title}</span>
                        {isCurrent && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-100/80 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Sedang Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                        {rc.description}
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200/60">
                      User: {rc.sampleUser}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 uppercase">
              Atau Masuk Manual
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Form Login Manual */}
          <form onSubmit={handleCustomLogin} className="space-y-3">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username / Email / NIP
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="senada"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="150bisa"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Info: Masukkan username <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">senada</code> dan password <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">150bisa</code>.
              </span>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                Masuk ke Sistem
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
