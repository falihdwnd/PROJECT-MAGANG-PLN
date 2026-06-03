import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabaseServer';

// ============================================
// API: APPROVAL MANAGEMENT (Supabase Integration)
// ============================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const contractId = searchParams.get('contractId');
    const vendorId = searchParams.get('vendorId');

    let query = supabaseServer
      .from('vendor_submissions')
      .select(`
        *,
        vendor_accounts(vendor_name, vendor_company)
      `)
      .order('created_at', { ascending: false });

    if (type && type !== 'all') {
      query = query.eq('submission_type', type);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (contractId) {
      query = query.or(`contract_investment_id.eq.${contractId},contract_maintenance_id.eq.${contractId},contract_administration_id.eq.${contractId}`);
    }
    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map database fields to the frontend ApprovalRequest format
    const formattedData = data.map(item => ({
      id: item.id,
      type: item.submission_type,
      // Since it can be any of the three, we find which one is not null
      contractId: item.contract_investment_id || item.contract_maintenance_id || item.contract_administration_id || '',
      requestedBy: item.vendor_id,
      requestedByName: item.vendor_accounts ? `${item.vendor_accounts.vendor_name} (${item.vendor_accounts.vendor_company})` : 'Vendor',
      requestedAt: item.created_at,
      status: item.status,
      title: item.title,
      description: item.description,
      
      dokumenPendukung: item.dokumen_pendukung,
      
      // Update Kontrak
      alasan: item.alasan,
      proposedValue: item.nilai_kontrak_baru,
      negotiatedValue: item.negosiasi_nilai_kontrak,
      
      // Tagihan
      tanggalJatuhTempo: item.tanggal_jatuh_tempo,
      paymentProof: item.bukti_pembayaran,
      
      // Progress
      proposedProgress: item.progress_baru,
      currentProgress: item.progress_sekarang,
      dokumenBuktiProjek: item.dokumen_bukti_projek,
      
      // Perpanjangan
      proposedEndDate: item.tanggal_perpanjang,
      alasanPerpanjang: item.alasan_perpanjang,
      negotiatedEndDate: item.negosiasi_tanggal_akhir,
      
      // Admin info
      rejectionReason: item.alasan_penolakan,
      reviewedBy: item.reviewed_by,
      reviewedByName: item.reviewed_by_name,
      reviewedAt: item.reviewed_at,
      
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json({ data: formattedData });
  } catch (error: any) {
    console.error('Error fetching approvals:', error.message);
    return NextResponse.json({ error: 'Failed to fetch approvals', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      type, 
      contractId, 
      contractType,
      requestedBy, 
      title, 
      description,
      // Extracted specific fields:
      dokumenPendukung,
      alasan,
      proposedValue,
      tanggalJatuhTempo,
      proposedProgress,
      currentProgress,
      dokumenBuktiProjek,
      proposedEndDate,
      alasanPerpanjang,
      nomorTagihan,
      nilaiTagihan
    } = body;

    if (!type || !contractId || !requestedBy || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: type, contractId, requestedBy, title' },
        { status: 400 }
      );
    }

    // Prepare payload
    const payload: any = {
      vendor_id: requestedBy,
      submission_type: type,
      status: 'pending',
      title,
      description,
      dokumen_pendukung: dokumenPendukung,
      tanggal_input: new Date().toISOString().split('T')[0],
    };

    // Assign contract ID to the correct column based on contractType
    if (contractType === 'investment') {
      payload.contract_investment_id = contractId;
    } else if (contractType === 'maintenance') {
      payload.contract_maintenance_id = contractId;
    } else if (contractType === 'administration') {
      payload.contract_administration_id = contractId;
    } else {
      // For now, if contractType is omitted, we might assume it's investment or handle it gracefully
      // But standard approach requires contractType
      payload.contract_investment_id = contractId;
    }

    // Map specific fields
    if (type === 'update_kontrak') {
      payload.alasan = alasan;
      payload.nilai_kontrak_baru = proposedValue;
    } else if (type === 'invoice_payment' || type === 'pengajuan_tagihan') {
      payload.submission_type = 'pengajuan_tagihan';
      payload.tanggal_jatuh_tempo = tanggalJatuhTempo;
      if (nomorTagihan) payload.nomor_tagihan = nomorTagihan;
      if (nilaiTagihan !== undefined) payload.nilai_tagihan = nilaiTagihan;
    } else if (type === 'update_progress') {
      payload.progress_baru = proposedProgress;
      payload.progress_sekarang = currentProgress;
      payload.dokumen_bukti_projek = dokumenBuktiProjek;
      payload.tanggal_update = new Date().toISOString().split('T')[0];
    } else if (type === 'perpanjangan_kontrak') {
      payload.tanggal_perpanjang = proposedEndDate;
      payload.alasan_perpanjang = alasanPerpanjang;
    }

    const { data, error } = await supabaseServer
      .from('vendor_submissions')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating approval:', error.message);
    return NextResponse.json({ error: 'Failed to create approval', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, 
      action, // 'approve' | 'reject' | 'negotiate'
      reviewedBy,
      reviewedByName,
      rejectionReason,
      negotiatedValue,
      negotiatedEndDate,
      paymentProof,
    } = body;

    if (!id || !action || !reviewedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: id, action, reviewedBy' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['approve', 'reject', 'negotiate'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // First fetch the existing submission
    const { data: submission, error: fetchSubError } = await supabaseServer
      .from('vendor_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchSubError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Map action to status
    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      negotiate: 'negotiation',
    };

    const payload: any = {
      status: statusMap[action],
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName || 'Admin',
      reviewed_at: new Date().toISOString(),
    };

    if (action === 'reject') {
      payload.alasan_penolakan = rejectionReason;
    } else if (action === 'negotiate') {
      if (negotiatedValue) payload.negosiasi_nilai_kontrak = negotiatedValue;
      if (negotiatedEndDate) payload.negosiasi_tanggal_akhir = negotiatedEndDate;
    } else if (action === 'approve') {
      if (paymentProof) payload.bukti_pembayaran = paymentProof;
    }
      
    // AUTO UPDATE LOGIC

      let targetTable = '';
      let contractId = '';
      let category = '';
      
      if (submission.contract_investment_id) {
        targetTable = 'contract_investment';
        contractId = submission.contract_investment_id;
        category = 'investasi';
      } else if (submission.contract_maintenance_id) {
        targetTable = 'contract_maintenance';
        contractId = submission.contract_maintenance_id;
        category = 'pemeliharaan';
      } else if (submission.contract_administration_id) {
        targetTable = 'contract_administration';
        contractId = submission.contract_administration_id;
        category = 'administrasi';
      }

      if (targetTable && contractId) {
        if (action === 'approve' && ['update_kontrak', 'perpanjangan_kontrak', 'update_progress'].includes(submission.submission_type)) {
          // 1. Fetch current contract
        const { data: currentContract, error: fetchContractError } = await supabaseServer
          .from(targetTable)
          .select('*')
          .eq('id', contractId)
          .single();
          
        if (currentContract && !fetchContractError) {
          // 2. Backup to history
          await supabaseServer.from('contract_history_logs').insert({
            contract_id: contractId,
            contract_category: category,
            action_type: submission.submission_type,
            old_data: currentContract,
            changed_by: reviewedBy,
            changed_by_name: reviewedByName,
            vendor_submission_id: id
          });
          
          // 3. Prepare update payload for the main contract
          const contractUpdatePayload: any = {};
          
          if (submission.submission_type === 'update_kontrak' && submission.nilai_kontrak_baru) {
            contractUpdatePayload.nilai_perjanjian = submission.nilai_kontrak_baru;
            // Also update batas_pagu_terbayar if it's admin/maint
            if (currentContract.batas_pagu_terbayar) {
              contractUpdatePayload.batas_pagu_terbayar = submission.nilai_kontrak_baru;
            }
          }
          
          if (submission.submission_type === 'perpanjangan_kontrak' && submission.tanggal_perpanjang) {
            contractUpdatePayload.tanggal_berakhir = submission.tanggal_perpanjang;
          }
          
          if (submission.submission_type === 'update_progress' && submission.progress_baru) {
            contractUpdatePayload.progress_pekerjaan = submission.progress_baru;
          }
          
          // 4. Update the contract
          if (Object.keys(contractUpdatePayload).length > 0) {
            await supabaseServer
              .from(targetTable)
              .update(contractUpdatePayload)
              .eq('id', contractId);
          }
        }
        } 

        // Insert to invoices for both approve and reject
        if (submission.submission_type === 'pengajuan_tagihan' && (action === 'approve' || action === 'reject')) {
          const { data: currentContract, error: contractError } = await supabaseServer
            .from(targetTable)
            .select('*')
            .eq('id', contractId)
            .single();

        if (contractError) {
          console.error('FAILED TO FETCH CONTRACT FOR INVOICE:', contractError);
        }

        if (currentContract) {
          const invoicePayload = {
            contract_id: contractId,
            no_perjanjian: currentContract.no_perjanjian,
            nomor_tagihan: submission.nomor_tagihan || 'INV-' + Date.now(),
            tanggal_tagihan: submission.tanggal_input || new Date().toISOString().split('T')[0],
            nilai_tagihan: submission.nilai_tagihan || 0,
            status: action === 'approve' ? 'dibayar' : 'ditolak',
            tanggal_diajukan: submission.created_at,
            diajukan_oleh: submission.vendor_id,
            diajukan_oleh_name: currentContract.nama_vendor || 'Vendor',
            dokumen_tagihan: submission.dokumen_pendukung,
            keterangan: action === 'reject' ? `Ditolak: ${rejectionReason || 'Tanpa alasan'}` : submission.description
          };
          
          const { error: invoiceError } = await supabaseServer.from('invoices').insert(invoicePayload);
          if (invoiceError) {
            console.error('FAILED TO INSERT INVOICE:', invoiceError);
          } else {
            console.log('INVOICE INSERTED SUCCESSFULLY');
            
            // AUTOMATICALLY UPDATE SERAPAN ANGGARAN (TERBAYAR) ON THE CONTRACT - IDEMPOTENT WAY
            if (action === 'approve') {
              // 1. Calculate the true sum of all paid invoices for this contract
              const { data: paidInvoices, error: sumError } = await supabaseServer
                .from('invoices')
                .select('nilai_tagihan')
                .eq('contract_id', contractId)
                .eq('status', 'dibayar');
                
              if (!sumError && paidInvoices) {
                const totalDibayar = paidInvoices.reduce((sum, inv) => sum + Number(inv.nilai_tagihan || 0), 0);
                
                // 2. Prepare update payload
                const contractUpdatePayload: any = {};
                if (category === 'investasi') {
                  if (currentContract.total_tagihan_dibayar !== undefined) {
                    contractUpdatePayload.total_tagihan_dibayar = totalDibayar;
                  } else if (currentContract.terbayar !== undefined) {
                    contractUpdatePayload.terbayar = totalDibayar;
                  }
                } else if (category === 'pemeliharaan') {
                  if (currentContract.terbayar_sti_pusat !== undefined) {
                    contractUpdatePayload.terbayar_sti_pusat = totalDibayar;
                  }
                } else if (category === 'administrasi') {
                  if (currentContract.terbayar_pusat !== undefined) {
                    contractUpdatePayload.terbayar_pusat = totalDibayar;
                  }
                }
                
                // 3. Update contract
                if (Object.keys(contractUpdatePayload).length > 0) {
                  const { error: updateContractError } = await supabaseServer
                    .from(targetTable)
                    .update(contractUpdatePayload)
                    .eq('id', contractId);
                    
                  if (updateContractError) {
                     console.error('FAILED TO UPDATE CONTRACT TERBAYAR:', updateContractError);
                  } else {
                     console.log(`CONTRACT TERBAYAR SYNCED SUCCESSFULLY FOR ${targetTable}:`, contractUpdatePayload);
                  }
                }
              }
            }
          }
        }
        }
      }

    const { data, error } = await supabaseServer
      .from('vendor_submissions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error updating approval:', error.message);
    return NextResponse.json({ error: 'Failed to update approval', details: error.message }, { status: 500 });
  }
}
