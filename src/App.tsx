/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { SamplingView } from './components/SamplingView';
import { PetugasInboxView } from './components/PetugasInboxView';
import { QaRebuttalInboxView } from './components/QaRebuttalInboxView';
import { HistorySanggahanView } from './components/HistorySanggahanView';
import { IndicatorManagerView } from './components/IndicatorManagerView';
import { GoogleSheetSyncView } from './components/GoogleSheetSyncView';
import { CalibrationView } from './components/CalibrationView';
import { UserManagementView } from './components/UserManagementView';
import { UserRole } from './types';

function MainContent() {
  const { activeTab, setActiveTab, currentUser } = useApp();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Guard: if current tab is not allowed for current role, default to dashboard
  React.useEffect(() => {
    const roleAllowedTabs: Record<UserRole, string[]> = {
      admin: ['dashboard', 'kalibrasi', 'users-management'],
      pusat: ['dashboard', 'kalibrasi'],
      team_leader: ['dashboard', 'inbox-petugas', 'history'],
      petugas: ['dashboard', 'inbox-petugas', 'history'],
      qa: ['dashboard', 'sampling', 'inbox-sanggah-qa', 'history', 'kalibrasi', 'indicators', 'google-sheet'],
    };

    if (!roleAllowedTabs[currentUser.role]?.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser.role, activeTab, setActiveTab]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-900">
      {/* Top Header */}
      <Header onOpenLoginModal={() => setIsLoginModalOpen(true)} />

      {/* Main View Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'sampling' && <SamplingView />}
        {activeTab === 'inbox-petugas' && <PetugasInboxView />}
        {activeTab === 'inbox-sanggah-qa' && <QaRebuttalInboxView />}
        {activeTab === 'history' && <HistorySanggahanView />}
        {activeTab === 'kalibrasi' && <CalibrationView />}
        {activeTab === 'indicators' && <IndicatorManagerView />}
        {activeTab === 'google-sheet' && <GoogleSheetSyncView />}
        {activeTab === 'users-management' && <UserManagementView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">SENADA BPJS Kesehatan</span>
            <span>·</span>
            <span>Sistem Sampling Mutu Jawaban Petugas & Penanganan Pengaduan</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Hak Cipta © 2025 Biro Penjaminan Mutu & Kepesertaan. Terintegrasi AI Gemini 3.8 Flash & Google Sheets.
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
