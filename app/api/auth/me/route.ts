import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const authUserId = searchParams.get("authUserId");

    if (!authUserId) {
      return NextResponse.json({ error: "authUserId is required" }, { status: 400 });
    }

    // 1. Try to find the user in user_profiles (Admin / Viewer)
    const { data: profileData, error: profileError } = await supabaseServer
      .from("user_profiles")
      .select("*")
      .eq("id", authUserId)
      .maybeSingle();

    if (profileError) {
      console.error("Error querying user_profiles:", profileError);
    }

    if (profileData) {
      // User is an internal user
      return NextResponse.json({
        user: {
          id: profileData.id,
          username: profileData.email,
          name: profileData.name,
          email: profileData.email,
          role: profileData.role,
          unit: profileData.unit || "PLN Pusat",
          createdAt: profileData.created_at,
        }
      });
    }

    // 2. If not found, try to find in vendor_accounts (Vendor)
    const { data: vendorData, error: vendorError } = await supabaseServer
      .from("vendor_accounts")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (vendorError) {
      console.error("Error querying vendor_accounts:", vendorError);
    }

    if (vendorData) {
      // Check if vendor account is active and not expired
      if (!vendorData.is_active) {
        return NextResponse.json({ error: "Vendor account is not activated" }, { status: 403 });
      }
      
      if (vendorData.active_until && new Date(vendorData.active_until) < new Date()) {
        return NextResponse.json({ error: "Vendor account has expired" }, { status: 403 });
      }

      return NextResponse.json({
        user: {
          id: vendorData.auth_user_id,
          username: vendorData.email,
          name: vendorData.vendor_name || "Vendor",
          email: vendorData.email,
          role: "vendor",
          unit: vendorData.vendor_company || "Vendor",
          createdAt: vendorData.created_at,
          vendorAccountId: vendorData.id,
          vendorCompany: vendorData.vendor_company,
          isActive: vendorData.is_active,
          activatedAt: vendorData.activated_at,
          expiresAt: vendorData.active_until,
        }
      });
    }

    // 3. User not found in either table
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });

  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
