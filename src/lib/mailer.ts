import nodemailer from 'nodemailer';

function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  console.log('[Mailer] Creating transporter for:', user);
  
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  
  console.log('[Mailer] Sending to:', to, 'from:', from);
  
  try {
    const transporter = createTransporter();
    
    await transporter.verify();
    console.log('[Mailer] SMTP verified');
    
    const result = await transporter.sendMail({
      from: `Builder Insights <${from}>`,
      to,
      subject,
      html,
    });
    
    console.log('[Mailer] Sent! ID:', result.messageId);
    return result;
  } catch (err: any) {
    console.error('[Mailer] ERROR:', err.code, err.message);
    throw err;
  }
}
