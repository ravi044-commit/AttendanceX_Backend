import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function runComprehensiveHealthTest() {
  const BASE = process.env.VITE_API_URL || 'http://localhost:5000/api';
  const CLIENT = 'http://localhost:5173';
  const RFID_KEY = process.env.RFID_API_KEY || 'jDpTQolAiB8e4EfhTAWHu6OyTWMrdjgKrSIed4sgY3g';
  const results = [];

  function report(name, success, details) {
    results.push({ name, success, details });
    console.log((success ? '  [PASS] ' : '  [FAIL] ') + name + ' -> ' + JSON.stringify(details));
  }

  console.log('========================================================');
  console.log('       AttendanceX Full Health & API Key Audit          ');
  console.log('========================================================\n');

  // 1. Backend Server Health
  try {
    const res = await fetch(BASE + '/health');
    const data = await res.json();
    report('Backend /api/health', res.status === 200 && data.status === 'healthy', data);
  } catch (err) {
    report('Backend /api/health', false, { error: err.message });
  }

  // 2. Client Frontend Dev Server Health
  try {
    const res = await fetch(CLIENT);
    report('Vite Client Dev Server (http://localhost:5173)', res.status === 200, { status: res.status, ok: res.ok });
  } catch (err) {
    report('Vite Client Dev Server (http://localhost:5173)', false, { error: err.message });
  }

  // 3. Database Connectivity & Tables
  try {
    const stuRes = await fetch(BASE + '/students');
    const stuList = await stuRes.json();
    const classRes = await fetch(BASE + '/classes');
    const classList = await classRes.json();
    report('Database Tables & Records', stuList.length > 0 && classList.length > 0, {
      total_students: stuList.length,
      total_classes: classList.length
    });
  } catch (err) {
    report('Database Tables & Records', false, { error: err.message });
  }

  // 4. RFID API Key Authentication: Missing Key
  try {
    const res = await fetch(BASE + '/attendance/rfid-mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_uid: 'STU-COMP-001', class_id: 1 })
    });
    const data = await res.json();
    report('RFID API Key: Reject missing key (401)', res.status === 401, data);
  } catch (err) {
    report('RFID API Key: Reject missing key (401)', false, { error: err.message });
  }

  // 5. RFID API Key Authentication: Invalid Key
  try {
    const res = await fetch(BASE + '/attendance/rfid-mark', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer WRONG_FAKE_API_KEY_12345'
      },
      body: JSON.stringify({ student_uid: 'STU-COMP-001', class_id: 1 })
    });
    const data = await res.json();
    report('RFID API Key: Reject invalid key (401)', res.status === 401, data);
  } catch (err) {
    report('RFID API Key: Reject invalid key (401)', false, { error: err.message });
  }

  // 6. RFID API Key Authentication: Valid Hardware Key
  try {
    const res = await fetch(BASE + '/attendance/rfid-mark', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + RFID_KEY
      },
      body: JSON.stringify({ student_uid: 'STU-COMP-001', class_id: 1 })
    });
    const data = await res.json();
    const isAuthorized = res.status === 200 || res.status === 409;
    report('RFID API Key: Accept valid hardware key (200 or 409 duplicate protection)', isAuthorized, {
      status: res.status,
      message: data.message || data.error,
      authorized: isAuthorized
    });
  } catch (err) {
    report('RFID API Key: Accept valid hardware key (200 or 409 duplicate protection)', false, { error: err.message });
  }

  // 7. JWT Authentication Keys & Login Flow (Admin, Faculty, HOD, Student)
  const roles = [
    { role: 'admin', email: 'raviadmin@attendancex.edu', pass: 'Admin@123' },
    { role: 'faculty', email: 'faculty.jd.vadalia@attendancex.edu', pass: 'Faculty@123' },
    { role: 'hod', email: 'hod.cg.ajudiya@attendancex.edu', pass: 'Hod@123' },
    { role: 'student', email: '246250307001@attendancex.edu', pass: '246250307001' }
  ];

  for (const r of roles) {
    try {
      const res = await fetch(BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: r.email, password: r.pass, role: r.role })
      });
      const data = await res.json();
      const hasJwt = !!data.token;
      report('Auth & JWT Token: ' + r.role.toUpperCase(), res.status === 200 && hasJwt, {
        status: res.status,
        user: data.user?.name,
        role: data.user?.role,
        jwt_token_issued: hasJwt
      });
    } catch (err) {
      report('Auth & JWT Token: ' + r.role.toUpperCase(), false, { error: err.message });
    }
  }

  // 8. Face DB Storage Path Health
  try {
    const defaultFaceDb = path.resolve('face_db');
    const faceDbPath = process.env.FACE_DB_PATH
      ? (path.isAbsolute(process.env.FACE_DB_PATH) ? process.env.FACE_DB_PATH : path.resolve(process.env.FACE_DB_PATH))
      : defaultFaceDb;
    const exists = fs.existsSync(faceDbPath);
    report('Face Recognition DB Directory Health', exists, {
      configured_path: faceDbPath,
      accessible: exists
    });
  } catch (err) {
    report('Face Recognition DB Directory Health', false, { error: err.message });
  }

  console.log('\n========================================================');
  const allPassed = results.every(r => r.success);
  console.log('Passed: ' + results.filter(r => r.success).length + '/' + results.length + ' audits.');
  console.log('Result: ' + (allPassed ? 'ALL HEALTH CHECKS & API KEYS ARE 100% HEALTHY' : 'SOME CHECKS FAILED'));
  console.log('========================================================');
}

runComprehensiveHealthTest().catch(console.error);
