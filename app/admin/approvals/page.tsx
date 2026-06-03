"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth-new";
import type { ApprovalRequest, ApprovalStatus, ApprovalType } from "@/lib/types-new";
import { useContractStore } from "@/lib/store-new";

const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  update_kontrak: "Update Kontrak",
  invoice_payment: "Kelola Invoice",
  pengajuan_tagihan: "Kelola Invoice", // maps to same
  update_progress: "Update Progress",
  perpanjangan_kontrak: "Perpanjangan Kontrak",
};

const APPROVAL_TYPE_COLORS: Record<ApprovalType, string> = {
  update_kontrak: "bg-purple-100 text-purple-800",
  invoice_payment: "bg-indigo-100 text-indigo-800",
  pengajuan_tagihan: "bg-indigo-100 text-indigo-800",
  update_progress: "bg-green-100 text-green-800",
  perpanjangan_kontrak: "bg-orange-100 text-orange-800",
};

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  negotiation: "Negosiasi",
};

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  negotiation: "bg-blue-100 text-blue-800",
};

function formatCurrency(value: number | undefined | null): string {
  if (!value || value === 0) return "Rp 0";
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(2)} M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)} jt`;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatInputCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '';
  
  let text = `Rp ${num.toLocaleString('id-ID')}`;
  
  if (num >= 1000000000000) {
    text += ` (${(num / 1000000000000).toFixed(2)} triliun)`;
  } else if (num >= 1000000000) {
    text += ` (${(num / 1000000000).toFixed(2)} miliar)`;
  } else if (num >= 1000000) {
    text += ` (${(num / 1000000).toFixed(2)} juta)`;
  }
  
  return text;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminApprovalsPage() {
  const { user } = useAuth();
  const { refreshData, contracts } = useContractStore();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "negotiate">("approve");
  
  const [rejectionReason, setRejectionReason] = useState("");
  const [negotiatedValue, setNegotiatedValue] = useState("");
  const [negotiatedEndDate, setNegotiatedEndDate] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const paymentProofRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();

    // Auto-refresh interval (every 5 seconds)
    const interval = setInterval(() => {
      fetchApprovals(true);
      if (refreshData) {
        refreshData(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshData]);

  const fetchApprovals = async (background = false) => {
    try {
      if (!background) setIsLoading(true);
      const res = await fetch("/api/approvals");
      if (res.ok) {
        const { data } = await res.json();
        setApprovals(data);
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      if (!background) setIsLoading(false);
    }
  };

  const getMinNegotiationDate = () => {
    if (!selectedApproval) return undefined;
    const contract = contracts.find(c => c.id === selectedApproval.contractId);
    if (!contract || !contract.tanggalBerakhir) return undefined;
    // Format to YYYY-MM-DD
    return new Date(contract.tanggalBerakhir).toISOString().split('T')[0];
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

  const handleAction = async () => {
    if (!selectedApproval) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setUploadProgress(null);

    try {
      let paymentProofUrl = undefined;
      
      if (actionType === "approve" && (selectedApproval.type === "invoice_payment" || selectedApproval.type === "pengajuan_tagihan")) {
        if (!paymentProofFile) {
           throw new Error("Silakan lampirkan Bukti Pembayaran");
        }
        paymentProofUrl = await uploadFile(paymentProofFile, "bukti-bayar");
      }

      if (actionType === "negotiate" && selectedApproval.type === "update_kontrak") {
        const val = parseFloat(negotiatedValue) || 0;
        const contract = contracts.find(c => c.id === selectedApproval.contractId);
        const currentContractValue = contract?.nilaiKontrak || 0;
        if (val < currentContractValue) {
          throw new Error(`Nilai negosiasi tidak boleh lebih kecil dari nilai kontrak saat ini (${formatCurrency(currentContractValue)})`);
        }
      }

      const res = await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedApproval.id,
          action: actionType,
          reviewedBy: user?.id,
          reviewedByName: user?.name,
          rejectionReason: actionType === "reject" ? rejectionReason : undefined,
          negotiatedValue: actionType === "negotiate" ? parseFloat(negotiatedValue) : undefined,
          negotiatedEndDate: actionType === "negotiate" ? negotiatedEndDate : undefined,
          paymentProof: paymentProofUrl,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowActionModal(false);
        setSelectedApproval(null);
        resetForm();
        fetchApprovals(); // Refresh from DB
        
        // Refresh global store so Dashboard and other pages are synced instantly
        refreshData().catch((err: any) => console.error("Failed to refresh global store:", err));

        setSuccessMessage(
          actionType === "approve"
            ? "Pengajuan berhasil disetujui"
            : actionType === "reject"
            ? "Pengajuan berhasil ditolak"
            : "Negosiasi berhasil dikirim"
        );
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(data.error || "Gagal menyimpan aksi");
      }
    } catch (error: any) {
      console.error("Error processing approval:", error);
      setErrorMessage(error.message || "Terjadi kesalahan saat memproses data.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const resetForm = () => {
    setRejectionReason("");
    setNegotiatedValue("");
    setNegotiatedEndDate("");
    setPaymentProofFile(null);
    setErrorMessage(null);
    if (paymentProofRef.current) paymentProofRef.current.value = "";
  };

  const openActionModal = (approval: ApprovalRequest, action: "approve" | "reject" | "negotiate") => {
    resetForm();
    
    if (action === "approve" && (approval.type === "pengajuan_tagihan" || approval.type === "invoice_payment") && approval.tanggalJatuhTempo) {
      const jatuhTempoDate = new Date(approval.tanggalJatuhTempo);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (jatuhTempoDate < today) {
        alert("Perhatian: Tanggal jatuh tempo sudah terlewati. Sistem otomatis mengalihkan aksi menjadi 'Tolak'.");
        setActionType("reject");
        setRejectionReason("Ditolak Otomatis oleh Sistem: Tanggal jatuh tempo sudah terlewati.");
        setSelectedApproval(approval);
        setShowActionModal(true);
        return;
      }
    }

    setSelectedApproval(approval);
    setActionType(action);
    setShowActionModal(true);
  };

  const filteredApprovals = approvals.filter((a) => {
    // Map invoice_payment and pengajuan_tagihan together
    if (filterType === "invoice_payment" && a.type !== "pengajuan_tagihan" && a.type !== "invoice_payment") return false;
    if (filterType !== "all" && filterType !== "invoice_payment" && a.type !== filterType) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-500 mb-6">Halaman ini hanya untuk Admin.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Management</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola pengajuan dari vendor</p>
        </div>
        <Link href="/admin/vendor-accounts" className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
          Kelola Akun Vendor
        </Link>
      </div>

      {successMessage && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm text-green-700 font-medium">✓ {successMessage}</p>
        </motion.div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipe Pengajuan</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900">
              <option value="all">Semua Tipe</option>
              <option value="update_kontrak">Update Kontrak</option>
              <option value="invoice_payment">Kelola Invoice</option>
              <option value="update_progress">Update Progress</option>
              <option value="perpanjangan_kontrak">Perpanjangan Kontrak</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900">
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="negotiation">Negosiasi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Approval List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Memuat data...</p>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">Tidak ada pengajuan yang ditemukan.</p>
          </div>
        ) : (
          filteredApprovals.map((approval) => (
            <motion.div key={approval.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${APPROVAL_TYPE_COLORS[approval.type] || 'bg-gray-100'}`}>
                      {APPROVAL_TYPE_LABELS[approval.type] || approval.type}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[approval.status]}`}>
                      {STATUS_LABELS[approval.status]}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{approval.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{approval.description}</p>
                  
                  {/* Detailed Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-lg mb-3">
                    <div>
                      <span className="text-gray-500 block mb-1">Diajukan oleh:</span>
                      <p className="font-medium text-gray-900">{approval.requestedByName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Tanggal Input:</span>
                      <p className="font-medium text-gray-900">{formatDate(approval.createdAt)}</p>
                    </div>
                    {approval.dokumenPendukung && (
                      <div>
                        <span className="text-gray-500 block mb-1">Dokumen Pendukung:</span>
                        <a href={approval.dokumenPendukung} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">
                          Lihat Dokumen ↗
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Type-specific details */}
                  {approval.type === "update_kontrak" && approval.proposedValue && (
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 block">Nilai Saat Ini (jika ada):</span>
                        <p className="font-medium text-gray-900">{formatCurrency(approval.currentValue)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Nilai Diajukan:</span>
                        <p className="font-medium text-purple-700">{formatCurrency(approval.proposedValue)}</p>
                      </div>
                      {approval.alasan && (
                         <div className="col-span-2">
                            <span className="text-gray-500 block">Alasan:</span>
                            <p className="font-medium text-gray-900">{approval.alasan}</p>
                         </div>
                      )}
                    </div>
                  )}

                  {(approval.type === "invoice_payment" || approval.type === "pengajuan_tagihan") && (
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 block">Tanggal Jatuh Tempo:</span>
                        <p className="font-medium text-gray-900">{formatDate(approval.tanggalJatuhTempo)}</p>
                      </div>
                    </div>
                  )}

                  {approval.type === "update_progress" && (
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 block">Progress Saat Ini:</span>
                        <p className="font-medium text-gray-900">{approval.currentProgress}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Progress Diajukan:</span>
                        <p className="font-medium text-green-700">{approval.proposedProgress}%</p>
                      </div>
                      {approval.dokumenBuktiProjek && (
                         <div className="col-span-2">
                           <span className="text-gray-500 block">Bukti Projek:</span>
                           <a href={approval.dokumenBuktiProjek} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">Lihat Lampiran ↗</a>
                         </div>
                      )}
                    </div>
                  )}

                  {approval.type === "perpanjangan_kontrak" && (
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 block">Tanggal Akhir Diajukan:</span>
                        <p className="font-medium text-orange-700">{formatDate(approval.proposedEndDate)}</p>
                      </div>
                      <div className="col-span-2">
                         <span className="text-gray-500 block">Alasan Perpanjangan:</span>
                         <p className="font-medium text-gray-900">{approval.alasanPerpanjang}</p>
                      </div>
                    </div>
                  )}

                  {/* Review info if already reviewed */}
                  {approval.status !== "pending" && approval.reviewedByName && (
                    <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-sm">
                      <p className="text-blue-800">
                        <span className="font-medium">Direview oleh:</span> {approval.reviewedByName} pada {formatDate(approval.reviewedAt)}
                      </p>
                      {approval.rejectionReason && (
                        <p className="text-red-700 mt-1">
                          <span className="font-medium">Alasan Penolakan:</span> {approval.rejectionReason}
                        </p>
                      )}
                      {approval.negotiatedValue && (
                        <p className="text-purple-700 mt-1">
                          <span className="font-medium">Nilai Negosiasi:</span> {formatCurrency(approval.negotiatedValue)}
                        </p>
                      )}
                      {approval.negotiatedEndDate && (
                        <p className="text-orange-700 mt-1">
                          <span className="font-medium">Tanggal Negosiasi:</span> {formatDate(approval.negotiatedEndDate)}
                        </p>
                      )}
                      {approval.paymentProof && (
                        <p className="text-indigo-700 mt-1">
                          <span className="font-medium">Bukti Pembayaran:</span> <a href={approval.paymentProof} target="_blank" rel="noreferrer" className="underline">Lihat Bukti</a>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons - Only for pending */}
                {approval.status === "pending" && (
                  <div className="flex flex-col gap-2 ml-4 min-w-[120px]">
                    <button onClick={() => openActionModal(approval, "approve")} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm">
                      Setujui
                    </button>
                    {(approval.type === "update_kontrak" || approval.type === "perpanjangan_kontrak") && (
                      <button onClick={() => openActionModal(approval, "negotiate")} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                        Negosiasi
                      </button>
                    )}
                    <button onClick={() => openActionModal(approval, "reject")} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm">
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && selectedApproval && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {actionType === "approve" ? "Setujui Pengajuan" : actionType === "reject" ? "Tolak Pengajuan" : "Kirim Negosiasi"}
            </h2>

            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{selectedApproval.title}</p>
              <p className="text-xs text-gray-500 mt-1">{selectedApproval.requestedByName}</p>
            </div>

            {/* Proposed value display at the top of the modal for contract updates */}
            {actionType === "negotiate" && selectedApproval.type === "update_kontrak" && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                <span className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Nilai yang Diajukan Vendor</span>
                <div className="text-2xl font-extrabold text-blue-950 mt-1">
                  Rp {selectedApproval.proposedValue?.toLocaleString("id-ID")}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  ({formatCurrency(selectedApproval.proposedValue)})
                </div>
              </div>
            )}
            
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {errorMessage}
              </div>
            )}

            {/* Approve - Tagihan: Bukti Pembayaran */}
            {actionType === "approve" && (selectedApproval.type === "invoice_payment" || selectedApproval.type === "pengajuan_tagihan") && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Bukti Pembayaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  ref={paymentProofRef}
                  onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Maks. 10MB (PDF/JPG/PNG)</p>
              </div>
            )}

            {/* Reject: Alasan Penolakan */}
            {actionType === "reject" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alasan Penolakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Jelaskan alasan penolakan..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            )}

            {/* Negotiate: Nilai/Tanggal */}
            {actionType === "negotiate" && (
              <>
                {selectedApproval.type === "update_kontrak" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nilai Kontrak Negosiasi (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={negotiatedValue}
                      onChange={(e) => setNegotiatedValue(e.target.value)}
                      placeholder="Masukkan nilai negosiasi"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {negotiatedValue && (
                      <p className="mt-1.5 text-xs text-blue-600 font-medium">
                        Nominal: {formatInputCurrency(negotiatedValue)}
                      </p>
                    )}
                  </div>
                )}
                {selectedApproval.type === "perpanjangan_kontrak" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Akhir Negosiasi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={getMinNegotiationDate()}
                      value={negotiatedEndDate}
                      onChange={(e) => setNegotiatedEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Diajukan: {formatDate(selectedApproval.proposedEndDate)}
                    </p>
                  </div>
                )}
              </>
            )}

            {uploadProgress && <div className="text-sm text-blue-700 mb-4 animate-pulse">{uploadProgress}</div>}

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowActionModal(false); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Batal
              </button>
              <button
                onClick={handleAction}
                disabled={isSubmitting || 
                  (actionType === "reject" && !rejectionReason) || 
                  (actionType === "negotiate" && selectedApproval.type === "update_kontrak" && !negotiatedValue) || 
                  (actionType === "negotiate" && selectedApproval.type === "perpanjangan_kontrak" && !negotiatedEndDate) ||
                  (actionType === "approve" && (selectedApproval.type === "invoice_payment" || selectedApproval.type === "pengajuan_tagihan") && !paymentProofFile)
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionType === "approve" ? "bg-green-600 hover:bg-green-700" : actionType === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSubmitting ? "Memproses..." : actionType === "approve" ? "Setujui" : actionType === "reject" ? "Tolak" : "Kirim Negosiasi"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
