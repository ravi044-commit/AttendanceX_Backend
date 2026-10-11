import 'dotenv/config';
import nodemailer from 'nodemailer';

/**
 * Robust Nodemailer Transport Client for AttendanceX
 * Configures SMTP transport using Nodemailer for sending emails (Gmail, institutional SMTP, etc.)
 */
export class SmtpClient {
  constructor(config = {}) {
    this.host = config.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    this.port = parseInt(config.port || process.env.SMTP_PORT || '587', 10);
    this.secure = config.secure !== undefined 
      ? Boolean(config.secure) 
      : (process.env.SMTP_SECURE === 'true' || this.port === 465);
    this.user = (config.user || process.env.SMTP_USER || '').trim();
    const rawPass = (config.pass || process.env.SMTP_PASS || '').trim();
    // Clean spaces from Gmail 16-character app password if present
    this.pass = (this.host.includes('gmail') && rawPass) ? rawPass.replace(/\s+/g, '') : rawPass;
    this.from = config.from || process.env.EMAIL_FROM || (this.user ? `AttendanceX <${this.user}>` : 'AttendanceX <noreply@attendancex.edu>');
    this.timeout = config.timeout || 15000;

    this.transporter = this.createTransporter({ port: this.port, secure: this.secure });
  }

  createTransporter({ port, secure } = {}) {
    if (!this.isConfigured()) return null;

    const actualPort = port || this.port;
    const actualSecure = secure !== undefined ? secure : (actualPort === 465);

    return nodemailer.createTransport({
      host: this.host,
      port: actualPort,
      secure: actualSecure,
      family: 4, // Force IPv4 to prevent IPv6 DNS resolution timeouts
      auth: {
        user: this.user,
        pass: this.pass
      },
      connectionTimeout: 12000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production' && process.env.SMTP_ALLOW_SELFSIGNED !== 'true',
        minVersion: 'TLSv1.2'
      }
    });
  }

  isConfigured() {
    return Boolean(this.host && this.user && this.pass);
  }

  /**
   * Send an email message using Nodemailer with automatic port fallback on timeout
   * @param {Object} options - { to, subject, text, html, from, attachments }
   * @returns {Promise<{ messageId: string, accepted: string[], response?: string }>}
   */
  async sendMail(options) {
    const to = options.to;
    const from = options.from || this.from;
    const subject = options.subject;
    const text = options.text || '';
    const html = options.html || '';

    if (!to) {
      throw new Error('Recipient email (to) is required');
    }

    if (!this.isConfigured()) {
      throw new Error('SMTP credentials are not configured in environment (SMTP_HOST, SMTP_USER, SMTP_PASS).');
    }

    const portsToTry = [
      { port: this.port, secure: this.secure },
      // Alternate Gmail port fallback (465 SSL vs 587 STARTTLS)
      { port: this.port === 465 ? 587 : 465, secure: this.port !== 465 }
    ];

    let lastError = null;

    for (const config of portsToTry) {
      try {
        const transporter = this.createTransporter(config);
        const info = await transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
          attachments: options.attachments || []
        });

        return {
          messageId: info.messageId,
          accepted: info.accepted || [to],
          response: info.response
        };
      } catch (err) {
        lastError = err;

        // If authentication failed (535 Bad Credentials), don't retry other ports
        if (err.message && (err.message.includes('535') || err.message.includes('BadCredentials') || err.message.includes('Username and Password not accepted'))) {
          throw new Error('Google SMTP Authentication Failed (535 Bad Credentials). Your Gmail App Password in server/.env is invalid or expired. Please generate a new 16-character App Password at https://myaccount.google.com/apppasswords');
        }

        // If connection timeout or refused, continue to next port attempt
        const isTimeout = err.message && (err.message.includes('Connection timeout') || err.message.includes('ETIMEDOUT') || err.message.includes('ESOCKETTIMEDOUT') || err.message.includes('ECONNREFUSED'));
        if (!isTimeout) {
          throw err;
        }

        console.warn(`[SmtpClient] Delivery failed on port ${config.port} (${err.message}). Trying fallback port...`);
      }
    }

    // If all ports timed out
    if (lastError && (lastError.message.includes('Connection timeout') || lastError.message.includes('ETIMEDOUT'))) {
      throw new Error(
        `SMTP Connection timeout on ports 587 and 465. Outbound SMTP ports are blocked by your hosting provider or network (Render, Railway, and digital cloud hosts block ports 25, 465, and 587 by default to prevent spam). To test immediately without SMTP blocking, set EMAIL_TEST_MODE=true in server/.env to log OTP codes directly to your server console.`
      );
    }

    throw lastError;
  }

  /**
   * Verify SMTP connection with transporter
   */
  async verify() {
    if (!this.isConfigured()) {
      throw new Error('SMTP credentials are not configured.');
    }
    const transporter = this.createTransporter({ port: this.port, secure: this.secure });
    return transporter.verify();
  }
}

export default SmtpClient;
