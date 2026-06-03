"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useContractStore, CONTRACT_CATEGORY_LABELS, CONTRACT_CATEGORY_COLORS, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, JENIS_ANGGARAN_LABELS, JENIS_ANGGARAN_COLORS, INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from "@/lib/store-new";
import { useAuth } from "@/lib/auth-new";
import AlertPopup from "@/components/ui/alert-popup";
import ContractHistoryList from "@/components/kontrak/contract-history-list";
import type { Contract } from "@/lib/types-new";


function formatCurrency(value: number | undefined | null): string {
  if (!value || value === 0) return "Rp 0";
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)} M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)} jt`;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function KontrakDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getContractById, getInvoicesByContract, updateContract, getContractHistory } = useContractStore();

  const contractId = params.id as string;
  const contract = useMemo(() => getContractById(contractId), [contractId, getContractById]);
  const invoices = useMemo(() => getInvoicesByContract(contractId), [contractId, getInvoicesByContract]);
  const contractHistory = useMemo(() => getContractHistory(contractId), [contractId, getContractHistory]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeleteContract = async () => {
    if (!contract || !confirm(`Apakah Anda yakin ingin menghapus kontrak "${contract.judulPekerjaan || contract.judulPerjanjian}" secara permanen? Semua tagihan dan pengajuan terkait juga akan terhapus.`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/contracts?id=${contract.id}&kategori=${contract.kategori}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete contract');
      }

      setSuccessMessage("Kontrak berhasil dihapus. Mengalihkan...");
      setTimeout(() => {
        router.push(`/kontrak?tab=${contract.kategori}`);
      }, 1500);
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      setErrorMessage(error.message || 'Gagal menghapus kontrak');
      setIsDeleting(false);
    }
  };

  if (!contract) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Kontrak Tidak Ditemukan</h2>
          <p className="text-gray-600 mb-6">Kontrak dengan ID "{contractId}" tidak ditemukan dalam sistem.</p>
          <Link
            href="/kontrak"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Daftar Kontrak
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/kontrak?tab=${contract.kategori}`} className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">Detail Kontrak</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {contract.judulPekerjaan || contract.judulPerjanjian || "-"}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${JENIS_ANGGARAN_COLORS[contract.jenisAnggaran]}`}>
              {contract.jenisAnggaran}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${CONTRACT_CATEGORY_COLORS[contract.kategori]}`}>
              {CONTRACT_CATEGORY_LABELS[contract.kategori]}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${CONTRACT_STATUS_COLORS[contract.status]}`}>
              {CONTRACT_STATUS_LABELS[contract.status]}
            </span>
          </div>
        </div>

        {user?.role === "admin" && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteContract}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 border-red-600 text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menghapus...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus Kontrak
                </>
              )}
            </button>
          </div>
        )}
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

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Kontrak</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">No Perjanjian</p>
              <p className="text-sm font-medium text-gray-900">{contract.noPerjanjian}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Vendor</p>
              <p className="text-sm font-medium text-gray-900">{contract.vendor || contract.namaVendor || "-"}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Tanggal Perjanjian</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(contract.tanggalPerjanjian)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Tanggal Berakhir</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(contract.tanggalBerakhir)}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Uraian Kegiatan</p>
              <p className="text-sm font-medium text-gray-900">{contract.uraianKegiatan}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Jenis Anggaran</p>
              <p className="text-sm font-medium text-gray-900">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${JENIS_ANGGARAN_COLORS[contract.jenisAnggaran]}`}>
                  {JENIS_ANGGARAN_LABELS[contract.jenisAnggaran]}
                </span>
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Unit</p>
              <p className="text-sm font-medium text-gray-900">{contract.unit}</p>
            </div>



          </div>

          {/* Detail Pekerjaan & Administrasi - Investasi Specific */}
          {contract.kategori === "investasi" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Detail Pekerjaan & Administrasi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <p className="text-xs text-gray-500 mb-1">Judul PRK</p>
                  <p className="text-sm font-medium text-gray-900">{contract.judulPRK || "-"}</p>
                </div>
                <div className="md:col-span-3">
                  <p className="text-xs text-gray-500 mb-1">Nama Pekerjaan</p>
                  <p className="text-sm font-medium text-gray-900">{contract.namaPekerjaan || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. PRK</p>
                  <p className="text-sm font-medium text-gray-900">{contract.noPRK || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Jenis AI</p>
                  <p className="text-sm font-medium text-gray-900">{contract.jenisAI || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">CR / Not CR</p>
                  <p className="text-sm font-medium text-gray-900">{contract.crNotCR || "-"}</p>
                </div>

                {/* Auto Generated IDs */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. WBS / Pos Anggaran</p>
                  <p className="text-sm font-medium text-blue-600 font-mono">{contract.noWBSPosAnggaran || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. SKKI</p>
                  <p className="text-sm font-medium text-blue-600 font-mono">{contract.noSKKI || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. SE</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{contract.noSE || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. PO</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{contract.noPO || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Submission ID (VIP)</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{contract.submissionIdVIP || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status VIP</p>
                  <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-md border-2 ${
                    contract.statusVIP === "lunas" 
                      ? "bg-white text-green-700 border-green-600" 
                      : contract.statusVIP === "dokumen_tidak_lengkap" 
                      ? "bg-white text-red-700 border-red-600" 
                      : "bg-white text-amber-700 border-amber-600"
                    }`}>
                    {contract.statusVIP === "lunas" ? "✓ Lunas" :
                      contract.statusVIP === "dokumen_tidak_lengkap" ? "✗ Dokumen Tidak Lengkap" :
                        "○ Belum Lunas"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Legacy Information (Only show if NOT investment or if fields are populated) */}
          {contract.kategori === "pemeliharaan" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Detail Pekerjaan Pemeliharaan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <p className="text-xs text-gray-500 mb-1">Judul Perjanjian</p>
                  <p className="text-sm font-medium text-gray-900">{contract.judulPerjanjian || "-"}</p>
                </div>
                <div className="md:col-span-3">
                  <p className="text-xs text-gray-500 mb-1">Nama Pekerjaan</p>
                  <p className="text-sm font-medium text-gray-900">{contract.namaPekerjaan || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">MSB</p>
                  <p className="text-sm font-medium text-gray-900">{contract.msb || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bidang</p>
                  <p className="text-sm font-medium text-gray-900">{contract.bidang || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Rutin / Non Rutin</p>
                  <p className="text-sm font-medium text-gray-900">{contract.rutinNonRutin || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Periode Accrue</p>
                  <p className="text-sm font-medium text-gray-900">{contract.periodeAccrue || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Requested By</p>
                  <p className="text-sm font-medium text-gray-900">{contract.requestedBy || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status Terbayar</p>
                  <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-md border-2 ${
                    contract.statusTerbayar === "lunas" || contract.statusTerbayar === "Lunas" 
                      ? "bg-white text-green-700 border-green-600" 
                      : contract.statusTerbayar === "sebagian_terbayar" 
                      ? "bg-white text-amber-700 border-amber-600" 
                      : "bg-white text-red-700 border-red-600"
                  }`}>
                    {contract.statusTerbayar === "lunas" || contract.statusTerbayar === "Lunas" 
                      ? "✓ Lunas"
                      : contract.statusTerbayar === "sebagian_terbayar"
                      ? "◐ Sebagian Terbayar"
                      : "○ Belum Terbayar"}
                  </span>
                </div>
              </div>

              {/* Nomor-Nomor Administrasi */}
              <h4 className="text-xs font-semibold text-gray-700 mt-4 mb-3">Nomor Administrasi</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. WBS / Pos Anggaran</p>
                  <p className="text-sm font-medium text-blue-600 font-mono">{contract.noWBSPosAnggaran || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. SKKI / SKKO</p>
                  <p className="text-sm font-medium text-blue-600 font-mono">{contract.noSKKISKKO || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. SE</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{contract.noSE || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. PO</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{contract.noPO || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Submission ID (VIP)</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{contract.submissionIdVIP || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status VIP</p>
                  <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-md border-2 ${
                    contract.statusVIP === "lunas" 
                      ? "bg-white text-green-700 border-green-600" 
                      : contract.statusVIP === "dokumen_tidak_lengkap" 
                      ? "bg-white text-red-700 border-red-600" 
                      : "bg-white text-amber-700 border-amber-600"
                  }`}>
                    {contract.statusVIP === "lunas" ? "✓ Lunas" :
                      contract.statusVIP === "dokumen_tidak_lengkap" ? "✗ Dokumen Tidak Lengkap" :
                      "○ Belum Lunas"}
                  </span>
                </div>
              </div>

              {/* Berita Acara & Tanggal */}
              <h4 className="text-xs font-semibold text-gray-700 mt-4 mb-3">Berita Acara & Tanggal</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. Berita Acara</p>
                  <p className="text-sm font-medium text-gray-900">{contract.noBeritaAcara || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tanggal Berita Acara</p>
                  <p className="text-sm font-medium text-gray-900">{contract.tanggalBeritaAcara ? formatDate(contract.tanggalBeritaAcara) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tanggal Request SE</p>
                  <p className="text-sm font-medium text-gray-900">{contract.tanggalRequestSE ? formatDate(contract.tanggalRequestSE) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tanggal SE Rilis</p>
                  <p className="text-sm font-medium text-gray-900">{contract.tanggalSERilis ? formatDate(contract.tanggalSERilis) : "-"}</p>
                </div>
              </div>

              {/* Nilai Tagihan */}
              <h4 className="text-xs font-semibold text-gray-700 mt-4 mb-3">Nilai Tagihan & Pembayaran</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nilai Tagihan STI Pusat</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(contract.nilaiTagihanSTIPusat)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nilai Tagihan Unit Induk</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(contract.nilaiTagihanUnitInduk)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Tagihan</p>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency((contract.nilaiTagihanSTIPusat || 0) + (contract.nilaiTagihanUnitInduk || 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Terbayar STI Pusat</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(contract.terbayarSTIPusat)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Terbayar Unit</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(contract.terbayarUnit)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Terbayar</p>
                  <p className="text-sm font-bold text-green-700">{formatCurrency((contract.terbayarSTIPusat || 0) + (contract.terbayarUnit || 0))}</p>
                </div>
              </div>

              {/* Keterangan */}
              {contract.keterangan && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-1">Keterangan</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{contract.keterangan}</p>
                </div>
              )}
            </div>
          )}

          {/* Administrasi specific fields */}
          {contract.kategori === "administrasi" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Detail Pekerjaan Administrasi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <p className="text-xs text-gray-500 mb-1">Judul Perjanjian</p>
                  <p className="text-sm font-medium text-gray-900">{contract.judulPerjanjian || "-"}</p>
                </div>
                <div className="md:col-span-3">
                  <p className="text-xs text-gray-500 mb-1">Nama Pekerjaan</p>
                  <p className="text-sm font-medium text-gray-900">{contract.namaPekerjaan || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bidang</p>
                  <p className="text-sm font-medium text-gray-900">{contract.bidang || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">PIC</p>
                  <p className="text-sm font-medium text-gray-900">{contract.pic || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Rutin / Non Rutin</p>
                  <p className="text-sm font-medium text-gray-900">{contract.rutinNonRutin || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Beban Tahun</p>
                  <p className="text-sm font-medium text-gray-900">{contract.bebanTahun || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Entry By</p>
                  <p className="text-sm font-medium text-gray-900">{contract.entryBy || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status Bayar</p>
                  <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-md border-2 ${
                    contract.statusBayar === "lunas" 
                      ? "bg-white text-green-700 border-green-600" 
                      : contract.statusBayar === "sebagian_terbayar" 
                      ? "bg-white text-amber-700 border-amber-600" 
                      : "bg-white text-red-700 border-red-600"
                  }`}>
                    {contract.statusBayar === "lunas" 
                      ? "✓ Lunas"
                      : contract.statusBayar === "sebagian_terbayar"
                      ? "◐ Sebagian Terbayar"
                      : "○ Belum Terbayar"}
                  </span>
                </div>
              </div>

              {/* Nomor-Nomor Administrasi */}
              <h4 className="text-xs font-semibold text-gray-700 mt-4 mb-3">Nomor Administrasi</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. WBS / Pos Anggaran</p>
                  <p className="text-sm font-medium text-blue-600 font-mono">{contract.noWBSPosAnggaran || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. SKKI / SKKO</p>
                  <p className="text-sm font-medium text-blue-600 font-mono">{contract.noSKKISKKO || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. SE</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{contract.noSE || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. PO</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{contract.noPO || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Submission ID</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{contract.submissionId || "-"}</p>
                </div>
              </div>

              {/* Berita Acara & Tanggal */}
              <h4 className="text-xs font-semibold text-gray-700 mt-4 mb-3">Berita Acara & Tanggal</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">No. Berita Acara</p>
                  <p className="text-sm font-medium text-gray-900">{contract.noBeritaAcara || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tanggal Berita Acara</p>
                  <p className="text-sm font-medium text-gray-900">{contract.tanggalBeritaAcara ? formatDate(contract.tanggalBeritaAcara) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tanggal Request</p>
                  <p className="text-sm font-medium text-gray-900">{contract.tanggalRequest ? formatDate(contract.tanggalRequest) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tanggal SE Release</p>
                  <p className="text-sm font-medium text-gray-900">{contract.tanggalSERelease ? formatDate(contract.tanggalSERelease) : "-"}</p>
                </div>
              </div>

              {/* Nilai Tagihan */}
              <h4 className="text-xs font-semibold text-gray-700 mt-4 mb-3">Nilai Tagihan & Pembayaran</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nilai Tagihan Keseluruhan</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(contract.nilaiTagihanKeseluruhan)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nilai Tagihan Kantor Pusat</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(contract.nilaiTagihanKantorPusat)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nilai Tagihan Unit Selain Pusat</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(contract.nilaiTagihanUnitSelainPusat)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Terbayar Pusat</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(contract.terbayarPusat)}</p>
                </div>
              </div>

              {/* Keterangan */}
              {(contract.keterangan || contract.keteranganKonfirmasi) && (
                <div className="mt-4 space-y-3">
                  {contract.keterangan && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Keterangan</p>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{contract.keterangan}</p>
                    </div>
                  )}
                  {contract.keteranganKonfirmasi && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Keterangan/Konfirmasi</p>
                      <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded-lg">{contract.keteranganKonfirmasi}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metadata Section - Only for investasi */}
          {contract.kategori === "investasi" && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Informasi Tambahan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Entry By</p>
                  <p className="text-sm font-medium text-gray-900">{contract.entryBy || "-"}</p>
                </div>

                {contract.oldFlag && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Old Flag</p>
                    <p className="text-sm font-medium text-gray-900">{contract.oldFlag}</p>
                  </div>
                )}
                {contract.keterangan && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <p className="text-xs text-gray-500 mb-1">Keterangan</p>
                    <p className="text-sm text-gray-900">{contract.keterangan}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Financial Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Keuangan</h2>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Nilai Kontrak</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(contract.nilaiKontrak || contract.nilaiPerjanjian)}</p>
            </div>

            <div className="h-px bg-gray-200" />

            {/* Serapan Anggaran */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600" title="Persentase penggunaan anggaran: Hijau (≤50%), Kuning (50-90%), Merah (>90%)">Serapan Anggaran</span>
                <span className={`font-semibold ${(contract.persentaseRealisasi || 0) > 90 ? "text-red-600" :
                  (contract.persentaseRealisasi || 0) > 50 ? "text-yellow-600" : "text-green-600"
                  }`}>
                  {(contract.persentaseRealisasi || 0).toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(contract.persentaseRealisasi || 0, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full rounded-full ${(contract.persentaseRealisasi || 0) > 90 ? "bg-red-500" :
                    (contract.persentaseRealisasi || 0) > 50 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                />
              </div>
            </div>

            {/* Progres Pekerjaan */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600" title="Persentase penyelesaian fisik pekerjaan">Progres Pekerjaan</span>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${(contract.progressPekerjaan || 0) >= 90 ? "text-blue-600" :
                    (contract.progressPekerjaan || 0) >= 50 ? "text-teal-600" : "text-green-600"
                    }`}>
                    {(contract.progressPekerjaan || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(contract.progressPekerjaan || 0, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={`h-full rounded-full ${(contract.progressPekerjaan || 0) >= 90 ? "bg-blue-500" :
                    (contract.progressPekerjaan || 0) >= 50 ? "bg-teal-500" : "bg-green-500"
                    }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 mb-1">Serapan</p>
                <p className="text-sm font-bold text-green-700">{formatCurrency(contract.totalTagihanDibayar || contract.terbayar)}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Sisa Anggaran</p>
                <p className="text-sm font-bold text-blue-700">{formatCurrency(contract.sisaAnggaran || 0)}</p>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* Detail Tagihan */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tagihan Kontrak Pusat</span>
                <span className="font-medium text-gray-900">{formatCurrency(contract.nilaiTagihanKontrakPusat || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tagihan Unit Induk</span>
                <span className="font-medium text-gray-900">{formatCurrency(contract.nilaiTagihanUnitInduk || 0)}</span>
              </div>
              {contract.nilaiBeritaAcara && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Nilai Berita Acara</span>
                  <span className="font-medium text-gray-900">{formatCurrency(contract.nilaiBeritaAcara)}</span>
                </div>
              )}
              {contract.batasPaguTerbayar && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Batas Pagu Terbayar</span>
                  <span className="font-medium text-gray-900">{formatCurrency(contract.batasPaguTerbayar)}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Invoices / Tagihan */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Tagihan</h2>
          <span className="text-sm text-gray-500">{invoices.length} tagihan</span>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-500">Belum ada tagihan untuk kontrak ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500">No Tagihan</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-gray-500">Tanggal</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-gray-500">Nilai</th>
                  <th className="text-center py-3 px-2 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <p className="text-sm font-medium text-gray-900">{invoice.nomorTagihan}</p>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-600">
                      {formatDate(invoice.tanggalTagihan)}
                    </td>
                    <td className="py-3 px-2 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(invoice.nilaiTagihan)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${INVOICE_STATUS_COLORS[invoice.status]}`}>
                        {INVOICE_STATUS_LABELS[invoice.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Contract History - shown only if there are previous versions */}
      {contractHistory.length > 0 && (
        <div className="lg:col-span-1">
          <ContractHistoryList history={contractHistory} currentContract={contract} />
        </div>
      )}


    </div>
  );
}
