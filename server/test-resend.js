import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendVerificationOtpEmail } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

// Generate a random 6-digit OTP code for testing
const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
const recipient = (process.argv[2] || 'ravilaptop978@gmail.com').replace('--to=', '').trim();

console.log('\n======================================================');
console.log('        AttendanceX OTP Email Dispatch via Brevo       ');
console.log('======================================================');
console.log(`Generated OTP: >>> ${testOtp} <<<`);
console.log(`Recipient:     ${recipient}`);
console.log(`Provider:      Brevo API (HTTPS Port 443)`);
console.log('======================================================\n');

async function main() {
  try {
    console.log(`Sending verification OTP to ${recipient}...`);
    const result = await sendVerificationOtpEmail({
      recipientEmail: recipient,
      purpose: 'identity_verification',
      otp: testOtp
    });

    console.log('\n✅ SUCCESS: OTP Verification Email Sent Successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log(`Code Sent:  ${testOtp}`);
    console.log(`\nCheck inbox (${recipient}) to enter the OTP code.\n`);
  } catch (err) {
    console.error('\n❌ Failed to send OTP email:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
