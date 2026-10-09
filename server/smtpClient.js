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

    if (this.isConfigured()) {
      const transportOpts = this.host.includes('gmail')
        ? {
            service: 'gmail',
            auth: {
              user: this.user,
              pass: this.pass
            },
            connectionTimeout: this.timeout,
            greetingTimeout: this.timeout,
            socketTimeout: this.timeout
          }
        : {
            host: this.host,
            port: this.port,
            secure: this.secure,
            auth: {
              user: this.user,
              pass: this.pass
            },
            connectionTimeout: this.timeout,
            greetingTimeout: this.timeout,
            socketTimeout: this.timeout,
            tls: {
              rejectUnauthorized: process.env.NODE_ENV === 'production' && process.env.SMTP_ALLOW_SELFSIGNED !== 'true'
            }
          };

      this.transporter = nodemailer.createTransport(transportOpts);
    } else {
      this.transporter = null;
    }
  }

  isConfigured() {
    return Boolean(this.host && this.user && this.pass);
  }

  /**
   * Send an email message using Nodemailer
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

    if (!this.isConfigured() || !this.transporter) {
      throw new Error('SMTP credentials are not configured in environment (SMTP_HOST, SMTP_USER, SMTP_PASS).');
    }

    try {
      const info = await this.transporter.sendMail({
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
      if (err.message && (err.message.includes('535') || err.message.includes('BadCredentials') || err.message.includes('Username and Password not accepted'))) {
        throw new Error('Google SMTP Authentication Failed (535 Bad Credentials). Your Gmail App Password in server/.env is invalid or expired. Please generate a new 16-character App Password at https://myaccount.google.com/apppasswords');
      }
      throw err;
    }
  }

  /**
   * Verify SMTP connection with transporter
   */
  async verify() {
    if (!this.isConfigured() || !this.transporter) {
      throw new Error('SMTP credentials are not configured.');
    }
    return this.transporter.verify();
  }
}

export default SmtpClient;
