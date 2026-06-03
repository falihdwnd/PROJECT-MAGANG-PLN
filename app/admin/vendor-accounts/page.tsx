"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth-new";

interface VendorAccount {
  id: string;
  authUserId?: string;
  email: string;
  vendorName: string;
  vendorCompany: string;
  contractCount?: number;
  isActive: boolean;
  activatedAt: string | null;
  activeUntil: string;
  createdAt: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function VendorAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<VendorAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/vendor-accounts");
      if (res.ok) {
        const { data } = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error("Error fetching vendor accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async (accountId: string) => {
    try {
      const res = await fetch("/api/vendor-accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: accountId, action: "deactivate" }),
      });

      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === accountId ? { ...a, isActive: false } : a
          )
        );
        setSuccessMessage("Akun vendor berhasil dinonaktifkan");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error deactivating account:", error);
      setErrorMessage("Gagal menonaktifkan akun vendor");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleDelete = async (accountId: string, vendorName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun vendor "${vendorName}" secara permanen? Ini akan menghapus akses login vendor tersebut.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vendors?id=${accountId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId));
        setSuccessMessage("Akun vendor berhasil dihapus permanen");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus vendor");
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);
      setErrorMessage(error.message || "Gagal menghapus akun vendor");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const isExpired = (activeUntil: string) => new Date(activeUntil) < new Date();

  if (!user || user.role !== "admin") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-500 mb-6">Halaman ini hanya untuk Admin.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Akun Vendor</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola status akun vendor dan masa aktif kontrak</p>
        </div>
        <Link href="/admin/approvals" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          ← Kembali ke Approvals
        </Link>
      </div>

      {/* Messages */}
      {successMessage && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-700 font-medium">{successMessage}</p>
        </motion.div>
      )}
      {errorMessage && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
        </motion.div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Informasi Akun Vendor</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Akun vendor dibuat otomatis saat kontrak baru ditambahkan (jika email vendor diisi)</li>
          <li>• Vendor mengaktifkan akun melalui link email (tanpa approve admin)</li>
          <li>• Akun otomatis non-aktif setelah tanggal berakhir kontrak</li>
          <li>• Jika kontrak diperpanjang, masa aktif akun juga diperpanjang</li>
        </ul>
      </div>

      {/* Account List */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Memuat data...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Belum ada akun vendor yang terdaftar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email / Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah Kontrak</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Berlaku Sampai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{account.vendorName}</p>
                    <p className="text-xs text-gray-500">{account.vendorCompany}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{account.email}</p>
                    {account.authUserId && (
                      <p className="text-xs text-gray-500">Auth ID: {account.authUserId}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{account.contractCount ?? 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    {isExpired(account.activeUntil) ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Expired</span>
                    ) : account.isActive ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Aktif</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Belum Aktif</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className={`text-sm ${isExpired(account.activeUntil) ? "text-red-600" : "text-gray-900"}`}>
                      {formatDate(account.activeUntil)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {isExpired(account.activeUntil) ? (
                        <span className="text-xs text-gray-400 my-auto">Kontrak berakhir</span>
                      ) : account.isActive ? (
                        <button
                          onClick={() => handleDeactivate(account.id)}
                          className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors"
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500 my-auto">Menunggu aktivasi</span>
                      )}
                      <button
                        onClick={() => handleDelete(account.id, account.vendorName)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                      >
                        Hapus Akun
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
