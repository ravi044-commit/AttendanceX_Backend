import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const user = (process.env.SMTP_USER || '').trim();
const rawPass = (process.env.SMTP_PASS || '').trim();
const pass = (process.env.SMTP_HOST?.includes('gmail') && rawPass) ? rawPass.replace(/\s+/g, '') : rawPass;
const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(process.env.SMTP_PORT || '587', 10);

console.log('\n======================================================');
console.log('   AttendanceX SMTP Diagnostic & Real Email Verifier  ');
console.log('======================================================');
console.log(`Host:     ${host}`);
console.log(`Port:     ${port}`);
console.log(`User:     ${user || '(not configured)'}`);
console.log(`Password: ${pass ? '•••••••••••••••• (' + pass.length + ' chars)' : '(not configured)'}`);
console.log(`Mode:     ${process.env.EMAIL_TEST_MODE === 'true' ? 'SIMULATION (TEST MODE)' : 'REAL DELIVERY MODE'}`);
console.log('------------------------------------------------------');

if (!user || !pass) {
  console.error('\n❌ ERROR: SMTP_USER or SMTP_PASS is missing in server/.env.');
  console.error('Please configure your Gmail account and App Password.\n');
  process.exit(1);
}

console.log('Connecting to Google SMTP...');

const transportOpts = host.includes('gmail')
  ? {
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 10000
    }
  : {
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: { user, pass },
      connectionTimeout: 10000
    };

const transporter = nodemailer.createTransport(transportOpts);

transporter.verify(async (err) => {
  if (err) {
    console.error('\n❌ SMTP VERIFICATION FAILED:');
    console.error(`Error details: ${err.message}\n`);

    if (err.message.includes('535') || err.message.includes('BadCredentials') || err.message.includes('Username and Password not accepted')) {
      console.log('📌 HOW TO FIX THIS IN GOOGLE:');
      console.log('1. Go to your Google Account: https://myaccount.google.com/security');
      console.log('2. Ensure "2-Step Verification" is turned ON.');
      console.log('3. Visit: https://myaccount.google.com/apppasswords');
      console.log('4. Create an App Password with name "AttendanceX".');
      console.log('5. Google gives you a 16-letter password (e.g. "abcd efgh ijkl mnop").');
      console.log('6. Open server/.env and update:');
      console.log(`   SMTP_PASS=your 16 letter code`);
      console.log('7. Re-run: node test-smtp.js\n');
    }
    process.exit(1);
  }

  console.log('\n✅ SUCCESS: Google SMTP Connected & Authenticated Successfully!');
  console.log('Real verification emails can now be dispatched to any valid inbox.\n');

  // Check if test recipient provided
  const targetArg = process.argv.find((a) => a.startsWith('--to='));
  if (targetArg) {
    const toEmail = targetArg.replace('--to=', '').trim();
    console.log(`Sending live test email to: ${toEmail}...`);
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || `AttendanceX <${user}>`,
        to: toEmail,
        subject: '[AttendanceX Test] Real Email Delivery Verified',
        text: 'Congratulations! Real email delivery from AttendanceX via Nodemailer is functioning properly.'
      });
      console.log(`✅ LIVE EMAIL DELIVERED! Message ID: ${info.messageId}\n`);
    } catch (sendErr) {
      console.error(`❌ Send failed: ${sendErr.message}\n`);
    }
  }
  process.exit(0);
});
