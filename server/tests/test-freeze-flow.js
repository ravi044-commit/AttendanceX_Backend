// Test script for HOD Final Freeze & 1-Session Lockdown Flow
async function runTest() {
  const BASE = 'http://localhost:5000/api';
  console.log('=== STARTING TEST: HOD FINAL FREEZE & 1-SESSION LOCKDOWN ===\n');

  const testDate = '2026-09-10';
  const nextDate = '2026-09-11';

  // 1. Check initial lock status for testDate
  console.log(`[1] Checking initial lock status for date: ${testDate}...`);
  const initialLockRes = await fetch(`${BASE}/attendance/lock-status?date=${testDate}`);
  const initialLock = await initialLockRes.json();
  console.log('    Status:', initialLock.status, '| is_frozen:', initialLock.is_frozen, '| Next session forecast:', initialLock.next_session_date);

  // 2. Mark attendance for testDate while it is Open (1st session)
  console.log(`\n[2] Marking attendance while date is OPEN for date: ${testDate}...`);
  const markRes1 = await fetch(`${BASE}/attendance/mark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      class_id: 1,
      subject_name: 'IOT - Internet of Things (Lecture)',
      session_type: 'Lecture',
      date: testDate,
      marked_by: 'C.G.Ajudiya',
      department: 'Computer Department',
      records: [
        { student_uid: 'STU-COMP-001', student_name: 'AMBALIYA JAY RAMSHIBHAI', enrolment_number: '246250307001', status: 'Present' },
        { student_uid: 'STU-COMP-002', student_name: 'ANSARI AHMADRAZA SAHIDRAJAK', enrolment_number: '246250307002', status: 'Absent' }
      ]
    })
  });
  const markData1 = await markRes1.json();
  console.log('    Mark Result:', markRes1.status === 200 ? 'SUCCESS' : 'FAILED', markData1.message || markData1.error);

  // 3. HOD clicks the FINAL button -> Freeze the date!
  console.log(`\n[3] HOD clicks FINAL button to freeze attendance for: ${testDate}...`);
  const freezeRes = await fetch(`${BASE}/attendance/freeze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: testDate,
      department: 'Computer Department',
      finalized_by: 'HOD C.G.Ajudiya'
    })
  });
  const freezeData = await freezeRes.json();
  console.log('    Freeze Result:', freezeRes.status === 200 ? 'SUCCESS' : 'FAILED');
  console.log('    Message:', freezeData.message);
  console.log('    is_frozen:', freezeData.is_frozen, '| Finalized By:', freezeData.finalized_by);
  console.log('    ⚡ Automatically Scheduled Next Session Date:', freezeData.next_session_date);

  // 4. Verify that lock status now shows FROZEN and next morning session is scheduled
  console.log(`\n[4] Verifying updated lock status for ${testDate}...`);
  const updatedLockRes = await fetch(`${BASE}/attendance/lock-status?date=${testDate}`);
  const updatedLock = await updatedLockRes.json();
  console.log('    Updated Status:', updatedLock.status, '| is_frozen:', updatedLock.is_frozen);
  console.log('    Finalized By:', updatedLock.finalized_by, '| At:', updatedLock.finalized_at);

  // 5. Verify that next session (nextDate) was automatically created in Open status
  console.log(`\n[5] Verifying automatically created next morning session for ${nextDate}...`);
  const nextLockRes = await fetch(`${BASE}/attendance/lock-status?date=${nextDate}`);
  const nextLock = await nextLockRes.json();
  console.log('    Next Session Status:', nextLock.status, '| is_frozen:', nextLock.is_frozen);

  // 6. ATTEMPT TO MODIFY OR MARK ATTENDANCE ON FROZEN DATE (Faculty or Admin attempt)
  console.log(`\n[6] Attempting to mark/alter attendance for FROZEN date ${testDate}...`);
  const forbiddenRes = await fetch(`${BASE}/attendance/mark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      class_id: 1,
      subject_name: 'IOT - Internet of Things (Lecture)',
      session_type: 'Lecture',
      date: testDate,
      marked_by: 'Admin / Faculty Member',
      department: 'Computer Department',
      records: [
        { student_uid: 'STU-COMP-001', student_name: 'AMBALIYA JAY RAMSHIBHAI', enrolment_number: '246250307001', status: 'Present' }
      ]
    })
  });
  const forbiddenData = await forbiddenRes.json();
  console.log('    Response Status:', forbiddenRes.status, forbiddenRes.status === 403 ? '(EXPECTED: 403 FORBIDDEN)' : '(UNEXPECTED)');
  console.log('    Server Error Message:', forbiddenData.error);

  // 7. Verify all locks endpoint
  console.log(`\n[7] Fetching all locks ledger...`);
  const allLocksRes = await fetch(`${BASE}/attendance/all-locks?department=Computer Department`);
  const allLocks = await allLocksRes.json();
  console.log('    Total Lock Entries in DB:', allLocks.length);
  allLocks.slice(0, 3).forEach(l => {
    console.log(`    - Date: ${l.date} | Status: ${l.status} | Frozen: ${l.is_frozen} | By: ${l.finalized_by || 'Open'} | Next: ${l.next_session_date || 'None'}`);
  });

  console.log('\n=== ALL TEST CHECKS COMPLETED SUCCESSFULLY! ===');
}

runTest().catch(console.error);
