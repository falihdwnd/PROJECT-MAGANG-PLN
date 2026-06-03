"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useContractStore, CONTRACT_CATEGORY_LABELS } from "@/lib/store-new";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContractCategory } from "@/lib/types-new";
import { CategoryBarCharts } from "@/components/laporan/category-bar-charts";
import { exportLaporanPDF } from "@/lib/export-pdf";



function formatCurrency(value: number): string {
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)} M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)} jt`;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function LaporanPage() {
  const router = useRouter();
  const { contracts, invoices, getDashboardSummary } = useContractStore();
  const summary = useMemo(() => getDashboardSummary(), [getDashboardSummary]);



  const categoryStats = useMemo(() => {
    const categories: ContractCategory[] = ["investasi", "pemeliharaan", "administrasi"];

    return categories.map((cat) => {
      const catContracts = contracts.filter((c) => c.kategori === cat);
      const catInvoices = invoices.filter((inv) => {
        const contract = contracts.find((c) => c.id === inv.contractId);
        return contract?.kategori === cat;
      });

      const totalNilai = catContracts.reduce((sum, c) => sum + c.nilaiKontrak, 0);
      const totalDibayar = catContracts.reduce((sum, c) => sum + c.totalTagihanDibayar, 0);
      const totalTagihan = catInvoices.length;
      const tagihanDibayar = catInvoices.filter((i) => i.status === "dibayar").length;
      const tagihanPending = 0; // Removed pending status
      return {
        kategori: cat,
        label: CONTRACT_CATEGORY_LABELS[cat],
        totalKontrak: catContracts.length,
        kontrakAktif: catContracts.filter((c) => c.status === "aktif").length,
        totalNilai,
        totalDibayar,
        sisaAnggaran: totalNilai - totalDibayar,
        persentaseRealisasi: totalNilai > 0 ? (totalDibayar / totalNilai) * 100 : 0,
        totalTagihan,
        tagihanDibayar,
        tagihanPending,
      };
    });
  }, [contracts, invoices]);

  const overallStats = useMemo(() => ({
    totalKontrak: contracts.length,
    kontrakAktif: contracts.filter((c) => c.status === "aktif").length,
    totalNilai: contracts.reduce((sum, c) => sum + c.nilaiKontrak, 0),
    totalDibayar: summary.totalDibayar,
    sisaAnggaran: summary.totalSisaAnggaran,
    persentaseRealisasi: summary.persentaseRealisasiGlobal,
    totalTagihan: invoices.length,
    tagihanDibayar: summary.tagihanDibayar,
    tagihanPending: 0, // Removed pending status
  }), [contracts, invoices, summary]);

  const handleExport = () => {
    // Generate CSV content
    const headers = ["Kategori", "Total Kontrak", "Kontrak Aktif", "Pagu", "Serapan", "Sisa Anggaran", "% Serapan", "Total Tagihan", "Tagihan Dibayar", "Tagihan Pending"];
    const rows = categoryStats.map((cat) => [
      cat.label,
      cat.totalKontrak,
      cat.kontrakAktif,
      cat.totalNilai,
      cat.totalDibayar,
      cat.sisaAnggaran,
      cat.persentaseRealisasi.toFixed(2),
      cat.totalTagihan,
      cat.tagihanDibayar,
      cat.tagihanPending,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    exportLaporanPDF({
      contractStats: categoryStats,
      overallContractStats: overallStats,
      contracts: contracts.map(c => ({
        noPerjanjian: c.noPerjanjian || "-",
        judulPekerjaan: c.judulPekerjaan || c.judulPerjanjian || c.namaPekerjaan || "-",
        vendor: c.vendor || c.namaVendor || "-",
        nilaiKontrak: c.nilaiKontrak || 0,
        totalTagihanDibayar: c.totalTagihanDibayar || 0,
        kategori: c.kategori,
        status: c.status
      }))
    });
  };

  return (
    <div className="space-y-12 pb-12">
      {/* SECTION 1: KONTRAK */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan Kontrak</h1>
            <p className="text-sm text-gray-600">
              Ringkasan data kontrak dan tagihan proyek
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>

        {/* Overall Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white"
        >
          <h2 className="text-lg font-semibold mb-4 !text-white">Ringkasan Kontrak</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="!text-blue-100 text-sm">Total Kontrak</p>
              <p className="text-2xl font-bold !text-white">{overallStats.totalKontrak}</p>
              <p className="!text-blue-100 text-xs">{overallStats.kontrakAktif} aktif</p>
            </div>
            <div>
              <p className="!text-blue-100 text-sm">Pagu Total</p>
              <p className="text-2xl font-bold !text-white">{formatCurrency(overallStats.totalNilai)}</p>
            </div>
            <div>
              <p className="!text-blue-100 text-sm">Realisasi Total</p>
              <p className="text-2xl font-bold !text-white">{formatCurrency(overallStats.totalDibayar)}</p>
              <p className="!text-blue-100 text-xs">{overallStats.persentaseRealisasi.toFixed(1)}% serapan</p>
            </div>
            <div>
              <p className="!text-blue-100 text-sm">Total Tagihan</p>
              <p className="text-2xl font-bold !text-white">{overallStats.totalTagihan}</p>
              <p className="!text-blue-100 text-xs">{overallStats.tagihanPending} pending</p>
            </div>
          </div>
        </motion.div>

        {/* Bar Charts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <CategoryBarCharts 
            contractData={categoryStats}
          />
        </motion.div>

        {/* Category Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {categoryStats.map((cat, index) => (
            <motion.div
              key={cat.kategori}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-4 h-4 rounded-full ${cat.kategori === "investasi" ? "bg-purple-500" :
                  cat.kategori === "pemeliharaan" ? "bg-orange-500" : "bg-cyan-500"
                  }`} />
                <h3 className="text-lg font-semibold text-gray-900">
                  {cat.label}
                </h3>
              </div>

              <div className="space-y-4">
                {/* Kontrak */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-700">Kontrak</span>
                    <span className="text-lg font-bold text-gray-900">{cat.totalKontrak}</span>
                  </div>
                  <p className="text-xs text-gray-600">{cat.kontrakAktif} aktif</p>
                </div>

                {/* Nilai & Realisasi */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Pagu</span>
                    <span className="font-medium text-gray-900">{formatCurrency(cat.totalNilai)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Realisasi</span>
                    <span className="font-medium text-green-600">{formatCurrency(cat.totalDibayar)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Sisa</span>
                    <span className="font-medium text-blue-600">{formatCurrency(cat.sisaAnggaran)}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Realisasi</span>
                    <span className={`font-medium ${cat.persentaseRealisasi > 90 ? "text-red-600" :
                      cat.persentaseRealisasi > 70 ? "text-yellow-600" : "text-green-600"
                      }`}>
                      {cat.persentaseRealisasi.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(cat.persentaseRealisasi, 100)}%` }}
                      transition={{ duration: 1, delay: index * 0.2 }}
                      className={`h-full rounded-full ${cat.persentaseRealisasi > 90 ? "bg-red-500" :
                        cat.persentaseRealisasi > 70 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                    />
                  </div>
                </div>

                {/* Tagihan */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Tagihan</span>
                    <span className="font-medium text-gray-900">{cat.totalTagihan}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-green-700">{cat.tagihanDibayar} dibayar</span>
                    <span className="text-yellow-700">{cat.tagihanPending} pending</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Detailed Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Detail Kontrak per Kategori</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50">
                <tr className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  <th className="px-4 py-3 text-center">Kategori</th>
                  <th className="px-4 py-3 text-center">Kontrak</th>
                  <th className="px-4 py-3 text-center">Aktif</th>
                  <th className="px-4 py-3 text-center">Pagu</th>
                  <th className="px-4 py-3 text-center">Realisasi</th>
                  <th className="px-4 py-3 text-center">Sisa</th>
                  <th className="px-4 py-3 text-center">PERSENTASE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {categoryStats.map((cat) => (
                  <tr key={cat.kategori} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cat.kategori === "investasi" ? "bg-purple-500" :
                          cat.kategori === "pemeliharaan" ? "bg-orange-500" : "bg-cyan-500"
                          }`} />
                        {cat.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{cat.totalKontrak}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{cat.kontrakAktif}</td>
                    <td className="px-4 py-3 text-center font-medium text-gray-900 whitespace-nowrap">{formatCurrency(cat.totalNilai)}</td>
                    <td className="px-4 py-3 text-center text-green-600 whitespace-nowrap">{formatCurrency(cat.totalDibayar)}</td>
                    <td className="px-4 py-3 text-center text-blue-600 whitespace-nowrap">{formatCurrency(cat.sisaAnggaran)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${cat.persentaseRealisasi >= 100 ? "bg-blue-200 text-blue-900" :
                        cat.persentaseRealisasi >= 50 ? "bg-emerald-200 text-emerald-900" :
                          "bg-amber-200 text-amber-900"
                        }`}>
                        {cat.persentaseRealisasi.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr className="font-semibold text-sm">
                  <td className="px-4 py-3 text-gray-900">Total</td>
                  <td className="px-4 py-3 text-center text-gray-900">{overallStats.totalKontrak}</td>
                  <td className="px-4 py-3 text-center text-gray-900">{overallStats.kontrakAktif}</td>
                  <td className="px-4 py-3 text-center text-gray-900 whitespace-nowrap">{formatCurrency(overallStats.totalNilai)}</td>
                  <td className="px-4 py-3 text-center text-green-600 whitespace-nowrap">{formatCurrency(overallStats.totalDibayar)}</td>
                  <td className="px-4 py-3 text-center text-blue-600 whitespace-nowrap">{formatCurrency(overallStats.sisaAnggaran)}</td>
                  <td className="px-4 py-3 text-center text-gray-900">{overallStats.persentaseRealisasi.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
