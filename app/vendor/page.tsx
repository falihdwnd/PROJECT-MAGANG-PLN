"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth-new";
import { useContractStore, CONTRACT_CATEGORY_LABELS, CONTRACT_CATEGORY_COLORS, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS, JENIS_ANGGARAN_LABELS, JENIS_ANGGARAN_COLORS } from "@/lib/store-new";

function formatCurrency(value: number | undefined | null): string {
  if (!value || value === 0) return "Rp 0";
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)} M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)} jt`;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function VendorDashboardPage() {
  const { user } = useAuth();
  const { contracts, getInvoicesByContract, refreshData } = useContractStore();

  const vendorContracts = useMemo(() => {
    if (!user) return [];
    if (user.vendorAccountId) {
      return contracts.filter((c) => c.vendorAccountId === user.vendorAccountId);
    }
    return contracts.filter((c) => c.vendorEmail?.toLowerCase() === user.email.toLowerCase());
  }, [contracts, user]);

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const vendorContract = useMemo(() => {
    if (selectedContractId) {
      return vendorContracts.find((c) => c.id === selectedContractId) || null;
    }
    return vendorContracts[0] || null;
  }, [vendorContracts, selectedContractId]);

  const vendorInvoices = useMemo(() => {
    if (!vendorContract) return [];
    return getInvoicesByContract(vendorContract.id);
  }, [vendorContract, getInvoicesByContract]);

  // Submissions State
  const [submissions, setSubmissions] = useState<any[]>([]);

  const fetchSubmissions = async () => {
    if (!user?.vendorAccountId && !user?.id) return;
    try {
      const res = await fetch(`/api/approvals?vendorId=${user?.vendorAccountId || user?.id}`);
      if (res.ok) {
        const { data } = await res.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  useEffect(() => {
    fetchSubmissions();

    // Auto-refresh interval (every 5 seconds)
    const interval = setInterval(() => {
      fetchSubmissions();
      if (refreshData) {
        refreshData(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, refreshData]);

  // Tabs
  const [activeTab, setActiveTab] = useState<"overview" | "update_kontrak" | "invoices" | "progress" | "perpanjangan">("overview");

  // Forms Visibility
  const [showUpdateKontrakForm, setShowUpdateKontrakForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [showPerpanjanganForm, setShowPerpanjanganForm] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [updateKontrakData, setUpdateKontrakData] = useState({ alasan: "", nilaiKontrakBaru: "", file: null as File | null });
  const [invoiceData, setInvoiceData] = useState({ nomorTagihan: "", nilaiTagihan: "", tanggalJatuhTempo: "", keterangan: "", file: null as File | null });
  const [progressData, setProgressData] = useState({ progress: "", keterangan: "", file: null as File | null });
  const [perpanjanganData, setPerpanjanganData] = useState({ tanggalBerakhirBaru: "", alasan: "", file: null as File | null });

  // File Input Refs for clearing
  const updateKontrakFileRef = useRef<HTMLInputElement>(null);
  const invoiceFileRef = useRef<HTMLInputElement>(null);
  const progressFileRef = useRef<HTMLInputElement>(null);
  const perpanjanganFileRef = useRef<HTMLInputElement>(null);

  const getContractType = (contract: any) => {
    if (!contract) return 'investment';
    if (contract.kategori === 'pemeliharaan') return 'maintenance';
    if (contract.kategori === 'administrasi') return 'administration';
    return 'investment';
  };

  const uploadFile = async (file: File | null, folder: string): Promise<string | null> => {
    if (!file) return null;
    setUploadProgress(`Mengunggah dokumen...`);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Gagal mengunggah file");
    }
    return data.data.url;
  };

  const handleApiSubmit = async (payloadGenerator: () => Promise<any>, onSuccess: () => void) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setUploadProgress(null);
    try {
      const payload = await payloadGenerator();
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
        fetchSubmissions();
      } else {
        throw new Error(data.error || "Gagal menyimpan pengajuan");
      }
    } catch (error: any) {
      console.error("Submission failed:", error);
      setErrorMessage(error.message || "Terjadi kesalahan saat memproses permintaan.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Calculate the highest progress between DB and any pending/approved submissions
  const maxKnownProgress = useMemo(() => {
    let maxProg = vendorContract?.progressPekerjaan || 0;
    if (vendorContract) {
      const progressSubs = submissions.filter(s => s.type === "update_progress" && s.contractId === vendorContract.id && s.status !== "rejected");
      progressSubs.forEach(sub => {
        const p = parseFloat(sub.proposedProgress || "0");
        if (p > maxProg) maxProg = p;
      });
    }
    return maxProg;
  }, [vendorContract, submissions]);

  const handleSubmitUpdateKontrak = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateKontrakData.file) return setErrorMessage("Silakan lampirkan dokumen pendukung.");
    
    const proposedValue = parseFloat(updateKontrakData.nilaiKontrakBaru) || 0;
    const currentContractValue = vendorContract?.nilaiKontrak || 0;
    
    if (proposedValue < currentContractValue) {
      return setErrorMessage(`Pengajuan gagal: Nilai kontrak baru tidak boleh lebih kecil dari nilai kontrak saat ini (${formatCurrency(currentContractValue)}).`);
    }

    handleApiSubmit(async () => {
      const fileUrl = await uploadFile(updateKontrakData.file, "update-kontrak");
      return {
        type: "update_kontrak",
        contractId: vendorContract?.id,
        contractType: getContractType(vendorContract),
        requestedBy: user?.vendorAccountId || user?.id,
        title: `Update Kontrak - ${vendorContract?.judulPekerjaan}`,
        description: updateKontrakData.alasan,
        alasan: updateKontrakData.alasan,
        proposedValue: parseFloat(updateKontrakData.nilaiKontrakBaru),
        dokumenPendukung: fileUrl
      };
    }, () => {
      setShowUpdateKontrakForm(false);
      setUpdateKontrakData({ alasan: "", nilaiKontrakBaru: "", file: null });
      if (updateKontrakFileRef.current) updateKontrakFileRef.current.value = "";
      setSuccessMessage("Pengajuan update kontrak berhasil dikirim.");
      setTimeout(() => setSuccessMessage(null), 4000);
    });
  };

  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceData.file) return setErrorMessage("Silakan lampirkan dokumen pendukung.");
    
    const nilai = parseFloat(invoiceData.nilaiTagihan) || 0;
    if (vendorContract && nilai > vendorContract.sisaAnggaran) {
      return setErrorMessage(`Nilai tagihan melebihi sisa kontrak (Sisa: Rp ${new Intl.NumberFormat('id-ID').format(vendorContract.sisaAnggaran)}). Silakan lakukan pengajuan Update Kontrak terlebih dahulu.`);
    }

    if (!invoiceData.tanggalJatuhTempo) return setErrorMessage("Silakan isi tanggal jatuh tempo.");
    
    const jatuhTempoDate = new Date(invoiceData.tanggalJatuhTempo);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (jatuhTempoDate < today) {
      return setErrorMessage("Tanggal jatuh tempo sudah terlewati (harus hari ini atau ke depan). Pengajuan otomatis ditolak.");
    }

    handleApiSubmit(async () => {
      const fileUrl = await uploadFile(invoiceData.file, "tagihan");
      return {
        type: "pengajuan_tagihan",
        contractId: vendorContract?.id,
        contractType: getContractType(vendorContract),
        requestedBy: user?.vendorAccountId || user?.id,
        title: `Invoice ${invoiceData.nomorTagihan} - ${vendorContract?.judulPekerjaan}`,
        description: invoiceData.keterangan || `Tagihan senilai ${formatCurrency(parseFloat(invoiceData.nilaiTagihan))}`,
        dokumenPendukung: fileUrl,
        nomorTagihan: invoiceData.nomorTagihan,
        nilaiTagihan: parseFloat(invoiceData.nilaiTagihan),
        tanggalJatuhTempo: invoiceData.tanggalJatuhTempo
      };
    }, () => {
      setShowInvoiceForm(false);
      setInvoiceData({ nomorTagihan: "", nilaiTagihan: "", tanggalJatuhTempo: "", keterangan: "", file: null });
      if (invoiceFileRef.current) invoiceFileRef.current.value = "";
      setSuccessMessage("Invoice berhasil diajukan.");
      setTimeout(() => setSuccessMessage(null), 4000);
    });
  };

  const handleSubmitProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressData.file) return setErrorMessage("Silakan lampirkan dokumen bukti.");

    const newProgress = parseFloat(progressData.progress) || 0;
    
    if (newProgress <= maxKnownProgress) {
      return setErrorMessage(`Pengajuan gagal: Progress yang diajukan (${newProgress}%) harus lebih tinggi dari progress saat ini / yang sedang diproses (${maxKnownProgress}%).`);
    }

    handleApiSubmit(async () => {
      const fileUrl = await uploadFile(progressData.file, "progress");
      return {
        type: "update_progress",
        contractId: vendorContract?.id,
        contractType: getContractType(vendorContract),
        requestedBy: user?.vendorAccountId || user?.id,
        title: `Update Progress ${progressData.progress}%`,
        description: progressData.keterangan,
        proposedProgress: parseFloat(progressData.progress),
        currentProgress: vendorContract?.progressPekerjaan || 0,
        dokumenBuktiProjek: fileUrl
      };
    }, () => {
      setShowProgressForm(false);
      setProgressData({ progress: "", keterangan: "", file: null });
      if (progressFileRef.current) progressFileRef.current.value = "";
      setSuccessMessage("Update progress berhasil diajukan.");
      setTimeout(() => setSuccessMessage(null), 4000);
    });
  };

  const handleSubmitPerpanjangan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!perpanjanganData.file) return setErrorMessage("Silakan lampirkan dokumen pendukung.");

    handleApiSubmit(async () => {
      const fileUrl = await uploadFile(perpanjanganData.file, "perpanjangan");
      return {
        type: "perpanjangan_kontrak",
        contractId: vendorContract?.id,
        contractType: getContractType(vendorContract),
        requestedBy: user?.vendorAccountId || user?.id,
        title: `Perpanjangan Kontrak`,
        description: perpanjanganData.alasan,
        proposedEndDate: perpanjanganData.tanggalBerakhirBaru,
        alasanPerpanjang: perpanjanganData.alasan,
        dokumenPendukung: fileUrl
      };
    }, () => {
      setShowPerpanjanganForm(false);
      setPerpanjanganData({ tanggalBerakhirBaru: "", alasan: "", file: null });
      if (perpanjanganFileRef.current) perpanjanganFileRef.current.value = "";
      setSuccessMessage("Pengajuan perpanjangan kontrak berhasil dikirim.");
      setTimeout(() => setSuccessMessage(null), 4000);
    });
  };

  if (!user || user.role !== "vendor") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-500 mb-6">Halaman ini hanya untuk Vendor.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!vendorContract) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Kontrak Tidak Ditemukan</h2>
          <p className="text-gray-500">Kontrak yang terkait dengan akun Anda tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const renderStatus = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      negotiation: "bg-blue-100 text-blue-800",
      revision: "bg-purple-100 text-purple-800",
    };
    const labels: Record<string, string> = {
      pending: "Menunggu",
      approved: "Disetujui",
      rejected: "Ditolak",
      negotiation: "Negosiasi",
      revision: "Revisi",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getSubmissionsByType = (type: string) => {
    return submissions.filter(s => s.type === type && (s.contractId === vendorContract.id || !s.contractId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portal Vendor</h1>
            <p className="text-sm text-gray-500 mt-1">Selamat datang, {user.name} ({user.vendorCompany})</p>
          </div>
          {vendorContracts.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Kontrak:</label>
              <select
                value={vendorContract.id}
                onChange={(e) => setSelectedContractId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
              >
                {vendorContracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.noPerjanjian} - {contract.judulPekerjaan}
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${CONTRACT_STATUS_COLORS[vendorContract.status]}`}>
            {CONTRACT_STATUS_LABELS[vendorContract.status]}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Nilai Kontrak</p>
            <p className="text-lg font-bold text-blue-900">{formatCurrency(vendorContract.nilaiKontrak)}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium">Terbayar</p>
            <p className="text-lg font-bold text-green-900">{formatCurrency(vendorContract.terbayar)}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-600 font-medium">Progress</p>
            <p className="text-lg font-bold text-purple-900">{vendorContract.progressPekerjaan?.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600 font-medium">Berakhir</p>
            <p className="text-lg font-bold text-orange-900">{formatDate(vendorContract.tanggalBerakhir)}</p>
          </div>
        </div>
      </div>

      {successMessage && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-700 font-medium">✓ {successMessage}</p>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700 font-medium">✗ {errorMessage}</p>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto">
          <nav className="flex min-w-max">
            {[
              { id: "overview", label: "Detail Kontrak" },
              { id: "update_kontrak", label: "Pengajuan Update Kontrak" },
              { id: "invoices", label: "Pengajuan Tagihan" },
              { id: "progress", label: "Update Progress" },
              { id: "perpanjangan", label: "Perpanjangan Kontrak" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{vendorContract.judulPekerjaan || vendorContract.judulPerjanjian}</h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${JENIS_ANGGARAN_COLORS[vendorContract.jenisAnggaran]}`}>
                      {JENIS_ANGGARAN_LABELS[vendorContract.jenisAnggaran] || vendorContract.jenisAnggaran}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${CONTRACT_CATEGORY_COLORS[vendorContract.kategori]}`}>
                      {CONTRACT_CATEGORY_LABELS[vendorContract.kategori] || vendorContract.kategori}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${CONTRACT_STATUS_COLORS[vendorContract.status]}`}>
                      {CONTRACT_STATUS_LABELS[vendorContract.status] || vendorContract.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">No Perjanjian</p>
                  <p className="text-sm font-medium text-gray-900">{vendorContract.noPerjanjian}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Vendor</p>
                  <p className="text-sm font-medium text-gray-900">{vendorContract.vendor || vendorContract.namaVendor || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tanggal Perjanjian</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(vendorContract.tanggalPerjanjian)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Uraian Kegiatan</p>
                  <p className="text-sm font-medium text-gray-900">{vendorContract.uraianKegiatan || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Unit</p>
                  <p className="text-sm font-medium text-gray-900">{vendorContract.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Progress Saat Ini</p>
                  <p className="text-sm font-medium text-gray-900">
                    {vendorContract.progressPekerjaan ? `${vendorContract.progressPekerjaan}%` : "0%"}
                    {maxKnownProgress > (vendorContract?.progressPekerjaan || 0) && (
                      <span className="text-orange-600 text-xs ml-2 block mt-1">(Pengajuan {maxKnownProgress}% sedang diproses)</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Detail Pekerjaan & Administrasi - Investasi Specific */}
              {vendorContract.kategori === "investasi" && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Detail Pekerjaan & Administrasi</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <p className="text-xs text-gray-500 mb-1">Judul PRK</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.judulPRK || "-"}</p>
                    </div>
                    <div className="md:col-span-3">
                      <p className="text-xs text-gray-500 mb-1">Nama Pekerjaan</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.namaPekerjaan || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">No. PRK</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.noPRK || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Jenis AI</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.jenisAI || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">CR / Not CR</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.crNotCR || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">No. WBS / Pos Anggaran</p>
                      <p className="text-sm font-medium text-blue-600 font-mono">{vendorContract.noWBSPosAnggaran || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">No. SKKI</p>
                      <p className="text-sm font-medium text-blue-600 font-mono">{vendorContract.noSKKI || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">No. SE</p>
                      <p className="text-sm font-medium text-gray-900 font-mono">{vendorContract.noSE || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">No. PO</p>
                      <p className="text-sm font-medium text-gray-900 font-mono">{vendorContract.noPO || "-"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pemeliharaan Specific */}
              {vendorContract.kategori === "pemeliharaan" && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Detail Pekerjaan Pemeliharaan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <p className="text-xs text-gray-500 mb-1">Judul Perjanjian</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.judulPerjanjian || "-"}</p>
                    </div>
                    <div className="md:col-span-3">
                      <p className="text-xs text-gray-500 mb-1">Nama Pekerjaan</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.namaPekerjaan || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">MSB</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.msb || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Bidang</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.bidang || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Rutin / Non Rutin</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.rutinNonRutin || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Periode Accrue</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.periodeAccrue || "-"}</p>
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-gray-700 mt-4 mb-3">Nomor Administrasi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">No. WBS / Pos Anggaran</p>
                      <p className="text-sm font-medium text-blue-600 font-mono">{vendorContract.noWBSPosAnggaran || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">No. SKKI / SKKO</p>
                      <p className="text-sm font-medium text-blue-600 font-mono">{vendorContract.noSKKISKKO || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">No. SE</p>
                      <p className="text-sm font-medium text-gray-900 font-mono">{vendorContract.noSE || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">No. PO</p>
                      <p className="text-sm font-medium text-gray-900 font-mono">{vendorContract.noPO || "-"}</p>
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-gray-700 mt-4 mb-3">Berita Acara & Tanggal</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">No. Berita Acara</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.noBeritaAcara || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tanggal Berita Acara</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.tanggalBeritaAcara ? formatDate(vendorContract.tanggalBeritaAcara) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tanggal Request SE</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.tanggalRequestSE ? formatDate(vendorContract.tanggalRequestSE) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tanggal SE Rilis</p>
                      <p className="text-sm font-medium text-gray-900">{vendorContract.tanggalSERilis ? formatDate(vendorContract.tanggalSERilis) : "-"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UPDATE KONTRAK TAB */}
          {activeTab === "update_kontrak" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pengajuan Update Kontrak</h3>
                  <p className="text-sm text-gray-500">Ajukan perubahan nilai kontrak kepada admin.</p>
                </div>
                <button onClick={() => setShowUpdateKontrakForm(!showUpdateKontrakForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  {showUpdateKontrakForm ? "Tutup Form" : "+ Ajukan Update"}
                </button>
              </div>

              {showUpdateKontrakForm && (
                <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmitUpdateKontrak} className="p-5 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Kontrak Baru (Rp)</label>
                      <input type="number" required value={updateKontrakData.nilaiKontrakBaru} onChange={(e) => setUpdateKontrakData({...updateKontrakData, nilaiKontrakBaru: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" placeholder="Contoh: 1500000000" />
                      {updateKontrakData.nilaiKontrakBaru && (
                        <p className="text-xs text-blue-700 font-semibold mt-1">{formatCurrency(parseFloat(updateKontrakData.nilaiKontrakBaru))}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload Dokumen Pendukung</label>
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          <span>Pilih Dokumen</span>
                          <input type="file" ref={updateKontrakFileRef} required onChange={(e) => setUpdateKontrakData({...updateKontrakData, file: e.target.files?.[0] || null})} accept=".pdf,.png,.jpg,.jpeg" className="hidden" />
                        </label>
                        <div className="text-xs text-gray-500 text-center">
                          {updateKontrakData.file ? <span className="text-blue-600 font-medium">{updateKontrakData.file.name}</span> : "Belum ada file dipilih"} <br/>
                          (Maks. 10MB PDF/JPG/PNG)
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Perubahan</label>
                    <textarea required value={updateKontrakData.alasan} onChange={(e) => setUpdateKontrakData({...updateKontrakData, alasan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white resize-none" rows={3} placeholder="Jelaskan alasan perubahan nilai kontrak..."></textarea>
                  </div>
                  
                  {uploadProgress && <div className="text-sm text-blue-700 animate-pulse">{uploadProgress}</div>}
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowUpdateKontrakForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">Batal</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? "Memproses..." : "Kirim Pengajuan"}</button>
                  </div>
                </motion.form>
              )}

              <div className="space-y-3">
                {getSubmissionsByType("update_kontrak").map((sub) => (
                  <div key={sub.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{sub.title}</h4>
                      {renderStatus(sub.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{sub.alasan}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <div>Nilai Diajukan: <strong className="text-gray-900">{formatCurrency(sub.proposedValue)}</strong></div>
                      <div>Tanggal Input: {formatDate(sub.createdAt)}</div>
                      {sub.negotiatedValue && <div>Hasil Negosiasi: <strong className="text-blue-600">{formatCurrency(sub.negotiatedValue)}</strong></div>}
                      {sub.dokumenPendukung && <div className="col-span-2">Dokumen: <a href={sub.dokumenPendukung} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Lihat Lampiran</a></div>}
                    </div>
                    {sub.rejectionReason && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">Alasan Penolakan: {sub.rejectionReason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAGIHAN TAB */}
          {activeTab === "invoices" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pengajuan Tagihan</h3>
                  <p className="text-sm text-gray-500">Ajukan invoice / tagihan pembayaran.</p>
                </div>
                <button onClick={() => {
                  const willShow = !showInvoiceForm;
                  setShowInvoiceForm(willShow);
                  if (willShow && !invoiceData.nomorTagihan) {
                    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                    setInvoiceData(prev => ({...prev, nomorTagihan: `INV/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${randomSuffix}`}));
                  }
                }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  {showInvoiceForm ? "Tutup Form" : "+ Ajukan Tagihan"}
                </button>
              </div>

              {showInvoiceForm && (
                <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmitInvoice} className="p-5 bg-indigo-50 rounded-xl border border-indigo-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Tagihan / Invoice</label>
                      <input type="text" readOnly required value={invoiceData.nomorTagihan} onChange={(e) => setInvoiceData({...invoiceData, nomorTagihan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 cursor-not-allowed text-gray-500" placeholder="INV-2024-001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Tagihan (Rp)</label>
                      <input type="number" required value={invoiceData.nilaiTagihan} onChange={(e) => setInvoiceData({...invoiceData, nilaiTagihan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" placeholder="150000000" />
                      {invoiceData.nilaiTagihan && (
                        <p className="text-xs text-indigo-700 font-semibold mt-1">{formatCurrency(parseFloat(invoiceData.nilaiTagihan))}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Jatuh Tempo</label>
                      <input type="date" required value={invoiceData.tanggalJatuhTempo} onChange={(e) => setInvoiceData({...invoiceData, tanggalJatuhTempo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload Invoice</label>
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          <span>Pilih Invoice</span>
                          <input type="file" ref={invoiceFileRef} required onChange={(e) => setInvoiceData({...invoiceData, file: e.target.files?.[0] || null})} accept=".pdf,.png,.jpg,.jpeg" className="hidden" />
                        </label>
                        <div className="text-xs text-gray-500 text-center">
                          {invoiceData.file ? <span className="text-indigo-600 font-medium">{invoiceData.file.name}</span> : "Belum ada file dipilih"} <br/>
                          (Maks. 10MB PDF/JPG/PNG)
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Tambahan</label>
                    <textarea value={invoiceData.keterangan} onChange={(e) => setInvoiceData({...invoiceData, keterangan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white resize-none" rows={2} placeholder="Keterangan opsional..."></textarea>
                  </div>
                  
                  {uploadProgress && <div className="text-sm text-indigo-700 animate-pulse">{uploadProgress}</div>}
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowInvoiceForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">Batal</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{isSubmitting ? "Memproses..." : "Kirim Tagihan"}</button>
                  </div>
                </motion.form>
              )}

              <div className="space-y-3">
                {getSubmissionsByType("pengajuan_tagihan").map((sub) => (
                  <div key={sub.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{sub.title}</h4>
                      {renderStatus(sub.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{sub.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <div>Jatuh Tempo: <strong className="text-gray-900">{formatDate(sub.tanggalJatuhTempo)}</strong></div>
                      <div>Tanggal Input: {formatDate(sub.createdAt)}</div>
                      {sub.dokumenPendukung && <div className="col-span-2">Dokumen Tagihan: <a href={sub.dokumenPendukung} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Lihat Lampiran</a></div>}
                      {sub.paymentProof && <div className="col-span-2">Bukti Bayar (dari Admin): <a href={sub.paymentProof} target="_blank" rel="noreferrer" className="text-green-600 hover:underline font-bold">Lihat Bukti Bayar</a></div>}
                    </div>
                    {sub.rejectionReason && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">Alasan Penolakan: {sub.rejectionReason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROGRESS TAB */}
          {activeTab === "progress" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Update Progress Pekerjaan</h3>
                  <p className="text-sm text-gray-500">Laporkan kemajuan pekerjaan (%).</p>
                </div>
                <button onClick={() => setShowProgressForm(!showProgressForm)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  {showProgressForm ? "Tutup Form" : "+ Update Progress"}
                </button>
              </div>

              {showProgressForm && (
                <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmitProgress} className="p-5 bg-green-50 rounded-xl border border-green-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Progress Baru (%)</label>
                      <input type="number" max="100" min="0" step="0.01" required value={progressData.progress} onChange={(e) => {
                        let val = e.target.value;
                        if (val !== "") {
                          if (parseFloat(val) > 100) val = "100";
                          else if (parseFloat(val) < 0) val = "0";
                          if (val.includes(".")) {
                            const parts = val.split(".");
                            if (parts[1].length > 2) val = parts[0] + "." + parts[1].slice(0, 2);
                          }
                        }
                        setProgressData({...progressData, progress: val});
                      }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" placeholder="Contoh: 75.5" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload Dokumen Bukti Projek</label>
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          <span>Pilih Bukti Projek</span>
                          <input type="file" ref={progressFileRef} required onChange={(e) => setProgressData({...progressData, file: e.target.files?.[0] || null})} accept=".pdf,.png,.jpg,.jpeg" className="hidden" />
                        </label>
                        <div className="text-xs text-gray-500 text-center">
                          {progressData.file ? <span className="text-green-600 font-medium">{progressData.file.name}</span> : "Belum ada file dipilih"} <br/>
                          (Maks. 10MB PDF/JPG/PNG)
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Laporan Singkat / Keterangan</label>
                    <textarea required value={progressData.keterangan} onChange={(e) => setProgressData({...progressData, keterangan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white resize-none" rows={3} placeholder="Apa yang sudah dikerjakan..."></textarea>
                  </div>
                  
                  {uploadProgress && <div className="text-sm text-green-700 animate-pulse">{uploadProgress}</div>}
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowProgressForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">Batal</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">{isSubmitting ? "Memproses..." : "Kirim Update"}</button>
                  </div>
                </motion.form>
              )}

              <div className="space-y-3">
                {getSubmissionsByType("update_progress").map((sub) => (
                  <div key={sub.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{sub.title}</h4>
                      {renderStatus(sub.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{sub.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <div>Progress Diajukan: <strong className="text-gray-900">{sub.proposedProgress}%</strong></div>
                      <div>Tanggal Update: {formatDate(sub.createdAt)}</div>
                      {sub.dokumenBuktiProjek && <div className="col-span-2">Dokumen Bukti: <a href={sub.dokumenBuktiProjek} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">Lihat Lampiran</a></div>}
                    </div>
                    {sub.rejectionReason && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">Alasan Penolakan: {sub.rejectionReason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PERPANJANGAN TAB */}
          {activeTab === "perpanjangan" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Pengajuan Perpanjangan Kontrak</h3>
                  <p className="text-sm text-gray-500">Ajukan perpanjangan batas akhir kontrak.</p>
                </div>
                <button onClick={() => setShowPerpanjanganForm(!showPerpanjanganForm)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
                  {showPerpanjanganForm ? "Tutup Form" : "+ Ajukan Perpanjangan"}
                </button>
              </div>

              {showPerpanjanganForm && (
                <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmitPerpanjangan} className="p-5 bg-orange-50 rounded-xl border border-orange-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Berakhir Baru</label>
                      <input type="date" required value={perpanjanganData.tanggalBerakhirBaru} onChange={(e) => setPerpanjanganData({...perpanjanganData, tanggalBerakhirBaru: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white" min={vendorContract.tanggalBerakhir ? vendorContract.tanggalBerakhir.split('T')[0] : ''} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upload Dokumen Pendukung</label>
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          <span>Pilih Dokumen</span>
                          <input type="file" ref={perpanjanganFileRef} required onChange={(e) => setPerpanjanganData({...perpanjanganData, file: e.target.files?.[0] || null})} accept=".pdf,.png,.jpg,.jpeg" className="hidden" />
                        </label>
                        <div className="text-xs text-gray-500 text-center">
                          {perpanjanganData.file ? <span className="text-orange-600 font-medium">{perpanjanganData.file.name}</span> : "Belum ada file dipilih"} <br/>
                          (Maks. 10MB PDF/JPG/PNG)
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Perpanjangan</label>
                    <textarea required value={perpanjanganData.alasan} onChange={(e) => setPerpanjanganData({...perpanjanganData, alasan: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white resize-none" rows={3} placeholder="Jelaskan alasan butuh perpanjangan waktu..."></textarea>
                  </div>
                  
                  {uploadProgress && <div className="text-sm text-orange-700 animate-pulse">{uploadProgress}</div>}
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowPerpanjanganForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">Batal</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50">{isSubmitting ? "Memproses..." : "Kirim Pengajuan"}</button>
                  </div>
                </motion.form>
              )}

              <div className="space-y-3">
                {getSubmissionsByType("perpanjangan_kontrak").map((sub) => (
                  <div key={sub.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{sub.title}</h4>
                      {renderStatus(sub.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{sub.alasanPerpanjang}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <div>Tanggal Diajukan: <strong className="text-gray-900">{formatDate(sub.proposedEndDate)}</strong></div>
                      <div>Tanggal Input: {formatDate(sub.createdAt)}</div>
                      {sub.negotiatedEndDate && <div>Hasil Negosiasi: <strong className="text-orange-600">{formatDate(sub.negotiatedEndDate)}</strong></div>}
                      {sub.dokumenPendukung && <div className="col-span-2">Dokumen: <a href={sub.dokumenPendukung} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline">Lihat Lampiran</a></div>}
                    </div>
                    {sub.rejectionReason && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">Alasan Penolakan: {sub.rejectionReason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
