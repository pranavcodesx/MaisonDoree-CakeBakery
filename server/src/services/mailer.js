import nodemailer from 'nodemailer';
import { config } from '../config.js';

// Sends e-mail through any SMTP service (Gmail, Brevo, Resend, Zoho ...). Settings live in .env (SMTP_*).
export const mailEnabled = () => !!(config.smtp.host && config.smtp.user && config.smtp.pass);

let transport;
function getTransport() {
  if (!transport) {
    const { host, port, user, pass } = config.smtp;
    transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  }
  return transport;
}

export async function sendMail({ to, subject, text, html }) {
  if (!mailEnabled()) {
    // Local testing without SMTP: the e-mail is printed in the server window instead of being sent.
    console.log(`\n--- E-MAIL (SMTP not set up, so not sent) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---------------------------------------------\n`);
    return;
  }
  await getTransport().sendMail({ from: config.smtp.from || config.smtp.user, to, subject, text, html });
}
