const nodemailer = require('nodemailer');

const { EMAIL_USER, EMAIL_PASS } = process.env;
if (!EMAIL_USER || !EMAIL_PASS) {
  // Allow server to start even if email credentials are missing.
  // OTP/email features will fail when used, but development can proceed.
  console.warn('[emailService] Missing EMAIL_USER/EMAIL_PASS in environment variables. Email sending disabled.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

async function sendEmail({ to, subject, text, html }) {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Email sending is disabled: EMAIL_USER/EMAIL_PASS not configured.');
  }
  await transporter.verify();
  return transporter.sendMail({
    from: EMAIL_USER,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendEmail };

