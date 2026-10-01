import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { rawStudentList } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'attendancex.db');

const db = new sqlite3.Database(dbPath);

db.all('SELECT * FROM students', (err, dbStudents) => {
  if (err) return console.error(err);

  const dbEnrollments = new Set(dbStudents.map(s => s.enrolment_number));
  const missing = rawStudentList.filter(s => !dbEnrollments.has(s.enrollment_number));

  console.log('Total in raw list:', rawStudentList.length);
  console.log('Total in database:', dbStudents.length);
  console.log('Missing students count:', missing.length);
  console.log('Missing student details:', JSON.stringify(missing, null, 2));

  db.all('SELECT COUNT(*) as cnt FROM attendance_records WHERE student_uid = "STU-COMP-081"', (err3, aRows) => {
    console.log('Attendance records count for STU-COMP-081:', aRows);
    db.close();
  });
});
