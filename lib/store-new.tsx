"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from "react";
import type {
  Contract,
  Invoice,
  ContractStatus,
  ContractCategory,
  JenisAnggaran,
  InvoiceStatus,
  DashboardSummary,
  ContractFilters,
  InvoiceFilters,
  Alert,
  StatusVIP,
  CRStatus,
} from "./types-new";
import { calculateContractStatus } from "./contract-status";

// ============================================
// MOCK DATA - VENDORS
// ============================================

const vendors = [
  "PT Wijaya Karya",
  "PT Hutama Karya",
  "PT Waskita Karya",
  "PT PP (Persero)",
  "PT Adhi Karya",
  "PT Brantas Abipraya",
  "PT Nindya Karya",
  "PT Jasa Marga",
];

const units = [
  "PLN UP3 Jakarta Selatan",
  "PLN UP3 Bandung",
  "PLN UP3 Surabaya",
  "PLN UP3 Medan",
  "PLN UP3 Makassar",
];

// ============================================
// GENERATE MOCK CONTRACTS - SESUAI SAMPLE DATA PLN
// ============================================

function generateMockContracts(): Contract[] {
  // Data berdasarkan sample: Investasi, Pemeliharaan, Administrasi
  const contractData: Array<{
    kategori: ContractCategory;
    uraian: string;
    judul: string;
    vendor: string;
    nilai: number;
    status: ContractStatus;
  }> = [
      // INVESTASI
      { kategori: "investasi", uraian: "Pengadaan Trafo 60 MVA", judul: "Pengadaan dan Pemasangan Trafo Daya 60 MVA GI Cawang", vendor: "PT Wijaya Karya", nilai: 15000000000, status: "aktif" },
      { kategori: "investasi", uraian: "Pembangunan SUTT 150kV", judul: "Pembangunan SUTT 150kV Cikarang-Bekasi Circuit 2", vendor: "PT Hutama Karya", nilai: 28000000000, status: "aktif" },
      { kategori: "investasi", uraian: "Pengadaan Kubikel 20kV", judul: "Pengadaan Kubikel 20kV untuk GI Duri Kosambi", vendor: "PT PP (Persero)", nilai: 8500000000, status: "aktif" },
      { kategori: "investasi", uraian: "Pembangunan GITET 500kV", judul: "Pembangunan GITET 500kV Surabaya Selatan", vendor: "PT Adhi Karya", nilai: 45000000000, status: "aktif" },
      { kategori: "investasi", uraian: "Upgrade GI 70kV", judul: "Upgrade Kapasitas GI Cibinong 70kV", vendor: "PT Brantas Abipraya", nilai: 6200000000, status: "aktif" },

      // PEMELIHARAAN
      { kategori: "pemeliharaan", uraian: "Pemeliharaan Trafo GI", judul: "Pemeliharaan Rutin Trafo GI Bandung Selatan", vendor: "PT Nindya Karya", nilai: 2500000000, status: "aktif" },
      { kategori: "pemeliharaan", uraian: "Overhaul PMT 150kV", judul: "Overhaul PMT 150kV GI Medan Timur", vendor: "PT Hutama Karya", nilai: 1800000000, status: "aktif" },
      { kategori: "pemeliharaan", uraian: "Penggantian Isolator SUTT", judul: "Penggantian Isolator SUTT 150kV Jalur Makassar", vendor: "PT Waskita Karya", nilai: 3200000000, status: "aktif" },
      { kategori: "pemeliharaan", uraian: "Pemeliharaan Sistem Proteksi", judul: "Pemeliharaan Sistem Proteksi GI Jakarta Timur", vendor: "PT Wijaya Karya", nilai: 1500000000, status: "selesai" },
      { kategori: "pemeliharaan", uraian: "Perbaikan Kabel Bawah Tanah", judul: "Perbaikan Kabel Bawah Tanah 20kV Area CBD Jakarta", vendor: "PT PP (Persero)", nilai: 4500000000, status: "bermasalah" },

      // ADMINISTRASI
      { kategori: "administrasi", uraian: "Jasa Konsultansi DED", judul: "Jasa Konsultansi DED GI Tangerang Baru", vendor: "PT Adhi Karya", nilai: 850000000, status: "aktif" },
      { kategori: "administrasi", uraian: "Supervisi Konstruksi", judul: "Jasa Supervisi Konstruksi SUTT 150kV Yogya-Solo", vendor: "PT Jasa Marga", nilai: 1200000000, status: "aktif" },
      { kategori: "administrasi", uraian: "Studi Kelayakan", judul: "Studi Kelayakan Pembangunan GI Bekasi Timur", vendor: "PT Brantas Abipraya", nilai: 650000000, status: "aktif" },
      { kategori: "administrasi", uraian: "Jasa Audit Teknis", judul: "Jasa Audit Teknis Instalasi GI se-Jawa Barat", vendor: "PT Nindya Karya", nilai: 480000000, status: "selesai" },
    ];

  return contractData.map((data, index) => {
    // Random percentage of completion (20% - 85%)
    const realisasiPersen = Math.random() * 65 + 20;
    const totalDibayar = Math.floor(data.nilai * (realisasiPersen / 100));
    const sisaAnggaran = data.nilai - totalDibayar;

    // Generate dates
    const tahun = 2025;
    const bulanMulai = (index % 6) + 1;
    const tanggalPerjanjian = `${tahun}-${String(bulanMulai).padStart(2, "0")}-15`;
    const tanggalBerakhir = `${tahun + 1}-${String(((bulanMulai + 5) % 12) + 1).padStart(2, "0")}-30`;

    // Bidang berdasarkan kategori
    const bidangMap: Record<ContractCategory, string> = {
      investasi: "Pengembangan",
      pemeliharaan: "Operasi & Pemeliharaan",
      administrasi: "Administrasi & Umum",
    };

    // Jenis pekerjaan berdasarkan kategori
    const jenisPekerjaanMap: Record<ContractCategory, string[]> = {
      investasi: ["Konstruksi", "Pengadaan", "Instalasi", "Pembangunan"],
      pemeliharaan: ["Overhaul", "Perbaikan", "Pemeliharaan Rutin", "Penggantian"],
      administrasi: ["Konsultansi", "Supervisi", "Studi", "Audit"],
    };

    // Calculate progress pekerjaan
    const progressPekerjaan = Math.min(realisasiPersen + Math.random() * 10 - 5, 100);

    // Hitung status secara dinamis
    const calculatedStatus = calculateContractStatus({
      tanggalBerakhir,
      progressPekerjaan,
    });

    // Generate unique numbers for auto-generated fields (Investasi)
    const randomNum1 = 1000 + index * 100 + Math.floor(Math.random() * 100);
    const randomNum2 = 100 + index * 10;

    // Determine status VIP based on realisasi
    const statusVIP = realisasiPersen >= 100 ? "lunas" : "belum_lunas";

    return {
      id: `CTR-${String(index + 1).padStart(3, "0")}`,
      no: index + 1,

      // ============================================
      // FIELD KHUSUS KATEGORI INVESTASI
      // ============================================

      // Auto-generated fields for Investasi
      noPerjanjian: data.kategori === "investasi"
        ? `03${randomNum1}Pj/STH.01.01/F0107${randomNum1}00/${tahun}`
        : `${String(index + 1).padStart(4, "0")}/PLN/KTR/${tahun}`,
      tanggalPerjanjian,
      tanggalBerakhir,
      judulPRK: data.uraian,
      nilaiPerjanjian: data.nilai,
      namaVendor: data.vendor,
      nilaiTagihan: Math.floor(totalDibayar * 0.6),
      noBeritaAcara: realisasiPersen > 30 ? `${randomNum1}/JKO/${tahun}/012` : undefined,
      tanggalBeritaAcara: realisasiPersen > 30 ? `${tahun}-${String(bulanMulai + 2).padStart(2, "0")}-20` : undefined,
      noWBSPosAnggaran: `I.1001.23.21.0805.${String(randomNum2).padStart(3, "0")}`,
      noSKKI: `${randomNum1}/KEU.00.03/EVP MUM/${tahun}`,
      requestTanggalSE: realisasiPersen > 40 ? `${tahun}-${String(bulanMulai + 1).padStart(2, "0")}-15` : undefined,
      noSE: `100369${randomNum1}`,
      noPO: `310148${randomNum1}`,
      submissionIdVIP: `TRE-V/${randomNum1}/${tahun}/00000${randomNum1 * 10}`,
      statusVIP: statusVIP as "lunas" | "belum_lunas" | "dokumen_tidak_lengkap",
      terbayar: totalDibayar,
      namaPekerjaan: data.judul,
      jenisAI: data.kategori === "investasi" ? "AI" : "AO",
      noPRK: `${tahun}.KPST.21.${String(randomNum2).padStart(3, "0")}`,
      crNotCR: (index % 3 === 0 ? "CR" : "Not CR") as "CR" | "Not CR",

      // ============================================
      // BACKWARD COMPATIBILITY FIELDS
      // ============================================
      uraianKegiatan: data.uraian,
      judulPekerjaan: data.judul,
      nilaiKontrak: data.nilai,
      vendor: data.vendor,
      nilaiTagihanKontrakPusat: Math.floor(totalDibayar * 0.6),
      nilaiTagihanUnitInduk: Math.floor(totalDibayar * 0.4),
      nilaiBeritaAcara: realisasiPersen > 30 ? Math.floor(totalDibayar * 0.9) : undefined,
      noBeritaAcaraSKRelasi: realisasiPersen > 50 ? `BA-SK/${String(index + 1).padStart(3, "0")}/${tahun}` : undefined,
      tanggalArsip: realisasiPersen > 50 ? `${tahun}-${String(bulanMulai + 3).padStart(2, "0")}-01` : undefined,
      noXPS: realisasiPersen > 40 ? `XPS/${String(index + 1).padStart(4, "0")}/${tahun}` : undefined,
      tanggalXPS: realisasiPersen > 40 ? `${tahun}-${String(bulanMulai + 2).padStart(2, "0")}-25` : undefined,
      kategori: data.kategori,
      jenisAnggaran: data.kategori === "investasi" ? "AI" : "AO",
      unit: units[index % units.length],
      unitSektorK: `Sektor ${["A", "B", "C", "D", "E"][index % 5]}`,
      noSKWE: `SK-WE/${String(index + 1).padStart(4, "0")}/${tahun}`,
      posAngg: `I.1001.23.21.0805.${String(randomNum2).padStart(3, "0")}`,
      noSKUSKKO: `${randomNum1}/KEU.00.03/EVP MUM/${tahun}`,
      requestTanggalSERelasi: realisasiPersen > 40 ? `${tahun}-${String(bulanMulai + 1).padStart(2, "0")}-15` : undefined,
      submissionId: `TRE-V/${randomNum1}/${tahun}/00000${randomNum1 * 10}`,
      jenisPekerjaan: jenisPekerjaanMap[data.kategori][index % jenisPekerjaanMap[data.kategori].length],
      bebanTahun: `${tahun}`,
      batasPaguTerbayar: Math.floor(data.nilai * 0.95),
      unitTerbayar: units[index % units.length],
      konfirmasiNonRutin: index % 3 === 0 ? "Non Rutin" : "Rutin",
      bidang: bidangMap[data.kategori],
      picId: index % 2 === 0 ? "USR-002" : "USR-003",
      picName: index % 2 === 0 ? "Budi Santoso" : "Siti Rahayu",
      entryBy: ["Admin", "Operator", "System"][index % 3],
      status: calculatedStatus, // Status dihitung dinamis berdasarkan tanggal dan progress
      totalTagihanDibayar: totalDibayar,
      sisaAnggaran,
      persentaseRealisasi: realisasiPersen,
      progressPekerjaan,
      oldFlag: index % 5 === 0 ? "Y" : undefined,
      clickCB: index % 4 === 0,
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "USR-001",
      updatedAt: new Date().toISOString(),
      updatedBy: "USR-001",
      keterangan: `Pekerjaan ${data.judul} sesuai kontrak perjanjian.`,
    };
  });
}

// ============================================
// GENERATE MOCK INVOICES
// ============================================

function generateMockInvoices(contracts: Contract[]): Invoice[] {
  const invoices: Invoice[] = [];
  let invoiceIndex = 1;

  contracts.forEach((contract) => {
    // Generate 2-5 invoices per contract
    const numInvoices = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < numInvoices; i++) {
      const nilaiTagihan = Math.floor((contract.nilaiKontrak / numInvoices) * (0.8 + Math.random() * 0.4));
      const rand = Math.random();

      // Determine status based on random and position
      // Status: ditolak, dibayar
      let status: InvoiceStatus;
      if (rand < 0.8) status = "dibayar";
      else status = "ditolak";

      const tanggalDiajukan = new Date(2025, i * 2, 15 + Math.floor(Math.random() * 10));
      const tahun = tanggalDiajukan.getFullYear();

      // Hitung tanggalVerifikasi
      const tanggalVerifikasi = new Date(tanggalDiajukan.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      invoices.push({
        id: `INV-${String(invoiceIndex).padStart(4, "0")}`,
        contractId: contract.id,
        noPerjanjian: contract.noPerjanjian,
        nomorTagihan: `BA/${contract.id.replace("CTR-", "")}/${String(i + 1).padStart(2, "0")}/${tahun}`,
        tanggalTagihan: tanggalDiajukan.toISOString().split("T")[0],
        nilaiTagihan,
        noBeritaAcara: `BA-${String(invoiceIndex).padStart(4, "0")}/${tahun}`,
        tanggalBeritaAcara: new Date(tanggalDiajukan.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        tanggalArsip: status === "dibayar" ? new Date(tanggalDiajukan.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : undefined,
        noXPS: status === "dibayar" ? `XPS/${String(invoiceIndex).padStart(4, "0")}/${tahun}` : undefined,
        tanggalXPS: status === "dibayar" ? new Date(tanggalDiajukan.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : undefined,
        status,
        tanggalDiajukan: tanggalDiajukan.toISOString(),
        tanggalVerifikasi,
        keterangan: `Pembayaran termin ke-${i + 1}`,
        diajukanOleh: "USR-002",
        diajukanOlehName: "Budi Santoso",
        dibayarOleh: status === "dibayar" ? "Administrator Keuangan" : undefined,
        createdAt: tanggalDiajukan.toISOString(),
        updatedAt: new Date().toISOString(),
      });

      invoiceIndex++;
    }
  });

  return invoices;
}

// ============================================
// STATUS LABELS & COLORS
// ============================================

export const JENIS_ANGGARAN_LABELS: Record<JenisAnggaran, string> = {
  AI: "AI (Anggaran Investasi)",
  AO: "AO (Anggaran Operasi)",
};

export const JENIS_ANGGARAN_COLORS: Record<JenisAnggaran, string> = {
  AI: "bg-purple-200 text-purple-900 font-semibold",
  AO: "bg-teal-200 text-teal-900 font-semibold",
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  aktif: "Belum Lunas",
  selesai: "Lunas",
  bermasalah: "Bermasalah",
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  aktif: "bg-green-200 text-green-900 font-semibold",
  selesai: "bg-blue-200 text-blue-900 font-semibold",
  bermasalah: "bg-red-200 text-red-900 font-semibold",
};

export const CONTRACT_CATEGORY_LABELS: Record<ContractCategory, string> = {
  investasi: "Investasi",
  pemeliharaan: "Pemeliharaan",
  administrasi: "Administrasi",
};

export const CONTRACT_CATEGORY_COLORS: Record<ContractCategory, string> = {
  investasi: "bg-purple-200 text-purple-900 font-semibold",
  pemeliharaan: "bg-orange-200 text-orange-900 font-semibold",
  administrasi: "bg-cyan-200 text-cyan-900 font-semibold",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  dibayar: "Dibayar",
  ditolak: "Ditolak",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  dibayar: "bg-emerald-200 text-emerald-900 font-semibold",
  ditolak: "bg-red-200 text-red-900 font-semibold",
};

// ============================================
// FILTER OPTIONS
// ============================================

export const jenisAnggaranOptions = [
  { value: "all", label: "Semua Jenis" },
  { value: "AI", label: "AI (Anggaran Investasi)" },
  { value: "AO", label: "AO (Anggaran Operasi)" },
];

export const contractStatusOptions = [
  { value: "all", label: "Semua Status" },
  { value: "aktif", label: "Aktif" },
  { value: "selesai", label: "Selesai" },
  { value: "bermasalah", label: "Bermasalah" },
];

export const contractCategoryOptions = [
  { value: "all", label: "Semua Kategori" },
  { value: "investasi", label: "Investasi" },
  { value: "pemeliharaan", label: "Pemeliharaan" },
  { value: "administrasi", label: "Administrasi" },
];

export const invoiceStatusOptions = [
  { value: "all", label: "Semua Status" },
  { value: "dibayar", label: "Dibayar" },
  { value: "ditolak", label: "Ditolak" },
];

export const unitOptions = [
  { value: "all", label: "Semua Unit" },
  ...units.map((u) => ({ value: u, label: u })),
];

export const vendorOptions = [
  { value: "all", label: "Semua Vendor" },
  ...vendors.map((v) => ({ value: v, label: v })),
];

// ============================================
// STORE CONTEXT
// ============================================

interface ContractStoreContextType {
  // Data
  contracts: Contract[];
  invoices: Invoice[];
  alerts: Alert[];
  isLoading: boolean;
  refreshData: (background?: boolean) => Promise<void>;

  // Getters
  getContractById: (id: string) => Contract | undefined;
  getInvoiceById: (id: string) => Invoice | undefined;
  getInvoicesByContract: (contractId: string) => Invoice[];
  getDashboardSummary: () => DashboardSummary;
  getContractHistory: (contractId: string) => Contract[];  // Get previous versions of a contract

  // Filters
  filterContracts: (filters: ContractFilters) => Contract[];
  filterInvoices: (filters: InvoiceFilters) => Invoice[];

  // Mutations - ASYNC karena menggunakan Supabase
  createContract: (contract: Omit<Contract, "id" | "createdAt" | "updatedAt" | "totalTagihanDibayar" | "sisaAnggaran" | "persentaseRealisasi" | "progressPekerjaan">) => Promise<Contract>;
  addContract: (contract: Omit<Contract, "id" | "createdAt" | "updatedAt" | "totalTagihanDibayar" | "sisaAnggaran" | "persentaseRealisasi" | "progressPekerjaan">) => Promise<Contract>; // Alias
  updateContract: (id: string, updates: Partial<Contract>) => Promise<Contract>;
  updateContractWithNewVersion: (id: string, updates: Partial<Contract>) => Promise<Contract>;  // Create new version with new noPerjanjian

  createInvoice: (invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<Invoice>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus, dibayarOleh?: string) => Promise<Invoice>;

  // Alert mutations
  markAlertAsRead: (id: string) => void;
  markAllAlertsAsRead: () => void;

  // Recalculate
  recalculateContractTotals: (contractId: string) => void;
}

const ContractStoreContext = createContext<ContractStoreContextType | undefined>(undefined);

// ============================================
// GENERATE ALERTS BASED ON CONDITIONS
// ============================================

function generateAlerts(contracts: Contract[], invoices: Invoice[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  let alertId = 1;

  // Check contracts
  contracts.forEach((contract) => {
    // Kontrak hampir habis anggarannya (> 90% serapan)
    if (contract.persentaseRealisasi > 90 && contract.status === "aktif") {
      alerts.push({
        id: `ALT-${String(alertId++).padStart(4, "0")}`,
        type: "kontrak_hampir_habis",
        severity: "critical",
        title: "Anggaran Hampir Habis",
        message: `Kontrak "${contract.judulPekerjaan || contract.judulPerjanjian || 'Unknown'}" sudah mencapai ${contract.persentaseRealisasi.toFixed(1)}% serapan anggaran.`,
        contractId: contract.id,
        createdAt: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Kontrak akan berakhir dalam 30 hari
    const endDate = new Date(contract.tanggalBerakhir);
    const daysUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd > 0 && daysUntilEnd <= 30 && contract.status === "aktif") {
      alerts.push({
        id: `ALT-${String(alertId++).padStart(4, "0")}`,
        type: "kontrak_akan_berakhir",
        severity: daysUntilEnd <= 7 ? "critical" : "warning",
        title: "Kontrak Akan Berakhir",
        message: `Kontrak "${contract.judulPekerjaan || contract.judulPerjanjian || 'Unknown'}" akan berakhir dalam ${daysUntilEnd} hari (${endDate.toLocaleDateString("id-ID")}).`,
        contractId: contract.id,
        createdAt: new Date(now.getTime() - Math.random() * 48 * 60 * 60 * 1000).toISOString(),
      });
    }
  });

  // Removed tagihan pending alert as diajukan status is removed
  invoices.forEach((invoice) => {
    // Tagihan ditolak
    if (invoice.status === "ditolak") {
      alerts.push({
        id: `ALT-${String(alertId++).padStart(4, "0")}`,
        type: "tagihan_ditolak",
        severity: "warning",
        title: "Tagihan Ditolak",
        message: `Tagihan "${invoice.nomorTagihan}" ditolak. Keterangan: ${invoice.keterangan || "Tidak ada keterangan"}.`,
        contractId: invoice.contractId,
        invoiceId: invoice.id,
        createdAt: invoice.tanggalVerifikasi || new Date().toISOString(),
      });
    }
  });

  // Sort alerts by createdAt (newest first)
  return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================
// PROVIDER
// ============================================

export function ContractStoreProvider({ children }: { children: ReactNode }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // LOAD DATA DARI SUPABASE
  const loadDataFromSupabase = useCallback(async (background = false) => {
      try {
        if (!background) setIsLoading(true);

        // Fetch contracts from new split tables
        const contractsRes = await fetch('/api/contracts');
        if (contractsRes.ok) {
          const { data: contractsData } = await contractsRes.json();

          // Data sudah dalam format camelCase dari API
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const transformedContracts: Contract[] = contractsData.map((data: any) => ({
            ...data,
            // Ensure numeric fields are properly parsed
            nilaiKontrak: Number(data.nilaiKontrak) || 0,
            totalTagihanDibayar: Number(data.totalTagihanDibayar) || Number(data.terbayar) || 0,
            sisaAnggaran: Number(data.sisaAnggaran) || 0,
            persentaseRealisasi: parseFloat(data.persentaseRealisasi) || 0,
            progressPekerjaan: parseFloat(data.progressPekerjaan) || 0,

            // Map new API fields if they exist in response (camelCase key from API)
            judulPRK: data.judulPRK,
            namaPekerjaan: data.namaPekerjaan,
            noPRK: data.noPRK,
            nilaiPerjanjian: Number(data.nilaiPerjanjian) || 0,
            nilaiTagihan: Number(data.nilaiTagihan) || 0,
            namaVendor: data.namaVendor,
            terbayar: Number(data.terbayar) || 0,
            jenisAI: data.jenisAI,
            crNotCR: data.crNotCR,
            statusVIP: data.statusVIP,
            noWBSPosAnggaran: data.noWBSPosAnggaran,
            noSKKI: data.noSKKI,
            requestTanggalSE: data.requestTanggalSE,
          }));

          setContracts(transformedContracts);
        } else {
          // Fallback ke mock data jika API gagal
          console.warn('Failed to fetch contracts from API, using mock data');
          setContracts(generateMockContracts());
        }

        // Fetch invoices
        const invoicesRes = await fetch('/api/invoices');
        if (invoicesRes.ok) {
          const { data: invoicesData } = await invoicesRes.json();

          // Transform snake_case to camelCase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const transformedInvoices: Invoice[] = invoicesData.map((data: any) => ({
            id: data.id,
            contractId: data.contract_id,
            noPerjanjian: data.no_perjanjian,
            nomorTagihan: data.nomor_tagihan,
            tanggalTagihan: data.tanggal_tagihan,
            nilaiTagihan: data.nilai_tagihan,
            noBeritaAcara: data.no_berita_acara,
            tanggalBeritaAcara: data.tanggal_berita_acara,
            tanggalArsip: data.tanggal_arsip,
            noXPS: data.no_xps,
            tanggalXPS: data.tanggal_xps,
            status: data.status,
            tanggalDiajukan: data.tanggal_diajukan,
            tanggalVerifikasi: data.tanggal_verifikasi,
            keterangan: data.keterangan,
            diajukanOleh: data.diajukan_oleh,
            diajukanOlehName: data.diajukan_oleh_name,
            dibayarOleh: data.dibayar_oleh,
            dokumenTagihan: data.dokumen_tagihan,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          }));

          setInvoices(transformedInvoices);
        }
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
        // Fallback ke mock data jika gagal
        const mockContracts = generateMockContracts();
        // @ts-ignore
        setContracts(mockContracts);
        setInvoices(generateMockInvoices(mockContracts));
      } finally {
        if (!background) setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    loadDataFromSupabase();
  }, [loadDataFromSupabase]);

  // Generate alerts on mount and when contracts/invoices change
  useEffect(() => {
    const generatedAlerts = generateAlerts(contracts, invoices);
    setAlerts(generatedAlerts);
  }, [contracts, invoices]);

  // Mark alert as read
  const markAlertAsRead = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, readAt: new Date().toISOString() } : alert
      )
    );
  }, []);

  // Mark all alerts as read
  const markAllAlertsAsRead = useCallback(() => {
    const now = new Date().toISOString();
    setAlerts((prev) =>
      prev.map((alert) => (alert.readAt ? alert : { ...alert, readAt: now }))
    );
  }, []);

  // Get contract by ID
  const getContractById = useCallback(
    (id: string) => contracts.find((c) => c.id === id),
    [contracts]
  );

  // Get invoice by ID
  const getInvoiceById = useCallback(
    (id: string) => invoices.find((inv) => inv.id === id),
    [invoices]
  );

  // Get invoices by contract
  const getInvoicesByContract = useCallback(
    (contractId: string) => invoices.filter((inv) => inv.contractId === contractId),
    [invoices]
  );

  // Get contract history (previous versions)
  const getContractHistory = useCallback(
    (contractId: string): Contract[] => {
      const history: Contract[] = [];
      let currentContract = contracts.find((c) => c.id === contractId);
      
      // Traverse backwards through previousContractId chain
      while (currentContract?.previousContractId) {
        const previousContract = contracts.find((c) => c.id === currentContract?.previousContractId);
        if (previousContract) {
          history.push(previousContract);
          currentContract = previousContract;
        } else {
          break;
        }
      }
      
      return history;
    },
    [contracts]
  );

  // Filter contracts
  const filterContracts = useCallback(
    (filters: ContractFilters): Contract[] => {
      let result = [...contracts];

      if (filters.status && filters.status !== "all") {
        result = result.filter((c) => c.status === filters.status);
      }
      if (filters.kategori && filters.kategori !== "all") {
        result = result.filter((c) => c.kategori === filters.kategori);
      }
      if (filters.unit && filters.unit !== "all") {
        result = result.filter((c) => c.unit === filters.unit);
      }
      if (filters.vendor && filters.vendor !== "all") {
        result = result.filter((c) => c.vendor === filters.vendor);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(
          (c) =>
            c.judulPekerjaan.toLowerCase().includes(search) ||
            c.noPerjanjian.toLowerCase().includes(search) ||
            c.uraianKegiatan.toLowerCase().includes(search) ||
            c.vendor.toLowerCase().includes(search)
        );
      }

      return result;
    },
    [contracts]
  );

  // Filter invoices
  const filterInvoices = useCallback(
    (filters: InvoiceFilters): Invoice[] => {
      let result = [...invoices];

      if (filters.status && filters.status !== "all") {
        result = result.filter((inv) => inv.status === filters.status);
      }
      if (filters.contractId) {
        result = result.filter((inv) => inv.contractId === filters.contractId);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(
          (inv) =>
            inv.nomorTagihan.toLowerCase().includes(search) ||
            inv.noPerjanjian.toLowerCase().includes(search)
        );
      }

      return result;
    },
    [invoices]
  );

  // Dashboard summary
  const getDashboardSummary = useCallback((): DashboardSummary => {
    const activeContracts = contracts.filter((c) => c.status === "aktif");
    const totalNilaiKontrak = activeContracts.reduce((sum, c) => sum + c.nilaiKontrak, 0);
    const totalDibayar = activeContracts.reduce((sum, c) => sum + c.totalTagihanDibayar, 0);

    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Per Kategori
    const kontrakInvestasi = activeContracts.filter((c) => c.kategori === "investasi");
    const kontrakPemeliharaan = activeContracts.filter((c) => c.kategori === "pemeliharaan");
    const kontrakAdministrasi = activeContracts.filter((c) => c.kategori === "administrasi");

    return {
      totalKontrakAktif: activeContracts.length,
      totalNilaiKontrak,
      totalDibayar,
      totalSisaAnggaran: totalNilaiKontrak - totalDibayar,
      persentaseRealisasiGlobal: totalNilaiKontrak > 0 ? (totalDibayar / totalNilaiKontrak) * 100 : 0,

      // Per Kategori
      kontrakInvestasi: kontrakInvestasi.length,
      kontrakPemeliharaan: kontrakPemeliharaan.length,
      kontrakAdministrasi: kontrakAdministrasi.length,
      nilaiInvestasi: kontrakInvestasi.reduce((sum, c) => sum + c.nilaiKontrak, 0),
      nilaiPemeliharaan: kontrakPemeliharaan.reduce((sum, c) => sum + c.nilaiKontrak, 0),
      nilaiAdministrasi: kontrakAdministrasi.reduce((sum, c) => sum + c.nilaiKontrak, 0),

      totalTagihan: invoices.length,
      tagihanDiajukan: 0,
      tagihanDiterima: 0,
      tagihanDibayar: invoices.filter((inv) => inv.status === "dibayar").length,
      tagihanDitolak: invoices.filter((inv) => inv.status === "ditolak").length,

      kontrakHampirHabis: activeContracts.filter((c) => c.persentaseRealisasi > 90).length,
      tagihanPendingLama: 0,
      kontrakAkanBerakhir: activeContracts.filter(
        (c) => new Date(c.tanggalBerakhir) < thirtyDaysFromNow
      ).length,
    };
  }, [contracts, invoices]);

  // Create contract - DENGAN SUPABASE
  const createContract = useCallback(
    async (contractData: Omit<Contract, "id" | "createdAt" | "updatedAt" | "totalTagihanDibayar" | "sisaAnggaran" | "persentaseRealisasi" | "progressPekerjaan">) => {
      try {
        // Call API to save to Supabase
        const response = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contractData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create contract');
        }

        const { data } = await response.json();

        // Transform snake_case to camelCase
        const transformedData: Contract = {
          id: data.id,
          no: data.no,
          uraianKegiatan: data.uraian_kegiatan,
          noPerjanjian: data.no_perjanjian,
          tanggalPerjanjian: data.tanggal_perjanjian,
          tanggalBerakhir: data.tanggal_berakhir,
          judulPekerjaan: data.judul_pekerjaan,
          nilaiKontrak: data.nilai_kontrak,
          vendor: data.vendor,
          nilaiTagihanKontrakPusat: data.nilai_tagihan_kontrak_pusat,
          nilaiTagihanUnitInduk: data.nilai_tagihan_unit_induk,
          nilaiBeritaAcara: data.nilai_berita_acara,
          noBeritaAcara: data.no_berita_acara,
          tanggalBeritaAcara: data.tanggal_berita_acara,
          noBeritaAcaraSKRelasi: data.no_berita_acara_sk_relasi,
          tanggalArsip: data.tanggal_arsip,
          noXPS: data.no_xps,
          tanggalXPS: data.tanggal_xps,
          kategori: data.kategori,
          jenisAnggaran: data.jenis_anggaran,
          unit: data.unit,
          unitSektorK: data.unit_sektor_k,
          noSKWE: data.no_sk_we,
          posAngg: data.pos_angg,
          noSKUSKKO: data.no_sku_skko,
          requestTanggalSERelasi: data.request_tanggal_se_relasi,
          noSE: data.no_se,
          noPO: data.no_po,
          submissionId: data.submission_id,
          jenisPekerjaan: data.jenis_pekerjaan,
          bebanTahun: data.beban_tahun,
          batasPaguTerbayar: data.batas_pagu_terbayar,
          unitTerbayar: data.unit_terbayar,
          konfirmasiNonRutin: data.konfirmasi_non_rutin,
          bidang: data.bidang,
          picId: data.pic_id,
          picName: data.pic_name,
          entryBy: data.entry_by,
          status: data.status,
          totalTagihanDibayar: data.total_tagihan_dibayar,
          sisaAnggaran: data.sisa_anggaran,
          persentaseRealisasi: data.persentase_realisasi,
          progressPekerjaan: data.progress_pekerjaan || 0,
          oldFlag: data.old_flag,
          // Investasi fields
          judulPRK: data.judul_prk,
          namaPekerjaan: data.nama_pekerjaan,
          noPRK: data.no_prk,
          nilaiPerjanjian: data.nilai_perjanjian,
          nilaiTagihan: data.nilai_tagihan,
          namaVendor: data.nama_vendor,
          vendorEmail: data.vendor_email,
          vendorAccountId: data.vendor_account_id,
          terbayar: data.terbayar,
          jenisAI: data.jenis_ai,
          crNotCR: data.cr_not_cr,
          statusVIP: data.status_vip,
          noWBSPosAnggaran: data.no_wbs_pos_anggaran,
          noSKKI: data.no_skki,
          requestTanggalSE: data.request_tanggal_se,

          createdAt: data.created_at,
          createdBy: data.created_by,
          updatedAt: data.updated_at,
          updatedBy: data.updated_by,
          keterangan: data.keterangan,
          dokumenKontrak: data.dokumen_kontrak,
        };

        // Update local state
        setContracts((prev) => [...prev, transformedData]);
        return transformedData;
      } catch (error) {
        console.error('Error creating contract:', error);
        throw error;
      }
    },
    []
  );

  // Update contract - DENGAN SUPABASE
  const updateContract = useCallback(
    async (id: string, updates: Partial<Contract>) => {
      try {
        // Call API to update in Supabase
        const response = await fetch('/api/contracts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updates }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update contract');
        }

        const { data } = await response.json();

        // Transform snake_case to camelCase - use 'as Contract' for flexibility since API returns full object
        const transformedData = {
          id: data.id,
          no: data.no,
          uraianKegiatan: data.uraian_kegiatan,
          noPerjanjian: data.no_perjanjian,
          tanggalPerjanjian: data.tanggal_perjanjian,
          tanggalBerakhir: data.tanggal_berakhir,
          judulPekerjaan: data.judul_pekerjaan || data.nama_pekerjaan,
          nilaiKontrak: data.nilai_kontrak || data.nilai_perjanjian,
          vendor: data.vendor || data.nama_vendor,
          nilaiTagihanKontrakPusat: data.nilai_tagihan_kontrak_pusat,
          nilaiTagihanUnitInduk: data.nilai_tagihan_unit_induk,
          nilaiBeritaAcara: data.nilai_berita_acara,
          noBeritaAcara: data.no_berita_acara,
          tanggalBeritaAcara: data.tanggal_berita_acara,
          noBeritaAcaraSKRelasi: data.no_berita_acara_sk_relasi,
          tanggalArsip: data.tanggal_arsip,
          noXPS: data.no_xps,
          tanggalXPS: data.tanggal_xps,
          kategori: data.kategori,
          jenisAnggaran: data.jenis_anggaran || data.jenis_ai || 'AO',
          unit: data.unit,
          unitSektorK: data.unit_sektor_k,
          noSKWE: data.no_sk_we,
          posAngg: data.pos_angg,
          noSKUSKKO: data.no_sku_skko,
          requestTanggalSERelasi: data.request_tanggal_se_relasi,
          noSE: data.no_se,
          noPO: data.no_po,
          submissionId: data.submission_id,
          jenisPekerjaan: data.jenis_pekerjaan,
          bebanTahun: data.beban_tahun,
          batasPaguTerbayar: data.batas_pagu_terbayar,
          unitTerbayar: data.unit_terbayar,
          konfirmasiNonRutin: data.konfirmasi_non_rutin,
          bidang: data.bidang,
          picId: data.pic_id,
          picName: data.pic_name,
          entryBy: data.entry_by,
          status: data.status,
          totalTagihanDibayar: data.total_tagihan_dibayar || data.terbayar,
          sisaAnggaran: data.sisa_anggaran,
          persentaseRealisasi: data.persentase_realisasi,
          progressPekerjaan: data.progress_pekerjaan || 0,
          oldFlag: data.old_flag,
          clickCB: data.click_cb,
          createdAt: data.created_at,
          createdBy: data.created_by,
          updatedAt: data.updated_at,
          updatedBy: data.updated_by,
          keterangan: data.keterangan,
          dokumenKontrak: data.dokumen_kontrak,
          // Required fields for Contract type
          judulPRK: data.judul_prk || data.judul_pekerjaan,
          nilaiPerjanjian: data.nilai_perjanjian || data.nilai_kontrak || 0,
          namaVendor: data.nama_vendor || data.vendor,
          vendorEmail: data.vendor_email,
          vendorAccountId: data.vendor_account_id,
          nilaiTagihan: data.nilai_tagihan || 0,
          terbayar: data.terbayar || data.total_tagihan_dibayar || 0,
          statusVIP: data.status_vip || 'belum_lunas',
          namaPekerjaan: data.nama_pekerjaan || data.judul_pekerjaan,
          jenisAI: data.jenis_ai || data.jenis_anggaran || 'AO',
          crNotCR: data.cr_not_cr || 'Not CR',
          // Version tracking
          previousContractId: data.previous_contract_id,
          versionNumber: data.version_number || 1,
        } as Contract;

        // Update local state
        setContracts((prev) =>
          prev.map((c) => (c.id === id ? transformedData : c))
        );

        return transformedData;
      } catch (error) {
        console.error('Error updating contract:', error);
        throw error;
      }
    },
    []
  );

  // Update contract with new version - Creates new contract with new noPerjanjian but keeps noPRK
  const updateContractWithNewVersion = useCallback(
    async (oldContractId: string, updates: Partial<Contract>) => {
      try {
        const oldContract = contracts.find((c) => c.id === oldContractId);
        if (!oldContract) {
          throw new Error('Contract not found');
        }

        // Calculate new version number
        let versionNumber = 1;
        let currentContract: Contract | undefined = oldContract;
        while (currentContract?.previousContractId) {
          versionNumber++;
          currentContract = contracts.find((c) => c.id === currentContract?.previousContractId);
        }
        versionNumber++; // Increment for new version

        // Generate new noPerjanjian with increment
        const generateNewNoPerjanjian = () => {
          const year = new Date().getFullYear();
          const randomNum = Math.floor(Math.random() * 9000) + 1000;
          return `03${randomNum}Pj/STH.01.01/F0107${randomNum}00/${year}`;
        };

        // Build a minimal, validated payload for creating the new contract version.
        // Avoid spreading the entire old contract to prevent sending unexpected large numeric fields.
        const basePayload: Record<string, unknown> = {
          kategori: oldContract.kategori,
          previousContractId: oldContractId,
          versionNumber,
          createdBy: oldContract.createdBy || 'Admin',
        };

        const newNoPerjanjian = generateNewNoPerjanjian();

        let payload: Record<string, unknown> = { ...basePayload };

        if (oldContract.kategori === 'investasi') {
          payload = {
            ...payload,
            noPerjanjian: newNoPerjanjian,
            tanggalPerjanjian: (updates as any).tanggalPerjanjian || oldContract.tanggalPerjanjian || null,
            tanggalBerakhir: (updates as any).tanggalBerakhir || oldContract.tanggalBerakhir || null,
            judulPRK: (updates as any).judulPRK || (updates as any).uraianKegiatan || oldContract.judulPRK || '',
            namaPekerjaan: (updates as any).namaPekerjaan || oldContract.namaPekerjaan || '',
            noPRK: oldContract.noPRK || null,
            nilaiPerjanjian: Number((updates as any).nilaiPerjanjian ?? (updates as any).nilaiKontrak ?? oldContract.nilaiPerjanjian ?? oldContract.nilaiKontrak ?? 0),
            nilaiTagihan: Number((updates as any).nilaiTagihan ?? 0),
            terbayar: Number((updates as any).terbayar ?? 0),
            namaVendor: (updates as any).namaVendor || oldContract.namaVendor || oldContract.vendor || '',
            jenisAI: (updates as any).jenisAI || oldContract.jenisAI || 'AI',
            crNotCR: (updates as any).crNotCR || oldContract.crNotCR || 'Not CR',
            status: (updates as any).status || 'aktif',
            statusVIP: (updates as any).statusVIP || oldContract.statusVIP || 'belum_lunas',
            noWBSPosAnggaran: (updates as any).noWBSPosAnggaran || oldContract.noWBSPosAnggaran || '',
            noSKKI: (updates as any).noSKKI || oldContract.noSKKI || '',
            noSE: (updates as any).noSE || oldContract.noSE || '',
            noPO: (updates as any).noPO || oldContract.noPO || '',
            submissionIdVIP: (updates as any).submissionIdVIP || oldContract.submissionIdVIP || oldContract.submissionId || '',
            unit: (updates as any).unit || oldContract.unit || '',
            uraianKegiatan: (updates as any).uraianKegiatan || (updates as any).judulPRK || oldContract.uraianKegiatan || '',
            keterangan: (updates as any).keterangan || oldContract.keterangan || '',
          };
        } else if (oldContract.kategori === 'pemeliharaan') {
          payload = {
            ...payload,
            noPerjanjian: newNoPerjanjian,
            tanggalPerjanjian: (updates as any).tanggalPerjanjian || oldContract.tanggalPerjanjian || null,
            tanggalBerakhir: (updates as any).tanggalBerakhir || oldContract.tanggalBerakhir || null,
            judulPerjanjian: (updates as any).judulPerjanjian || oldContract.judulPerjanjian || '',
            uraianKegiatan: (updates as any).uraianKegiatan || oldContract.uraianKegiatan || '',
            nilaiKontrak: Number((updates as any).nilaiPerjanjian ?? oldContract.nilaiPerjanjian ?? oldContract.nilaiKontrak ?? 0),
            nilaiTagihan: Number((updates as any).nilaiTagihanKontrakPusat ?? (updates as any).nilaiTagihanPusat ?? 0),
            namaVendor: (updates as any).namaVendor || oldContract.namaVendor || oldContract.vendor || '',
            msb: (updates as any).msb || oldContract.msb || '',
            bidang: (updates as any).bidang || oldContract.bidang || '',
            statusVIP: (updates as any).statusVIP || oldContract.statusVIP || 'belum_lunas',
            periodeAccrueBulan: (updates as any).periodeAccrueBulan || oldContract.periodeAccrueBulan || '',
            periodeAccrueTahun: (updates as any).periodeAccrueTahun || oldContract.periodeAccrueTahun || new Date().getFullYear().toString(),
            terbayarPusat: Number((updates as any).terbayarPusat ?? oldContract.terbayarPusat ?? 0),
            terbayarUnit: Number((updates as any).terbayarUnit ?? oldContract.terbayarUnit ?? 0),
            unit: (updates as any).unit || oldContract.unit || '',
            keterangan: (updates as any).keterangan || oldContract.keterangan || '',
          };
        } else {
          // administrasi
          payload = {
            ...payload,
            noPerjanjian: newNoPerjanjian,
            tanggalPerjanjian: (updates as any).tanggalPerjanjian || oldContract.tanggalPerjanjian || null,
            tanggalBerakhir: (updates as any).tanggalBerakhir || oldContract.tanggalBerakhir || null,
            judulPerjanjian: (updates as any).judulPerjanjian || oldContract.judulPerjanjian || '',
            uraianKegiatan: (updates as any).uraianKegiatan || oldContract.uraianKegiatan || '',
            nilaiPerjanjian: Number((updates as any).nilaiPerjanjian ?? oldContract.nilaiPerjanjian ?? oldContract.nilaiKontrak ?? 0),
            nilaiTagihan: Number((updates as any).nilaiTagihanKeseluruhan ?? oldContract.nilaiTagihanKeseluruhan ?? 0),
            namaVendor: (updates as any).namaVendor || oldContract.namaVendor || oldContract.vendor || '',
            unit: (updates as any).unit || oldContract.unit || '',
            bebanTahun: (updates as any).bebanTahun || oldContract.bebanTahun || new Date().getFullYear().toString(),
            picName: (updates as any).picName || oldContract.picName || '',
            keterangan: (updates as any).keterangan || oldContract.keterangan || '',
          };
        }

        // Ensure numeric values are safe integers where applicable
        if (typeof payload.versionNumber === 'number' && !Number.isSafeInteger(payload.versionNumber)) {
          payload.versionNumber = Number(String(payload.versionNumber).slice(0, 9));
        }

        // Call API to create new contract
        const response = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create new contract version');
        }

        const { data } = await response.json();

        // Transform the response data
        const transformedData: Contract = {
          id: data.id,
          no: data.no,
          uraianKegiatan: data.uraian_kegiatan,
          noPerjanjian: data.no_perjanjian,
          tanggalPerjanjian: data.tanggal_perjanjian,
          tanggalBerakhir: data.tanggal_berakhir,
          judulPekerjaan: data.judul_pekerjaan,
          nilaiKontrak: data.nilai_kontrak,
          vendor: data.vendor,
          nilaiTagihanKontrakPusat: data.nilai_tagihan_kontrak_pusat,
          nilaiTagihanUnitInduk: data.nilai_tagihan_unit_induk,
          nilaiBeritaAcara: data.nilai_berita_acara,
          noBeritaAcara: data.no_berita_acara,
          tanggalBeritaAcara: data.tanggal_berita_acara,
          noBeritaAcaraSKRelasi: data.no_berita_acara_sk_relasi,
          tanggalArsip: data.tanggal_arsip,
          noXPS: data.no_xps,
          tanggalXPS: data.tanggal_xps,
          kategori: data.kategori,
          jenisAnggaran: data.jenis_anggaran,
          unit: data.unit,
          unitSektorK: data.unit_sektor_k,
          noSKWE: data.no_sk_we,
          posAngg: data.pos_angg,
          noSKUSKKO: data.no_sku_skko,
          requestTanggalSERelasi: data.request_tanggal_se_relasi,
          noSE: data.no_se,
          noPO: data.no_po,
          submissionId: data.submission_id,
          jenisPekerjaan: data.jenis_pekerjaan,
          bebanTahun: data.beban_tahun,
          batasPaguTerbayar: data.batas_pagu_terbayar,
          unitTerbayar: data.unit_terbayar,
          konfirmasiNonRutin: data.konfirmasi_non_rutin,
          bidang: data.bidang,
          picId: data.pic_id,
          picName: data.pic_name,
          entryBy: data.entry_by,
          status: data.status,
          totalTagihanDibayar: data.total_tagihan_dibayar || 0,
          sisaAnggaran: data.sisa_anggaran || 0,
          persentaseRealisasi: data.persentase_realisasi || 0,
          progressPekerjaan: data.progress_pekerjaan || 0,
          oldFlag: data.old_flag,
          clickCB: data.click_cb,
          createdAt: data.created_at,
          createdBy: data.created_by,
          updatedAt: data.updated_at,
          updatedBy: data.updated_by,
          keterangan: data.keterangan,
          dokumenKontrak: data.dokumen_kontrak,
          previousContractId: oldContractId,
          versionNumber: versionNumber,
          // Keep investment-specific fields
          judulPRK: data.judul_prk || oldContract.judulPRK,
          namaPekerjaan: data.nama_pekerjaan || oldContract.namaPekerjaan,
          noPRK: oldContract.noPRK, // Ensure noPRK stays the same
          nilaiPerjanjian: data.nilai_perjanjian,
          nilaiTagihan: data.nilai_tagihan,
          namaVendor: data.nama_vendor,
          vendorEmail: data.vendor_email,
          vendorAccountId: data.vendor_account_id,
          terbayar: data.terbayar,
          jenisAI: data.jenis_ai,
          crNotCR: data.cr_not_cr,
          statusVIP: data.status_vip,
          noWBSPosAnggaran: data.no_wbs_pos_anggaran,
          noSKKI: data.no_skki,
          requestTanggalSE: data.request_tanggal_se,
          submissionIdVIP: data.submission_id_vip,
        };

        // Add new contract to local state
        setContracts((prev) => [...prev, transformedData]);

        return transformedData;
      } catch (error) {
        console.error('Error creating new contract version:', error);
        throw error;
      }
    },
    [contracts]
  );

  // Create invoice - DENGAN SUPABASE
  const createInvoice = useCallback(
    async (invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">) => {
      try {
        // Call API to save to Supabase
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create invoice');
        }

        const { data } = await response.json();

        // Transform snake_case to camelCase
        const transformedData: Invoice = {
          id: data.id,
          contractId: data.contract_id,
          noPerjanjian: data.no_perjanjian,
          nomorTagihan: data.nomor_tagihan,
          tanggalTagihan: data.tanggal_tagihan,
          nilaiTagihan: data.nilai_tagihan,
          noBeritaAcara: data.no_berita_acara,
          tanggalBeritaAcara: data.tanggal_berita_acara,
          tanggalArsip: data.tanggal_arsip,
          noXPS: data.no_xps,
          tanggalXPS: data.tanggal_xps,
          status: data.status,
          tanggalDiajukan: data.tanggal_diajukan,
          tanggalVerifikasi: data.tanggal_verifikasi,
          keterangan: data.keterangan,
          diajukanOleh: data.diajukan_oleh,
          diajukanOlehName: data.diajukan_oleh_name,
          dibayarOleh: data.dibayar_oleh,
          dokumenTagihan: data.dokumen_tagihan,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        // Update local state
        setInvoices((prev) => [...prev, transformedData]);
        return transformedData;
      } catch (error) {
        console.error('Error creating invoice:', error);
        throw error;
      }
    },
    []
  );

  // Update invoice - DENGAN SUPABASE
  const updateInvoice = useCallback(
    async (id: string, updates: Partial<Invoice>) => {
      try {
        // Call API to update in Supabase
        const response = await fetch('/api/invoices', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updates }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update invoice');
        }

        const { data } = await response.json();

        // Transform snake_case to camelCase
        const transformedData: Invoice = {
          id: data.id,
          contractId: data.contract_id,
          noPerjanjian: data.no_perjanjian,
          nomorTagihan: data.nomor_tagihan,
          tanggalTagihan: data.tanggal_tagihan,
          nilaiTagihan: data.nilai_tagihan,
          noBeritaAcara: data.no_berita_acara,
          tanggalBeritaAcara: data.tanggal_berita_acara,
          tanggalArsip: data.tanggal_arsip,
          noXPS: data.no_xps,
          tanggalXPS: data.tanggal_xps,
          status: data.status,
          tanggalDiajukan: data.tanggal_diajukan,
          tanggalVerifikasi: data.tanggal_verifikasi,
          keterangan: data.keterangan,
          diajukanOleh: data.diajukan_oleh,
          diajukanOlehName: data.diajukan_oleh_name,
          dibayarOleh: data.dibayar_oleh,
          dokumenTagihan: data.dokumen_tagihan,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        // Update local state
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === id ? transformedData : inv))
        );

        return transformedData;
      } catch (error) {
        console.error('Error updating invoice:', error);
        throw error;
      }
    },
    []
  );

  // Update invoice status - DENGAN SUPABASE
  // Note: tanggal_verifikasi akan auto-update via database trigger saat status berubah
  // dibayarOleh hanya diisi saat status = dibayar
  const updateInvoiceStatus = useCallback(
    async (id: string, status: InvoiceStatus, dibayarOleh?: string) => {
      const updates: Partial<Invoice> = { status };

      // Tambahkan dibayarOleh jika status dibayar
      if (status === "dibayar" && dibayarOleh) {
        updates.dibayarOleh = dibayarOleh;
      }

      return updateInvoice(id, updates);
    },
    [updateInvoice]
  );

  // Recalculate contract totals
  const recalculateContractTotals = useCallback(
    (contractId: string) => {
      const contractInvoices = invoices.filter(
        (inv) => inv.contractId === contractId && inv.status === "dibayar"
      );
      const totalDibayar = contractInvoices.reduce((sum, inv) => sum + inv.nilaiTagihan, 0);

      setContracts((prev) =>
        prev.map((c) => {
          if (c.id === contractId) {
            return {
              ...c,
              totalTagihanDibayar: totalDibayar,
              sisaAnggaran: c.nilaiKontrak - totalDibayar,
              persentaseRealisasi: (totalDibayar / c.nilaiKontrak) * 100,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        })
      );
    },
    [invoices]
  );

  const value = useMemo(
    () => ({
      contracts,
      invoices,
      alerts,
      isLoading,
      refreshData: loadDataFromSupabase,
      getContractById,
      getInvoiceById,
      getInvoicesByContract,
      getContractHistory,
      getDashboardSummary,
      filterContracts,
      filterInvoices,
      createContract,
      addContract: createContract, // Alias untuk createContract
      updateContract,
      updateContractWithNewVersion,
      createInvoice,
      updateInvoice,
      updateInvoiceStatus,
      markAlertAsRead,
      markAllAlertsAsRead,
      recalculateContractTotals,
    }),
    [
      contracts,
      invoices,
      alerts,
      isLoading,
      loadDataFromSupabase,
      getContractById,
      getInvoiceById,
      getInvoicesByContract,
      getContractHistory,
      getDashboardSummary,
      filterContracts,
      filterInvoices,
      createContract,
      updateContract,
      updateContractWithNewVersion,
      createInvoice,
      updateInvoice,
      updateInvoiceStatus,
      markAlertAsRead,
      markAllAlertsAsRead,
      recalculateContractTotals,
    ]
  );

  return (
    <ContractStoreContext.Provider value={value}>
      {children}
    </ContractStoreContext.Provider>
  );
}

export function useContractStore() {
  const context = useContext(ContractStoreContext);
  if (context === undefined) {
    throw new Error("useContractStore must be used within a ContractStoreProvider");
  }
  return context;
}
