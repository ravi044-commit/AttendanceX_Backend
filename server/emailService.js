import nodemailer from 'nodemailer';
import { SmtpClient } from './smtpClient.js';

export { nodemailer, SmtpClient };

/**
 * AttendanceX Email Delivery Service
 * Manages email dispatch via SMTP or fallback API with purpose-specific templates.
 */

// In-memory store for test/inspection hooks (used in testing environments)
export const emailDeliveryLogs = [];

/**
 * Format Purpose Human-Readable Name
 */
export const getPurposeLabel = (purpose) => {
  switch (purpose) {
    case 'password_recovery':
      return 'Password Recovery';
    case 'email_change':
      return 'Email Address Change';
    case 'account_setup':
      return 'Initial Account Setup';
    default:
      return 'Identity Verification';
  }
};

/**
 * Generate Responsive HTML Email Template
 */
export const buildEmailTemplate = ({ purpose, otp, recipientEmail }) => {
  const purposeLabel = getPurposeLabel(purpose);

  let purposeIntro = '';
  let securityAdvice = '';

  if (purpose === 'password_recovery') {
    purposeIntro = 'We received a request to reset the password for your AttendanceX account. Use the verification code below to authorize this password change.';
    securityAdvice = 'If you did not request a password reset, you can safely ignore this email. Your current password remains secure.';
  } else if (purpose === 'email_change') {
    purposeIntro = `We received a request to update your AttendanceX account email to ${recipientEmail}. Use the verification code below to confirm and verify this address.`;
    securityAdvice = 'If you did not request to change your email address, please contact your institutional administrator immediately.';
  } else if (purpose === 'account_setup') {
    purposeIntro = 'Welcome to AttendanceX. To finalize and activate your institutional profile, please verify your email address using the code below.';
    securityAdvice = 'This verification code is strictly intended for your initial setup. Never share your credentials with anyone.';
  } else {
    purposeIntro = 'Use the verification code below to complete your security verification.';
    securityAdvice = 'If you did not initiate this request, please disregard this email.';
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${purposeLabel} - AttendanceX</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid #1f2937; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; padding: 10px 16px; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 9999px; margin-bottom: 12px;">
                      <span style="font-size: 13px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 1px;">AttendanceX Security</span>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${purposeLabel}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #cbd5e1;">
                Hello,
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 24px; color: #94a3b8;">
                ${purposeIntro}
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px;">
                    <span style="display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 8px;">
                      Verification Code
                    </span>
                    <span style="display: block; font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; text-shadow: 0 0 20px rgba(56, 189, 248, 0.3);">
                      ${otp}
                    </span>
                    <span style="display: block; font-size: 13px; color: #f59e0b; margin-top: 10px; font-weight: 500;">
                      Expires in 5 minutes
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Notice -->
              <div style="background-color: rgba(15, 23, 42, 0.8); border-left: 3px solid #6366f1; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #94a3b8;">
                  <strong style="color: #e2e8f0;">Security Notice:</strong> ${securityAdvice}
                </p>
              </div>

              <!-- Spam / Inbox Tip -->
              <div style="background-color: rgba(30, 41, 59, 0.5); border: 1px dashed #334155; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                  💡 <strong>Tip:</strong> If you found this email in your Spam or Junk folder, please click <strong>"Report Not Spam"</strong> to receive future security verification codes directly in your Primary inbox.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 20px;">
                Never share this verification code with anyone. AttendanceX administrators or staff will never request your code.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0b0f19; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                AttendanceX Smart Campus Platform &copy; 2026. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Computer Department &bull; Automated Institutional Security Dispatcher
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
AttendanceX - ${purposeLabel}

${purposeIntro}

Your Verification Code: ${otp}
This code will expire in 5 minutes.

Security Notice: ${securityAdvice}
Never share this verification code with anyone.

Tip: If this email arrived in your Spam or Junk folder, please mark it as "Report Not Spam" to receive future emails directly to your Primary inbox.

--
AttendanceX Smart Campus Platform
Computer Department
  `.trim();

  return { html, text };
};

/**
 * Build Email Template for Old Email Change Alert
 */
export const buildEmailChangeAlertTemplate = ({ oldEmail, newEmail }) => {
  const subject = `[AttendanceX Security Alert] Your account email address was changed`;
  const text = `
Hello,

This is an automated security notification confirming that the email address for your AttendanceX account (${oldEmail}) has been successfully updated to:

${newEmail}

If you made this change, no further action is required.
If you did not authorize this change, please contact institutional administration immediately.

--
AttendanceX Security Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<body style="background-color: #0b0f19; font-family: sans-serif; color: #f1f5f9; padding: 30px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px;">
    <h2 style="color: #f43f5e; margin-top: 0;">Security Alert: Email Address Updated</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 22px;">
      This is an automated confirmation that your AttendanceX account email has been updated to:
    </p>
    <div style="padding: 12px 16px; background-color: #1e293b; border-radius: 8px; font-family: monospace; font-size: 16px; color: #38bdf8; margin: 16px 0;">
      ${newEmail}
    </div>
    <p style="color: #94a3b8; font-size: 13px; line-height: 20px;">
      If you performed this change, no further action is required. If you did not authorize this change, please contact your institution's system administrator immediately.
    </p>
  </div>
</body>
</html>
  `.trim();

  return { subject, html, text };
};

/**
 * Deliver Verification OTP Email
 * @param {Object} params - { recipientEmail, purpose, otp }
 */
export const sendVerificationOtpEmail = async ({ recipientEmail, purpose, otp }) => {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    throw new Error(`Invalid recipient email address: "${recipientEmail}"`);
  }

  if (!otp || typeof otp !== 'string' || otp.length !== 6) {
    throw new Error('Valid 6-digit OTP code is required for email delivery');
  }

  const purposeLabel = getPurposeLabel(purpose);
  const subject = `[AttendanceX] ${purposeLabel} Verification Code: ${otp}`;
  const { html, text } = buildEmailTemplate({ purpose, otp, recipientEmail });

  // Record delivery attempt in log (without exposing raw OTP in permanent storage)
  const deliveryRecord = {
    timestamp: new Date().toISOString(),
    recipient: recipientEmail,
    purpose,
    subject
  };

  const smtpClient = new SmtpClient();

  // Check if test mode or mock delivery is enabled
  const isTestMode = process.env.EMAIL_TEST_MODE === 'true';

  if (isTestMode || process.env.NODE_ENV === 'test') {
    // In test mode, print clear OTP in server terminal so developer can test immediately
    console.log(`\n========================================================`);
    console.log(`🔑 [ATTENDANCEX OTP CODE]: >>> ${otp} <<<`);
    console.log(`📧 Recipient: ${recipientEmail} | Purpose: ${purposeLabel}`);
    console.log(`⏱️ Valid for 5 minutes`);
    console.log(`========================================================\n`);
    emailDeliveryLogs.push({ ...deliveryRecord, delivered: true, simulated: true, otp });
    return {
      success: true,
      delivered: true,
      messageId: `<test-${Date.now()}@attendancex.edu>`,
      recipient: recipientEmail
    };
  }

  // Attempt real delivery using configured SMTP credentials
  if (!smtpClient.isConfigured()) {
    if (process.env.EMAIL_TEST_MODE === 'true') {
      console.warn(`[EmailService] SMTP credentials not configured. Simulating delivery to ${recipientEmail}.`);
      emailDeliveryLogs.push({ ...deliveryRecord, delivered: true, simulated: true });
      return {
        success: true,
        delivered: true,
        messageId: `<dev-${Date.now()}@attendancex.edu>`,
        recipient: recipientEmail
      };
    }

    // In real mode, missing credentials must be explicitly configured
    throw new Error('SMTP credentials are not configured in server/.env. Please set SMTP_USER and SMTP_PASS (Gmail App Password) to send real verification emails.');
  }

  try {
    const result = await smtpClient.sendMail({
      to: recipientEmail,
      subject,
      text,
      html
    });

    emailDeliveryLogs.push({ ...deliveryRecord, delivered: true, messageId: result.messageId });
    return {
      success: true,
      delivered: true,
      messageId: result.messageId,
      recipient: recipientEmail
    };
  } catch (error) {
    // Handle email delivery failures without falsely reporting success
    console.error(`[EmailService] Delivery failed to ${recipientEmail}:`, error.message);
    emailDeliveryLogs.push({ ...deliveryRecord, delivered: false, error: error.message });
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

/**
 * Deliver Security Notification for Email Change
 */
export const sendEmailChangeNotice = async ({ oldEmail, newEmail }) => {
  if (!oldEmail || !oldEmail.includes('@')) return false;

  const { subject, html, text } = buildEmailChangeAlertTemplate({ oldEmail, newEmail });
  const smtpClient = new SmtpClient();

  if (process.env.EMAIL_TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
    emailDeliveryLogs.push({ recipient: oldEmail, purpose: 'email_changed_notice', delivered: true });
    return true;
  }

  if (!smtpClient.isConfigured()) {
    return true; // Best effort notification in dev
  }

  try {
    await smtpClient.sendMail({
      to: oldEmail,
      subject,
      text,
      html
    });
    return true;
  } catch (err) {
    console.warn(`[EmailService] Failed to notify old email ${oldEmail}:`, err.message);
    return false;
  }
};
