import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import * as XLSX from "xlsx";
import {
  Users,
  UserPlus,
  UserCheck,
  Edit2,
  Trash2,
  Search,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Lock,
  Mail,
  Building2,
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser, resetUsersToDefault, clearAllData, bulkUsersCreate, handleBulkCreate } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Delete Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    username: string;
    role: UserRole;
    email: string;
    division: string;
    nip: string;
    password: string;
    team: string;
  }>({
    name: '',
    username: '',
    role: 'petugas',
    email: '',
    division: 'Unit Layanan Informasi',
    nip: '',
    password: '',
    team: 'TIM 1',
  });

  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const roleOptions: { role: UserRole; label: string; badgeColor: string }[] = [
    { role: 'admin', label: 'Administrator Sistem', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
    { role: 'pusat', label: 'Pimpinan Pusat', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { role: 'qa', label: 'Quality Assurance', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
    { role: 'team_leader', label: 'Team Leader', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    { role: 'petugas', label: 'Petugas Pelayanan', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  ];

  const teamOptions = ['TIM 1', 'TIM 2', 'TIM 3', 'TIM 4', 'TIM 5', 'TIM 6'];

  const getRoleBadge = (role: UserRole) => {
    return roleOptions.find((r) => r.role === role) || {
      label: role,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (teamFilter !== 'all') {
        if (teamFilter === 'none' && u.team) return false;
        if (teamFilter !== 'none' && u.team !== teamFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.nip || '').toLowerCase().includes(q) ||
          (u.division || '').toLowerCase().includes(q) ||
          (u.team || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [users, roleFilter, teamFilter, searchQuery]);

  // Pagination calculation
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = pageSize === -1 ? 0 : (validCurrentPage - 1) * pageSize;
  const endIndex = pageSize === -1 ? filteredUsers.length : Math.min(startIndex + pageSize, filteredUsers.length);
  const paginatedUsers = pageSize === -1 ? filteredUsers : filteredUsers.slice(startIndex, endIndex);

  const handleResetToInitialUsers = () => {
    if (window.confirm('Muat ulang seluruh 92 pengguna dari data file sampling? Data pengguna default akan dipulihkan.')) {
      resetUsersToDefault();
      setCurrentPage(1);
      setSuccessToast(`Berhasil memulihkan & menyinkronkan seluruh 92 pengguna dari file sampling.`);
      setTimeout(() => setSuccessToast(null), 4500);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      role: 'petugas',
      email: '',
      division: 'Unit Layanan Informasi',
      nip: '',
      password: '',
      team: 'TIM 1',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      role: user.role,
      email: user.email || `${user.username}@bpjskesehatan.go.id`,
      division: user.division || 'Unit Layanan Informasi',
      nip: user.nip || '',
      password: user.password || '',
      team: user.team || 'TIM 1',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    if (user.id === currentUser.id) {
      alert('Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini.');
      return;
    }
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    deleteUser(userToDelete.id);
    setSuccessToast(`User ${userToDelete.name} berhasil dihapus.`);
    setUserToDelete(null);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const mapRole = (roleStr: string): UserRole => {
    if (!roleStr) return "petugas";
    const lower = roleStr.toLowerCase();
    if (lower.includes("admin")) return "admin";
    if (lower.includes("pimpinan") || lower.includes("pusat")) return "pusat";
    if (lower.includes("qa") || lower.includes("quality")) return "qa";
    if (lower.includes("team") || lower.includes("tl") || lower.includes("leader")) return "team_leader";
    return "petugas";
  };

  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileToUpload(file);
  };

  const handleBulkSubmit = () => {
    if (!fileToUpload) return;
    setUploadStatus("Memproses file...");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
        const usersToCreate: Omit<User, "id">[] = jsonData.map((row: any) => ({
          name: String(row["Nama"] || row["nama"] || "").trim(),
          nip: String(row["NPP"] || row["npp"] || row["NIP"] || row["nip"] || "").trim(),
          username: String(row["User"] || row["user"] || row["username"] || "").trim().toLowerCase(),
          password: String(row["Password"] || row["password"] || "123456").trim(),
          role: mapRole(String(row["Hak Akses"] || row["hak akses"] || row["role"] || "")),
          team: row["TIM"] || row["tim"] || row["Team"] || undefined,
          email: `${String(row["User"] || row["user"] || "user").trim().toLowerCase()}@bpjskesehatan.go.id`,
          division: "Unit Layanan Informasi",
        })).filter(u => u.name && u.username);

        if (usersToCreate.length === 0) {
          setUploadStatus("File tidak berisi data pengguna yang valid.");
          return;
        }

        bulkUsersCreate(usersToCreate);
        setUploadStatus(`Berhasil mengimpor ${usersToCreate.length} pengguna.`);
        setTimeout(() => {
          setUploadStatus(null);
          setIsModalOpen(false);
          setFileToUpload(null);
        }, 2500);
      } catch (err) {
        setUploadStatus("Gagal memproses file. Pastikan format kolom sesuai.");
      }
    };
    reader.readAsBinaryString(fileToUpload);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.username.trim() || !formData.nip.trim()) {
      setFormError('Nama, NPP/NPPT (NIP), dan username wajib diisi.');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setFormError('Password wajib diisi untuk pengguna baru.');
      return;
    }

    // Check duplicate username if adding or changing
    const duplicate = users.find(
      (u) =>
        u.username.toLowerCase() === formData.username.trim().toLowerCase() &&
        u.id !== editingUser?.id
    );

    if (duplicate) {
      setFormError('Username tersebut sudah digunakan oleh user lain.');
      return;
    }

    const emailGenerated = formData.email.trim() || `${formData.username.trim().toLowerCase()}@bpjskesehatan.go.id`;
    const includeTeam = formData.role === 'petugas' || formData.role === 'team_leader';

    if (editingUser) {
      updateUser(editingUser.id, {
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        role: formData.role,
        email: emailGenerated.toLowerCase(),
        division: formData.division.trim(),
        nip: formData.nip.trim(),
        password: formData.password ? formData.password.trim() : editingUser.password,
        team: includeTeam ? formData.team : undefined,
      });
      setSuccessToast(`Data & hak akses user ${formData.name} berhasil diperbarui.`);
    } else {
      addUser({
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        role: formData.role,
        email: emailGenerated.toLowerCase(),
        division: formData.division.trim() || 'Unit Layanan Informasi',
        nip: formData.nip.trim(),
        password: formData.password.trim(),
        team: includeTeam ? formData.team : undefined,
      });
      setSuccessToast(`User baru ${formData.name} berhasil ditambahkan dengan hak akses ${formData.role.toUpperCase()}.`);
    }

    setIsModalOpen(false);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs my-6">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Akses Terbatas</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Menu Manajemen User hanya dapat diakses oleh pengguna dengan Hak Akses Admin Sistem.
        </p>
      </div>
    );
  }

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
            <span className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
              <Users className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  Manajemen Pengguna & Hak Akses
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  Total {users.length} Pengguna
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Data pengguna sampling BPJS Kesehatan lengkap dengan NPP, Tim, dan Hak Akses Sistem
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleBulkCreate}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 shadow-2xs flex items-center gap-1.5 transition"
              title="Tambahkan 90 pengguna dari file terlampir"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Import 90 Pengguna</span>
            </button>

            <button
              onClick={handleResetToInitialUsers}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 shadow-2xs flex items-center gap-1.5 transition"
              title="Sinkronkan atau pulihkan seluruh pengguna dari data master"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-700" />
              <span>Reset Pengguna</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin menghapus SEMUA data termasuk tiket, evaluasi, kalibrasi, dan pengguna? Tindakan ini tidak dapat dibatalkan.')) {
                  clearAllData();
                  setSuccessToast('Semua data berhasil dihapus.');
                  setTimeout(() => setSuccessToast(null), 4000);
                }
              }}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 shadow-2xs flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua Data</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition"
            >
              <UserPlus className="w-4 h-4" />
              Tambah Pengguna Baru
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama, NPP/NIP, username, tim..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Filter Role */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="all">Semua Hak Akses ({users.length})</option>
              {roleOptions.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label} ({users.filter((u) => u.role === r.role).length})
                </option>
              ))}
            </select>

            {/* Filter Tim */}
            <select
              value={teamFilter}
              onChange={(e) => {
                setTeamFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="all">Semua Tim ({users.length})</option>
              {teamOptions.map((t) => (
                <option key={t} value={t}>
                  {t} ({users.filter((u) => u.team === t).length})
                </option>
              ))}
              <option value="none">
                Tanpa Tim (-) ({users.filter((u) => !u.team).length})
              </option>
            </select>
          </div>

          <div className="text-xs text-slate-500">
            Menampilkan <strong className="text-slate-800">{filteredUsers.length}</strong> pengguna dari total <strong className="text-teal-700">{users.length}</strong>
          </div>
        </div>
      </div>

      {/* Role Counts Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {roleOptions.map((ro) => {
          const count = users.filter((u) => u.role === ro.role).length;
          return (
            <div
              key={ro.role}
              onClick={() => {
                setRoleFilter(roleFilter === ro.role ? 'all' : ro.role);
                setCurrentPage(1);
              }}
              className={`p-3 rounded-xl border bg-white cursor-pointer transition hover:shadow-xs ${
                roleFilter === ro.role ? 'ring-2 ring-teal-600 border-teal-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ro.badgeColor}`}>
                  {ro.role.toUpperCase()}
                </span>
                <span className="text-sm font-extrabold text-slate-900">{count}</span>
              </div>
              <div className="text-xs font-semibold text-slate-700 mt-2 truncate">
                {ro.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No.</th>
                <th className="py-3 px-4">Nama & NPP/NPPT</th>
                <th className="py-3 px-4">Username & Email</th>
                <th className="py-3 px-4">Hak Akses / Role</th>
                <th className="py-3 px-4">Tim</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada data pengguna yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, idx) => {
                  const roleBadge = getRoleBadge(user.role);
                  const isCurrent = user.id === currentUser.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-semibold">
                        {startIndex + idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-1.5 py-0.2 rounded">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            NPP/NPPT: {user.nip || '-'}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-slate-800">{user.username}</div>
                        <div className="text-slate-500 text-[11px]">{user.email || '-'}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${roleBadge.badgeColor}`}>
                          {roleBadge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {user.team ? (
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {user.team}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold text-xs">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1 transition"
                            title="Edit Data & Hak Akses"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            Edit
                          </button>
                          <button
                            disabled={isCurrent}
                            onClick={() => handleDeleteClick(user)}
                            className={`p-1.5 rounded-lg border transition ${
                              isCurrent
                                ? 'opacity-30 border-slate-200 text-slate-300 cursor-not-allowed'
                                : 'border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                            }`}
                            title={isCurrent ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-600">
            <span>
              Menampilkan <strong className="text-slate-900">{filteredUsers.length === 0 ? 0 : startIndex + 1}</strong> - <strong className="text-slate-900">{endIndex}</strong> dari <strong className="text-slate-900">{filteredUsers.length}</strong> pengguna (Total <strong className="text-teal-700">{users.length}</strong> terdaftar)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="text-[11px]">Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={-1}>Semua ({filteredUsers.length})</option>
              </select>
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= validCurrentPage - 1 && pageNum <= validCurrentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-bold transition ${
                          pageNum === validCurrentPage
                            ? 'bg-teal-700 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === validCurrentPage - 2 || pageNum === validCurrentPage + 2) {
                    return (
                      <span key={pageNum} className="text-slate-400 px-1 select-none">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden p-6 text-xs space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Pengguna</h3>
                <p className="text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-slate-700">
              Apakah Anda yakin ingin menghapus pengguna <strong className="text-slate-900">{userToDelete.name}</strong> ({userToDelete.username} - {userToDelete.role.toUpperCase()}) dari sistem?
            </p>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs transition"
              >
                Ya, Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Pengguna */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold">
                  {editingUser ? `Edit Data & Hak Akses Pengguna` : `Tambah Pengguna Sistem Baru`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              {/* Nama */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama : *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="misal: Siti Aminah, S.Kom."
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* NPP/NPPT */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  NPP/NPPT : *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="misal: 199605202020121008"
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* User (Username) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  user : *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="misal: sitiaminah"
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  password : {editingUser ? '(Kosongkan jika tidak diubah)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? '•••••••• (Tetap sama jika kosong)' : 'Masukkan kata sandi'}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-mono focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Hak Akses */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hak askes : *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="petugas">Petugas Pelayanan</option>
                  <option value="team_leader">Team Leader</option>
                  <option value="qa">Quality Assurance (QA)</option>
                  <option value="pusat">Pusat / Pimpinan</option>
                  <option value="admin">Administrator Sistem</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hak akses menentukan menu navigasi dan kewenangan di dalam aplikasi.
                </p>
              </div>

              {/* TIM (Hanya tersedia untuk petugas dan team leader) */}
              {(formData.role === 'petugas' || formData.role === 'team_leader') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    TIM : *
                  </label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                  >
                    {teamOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pilihan tim penugasan layanan (TIM 1 s.d. TIM 6).
                  </p>
                </div>
              )}



              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold shadow-xs flex items-center gap-2 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingUser ? 'Simpan Perubahan' : 'Tambahkan Pengguna'}
                </button>
              </div>
            </form>

            {!editingUser && (
              <div className="border-t border-slate-200 p-6 bg-slate-50 rounded-b-2xl space-y-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Atau Upload Massal (Excel/CSV):
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium text-xs"
                />
                {uploadStatus && (
                  <p className="text-xs font-medium text-teal-700">{uploadStatus}</p>
                )}
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={!fileToUpload}
                  className="w-full px-5 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs transition"
                >
                  Proses Upload
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
