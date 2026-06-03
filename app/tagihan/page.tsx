"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useContractStore, INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS, invoiceStatusOptions } from "@/lib/store-new";
import { useAuth } from "@/lib/auth-new";
import AlertPopup from "@/components/ui/alert-popup";
import type { InvoiceStatus, Invoice } from "@/lib/types-new";

function formatCurrency(value: number): string {
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)} M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)} jt`;
  if (value >= 1000) return `Rp ${value.toLocaleString("id-ID")}`;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function daysAgo(date: string): number {
  const now = new Date();
  const target = new Date(date);
  return Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper function dihapus karena tidak ada aksi ubah status manual

export default function TagihanPage() {
  const { user } = useAuth();
  const { contracts, invoices, updateInvoiceStatus } = useContractStore();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"terbaru" | "tertinggi" | "terendah">("terbaru");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get unique years from invoices
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    invoices.forEach((inv) => {
      const year = new Date(inv.tanggalDiajukan).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [invoices]);

  // Check if any filter is active
  const isFilterActive = search !== "" || status !== "all" || filterYear !== "all" || filterMonth !== "all";

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter((inv) => {
      const contract = contracts.find((c) => c.id === inv.contractId) ||
        contracts.find((c) => c.noPerjanjian === inv.noPerjanjian);
      const searchLower = search.toLowerCase();
      const matchSearch =
        inv.nomorTagihan.toLowerCase().includes(searchLower) ||
        (contract?.judulPekerjaan?.toLowerCase() || "").includes(searchLower) ||
        (contract?.vendor?.toLowerCase() || "").includes(searchLower) ||
        (inv.noPerjanjian?.toLowerCase() || "").includes(searchLower);
      const matchStatus = status === "all" || inv.status === status;

      // Filter by year
      let matchYear = true;
      if (filterYear !== "all") {
        const invYear = new Date(inv.tanggalDiajukan).getFullYear();
        matchYear = invYear === parseInt(filterYear);
      }

      // Filter by month
      let matchMonth = true;
      if (filterMonth !== "all") {
        const invMonth = new Date(inv.tanggalDiajukan).getMonth() + 1;
        matchMonth = invMonth === parseInt(filterMonth);
      }

      return matchSearch && matchStatus && matchYear && matchMonth;
    });

    // Sort based on selected option
    if (sortBy === "terbaru") {
      filtered.sort((a, b) => new Date(b.tanggalDiajukan).getTime() - new Date(a.tanggalDiajukan).getTime());
    } else if (sortBy === "tertinggi") {
      filtered.sort((a, b) => b.nilaiTagihan - a.nilaiTagihan);
    } else if (sortBy === "terendah") {
      filtered.sort((a, b) => a.nilaiTagihan - b.nilaiTagihan);
    }

    return filtered;
  }, [invoices, contracts, search, status, sortBy, filterMonth, filterYear]);

  const getContractInfo = (invoice: { contractId: string, noPerjanjian: string }) => {
    return contracts.find((c) => c.id === invoice.contractId) ||
      contracts.find((c) => c.noPerjanjian === invoice.noPerjanjian);
  };



  const statusStats = useMemo(() => {
    return {
      dibayar: invoices.filter((i) => i.status === "dibayar").length,
      ditolak: invoices.filter((i) => i.status === "ditolak").length,
    };
  }, [invoices]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Tagihan</h1>
          <p className="text-sm text-gray-600">
            {filteredInvoices.length} tagihan ditemukan
          </p>
        </div>
      </div>

      {/* Alerts */}
      <AlertPopup
        message={successMessage}
        type="success"
        onClose={() => setSuccessMessage(null)}
      />
      <AlertPopup
        message={errorMessage}
        type="error"
        onClose={() => setErrorMessage(null)}
      />

      {/* Status Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-100 rounded-xl p-4 border border-emerald-300">
          <p className="text-sm text-emerald-800 font-medium">Dibayar</p>
          <p className="text-2xl font-bold text-emerald-950 mt-1">{statusStats.dibayar}</p>
        </div>
        <div className="bg-red-100 rounded-xl p-4 border border-red-300">
          <p className="text-sm text-red-800 font-medium">Ditolak</p>
          <p className="text-2xl font-bold text-red-950 mt-1">{statusStats.ditolak}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isFilterActive ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-800 mb-1">Pencarian</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor tagihan, kontrak, atau vendor..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus | "all")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {invoiceStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Urutkan</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "terbaru" | "tertinggi" | "terendah")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="terbaru">Terbaru</option>
              <option value="tertinggi">Nilai Tertinggi</option>
              <option value="terendah">Nilai Terendah</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Tahun</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Bulan</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Semua Bulan</option>
              <option value="1">Januari</option>
              <option value="2">Februari</option>
              <option value="3">Maret</option>
              <option value="4">April</option>
              <option value="5">Mei</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">Agustus</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
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
                    setFilterYear("all");
                    setFilterMonth("all");
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

      {/* Invoice List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Desktop Table - Hidden on Mobile */}
        <div className="hidden lg:block">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50">
              <tr className="text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                <th className="px-4 py-3 w-[22%]">No Tagihan</th>
                <th className="px-4 py-3 w-[20%]">Kontrak</th>
                <th className="px-4 py-3 w-[14%]">Vendor</th>
                <th className="px-4 py-3 w-[10%]">Nilai</th>
                <th className="px-4 py-3 w-[10%]">Tanggal</th>
                <th className="px-4 py-3 w-[9%]">Status</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Tidak ada tagihan yang ditemukan
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice, index) => {
                  const contract = getContractInfo(invoice);
                  const age = daysAgo(invoice.tanggalDiajukan);
                  return (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-gray-900 text-sm truncate block" title={invoice.nomorTagihan}>
                          {invoice.nomorTagihan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-700 text-sm truncate block" title={(contract?.judulPekerjaan || contract?.judulPerjanjian) || invoice.noPerjanjian || "-"}>
                          {(contract?.judulPekerjaan || contract?.judulPerjanjian)
                            ? ((contract.judulPekerjaan || contract.judulPerjanjian || "").length > 25
                              ? (contract.judulPekerjaan || contract.judulPerjanjian || "").substring(0, 25) + "..."
                              : (contract.judulPekerjaan || contract.judulPerjanjian))
                            : (invoice.noPerjanjian || "-")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-600 text-sm truncate block" title={(contract?.vendor || contract?.namaVendor) || "-"}>
                          {(contract?.vendor || contract?.namaVendor)
                            ? ((contract.vendor || contract.namaVendor || "").length > 12
                              ? (contract.vendor || contract.namaVendor || "").substring(0, 12) + "..."
                              : (contract.vendor || contract.namaVendor))
                            : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                          {formatCurrency(invoice.nilaiTagihan)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-600 text-xs whitespace-nowrap">
                          {new Date(invoice.tanggalDiajukan).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${INVOICE_STATUS_COLORS[invoice.status]}`}>
                          {INVOICE_STATUS_LABELS[invoice.status]}
                        </span>
                      </td>

                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-gray-200">
          {filteredInvoices.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              Tidak ada tagihan yang ditemukan
            </div>
          ) : (
            filteredInvoices.map((invoice, index) => {
              const contract = getContractInfo(invoice);
              const age = daysAgo(invoice.tanggalDiajukan);
              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {invoice.nomorTagihan}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {contract?.judulPekerjaan || invoice.noPerjanjian || "-"}
                      </p>
                    </div>
                    <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${INVOICE_STATUS_COLORS[invoice.status]}`}>
                      {INVOICE_STATUS_LABELS[invoice.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(invoice.nilaiTagihan)}
                    </span>
                    <span>{contract?.vendor || "-"}</span>
                    <span>{new Date(invoice.tanggalDiajukan).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}</span>
                  </div>


                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
