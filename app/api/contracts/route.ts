import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';
import { calculateContractStatus } from '../../../lib/contract-status';

const VENDOR_ACCOUNTS_TABLE = 'vendor_accounts';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateActivationToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback if crypto is not available
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function upsertVendorAccount(params: {
  email: string;
  vendorName?: string;
  vendorCompany?: string;
  activeUntil?: string;
}) {
  const normalizedEmail = normalizeEmail(params.email);
  const { data: existing, error } = await supabaseServer
    .from(VENDOR_ACCOUNTS_TABLE)
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const activationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  let activationToken: string | null = null;
  let temporaryPassword: string | null = null;
  let authUserId: string | null = existing?.auth_user_id || null;

  if (!existing) {
    temporaryPassword = generateTemporaryPassword();
    const authResult = await supabaseServer.auth.admin.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (authResult.error) {
      throw authResult.error;
    }

    authUserId = authResult.data.user?.id || null;
    activationToken = generateActivationToken();

    const { data: inserted, error: insertError } = await supabaseServer
      .from(VENDOR_ACCOUNTS_TABLE)
      .insert({
        auth_user_id: authUserId,
        email: normalizedEmail,
        vendor_name: params.vendorName || null,
        vendor_company: params.vendorCompany || null,
        is_active: false,
        active_until: params.activeUntil || null,
        activation_token: activationToken,
        activation_expires_at: activationExpiresAt,
      })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    return {
      vendorAccountId: inserted.id as string,
      activationToken,
      temporaryPassword,
      vendorName: inserted.vendor_name as string | null,
      vendorCompany: inserted.vendor_company as string | null,
    };
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (params.vendorName && !existing.vendor_name) {
    updatePayload.vendor_name = params.vendorName;
  }
  if (params.vendorCompany && !existing.vendor_company) {
    updatePayload.vendor_company = params.vendorCompany;
  }

  if (params.activeUntil) {
    const currentActiveUntil = existing.active_until ? new Date(existing.active_until) : null;
    const nextActiveUntil = new Date(params.activeUntil);
    if (!currentActiveUntil || nextActiveUntil > currentActiveUntil) {
      updatePayload.active_until = params.activeUntil;
    }
  }

  if (!authUserId) {
    temporaryPassword = generateTemporaryPassword();
    const authResult = await supabaseServer.auth.admin.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (authResult.error) {
      throw authResult.error;
    }

    authUserId = authResult.data.user?.id || null;
    updatePayload.auth_user_id = authUserId;
  }

  const now = new Date();
  const existingExpiry = existing.activation_expires_at ? new Date(existing.activation_expires_at) : null;
  if (!existing.is_active && (!existing.activation_token || (existingExpiry && existingExpiry < now))) {
    activationToken = generateActivationToken();
    updatePayload.activation_token = activationToken;
    updatePayload.activation_expires_at = activationExpiresAt;
  }

  if (Object.keys(updatePayload).length > 1) {
    const { error: updateError } = await supabaseServer
      .from(VENDOR_ACCOUNTS_TABLE)
      .update(updatePayload)
      .eq('id', existing.id);

    if (updateError) {
      throw updateError;
    }
  }

  return {
    vendorAccountId: existing.id as string,
    activationToken,
    temporaryPassword,
    vendorName: (existing.vendor_name as string | null) || params.vendorName || null,
    vendorCompany: (existing.vendor_company as string | null) || params.vendorCompany || null,
  };
}

// Table names for split contracts
const TABLES = {
  investment: 'contract_investment',
  maintenance: 'contract_maintenance',
  administration: 'contract_administration',
} as const;

// ============================================
// MAPPER FUNCTIONS - Database to API Response
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInvestmentContract(row: any) {
  const calculatedStatus = calculateContractStatus({
    tanggalBerakhir: row.tanggal_berakhir,
    progressPekerjaan: parseFloat(row.progress_pekerjaan || '0'),
  });

  return {
    id: row.id,
    no: row.no,
    kategori: 'investasi',
    // Backward compatibility - these fields are used in the UI
    uraianKegiatan: row.uraian_kegiatan || row.judul_prk,
    noPerjanjian: row.no_perjanjian,
    tanggalPerjanjian: row.tanggal_perjanjian,
    tanggalBerakhir: row.tanggal_berakhir,
    judulPekerjaan: row.nama_pekerjaan || row.judul_prk,
    nilaiKontrak: row.nilai_perjanjian || 0,
    vendor: row.nama_vendor,
    jenisAnggaran: row.jenis_ai || 'AI',
    unit: row.unit,
    status: calculatedStatus,
    // Investment-specific fields
    judulPRK: row.judul_prk,
    namaPekerjaan: row.nama_pekerjaan,
    noPRK: row.no_prk,
    nilaiPerjanjian: row.nilai_perjanjian || 0,
    nilaiTagihan: row.nilai_tagihan || 0,
    namaVendor: row.nama_vendor,
    vendorEmail: row.vendor_email,
    vendorAccountId: row.vendor_account_id,
    terbayar: row.terbayar || 0,
    totalTagihanDibayar: row.terbayar || 0,
    sisaAnggaran: row.sisa_anggaran || (row.nilai_perjanjian - (row.terbayar || 0)),
    persentaseRealisasi: row.persentase_realisasi || 0,
    jenisAI: row.jenis_ai || 'AI',
    crNotCR: row.cr_not_cr || 'Not CR',
    statusVIP: row.status_vip || 'belum_lunas',
    noWBSPosAnggaran: row.no_wbs_pos_anggaran,
    noSKKI: row.no_skki,
    noSE: row.no_se,
    noPO: row.no_po,
    submissionIdVIP: row.submission_id_vip,
    noBeritaAcara: row.no_berita_acara,
    tanggalBeritaAcara: row.tanggal_berita_acara,
    requestTanggalSE: row.request_tanggal_se,
    unitSektorK: row.unit_sektor_k,
    nilaiTagihanKontrakPusat: row.nilai_tagihan_kontrak_pusat,
    nilaiTagihanUnitInduk: row.nilai_tagihan_unit_induk,
    nilaiBeritaAcara: row.nilai_berita_acara,
    noBeritaAcaraSKRelasi: row.no_berita_acara_sk_relasi,
    tanggalArsip: row.tanggal_arsip,
    noXPS: row.no_xps,
    tanggalXPS: row.tanggal_xps,
    noSKWE: row.no_skwe,
    posAngg: row.pos_angg,
    noSKUSKKO: row.no_sku_skko,
    requestTanggalSERelasi: row.request_tanggal_se_relasi,
    submissionId: row.submission_id,
    jenisPekerjaan: row.jenis_pekerjaan,
    bebanTahun: row.beban_tahun,
    batasPaguTerbayar: row.batas_pagu_terbayar,
    unitTerbayar: row.unit_terbayar,
    konfirmasiNonRutin: row.konfirmasi_non_rutin,
    bidang: row.bidang,
    entryBy: row.entry_by,
    progressPekerjaan: row.progress_pekerjaan || 0,
    oldFlag: row.old_flag,
    clickCB: row.click_cb,
    keterangan: row.keterangan,
    dokumenKontrak: row.dokumen_kontrak,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    // Version tracking fields
    previousContractId: row.previous_contract_id,
    versionNumber: row.version_number || 1,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMaintenanceContract(row: any) {
  // Calculate terbayar from STI Pusat + Unit
  const terbayarSTIPusat = row.terbayar_sti_pusat || 0;
  const terbayarUnit = row.terbayar_unit || 0;
  const totalTerbayar = terbayarSTIPusat + terbayarUnit;
  
  // Calculate nilaiTagihan from STI Pusat + Unit Induk
  const nilaiTagihanSTIPusat = row.nilai_tagihan_sti_pusat || 0;
  const nilaiTagihanUnitInduk = row.nilai_tagihan_unit_induk || 0;
  const totalNilaiTagihan = nilaiTagihanSTIPusat + nilaiTagihanUnitInduk;
  
  const nilaiPerjanjian = row.nilai_perjanjian || 0;
  const sisaAnggaran = nilaiPerjanjian - totalTerbayar;
  const persentaseRealisasi = nilaiPerjanjian > 0 ? (totalTerbayar / nilaiPerjanjian) * 100 : 0;
  
  // For maintenance without progress_pekerjaan, use status_terbayar
  const statusTerbayar = row.status_terbayar || 'Belum Lunas';
  const calculatedStatus = statusTerbayar === 'Lunas' ? 'selesai' as const : 'aktif' as const;

  return {
    id: row.id,
    no: row.no,
    kategori: 'pemeliharaan' as const,
    
    // New schema fields - mapped to both old and new field names for compatibility
    uraianKegiatan: row.uraian_kegiatan,
    noPerjanjian: row.no_perjanjian,
    tanggalPerjanjian: row.tanggal_perjanjian,
    tanggalBerakhir: row.tanggal_berakhir,
    judulPerjanjian: row.judul_perjanjian,
    nilaiPerjanjian: nilaiPerjanjian,
    namaVendor: row.nama_vendor,
    vendorEmail: row.vendor_email,
    vendorAccountId: row.vendor_account_id,
    nilaiTagihanSTIPusat: nilaiTagihanSTIPusat,
    nilaiTagihanUnitInduk: nilaiTagihanUnitInduk,
    noBeritaAcara: row.no_berita_acara,
    tanggalBeritaAcara: row.tanggal_berita_acara,
    noWBSPosAnggaran: row.no_wbs_pos_anggaran,
    noSKKISKKO: row.no_skki_skko,
    tanggalRequestSE: row.tanggal_request_se,
    tanggalSERilis: row.tanggal_se_rilis,
    noSE: row.no_se,
    noPO: row.no_po,
    submissionIdVIP: row.submission_id_vip,
    namaPekerjaan: row.nama_pekerjaan,
    msb: row.msb,
    bidang: row.bidang,
    statusVIP: row.status_vip || 'belum_lunas',
    periodeAccrue: row.periode_accrue,
    requestedBy: row.requested_by,
    keterangan: row.keterangan,
    terbayarSTIPusat: terbayarSTIPusat,
    terbayarUnit: terbayarUnit,
    statusTerbayar: statusTerbayar,
    rutinNonRutin: row.rutin_non_rutin,
    
    // Backward compatibility fields - used by UI components
    judulPekerjaan: row.judul_perjanjian || row.nama_pekerjaan, // Map to judulPerjanjian
    nilaiKontrak: nilaiPerjanjian, // Map to nilaiPerjanjian
    vendor: row.nama_vendor, // Map to namaVendor
    jenisAnggaran: 'AO', // Maintenance is always AO
    unit: row.msb || '-',
    status: calculatedStatus,
    
    // Calculated fields
    nilaiTagihan: totalNilaiTagihan,
    totalTagihanDibayar: totalTerbayar,
    terbayar: totalTerbayar,
    sisaAnggaran: sisaAnggaran,
    persentaseRealisasi: persentaseRealisasi,
    progressPekerjaan: persentaseRealisasi, // Use persentaseRealisasi as progress
    
    // Timestamps
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Version tracking fields
    previousContractId: row.previous_contract_id,
    versionNumber: row.version_number || 1,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAdministrationContract(row: any) {
  // Calculate totals
  const nilaiPerjanjian = row.nilai_perjanjian || 0;
  const terbayarPusat = row.terbayar_pusat || 0;
  const nilaiTagihanKeseluruhan = row.nilai_tagihan_keseluruhan || 0;
  const sisaAnggaran = nilaiPerjanjian - terbayarPusat;
  const persentaseRealisasi = nilaiPerjanjian > 0 ? (terbayarPusat / nilaiPerjanjian) * 100 : 0;
  
  // Calculate status based on statusBayar
  const statusBayar = row.status_bayar || 'belum_terbayar';
  const calculatedStatus = statusBayar === 'lunas' ? 'selesai' as const : 'aktif' as const;

  return {
    id: row.id,
    no: row.no,
    kategori: 'administrasi' as const,
    
    // 1. Uraian Kegiatan/Mata Anggaran
    uraianKegiatan: row.uraian_kegiatan,
    
    // 2. No. Perjanjian/Amandemen
    noPerjanjian: row.no_perjanjian,
    
    // 3. Tanggal Perjanjian/Amandemen
    tanggalPerjanjian: row.tanggal_perjanjian,
    
    // 4. Tanggal Berakhir
    tanggalBerakhir: row.tanggal_berakhir,
    
    // 5. Judul Perjanjian
    judulPerjanjian: row.judul_perjanjian,
    
    // 6. Nilai Perjanjian
    nilaiPerjanjian: nilaiPerjanjian,
    
    // 7. Nama Vendor
    namaVendor: row.nama_vendor,
    vendorEmail: row.vendor_email,
    vendorAccountId: row.vendor_account_id,
    
    // 8. Nilai Tagihan Keseluruhan
    nilaiTagihanKeseluruhan: nilaiTagihanKeseluruhan,
    
    // 9. Nilai Tagihan Khusus Kantor Pusat
    nilaiTagihanKantorPusat: row.nilai_tagihan_kantor_pusat || 0,
    
    // 10. Nilai Tagihan Unit selain Kantor Pusat
    nilaiTagihanUnitSelainPusat: row.nilai_tagihan_unit_selain_pusat || 0,
    
    // 11. No. Berita Acara
    noBeritaAcara: row.no_berita_acara,
    
    // 12. Tanggal Berita Acara
    tanggalBeritaAcara: row.tanggal_berita_acara,
    
    // 13. No. WBS/Pos Anggaran
    noWBSPosAnggaran: row.no_wbs_pos_anggaran,
    
    // 14. No. SKKI/SKKO
    noSKKISKKO: row.no_skki_skko,
    
    // 15. Tanggal Request
    tanggalRequest: row.tanggal_request,
    
    // 16. Tanggal SE release
    tanggalSERelease: row.tanggal_se_release,
    
    // 17. No. SE
    noSE: row.no_se,
    
    // 18. No. PO
    noPO: row.no_po,
    
    // 19. Submission ID
    submissionId: row.submission_id,
    
    // 20. Nama Pekerjaan
    namaPekerjaan: row.nama_pekerjaan,
    
    // 21. Beban Tahun
    bebanTahun: row.beban_tahun,
    
    // 22. Terbayar Pusat
    terbayarPusat: terbayarPusat,
    
    // 23. Status Bayar
    statusBayar: statusBayar,
    
    // 24. Keterangan
    keterangan: row.keterangan,
    
    // 25. Entry By
    entryBy: row.entry_by,
    
    // 26. Keterangan/Konfirmasi
    keteranganKonfirmasi: row.keterangan_konfirmasi,
    
    // 27. Rutin/Non Rutin
    rutinNonRutin: row.rutin_non_rutin,
    
    // 28. PIC
    pic: row.pic,
    
    // 29. Bidang
    bidang: row.bidang,
    
    // Backward compatibility fields for UI
    judulPekerjaan: row.judul_perjanjian || row.nama_pekerjaan,
    nilaiKontrak: nilaiPerjanjian,
    vendor: row.nama_vendor,
    jenisAnggaran: 'AO',
    unit: row.bidang || '-',
    status: calculatedStatus,
    
    // Calculated fields
    nilaiTagihan: nilaiTagihanKeseluruhan,
    totalTagihanDibayar: terbayarPusat,
    terbayar: terbayarPusat,
    sisaAnggaran: sisaAnggaran,
    persentaseRealisasi: persentaseRealisasi,
    progressPekerjaan: persentaseRealisasi,
    
    // Timestamps
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Version tracking fields
    previousContractId: row.previous_contract_id,
    versionNumber: row.version_number || 1,
  };
}

// GET - Ambil semua contracts dari 3 tabel
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kategori = searchParams.get('kategori');

    // If kategori is specified, fetch from specific table
    if (kategori) {
      let tableName: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mapper: (row: any) => any;

      switch (kategori) {
        case 'investasi':
          tableName = TABLES.investment;
          mapper = mapInvestmentContract;
          break;
        case 'pemeliharaan':
          tableName = TABLES.maintenance;
          mapper = mapMaintenanceContract;
          break;
        case 'administrasi':
          tableName = TABLES.administration;
          mapper = mapAdministrationContract;
          break;
        default:
          return NextResponse.json({ error: 'Invalid kategori' }, { status: 400 });
      }

      const { data, error } = await supabaseServer
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error fetching ${kategori} contracts:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const mappedData = (data || []).map(mapper);
      return NextResponse.json({ data: mappedData }, { status: 200 });
    }

    // Fetch from all 3 tables in parallel
    const [investmentRes, maintenanceRes, administrationRes] = await Promise.all([
      supabaseServer
        .from(TABLES.investment)
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseServer
        .from(TABLES.maintenance)
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseServer
        .from(TABLES.administration)
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    // Check for errors
    if (investmentRes.error) {
      console.error('Error fetching investment contracts:', investmentRes.error);
    }
    if (maintenanceRes.error) {
      console.error('Error fetching maintenance contracts:', maintenanceRes.error);
    }
    if (administrationRes.error) {
      console.error('Error fetching administration contracts:', administrationRes.error);
    }

    // Map and combine all contracts
    const investmentContracts = (investmentRes.data || []).map(mapInvestmentContract);
    const maintenanceContracts = (maintenanceRes.data || []).map(mapMaintenanceContract);
    const administrationContracts = (administrationRes.data || []).map(mapAdministrationContract);

    const allContracts = [
      ...investmentContracts,
      ...maintenanceContracts,
      ...administrationContracts,
    ];

    return NextResponse.json({ data: allContracts }, { status: 200 });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ error: error?.message || String(error) || 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get table name from kategori
function getTableName(kategori: string): string | null {
  switch (kategori) {
    case 'investasi':
      return TABLES.investment;
    case 'pemeliharaan':
      return TABLES.maintenance;
    case 'administrasi':
      return TABLES.administration;
    default:
      return null;
  }
}

// POST - Tambah contract baru
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const kategori = body.kategori;

    if (!kategori) {
      return NextResponse.json({ error: 'Kategori is required' }, { status: 400 });
    }

    const tableName = getTableName(kategori);
    if (!tableName) {
      return NextResponse.json({ error: 'Invalid kategori' }, { status: 400 });
    }

    let contractData: Record<string, unknown>;
    let vendorAccountId: string | null = null;
    let activationToken: string | null = null;
    let temporaryPassword: string | null = null;

    if (body.vendorEmail) {
      const vendorAccount = await upsertVendorAccount({
        email: body.vendorEmail,
        vendorName: body.namaVendor || body.vendor,
        vendorCompany: body.namaVendor || body.vendor,
        activeUntil: body.tanggalBerakhir,
      });

      vendorAccountId = vendorAccount.vendorAccountId;
      activationToken = vendorAccount.activationToken;
      temporaryPassword = vendorAccount.temporaryPassword;
    }

    if (kategori === 'investasi') {
      // Investment contract data mapping
      contractData = {
        no_perjanjian: body.noPerjanjian,
        tanggal_perjanjian: body.tanggalPerjanjian,
        tanggal_berakhir: body.tanggalBerakhir,
        judul_prk: body.judulPRK || body.uraianKegiatan,
        nama_pekerjaan: body.namaPekerjaan || body.judulPekerjaan,
        no_prk: body.noPRK,
        nilai_perjanjian: body.nilaiPerjanjian || body.nilaiKontrak,
        nilai_tagihan: body.nilaiTagihan || 0,
        terbayar: body.terbayar || 0,
        nama_vendor: body.namaVendor || body.vendor,
        vendor_email: body.vendorEmail,
        vendor_account_id: vendorAccountId,
        jenis_ai: body.jenisAI || body.jenisAnggaran || 'AI',
        cr_not_cr: body.crNotCR || 'Not CR',
        status: body.status || 'aktif',
        status_vip: body.statusVIP || 'belum_lunas',
        no_wbs_pos_anggaran: body.noWBSPosAnggaran,
        no_skki: body.noSKKI,
        no_se: body.noSE,
        no_po: body.noPO,
        submission_id_vip: body.submissionIdVIP,
        unit: body.unit,
        uraian_kegiatan: body.uraianKegiatan,
        keterangan: body.keterangan,
        created_by: body.createdBy,
        // Version tracking fields
        previous_contract_id: body.previousContractId,
        version_number: body.versionNumber || 1,
      };
    } else {
      // Maintenance or Administration contract data mapping
      contractData = {
        no_perjanjian: body.noPerjanjian,
        tanggal_perjanjian: body.tanggalPerjanjian,
        tanggal_berakhir: body.tanggalBerakhir,
        judul_pekerjaan: body.judulPekerjaan,
        uraian_kegiatan: body.uraianKegiatan,
        nilai_kontrak: body.nilaiKontrak,
        nilai_tagihan: body.nilaiTagihan || 0,
        total_tagihan_dibayar: 0,
        vendor: body.vendor,
        vendor_email: body.vendorEmail,
        vendor_account_id: vendorAccountId,
        status: body.status || 'aktif',
        jenis_anggaran: body.jenisAnggaran || 'AO',
        unit: body.unit,
        keterangan: body.keterangan,
        created_by: body.createdBy,
        // Version tracking fields
        previous_contract_id: body.previousContractId,
        version_number: body.versionNumber || 1,
      };
    }

    // Try inserting contract. If the DB schema doesn't have version tracking columns,
    // retry without them (backward compatible for environments missing migration).
    async function insertContract(dataObj: Record<string, unknown>) {
      return await supabaseServer
        .from(tableName as string)
        .insert([dataObj])
        .select()
        .single();
    }

    let insertResult = await insertContract(contractData as Record<string, unknown>);

    if (insertResult.error) {
      const errMsg = (insertResult.error.message || String(insertResult.error)).toLowerCase();

      // If the error indicates missing columns for version tracking, remove them and retry
      if ((errMsg.includes('previous_contract_id') || errMsg.includes('version_number') || errMsg.includes('column') && errMsg.includes('does not exist'))
          && (contractData as any).previous_contract_id !== undefined) {
        // Remove version-tracking fields and retry
        delete (contractData as any).previous_contract_id;
        delete (contractData as any).version_number;

        const retryResult = await insertContract(contractData as Record<string, unknown>);
        if (retryResult.error) {
          console.error('Error creating contract after retry (without version fields):', retryResult.error);
          return NextResponse.json({ error: retryResult.error.message || 'Failed to create new contract version' }, { status: 500 });
        }

        return NextResponse.json({ data: retryResult.data }, { status: 201 });
      }

      console.error('Error creating contract:', insertResult.error);
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    if (body.vendorEmail && activationToken) {
      try {
        const { sendVendorActivationEmail } = await import('../../../lib/email');
        await sendVendorActivationEmail({
          vendorEmail: body.vendorEmail,
          vendorName: body.namaVendor || body.vendor,
          vendorCompany: body.namaVendor || body.vendor,
          contractId: insertResult.data?.id,
          contractTitle: body.judulPRK || body.judulPerjanjian || body.namaPekerjaan,
          tanggalPerjanjian: body.tanggalPerjanjian,
          tanggalBerakhir: body.tanggalBerakhir,
          username: `vendor.${(body.namaVendor || body.vendor).toLowerCase().replace(/\s+/g, '').slice(0, 10)}`,
          password: temporaryPassword || undefined,
          activationToken: activationToken,
        });
      } catch (emailError) {
        console.warn('Failed to send vendor activation email:', emailError);
      }
    }
    return NextResponse.json({ data: insertResult.data }, { status: 201 });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ error: error?.message || String(error) || 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update contract
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, kategori, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 });
    }

    if (!kategori) {
      return NextResponse.json({ error: 'Kategori is required' }, { status: 400 });
    }

    const tableName = getTableName(kategori);
    if (!tableName) {
      return NextResponse.json({ error: 'Invalid kategori' }, { status: 400 });
    }

    // Transform camelCase to snake_case
    const updateData: Record<string, unknown> = {};
    Object.keys(updates).forEach((key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      updateData[snakeKey] = updates[key];
    });

    const { data, error } = await supabaseServer
      .from(tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contract:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ error: error?.message || String(error) || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Hapus contract
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const kategori = searchParams.get('kategori');

    if (!id) {
      return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 });
    }

    if (!kategori) {
      return NextResponse.json({ error: 'Kategori is required' }, { status: 400 });
    }

    const tableName = getTableName(kategori);
    if (!tableName) {
      return NextResponse.json({ error: 'Invalid kategori' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting contract:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ error: error?.message || String(error) || 'Internal server error' }, { status: 500 });
  }
}
