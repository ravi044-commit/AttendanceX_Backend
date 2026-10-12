import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // Also check current working directory for cloud deployments (e.g. Render)

const getApiKey = () => (process.env.BREVO_API_KEY || '').trim();
const getSenderEmail = () => (process.env.BREVO_SENDER || '').trim();

/**
 * Check if Brevo HTTP API is configured with valid environment variables
 * @returns {boolean}
 */
export const isBrevoConfigured = () => {
  const apiKey = getApiKey();
  const sender = getSenderEmail();
  return Boolean(
    apiKey &&
    sender &&
    !apiKey.includes('your_brevo_api_key') &&
    !apiKey.includes('xxxx') &&
    sender.includes('@')
  );
};

/**
 * Send a transactional email via the Brevo HTTP API (built-in fetch)
 * @param {Object} options - { to, subject, html, text }
 * @returns {Promise<{ messageId: string }>}
 */
export const sendBrevoEmail = async ({ to, subject, html, text }) => {
  const apiKey = getApiKey();
  const senderEmail = getSenderEmail();

  if (!apiKey || !senderEmail) {
    throw new Error('Brevo API credentials are not configured. Please set BREVO_API_KEY and BREVO_SENDER in server/.env');
  }

  if (apiKey.startsWith('xsmtpsib-')) {
    throw new Error('Invalid Brevo API Key: Your BREVO_API_KEY starts with "xsmtpsib-", which is an SMTP password. Brevo REST API requires an API v3 key starting with "xkeysib-". Please generate one at https://app.brevo.com/settings/keys/api');
  }

  // Normalize 'to' to support single string, object { email }, or array
  let recipientList;
  if (Array.isArray(to)) {
    recipientList = to.map((item) => (typeof item === 'string' ? { email: item.trim() } : item));
  } else if (typeof to === 'object' && to !== null && to.email) {
    recipientList = [{ email: to.email.trim() }];
  } else {
    recipientList = [{ email: String(to).trim() }];
  }

  const payload = {
    sender: {
      name: 'AttendanceX',
      email: senderEmail
    },
    to: recipientList,
    subject,
    htmlContent: html
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json().catch(() => ({}));

  return {
    messageId: data?.messageId || `<brevo-${Date.now()}@attendancex.edu>`,
    ...data
  };
};

export default {
  sendBrevoEmail,
  isBrevoConfigured
};
