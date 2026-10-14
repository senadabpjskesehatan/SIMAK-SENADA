import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  UserCheck,
  Bell,
  Inbox,
  Scale,
  Sliders,
  FileSpreadsheet,
  BarChart3,
  History,
  LogOut,
  ChevronDown,
  Layers,
  Sparkles,
  GitCompare,
  Users,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react';
import { UserRole } from '../types';
import { ChangePasswordModal } from './ChangePasswordModal';

interface HeaderProps {
  onOpenLoginModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenLoginModal }) => {
  const {
    currentUser,
    switchRole,
    users,
    activeTab,
    setActiveTab,
    pendingPetugasCount,
    pendingQaRebuttalCount,
  } = useApp();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin Sistem', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'pusat':
        return { label: 'Pimpinan Pusat', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'qa':
        return { label: 'Quality Assurance', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'team_leader':
        return { label: 'Team Leader', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'petugas':
        return { label: 'Petugas Pelayanan', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      default:
        return { label: role, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Mutu',
      icon: BarChart3,
      roles: ['admin', 'pusat', 'qa', 'team_leader', 'petugas'],
    },
    {
      id: 'sampling',
      label: 'Sampling & Penilaian AI',
      icon: Scale,
      roles: ['qa'], // Dihapus dari admin
      badge: null,
    },
    {
      id: 'inbox-petugas',
      label: 'Inbox Hasil Sampling',
      icon: Inbox,
      roles: ['petugas', 'team_leader'], // Dihapus dari admin
      badge: pendingPetugasCount > 0 ? pendingPetugasCount : null,
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      id: 'inbox-sanggah-qa',
      label: 'Inbox Sanggah QA',
      icon: Bell,
      roles: ['qa'], // Dihapus dari admin, pusat, dan team leader
      badge: pendingQaRebuttalCount > 0 ? pendingQaRebuttalCount : null,
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      id: 'history',
      label: 'History & Nilai Akhir',
      icon: History,
      roles: ['qa', 'team_leader', 'petugas'], // Dihapus dari admin dan pusat
    },
    {
      id: 'kalibrasi',
      label: 'Kalibrasi Mutu',
      icon: GitCompare,
      roles: ['admin', 'pusat', 'qa'],
    },
    {
      id: 'indicators',
      label: 'Indikator & Bobot',
      icon: Sliders,
      roles: ['qa'], // Dihapus dari admin dan pusat
    },
    {
      id: 'google-sheet',
      label: 'Sinkron Excel & Google Sheet',
      icon: FileSpreadsheet,
      roles: ['qa'], // Hanya QA
    },
    {
      id: 'users-management',
      label: 'Manajemen User',
      icon: Users,
      roles: ['admin'], // Hanya Admin
    },
  ];

  const visibleNavs = navItems.filter((item) => item.roles.includes(currentUser.role));
  const badgeInfo = getRoleBadge(currentUser.role);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-200">SENADA BPJS Kesehatan</span>
          <span className="text-slate-500">·</span>
          <span>Sistem Penjaminan Mutu Jawaban Petugas Berbasis AI & Regulasi SOP</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-slate-400">Ganti Akun Role Cepat:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => switchRole('admin')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                currentUser.role === 'admin'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Admin
            </button>

            <button
              onClick={() => switchRole('qa')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                currentUser.role === 'qa'
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              QA Mutu
            </button>
            <button
              onClick={() => switchRole('pusat')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                currentUser.role === 'pusat'
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Pusat
            </button>
            <button
              onClick={() => switchRole('team_leader')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                currentUser.role === 'team_leader'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Team Leader
            </button>
            <button
              onClick={() => switchRole('petugas')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                currentUser.role === 'petugas'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Petugas
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-sm ring-2 ring-teal-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  SENADA
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                  v2.5 Mutu
                </span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-0.5">
                Sampling Jawaban & Penilaian Mutu Teks
              </p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all text-left"
                title="Menu Akun Pengguna"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <span>Hak Akses:</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${badgeInfo.color}`}>
                      {badgeInfo.label}
                    </span>
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180 text-teal-600' : ''}`} />
              </button>

              {/* Backdrop to close dropdown on click outside */}
              {roleDropdownOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setRoleDropdownOpen(false)}
                />
              )}

              {/* Dropdown Menu: Hanya Ganti Password dan Logout */}
              {roleDropdownOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                >
                  {/* Info Ringkas User */}
                  <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                    <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email || currentUser.username}</p>
                    <div className="mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${badgeInfo.color}`}>
                        {badgeInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Pilihan 1: Ganti Password */}
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        setIsChangePasswordOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:text-teal-800 hover:bg-teal-50 rounded-lg flex items-center gap-2.5 transition font-medium"
                    >
                      <KeyRound className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800">Ganti Password</div>
                        <div className="text-[10px] text-slate-400">Perbarui kata sandi akun</div>
                      </div>
                    </button>

                    {/* Pilihan 2: Logout */}
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        onOpenLoginModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg flex items-center gap-2.5 transition font-medium mt-0.5"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-rose-700">Logout</div>
                        <div className="text-[10px] text-rose-400">Keluar dari sesi saat ini</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-slate-100 py-2">
          {visibleNavs.map((nav) => {
            const Icon = nav.icon;
            const isActive = activeTab === nav.id;
            return (
              <button
                key={nav.id}
                onClick={() => setActiveTab(nav.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{nav.label}</span>
                {nav.badge !== null && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-teal-800' : nav.badgeColor || 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {nav.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Modal Ganti Password */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </header>
  );
};
