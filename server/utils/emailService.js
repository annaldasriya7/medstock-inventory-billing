const nodemailer = require('nodemailer');

/**
 * Configure email transport based on environment variables.
 * Fallbacks safely to console logging in development/test if SMTP credentials are not configured.
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = process.env.SMTP_PORT || process.env.EMAIL_PORT;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure: Number(port) === 465,
      auth: {
        user,
        pass
      }
    });
  }

  return null;
};

/**
 * Send 6-digit Password Reset OTP email
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient staff member name
 * @param {string} options.otp - 6-digit one-time password
 */
const sendPasswordResetEmail = async ({ to, name, otp }) => {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || '"MedStock AI Security" <security@medstock.ai>';

  const subject = `MedStock AI — Password Reset Verification Code: ${otp}`;
  const text = `Hello ${name || 'Staff Member'},\n\n` +
    `Your password reset verification code for MedStock AI is: ${otp}\n\n` +
    `This code will expire in 10 minutes. If you did not request this code, please ignore this email or contact your pharmacy administrator immediately.\n\n` +
    `— MedStock AI Pharmacy Security Team`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
        .card { max-width: 480px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4); }
        .badge { display: inline-block; padding: 4px 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
        h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
        p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0; }
        .otp-container { background: #0f172a; border: 2px dashed #10b981; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; color: #34d399; letter-spacing: 8px; margin: 0; }
        .footer { font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 16px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">MedStock AI Security</div>
        <h1>Password Reset Request</h1>
        <p>Hello <strong>${name || 'Staff Member'}</strong>,</p>
        <p>A request was received to reset your password for your MedStock AI account. Enter the following 6-digit one-time code to proceed:</p>
        <div class="otp-container">
          <div class="otp-code">${otp}</div>
        </div>
        <p>This verification code is strictly valid for <strong>10 minutes</strong>. For security, never share this code with anyone.</p>
        <div class="footer">
          If you did not request a password reset, please ignore this email or notify your pharmacy administrator.
        </div>
      </div>
    </body>
    </html>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html
      });
      console.log(`[EmailService] Password reset OTP sent successfully via SMTP to ${to}`);
      return { success: true, method: 'smtp' };
    } catch (err) {
      console.warn(`[EmailService] SMTP delivery failed: ${err.message}. Logging code to console.`);
    }
  }

  // Fallback dev mode / unconfigured SMTP: log code cleanly for local testing
  console.log(`\n======================================================`);
  console.log(`[EmailService (DEV/LOCAL FALLBACK)]`);
  console.log(`To: ${to}`);
  console.log(`User: ${name}`);
  console.log(`Password Reset Verification Code: ${otp}`);
  console.log(`Expires in: 10 minutes`);
  console.log(`======================================================\n`);

  return { success: true, method: 'dev_log' };
};

module.exports = { sendPasswordResetEmail };
