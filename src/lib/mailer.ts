import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@pakdealshub.com';

  await transporter.sendMail({
    from: `"PakDealsHub" <${from}>`,
    to,
    subject: `Your PakDealsHub verification code: ${otp}`,
    text: `Your OTP code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f7f6f2;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:28px;font-weight:800;color:#1f6feb;">PakDealsHub</span>
        </div>
        <div style="background:#fff;border-radius:12px;padding:28px 24px;border:1px solid #e5e7eb;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#101214;">Verify your email</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Enter this code in the app to create your account. The code expires in <strong>5 minutes</strong>.</p>
          <div style="text-align:center;letter-spacing:12px;font-size:36px;font-weight:800;color:#1f6feb;padding:16px;background:#eff6ff;border-radius:10px;margin-bottom:24px;">
            ${otp}
          </div>
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
}
