import { allQuery, getQuery, runQuery, rawStudentList } from './database.js';

async function seedRecords() {
  console.log('Seeding full records for attendance_locks dates...');
  const dates = [
    { date: '2026-09-10', sub: 'IOT - Internet of Things (Lecture)', type: 'Lecture', fac: 'C.G.Ajudiya', frozen: 1 },
    { date: '2026-09-11', sub: 'ST - Software Testing (Lecture)', type: 'Lecture', fac: 'J.D.Vadalia', frozen: 1 },
    { date: '2026-09-12', sub: 'IS Lab - Information Security Laboratory', type: 'Lab', fac: 'P.V.Patel', frozen: 1 },
    { date: '2026-09-13', sub: 'CHSM - Computer Hardware Architecture and System Maintenance (Lecture)', type: 'Lecture', fac: 'J.V.Shparia', frozen: 1 },
    { date: '2026-09-14', sub: 'IOT Lab - Internet of Things Laboratory', type: 'Lab', fac: 'C.G.Ajudiya', frozen: 0 },
    // Also seed some Lab sessions for earlier dates so students have lab records in IS, IOT, ST, CHSM, Vibe Lab!
    { date: '2026-08-26', sub: 'IOT Lab - Internet of Things Laboratory', type: 'Lab', fac: 'C.G.Ajudiya', frozen: 1 },
    { date: '2026-08-27', sub: 'IS Lab - Information Security Laboratory', type: 'Lab', fac: 'P.V.Patel', frozen: 1 },
    { date: '2026-08-28', sub: 'ST Lab - Software Testing Laboratory', type: 'Lab', fac: 'J.D.Vadalia', frozen: 1 },
    { date: '2026-08-29', sub: 'CHSM Lab - Computer Hardware Architecture and System Maintenance Lab', type: 'Lab', fac: 'J.V.Shparia', frozen: 1 },
    { date: '2026-08-30', sub: 'Vibe Lab - Project & Practical Innovation Lab', type: 'Lab', fac: 'Shubham', frozen: 1 }
  ];

  for (const d of dates) {
    const existing = await allQuery('SELECT COUNT(*) as count FROM attendance_records WHERE date = ?', [d.date]);
    if (existing[0].count < 50) {
      await runQuery('DELETE FROM attendance_records WHERE date = ?', [d.date]);
      for (const s of rawStudentList) {
        const formattedUid = 'STU-COMP-' + String(s.uid).padStart(3, '0');
        // Let's create realistic attendance:
        // In IOT, high attendance (~99% for most students, as requested!)
        // In IS, slightly lower attendance (~58% - 65% for some students, as requested!)
        let isPresent = false;
        if (d.sub.includes('IOT')) {
          isPresent = Math.random() > 0.02; // ~98-99% attendance in IoT!
        } else if (d.sub.includes('IS')) {
          // In IS, moderate / lower attendance like 58%
          isPresent = Math.random() > 0.42; // ~58% attendance in IS!
        } else if (d.sub.includes('ST')) {
          isPresent = Math.random() > 0.15; // ~85%
        } else if (d.sub.includes('CHSM')) {
          isPresent = Math.random() > 0.10; // ~90%
        } else {
          isPresent = Math.random() > 0.18; // ~82%
        }

        const status = isPresent ? 'Present' : 'Absent';
        await runQuery(`
          INSERT INTO attendance_records (
            class_id, student_uid, student_name, enrolment_number,
            department, date, session_type, subject_name, status, marked_by, is_frozen
          )
          VALUES (1, ?, ?, ?, 'Computer Department', ?, ?, ?, ?, ?, ?)
        `, [formattedUid, s.name, s.enrollment_number, d.date, d.type, d.sub, status, d.fac, d.frozen]);
      }
      console.log(`Seeded 99 records for ${d.date} (${d.sub})`);
    } else {
      console.log(`Date ${d.date} already has ${existing[0].count} records`);
    }
  }

  // Update students table totals from all attendance_records so all counts and percentages are synchronized!
  console.log('Synchronizing student table totals...');
  const students = await allQuery('SELECT uid FROM students');
  for (const st of students) {
    const counts = await getQuery(`
      SELECT 
        COUNT(CASE WHEN session_type = 'Lecture' THEN 1 END) as lec_tot,
        COUNT(CASE WHEN session_type = 'Lecture' AND status = 'Present' THEN 1 END) as lec_pres,
        COUNT(CASE WHEN session_type = 'Lab' THEN 1 END) as lab_tot,
        COUNT(CASE WHEN session_type = 'Lab' AND status = 'Present' THEN 1 END) as lab_pres
      FROM attendance_records
      WHERE student_uid = ?
    `, [st.uid]);

    const lecTot = counts.lec_tot || 0;
    const lecPres = counts.lec_pres || 0;
    const labTot = counts.lab_tot || 0;
    const labPres = counts.lab_pres || 0;
    const totPres = lecPres + labPres;
    const totCond = lecTot + labTot;
    const pct = totCond > 0 ? Number(((totPres / totCond) * 100).toFixed(2)) : 0;
    const weighted = totCond > 0 ? Number((0.30 * ((totPres / totCond) * 182.5)).toFixed(2)) : 0;

    await runQuery(`
      UPDATE students
      SET lecture_present = ?, lecture_total = ?,
          lab_present = ?, lab_total = ?,
          total_classes_present = ?, total_classes_conducted = ?,
          percentage = ?, weighted_percentage = ?
      WHERE uid = ?
    `, [lecPres, lecTot, labPres, labTot, totPres, totCond, pct, weighted, st.uid]);
  }
  console.log('Synchronization complete!');
}

seedRecords().catch(console.error);
