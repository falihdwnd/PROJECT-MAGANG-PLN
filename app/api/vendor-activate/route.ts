import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

const VENDOR_ACCOUNTS_TABLE = "vendor_accounts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const { data: account, error } = await supabaseServer
      .from(VENDOR_ACCOUNTS_TABLE)
      .select("*")
      .eq("activation_token", token)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!account) {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 404 });
    }

    if (account.activation_expires_at && new Date(account.activation_expires_at) < new Date()) {
      return NextResponse.json({ error: "Token aktivasi sudah kedaluwarsa" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    if (account.active_until && new Date(account.active_until) < new Date(today)) {
      return NextResponse.json({ error: "Kontrak sudah berakhir" }, { status: 400 });
    }

    const { error: updateError } = await supabaseServer
      .from(VENDOR_ACCOUNTS_TABLE)
      .update({
        is_active: true,
        activated_at: new Date().toISOString(),
        activation_token: null,
        activation_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Akun vendor berhasil diaktifkan",
      data: {
        id: account.id,
        email: account.email,
        vendorName: account.vendor_name,
        vendorCompany: account.vendor_company,
        activeUntil: account.active_until,
      },
    });
  } catch (error) {
    console.error("Error activating vendor account:", error);
    return NextResponse.json({ error: "Gagal mengaktifkan akun vendor" }, { status: 500 });
  }
}
