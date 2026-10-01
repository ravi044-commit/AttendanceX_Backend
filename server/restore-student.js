import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'attendancex.db');

const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function restoreStudent() {
  console.log('Restoring missing student: SHIR DHRUV RAMESHBHAI (246250307100)...');

  const uid = 'STU-COMP-081';
  const enrolment = '246250307100';
  const name = 'SHIR DHRUV RAMESHBHAI';
  const email = `${enrolment}@attendancex.edu`;
  const hashedPassword = bcrypt.hashSync(enrolment, 10);
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  // 1. Create User
  const userRes = await run(`
    INSERT INTO users (uid, name, email, password, role, department, phone, avatar)
    VALUES (?, ?, ?, ?, 'student', 'Computer Department', '', ?)
  `, [uid, name, email, hashedPassword, avatar]);

  console.log(`User created with ID: ${userRes.id}`);

  // 2. Create Student
  const lecTotal = 31;
  const labTotal = 20;
  const totalClasses = 51;
  const lecPres = 29;
  const labPres = 19;
  const totalPres = lecPres + labPres; // 48
  const percentage = Number(((totalPres / totalClasses) * 100).toFixed(2)); // 94.12
  const weightedScore = Number((0.30 * (totalPres / totalClasses * 182.5)).toFixed(2)); // 51.53

  await run(`
    INSERT INTO students (
      uid, user_id, name, enrolment_number, student_photo, department,
      semester, division, status, total_classes_present, total_classes_conducted,
      percentage, weighted_percentage, lecture_present, lecture_total,
      lab_present, lab_total
    )
    VALUES (?, ?, ?, ?, ?, 'Computer Department', 6, 'A', 'Active', ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    uid, userRes.id, name, enrolment, avatar,
    totalPres, totalClasses, percentage, weightedScore,
    lecPres, lecTotal, labPres, labTotal
  ]);

  console.log('Student record inserted.');

  // 3. Clone session records from a peer student (STU-COMP-080)
  const peerRecords = await all(`
    SELECT class_id, subject_code, subject_name, faculty_name, session_type, date, time_slot, status, timestamp
    FROM attendance_records
    WHERE student_uid = 'STU-COMP-080'
  `);

  if (peerRecords.length > 0) {
    for (const rec of peerRecords) {
      await run(`
        INSERT INTO attendance_records (
          student_uid, student_name, class_id, subject_code, subject_name,
          faculty_name, session_type, date, time_slot, status, timestamp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uid, name, rec.class_id, rec.subject_code, rec.subject_name,
        rec.faculty_name, rec.session_type, rec.date, rec.time_slot, rec.status, rec.timestamp
      ]);
    }
    console.log(`Cloned ${peerRecords.length} session attendance history records for student.`);
  }

  // 4. Update department total_students
  await run(`
    UPDATE departments
    SET total_students = (SELECT COUNT(*) FROM students WHERE department = 'Computer Department')
    WHERE name = 'Computer Department'
  `);

  console.log('Department count updated.');

  // 5. Verify total students in DB
  const totalStudents = await all(`SELECT COUNT(*) as count FROM students`);
  const totalUsers = await all(`SELECT COUNT(*) as count FROM users WHERE role = 'student'`);
  console.log(`Total students now in database: ${totalStudents[0].count}`);
  console.log(`Total student users now in database: ${totalUsers[0].count}`);

  db.close();
}

restoreStudent().catch((err) => {
  console.error('Error restoring student:', err);
  db.close();
});
