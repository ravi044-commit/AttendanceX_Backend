import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'attendancex.db');

const db = new sqlite3.Database(dbPath);

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

async function updateTimetableAndResetAttendance() {
  console.log('Starting timetable and attendance reset...');

  // 1. Clear old attendance records
  await runQuery(`DELETE FROM attendance_records`);
  console.log('Old attendance records deleted.');

  // 2. Clear old classes table
  await runQuery(`DELETE FROM classes`);
  console.log('Old classes table cleared.');

  // 3. New Classes list based on 5th Semester Timetable (wef 05.08.26)
  const newClasses = [
    {
      code: 'Introduction to Internet of Things(DI05000151)',
      name: 'IOT - Internet of Things (Lecture)',
      type: 'Lecture',
      faculty: 'C.G.Ajudiya',
      email: 'hod.cg.ajudiya@attendancex.edu',
      room: 'Room-209',
      time: 'Mon 12:30-1:30 | Thu 10:30-11:30'
    },
    {
      code: 'Introduction to Internet of Things(DI05000151)',
      name: 'IOT Lab - Internet of Things Laboratory',
      type: 'Lab',
      faculty: 'C.G.Ajudiya',
      email: 'hod.cg.ajudiya@attendancex.edu',
      room: 'Lab-201B / Lab-203',
      time: 'Mon 2:00-4:00 (B) | Wed 11:30-1:30 (A)'
    },
    {
      code: 'Software Testing(DI05000111)',
      name: 'ST - Software Testing (Lecture)',
      type: 'Lecture',
      faculty: 'J.D.Vadalia',
      email: 'faculty.jd.vadalia@attendancex.edu',
      room: 'Room-209',
      time: 'Mon 11:30-12:30 | Wed 3:00-4:00 | Fri 12:30-1:30'
    },
    {
      code: 'Software Testing(DI05000111)',
      name: 'ST Lab - Software Testing Laboratory',
      type: 'Lab',
      faculty: 'J.D.Vadalia',
      email: 'faculty.jd.vadalia@attendancex.edu',
      room: 'Lab-203',
      time: 'Tue 11:30-1:30 (A) | Wed 11:30-1:30 (B)'
    },
    {
      code: 'Information Security(DI05007021)',
      name: 'IS - Information Security (Lecture)',
      type: 'Lecture',
      faculty: 'P.V.Patel',
      email: 'faculty.pv.patel@attendancex.edu',
      room: 'Room-209',
      time: 'Tue 3:00-4:00 | Wed 2:00-3:00 | Thu 12:30-1:30'
    },
    {
      code: 'Information Security(DI05007021)',
      name: 'IS Lab - Information Security Laboratory',
      type: 'Lab',
      faculty: 'P.V.Patel',
      email: 'faculty.pv.patel@attendancex.edu',
      room: 'Lab-115',
      time: 'Tue 11:30-1:30 (B) | Thu 2:00-4:00 (A)'
    },
    {
      code: 'Computer Hardware Architecture and System Maintenance(DI05000181)',
      name: 'CHSM - Computer Hardware Architecture and System Maintenance(Lecture)',
      type: 'Lecture',
      faculty: 'J.V.Shparia',
      email: 'faculty.jv.shparia@attendancex.edu',
      room: 'Room-209',
      time: 'Tue 2:00-3:00 | Thu 11:30-12:30 | Fri 11:30-12:30'
    },
    {
      code: 'Computer Hardware Architecture and System Maintenance(DI05000181)',
      name: 'CHSM Lab - Computer Hardware Architecture and System Maintenance Lab',
      type: 'Lab',
      faculty: 'J.V.Shparia',
      email: 'faculty.jv.shparia@attendancex.edu',
      room: 'Lab-114',
      time: 'Mon 2:00-4:00 (A) | Thu 2:00-4:00 (B)'
    },
    {
      code: ' Application Design & Development using Vibe Coding 	DI05000121',
      name: 'Vibe Lab - Project & Practical Innovation Lab',
      type: 'Lab',
      faculty: 'Shubham',
      email: 'faculty.shubham@attendancex.edu',
      room: 'Computer Center / Lab-114',
      time: 'Fri 2:00-4:00 (Batches A & B)'
    }
  ];

  for (const c of newClasses) {
    await runQuery(`
      INSERT INTO classes (subject_code, subject_name, department, faculty_name, faculty_email, type, semester, room, time_slot)
      VALUES (?, ?, 'Computer Department', ?, ?, ?, 5, ?, ?)
    `, [c.code, c.name, c.faculty, c.email, c.type, c.room, c.time]);
  }
  console.log(`Inserted ${newClasses.length} new 5th Semester classes into database.`);

  // 4. Update all 99 students semester to 5, and reset initial attendance counters
  await runQuery(`
    UPDATE students
    SET semester = 5,
        total_classes_present = 0,
        total_classes_conducted = 0,
        percentage = 0.0,
        weighted_percentage = 0.0,
        lecture_present = 0,
        lecture_total = 0,
        lab_present = 0,
        lab_total = 0
  `);
  console.log('Reset all student attendance counters to 0 for Semester 5.');

  // 5. Update department stats
  await runQuery(`
    UPDATE departments
    SET avg_attendance = 0.0
    WHERE name = 'Computer Department'
  `);

  console.log('Timetable update and attendance reset completed successfully!');
  db.close();
}

updateTimetableAndResetAttendance().catch((err) => {
  console.error('Error updating timetable:', err);
  db.close();
});
