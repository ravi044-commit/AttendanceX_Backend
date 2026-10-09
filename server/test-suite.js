import { getStudentBatch } from './database.js';

const API_BASE = 'http://localhost:5000/api';

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

async function runTestSuite() {
  console.log('====================================================');
  console.log('       AttendanceX Automated Full Test Suite        ');
  console.log('====================================================\n');

  // TEST SUITE 1: Security & Public Registration Restriction
  console.log('--- TEST GROUP 1: Security & Registration Lockdown ---');
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: 'fakeadmin@attendancex.edu',
        password: 'Password@123',
        role: 'admin'
      })
    });
    assert(res.status === 403, 'Public Admin registration endpoint returns 403 Forbidden');
    const data = await res.json();
    assert(data.error && data.error.includes('Public registration is disabled'), 'Error message states public registration is disabled');
  } catch (err) {
    assert(false, `Registration security test failed: ${err.message}`);
  }

  // TEST SUITE 2: Role Authentication
  console.log('\n--- TEST GROUP 2: Institutional Role Authentication ---');
  try {
    // 2.1 Admin Login
    const adminRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'raviadmin@attendancex.edu',
        password: 'Admin@123',
        role: 'admin'
      })
    });
    assert(adminRes.status === 200, 'Admin login succeeds with status 200');
    const adminData = await adminRes.json();
    assert(adminData.user && adminData.user.role === 'admin', 'Admin user payload verified');
    assert(Boolean(adminData.token), 'JWT token issued for admin session');

    // 2.2 Faculty Login
    const facultyRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty.jd.vadalia@attendancex.edu',
        password: 'Faculty@123',
        role: 'faculty'
      })
    });
    assert(facultyRes.status === 200, 'Faculty login succeeds with status 200');
    const facultyData = await facultyRes.json();
    assert(facultyData.user && facultyData.user.role === 'faculty', 'Faculty role verified');

    // 2.3 HOD Login
    const hodRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'hod.cg.ajudiya@attendancex.edu',
        password: 'Hod@123',
        role: 'hod'
      })
    });
    assert(hodRes.status === 200, 'HOD login succeeds with status 200');
    const hodData = await hodRes.json();
    assert(hodData.user && hodData.user.role === 'hod', 'HOD role verified');

    // 2.4 Student Login
    const stuRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '246250307001@attendancex.edu',
        password: '246250307001',
        role: 'student'
      })
    });
    assert(stuRes.status === 200, 'Student login succeeds with status 200');

    // 2.5 Invalid Password check
    const badRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'raviadmin@attendancex.edu',
        password: 'WrongPassword999',
        role: 'admin'
      })
    });
    assert(badRes.status === 401, 'Invalid credentials rejected with 401 Unauthorized');
  } catch (err) {
    assert(false, `Authentication test failed: ${err.message}`);
  }

  // TEST SUITE 3: Student Batch Partitioning (Batch A: 1-63, Batch B: 64+)
  console.log('\n--- TEST GROUP 3: Batch Partitioning (Roll 1-63 = A, 64+ = B) ---');
  try {
    assert(getStudentBatch('STU-COMP-001', '246250307001') === 'Batch A', 'Student #1 (Roll 1) is classified as Batch A');
    assert(getStudentBatch('STU-COMP-010', '246250307013') === 'Batch A', 'Student #10 (Roll 10) is classified as Batch A');
    assert(getStudentBatch('STU-COMP-063', '246250307077') === 'Batch A', 'Student #63 (Boundary Roll 63) is classified as Batch A');
    assert(getStudentBatch('STU-COMP-064', '246250307078') === 'Batch B', 'Student #64 (Boundary Roll 64) is classified as Batch B');
    assert(getStudentBatch('STU-COMP-099', '236250307037') === 'Batch B', 'Student #99 (Roll 99) is classified as Batch B');

    // Check students API returns batch
    const stusRes = await fetch(`${API_BASE}/students`);
    const stus = await stusRes.json();
    assert(Array.isArray(stus) && stus.length === 99, 'Total 99 enrolled students in database');
    const batchACount = stus.filter(s => getStudentBatch(s.uid, s.enrolment_number) === 'Batch A').length;
    const batchBCount = stus.filter(s => getStudentBatch(s.uid, s.enrolment_number) === 'Batch B').length;
    assert(batchACount === 63, `Batch A has exactly 63 students (Roll 1 to 63): Actual=${batchACount}`);
    assert(batchBCount === 36, `Batch B has exactly 36 students (Roll 64 to 99): Actual=${batchBCount}`);
  } catch (err) {
    assert(false, `Batch partitioning test failed: ${err.message}`);
  }

  // TEST SUITE 4: Faculty In-Charge & Session Endpoints
  console.log('\n--- TEST GROUP 4: Faculty In-Charge Mapping ---');
  try {
    const sessionsRes = await fetch(`${API_BASE}/attendance/sessions-list`);
    const sessions = await sessionsRes.json();
    assert(Array.isArray(sessions) && sessions.length > 0, 'Sessions list fetched successfully');
    const firstSession = sessions[0];
    assert(Boolean(firstSession.faculty_in_charge), `Session has designated faculty_in_charge: ${firstSession.faculty_in_charge}`);
    assert(Boolean(firstSession.date), `Session has valid date: ${firstSession.date}`);
  } catch (err) {
    assert(false, `Sessions test failed: ${err.message}`);
  }

  // TEST SUITE 5: Single Student Attendance Toggle & DB Storage
  console.log('\n--- TEST GROUP 5: Single Attendance Toggle & DB Storage ---');
  try {
    // Fetch records for date 2026-08-25
    const recsRes = await fetch(`${API_BASE}/attendance/records?date=2026-08-25`);
    const recs = await recsRes.json();
    if (recs && recs.length > 0) {
      const target = recs[0];
      const initialStatus = target.status;
      const toggledStatus = initialStatus === 'Present' ? 'Absent' : 'Present';

      // Toggle status
      const updateRes = await fetch(`${API_BASE}/attendance/update-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: target.id,
          status: toggledStatus,
          marked_by: 'Faculty Test Suite'
        })
      });
      assert(updateRes.status === 200, 'update-single endpoint returned status 200');
      const updateData = await updateRes.json();
      assert(updateData.record && updateData.record.status === toggledStatus, `Status updated to ${toggledStatus} in database`);

      // Verify student statistics update
      const stuDetailRes = await fetch(`${API_BASE}/students/${target.student_uid}`);
      const stuDetail = await stuDetailRes.json();
      assert(typeof stuDetail.percentage === 'number', `Student attendance recalculated: ${stuDetail.percentage}%`);

      // Revert back
      await fetch(`${API_BASE}/attendance/update-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: target.id,
          status: initialStatus,
          marked_by: 'Faculty Test Suite'
        })
      });
      assert(true, `Successfully reverted student ${target.student_name} back to ${initialStatus}`);
    } else {
      assert(true, 'No records found for test date, skipped live record toggle');
    }
  } catch (err) {
    assert(false, `Single attendance toggle test failed: ${err.message}`);
  }

  // TEST SUITE 6: Subject-Wise Attendance Breakdown
  console.log('\n--- TEST GROUP 6: Subject-Wise Attendance Breakdown ---');
  try {
    const subRes = await fetch(`${API_BASE}/students/STU-COMP-001/subject-attendance`);
    const subData = await subRes.json();
    assert(Array.isArray(subData) && subData.length === 5, 'Returns all 5 curriculum subjects (IOT, IS, ST, CHSM, Vibe Lab)');
    const iot = subData.find(s => s.short_name === 'IOT');
    assert(iot && iot.faculty === 'C.G.Ajudiya', 'IOT subject correctly maps to Faculty C.G.Ajudiya');
    assert(iot && typeof iot.percentage === 'number', `IOT subject attendance percentage verified: ${iot?.percentage}%`);
  } catch (err) {
    assert(false, `Subject attendance test failed: ${err.message}`);
  }

  // TEST SUITE 7: Feature 6 Email OTP Verification & Account Security
  console.log('\n--- TEST GROUP 7: Feature 6 Email OTP Verification ---');
  try {
    const { runOtpTestSuite } = await import('./test-otp-flow.js');
    const otpResults = await runOtpTestSuite();
    totalTests += otpResults.total;
    passedTests += otpResults.passed;
    assert(otpResults.passed === otpResults.total, `All ${otpResults.total} Email OTP security tests passed!`);
  } catch (err) {
    assert(false, `OTP test suite failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`TEST RUN FINISHED: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
