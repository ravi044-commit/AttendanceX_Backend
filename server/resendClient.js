/**
 * Deprecated client module: Resend has been replaced with the Brevo transactional HTTP API.
 * Retained as a backward-compatibility layer without importing the uninstalled 'resend' package.
 */
import { sendBrevoEmail, isBrevoConfigured } from './brevoClient.js';

export const isResendConfigured = isBrevoConfigured;
export const sendResendEmail = sendBrevoEmail;
export const getResendClient = () => null;
export const Resend = null;

export { sendBrevoEmail, isBrevoConfigured };
export default {
  sendResendEmail,
  isResendConfigured,
  sendBrevoEmail,
  isBrevoConfigured
};
