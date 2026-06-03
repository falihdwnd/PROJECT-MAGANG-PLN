import nodemailer from 'nodemailer';

export async function sendVendorActivationEmail(params: {
  vendorEmail: string;
  vendorName: string;
  vendorCompany?: string;
  contractId: string;
  contractTitle?: string;
  tanggalPerjanjian?: string;
  tanggalBerakhir: string;
  username: string;
  password?: string;
  activationToken?: string | null;
}) {
  const {
    vendorEmail,
    vendorName,
    vendorCompany,
    contractId,
    contractTitle,
    tanggalPerjanjian,
    tanggalBerakhir,
    username,
    password,
    activationToken,
  } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const activationLink = activationToken ? `${appUrl}/vendor/activate?token=${activationToken}` : null;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 8px 8px 0 0;">
        <h2 style="color: #0ea5e9; margin: 0;">SIMAP PLN</h2>
        <p style="margin-top: 5px; color: #64748b;">Sistem Informasi Monitoring Anggaran & Proyek</p>
      </div>
      <div style="padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Yth. <strong>${vendorName}</strong>,</p>
        <p>Anda telah terdaftar sebagai vendor pada SIMAP PLN.</p>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #475569;">Detail Akun Sementara:</p>
          <p style="margin: 5px 0;">Username: <strong>${username}</strong></p>
          <p style="margin: 5px 0;">Password: <strong>${password || 'Gunakan password yang Anda miliki'}</strong></p>
        </div>

        <p><strong>Informasi Kontrak:</strong></p>
        <ul>
          <li>ID Kontrak: ${contractId}</li>
          <li>Judul: ${contractTitle || '-'}</li>
          <li>Perusahaan: ${vendorCompany || '-'}</li>
          <li>Periode: ${tanggalPerjanjian || '-'} s/d <strong>${tanggalBerakhir}</strong></li>
        </ul>

        <div style="margin-top: 30px; text-align: center;">
          <a href="${activationLink || appUrl + '/login'}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${activationToken ? 'Aktivasi Akun Sekarang' : 'Login ke SIMAP'}</a>
        </div>

        <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
          <strong>PENTING:</strong><br>
          • Akun aktif selama periode kontrak berlangsung.<br>
          • Segera ganti password setelah login pertama kali.<br>
          • Jangan bagikan informasi akun ini kepada pihak lain.
        </p>
      </div>
    </div>
  `;

  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("GMAIL_EMAIL atau GMAIL_APP_PASSWORD belum di-set di .env. Simulating email instead.");
    console.log('📧 Simulated email to:', vendorEmail);
    console.log('🔑 Username:', username, 'Password:', password);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `"SIMAP PLN" <${process.env.GMAIL_EMAIL}>`,
    to: vendorEmail,
    subject: `[PLN SIMAP] Akun Vendor Temporary - ${contractTitle || contractId}`,
    html: htmlBody,
  });

  console.log('📧 Email sent successfully via Nodemailer:', info.messageId);
  return info;
}
