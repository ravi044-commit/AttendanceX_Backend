async function testMarkAttendance() {
  const payload = {
    class_id: 1,
    subject_name: 'IOT - Internet of Things (Lecture)',
    session_type: 'Lecture',
    date: '2026-08-25',
    marked_by: 'C.G.Ajudiya',
    records: [
      { student_uid: 'STU-COMP-001', student_name: 'AMBALIYA JAY RAMSHIBHAI', enrolment_number: '246250307001', status: 'Present' },
      { student_uid: 'STU-COMP-002', student_name: 'ANSARI AHMADRAZA SAHIDRAJAK', enrolment_number: '246250307002', status: 'Present' },
      { student_uid: 'STU-COMP-003', student_name: 'BARAD JENIL RITESH', enrolment_number: '246250307003', status: 'Absent' }
    ]
  };

  const res = await fetch('http://localhost:5000/api/attendance/mark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Mark Attendance Response:', res.status, data);

  // Check updated student 1
  const sRes = await fetch('http://localhost:5000/api/students/STU-COMP-001');
  const sData = await sRes.json();
  console.log('Updated Student STU-COMP-001 percentage:', sData.percentage, '%', 'Weighted score:', sData.weighted_percentage);
}

testMarkAttendance();
