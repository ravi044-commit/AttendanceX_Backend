import { runQuery, getQuery } from './database.js';

async function updateStudent1() {
  const uid = 'STU-COMP-001';
  // Delete existing IS records for student 1
  await runQuery(`DELETE FROM attendance_records WHERE student_uid = ? AND (subject_name LIKE '%Information Security%' OR subject_name LIKE '%IS %')`, [uid]);

  // 7 lectures in IS: 4 Present, 3 Absent -> 57.1%
  const lecDates = ['2026-08-15', '2026-08-18', '2026-08-20', '2026-08-22', '2026-08-24', '2026-08-27', '2026-08-29'];
  const lecStatuses = ['Present', 'Present', 'Absent', 'Present', 'Absent', 'Present', 'Absent'];
  for (let i = 0; i < lecDates.length; i++) {
    await runQuery(`
      INSERT INTO attendance_records (class_id, student_uid, student_name, enrolment_number, department, date, session_type, subject_name, status, marked_by, is_frozen)
      VALUES (5, ?, 'AMBALIYA JAY RAMSHIBHAI', '246250307001', 'Computer Department', ?, 'Lecture', 'IS - Information Security (Lecture)', ?, 'P.V.Patel', 1)
    `, [uid, lecDates[i], lecStatuses[i]]);
  }

  // 5 labs in IS: 3 Present, 2 Absent -> 60.0%
  // Combined full attendance in IS: (4 + 3) / (7 + 5) = 7 / 12 = 58.3%!
  const labDates = ['2026-08-16', '2026-08-19', '2026-08-23', '2026-08-26', '2026-09-12'];
  const labStatuses = ['Present', 'Absent', 'Present', 'Absent', 'Present'];
  for (let i = 0; i < labDates.length; i++) {
    await runQuery(`
      INSERT INTO attendance_records (class_id, student_uid, student_name, enrolment_number, department, date, session_type, subject_name, status, marked_by, is_frozen)
      VALUES (6, ?, 'AMBALIYA JAY RAMSHIBHAI', '246250307001', 'Computer Department', ?, 'Lab', 'IS Lab - Information Security Laboratory', ?, 'P.V.Patel', 1)
    `, [uid, labDates[i], labStatuses[i]]);
  }

  // For IOT: Ensure 99% / 100% attendance (all Present)
  await runQuery(`UPDATE attendance_records SET status = 'Present' WHERE student_uid = ? AND subject_name LIKE '%IOT%'`, [uid]);

  // Recalculate student table totals for STU-COMP-001
  const counts = await getQuery(`
    SELECT 
      COUNT(CASE WHEN session_type = 'Lecture' THEN 1 END) as lec_tot,
      COUNT(CASE WHEN session_type = 'Lecture' AND status = 'Present' THEN 1 END) as lec_pres,
      COUNT(CASE WHEN session_type = 'Lab' THEN 1 END) as lab_tot,
      COUNT(CASE WHEN session_type = 'Lab' AND status = 'Present' THEN 1 END) as lab_pres
    FROM attendance_records
    WHERE student_uid = ?
  `, [uid]);

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
  `, [lecPres, lecTot, labPres, labTot, totPres, totCond, pct, weighted, uid]);

  console.log(`Updated STU-COMP-001: Total ${totPres}/${totCond} (${pct}%). IS has 7/12 (58.3%), IOT has 100%!`);
}

updateStudent1().catch(console.error);
