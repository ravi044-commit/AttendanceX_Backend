import crypto from 'crypto';
import dns from 'dns/promises';
import bcrypt from 'bcryptjs';
import { runQuery, getQuery, allQuery } from './database.js';
import { sendVerificationOtpEmail, sendEmailChangeNotice } from './emailService.js';

/**
 * Verify that an email domain has active DNS mail records (MX/A)
 * Prevents bogus / non-existent fake domains while allowing institutional .edu and local domains
 */
export const verifyEmailDomain = async (email) => {
  if (!email || !email.includes('@')) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].trim().toLowerCase();

  // Allowed institutional / test / local domains
  if (
    domain === 'attendancex.edu' ||
    domain.endsWith('.attendancex.edu') ||
    domain === 'localhost' ||
    domain.endsWith('.test') ||
    domain.endsWith('.local')
  ) {
    return true;
  }

  try {
    const mx = await dns.resolveMx(domain);
    return Boolean(mx && mx.length > 0);
  } catch (err) {
    try {
      const a = await dns.resolve4(domain);
      return Boolean(a && a.length > 0);
    } catch {
      return false;
    }
  }
};

/**
 * Valid Verification Purposes
 */
export const VALID_PURPOSES = ['account_setup', 'email_change', 'password_recovery'];

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Hash helper for OTP with salt
 */
export const hashOtp = (otp, salt) => {
  return crypto.createHash('sha256').update(`${otp}:${salt}`).digest('hex');
};

/**
 * Hash helper for Password Reset Authorization Token
 */
export const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate cryptographically secure 6-digit OTP
 */
export const generateSecureOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Request & Generate OTP for a specific purpose
 * Dispatches via EmailService, saves hashed record in DB
 */
export const requestOtp = async ({ email, purpose, userId = null }) => {
  const input = email ? email.trim() : '';

  if (!input) {
    throw new Error('Valid email address or enrollment number is required');
  }

  if (!VALID_PURPOSES.includes(purpose)) {
    throw new Error(`Invalid purpose. Allowed purposes: ${VALID_PURPOSES.join(', ')}`);
  }

  let normalizedEmail = input.toLowerCase();
  let associatedUserId = userId;

  if (purpose === 'password_recovery') {
    let existingUser = await getQuery('SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);
    if (!existingUser) {
      existingUser = await getQuery(`
        SELECT u.id, u.email FROM users u
        LEFT JOIN students s ON (s.user_id = u.id OR s.uid = u.uid)
        WHERE LOWER(u.uid) = LOWER(?) OR s.enrolment_number = ? OR LOWER(u.email) = LOWER(? || '@attendancex.edu')
        LIMIT 1
      `, [input, input, input]);
    }
    if (!existingUser) {
      throw new Error(`No registered account found with email or enrollment number "${input}". Please check your details or contact your administrator.`);
    }
    associatedUserId = existingUser.id;
    // Deliver to the registered account email
    normalizedEmail = existingUser.email.toLowerCase();
  } else {
    // For email_change and account_setup: accept real email addresses
    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      throw new Error('Please enter a valid email address (e.g. name@gmail.com)');
    }
  }

  // Verify email domain actually exists and has mail records
  const domainValid = await verifyEmailDomain(normalizedEmail);
  if (!domainValid) {
    const domainPart = normalizedEmail.split('@')[1] || '';
    throw new Error(`The email domain "@${domainPart}" does not exist or cannot receive emails. Please enter a valid real email.`);
  }

  if (purpose === 'email_change') {
    if (!associatedUserId) {
      throw new Error('User authentication required for email change verification');
    }
    const currentUser = await getQuery('SELECT id, email FROM users WHERE id = ?', [associatedUserId]);
    if (!currentUser) {
      throw new Error('User not found');
    }
    if (currentUser.email.toLowerCase() === normalizedEmail) {
      throw new Error('New email address must be different from current email address');
    }
    const emailConflict = await getQuery('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?', [normalizedEmail, associatedUserId]);
    if (emailConflict) {
      throw new Error('This email address is already in use by another account');
    }
  } else if (purpose === 'account_setup') {
    // If account setup, verify user exists or will be activated
    const userToSetup = await getQuery('SELECT id, email, setup_status FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);
    if (userToSetup) {
      associatedUserId = userToSetup.id;
    }
  }

// Rate Limiting: Check resend cooldown
const latestOtp = await getQuery(`
    SELECT id, last_sent_at, is_used, attempts 
    FROM email_otps 
    WHERE LOWER(email) = LOWER(?) AND purpose = ? AND is_used = 0 
    ORDER BY id DESC LIMIT 1
  `, [normalizedEmail, purpose]);

if (latestOtp && latestOtp.last_sent_at) {
  const lastSentTime = new Date(latestOtp.last_sent_at).getTime();
  const timeSinceLastSent = Date.now() - lastSentTime;
  if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
    throw new Error(`Please wait ${waitSeconds} seconds before requesting a new verification code.`);
  }
}

// Invalidate any prior active codes for this email and purpose
await runQuery(`
    UPDATE email_otps 
    SET is_used = 1 
    WHERE LOWER(email) = LOWER(?) AND purpose = ? AND is_used = 0
  `, [normalizedEmail, purpose]);

// Generate 6-digit OTP and secure salt
const rawOtp = generateSecureOtp();
const salt = crypto.randomBytes(16).toString('hex');
const otpHash = hashOtp(rawOtp, salt);
const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();

// Send real email BEFORE committing to DB to prevent dangling codes on delivery failure
try {
  await sendVerificationOtpEmail({
    recipientEmail: normalizedEmail,
    purpose,
    otp: rawOtp // Sent over secure transport, never logged or exposed in HTTP responses
  });
} catch (deliveryError) {
  throw new Error(`Failed to deliver verification email: ${deliveryError.message}`);
}

// Save verification record with both readable otp_code (for database inspection) and secure salt/hash
await runQuery(`
    INSERT INTO email_otps (
      user_id, email, purpose, otp_code, otp_hash, salt, expires_at, attempts, max_attempts, is_used, resend_count, last_sent_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, CURRENT_TIMESTAMP)
  `, [associatedUserId, normalizedEmail, purpose, rawOtp, otpHash, salt, expiresAt, MAX_VERIFY_ATTEMPTS, (latestOtp ? 1 : 0)]);

  const responseData = {
    success: true,
    message: 'Verification code sent successfully to your email',
    purpose,
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000)
  };

  if (process.env.EMAIL_TEST_MODE === 'true') {
    responseData.testMode = true;
  }

  return responseData;
};

/**
 * Verify OTP against server-side record
 * Strictly validates purpose, expiration, attempt limits, and marks code as used
 */
export const verifyOtp = async ({ email, otp, purpose, userId = null }) => {
  const normalizedEmail = email ? email.trim().toLowerCase() : '';
  const trimmedOtp = otp ? String(otp).trim() : '';

  if (!normalizedEmail || !trimmedOtp) {
    throw new Error('Email and 6-digit verification code are required');
  }

  if (!VALID_PURPOSES.includes(purpose)) {
    throw new Error(`Invalid verification purpose: ${purpose}`);
  }

  let targetEmail = normalizedEmail;
  if (!targetEmail.includes('@') && purpose === 'password_recovery') {
    const userRow = await getQuery(`
      SELECT u.email FROM users u
      LEFT JOIN students s ON (s.user_id = u.id OR s.uid = u.uid)
      WHERE LOWER(u.uid) = LOWER(?) OR s.enrolment_number = ?
      LIMIT 1
    `, [normalizedEmail, normalizedEmail]);
    if (userRow) targetEmail = userRow.email.toLowerCase();
  }

  // Retrieve active OTP record for exact email and purpose
  let sql = `
    SELECT * FROM email_otps 
    WHERE LOWER(email) = LOWER(?) AND purpose = ? AND is_used = 0 
    ORDER BY id DESC LIMIT 1
  `;
  const record = await getQuery(sql, [targetEmail, purpose]);

  if (!record) {
    throw new Error('No active verification code found for this purpose. Please request a new code.');
  }

  // Purpose mismatch check (redundant safeguard)
  if (record.purpose !== purpose) {
    throw new Error('Verification purpose mismatch. This code cannot be used for this action.');
  }

  // If userId provided (for email change / authenticated actions), ensure it matches record
  if (userId && record.user_id && record.user_id !== userId) {
    throw new Error('Unauthorized verification request. Verification code belongs to a different account.');
  }

  // Check Expiration (5 minutes)
  const isExpired = new Date(record.expires_at).getTime() < Date.now();
  if (isExpired) {
    // Invalidate expired code
    await runQuery('UPDATE email_otps SET is_used = 1 WHERE id = ?', [record.id]);
    throw new Error('Verification code has expired. Please request a new code.');
  }

  // Check Attempt Limits (max 5)
  if (record.attempts >= record.max_attempts) {
    // Invalidate locked code
    await runQuery('UPDATE email_otps SET is_used = 1 WHERE id = ?', [record.id]);
    throw new Error('Maximum verification attempts exceeded. Code has been invalidated. Please request a new code.');
  }

  // Verify Hash
  const candidateHash = hashOtp(trimmedOtp, record.salt);
  const isMatch = candidateHash.toLowerCase() === record.otp_hash.toLowerCase();

  if (!isMatch) {
    const updatedAttempts = record.attempts + 1;
    const remaining = record.max_attempts - updatedAttempts;

    if (remaining <= 0) {
      await runQuery('UPDATE email_otps SET attempts = ?, is_used = 1 WHERE id = ?', [updatedAttempts, record.id]);
      throw new Error('Incorrect verification code. Maximum attempts reached. Code has been invalidated.');
    } else {
      await runQuery('UPDATE email_otps SET attempts = ? WHERE id = ?', [updatedAttempts, record.id]);
      throw new Error(`Incorrect verification code. You have ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
    }
  }

  // SUCCESS: Invalidate OTP immediately to prevent reuse
  await runQuery('UPDATE email_otps SET is_used = 1 WHERE id = ?', [record.id]);

  return {
    verified: true,
    record
  };
};

/**
 * Complete Password Recovery: Generate short-lived, single-use Reset Authorization Token
 */
export const issuePasswordResetAuthorization = async ({ email }) => {
  let normalizedEmail = email.trim().toLowerCase();
  let user = await getQuery('SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);
  if (!user) {
    user = await getQuery(`
      SELECT u.id, u.email FROM users u
      LEFT JOIN students s ON (s.user_id = u.id OR s.uid = u.uid)
      WHERE LOWER(u.uid) = LOWER(?) OR s.enrolment_number = ?
      LIMIT 1
    `, [normalizedEmail, normalizedEmail]);
  }

  const userId = user ? user.id : null;

  // Invalidate any previous reset authorizations for this user or email
  if (userId) {
    await runQuery('UPDATE password_reset_authorizations SET is_used = 1 WHERE user_id = ? AND is_used = 0', [userId]);
  } else {
    await runQuery('UPDATE password_reset_authorizations SET is_used = 1 WHERE LOWER(email) = LOWER(?) AND is_used = 0', [normalizedEmail]);
  }

  // Generate cryptographically secure random token (32 bytes = 64 hex characters)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS).toISOString();

  await runQuery(`
    INSERT INTO password_reset_authorizations (token_hash, user_id, email, expires_at, is_used)
    VALUES (?, ?, ?, ?, 0)
  `, [tokenHash, userId, normalizedEmail, expiresAt]);

  return {
    resetAuthorization: rawToken,
    expiresInSeconds: Math.floor(RESET_TOKEN_EXPIRY_MS / 1000)
  };
};

/**
 * Execute Password Reset using single-use Authorization Token
 */
export const resetPasswordWithAuthorization = async ({ resetAuthorization, newPassword }) => {
  if (!resetAuthorization || typeof resetAuthorization !== 'string') {
    throw new Error('Password reset authorization token is required');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters in length');
  }

  const tokenHash = hashResetToken(resetAuthorization);

  const authRecord = await getQuery(`
    SELECT * FROM password_reset_authorizations 
    WHERE token_hash = ? AND is_used = 0 
    ORDER BY id DESC LIMIT 1
  `, [tokenHash]);

  if (!authRecord) {
    throw new Error('Invalid or already used password reset authorization. Please complete OTP verification again.');
  }

  // Check expiration
  if (new Date(authRecord.expires_at).getTime() < Date.now()) {
    await runQuery('UPDATE password_reset_authorizations SET is_used = 1 WHERE id = ?', [authRecord.id]);
    throw new Error('Password reset authorization has expired. Please verify OTP again.');
  }

  // Hash new password securely with bcrypt
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(newPassword, salt);

  // Update password in users table or create new user entry if unlinked
  if (authRecord.user_id) {
    await runQuery('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, authRecord.user_id]);
  } else if (authRecord.email) {
    const existing = await getQuery('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [authRecord.email]);
    if (existing) {
      await runQuery('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, existing.id]);
    } else {
      const username = authRecord.email.split('@')[0];
      const newUid = `STU-${Date.now()}`;
      await runQuery(`
        INSERT INTO users (uid, name, email, password, role, setup_status, email_verified_at)
        VALUES (?, ?, ?, ?, 'student', 'completed', CURRENT_TIMESTAMP)
      `, [newUid, username, authRecord.email.toLowerCase(), hashedPassword]);
    }
  }

  // Invalidate authorization token immediately
  await runQuery('UPDATE password_reset_authorizations SET is_used = 1 WHERE id = ?', [authRecord.id]);

  return {
    success: true,
    message: 'Your password has been reset successfully. You can now log in with your new password.'
  };
};

/**
 * Complete Email Change after OTP Verification
 */
export const finalizeEmailChange = async ({ userId, newEmail, otp }) => {
  const normalizedNewEmail = newEmail.trim().toLowerCase();

  const user = await getQuery('SELECT id, email, name FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error('User account not found');
  }

  const oldEmail = user.email;

  // Verify OTP strictly for email_change purpose
  await verifyOtp({
    email: normalizedNewEmail,
    otp,
    purpose: 'email_change',
    userId
  });

  // Permanently update user email
  await runQuery('UPDATE users SET email = ? WHERE id = ?', [normalizedNewEmail, userId]);

  // Notify the old email address where possible
  try {
    await sendEmailChangeNotice({
      oldEmail,
      newEmail: normalizedNewEmail
    });
  } catch (err) {
    console.warn('[OtpService] Notice to old email failed:', err.message);
  }

  return {
    success: true,
    message: 'Your email address has been updated successfully.',
    oldEmail,
    newEmail: normalizedNewEmail
  };
};

/**
 * Complete Initial Account Setup with OTP Verification
 */
export const finalizeAccountSetup = async ({ email, otp, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters in length');
  }

  const user = await getQuery('SELECT id, email, role, setup_status FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);

  // Verify OTP strictly for account_setup
  await verifyOtp({
    email: normalizedEmail,
    otp,
    purpose: 'account_setup',
    userId: user ? user.id : null
  });

  // Hash new password securely
  const hashedPassword = bcrypt.hashSync(password, 10);

  if (user) {
    // Update user with verified status, new password, and setup completion
    await runQuery(`
      UPDATE users 
      SET password = ?, setup_status = 'completed', email_verified_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [hashedPassword, user.id]);

    return {
      success: true,
      message: 'Account setup completed successfully. You can now log in.',
      user: {
        id: user.id,
        email: normalizedEmail,
        role: user.role,
        setup_status: 'completed'
      }
    };
  } else {
    // Auto-create user account with this verified email so they can immediately log in
    const username = normalizedEmail.split('@')[0];
    const newUid = `STU-${Date.now()}`;
    const insertRes = await runQuery(`
      INSERT INTO users (uid, name, email, password, role, setup_status, email_verified_at)
      VALUES (?, ?, ?, ?, 'student', 'completed', CURRENT_TIMESTAMP)
    `, [newUid, username, normalizedEmail, hashedPassword]);

    return {
      success: true,
      message: 'Account setup completed successfully. You can now log in with your email and password.',
      user: {
        id: insertRes.id,
        email: normalizedEmail,
        role: 'student',
        setup_status: 'completed'
      }
    };
  }
};
