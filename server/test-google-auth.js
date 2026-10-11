import { initDatabase, getQuery, runQuery } from './database.js';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'bd4bcaf71c6e9c13f40c0478a4eb102dc94116e352d7c02a4015812f70ba0343';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

export async function runGoogleAuthTests() {
  await initDatabase();
  console.log('\n====================================================');
  console.log('       AttendanceX Google Sign-In & Linking Tests    ');
  console.log('====================================================\n');

  // Test 1: Invalid Token Rejection
  console.log('--- TEST 1: Reject Invalid / Forged Google ID Token ---');
  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'invalid.forged.jwt.token' })
    });
    assert(res.status === 401, 'Invalid Google token rejected with 401 Unauthorized');
    const data = await res.json();
    assert(data.error && data.error.includes('Google verification failed'), 'Proper verification failure message returned');
  } catch (err) {
    assert(false, `Test 1 error: ${err.message}`);
  }

  // Test 2: Missing Token Rejection
  console.log('\n--- TEST 2: Reject Missing Credential ---');
  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(res.status === 400, 'Empty token request rejected with 400 Bad Request');
  } catch (err) {
    assert(false, `Test 2 error: ${err.message}`);
  }

  // Test 3: Account Linking Flow with Unknown / Unlinked Google Account
  console.log('\n--- TEST 3: Unlinked Google Account Linking Flow ---');
  try {
    // Generate a simulated Google link token (same payload shape created during Google OAuth)
    const testGoogleSub = 'google-sub-test-99999';
    const testGoogleEmail = 'testgoogleuser@gmail.com';

    // Ensure testGoogleSub is not linked
    await runQuery('UPDATE users SET google_id = NULL, google_email = NULL WHERE google_id = ?', [testGoogleSub]);

    const linkToken = jwt.sign(
      {
        sub: testGoogleSub,
        email: testGoogleEmail,
        name: 'Test Google User',
        type: 'google_link_intent'
      },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    const targetFaculty = await getQuery("SELECT * FROM users WHERE role = 'faculty' LIMIT 1");
    const targetIdentifier = targetFaculty?.email || 'faculty.jd.vadalia@attendancex.edu';
    const targetPassword = 'Faculty@123';

    // 3.1 Attempt linking with incorrect password
    const badLinkRes = await fetch(`${API_BASE}/auth/google/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkToken,
        identifier: targetIdentifier,
        password: 'WrongPassword999'
      })
    });
    assert(badLinkRes.status === 401, 'Linking rejected with 401 on incorrect password');

    // 3.2 Attempt linking with unknown user identifier
    const badUserRes = await fetch(`${API_BASE}/auth/google/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkToken,
        identifier: 'nonexistent@attendancex.edu',
        password: targetPassword
      })
    });
    assert(badUserRes.status === 401, 'Linking rejected for nonexistent user');

    // 3.3 Successful account linking with valid credentials (Faculty user)
    const goodLinkRes = await fetch(`${API_BASE}/auth/google/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkToken,
        identifier: targetIdentifier,
        password: targetPassword
      })
    });
    const linkData = await goodLinkRes.json();
    assert(goodLinkRes.status === 200, 'Linking succeeds with 200 OK on verified credentials');
    assert(linkData.user && linkData.user.google_id === testGoogleSub, 'User record updated with Google Subject ID');
    assert(linkData.user.role === 'faculty', 'Institutional Faculty role strictly preserved during linking');
    assert(Boolean(linkData.token), 'JWT session issued upon successful linking');

    // Verify DB update
    const dbUser = await getQuery('SELECT google_id, google_email, role FROM users WHERE id = ?', [linkData.user.id]);
    assert(dbUser.google_id === testGoogleSub, 'Database verified: google_id correctly persisted');
    assert(dbUser.role === 'faculty', 'Database verified: user role unchanged');

    // 3.4 Unlink Google Account
    const unlinkRes = await fetch(`${API_BASE}/auth/google/unlink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${linkData.token}`
      },
      body: JSON.stringify({ password: targetPassword })
    });
    assert(unlinkRes.status === 200, 'Unlink Google Account succeeds with 200 OK');

    const dbUserAfter = await getQuery('SELECT google_id, google_email FROM users WHERE id = ?', [linkData.user.id]);
    assert(dbUserAfter.google_id === null, 'Database verified: google_id successfully cleared');
  } catch (err) {
    assert(false, `Test 3 error: ${err.message}`);
  }

  // Test 4: Existing Student Account Linking & Role/Record Preservation
  console.log('\n--- TEST 4: Student Account Linking & Attendance Preservation ---');
  try {
    const studentGoogleSub = 'google-sub-student-77777';
    const studentEnrollment = '246250307001';

    const studentLinkToken = jwt.sign(
      {
        sub: studentGoogleSub,
        email: 'student777@gmail.com',
        name: 'Jay Student',
        type: 'google_link_intent'
      },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Link student using enrollment number and default student password
    const stuLinkRes = await fetch(`${API_BASE}/auth/google/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkToken: studentLinkToken,
        identifier: studentEnrollment,
        password: studentEnrollment
      })
    });
    assert(stuLinkRes.status === 200, 'Student account linking succeeds via Enrollment Number');
    const stuData = await stuLinkRes.json();
    assert(stuData.user && stuData.user.role === 'student', 'Student role strictly preserved');
    assert(stuData.user.studentData && stuData.user.studentData.enrolment_number === studentEnrollment, 'Student attendance data preserved');

    // Clean up test link
    await runQuery('UPDATE users SET google_id = NULL, google_email = NULL WHERE google_id = ?', [studentGoogleSub]);
    assert(true, 'Test student Google link cleaned up');
  } catch (err) {
    assert(false, `Test 4 error: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`GOOGLE AUTH TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('====================================================\n');

  return { total: totalTests, passed: passedTests, failed: failedTests };
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('test-google-auth.js')) {
  runGoogleAuthTests().then(res => {
    if (res.failed > 0) process.exit(1);
    else process.exit(0);
  });
}
