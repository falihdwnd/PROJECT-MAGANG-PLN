// ============================================
// TYPE DEFINITIONS - SISTEM MONITORING KONTRAK & TAGIHAN
// Fokus: Monitoring Anggaran, Status Tagihan, Pembayaran
// ============================================

// ============================================
// USER & ROLE (Disederhanakan)
// Hanya 2 role: Admin (Operator) dan Viewer (Manajer)
// ============================================

export type UserRole = "admin" | "viewer" | "vendor";

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  unit: string;
  createdAt: string;
  lastLogin?: string;
  // Vendor-specific fields
  vendorAccountId?: string;      // ID akun vendor (vendor_accounts.id)
  contractId?: string;           // ID kontrak terkait (untuk vendor)
  vendorCompany?: string;        // Nama perusahaan vendor
  isActive?: boolean;            // Status aktif akun vendor
  activatedAt?: string;          // Tanggal aktivasi
  expiresAt?: string;            // Tanggal berakhir (= tanggal berakhir kontrak)
}

// ============================================
// VENDOR ACCOUNT
// ============================================

export interface VendorAccount {
  id: string;
  email: string;
  vendorName: string;
  vendorCompany: string;
  isActive: boolean;
  activatedAt?: string;
  activeUntil: string;             // = tanggalBerakhir kontrak
  createdAt: string;
  temporaryPassword?: string;     // Only shown once during creation
}

// ============================================
// APPROVAL REQUESTS
// ============================================

export type ApprovalStatus = "pending" | "approved" | "rejected" | "negotiation";
export type ApprovalType = 
  | "update_kontrak"       // Approve Update Kontrak
  | "invoice_payment"      // Kelola Invoice (Bayar/Tolak)
  | "pengajuan_tagihan"    // Pengajuan Tagihan (Legacy/Backend mapping)
  | "update_progress"      // Approve Update Progress
  | "perpanjangan_kontrak"; // Review Pengajuan Perpanjangan

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  contractId: string;            // Either investment, maintenance, or administration ID
  contractType?: 'investment' | 'maintenance' | 'administration'; // Type of contract
  invoiceId?: string;            // For invoice-related approvals
  requestedBy: string;           // User ID yang mengajukan
  requestedByName: string;
  requestedAt: string;
  
  // Status
  status: ApprovalStatus;
  reviewedBy?: string;           // Admin yang mereview
  reviewedByName?: string;
  reviewedAt?: string;
  
  // Details based on type
  title: string;
  description: string;
  dokumenPendukung?: string;     // URL/path to the file

  // For update_kontrak - revision/negotiation
  proposedValue?: number;        // Nilai kontrak yang diajukan
  currentValue?: number;         // Nilai kontrak saat ini
  negotiatedValue?: number;      // Nilai hasil negosiasi
  alasan?: string;               // Alasan update kontrak
  
  // For invoice_payment (tagihan)
  paymentProof?: string;         // Bukti pembayaran (URL/path)
  rejectionReason?: string;      // Alasan penolakan
  tanggalJatuhTempo?: string;    // Tanggal jatuh tempo
  
  // For update_progress
  proposedProgress?: number;     // Progress yang diajukan (progress_baru)
  currentProgress?: number;      // Progress saat ini (progress_sekarang)
  dokumenBuktiProjek?: string;   // Dokumen bukti projek
  
  // For perpanjangan_kontrak
  proposedEndDate?: string;      // Tanggal akhir yang diajukan (tanggal_perpanjang)
  currentEndDate?: string;       // Tanggal akhir saat ini
  negotiatedEndDate?: string;    // Tanggal akhir hasil negosiasi (negosiasi_tanggal_akhir)
  alasanPerpanjang?: string;     // Alasan perpanjangan
  
  createdAt: string;
  updatedAt: string;
}

// ============================================
// KONTRAK (Proyek yang sudah memiliki perjanjian)
// ============================================

export type ContractStatus = "aktif" | "selesai" | "bermasalah";
export type ContractCategory = "investasi" | "pemeliharaan" | "administrasi";
export type JenisAnggaran = "AI" | "AO"; // AI = Anggaran Investasi, AO = Anggaran Operasi
export type StatusVIP = "lunas" | "belum_lunas" | "dokumen_tidak_lengkap";
export type CRStatus = "CR" | "Not CR";

export interface Contract {
  id: string;
  no: number;                     // Nomor urut

  // ============================================
  // FIELD KHUSUS KATEGORI INVESTASI
  // ============================================

  // Identitas Kontrak (Input Manual)
  noPerjanjian: string;           // Nomor Perjanjian/Amandemen (auto-generate: 03xxPj/STH.xx.xx/F0107xxxx00/xxxx)
  tanggalPerjanjian: string;      // Tanggal Perjanjian/Amandemen
  tanggalBerakhir: string;        // Tanggal Berakhir
  judulPRK: string;               // Judul PRK
  nilaiPerjanjian: number;        // Nilai Perjanjian
  namaVendor: string;             // Nama Vendor
  vendorEmail?: string;           // Email Vendor (untuk akun temporary)
  vendorAccountId?: string;       // Relasi ke vendor_accounts
  nilaiTagihan: number;           // Nilai Tagihan/Nominal

  // Field Auto-Generate
  noBeritaAcara?: string;         // No. Berita Acara (auto-generate: xxxx/JKO/2024/012)
  tanggalBeritaAcara?: string;    // Tanggal Berita Acara (auto saat submit form tambah tagihan)
  noWBSPosAnggaran?: string;      // No. WBS/Pos Anggaran (auto-generate: I.1001.23.21.0805.008)
  noSKKI?: string;                // No. SKKI (auto-generate: xxxx/KEU.00.03/EVP MUM/2024)
  requestTanggalSE?: string;      // Tanggal Request SE (auto saat status tagihan berubah dari "diajukan" ke "diterima")
  noSE?: string;                  // No. SE (auto-generate: 100369xxxx)
  noPO?: string;                  // No. PO (auto-generate: 310148xxxx)
  submissionIdVIP?: string;       // Submission ID - Vendor Invoicing Portal (auto-generate: TRE-V/xxxx/xxxx/00000xxxxx)

  // Status VIP (Lunas jika serapan 100%, Belum Lunas saat baru dibuat, Dokumen Tidak Lengkap bisa diedit admin)
  statusVIP: StatusVIP;

  // Terbayar (calculated)
  terbayar: number;

  // Status Kontrak (Lunas jika serapan 100%, Belum Lunas saat baru dibuat, Bermasalah bisa diedit admin)
  status: ContractStatus;

  // Detail Pekerjaan
  namaPekerjaan: string;          // Nama Pekerjaan
  jenisAI: JenisAnggaran;         // Jenis AI
  noPRK?: string;                 // No.PRK (auto-generate: (tahun).KPST.21.xxx)
  crNotCR: CRStatus;              // CR/Not CR

  // ============================================
  // FIELD UMUM (untuk semua kategori)
  // ============================================

  // Backward compatibility fields (mapped from new fields)
  uraianKegiatan: string;         // Uraian Kegiatan/Mata Anggaran
  judulPekerjaan: string;         // Judul Perjanjian (mapped from judulPRK/namaPekerjaan)
  nilaiKontrak: number;           // Nilai Perjanjian (mapped from nilaiPerjanjian)
  vendor: string;                 // Nama Vendor (mapped from namaVendor)

  // Tagihan (legacy)
  nilaiTagihanKontrakPusat: number;  // Nilai Tagihan/Klaim Kontrak Pusat
  nilaiTagihanUnitInduk: number;     // Nilai Tagihan/Unit Induk Kantor Pusat
  nilaiBeritaAcara?: number;         // Sdr/Tagihan (Nilai Berita Acara)

  // Berita Acara (legacy)
  noBeritaAcaraSKRelasi?: string; // No Berita Acara SK/Relasi

  // Arsip
  tanggalArsip?: string;          // Tanggal Arsip

  // XPS (Sistem Pembayaran)
  noXPS?: string;                 // No XPS
  tanggalXPS?: string;            // Tanggal XPS

  // Kategori & Unit
  kategori: ContractCategory;     // Investasi / Pemeliharaan / Administrasi
  jenisAnggaran: JenisAnggaran;   // AI (Anggaran Investasi) atau AO (Anggaran Operasi)
  unit: string;
  unitSektorK?: string;           // Unit Sektor K

  // SK/WE & PO (legacy)
  noSKWE?: string;                // No SK/WE
  posAngg?: string;               // Pos Angg (legacy, mapped to noWBSPosAnggaran)
  noSKUSKKO?: string;             // No SKU/SKKO (legacy, mapped to noSKKI)
  requestTanggalSERelasi?: string; // Request tanggal SE Relasi (legacy, mapped to requestTanggalSE)
  submissionId?: string;          // Submission ID (legacy, mapped to submissionIdVIP)

  // Detail Pekerjaan (legacy)
  jenisPekerjaan?: string;        // Jenis Pekerjaan
  bebanTahun?: string;            // Beban tahun
  batasPaguTerbayar?: number;     // Batas pagu Terbayar
  unitTerbayar?: string;          // Unit Terbayar
  konfirmasiNonRutin?: string;    // rangan/Konfirmasi/Non Rutin
  bidang?: string;                // BIDANG

  // ============================================
  // FIELD KHUSUS KATEGORI PEMELIHARAAN
  // ============================================

  judulPerjanjian?: string;       // Judul Perjanjian
  msb?: string;                   // MSB
  periodeAccrueBulan?: string;    // Periode Accrue - Bulan
  periodeAccrueTahun?: string;    // Periode Accrue - Tahun
  periodeAccrue?: string;         // Periode Accrue (combined)
  requestedBy?: string;           // Requested By
  tanggalRequestSE?: string;      // Tanggal Request SE
  tanggalSERilis?: string;        // Tanggal SE Rilis
  terbayarPusat?: number;         // Terbayar STI Pusat
  terbayarUnit?: number;          // Terbayar Unit
  terbayarSTIPusat?: number;      // Alias for terbayarPusat
  statusTerbayar?: string;        // Status Terbayar (Belum Terbayar, Sebagian Terbayar, Lunas)
  rutinNonRutin?: string;         // Rutin/Non Rutin
  nilaiTagihanSTIPusat?: number;  // Nilai Tagihan STI Pusat

  // ============================================
  // FIELD KHUSUS KATEGORI ADMINISTRASI
  // ============================================

  nilaiTagihanKeseluruhan?: number;      // Nilai Tagihan Keseluruhan
  nilaiTagihanKantorPusat?: number;      // Nilai Tagihan Kantor Pusat
  nilaiTagihanUnitSelainPusat?: number;  // Nilai Tagihan Unit Selain Pusat
  noSKKISKKO?: string;                   // No. SKKI/SKKO
  tanggalRequest?: string;               // Tanggal Request
  tanggalSERelease?: string;             // Tanggal SE Release
  statusBayar?: "belum_terbayar" | "sebagian_terbayar" | "lunas"; // Status Bayar
  keteranganKonfirmasi?: string;         // Keterangan/Konfirmasi
  pic?: string;                          // PIC

  // PIC
  picId?: string;
  picName?: string;
  entryBy?: string;               // Entry by

  // Status & calculated fields
  totalTagihanDibayar: number;    // Total yang sudah dibayar (mapped from terbayar)
  sisaAnggaran: number;           // nilaiKontrak - totalTagihanDibayar
  persentaseRealisasi: number;    // (totalTagihanDibayar / nilaiKontrak) * 100
  progressPekerjaan: number;      // Progress pekerjaan 0-100%

  // Flags
  oldFlag?: string;               // Old Flag
  clickCB?: boolean;              // Click CB

  // Metadata
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;

  // Optional
  keterangan?: string;
  dokumenKontrak?: string;        // URL/path dokumen

  // Contract Version History
  previousContractId?: string;    // ID kontrak sebelumnya (untuk tracking history)
  versionNumber?: number;         // Nomor versi kontrak (1, 2, 3, dst)
}

// ============================================
// TAGIHAN (Invoice/Berita Acara)
// ============================================

export type InvoiceStatus =
  | "ditolak"       // Ditolak
  | "dibayar";      // Sudah dibayar

export interface Invoice {
  id: string;
  contractId: string;             // FK ke Contract
  noPerjanjian: string;           // Denormalized untuk display

  // Identitas tagihan
  nomorTagihan: string;           // Nomor berita acara/invoice
  tanggalTagihan: string;
  nilaiTagihan: number;

  // Berita Acara
  noBeritaAcara?: string;         // No Berita Acara
  tanggalBeritaAcara?: string;    // Tanggal Berita Acara

  // Arsip
  tanggalArsip?: string;          // Tanggal Arsip

  // XPS (Sistem Pembayaran)
  noXPS?: string;                 // No XPS
  tanggalXPS?: string;            // Tanggal XPS

  // Status & tracking
  status: InvoiceStatus;          // ditolak, dibayar

  // Tanggal tracking
  tanggalDiajukan: string;        // Tanggal pertama kali diajukan
  tanggalVerifikasi?: string;     // Tanggal saat status berubah (auto-update)

  // Notes
  keterangan?: string;

  // User tracking
  diajukanOleh: string;
  diajukanOlehName: string;
  dibayarOleh?: string;           // Nama orang yang membayar (diisi saat status = dibayar)

  // Dokumen pendukung
  dokumenTagihan?: string;        // URL/path dokumen

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================
// DASHBOARD SUMMARY
// ============================================

export interface DashboardSummary {
  // Kontrak
  totalKontrakAktif: number;
  totalNilaiKontrak: number;
  totalDibayar: number;
  totalSisaAnggaran: number;
  persentaseRealisasiGlobal: number;

  // Per Kategori
  kontrakInvestasi: number;
  kontrakPemeliharaan: number;
  kontrakAdministrasi: number;
  nilaiInvestasi: number;
  nilaiPemeliharaan: number;
  nilaiAdministrasi: number;

  // Tagihan
  totalTagihan: number;
  tagihanDiajukan: number;
  tagihanDiterima: number;
  tagihanDibayar: number;
  tagihanDitolak: number;

  // Alerts
  kontrakHampirHabis: number;     // Kontrak dengan sisa < 10%
  tagihanPendingLama: number;     // Tagihan pending > 7 hari
  kontrakAkanBerakhir: number;    // Kontrak akan berakhir < 30 hari
}

// ============================================
// FILTER & PAGINATION
// ============================================

export interface ContractFilters {
  status?: ContractStatus | "all";
  kategori?: ContractCategory | "all";
  unit?: string;
  vendor?: string;
  periodeStart?: string;
  periodeEnd?: string;
  search?: string;
}

export interface InvoiceFilters {
  status?: InvoiceStatus | "all";
  contractId?: string;
  periodeStart?: string;
  periodeEnd?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================
// ALERT / NOTIFIKASI
// ============================================

export type AlertType =
  | "tagihan_pending_lama"
  | "kontrak_hampir_habis"
  | "kontrak_akan_berakhir"
  | "tagihan_ditolak";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  contractId?: string;
  invoiceId?: string;
  createdAt: string;
  readAt?: string;
}

// ============================================
// REPORT PARAMS
// ============================================

export interface ReportParams {
  type: "ringkasan" | "realisasi" | "tagihan" | "kontrak";
  periodeStart?: string;
  periodeEnd?: string;
  unit?: string;
  contractId?: string;
  format: "pdf" | "excel";
}

// ============================================
// AUDIT LOG
// ============================================

export interface AuditLog {
  id: string;
  entityType: "contract" | "invoice";
  entityId: string;
  action: "create" | "update" | "delete" | "status_change";
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedByName: string;
  performedAt: string;
}
