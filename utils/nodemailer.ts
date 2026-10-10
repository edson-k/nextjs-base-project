import nodemailer from 'nodemailer';

/**
 * SMTP configurado só por env (padrão: Amazon SES).
 *
 *   SMTP_HOST   email-smtp.<região>.amazonaws.com
 *   SMTP_PORT   465 (SSL) ou 587 (STARTTLS)
 *   SMTP_SECURE true | false (padrão: true quando a porta é 465)
 *   SMTP_USER   usuário SMTP do SES (não é a access key do IAM)
 *   SMTP_PASS   senha SMTP do SES
 *
 * Compatibilidade: sem SMTP_* e com SENDGRID_API_KEY, usa o SendGrid como antes.
 */
const legacySendgrid = !process.env.SMTP_HOST && !!process.env.SENDGRID_API_KEY;

const host = process.env.SMTP_HOST || (legacySendgrid ? 'smtp.sendgrid.net' : 'email-smtp.us-east-1.amazonaws.com');
const port = Number(process.env.SMTP_PORT) || (legacySendgrid ? 465 : 587);
const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user: process.env.SMTP_USER || (legacySendgrid ? 'apikey' : ''),
    pass: process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || '',
  },
});
