import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new sqlite3.Database(path.resolve(__dirname, 'attendancex.db'));

db.all('SELECT COUNT(*) as count, department FROM students GROUP BY department', (err, rows) => {
  console.log('Students in DB:', rows);
});

db.all('SELECT * FROM classes', (err, rows) => {
  console.log('Classes in DB:', rows);
});

db.all('SELECT COUNT(*) as count, role, department FROM users GROUP BY role, department', (err, rows) => {
  console.log('Users in DB:', rows);
});
