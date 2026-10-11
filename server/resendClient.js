import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // Also check CWD for cloud deployments (like Render where env vars are injected)

const getApiKey = () => (process.env.RESEND_API_KEY || '').trim();

export const isResendConfigured = () => {
  const key = getApiKey();
  // Valid Resend API keys start with 're_', are at least 20 chars, and not a placeholder
  return Boolean(key && !key.includes('xxxx') && key.startsWith('re_') && key.length > 20);
};

export const getResendClient = () => {
  const apiKey = getApiKey();
  return new Resend(apiKey);
};

/**
 * Send an email via the Resend API
 * @param {Object} options - { to, subject, html, text, from }
 * @returns {Promise<{ messageId: string, id: string }>}
 */
export const sendResendEmail = async ({ to, subject, html, text, from }) => {
  if (!isResendConfigured()) {
    throw new Error('Resend API key is not configured. Please set RESEND_API_KEY in server/.env with your key from https://resend.com');
  }

  const resend = getResendClient();
  const sender = from || process.env.RESEND_FROM || 'onboarding@resend.dev';

  const recipientList = Array.isArray(to) ? to : [to];

  const payload = {
    from: sender,
    to: recipientList,
    subject,
    html: html || undefined,
    text: text || undefined
  };

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    throw new Error(`Resend API Error: ${error.message || JSON.stringify(error)}`);
  }

  return {
    messageId: data?.id || `<resend-${Date.now()}@attendancex.edu>`,
    id: data?.id
  };
};

export { Resend };
