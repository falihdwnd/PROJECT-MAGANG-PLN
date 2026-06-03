import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET - Ambil semua invoices
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Tambah invoice baru
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Transform camelCase to snake_case untuk database
    // Status default: 'diajukan', tanggal_verifikasi akan auto-update via trigger
    const invoiceData = {
      contract_id: body.contractId,
      no_perjanjian: body.noPerjanjian,
      nomor_tagihan: body.nomorTagihan,
      tanggal_tagihan: body.tanggalTagihan,
      nilai_tagihan: body.nilaiTagihan,
      no_berita_acara: body.noBeritaAcara,
      tanggal_berita_acara: body.tanggalBeritaAcara,
      tanggal_arsip: body.tanggalArsip,
      no_xps: body.noXPS,
      tanggal_xps: body.tanggalXPS,
      status: body.status || 'dibayar', // Default status saat membuat tagihan baru
      tanggal_diajukan: body.tanggalDiajukan || new Date().toISOString(),
      keterangan: body.keterangan,
      diajukan_oleh: body.diajukanOleh,
      diajukan_oleh_name: body.diajukanOlehName,
      dibayar_oleh: body.dibayarOleh,
      dokumen_tagihan: body.dokumenTagihan,
    };

    const { data, error } = await supabaseServer
      .from('invoices')
      .insert([invoiceData])
      .select()
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update invoice
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Transform camelCase to snake_case
    const updateData: any = {};
    Object.keys(updates).forEach((key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      updateData[snakeKey] = updates[key];
    });

    const { data, error } = await supabaseServer
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Hapus invoice
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting invoice:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
