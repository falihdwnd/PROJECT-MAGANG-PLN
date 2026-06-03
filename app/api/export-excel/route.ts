import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ContractData {
  id: string;
  no: number;
  kategori: "investasi" | "pemeliharaan" | "administrasi";

  // Common fields
  noPerjanjian: string;
  tanggalPerjanjian: string;
  tanggalBerakhir: string;
  nilaiPerjanjian?: number;
  nilaiKontrak?: number;
  namaVendor?: string;
  vendor?: string;
  nilaiTagihan?: number;
  noBeritaAcara?: string;
  tanggalBeritaAcara?: string;
  noSKKI?: string;
  noSE?: string;
  noPO?: string;
  submissionIdVIP?: string;
  submissionId?: string;
  statusVIP?: string;
  terbayar?: number;
  totalTagihanDibayar?: number;

  // Investasi specific
  judulPRK?: string;
  noWBSPosAnggaran?: string;
  requestTanggalSE?: string;
  tanggalSERilis?: string;
  namaPekerjaan?: string;
  jenisAI?: string;
  noPRK?: string;
  crNotCR?: string;
  clickCB?: boolean;

  // Pemeliharaan specific
  jenisAnggaran?: string;
  bidang?: string;
  judulPerjanjian?: string;
  msb?: string;
  periodeAccrueBulan?: string;
  periodeAccrueTahun?: string;
  requestedBy?: string;
  tanggalRequestSE?: string;
  terbayarPusat?: number;
  terbayarUnit?: number;
  statusTerbayar?: string;
  rutinNonRutin?: string;

  // Administrasi specific
  uraianKegiatan?: string;
  bebanTahun?: string;
  unitSektorK?: string;
  posAngg?: string;
  batasPaguTerbayar?: number;
  entryBy?: string;
  konfirmasiNonRutin?: string;
  keterangan?: string;
  noXPS?: string;
  tanggalXPS?: string;
  picName?: string;

  // Legacy/calculated fields
  unit?: string;
  status?: string;
  sisaAnggaran?: number;
  persentaseRealisasi?: number;
  progressPekerjaan?: number;
}

// ============================================
// COLUMN DEFINITIONS PER CATEGORY
// ============================================

const INVESTASI_COLUMNS = [
  { header: "No Perjanjian/Amandemen", key: "noPerjanjian", width: 35 },
  { header: "Tanggal Perjanjian/Amandemen", key: "tanggalPerjanjian", width: 25, isDate: true },
  { header: "Tanggal Berakhir", key: "tanggalBerakhir", width: 18, isDate: true },
  { header: "Judul PRK", key: "judulPRK", width: 45 },
  { header: "Nilai Perjanjian", key: "nilaiPerjanjian", width: 22, isCurrency: true },
  { header: "Nama Vendor", key: "namaVendor", width: 28 },
  { header: "Nilai Tagihan/Nominal", key: "nilaiTagihan", width: 22, isCurrency: true },
  { header: "No Berita Acara", key: "noBeritaAcara", width: 22 },
  { header: "Tanggal Berita Acara", key: "tanggalBeritaAcara", width: 20, isDate: true },
  { header: "No WBS/Pos Anggaran", key: "noWBSPosAnggaran", width: 25 },
  { header: "No SKKI", key: "noSKKI", width: 30 },
  { header: "Tanggal Request SE", key: "requestTanggalSE", width: 20, isDate: true },
  { header: "Tanggal SE Relase", key: "tanggalSERilis", width: 18, isDate: true },
  { header: "No SE", key: "noSE", width: 18 },
  { header: "No PO", key: "noPO", width: 18 },
  { header: "Submission ID Vendor Invoicing Portal", key: "submissionIdVIP", width: 35 },
  { header: "Status VIP", key: "statusVIP", width: 18 },
  { header: "Terbayar", key: "terbayar", width: 22, isCurrency: true },
  { header: "Nama Pekerjaan", key: "namaPekerjaan", width: 45 },
  { header: "Jenis AI", key: "jenisAI", width: 12 },
  { header: "No. PRK", key: "noPRK", width: 22 },
  { header: "CR/Not CR", key: "crNotCR", width: 12 },
  { header: "Click CB", key: "clickCB", width: 10 },
];

const PEMELIHARAAN_COLUMNS = [
  { header: "No", key: "no", width: 6 },
  { header: "Jenis Anggaran/Mata Anggaran", key: "jenisAnggaran", width: 28 },
  { header: "No Perjanjian/Amandemen", key: "noPerjanjian", width: 35 },
  { header: "Tanggal Perjanjian/Amandemen", key: "tanggalPerjanjian", width: 25, isDate: true },
  { header: "Tanggal Berakhir", key: "tanggalBerakhir", width: 18, isDate: true },
  { header: "Nilai Perjanjian", key: "nilaiPerjanjian", width: 22, isCurrency: true },
  { header: "Nilai Tagihan", key: "nilaiTagihan", width: 22, isCurrency: true },
  { header: "Bidang", key: "bidang", width: 35 },
  { header: "No Berita Acara", key: "noBeritaAcara", width: 22 },
  { header: "Tanggal Berita Acara", key: "tanggalBeritaAcara", width: 20, isDate: true },
  { header: "KEBK/SKU/SKKO", key: "noSKKI", width: 28 },
  { header: "Request Tanggal SE Relasi", key: "requestTanggalSE", width: 22, isDate: true },
  { header: "No SE", key: "noSE", width: 18 },
  { header: "No PO", key: "noPO", width: 18 },
  { header: "Submission ID", key: "submissionIdVIP", width: 30 },
  { header: "Status VIP", key: "statusVIP", width: 18 },
  { header: "Terbayar", key: "terbayar", width: 22, isCurrency: true },
  { header: "Nama Vendor", key: "namaVendor", width: 28 },
  { header: "Judul Perjanjian", key: "judulPerjanjian", width: 45 },
  { header: "MSB", key: "msb", width: 15 },
  { header: "Periode Accrue Bulan", key: "periodeAccrueBulan", width: 18 },
  { header: "Periode Accrue Tahun", key: "periodeAccrueTahun", width: 18 },
  { header: "Requested By", key: "requestedBy", width: 20 },
  { header: "Tanggal Request SE", key: "tanggalRequestSE", width: 18, isDate: true },
  { header: "Tanggal SE Rilis", key: "tanggalSERilis", width: 18, isDate: true },
  { header: "Terbayar STI Pusat", key: "terbayarPusat", width: 20, isCurrency: true },
  { header: "Terbayar Unit", key: "terbayarUnit", width: 18, isCurrency: true },
  { header: "Status Terbayar", key: "statusTerbayar", width: 16 },
  { header: "Rutin/Non Rutin", key: "rutinNonRutin", width: 16 },
];

const ADMINISTRASI_COLUMNS = [
  { header: "No", key: "no", width: 6 },
  { header: "Uraian Kegiatan/Mata Anggaran", key: "uraianKegiatan", width: 35 },
  { header: "No Perjanjian/Amandemen", key: "noPerjanjian", width: 35 },
  { header: "Tanggal Perjanjian/Amandemen", key: "tanggalPerjanjian", width: 25, isDate: true },
  { header: "Tanggal Berakhir", key: "tanggalBerakhir", width: 18, isDate: true },
  { header: "Judul Perjanjian", key: "judulPerjanjian", width: 45 },
  { header: "Nilai Perjanjian", key: "nilaiPerjanjian", width: 22, isCurrency: true },
  { header: "Nama Vendor", key: "namaVendor", width: 28 },
  { header: "Yg Dibebankan Khusus Kar K", key: "bebanTahun", width: 25 },
  { header: "Unit Sektor K", key: "unitSektorK", width: 20 },
  { header: "No Berita Acara", key: "noBeritaAcara", width: 22 },
  { header: "Tanggal Berita Acara", key: "tanggalBeritaAcara", width: 20, isDate: true },
  { header: "Ac/Stb/Pos Ang", key: "posAngg", width: 18 },
  { header: "No SKU/SKKO", key: "noSKKI", width: 25 },
  { header: "Request Tanggal SE Relasi", key: "requestTanggalSE", width: 22, isDate: true },
  { header: "No SE", key: "noSE", width: 18 },
  { header: "No PO", key: "noPO", width: 18 },
  { header: "Submission ID", key: "submissionIdVIP", width: 30 },
  { header: "Batas Pagu Terbayar", key: "batasPaguTerbayar", width: 20, isCurrency: true },
  { header: "Terbayar", key: "terbayar", width: 22, isCurrency: true },
  { header: "Entry By", key: "entryBy", width: 18 },
  { header: "Konfirmasi/Non Rutin", key: "konfirmasiNonRutin", width: 20 },
  { header: "Keterangan", key: "keterangan", width: 30 },
  { header: "No. XPS", key: "noXPS", width: 18 },
  { header: "Tanggal XPS", key: "tanggalXPS", width: 16, isDate: true },
  { header: "PIC", key: "picName", width: 18 },
  { header: "Bidang", key: "bidang", width: 20 },
];

// ============================================
// STYLING CONSTANTS
// ============================================

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF005B9C" }, // PLN Blue
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 10,
  name: "Segoe UI",
};

const TITLE_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 14,
  name: "Segoe UI",
  color: { argb: "FF0F172A" }, // Slate 900
};

const SUBTITLE_FONT: Partial<ExcelJS.Font> = {
  size: 9.5,
  name: "Segoe UI",
  color: { argb: "FF475569" }, // Slate 600
};

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },    // Slate 300
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

const HEADER_BORDER_STYLE: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF004E85" } },
  left: { style: "thin", color: { argb: "FF004E85" } },
  bottom: { style: "medium", color: { argb: "FF004E85" } },
  right: { style: "thin", color: { argb: "FF004E85" } },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDateForExcel(dateString: string): Date | string {
  if (!dateString) return "-";
  try {
    return new Date(dateString);
  } catch {
    return dateString;
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    aktif: "Aktif",
    selesai: "Selesai",
    bermasalah: "Bermasalah",
  };
  return labels[status] || status;
}

// Convert column number to Excel letter (1 = A, 26 = Z, 27 = AA, etc.)
function getExcelColumnLetter(colNumber: number): string {
  let letter = "";
  let temp = colNumber;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

interface ColumnDef {
  header: string;
  key: string;
  width: number;
  isDate?: boolean;
  isCurrency?: boolean;
}

function createWorksheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  columns: ColumnDef[],
  data: ContractData[]
): void {
  const worksheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: sheetName === "Investasi" ? "FF3B82F6" : sheetName === "Pemeliharaan" ? "FFF59E0B" : "FF8B5CF6" } },
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Enable grid lines explicitly
  worksheet.views = [{ showGridLines: true }];

  // Find letters for KPI columns
  let paguColLetter = "E"; // default fallback
  let terbayarColLetter = "R"; // default fallback
  let countColLetter = "A"; // default fallback

  columns.forEach((col, index) => {
    const letter = getExcelColumnLetter(index + 1);
    if (col.key === "nilaiPerjanjian") paguColLetter = letter;
    if (col.key === "terbayar") terbayarColLetter = letter;
    if (col.key === "noPerjanjian") countColLetter = letter;
  });

  // ============================================
  // TITLE SECTION (Row 1-6)
  // ============================================

  const lastCol = getExcelColumnLetter(columns.length);
  worksheet.mergeCells(`A1:${lastCol}1`);
  worksheet.mergeCells(`A3:${lastCol}3`);
  worksheet.mergeCells(`A4:${lastCol}4`);
  worksheet.mergeCells(`A5:${lastCol}5`);
  worksheet.mergeCells(`A6:${lastCol}6`);

  // Classification Header
  const classCell = worksheet.getCell("A1");
  classCell.value = "KLASIFIKASI DATA: INTERNAL PT PLN (PERSERO) - TERBATAS";
  classCell.font = { name: "Segoe UI", size: 8, bold: true, italic: true, color: { argb: "FF64748B" } };
  classCell.alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getRow(1).height = 16;

  worksheet.getRow(2).height = 10;

  // Institution Header
  const instCell = worksheet.getCell("A3");
  instCell.value = "PT PLN (PERSERO) KANTOR PUSAT";
  instCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF005B9C" } };
  instCell.alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getRow(3).height = 18;

  // System subtitle
  const sysCell = worksheet.getCell("A4");
  sysCell.value = "Sistem Informasi Monitoring Anggaran & Proyek (SIMAP)";
  sysCell.font = { name: "Segoe UI", size: 9, color: { argb: "FF64748B" } };
  sysCell.alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getRow(4).height = 16;

  // Title
  const titleCell = worksheet.getCell("A5");
  titleCell.value = title;
  titleCell.font = TITLE_FONT;
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getRow(5).height = 26;

  // Date generated
  const dateCell = worksheet.getCell("A6");
  const now = new Date();
  dateCell.value = `Dicetak pada: ${now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
  dateCell.font = { ...SUBTITLE_FONT, italic: true, size: 8.5 };
  dateCell.alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getRow(6).height = 16;

  worksheet.getRow(7).height = 10;

  // ============================================
  // EXECUTIVE SUMMARY KPI CARDS (Rows 8-10)
  // ============================================

  // Border style for KPI cards
  const cardBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };

  // Helper to apply borders to ranges
  const applyCardBorders = (startR: number, endR: number, startC: number, endC: number) => {
    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        const cell = worksheet.getCell(r, c);
        cell.border = cardBorder;
      }
    }
  };

  const dataEndRow = 13 + (data.length > 0 ? data.length : 1);

  // Card 1: Volume Kontrak (B8:C10)
  worksheet.mergeCells("B8:C8");
  worksheet.mergeCells("B9:C10");
  const card1Title = worksheet.getCell("B8");
  card1Title.value = "Volume Kontrak";
  card1Title.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF64748B" } };
  card1Title.alignment = { horizontal: "center", vertical: "middle" };
  card1Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

  const card1Value = worksheet.getCell("B9");
  card1Value.value = {
    formula: `COUNTA(${countColLetter}14:${countColLetter}${dataEndRow})`,
    result: data.length
  };
  card1Value.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF005B9C" } };
  card1Value.alignment = { horizontal: "center", vertical: "middle" };
  card1Value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  applyCardBorders(8, 10, 2, 3);

  // Card 2: Total Pagu Anggaran (E8:G8, E9:G10)
  worksheet.mergeCells("E8:G8");
  worksheet.mergeCells("E9:G10");
  const card2Title = worksheet.getCell("E8");
  card2Title.value = "Total Pagu Anggaran";
  card2Title.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF64748B" } };
  card2Title.alignment = { horizontal: "center", vertical: "middle" };
  card2Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

  const card2Value = worksheet.getCell("E9");
  card2Value.value = {
    formula: `SUM(${paguColLetter}14:${paguColLetter}${dataEndRow})`,
    result: 0
  };
  card2Value.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FF0F172A" } };
  card2Value.alignment = { horizontal: "center", vertical: "middle" };
  card2Value.numFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
  card2Value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  applyCardBorders(8, 10, 5, 7);

  // Card 3: Total Realisasi Bayar (I8:K8, I9:K10)
  worksheet.mergeCells("I8:K8");
  worksheet.mergeCells("I9:K10");
  const card3Title = worksheet.getCell("I8");
  card3Title.value = "Total Realisasi Bayar";
  card3Title.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF64748B" } };
  card3Title.alignment = { horizontal: "center", vertical: "middle" };
  card3Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

  const card3Value = worksheet.getCell("I9");
  card3Value.value = {
    formula: `SUM(${terbayarColLetter}14:${terbayarColLetter}${dataEndRow})`,
    result: 0
  };
  card3Value.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FF16A34A" } };
  card3Value.alignment = { horizontal: "center", vertical: "middle" };
  card3Value.numFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
  card3Value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  applyCardBorders(8, 10, 9, 11);

  // Card 4: Serapan Anggaran (M8:N8, M9:N10)
  worksheet.mergeCells("M8:N8");
  worksheet.mergeCells("M9:N10");
  const card4Title = worksheet.getCell("M8");
  card4Title.value = "Serapan Anggaran";
  card4Title.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF64748B" } };
  card4Title.alignment = { horizontal: "center", vertical: "middle" };
  card4Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

  const card4Value = worksheet.getCell("M9");
  card4Value.value = {
    formula: `IF(E9>0, I9/E9, 0)`,
    result: 0
  };
  card4Value.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFD97706" } };
  card4Value.alignment = { horizontal: "center", vertical: "middle" };
  card4Value.numFmt = "0.0%";
  card4Value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  applyCardBorders(8, 10, 13, 14);

  worksheet.getRow(11).height = 10;
  worksheet.getRow(12).height = 10;

  // ============================================
  // HEADER ROW (Row 13)
  // ============================================

  const headerRow = worksheet.getRow(13);
  headerRow.height = 28;

  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = HEADER_BORDER_STYLE;

    // Set default column width
    worksheet.getColumn(index + 1).width = col.width;
  });

  // ============================================
  // DATA ROWS (Starting from Row 14)
  // ============================================

  let rowNumber = 14;
  data.forEach((contract, dataIndex) => {
    const row = worksheet.getRow(rowNumber);
    row.height = 22;

    // Alternating row colors
    const rowFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: dataIndex % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" },
    };

    columns.forEach((col, colIndex) => {
      const cell = row.getCell(colIndex + 1);

      // Get value based on key
      let value: string | number | Date | boolean = "-";

      if (col.key === "no") {
        value = dataIndex + 1;
      } else if (col.key === "namaVendor") {
        value = contract.namaVendor || contract.vendor || "-";
      } else if (col.key === "nilaiPerjanjian") {
        value = contract.nilaiPerjanjian || contract.nilaiKontrak || 0;
      } else if (col.key === "terbayar") {
        value = contract.terbayar || contract.totalTagihanDibayar || 0;
      } else if (col.key === "submissionIdVIP") {
        value = contract.submissionIdVIP || contract.submissionId || "-";
      } else if (col.key === "statusVIP") {
        const statusVIPLabels: Record<string, string> = {
          lunas: "Lunas",
          belum_lunas: "Belum Lunas",
          dokumen_tidak_lengkap: "Dokumen Tidak Lengkap",
        };
        value = contract.statusVIP ? statusVIPLabels[contract.statusVIP] || contract.statusVIP : "-";
      } else if (col.key === "clickCB") {
        value = contract.clickCB ? "Ya" : "-";
      } else if (col.key === "jenisAnggaran") {
        const jenisLabels: Record<string, string> = {
          AI: "AI - Anggaran Investasi",
          AO: "AO - Anggaran Operasi",
        };
        value = contract.jenisAnggaran ? jenisLabels[contract.jenisAnggaran] || contract.jenisAnggaran : "-";
      } else if (col.key === "status") {
        value = contract.status ? getStatusLabel(contract.status) : "-";
      } else {
        const rawValue = contract[col.key as keyof ContractData];
        if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
          value = rawValue as string | number | boolean;
        } else {
          value = "-";
        }
      }

      // Handle date formatting
      if (col.isDate && value !== "-") {
        const dateValue = formatDateForExcel(value as string);
        cell.value = dateValue;
        if (dateValue instanceof Date) {
          cell.numFmt = "DD-MM-YYYY";
        }
      } else if (col.isCurrency && typeof value === "number") {
        cell.value = value;
        cell.numFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
      } else {
        cell.value = value;
      }

      // Styling
      cell.fill = rowFill;
      cell.border = BORDER_STYLE;
      cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF334155" } };

      // Alignment adjustments based on data types
      if (col.isCurrency) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (col.key === "no" || col.isDate || col.key === "status" || col.key === "statusVIP" || col.key === "jenisAI" || col.key === "crNotCR") {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      }

      // Status cell coloring
      if (col.key === "status") {
        if (value === "Aktif") {
          cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF16A34A" }, bold: true }; // Success Green
        } else if (value === "Selesai") {
          cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF2563EB" }, bold: true }; // Info Blue
        } else if (value === "Bermasalah") {
          cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FFDC2626" }, bold: true }; // Danger Red
        }
      }
    });

    rowNumber++;
  });

  // ============================================
  // TOTAL / SUMMARY ROW (Accounting Style)
  // ============================================
  if (data.length > 0) {
    const totalRow = worksheet.getRow(rowNumber);
    totalRow.height = 24;

    const totalFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" }, // Slate 100
    };

    const totalBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },     // thin top border
      bottom: { style: "double", color: { argb: "FF475569" } },  // double bottom accounting border
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };

    columns.forEach((col, colIndex) => {
      const cell = totalRow.getCell(colIndex + 1);
      cell.fill = totalFill;
      cell.border = totalBorder;
      cell.font = { name: "Segoe UI", bold: true, size: 9.5, color: { argb: "FF0F172A" } };

      if (colIndex === 0) {
        cell.value = "TOTAL SUMMARY";
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (col.isCurrency) {
        const colLetter = getExcelColumnLetter(colIndex + 1);
        cell.value = {
          formula: `SUM(${colLetter}14:${colLetter}${rowNumber - 1})`,
          result: 0,
        };
        cell.numFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else {
        cell.value = "";
      }
    });
    rowNumber++;
  }

  // ============================================
  // VERIFICATION & APPROVAL SHEET (TANDA TANGAN RESMI)
  // ============================================
  const startSignRow = rowNumber + 2;
  const leftColIndex = 2; // Column B (Index 2)
  const leftLineRow = startSignRow + 4;

  worksheet.mergeCells(startSignRow, leftColIndex, startSignRow, leftColIndex + 2);
  worksheet.mergeCells(startSignRow + 1, leftColIndex, startSignRow + 1, leftColIndex + 2);
  worksheet.mergeCells(leftLineRow + 1, leftColIndex, leftLineRow + 1, leftColIndex + 2);
  worksheet.mergeCells(leftLineRow + 2, leftColIndex, leftLineRow + 2, leftColIndex + 2);

  const leftSignCell = worksheet.getCell(startSignRow, leftColIndex);
  leftSignCell.value = "Dibuat Oleh,";
  leftSignCell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF334155" } };
  leftSignCell.alignment = { horizontal: "center", vertical: "middle" };
  
  const leftTitleCell = worksheet.getCell(startSignRow + 1, leftColIndex);
  leftTitleCell.value = "Supervisor Keuangan & Anggaran";
  leftTitleCell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF334155" } };
  leftTitleCell.alignment = { horizontal: "center", vertical: "middle" };

  for (let c = leftColIndex; c <= leftColIndex + 2; c++) {
    const lineCell = worksheet.getCell(leftLineRow, c);
    lineCell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } };
  }

  const leftNameCell = worksheet.getCell(leftLineRow + 1, leftColIndex);
  leftNameCell.value = "Faisal Fatih";
  leftNameCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF0F172A" } };
  leftNameCell.alignment = { horizontal: "center", vertical: "middle" };

  const leftNipCell = worksheet.getCell(leftLineRow + 2, leftColIndex);
  leftNipCell.value = "NIP. 9412089PLN";
  leftNipCell.font = { name: "Segoe UI", size: 9, color: { argb: "FF475569" } };
  leftNipCell.alignment = { horizontal: "center", vertical: "middle" };

  // Right side signature (Approver) - Column columns.length - 4
  const rightColIndex = Math.max(leftColIndex + 4, columns.length - 4);
  const rightLineRow = startSignRow + 4;

  worksheet.mergeCells(startSignRow, rightColIndex, startSignRow, rightColIndex + 2);
  worksheet.mergeCells(startSignRow + 1, rightColIndex, startSignRow + 1, rightColIndex + 2);
  worksheet.mergeCells(rightLineRow + 1, rightColIndex, rightLineRow + 1, rightColIndex + 2);
  worksheet.mergeCells(rightLineRow + 2, rightColIndex, rightLineRow + 2, rightColIndex + 2);

  const rightSignCell = worksheet.getCell(startSignRow, rightColIndex);
  rightSignCell.value = "Mengetahui & Menyetujui,";
  rightSignCell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF334155" } };
  rightSignCell.alignment = { horizontal: "center", vertical: "middle" };
  
  const rightTitleCell = worksheet.getCell(startSignRow + 1, rightColIndex);
  rightTitleCell.value = "Manager Bidang Keuangan";
  rightTitleCell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF334155" } };
  rightTitleCell.alignment = { horizontal: "center", vertical: "middle" };

  for (let c = rightColIndex; c <= rightColIndex + 2; c++) {
    const lineCell = worksheet.getCell(rightLineRow, c);
    lineCell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } };
  }

  const rightNameCell = worksheet.getCell(rightLineRow + 1, rightColIndex);
  rightNameCell.value = "Ferza Farrell Wibowo";
  rightNameCell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF0F172A" } };
  rightNameCell.alignment = { horizontal: "center", vertical: "middle" };

  const rightNipCell = worksheet.getCell(rightLineRow + 2, rightColIndex);
  rightNipCell.value = "NIP. 9104052PLN";
  rightNipCell.font = { name: "Segoe UI", size: 9, color: { argb: "FF475569" } };
  rightNipCell.alignment = { horizontal: "center", vertical: "middle" };

  // ============================================
  // AUTO-FIT COLUMN WIDTHS
  // ============================================
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellRow = Number(cell.row);
      if (cellRow <= 12 || cellRow > rowNumber) return;
      
      let valStr = "";
      if (cell.value instanceof Date) {
        valStr = "DD-MM-YYYY";
      } else if (typeof cell.value === "number") {
        valStr = `Rp ${cell.value.toLocaleString("id-ID")}`;
      } else if (cell.value && typeof cell.value === "object" && "formula" in cell.value) {
        valStr = "Rp 999.999.999.999";
      } else if (cell.value !== null && cell.value !== undefined) {
        valStr = String(cell.value);
      }
      
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    
    const colDefWidth = column.width || 12;
    column.width = Math.max(colDefWidth, maxLen + 4);
  });

  // ============================================
  // AUTOFILTER & FREEZE PANES
  // ============================================
  worksheet.autoFilter = {
    from: { row: 13, column: 1 },
    to: { row: 13, column: columns.length }
  };

  worksheet.views = [
    { state: "frozen", xSplit: 0, ySplit: 13, activeCell: "A14", showGridLines: true },
  ];
}

// ============================================
// API ROUTE HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body for contracts data
    const body = await request.json();
    const contracts: ContractData[] = body.contracts || [];

    // Separate contracts by category
    const investasiContracts = contracts.filter((c) => c.kategori === "investasi");
    const pemeliharaanContracts = contracts.filter((c) => c.kategori === "pemeliharaan");
    const administrasiContracts = contracts.filter((c) => c.kategori === "administrasi");

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PLN Monitoring System";
    workbook.lastModifiedBy = "PLN Monitoring System";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Create worksheets for each category
    createWorksheet(
      workbook,
      "Investasi",
      "LAPORAN MONITORING TAGIHAN - INVESTASI",
      INVESTASI_COLUMNS,
      investasiContracts
    );

    createWorksheet(
      workbook,
      "Pemeliharaan",
      "LAPORAN MONITORING TAGIHAN - PEMELIHARAAN",
      PEMELIHARAAN_COLUMNS,
      pemeliharaanContracts
    );

    createWorksheet(
      workbook,
      "Administrasi",
      "LAPORAN MONITORING TAGIHAN - ADMINISTRASI",
      ADMINISTRASI_COLUMNS,
      administrasiContracts
    );

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Generate filename with date
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `laporan-monitoring-tagihan-${dateStr}.xlsx`;

    // Return response with file download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating Excel:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel file" },
      { status: 500 }
    );
  }
}
// GET handler for testing
export async function GET() {
  return NextResponse.json({
    message: "Use POST method with contracts data to generate Excel report",
    usage: {
      method: "POST",
      body: {
        contracts: "Array of contract objects",
      },
    },
  });
}
