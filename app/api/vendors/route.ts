import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }

    // First fetch the vendor to get the auth_user_id
    const { data: vendor, error: fetchError } = await supabaseServer
      .from('vendor_accounts')
      .select('auth_user_id')
      .eq('id', id)
      .single();

    if (fetchError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Delete from vendor_accounts
    const { error: deleteVendorError } = await supabaseServer
      .from('vendor_accounts')
      .delete()
      .eq('id', id);

    if (deleteVendorError) throw deleteVendorError;

    // Delete from Supabase Auth (auth.users)
    if (vendor.auth_user_id) {
      const { error: authDeleteError } = await supabaseServer.auth.admin.deleteUser(vendor.auth_user_id);
      if (authDeleteError) {
        console.error('Failed to delete auth user, but vendor_account was deleted:', authDeleteError);
        // We don't throw here because the main vendor_account is gone, but we log the issue.
      }
    }

    return NextResponse.json({ success: true, message: 'Vendor successfully deleted' });
  } catch (error: any) {
    console.error('Error deleting vendor:', error.message);
    return NextResponse.json({ error: 'Failed to delete vendor', details: error.message }, { status: 500 });
  }
}
