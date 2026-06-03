import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Palette warna PLN / Corporate Modern
const COLOR_PRIMARY: [number, number, number] = [0, 91, 156];     // PLN Blue
const COLOR_SECONDARY: [number, number, number] = [100, 116, 139]; // Slate Gray
const COLOR_DARK: [number, number, number] = [30, 41, 59];        // Slate 800 (Charcoal)
const COLOR_LIGHT_BG: [number, number, number] = [248, 250, 252]; // Slate 50 (Very light gray)
const COLOR_SUCCESS: [number, number, number] = [22, 163, 74];    // Green 600

const CONTRACT_CATEGORY_COLORS: Record<string, [number, number, number]> = {
  investasi: [139, 92, 246],      // Violet
  pemeliharaan: [249, 115, 22],   // Orange
  administrasi: [6, 182, 212],    // Cyan
};

interface ContractCategoryStats {
  kategori: string;
  label: string;
  totalKontrak: number;
  kontrakAktif: number;
  totalNilai: number;
  totalDibayar: number;
  sisaAnggaran: number;
  persentaseRealisasi: number;
  totalTagihan: number;
  tagihanDibayar: number;
  tagihanPending: number;
}

interface OverallContractStats {
  totalKontrak: number;
  kontrakAktif: number;
  totalNilai: number;
  totalDibayar: number;
  sisaAnggaran: number;
  persentaseRealisasi: number;
  totalTagihan: number;
  tagihanDibayar: number;
  tagihanPending: number;
}

interface ContractDetail {
  noPerjanjian: string;
  judulPekerjaan: string;
  vendor: string;
  nilaiKontrak: number;
  totalTagihanDibayar: number;
  kategori: string;
  status: string;
}

interface LaporanPDFData {
  contractStats: ContractCategoryStats[];
  overallContractStats: OverallContractStats;
  contracts: ContractDetail[];
}

function formatCurrencyPDF(value: number): string {
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)} M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)} jt`;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatFullCurrency(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function drawBarChart(
  doc: jsPDF,
  data: { label: string; pagu: number; realisasi: number; kategori: string }[],
  startX: number,
  startY: number,
  width: number,
  height: number,
  title: string,
  colorMap: Record<string, [number, number, number]>
) {
  // Title
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(title, startX, startY);

  const chartStartY = startY + 8;
  const chartHeight = height - 25;
  const barWidth = (width - 40) / (data.length * 2.5);
  const gapBetweenBars = 3;
  const gapBetweenGroups = barWidth * 0.8;

  // Find max value for scaling
  const maxValue = Math.max(...data.map(d => Math.max(d.pagu, d.realisasi))) || 1;
  const scale = chartHeight / maxValue;

  // Draw X/Y axis lines
  doc.setDrawColor(226, 232, 240); // border-slate-200
  doc.setLineWidth(0.5);
  doc.line(startX, chartStartY, startX, chartStartY + chartHeight);
  doc.line(startX, chartStartY + chartHeight, startX + width, chartStartY + chartHeight);

  // Draw Y axis labels & horizontal gridlines
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // text-slate-400

  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const value = (maxValue / ySteps) * i;
    const yPos = chartStartY + chartHeight - (value * scale);

    // Grid line
    doc.setDrawColor(241, 245, 249); // border-slate-100
    doc.line(startX, yPos, startX + width, yPos);

    // Label
    let label: string;
    if (value >= 1000000000) label = `${(value / 1000000000).toFixed(1)}M`;
    else if (value >= 1000000) label = `${(value / 1000000).toFixed(0)}jt`;
    else label = value.toFixed(0);

    doc.text(label, startX - 3, yPos + 1, { align: "right" });
  }

  // Draw bars
  let currentX = startX + 15;

  data.forEach((item) => {
    const paguHeight = item.pagu * scale;
    const realisasiHeight = item.realisasi * scale;

    // Pagu bar (Slate gray)
    doc.setFillColor(203, 213, 225); // Slate 300
    doc.rect(currentX, chartStartY + chartHeight - paguHeight, barWidth, paguHeight, "F");

    // Realisasi bar (Kategori-specific color)
    const color = colorMap[item.kategori] || COLOR_PRIMARY;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(currentX + barWidth + gapBetweenBars, chartStartY + chartHeight - realisasiHeight, barWidth, realisasiHeight, "F");

    // X axis label
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    const labelX = currentX + barWidth + gapBetweenBars / 2;
    doc.text(item.label, labelX, chartStartY + chartHeight + 6, { align: "center" });

    currentX += (barWidth * 2) + gapBetweenBars + gapBetweenGroups;
  });

  // Legend
  const legendY = chartStartY + chartHeight + 14;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  // Pagu Legend
  doc.setFillColor(203, 213, 225);
  doc.rect(startX + 20, legendY - 2.5, 6, 3, "F");
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text("Pagu Anggaran", startX + 28, legendY);

  // Realisasi Legend
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(startX + 65, legendY - 2.5, 6, 3, "F");
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text("Realisasi Penyerapan", startX + 73, legendY);

  return legendY + 6;
}

export function exportLaporanPDF(data: LaporanPDFData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const today = new Date();

  let currentY = margin;

  // ========== HELPER: DRAW FOOTER AND HEADER LINE ==========
  const addPageDecorations = (pdfDoc: jsPDF, pageNum: number, total: number) => {
    pdfDoc.setPage(pageNum);

    // Header Thin Accent Line
    pdfDoc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    pdfDoc.rect(0, 0, pageWidth, 3, "F");

    // Footer Line
    pdfDoc.setDrawColor(226, 232, 240); // slate-200
    pdfDoc.setLineWidth(0.5);
    pdfDoc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Footer Text
    pdfDoc.setFontSize(8);
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.setTextColor(148, 163, 184); // slate-400
    pdfDoc.text("PT PLN (Persero) - Sistem Informasi Monitoring Anggaran & Proyek (SIMAP)", margin, pageHeight - 8);
    pdfDoc.text(`Halaman ${pageNum} dari ${total}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  };

  // ========== FIRST PAGE HEADER ==========
  // Decorative Left Color bar
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(margin, currentY, 3, 20, "F");

  // Title & Institution
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("LAPORAN EKSEKUTIF REALISASI KONTRAK", margin + 6, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text("PT PLN (Persero) - Laporan Monitoring Penggunaan Anggaran Proyek", margin + 6, currentY + 11);

  // Date information (aligned right)
  const dateStr = today.toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  doc.setFontSize(8);
  doc.text(`Dicetak pada: ${dateStr}`, pageWidth - margin, currentY + 5, { align: "right" });

  currentY += 22;

  // Horizontal separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 8;

  // ========== EXECUTIVE SUMMARY DASHBOARD CARDS (3 Columns) ==========
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text("SUMMARY DASHBOARD", margin, currentY);

  currentY += 4;

  const cardWidth = (contentWidth - 10) / 3;
  const cardHeight = 24;

  // Card 1: Total Kontrak
  doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text("Total Volume Kontrak", margin + 5, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(data.overallContractStats.totalKontrak.toString(), margin + 5, currentY + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(`${data.overallContractStats.kontrakAktif} Kontrak Status Aktif`, margin + 5, currentY + 20);

  // Card 2: Pagu Anggaran
  const card2X = margin + cardWidth + 5;
  doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
  doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text("Pagu Anggaran (Pagu)", card2X + 5, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text(formatFullCurrency(data.overallContractStats.totalNilai), card2X + 5, currentY + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text(`Total Alokasi Investasi & Rutin`, card2X + 5, currentY + 20);

  // Card 3: Penyerapan (Realisasi)
  const card3X = margin + (cardWidth * 2) + 10;
  doc.setFillColor(COLOR_LIGHT_BG[0], COLOR_LIGHT_BG[1], COLOR_LIGHT_BG[2]);
  doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLOR_SECONDARY[0], COLOR_SECONDARY[1], COLOR_SECONDARY[2]);
  doc.text("Realisasi Serapan", card3X + 5, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(COLOR_SUCCESS[0], COLOR_SUCCESS[1], COLOR_SUCCESS[2]);
  doc.text(formatFullCurrency(data.overallContractStats.totalDibayar), card3X + 5, currentY + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_SUCCESS[0], COLOR_SUCCESS[1], COLOR_SUCCESS[2]);
  doc.text(`${data.overallContractStats.persentaseRealisasi.toFixed(1)}% Anggaran Terserap`, card3X + 5, currentY + 20);

  currentY += cardHeight + 10;

  // ========== VISUALIZATION CHARTS ==========
  const contractChartData = data.contractStats.map(cat => ({
    label: cat.label,
    pagu: cat.totalNilai,
    realisasi: cat.totalDibayar,
    kategori: cat.kategori,
  }));

  currentY = drawBarChart(
    doc,
    contractChartData,
    margin,
    currentY,
    contentWidth,
    50,
    "PERBANDINGAN PAGU DAN REALISASI PER KATEGORI",
    CONTRACT_CATEGORY_COLORS
  );

  currentY += 8;

  // ========== TABLE 1: SUMMARY STATISTICS BY CATEGORY ==========
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text("RINGKASAN DATA KONTRAK PER KATEGORI", margin, currentY);

  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    head: [["Kategori Pekerjaan", "Vol", "Aktif", "Pagu Anggaran", "Realisasi Bayar", "Sisa Anggaran", "Serapan %"]],
    body: [
      ...data.contractStats.map((cat) => [
        cat.label,
        cat.totalKontrak.toString(),
        cat.kontrakAktif.toString(),
        formatFullCurrency(cat.totalNilai),
        formatFullCurrency(cat.totalDibayar),
        formatFullCurrency(cat.sisaAnggaran),
        `${cat.persentaseRealisasi.toFixed(1)}%`,
      ]),
      [
        { content: "TOTAL EKSEKUTIF", styles: { fontStyle: "bold" } },
        { content: data.overallContractStats.totalKontrak.toString(), styles: { fontStyle: "bold" } },
        { content: data.overallContractStats.kontrakAktif.toString(), styles: { fontStyle: "bold" } },
        { content: formatFullCurrency(data.overallContractStats.totalNilai), styles: { fontStyle: "bold" } },
        { content: formatFullCurrency(data.overallContractStats.totalDibayar), styles: { fontStyle: "bold" } },
        { content: formatFullCurrency(data.overallContractStats.sisaAnggaran), styles: { fontStyle: "bold" } },
        { content: `${data.overallContractStats.persentaseRealisasi.toFixed(1)}%`, styles: { fontStyle: "bold" } },
      ],
    ],
    theme: "striped",
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    bodyStyles: {
      halign: "center",
      textColor: COLOR_DARK,
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 35 },
      1: { cellWidth: 12 },
      2: { cellWidth: 12 },
      3: { halign: "right", cellWidth: 32 },
      4: { halign: "right", cellWidth: 32 },
      5: { halign: "right", cellWidth: 32 },
      6: { halign: "center", cellWidth: 20 },
    },
    margin: { left: margin, right: margin },
  });

  // ========== PAGE BREAK FOR DETAILS LIST ==========
  doc.addPage();
  currentY = margin + 8;

  // ========== TABLE 2: DETAILED CONTRACTS LIST ==========
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  doc.text("DAFTAR RINCIAN SELURUH KONTRAK AKTIF & PROSES", margin, currentY);

  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [["No. Kontrak / Perjanjian", "Deskripsi Judul Pekerjaan", "Vendor Pelaksana", "Kategori", "Nilai Kontrak", "Realisasi Bayar", "Status"]],
    body: data.contracts.map((c) => [
      c.noPerjanjian,
      c.judulPekerjaan,
      c.vendor,
      c.kategori.toUpperCase(),
      formatCurrencyPDF(c.nilaiKontrak),
      formatCurrencyPDF(c.totalTagihanDibayar),
      c.status.toUpperCase(),
    ]),
    theme: "striped",
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [15, 23, 42], // Dark slate-900 for detail table header
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      textColor: COLOR_DARK,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
      1: { cellWidth: 50 },
      2: { cellWidth: 32 },
      3: { halign: "center", cellWidth: 20 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 22 },
      6: { halign: "center", cellWidth: 14, fontStyle: "bold" },
    },
    didDrawCell: (cellData) => {
      // Highlight status column colors
      if (cellData.column.index === 6 && cellData.section === "body") {
        const val = String(cellData.cell.raw).toLowerCase();
        if (val === "aktif") {
          cellData.cell.styles.textColor = COLOR_SUCCESS;
        } else if (val === "selesai") {
          cellData.cell.styles.textColor = [37, 99, 235]; // Blue
        } else {
          cellData.cell.styles.textColor = [217, 119, 6]; // Amber
        }
      }
    },
    margin: { left: margin, right: margin },
  });
  currentY = (doc as any).lastAutoTable.finalY + 15;

  // ========== V. VERIFICATION & APPROVAL SHEET (TANDA TANGAN RESMI) ==========
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = margin + 10;
  }

  // Draw Line Separator for Signatures
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
  
  const signY = currentY + 6;
  
  // Left side signature (Preparer)
  doc.text("Dibuat Oleh,", margin + 10, signY);
  doc.text("Supervisor Keuangan & Anggaran", margin + 10, signY + 4.5);
  doc.line(margin + 10, signY + 20, margin + 70, signY + 20); // line for signature
  doc.setFont("helvetica", "bold");
  doc.text("Faisal Fatih", margin + 10, signY + 24);
  doc.setFont("helvetica", "normal");
  doc.text("NIP. 9412089PLN", margin + 10, signY + 28);

  // Right side signature (Approver)
  doc.text("Mengetahui & Menyetujui,", pageWidth - margin - 70, signY);
  doc.text("Manager Bidang Keuangan", pageWidth - margin - 70, signY + 4.5);
  doc.line(pageWidth - margin - 70, signY + 20, pageWidth - margin - 10, signY + 20);
  doc.setFont("helvetica", "bold");
  doc.text("Ferza Farrell Wibowo", pageWidth - margin - 70, signY + 24);
  doc.setFont("helvetica", "normal");
  doc.text("NIP. 9104052PLN", pageWidth - margin - 70, signY + 28);

  // ========== APPLY PAGE DECORATIONS (HEADERS & FOOTERS) ==========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addPageDecorations(doc, i, totalPages);
  }

  // Save the PDF
  const fileName = `Laporan_SIMAP_PLN_${today.toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
