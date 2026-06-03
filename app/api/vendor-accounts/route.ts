import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

const VENDOR_ACCOUNTS_TABLE = "vendor_accounts";
const CONTRACT_TABLES = [
  "contract_investment",
  "contract_maintenance",
  "contract_administration",
] as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateActivationToken(): string {
  return crypto.randomUUID();
}

function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function refreshExpiredAccounts() {
  const today = new Date().toISOString().slice(0, 10);
  await supabaseServer
    .from(VENDOR_ACCOUNTS_TABLE)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("is_active", true)
    .lt("active_until", today);
}

async function buildContractCountMap(): Promise<Record<string, number>> {
  const results = await Promise.all(
    CONTRACT_TABLES.map((table) =>
      supabaseServer.from(table).select("id,vendor_account_id")
    )
  );

  const countMap: Record<string, number> = {};
  results.forEach((res) => {
    if (res.error || !res.data) return;
    res.data.forEach((row) => {
      if (!row.vendor_account_id) return;
      countMap[row.vendor_account_id] = (countMap[row.vendor_account_id] || 0) + 1;
    });
  });

  return countMap;
}

// GET: Fetch vendor accounts
export async function GET(request: Request) {
  try {
    await refreshExpiredAccounts();

    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get("contractId");
    const isActive = searchParams.get("isActive");
    const email = searchParams.get("email");
    const authUserId = searchParams.get("authUserId");

    let query = supabaseServer.from(VENDOR_ACCOUNTS_TABLE).select("*");

    if (email) query = query.eq("email", normalizeEmail(email));
    if (authUserId) query = query.eq("auth_user_id", authUserId);
    if (isActive !== null && isActive !== undefined) {
      query = query.eq("is_active", isActive === "true");
    }

    const singleResult = Boolean(email || authUserId);
    const { data, error } = singleResult
      ? await query.maybeSingle()
      : await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching vendor accounts:", error);
      return NextResponse.json({ error: "Failed to fetch vendor accounts" }, { status: 500 });
    }

    if (singleResult) {
      if (!data) {
        return NextResponse.json({ data: null }, { status: 200 });
      }
      return NextResponse.json({
        data: {
          id: data.id,
          authUserId: data.auth_user_id,
          email: data.email,
          vendorName: data.vendor_name,
          vendorCompany: data.vendor_company,
          isActive: data.is_active,
          activatedAt: data.activated_at,
          activeUntil: data.active_until,
          activationToken: data.activation_token,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    const countMap = await buildContractCountMap();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = (data || []).map((account: any) => ({
      id: account.id,
      authUserId: account.auth_user_id,
      email: account.email,
      vendorName: account.vendor_name,
      vendorCompany: account.vendor_company,
      isActive: account.is_active,
      activatedAt: account.activated_at,
      activeUntil: account.active_until,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
      contractCount: countMap[account.id] || 0,
    }));

    if (contractId) {
      // Filter by contractId if requested
      const contractRows = await Promise.all(
        CONTRACT_TABLES.map((table) =>
          supabaseServer
            .from(table)
            .select("id,vendor_account_id")
            .eq("id", contractId)
            .maybeSingle()
        )
      );
      const vendorAccountId = contractRows.find((r) => r.data?.vendor_account_id)?.data
        ?.vendor_account_id;
      const filtered = vendorAccountId
        ? accounts.filter((a: { id: string }) => a.id === vendorAccountId)
        : [];
      return NextResponse.json({ data: filtered });
    }

    return NextResponse.json({ data: accounts });
  } catch (error) {
    console.error("Error fetching vendor accounts:", error);
    return NextResponse.json({ error: "Failed to fetch vendor accounts" }, { status: 500 });
  }
}

// POST: Create new vendor account manually
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      vendorName,
      vendorCompany,
      tanggalBerakhir,
      sendEmail = true,
    } = body;

    if (!email || !vendorName || !tanggalBerakhir) {
      return NextResponse.json(
        { error: "Missing required fields: email, vendorName, tanggalBerakhir" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const activationToken = generateActivationToken();
    const activationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const temporaryPassword = generateTemporaryPassword();

    const authResult = await supabaseServer.auth.admin.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error.message }, { status: 500 });
    }

    const { data, error } = await supabaseServer
      .from(VENDOR_ACCOUNTS_TABLE)
      .insert({
        auth_user_id: authResult.data.user?.id || null,
        email: normalizedEmail,
        vendor_name: vendorName,
        vendor_company: vendorCompany || null,
        is_active: false,
        active_until: tanggalBerakhir,
        activation_token: activationToken,
        activation_expires_at: activationExpiresAt,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (sendEmail) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/send-vendor-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorEmail: normalizedEmail,
            vendorName,
            vendorCompany,
            contractId: "-",
            contractTitle: "-",
            tanggalBerakhir,
            activationToken,
            temporaryPassword,
          }),
        });
      } catch (emailError) {
        console.warn("Email sending failed:", emailError);
      }
    }

    return NextResponse.json({
      data: {
        id: data.id,
        authUserId: data.auth_user_id,
        email: data.email,
        vendorName: data.vendor_name,
        vendorCompany: data.vendor_company,
        isActive: data.is_active,
        activeUntil: data.active_until,
        activationToken: data.activation_token,
        createdAt: data.created_at,
        temporaryPassword,
      },
      message: sendEmail
        ? `Akun vendor berhasil dibuat dan email dikirim ke ${normalizedEmail}`
        : "Akun vendor berhasil dibuat",
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating vendor account:", error);
    return NextResponse.json({ error: "Failed to create vendor account" }, { status: 500 });
  }
}

// PUT: Deactivate or extend vendor account
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, action, expiresAt } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "Missing required fields: id, action" },
        { status: 400 }
      );
    }

    const validActions = ["deactivate", "extend"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (action === "deactivate") {
      updatePayload.is_active = false;
    }

    if (action === "extend") {
      if (!expiresAt) {
        return NextResponse.json(
          { error: "expiresAt is required for extend action" },
          { status: 400 }
        );
      }
      updatePayload.active_until = expiresAt;
      updatePayload.is_active = true;
    }

    const { data, error } = await supabaseServer
      .from(VENDOR_ACCOUNTS_TABLE)
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: data.id,
        isActive: data.is_active,
        activeUntil: data.active_until,
        updatedAt: data.updated_at,
      },
      message: `Akun vendor berhasil di-${action}`,
    });
  } catch (error) {
    console.error("Error updating vendor account:", error);
    return NextResponse.json({ error: "Failed to update vendor account" }, { status: 500 });
  }
}
