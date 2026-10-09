import { allQuery } from './database.js';

const viewOtps = async () => {
  try {
    const otps = await allQuery(`
      SELECT id, email, purpose, otp_code, otp_hash, is_used, attempts, expires_at, created_at
      FROM email_otps
      ORDER BY id DESC
      LIMIT 20
    `);

    console.log('\n========================================================================================');
    console.log('              AttendanceX Database: Stored Email OTP Verification Records               ');
    console.log('========================================================================================');

    if (!otps || otps.length === 0) {
      console.log('No OTP records found in email_otps table.');
      process.exit(0);
    }

    const now = Date.now();
    const formatted = otps.map((row) => {
      const isExpired = new Date(row.expires_at).getTime() < now;
      let status = '🟢 Active';
      if (row.is_used === 1) status = '⚪ Used';
      else if (isExpired) status = '🔴 Expired';

      return {
        ID: row.id,
        Created: new Date(row.created_at).toLocaleTimeString(),
        Recipient: row.email,
        Purpose: row.purpose,
        'OTP Code': row.otp_code || '(hashed)',
        Status: status,
        Attempts: `${row.attempts}/5`
      };
    });

    console.table(formatted);
    console.log('========================================================================================\n');
  } catch (err) {
    console.error('Failed to query email_otps table:', err.message);
  } finally {
    process.exit(0);
  }
};

viewOtps();
