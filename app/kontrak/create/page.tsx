"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useContractStore, CONTRACT_CATEGORY_LABELS } from "@/lib/store-new";
import { useAuth } from "@/lib/auth-new";
import type { ContractCategory, JenisAnggaran, CRStatus } from "@/lib/types-new";

// Helper function to generate auto IDs
function generateNoPerjanjian(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `03${randomNum}Pj/STH.01.01/F0107${randomNum}00/${year}`;
}

function generateNoWBSPosAnggaran(): string {
  const randomNum = Math.floor(Math.random() * 900) + 100;
  return `I.1001.23.21.0805.${String(randomNum).padStart(3, "0")}`;
}

function generateNoSKKI(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${randomNum}/KEU.00.03/EVP MUM/${year}`;
}

function generateNoSE(): string {
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `100369${randomNum}`;
}

function generateNoPO(): string {
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `310148${randomNum}`;
}

function generateSubmissionIdVIP(): string {
  const year = new Date().getFullYear();
  const randomNum1 = Math.floor(Math.random() * 9000) + 1000;
  const randomNum2 = Math.floor(Math.random() * 90000) + 10000;
  return `TRE-V/${randomNum1}/${year}/00000${randomNum2}`;
}

function generateNoPRK(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 900) + 100;
  return `${year}.KPST.21.${String(randomNum).padStart(3, "0")}`;
}

function generateNoBeritaAcaraPemeliharaan(): string {
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${randomNum}/JKO/2024/012`;
}

// Helper function to format currency to readable text
function formatCurrencyText(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '';

  if (num >= 1000000000000) {
    const triliun = num / 1000000000000;
    return `Rp ${triliun.toLocaleString('id-ID', { maximumFractionDigits: 2 })} triliun`;
  } else if (num >= 1000000000) {
    const miliar = num / 1000000000;
    return `Rp ${miliar.toLocaleString('id-ID', { maximumFractionDigits: 2 })} miliar`;
  } else if (num >= 1000000) {
    const juta = num / 1000000;
    return `Rp ${juta.toLocaleString('id-ID', { maximumFractionDigits: 2 })} jt`;
  } else if (num >= 1000) {
    const ribu = num / 1000;
    return `Rp ${ribu.toLocaleString('id-ID', { maximumFractionDigits: 2 })} rb`;
  }
  return `Rp ${num.toLocaleString('id-ID')}`;
}

export default function CreateContractPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createContract } = useContractStore();

  // Form data untuk kategori investasi
  const [formData, setFormData] = useState({
    // Field yang perlu diinput manual untuk Investasi
    kategori: "investasi" as ContractCategory,
    tanggalPerjanjian: "",
    tanggalBerakhir: "",
    judulPRK: "",
    nilaiPerjanjian: "",
    namaVendor: "", vendorEmail: "",
    nilaiTagihan: "",
    namaPekerjaan: "",
    jenisAI: "AI" as JenisAnggaran,
    crNotCR: "Not CR" as CRStatus,
    unit: "",
    keterangan: "",

    // Field untuk kategori lain (pemeliharaan & administrasi)
    uraianKegiatan: "",
    noPerjanjian: "",
    judulPekerjaan: "",
    nilaiKontrak: "",
    vendor: "",
    picName: "",
    unitSektorK: "",
    unitTerbayar: "",
    noSKWE: "",
    posAngg: "",
    noSKUSKKO: "",
    noSE: "",
    noPO: "",
    submissionId: "",
    jenisPekerjaan: "",
    bebanTahun: new Date().getFullYear().toString(),
    konfirmasiNonRutin: "Rutin",
    bidang: "",
    requestTanggalSERelasi: "",
    noXPS: "",
    tanggalXPS: "",
    noBeritaAcara: "",
    tanggalBeritaAcara: "",
    noBeritaAcaraSKRelasi: "",
    tanggalArsip: "",

    // Field khusus Pemeliharaan
    judulPerjanjian: "",
    nilaiTagihanPusat: "",
    nilaiTagihanUnitInduk: "",
    noWBSPosAnggaran: "",
    noSKKI: "",
    tanggalRequestSE: "",
    tanggalSERilis: "",
    statusVIP: "belum_lunas",
    periodeAccrueBulan: "",
    periodeAccrueTahun: new Date().getFullYear().toString(),
    requestedBy: "",
    msb: "",
    terbayarPusat: "",
    terbayarUnit: "",
    statusTerbayar: "Belum Terbayar",
    rutinNonRutin: "Rutin",

    // Field khusus Administrasi
    nilaiTagihanKeseluruhan: "",
    nilaiTagihanKhususPusat: "",
    nilaiTagihanUnitSelainPusat: "",
    statusBayar: "Belum Dibayar",
    entryBy: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user changes input
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (formData.kategori === "investasi") {
        // Validation for Investasi category
        if (!formData.tanggalPerjanjian || !formData.tanggalBerakhir || !formData.judulPRK ||
          !formData.nilaiPerjanjian || !formData.namaVendor || !formData.nilaiTagihan ||
          !formData.namaPekerjaan || !formData.vendorEmail) {
          setErrorMessage("Mohon lengkapi field yang wajib diisi (ditandai dengan *), termasuk Email Vendor");
          window.scrollTo({ top: 0, behavior: "smooth" });
          setIsSubmitting(false);
          return;
        }

        // Auto-generate fields for Investasi
        const noPerjanjian = generateNoPerjanjian();
        const noWBSPosAnggaran = generateNoWBSPosAnggaran();
        const noSKKI = generateNoSKKI();
        const noSE = generateNoSE();
        const noPO = generateNoPO();
        const submissionIdVIP = generateSubmissionIdVIP();
        const noPRK = generateNoPRK();
        const nilaiPerjanjian = parseFloat(formData.nilaiPerjanjian);
        const nilaiTagihan = parseFloat(formData.nilaiTagihan);

        // Create contract object for Investasi
        const newContract = {
          no: 0, // Will be auto-assigned by store

          // Investasi specific fields
          noPerjanjian,
          tanggalPerjanjian: formData.tanggalPerjanjian,
          tanggalBerakhir: formData.tanggalBerakhir,
          judulPRK: formData.judulPRK,
          nilaiPerjanjian,
          namaVendor: formData.namaVendor,
          vendorEmail: formData.vendorEmail,
          nilaiTagihan,
          noWBSPosAnggaran,
          noSKKI,
          noSE,
          noPO,
          submissionIdVIP,
          statusVIP: "belum_lunas" as const,
          terbayar: 0,
          namaPekerjaan: formData.namaPekerjaan,
          jenisAI: formData.jenisAI,
          noPRK,
          crNotCR: formData.crNotCR,

          // Mapped fields for backward compatibility
          uraianKegiatan: formData.judulPRK,
          judulPekerjaan: formData.namaPekerjaan,
          nilaiKontrak: nilaiPerjanjian,
          vendor: formData.namaVendor,
          nilaiTagihanKontrakPusat: nilaiTagihan,
          nilaiTagihanUnitInduk: 0,

          // Category & Unit
          kategori: "investasi" as ContractCategory,
          jenisAnggaran: "AI" as JenisAnggaran,
          unit: formData.unit || user?.unit || "",

          // Legacy field mappings
          posAngg: noWBSPosAnggaran,
          noSKUSKKO: noSKKI,
          submissionId: submissionIdVIP,

          entryBy: user?.username || "Admin",
          status: "aktif" as const,
          keterangan: formData.keterangan,
        };

        await createContract(newContract);
      } else if (formData.kategori === "pemeliharaan") {
        // Validation for Pemeliharaan category
        if (!formData.judulPerjanjian || !formData.namaVendor || !formData.nilaiPerjanjian || 
            !formData.tanggalPerjanjian || !formData.tanggalBerakhir || !formData.vendorEmail) {
          setErrorMessage("Mohon lengkapi field yang wajib diisi (ditandai dengan *), termasuk Email Vendor");
          window.scrollTo({ top: 0, behavior: "smooth" });
          setIsSubmitting(false);
          return;
        }

        // Auto-generate fields for Pemeliharaan
        const noPerjanjian = generateNoPerjanjian();
        const noBeritaAcara = generateNoBeritaAcaraPemeliharaan();
        const noWBSPosAnggaran = generateNoWBSPosAnggaran();
        const noSKKI = generateNoSKKI();
        const noSE = generateNoSE();
        const noPO = generateNoPO();
        const submissionIdVIP = generateSubmissionIdVIP();
        const nilaiPerjanjian = parseFloat(formData.nilaiPerjanjian);
        const nilaiTagihanPusat = parseFloat(formData.nilaiTagihanPusat || "0");
        const nilaiTagihanUnitInduk = parseFloat(formData.nilaiTagihanUnitInduk || "0");

        // Create contract object for Pemeliharaan
        const newContract = {
          no: 0,
          
          // Identitas Kontrak
          uraianKegiatan: formData.uraianKegiatan,
          noPerjanjian,
          tanggalPerjanjian: formData.tanggalPerjanjian,
          tanggalBerakhir: formData.tanggalBerakhir,
          judulPerjanjian: formData.judulPerjanjian,
          judulPekerjaan: formData.judulPerjanjian,
          nilaiPerjanjian,
          nilaiKontrak: nilaiPerjanjian,
          namaVendor: formData.namaVendor,
          vendor: formData.namaVendor,
          vendorEmail: formData.vendorEmail,

          // Tagihan
          nilaiTagihanKontrakPusat: nilaiTagihanPusat,
          nilaiTagihanUnitInduk,

          // Berita Acara
          noBeritaAcara,
          tanggalBeritaAcara: formData.tanggalBeritaAcara || undefined,

          // Administrasi
          noWBSPosAnggaran,
          posAngg: noWBSPosAnggaran,
          noSKKI,
          noSKUSKKO: noSKKI,
          tanggalRequestSE: formData.tanggalRequestSE || undefined,
          requestTanggalSERelasi: formData.tanggalSERilis || undefined,
          noSE,
          noPO,
          submissionIdVIP,
          submissionId: submissionIdVIP,

          // Detail Pekerjaan
          namaPekerjaan: formData.namaPekerjaan,
          msb: formData.msb,
          bidang: formData.bidang,
          statusVIP: formData.statusVIP as "lunas" | "belum_lunas" | "dokumen_tidak_lengkap",

          // Periode & Request
          periodeAccrueBulan: formData.periodeAccrueBulan,
          periodeAccrueTahun: formData.periodeAccrueTahun,
          requestedBy: formData.requestedBy,
          keterangan: formData.keterangan,

          // Pembayaran
          terbayarPusat: parseFloat(formData.terbayarPusat || "0"),
          terbayarUnit: parseFloat(formData.terbayarUnit || "0"),
          terbayar: parseFloat(formData.terbayarPusat || "0") + parseFloat(formData.terbayarUnit || "0"),
          statusTerbayar: formData.statusTerbayar,
          rutinNonRutin: formData.rutinNonRutin,

          // Category & Unit
          kategori: "pemeliharaan" as ContractCategory,
          jenisAnggaran: "AO" as JenisAnggaran,
          unit: formData.unit || user?.unit || "",

          // Required fields with defaults
          nilaiTagihan: nilaiTagihanPusat + nilaiTagihanUnitInduk,
          judulPRK: formData.judulPerjanjian,
          jenisAI: "AO" as JenisAnggaran,
          crNotCR: "Not CR" as CRStatus,

          entryBy: user?.username || "Admin",
          status: "aktif" as const,
        };

        await createContract(newContract);
      } else {
        // Validation for Administrasi category
        if (!formData.judulPerjanjian || !formData.namaVendor || 
            !formData.nilaiPerjanjian || !formData.tanggalPerjanjian || !formData.tanggalBerakhir || !formData.vendorEmail) {
          setErrorMessage("Mohon lengkapi field yang wajib diisi (ditandai dengan *), termasuk Email Vendor");
          window.scrollTo({ top: 0, behavior: "smooth" });
          setIsSubmitting(false);
          return;
        }

        const nilaiPerjanjian = parseFloat(formData.nilaiPerjanjian);
        const nilaiTagihanKeseluruhan = parseFloat(formData.nilaiTagihanKeseluruhan || "0");
        const nilaiTagihanKhususPusat = parseFloat(formData.nilaiTagihanKhususPusat || "0");
        const nilaiTagihanUnitSelainPusat = parseFloat(formData.nilaiTagihanUnitSelainPusat || "0");

        // Auto-generate values for Administrasi
        const noPerjanjian = generateNoPerjanjian();
        const noBeritaAcara = generateNoBeritaAcaraPemeliharaan();
        const noWBSPosAnggaran = generateNoWBSPosAnggaran();
        const noSKKI = generateNoSKKI();
        const noSE = generateNoSE();
        const noPO = generateNoPO();
        const submissionIdVIP = generateSubmissionIdVIP();

        // Create contract object for Administrasi
        const newContract = {
          no: 0,
          
          // Identitas Kontrak
          uraianKegiatan: formData.uraianKegiatan,
          noPerjanjian,
          tanggalPerjanjian: formData.tanggalPerjanjian,
          tanggalBerakhir: formData.tanggalBerakhir,
          judulPerjanjian: formData.judulPerjanjian,
          judulPekerjaan: formData.judulPerjanjian,
          nilaiPerjanjian,
          nilaiKontrak: nilaiPerjanjian,
          namaVendor: formData.namaVendor,
          vendor: formData.namaVendor,
          vendorEmail: formData.vendorEmail,

          // Tagihan
          nilaiTagihan: nilaiTagihanKeseluruhan,
          nilaiTagihanKontrakPusat: nilaiTagihanKhususPusat,
          nilaiTagihanUnitInduk: nilaiTagihanUnitSelainPusat,

          // Berita Acara
          noBeritaAcara,
          tanggalBeritaAcara: formData.tanggalBeritaAcara || undefined,

          // Administrasi
          posAngg: noWBSPosAnggaran,
          noWBSPosAnggaran,
          noSKUSKKO: noSKKI,
          noSKKI,
          tanggalRequestSE: formData.tanggalRequestSE || undefined,
          requestTanggalSERelasi: formData.tanggalSERilis || undefined,
          noSE,
          noPO,
          submissionId: submissionIdVIP,
          submissionIdVIP,

          // Detail Pekerjaan
          namaPekerjaan: formData.namaPekerjaan,
          bebanTahun: formData.bebanTahun,
          bidang: formData.bidang,
          picName: formData.picName,

          // Pembayaran
          terbayarPusat: parseFloat(formData.terbayarPusat || "0"),
          terbayar: parseFloat(formData.terbayarPusat || "0"),
          statusBayar: formData.statusBayar as "belum_terbayar" | "sebagian_terbayar" | "lunas",
          statusTerbayar: formData.statusBayar,
          rutinNonRutin: formData.rutinNonRutin,

          // Category & Unit
          kategori: "administrasi" as ContractCategory,
          jenisAnggaran: "AO" as JenisAnggaran,
          unit: formData.unit || user?.unit || "",

          // Required fields with defaults
          judulPRK: formData.judulPerjanjian,
          jenisAI: "AO" as JenisAnggaran,
          crNotCR: "Not CR" as CRStatus,
          statusVIP: "belum_lunas" as const,

          entryBy: formData.entryBy || user?.username || "Admin",
          status: "aktif" as const,
          keterangan: formData.keterangan,
        };

        await createContract(newContract);
      }

      // Show success notification before redirect
      setSuccessMessage(
        formData.vendorEmail
          ? `Kontrak berhasil disimpan! Email aktivasi akun telah dikirim ke ${formData.vendorEmail}. Vendor dapat mengaktifkan akun melalui link di email tersebut.`
          : "Kontrak berhasil disimpan!"
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Redirect after delay to allow user to see the success message
      setTimeout(() => {
        router.push("/kontrak");
      }, 3000);
    } catch (error) {
      console.error("Error creating contract:", error);
      setErrorMessage("Terjadi kesalahan saat membuat kontrak. Silakan coba lagi.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-500 mb-6">Anda tidak memiliki akses untuk menambah kontrak.</p>
          <Link
            href="/kontrak"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Kembali ke Daftar Kontrak
          </Link>
        </div>
      </div>
    );
  }

  // Render form based on category
  const renderInvestasiForm = () => (
    <>
      {/* Informasi Dasar - Investasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Perjanjian</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Perjanjian/Amandemen <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="tanggalPerjanjian"
              value={formData.tanggalPerjanjian}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Berakhir <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="tanggalBerakhir"
              value={formData.tanggalBerakhir}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul PRK <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="judulPRK"
              value={formData.judulPRK}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Pembangunan GI 150kV Cawang"
            />
          </div>
        </div>
      </div>

      {/* Nilai & Vendor - Investasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nilai & Vendor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai Perjanjian (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="nilaiPerjanjian"
              value={formData.nilaiPerjanjian}
              onChange={handleChange}
              required
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 15000000000"
            />
            {formData.nilaiPerjanjian && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.nilaiPerjanjian)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Vendor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="namaVendor"
              value={formData.namaVendor}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: PT Wijaya Karya"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Vendor <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="vendorEmail"
              value={formData.vendorEmail}
              onChange={handleChange}
              required
              placeholder="vendor@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-blue-600">
              📧 Email ini akan digunakan untuk mengirim aktivasi akun vendor secara otomatis
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai Tagihan/Nominal (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="nilaiTagihan"
              value={formData.nilaiTagihan}
              onChange={handleChange}
              required
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 3000000000"
            />
            {formData.nilaiTagihan && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.nilaiTagihan)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detail Pekerjaan - Investasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Pekerjaan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Pekerjaan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="namaPekerjaan"
              value={formData.namaPekerjaan}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Pengadaan dan Pemasangan Trafo Daya 60 MVA GI Cawang"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jenis AI
            </label>
            <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900">
              AI - Anggaran Investasi
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CR / Not CR
            </label>
            <select
              name="crNotCR"
              value={formData.crNotCR}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Not CR">Not CR</option>
              <option value="CR">CR</option>
            </select>
          </div>
        </div>
      </div>

      {/* Unit - Investasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Unit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: PLN UP3 Jakarta Selatan"
            />
          </div>
        </div>
      </div>

      {/* Field Auto-Generate - Investasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nomor Administrasi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. Perjanjian/Amandemen
            </label>
            <input
              type="text"
              disabled
              value="03xxPj/STH.xx.xx/F0107xxxx00/xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. PRK
            </label>
            <input
              type="text"
              disabled
              value="(tahun).KPST.21.xxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. WBS/Pos Anggaran
            </label>
            <input
              type="text"
              disabled
              value="I.1001.23.21.0805.xxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. SKKI
            </label>
            <input
              type="text"
              disabled
              value="xxxx/KEU.00.03/EVP MUM/xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. SE
            </label>
            <input
              type="text"
              disabled
              value="100369xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. PO
            </label>
            <input
              type="text"
              disabled
              value="310148xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Submission ID - Vendor Invoicing Portal
            </label>
            <input
              type="text"
              disabled
              value="TRE-V/xxxx/xxxx/00000xxxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
        </div>
      </div>
    </>
  );

  // Form khusus untuk kategori Pemeliharaan
  const renderPemeliharaanForm = () => (
    <>
      {/* Informasi Perjanjian - Pemeliharaan */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Perjanjian</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uraian Kegiatan/Mata Anggaran
            </label>
            <input
              type="text"
              name="uraianKegiatan"
              value={formData.uraianKegiatan}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Pemeliharaan Peralatan Gardu Induk"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. Perjanjian/Amandemen
            </label>
            <input
              type="text"
              disabled
              value="03xxPj/STH.xx.xx/F0107xxxx00/xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Perjanjian/Amandemen <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="tanggalPerjanjian"
              value={formData.tanggalPerjanjian}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Berakhir <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="tanggalBerakhir"
              value={formData.tanggalBerakhir}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul Perjanjian <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="judulPerjanjian"
              value={formData.judulPerjanjian}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Perjanjian Pemeliharaan Peralatan GI Cawang"
            />
          </div>
        </div>
      </div>

      {/* Nilai & Vendor - Pemeliharaan */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nilai & Vendor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai Perjanjian (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="nilaiPerjanjian"
              value={formData.nilaiPerjanjian}
              onChange={handleChange}
              required
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 5000000000"
            />
            {formData.nilaiPerjanjian && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.nilaiPerjanjian)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Vendor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="namaVendor"
              value={formData.namaVendor}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: PT Wijaya Karya"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Vendor <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="vendorEmail"
              value={formData.vendorEmail}
              onChange={handleChange}
              required
              placeholder="vendor@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-blue-600">
              📧 Email ini akan digunakan untuk mengirim aktivasi akun vendor secara otomatis
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai Tagihan/Nominal STI Kantor Pusat (Rp)
            </label>
            <input
              type="number"
              name="nilaiTagihanPusat"
              value={formData.nilaiTagihanPusat}
              onChange={handleChange}
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 2500000000"
            />
            {formData.nilaiTagihanPusat && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.nilaiTagihanPusat)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai Tagihan/Nominal Unit Induk Seindonesia Raya (Rp)
            </label>
            <input
              type="number"
              name="nilaiTagihanUnitInduk"
              value={formData.nilaiTagihanUnitInduk}
              onChange={handleChange}
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 2500000000"
            />
            {formData.nilaiTagihanUnitInduk && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.nilaiTagihanUnitInduk)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Berita Acara - Pemeliharaan */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Berita Acara</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. Berita Acara
            </label>
            <input
              type="text"
              disabled
              value="xxxx/JKO/2024/012"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Berita Acara
            </label>
            <input
              type="date"
              name="tanggalBeritaAcara"
              value={formData.tanggalBeritaAcara}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Administrasi - Pemeliharaan */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Administrasi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. WBS/Pos Anggaran
            </label>
            <input
              type="text"
              disabled
              value="I.1001.23.21.0805.xxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. SKKI/SKKO
            </label>
            <input
              type="text"
              disabled
              value="xxxx/KEU.00.03/EVP MUM/2024"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Request SE
            </label>
            <input
              type="date"
              name="tanggalRequestSE"
              value={formData.tanggalRequestSE}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal SE Rilis
            </label>
            <input
              type="date"
              name="tanggalSERilis"
              value={formData.tanggalSERilis}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. SE
            </label>
            <input
              type="text"
              disabled
              value="100369xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. PO
            </label>
            <input
              type="text"
              disabled
              value="310148xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Submission ID - Vendor Invoicing Portal
              <span className="ml-2 text-xs text-blue-600">(Auto-generate)</span>
            </label>
            <input
              type="text"
              disabled
              value="TRE-V/xxxx/xxxx/00000xxxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Detail Pekerjaan - Pemeliharaan */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Pekerjaan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Pekerjaan
            </label>
            <input
              type="text"
              name="namaPekerjaan"
              value={formData.namaPekerjaan}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Pemeliharaan Trafo Daya GI Cawang"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MSB
            </label>
            <input
              type="text"
              name="msb"
              value={formData.msb}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: MSB-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bidang
            </label>
            <input
              type="text"
              name="bidang"
              value={formData.bidang}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Operasi & Pemeliharaan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status VIP
            </label>
            <select
              name="statusVIP"
              value={formData.statusVIP}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="belum_lunas">Belum Lunas</option>
              <option value="lunas">Lunas</option>
              <option value="dokumen_tidak_lengkap">Dokumen Tidak Lengkap</option>
            </select>
          </div>
        </div>
      </div>

      {/* Periode & Request - Pemeliharaan */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Periode & Request</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Periode Accrue - Bulan
            </label>
            <select
              name="periodeAccrueBulan"
              value={formData.periodeAccrueBulan}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Pilih Bulan</option>
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Periode Accrue - Tahun
            </label>
            <input
              type="text"
              name="periodeAccrueTahun"
              value={formData.periodeAccrueTahun}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="2024"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requested By
            </label>
            <input
              type="text"
              name="requestedBy"
              value={formData.requestedBy}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Budi Santoso"
            />
          </div>
        </div>
      </div>

      {/* Pembayaran - Pemeliharaan */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pembayaran</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terbayar STI Pusat (Rp)
            </label>
            <input
              type="number"
              name="terbayarPusat"
              value={formData.terbayarPusat}
              onChange={handleChange}
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 0"
            />
            {formData.terbayarPusat && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.terbayarPusat)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terbayar Unit (Rp)
            </label>
            <input
              type="number"
              name="terbayarUnit"
              value={formData.terbayarUnit}
              onChange={handleChange}
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 0"
            />
            {formData.terbayarUnit && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.terbayarUnit)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Terbayar
            </label>
            <select
              name="statusTerbayar"
              value={formData.statusTerbayar}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Belum Terbayar">Belum Terbayar</option>
              <option value="Sebagian Terbayar">Sebagian Terbayar</option>
              <option value="Lunas">Lunas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rutin/Non Rutin
            </label>
            <select
              name="rutinNonRutin"
              value={formData.rutinNonRutin}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Rutin">Rutin</option>
              <option value="Non Rutin">Non Rutin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Unit - Pemeliharaan */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Unit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: PLN UP3 Jakarta Selatan"
            />
          </div>
        </div>
      </div>
    </>
  );

  // Form khusus untuk kategori Administrasi
  const renderAdministrasiForm = () => (
    <>
      {/* Informasi Perjanjian - Administrasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Perjanjian</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uraian Kegiatan/Mata Anggaran
            </label>
            <input
              type="text"
              name="uraianKegiatan"
              value={formData.uraianKegiatan}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Pengadaan ATK Kantor Pusat"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. Perjanjian/Amandemen
            </label>
            <input
              type="text"
              disabled
              value="03xxPj/STH.xx.xx/F0107xxxx00/xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Perjanjian/Amandemen <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="tanggalPerjanjian"
              value={formData.tanggalPerjanjian}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Berakhir <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="tanggalBerakhir"
              value={formData.tanggalBerakhir}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Judul Perjanjian <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="judulPerjanjian"
              value={formData.judulPerjanjian}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Perjanjian Pengadaan Jasa Kebersihan"
            />
          </div>
        </div>
      </div>

      {/* Nilai & Vendor - Administrasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nilai & Vendor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai Perjanjian (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="nilaiPerjanjian"
              value={formData.nilaiPerjanjian}
              onChange={handleChange}
              required
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 500000000"
            />
            {formData.nilaiPerjanjian && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.nilaiPerjanjian)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Vendor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="namaVendor"
              value={formData.namaVendor}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: PT Wijaya Karya"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Vendor <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="vendorEmail"
              value={formData.vendorEmail}
              onChange={handleChange}
              required
              placeholder="vendor@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-blue-600">
              📧 Email ini akan digunakan untuk mengirim aktivasi akun vendor secara otomatis
            </p>
          </div>
        </div>
      </div>

      {/* Tagihan - Administrasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tagihan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai Tagihan Keseluruhan (Rp)
            </label>
            <input
              type="number"
              name="nilaiTagihanKeseluruhan"
              value={formData.nilaiTagihanKeseluruhan}
              onChange={handleChange}
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 500000000"
            />
            {formData.nilaiTagihanKeseluruhan && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.nilaiTagihanKeseluruhan)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai Tagihan Khusus Kantor Pusat (Rp)
            </label>
            <input
              type="number"
              name="nilaiTagihanKhususPusat"
              value={formData.nilaiTagihanKhususPusat}
              onChange={handleChange}
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 300000000"
            />
            {formData.nilaiTagihanKhususPusat && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.nilaiTagihanKhususPusat)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nilai Tagihan Unit selain Kantor Pusat (Rp)
            </label>
            <input
              type="number"
              name="nilaiTagihanUnitSelainPusat"
              value={formData.nilaiTagihanUnitSelainPusat}
              onChange={handleChange}
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 200000000"
            />
            {formData.nilaiTagihanUnitSelainPusat && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.nilaiTagihanUnitSelainPusat)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Berita Acara - Administrasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Berita Acara</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. Berita Acara
            </label>
            <input
              type="text"
              disabled
              value="xxxx/JKO/2024/012"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Berita Acara
            </label>
            <input
              type="date"
              name="tanggalBeritaAcara"
              value={formData.tanggalBeritaAcara}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Administrasi - Administrasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Administrasi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. WBS/Pos Anggaran
            </label>
            <input
              type="text"
              disabled
              value="I.1001.23.21.0805.xxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. SKKI/SKKO
            </label>
            <input
              type="text"
              disabled
              value="xxxx/KEU.00.03/EVP MUM/xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Request
            </label>
            <input
              type="date"
              name="tanggalRequestSE"
              value={formData.tanggalRequestSE}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal SE Release
            </label>
            <input
              type="date"
              name="tanggalSERilis"
              value={formData.tanggalSERilis}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. SE
            </label>
            <input
              type="text"
              disabled
              value="100369xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. PO
            </label>
            <input
              type="text"
              disabled
              value="310148xxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Submission ID
            </label>
            <input
              type="text"
              disabled
              value="TRE-V/xxxx/xxxx/00000xxxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Detail Pekerjaan - Administrasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Pekerjaan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Pekerjaan
            </label>
            <input
              type="text"
              name="namaPekerjaan"
              value={formData.namaPekerjaan}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Jasa Kebersihan Gedung Kantor Pusat"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beban Tahun
            </label>
            <input
              type="text"
              name="bebanTahun"
              value={formData.bebanTahun}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bidang
            </label>
            <input
              type="text"
              name="bidang"
              value={formData.bidang}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Umum & Administrasi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PIC
            </label>
            <input
              type="text"
              name="picName"
              value={formData.picName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Budi Santoso"
            />
          </div>
        </div>
      </div>

      {/* Pembayaran - Administrasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pembayaran</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terbayar Pusat (Rp)
            </label>
            <input
              type="number"
              name="terbayarPusat"
              value={formData.terbayarPusat}
              onChange={handleChange}
              min="0"
              step="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: 0"
            />
            {formData.terbayarPusat && (
              <p className="mt-1 text-sm text-gray-500">
                {formatCurrencyText(formData.terbayarPusat)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Bayar
            </label>
            <select
              name="statusBayar"
              value={formData.statusBayar}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Belum Dibayar">Belum Dibayar</option>
              <option value="Sebagian Dibayar">Sebagian Dibayar</option>
              <option value="Lunas">Lunas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rutin/Non Rutin
            </label>
            <select
              name="rutinNonRutin"
              value={formData.rutinNonRutin}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Rutin">Rutin</option>
              <option value="Non Rutin">Non Rutin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Entry & Unit - Administrasi */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Entry & Unit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entry By
            </label>
            <input
              type="text"
              name="entryBy"
              value={formData.entryBy}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit
            </label>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Contoh: Kantor Pusat"
            />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center gap-2 mb-2 justify-center">
          <Link href="/kontrak" className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Tambah Kontrak</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Tambah Kontrak Baru</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lengkapi formulir di bawah untuk menambahkan kontrak baru
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-50 border border-red-200"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-red-800 font-medium">{errorMessage}</p>
          </div>
        </motion.div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-green-50 border border-green-200"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-green-800 font-medium">{successMessage}</p>
              <p className="text-green-600 text-sm mt-1">Anda akan dialihkan ke daftar kontrak dalam beberapa detik...</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        {/* Kategori Selection */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kategori Kontrak</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["investasi", "pemeliharaan", "administrasi"] as ContractCategory[]).map((cat) => (
              <label
                key={cat}
                className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.kategori === cat
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
                  }`}
              >
                <input
                  type="radio"
                  name="kategori"
                  value={cat}
                  checked={formData.kategori === cat}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className={`text-sm font-medium ${formData.kategori === cat
                  ? "text-blue-700"
                  : "text-gray-700"
                  }`}>
                  {CONTRACT_CATEGORY_LABELS[cat]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Render form based on category */}
        {formData.kategori === "investasi" && renderInvestasiForm()}
        {formData.kategori === "pemeliharaan" && renderPemeliharaanForm()}
        {formData.kategori === "administrasi" && renderAdministrasiForm()}

        {/* Keterangan */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Keterangan/Konfirmasi</h2>
          <textarea
            name="keterangan"
            value={formData.keterangan}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tambahkan catatan atau keterangan tambahan..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <Link
            href="/kontrak"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Simpan Kontrak
              </>
            )}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
