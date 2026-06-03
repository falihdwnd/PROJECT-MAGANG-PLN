"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useContractStore, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, JENIS_ANGGARAN_LABELS, JENIS_ANGGARAN_COLORS, contractStatusOptions } from "@/lib/store-new";
import { useAuth } from "@/lib/auth-new";
import { exportContractsToExcel } from "@/lib/export-excel";
import type { ContractCategory, ContractStatus } from "@/lib/types-new";

function formatCurrency(value: number): string {
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)} M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)} jt`;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

// Tab configuration
const TABS: { id: ContractCategory; label: string; icon: React.ReactNode; color: string }[] = [
  {
    id: "investasi",
    label: "Investasi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: "bg-blue-500",
  },
  {
    id: "pemeliharaan",
    label: "Pemeliharaan",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "bg-amber-500",
  },
  {
    id: "administrasi",
    label: "Administrasi",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: "bg-purple-500",
  },
];

export default function KontrakTabbedPage() {
  const { user } = useAuth();
  const { contracts } = useContractStore();
  const searchParams = useSearchParams();
  
  // Support both 'kategori' and 'tab' query parameters for back navigation
  const initialKategori = (searchParams.get("tab") || searchParams.get("kategori")) as ContractCategory | null;
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<ContractCategory>(initialKategori || "investasi");
  
  // Filter states
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContractStatus | "all">("all");
  const [isExporting, setIsExporting] = useState(false);

  // Handle Excel export
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportContractsToExcel(contracts);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Gagal mengekspor data ke Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // Check if any filter is active
  const isFilterActive = search !== "" || status !== "all";

  const contractList = useMemo(() => {
    if (user?.role !== "vendor") return contracts || [];
    return (contracts || []).filter((c) => {
      if (user.vendorAccountId) {
        return c.vendorAccountId === user.vendorAccountId;
      }
      return c.vendorEmail?.toLowerCase() === user.email.toLowerCase();
    });
  }, [contracts, user]);

  // Group contracts by category
  const contractsByCategory = useMemo(() => {
    return {
      investasi: contractList.filter((c) => c.kategori === "investasi"),
      pemeliharaan: contractList.filter((c) => c.kategori === "pemeliharaan"),
      administrasi: contractList.filter((c) => c.kategori === "administrasi"),
    };
  }, [contractList]);

  // Filter contracts for active tab
  const filteredContracts = useMemo(() => {
    const categoryContracts = contractsByCategory[activeTab] || [];
    
    return categoryContracts.filter((c) => {
      const judulPekerjaan = c.judulPekerjaan || c.judulPerjanjian || "";
      const vendor = c.vendor || c.namaVendor || "";
      const noPerjanjian = c.noPerjanjian || "";
      
      const matchSearch = judulPekerjaan.toLowerCase().includes(search.toLowerCase()) ||
        vendor.toLowerCase().includes(search.toLowerCase()) ||
        noPerjanjian.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "all" || c.status === status;
      return matchSearch && matchStatus;
    });
  }, [contractsByCategory, activeTab, search, status]);

  // Calculate summary for each category
  const categorySummary = useMemo(() => {
    return {
      investasi: {
        total: contractsByCategory.investasi.length,
        nilai: contractsByCategory.investasi.reduce((sum, c) => sum + (c.nilaiKontrak || c.nilaiPerjanjian || 0), 0),
        aktif: contractsByCategory.investasi.filter((c) => c.status === "aktif").length,
      },
      pemeliharaan: {
        total: contractsByCategory.pemeliharaan.length,
        nilai: contractsByCategory.pemeliharaan.reduce((sum, c) => sum + (c.nilaiKontrak || c.nilaiPerjanjian || 0), 0),
        aktif: contractsByCategory.pemeliharaan.filter((c) => c.status === "aktif").length,
      },
      administrasi: {
        total: contractsByCategory.administrasi.length,
        nilai: contractsByCategory.administrasi.reduce((sum, c) => sum + (c.nilaiKontrak || c.nilaiPerjanjian || 0), 0),
        aktif: contractsByCategory.administrasi.filter((c) => c.status === "aktif").length,
      },
    };
  }, [contractsByCategory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Kontrak</h1>
          <p className="text-sm text-gray-500">
            Total {contractList.length} kontrak
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={isExporting || contractList.length === 0 || user?.role === "vendor"}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Mengekspor...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </>
            )}
          </button>
          {user?.role === "admin" && (
            <Link
              href={`/kontrak/create?kategori=${activeTab}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Kontrak
            </Link>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-3 p-4 rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-blue-50 ring-2 ring-blue-500 shadow-sm"
                  : "bg-gray-100 hover:bg-gray-200 hover:shadow-sm"
              }`}
            >
              <div className={`p-2 rounded-lg ${tab.color} text-white`}>
                {tab.icon}
              </div>
              <div className="flex-1 text-left">
                <h3 className={`font-semibold ${
                  activeTab === tab.id 
                    ? "text-gray-900" 
                    : "text-gray-700"
                }`}>
                  {tab.label}
                </h3>
                <p className="text-xs text-gray-500">
                  {categorySummary[tab.id].total} kontrak • {categorySummary[tab.id].aktif} aktif
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total Nilai</p>
                <p className={`text-sm font-bold ${
                  activeTab === tab.id 
                    ? "text-gray-900" 
                    : "text-gray-700"
                }`}>
                  {formatCurrency(categorySummary[tab.id].nilai)}
                </p>
              </div>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 ring-2 ring-blue-500 rounded-lg pointer-events-none"
                  transition={{ type: "spring", bounce: 0, duration: 0}}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className={`grid grid-cols-1 gap-4 ${isFilterActive ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-800 mb-1">Pencarian</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul, vendor, atau nomor..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContractStatus | "all")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {contractStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Reset Filter Button */}
          <AnimatePresence>
            {isFilterActive && (
              <motion.div
                key="reset-button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex items-end"
              >
                <button
                  onClick={() => {
                    setSearch("");
                    setStatus("all");
                  }}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Contract List */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {filteredContracts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
            >
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600">Tidak ada kontrak {TABS.find(t => t.id === activeTab)?.label} yang ditemukan</p>
              {user?.role === "admin" && (
                <Link
                  href={`/kontrak/create?kategori=${activeTab}`}
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Kontrak {TABS.find(t => t.id === activeTab)?.label}
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {filteredContracts.map((contract, index) => (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${JENIS_ANGGARAN_COLORS[contract.jenisAnggaran]}`}>
                          {JENIS_ANGGARAN_LABELS[contract.jenisAnggaran]}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${CONTRACT_STATUS_COLORS[contract.status]}`}>
                          {CONTRACT_STATUS_LABELS[contract.status]}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {contract.judulPekerjaan || contract.judulPerjanjian || "-"}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">No Perjanjian:</span> {contract.noPerjanjian}
                        </p>
                        <p>
                          <span className="font-medium">Vendor:</span> {contract.vendor || contract.namaVendor || "-"}
                        </p>
                        <p>
                          <span className="font-medium">Tanggal:</span> {new Date(contract.tanggalPerjanjian).toLocaleDateString("id-ID")}
                        </p>
                        <p>
                          <span className="font-medium">Unit:</span> {contract.unit}
                        </p>
                        {activeTab === "investasi" && (
                          <>
                            <p>
                              <span className="font-medium">CR/Not CR:</span> {contract.crNotCR || "-"}
                            </p>
                            <p>
                              <span className="font-medium">No PRK:</span> {contract.noPRK || "-"}
                            </p>
                            <p>
                              <span className="font-medium">Jenis AI:</span> {contract.jenisAI || "-"}
                            </p>
                            <p>
                              <span className="font-medium">No SE:</span> {contract.noSE || "-"}
                            </p>
                            <p>
                              <span className="font-medium">No PO:</span> {contract.noPO || "-"}
                            </p>
                          </>
                        )}
                        {activeTab === "pemeliharaan" && (
                          <>
                            <p>
                              <span className="font-medium">Bidang:</span> {contract.bidang || "-"}
                            </p>
                            <p>
                              <span className="font-medium">MSB:</span> {contract.msb || "-"}
                            </p>
                            <p>
                              <span className="font-medium">Rutin/Non Rutin:</span> {contract.rutinNonRutin || "-"}
                            </p>
                            <p>
                              <span className="font-medium">Requested By:</span> {contract.requestedBy || "-"}
                            </p>
                            <p>
                              <span className="font-medium">Periode Accrue:</span> {(contract.periodeAccrueBulan && contract.periodeAccrueTahun) ? `${contract.periodeAccrueBulan}/${contract.periodeAccrueTahun}` : contract.periodeAccrueBulan || contract.periodeAccrueTahun || "-"}
                            </p>
                          </>
                        )}
                        {activeTab === "administrasi" && (
                          <>
                            <p>
                              <span className="font-medium">Bidang:</span> {contract.bidang || "-"}
                            </p>
                            <p>
                              <span className="font-medium">PIC:</span> {contract.pic || "-"}
                            </p>
                            <p>
                              <span className="font-medium">No. SE:</span> {contract.noSE || "-"}
                            </p>
                            <p>
                              <span className="font-medium">No. PO:</span> {contract.noPO || "-"}
                            </p>
                            <p>
                              <span className="font-medium">Beban Tahun:</span> {contract.bebanTahun || "-"}
                            </p>
                            <p>
                              <span className="font-medium">Rutin/Non Rutin:</span> {contract.rutinNonRutin || "-"}
                            </p>
                            <p>
                              <span className="font-medium">Status Bayar:</span>{" "}
                              <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
                                contract.statusBayar === "lunas" 
                                  ? "bg-green-100 text-green-700" 
                                  : contract.statusBayar === "sebagian_terbayar" 
                                  ? "bg-amber-100 text-amber-700" 
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {contract.statusBayar === "lunas" 
                                  ? "Lunas"
                                  : contract.statusBayar === "sebagian_terbayar"
                                  ? "Sebagian Terbayar"
                                  : "Belum Terbayar"}
                              </span>
                            </p>
                            <p>
                              <span className="font-medium">Terbayar Pusat:</span> {formatCurrency(contract.terbayarPusat || 0)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Content */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Nilai Kontrak</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(contract.nilaiKontrak || contract.nilaiPerjanjian || 0)}
                        </p>
                      </div>
                      
                      <div className="w-48 space-y-2">
                        {/* Serapan Anggaran */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Serapan</span>
                            <span className={`font-medium ${
                              contract.persentaseRealisasi > 90 ? "text-red-600" :
                              contract.persentaseRealisasi > 50 ? "text-yellow-600" : "text-green-600"
                            }`}>
                              {contract.persentaseRealisasi.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                contract.persentaseRealisasi > 90 ? "bg-red-500" :
                                contract.persentaseRealisasi > 50 ? "bg-yellow-500" : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(contract.persentaseRealisasi, 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Progres Pekerjaan */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Progress</span>
                            <span className={`font-medium ${
                              contract.progressPekerjaan >= 90 ? "text-blue-600" :
                              contract.progressPekerjaan >= 50 ? "text-teal-600" : "text-green-600"
                            }`}>
                              {contract.progressPekerjaan.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                contract.progressPekerjaan >= 90 ? "bg-blue-500" :
                                contract.progressPekerjaan >= 50 ? "bg-teal-500" : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(contract.progressPekerjaan, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/kontrak/${contract.id}?kategori=${activeTab}`}
                        className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        Detail
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
