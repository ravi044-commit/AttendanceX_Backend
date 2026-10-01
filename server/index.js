import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  initDatabase,
  getQuery,
  allQuery,
  runQuery,
  calculatePercentage,
  calculateWeightedScore,
  getStudentBatch
} from './database.js';

dotenv.config();

export const getFacultyInCharge = (subjectName) => {
  if (!subjectName) return 'Faculty Member';
  const name = subjectName.toUpperCase();
  if (name.includes('IOT') || name.includes('INTERNET OF THINGS')) return 'C.G.Ajudiya';
  if (name.includes('ST') || name.includes('SOFTWARE TESTING')) return 'J.D.Vadalia';
  if (name.includes('IS') || name.includes('INFORMATION SECURITY')) return 'P.V.Patel';
  if (name.includes('CHSM') || name.includes('HARDWARE')) return 'J.V.Shparia';
  if (name.includes('VIBE') || name.includes('PROJECT')) return 'Shubham';
  return 'Faculty Member';
};

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'attendancex_super_secret_key_2026';
const NODE_ENV = process.env.NODE_ENV || 'production';
const ALLOW_DEMO_PASSWORDS = process.env.ALLOW_DEMO_PASSWORDS === 'true';

// Configurable CORS for network deployment
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, RFID hardware scanner, Postman)
      if (!origin || configuredOrigins === '*' || configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize SQLite DB
initDatabase().catch((err) => {
  console.error('Failed to initialize SQLite database:', err);
});

// Middleware for token auth (optional/bearer)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

/* ==========================================================================
   HEALTH & SYSTEM MONITORING
   ========================================================================== */

// Deployment Health Check (used by Render, Railway, Docker, AWS ECS, Uptime monitors)
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await getQuery('SELECT 1 as alive');
    res.json({
      status: 'healthy',
      service: 'attendancex-backend',
      database: dbCheck?.alive === 1 ? 'connected' : 'unknown',
      environment: NODE_ENV,
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'attendancex-backend',
      database: 'disconnected',
      error: error.message
    });
  }
});

/* ==========================================================================
   AUTH ROUTES
   ========================================================================== */

// Login with Email & Password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let query = 'SELECT * FROM users WHERE LOWER(email) = LOWER(?)';
    const params = [email.trim()];

    // If role is specified, verify matching role
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    const user = await getQuery(query, params);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or credentials for selected role' });
    }

    // Check password securely (bcrypt hash first, legacy plain fallback if any)
    let validPassword = false;
    try {
      validPassword = bcrypt.compareSync(password, user.password);
    } catch {
      validPassword = false;
    }

    if (!validPassword && password === user.password) {
      validPassword = true;
    }

    // Explicit demo fallback password override (disabled by default in network/production)
    if (!validPassword && ALLOW_DEMO_PASSWORDS) {
      const demoPasswords = ['Admin@123', 'Hod@123', 'Faculty@123', 'Student@123'];
      if (demoPasswords.includes(password)) {
        validPassword = true;
      }
    }
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // If user is a student, fetch student record
    let studentData = null;
    if (user.role === 'student') {
      studentData = await getQuery('SELECT * FROM students WHERE uid = ? OR user_id = ?', [user.uid, user.id]);
    }

    const token = jwt.sign(
      { id: user.id, uid: user.uid, role: user.role, email: user.email, name: user.name, department: user.department },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      phone: user.phone,
      avatar: user.avatar,
      studentData
    };

    res.json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Sign Up / Register - PUBLIC SIGNUP DISABLED (Administrator creation from public interface is prohibited)
app.post('/api/auth/register', async (req, res) => {
  return res.status(403).json({
    error: 'Public registration is disabled. Administrator, Faculty, Student, and HOD accounts are institutional and strictly managed via internal Administration.'
  });
});

/* ==========================================================================
   STUDENTS ENDPOINTS
   ========================================================================== */

// Get all students (with optional department filter)
app.get('/api/students', async (req, res) => {
  try {
    const { department, search, status } = req.query;
    let sql = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (department && department !== 'All') {
      sql += ' AND department = ?';
      params.push(department);
    }

    if (status && status !== 'All') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR enrolment_number LIKE ? OR uid LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY name ASC';
    const students = await allQuery(sql, params);

    // Compute updated percentage and formula value
    const formatted = students.map((s) => {
      const total = s.total_classes_conducted || (s.lecture_total + s.lab_total) || 0;
      const present = s.total_classes_present || (s.lecture_present + s.lab_present) || 0;
      const pct = calculatePercentage(present, total);
      const ratio = total > 0 ? present / total : 0;
      const weighted = calculateWeightedScore(ratio);

      return {
        ...s,
        percentage: pct,
        weighted_percentage: weighted
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Helper to compute subject-wise attendance breakdown (Lectures, Labs, and Combined Full Attendance)
export const computeSubjectAttendance = async (studentUid, studentRecord = null) => {
  const subjectsConfig = [
    {
      code: 'DI05000151',
      name: 'Internet of Things',
      short_name: 'IOT',
      keyword: 'IOT',
      faculty: 'C.G.Ajudiya',
      has_lecture: true,
      has_lab: true,
      default_lec_tot: 12,
      default_lec_pres: 12,
      default_lab_tot: 8,
      default_lab_pres: 8
    },
    {
      code: 'DI05007021',
      name: 'Information Security',
      short_name: 'IS',
      keyword: 'IS',
      faculty: 'P.V.Patel',
      has_lecture: true,
      has_lab: true,
      default_lec_tot: 7,
      default_lec_pres: 4,
      default_lab_tot: 5,
      default_lab_pres: 3
    },
    {
      code: 'DI05000111',
      name: 'Software Testing',
      short_name: 'ST',
      keyword: 'ST',
      faculty: 'J.D.Vadalia',
      has_lecture: true,
      has_lab: true,
      default_lec_tot: 8,
      default_lec_pres: 7,
      default_lab_tot: 6,
      default_lab_pres: 5
    },
    {
      code: 'DI05000181',
      name: 'Computer Hardware & Maintenance',
      short_name: 'CHSM',
      keyword: 'CHSM',
      faculty: 'J.V.Shparia',
      has_lecture: true,
      has_lab: true,
      default_lec_tot: 7,
      default_lec_pres: 6,
      default_lab_tot: 5,
      default_lab_pres: 5
    },
    {
      code: 'DI05000121',
      name: 'Project & Practical Innovation Lab',
      short_name: 'Vibe Lab',
      keyword: 'Vibe',
      faculty: 'Shubham',
      has_lecture: false,
      has_lab: true,
      default_lec_tot: 0,
      default_lec_pres: 0,
      default_lab_tot: 6,
      default_lab_pres: 5
    }
  ];

  const records = await allQuery(`
    SELECT subject_name, session_type, status
    FROM attendance_records
    WHERE student_uid = ?
  `, [studentUid]);

  return subjectsConfig.map((cfg) => {
    // Filter records matching this subject
    const subRecords = records.filter((r) => {
      const subName = (r.subject_name || '').toUpperCase();
      if (cfg.keyword === 'IS') {
        // Distinguish IS from CHSM or other words
        return subName.includes('IS -') || subName.includes('IS LAB') || subName.includes('INFORMATION SECURITY');
      }
      return subName.includes(cfg.keyword.toUpperCase());
    });

    let lecTot = subRecords.filter(r => r.session_type === 'Lecture').length;
    let lecPres = subRecords.filter(r => r.session_type === 'Lecture' && r.status === 'Present').length;
    let labTot = subRecords.filter(r => r.session_type === 'Lab').length;
    let labPres = subRecords.filter(r => r.session_type === 'Lab' && r.status === 'Present').length;

    // If no records in database for this subject yet, fall back to curriculum baseline
    if (lecTot === 0 && cfg.has_lecture) {
      lecTot = cfg.default_lec_tot;
      lecPres = cfg.default_lec_pres;
    }
    if (labTot === 0 && cfg.has_lab) {
      labTot = cfg.default_lab_tot;
      labPres = cfg.default_lab_pres;
    }

    const totalConducted = lecTot + labTot;
    const totalPresent = lecPres + labPres;
    const pct = totalConducted > 0 ? Number(((totalPresent / totalConducted) * 100).toFixed(1)) : 0;
    const lecPct = lecTot > 0 ? Number(((lecPres / lecTot) * 100).toFixed(1)) : 0;
    const labPct = labTot > 0 ? Number(((labPres / labTot) * 100).toFixed(1)) : 0;

    let status = 'Eligible';
    let statusTheme = 'emerald';
    if (pct < 50) {
      status = 'Critical Shortage';
      statusTheme = 'rose';
    } else if (pct < 75) {
      status = 'Low Attendance';
      statusTheme = 'amber';
    } else if (pct >= 90) {
      status = 'Excellent';
      statusTheme = 'emerald';
    }

    return {
      code: cfg.code,
      name: cfg.name,
      short_name: cfg.short_name,
      faculty: cfg.faculty,
      has_lecture: cfg.has_lecture,
      has_lab: cfg.has_lab,
      lecture: {
        present: lecPres,
        total: lecTot,
        percentage: lecPct,
        missed: Math.max(0, lecTot - lecPres)
      },
      lab: {
        present: labPres,
        total: labTot,
        percentage: labPct,
        missed: Math.max(0, labTot - labPres)
      },
      total_present: totalPresent,
      total_conducted: totalConducted,
      percentage: pct,
      missed: Math.max(0, totalConducted - totalPresent),
      status,
      statusTheme
    };
  });
};

// Get single student by UID
app.get('/api/students/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const student = await getQuery('SELECT * FROM students WHERE uid = ?', [uid]);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const history = await allQuery(`
      SELECT * FROM attendance_records
      WHERE student_uid = ?
      ORDER BY date DESC, timestamp DESC
      LIMIT 100
    `, [uid]);

    const total = student.total_classes_conducted || (student.lecture_total + student.lab_total) || 0;
    const present = student.total_classes_present || (student.lecture_present + student.lab_present) || 0;
    const percentage = calculatePercentage(present, total);
    const weighted_percentage = calculateWeightedScore(total > 0 ? present / total : 0);

    // Compute subject-wise attendance breakdown
    const subjectAttendance = await computeSubjectAttendance(uid, student);

    res.json({
      ...student,
      percentage,
      weighted_percentage,
      attendance_history: history,
      subject_attendance: subjectAttendance
    });
  } catch (error) {
    console.error('Fetch student error:', error);
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
});

// Dedicated endpoint for subject attendance
app.get('/api/students/:uid/subject-attendance', async (req, res) => {
  try {
    const { uid } = req.params;
    const student = await getQuery('SELECT * FROM students WHERE uid = ?', [uid]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const breakdown = await computeSubjectAttendance(uid, student);
    res.json(breakdown);
  } catch (error) {
    console.error('Subject attendance error:', error);
    res.status(500).json({ error: 'Failed to compute subject attendance' });
  }
});

// Add a new Student
app.post('/api/students', async (req, res) => {
  try {
    const { name, enrolment_number, student_photo, department, status, email, phone, semester, division } = req.body;

    if (!name || !enrolment_number) {
      return res.status(400).json({ error: 'Name and Enrolment Number are required' });
    }

    const dept = department || 'Computer Department';
    const timestamp = Date.now().toString().slice(-4);
    const uid = `STU-COMP-${new Date().getFullYear()}-${timestamp}`;
    const photo = student_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
    const studentEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}.comp@attendancex.edu`;

    // Create user account for student
    const hashedPassword = bcrypt.hashSync('Student@123', 10);
    const userRes = await runQuery(`
      INSERT INTO users (uid, name, email, password, role, department, phone, avatar)
      VALUES (?, ?, ?, ?, 'student', ?, ?, ?)
    `, [uid, name, studentEmail, hashedPassword, dept, phone || '', photo]);

    await runQuery(`
      INSERT INTO students (
        uid, user_id, name, enrolment_number, student_photo, department,
        semester, division, status, total_classes_present, total_classes_conducted,
        percentage, weighted_percentage, lecture_present, lecture_total,
        lab_present, lab_total
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0.0, 0.0, 0, 0, 0, 0)
    `, [uid, userRes.id, name, enrolment_number, photo, dept, semester || 6, division || 'A', status || 'Active']);

    const newStudent = await getQuery('SELECT * FROM students WHERE uid = ?', [uid]);
    res.status(201).json(newStudent);
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// Update student
app.put('/api/students/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, enrolment_number, student_photo, department, status, semester, division } = req.body;

    await runQuery(`
      UPDATE students
      SET name = COALESCE(?, name),
          enrolment_number = COALESCE(?, enrolment_number),
          student_photo = COALESCE(?, student_photo),
          department = COALESCE(?, department),
          status = COALESCE(?, status),
          semester = COALESCE(?, semester),
          division = COALESCE(?, division)
      WHERE uid = ?
    `, [name, enrolment_number, student_photo, department, status, semester, division, uid]);

    // Also update users table name/photo if present
    await runQuery(`
      UPDATE users
      SET name = COALESCE(?, name),
          avatar = COALESCE(?, avatar),
          department = COALESCE(?, department)
      WHERE uid = ?
    `, [name, student_photo, department, uid]);

    const updated = await getQuery('SELECT * FROM students WHERE uid = ?', [uid]);
    res.json(updated);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// Delete student
app.delete('/api/students/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    await runQuery('DELETE FROM attendance_records WHERE student_uid = ?', [uid]);
    await runQuery('DELETE FROM students WHERE uid = ?', [uid]);
    await runQuery('DELETE FROM users WHERE uid = ?', [uid]);
    res.json({ message: 'Student and associated user account removed successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

/* ==========================================================================
   USERS ENDPOINTS (ADMIN MANAGEMENT)
   ========================================================================== */

// Get all users with filtering by role and department
app.get('/api/users', async (req, res) => {
  try {
    const { role, department, search } = req.query;
    let sql = 'SELECT id, uid, name, email, role, department, phone, avatar, created_at FROM users WHERE 1=1';
    const params = [];

    if (role && role !== 'All') {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (department && department !== 'All') {
      sql += ' AND department = ?';
      params.push(department);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR uid LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY id DESC';
    const users = await allQuery(sql, params);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Add new user (Admin action)
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password, role, department, phone, avatar } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const existing = await getQuery('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const timestamp = Date.now().toString().slice(-4);
    const prefix = role.toUpperCase().slice(0, 3);
    const uid = `${prefix}-COMP-${timestamp}`;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const dept = department || 'Computer Department';
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    const result = await runQuery(`
      INSERT INTO users (uid, name, email, password, role, department, phone, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [uid, name, email.trim(), hashedPassword, role, dept, phone || '', defaultAvatar]);

    if (role === 'student') {
      const enroll = `2024COMP${timestamp}`;
      await runQuery(`
        INSERT INTO students (
          uid, user_id, name, enrolment_number, student_photo, department,
          status, total_classes_present, total_classes_conducted,
          percentage, weighted_percentage, lecture_present, lecture_total,
          lab_present, lab_total
        )
        VALUES (?, ?, ?, ?, ?, ?, 'Active', 0, 0, 0.0, 0.0, 0, 0, 0, 0)
      `, [uid, result.id, name, enroll, defaultAvatar, dept]);
    }

    const created = await getQuery('SELECT id, uid, name, email, role, department, phone, avatar, created_at FROM users WHERE id = ?', [result.id]);
    res.status(201).json(created);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Delete user by ID
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getQuery('SELECT uid, role FROM users WHERE id = ?', [id]);

    if (user) {
      if (user.role === 'student') {
        await runQuery('DELETE FROM attendance_records WHERE student_uid = ?', [user.uid]);
        await runQuery('DELETE FROM students WHERE uid = ?', [user.uid]);
      }
      await runQuery('DELETE FROM users WHERE id = ?', [id]);
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/* ==========================================================================
   ATTENDANCE & CLASSES ENDPOINTS
   ========================================================================== */

// Get all classes
app.get('/api/classes', async (req, res) => {
  try {
    const { department, faculty_email } = req.query;
    let sql = 'SELECT * FROM classes WHERE 1=1';
    const params = [];

    if (department) {
      sql += ' AND department = ?';
      params.push(department);
    }
    if (faculty_email) {
      sql += ' AND LOWER(faculty_email) = LOWER(?)';
      params.push(faculty_email);
    }

    const classes = await allQuery(sql, params);
    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Mark Attendance (Faculty Action for Lecture or Lab)
app.post('/api/attendance/mark', async (req, res) => {
  try {
    const {
      class_id,
      subject_name,
      session_type, // 'Lecture' or 'Lab'
      date,
      marked_by,
      department = 'Computer Department',
      records // Array of { student_uid, student_name, enrolment_number, status }
    } = req.body;

    if (!subject_name || !session_type || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Missing required attendance payload' });
    }

    // 1. STRICT FREEZE CHECK: If HOD finalized this date, block all modifications (faculty & admin)
    const lock = await getQuery(
      'SELECT * FROM attendance_locks WHERE date = ? AND department = ?',
      [date, department]
    );
    if (lock && lock.is_frozen === 1) {
      return res.status(403).json({
        error: `Attendance for date ${date} has been FINALIZED and FROZEN by HOD (${lock.finalized_by || 'C.G.Ajudiya'}). Neither faculty nor administrator can modify or create sessions for this date.`
      });
    }

    // 2. SINGLE VALID SESSION PER DATE: If previous records exist for this session on this date, replace cleanly
    const existingRecords = await allQuery(`
      SELECT * FROM attendance_records
      WHERE date = ? AND subject_name = ? AND session_type = ? AND department = ?
    `, [date, subject_name, session_type, department]);

    if (existingRecords && existingRecords.length > 0) {
      // Revert student totals before inserting updated session
      for (const prev of existingRecords) {
        const student = await getQuery('SELECT * FROM students WHERE uid = ?', [prev.student_uid]);
        if (student) {
          let lecPres = student.lecture_present || 0;
          let lecTot = student.lecture_total || 0;
          let labPres = student.lab_present || 0;
          let labTot = student.lab_total || 0;

          if (prev.session_type === 'Lecture') {
            lecTot = Math.max(0, lecTot - 1);
            if (prev.status === 'Present') lecPres = Math.max(0, lecPres - 1);
          } else {
            labTot = Math.max(0, labTot - 1);
            if (prev.status === 'Present') labPres = Math.max(0, labPres - 1);
          }

          await runQuery(`
            UPDATE students
            SET lecture_present = ?, lecture_total = ?,
                lab_present = ?, lab_total = ?
            WHERE uid = ?
          `, [lecPres, lecTot, labPres, labTot, prev.student_uid]);
        }
      }

      await runQuery(`
        DELETE FROM attendance_records
        WHERE date = ? AND subject_name = ? AND session_type = ? AND department = ?
      `, [date, subject_name, session_type, department]);
    }

    let presentCount = 0;
    let absentCount = 0;

    for (const item of records) {
      const isPresent = item.status === 'Present';
      if (isPresent) presentCount++;
      else absentCount++;

      // Insert record
      await runQuery(`
        INSERT INTO attendance_records (
          class_id, student_uid, student_name, enrolment_number,
          department, date, session_type, subject_name, status, marked_by, is_frozen
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        class_id || 1,
        item.student_uid,
        item.student_name,
        item.enrolment_number,
        department,
        date,
        session_type,
        subject_name,
        item.status,
        marked_by || 'Faculty Member'
      ]);

      // Update student table counts
      const student = await getQuery('SELECT * FROM students WHERE uid = ?', [item.student_uid]);
      if (student) {
        let lecPres = student.lecture_present || 0;
        let lecTot = student.lecture_total || 0;
        let labPres = student.lab_present || 0;
        let labTot = student.lab_total || 0;

        if (session_type === 'Lecture') {
          lecTot += 1;
          if (isPresent) lecPres += 1;
        } else {
          labTot += 1;
          if (isPresent) labPres += 1;
        }

        const totalPres = lecPres + labPres;
        const totalTot = lecTot + labTot;
        const pct = calculatePercentage(totalPres, totalTot);
        const weightedPct = calculateWeightedScore(totalTot > 0 ? totalPres / totalTot : 0);

        await runQuery(`
          UPDATE students
          SET lecture_present = ?, lecture_total = ?,
              lab_present = ?, lab_total = ?,
              total_classes_present = ?, total_classes_conducted = ?,
              percentage = ?, weighted_percentage = ?
          WHERE uid = ?
        `, [lecPres, lecTot, labPres, labTot, totalPres, totalTot, pct, weightedPct, item.student_uid]);
      }
    }

    // Ensure date is registered in attendance_locks as Open if not present
    await runQuery(`
      INSERT OR IGNORE INTO attendance_locks (date, department, status, is_frozen)
      VALUES (?, ?, 'Open', 0)
    `, [date, department]);

    res.json({
      message: `Attendance marked successfully for ${records.length} students (1 official session saved for ${date})`,
      summary: {
        total: records.length,
        present: presentCount,
        absent: absentCount,
        session_type,
        subject_name,
        date
      }
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Update single student attendance record (Faculty or Admin override action)
app.post('/api/attendance/update-single', async (req, res) => {
  try {
    const { record_id, student_uid, date, subject_name, session_type, status, marked_by } = req.body;

    if (!status || (!record_id && (!student_uid || !date || !subject_name || !session_type))) {
      return res.status(400).json({ error: 'Missing parameters for attendance record update' });
    }

    let record = null;
    if (record_id) {
      record = await getQuery('SELECT * FROM attendance_records WHERE id = ?', [record_id]);
    } else {
      record = await getQuery(`
        SELECT * FROM attendance_records 
        WHERE student_uid = ? AND date = ? AND subject_name = ? AND session_type = ?
      `, [student_uid, date, subject_name, session_type]);
    }

    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const department = record.department || 'Computer Department';

    // 1. Check date freeze lock status
    const lock = await getQuery(
      'SELECT * FROM attendance_locks WHERE date = ? AND department = ?',
      [record.date, department]
    );

    if (lock && lock.is_frozen === 1) {
      return res.status(403).json({
        error: `Attendance for date ${record.date} has been FINALIZED and FROZEN by HOD (${lock.finalized_by || 'C.G.Ajudiya'}). Status cannot be changed.`
      });
    }

    const oldStatus = record.status;
    const newStatus = status; // 'Present' or 'Absent'

    if (oldStatus === newStatus) {
      return res.json({ message: 'No status change required', record });
    }

    const editorName = marked_by || 'Faculty Member';

    // Update SQLite database record
    await runQuery(`
      UPDATE attendance_records
      SET status = ?, marked_by = ?, timestamp = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newStatus, editorName, record.id]);

    // Recalculate student statistics
    const student = await getQuery('SELECT * FROM students WHERE uid = ?', [record.student_uid]);
    if (student) {
      let lecPres = student.lecture_present || 0;
      let lecTot = student.lecture_total || 0;
      let labPres = student.lab_present || 0;
      let labTot = student.lab_total || 0;

      const isLecture = record.session_type === 'Lecture';

      if (isLecture) {
        if (oldStatus === 'Absent' && newStatus === 'Present') {
          lecPres += 1;
        } else if (oldStatus === 'Present' && newStatus === 'Absent') {
          lecPres = Math.max(0, lecPres - 1);
        }
      } else {
        if (oldStatus === 'Absent' && newStatus === 'Present') {
          labPres += 1;
        } else if (oldStatus === 'Present' && newStatus === 'Absent') {
          labPres = Math.max(0, labPres - 1);
        }
      }

      const totalPres = lecPres + labPres;
      const totalTot = lecTot + labTot;
      const pct = calculatePercentage(totalPres, totalTot);
      const weightedPct = calculateWeightedScore(totalTot > 0 ? totalPres / totalTot : 0);

      await runQuery(`
        UPDATE students
        SET lecture_present = ?, lecture_total = ?,
            lab_present = ?, lab_total = ?,
            total_classes_present = ?, total_classes_conducted = ?,
            percentage = ?, weighted_percentage = ?
        WHERE uid = ?
      `, [lecPres, lecTot, labPres, labTot, totalPres, totalTot, pct, weightedPct, record.student_uid]);
    }

    const updatedRecord = await getQuery('SELECT * FROM attendance_records WHERE id = ?', [record.id]);
    const facultyInCharge = getFacultyInCharge(updatedRecord.subject_name);
    const batch = getStudentBatch(updatedRecord.student_uid, updatedRecord.enrolment_number);

    res.json({
      message: `Successfully changed ${record.student_name}'s status to ${newStatus}`,
      record: {
        ...updatedRecord,
        faculty_in_charge: facultyInCharge,
        batch
      }
    });
  } catch (error) {
    console.error('Update single attendance error:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
});

/* ==========================================================================
   RFID + FACE ATTENDANCE (called by the laptop face-verification server)
   Marks ONE student present for a class today. Protected by RFID_API_KEY (.env).
   ========================================================================== */

// Today's date as YYYY-MM-DD in the server's local time (avoids UTC date shifts)
const localDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Constant-time check of "Authorization: Bearer <RFID_API_KEY>"
const rfidKeyOk = (req) => {
  const expected = process.env.RFID_API_KEY;
  if (!expected) return false;
  const auth = req.headers['authorization'] || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

app.post('/api/attendance/rfid-mark', async (req, res) => {
  try {
    if (!process.env.RFID_API_KEY) {
      return res.status(503).json({ error: 'RFID_API_KEY is not set on the server (.env)' });
    }
    if (!rfidKeyOk(req)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { student_uid, class_id } = req.body || {};
    if (!student_uid || !class_id) {
      return res.status(400).json({ error: 'student_uid and class_id are required' });
    }

    const cls = await getQuery('SELECT * FROM classes WHERE id = ?', [class_id]);
    if (!cls) {
      return res.status(404).json({ error: `Class ${class_id} not found` });
    }

    const student = await getQuery('SELECT * FROM students WHERE uid = ?', [student_uid]);
    if (!student) {
      return res.status(404).json({ error: `Student ${student_uid} not found` });
    }

    const date = localDateString();
    const department = cls.department || 'Computer Department';
    const session_type = cls.type;            // 'Lecture' or 'Lab'
    const subject_name = cls.subject_name;
    const markedBy = 'RFID + Face System';

    // Respect the HOD freeze: a finalized date cannot be changed
    const lock = await getQuery(
      'SELECT * FROM attendance_locks WHERE date = ? AND department = ?',
      [date, department]
    );
    if (lock && lock.is_frozen === 1) {
      return res.status(403).json({ error: `Attendance for ${date} is FINALIZED and FROZEN by HOD.` });
    }

    const existing = await getQuery(`
      SELECT * FROM attendance_records
      WHERE student_uid = ? AND date = ? AND subject_name = ? AND session_type = ? AND department = ?
    `, [student_uid, date, subject_name, session_type, department]);

    if (existing && existing.status === 'Present') {
      return res.status(409).json({
        error: 'Already marked present',
        student_uid, date, subject_name, session_type
      });
    }

    let lecPres = student.lecture_present || 0;
    let lecTot = student.lecture_total || 0;
    let labPres = student.lab_present || 0;
    let labTot = student.lab_total || 0;
    const isLecture = session_type === 'Lecture';

    if (existing) {
      // Was Absent in this session -> now Present (session total does not change)
      await runQuery(`
        UPDATE attendance_records
        SET status = 'Present', marked_by = ?, timestamp = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [markedBy, existing.id]);
    } else {
      await runQuery(`
        INSERT INTO attendance_records (
          class_id, student_uid, student_name, enrolment_number,
          department, date, session_type, subject_name, status, marked_by, is_frozen
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Present', ?, 0)
      `, [
        cls.id, student.uid, student.name, student.enrolment_number,
        department, date, session_type, subject_name, markedBy
      ]);
      if (isLecture) lecTot += 1; else labTot += 1;
    }
    if (isLecture) lecPres += 1; else labPres += 1;

    const totalPres = lecPres + labPres;
    const totalTot = lecTot + labTot;
    const pct = calculatePercentage(totalPres, totalTot);
    const weightedPct = calculateWeightedScore(totalTot > 0 ? totalPres / totalTot : 0);

    await runQuery(`
      UPDATE students
      SET lecture_present = ?, lecture_total = ?,
          lab_present = ?, lab_total = ?,
          total_classes_present = ?, total_classes_conducted = ?,
          percentage = ?, weighted_percentage = ?
      WHERE uid = ?
    `, [lecPres, lecTot, labPres, labTot, totalPres, totalTot, pct, weightedPct, student.uid]);

    await runQuery(`
      INSERT OR IGNORE INTO attendance_locks (date, department, status, is_frozen)
      VALUES (?, ?, 'Open', 0)
    `, [date, department]);

    res.json({
      message: `${student.name} marked Present`,
      student_uid: student.uid,
      name: student.name,
      status: 'Present',
      subject_name,
      session_type,
      date,
      percentage: pct
    });
  } catch (error) {
    console.error('RFID mark attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Helper to reliably compute next calendar date (YYYY-MM-DD) avoiding UTC shifts
const computeNextDay = (dateString) => {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  const nextY = next.getFullYear();
  const nextM = String(next.getMonth() + 1).padStart(2, '0');
  const nextD = String(next.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
};

// Freeze Attendance (HOD Action: locks date permanently & auto-creates next morning session)
app.post('/api/attendance/freeze', async (req, res) => {
  try {
    const { date, department = 'Computer Department', finalized_by = 'HOD C.G.Ajudiya' } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required to finalize and freeze attendance' });
    }

    // Check existing records on this date
    const recordCount = await getQuery(
      'SELECT COUNT(*) as count FROM attendance_records WHERE date = ? AND department = ?',
      [date, department]
    );

    // Calculate next morning session date (date + 1 day)
    const nextSessionDate = computeNextDay(date);

    // Mark or insert attendance_locks as frozen
    await runQuery(`
      INSERT INTO attendance_locks (date, department, status, is_frozen, finalized_by, finalized_at, next_session_date)
      VALUES (?, ?, 'Finalized', 1, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(date, department) DO UPDATE SET
        status = 'Finalized',
        is_frozen = 1,
        finalized_by = excluded.finalized_by,
        finalized_at = CURRENT_TIMESTAMP,
        next_session_date = excluded.next_session_date
    `, [date, department, finalized_by, nextSessionDate]);

    // Mark all existing attendance records for that date as frozen
    await runQuery(`
      UPDATE attendance_records
      SET is_frozen = 1
      WHERE date = ? AND department = ?
    `, [date, department]);

    // Automatically create next morning's session as Open
    await runQuery(`
      INSERT OR IGNORE INTO attendance_locks (date, department, status, is_frozen)
      VALUES (?, ?, 'Open', 0)
    `, [nextSessionDate, department]);

    res.json({
      message: `Attendance for ${date} successfully finalized and frozen. No changes can be made by faculty or admin. Next session scheduled for ${nextSessionDate} morning.`,
      date,
      is_frozen: 1,
      status: 'Finalized',
      finalized_by,
      finalized_at: new Date().toISOString(),
      next_session_date: nextSessionDate,
      total_records_frozen: recordCount ? recordCount.count : 0
    });
  } catch (error) {
    console.error('Freeze attendance error:', error);
    res.status(500).json({ error: 'Failed to freeze attendance session' });
  }
});

// Get Lock Status for a specific date
app.get('/api/attendance/lock-status', async (req, res) => {
  try {
    const { date, department = 'Computer Department' } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date query param is required' });
    }

    const lock = await getQuery(
      'SELECT * FROM attendance_locks WHERE date = ? AND department = ?',
      [date, department]
    );

    // Also compute count of present / absent records on this date
    const summary = await getQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_count
      FROM attendance_records
      WHERE date = ? AND department = ?
    `, [date, department]);

    // Calculate default next date if not set
    const calculatedNext = computeNextDay(date);

    if (!lock) {
      return res.json({
        date,
        department,
        status: 'Open',
        is_frozen: false,
        finalized_by: null,
        finalized_at: null,
        next_session_date: calculatedNext,
        summary: summary || { total_records: 0, present_count: 0, absent_count: 0 }
      });
    }

    res.json({
      ...lock,
      is_frozen: lock.is_frozen === 1,
      next_session_date: lock.next_session_date || calculatedNext,
      summary: summary || { total_records: 0, present_count: 0, absent_count: 0 }
    });
  } catch (error) {
    console.error('Lock status error:', error);
    res.status(500).json({ error: 'Failed to fetch lock status' });
  }
});

// Get All Attendance Locks
app.get('/api/attendance/all-locks', async (req, res) => {
  try {
    const { department = 'Computer Department' } = req.query;
    const locks = await allQuery(
      'SELECT * FROM attendance_locks WHERE department = ? ORDER BY date DESC',
      [department]
    );
    res.json(locks);
  } catch (error) {
    console.error('All locks error:', error);
    res.status(500).json({ error: 'Failed to retrieve attendance locks' });
  }
});

// Overall Department & Attendance Summary
app.get('/api/attendance/summary', async (req, res) => {
  try {
    const { department = 'Computer Department' } = req.query;

    const students = await allQuery('SELECT * FROM students WHERE department = ?', [department]);
    const totalStudents = students.length;

    let sumPercentages = 0;
    let totalLecPresent = 0;
    let totalLecConducted = 0;
    let totalLabPresent = 0;
    let totalLabConducted = 0;
    let lowAttendanceCount = 0;

    students.forEach((s) => {
      const total = (s.lecture_total + s.lab_total) || 1;
      const present = (s.lecture_present + s.lab_present) || 0;
      const pct = (present / total) * 100;
      sumPercentages += pct;
      if (pct < 75) lowAttendanceCount++;

      totalLecPresent += s.lecture_present || 0;
      totalLecConducted += s.lecture_total || 0;
      totalLabPresent += s.lab_present || 0;
      totalLabConducted += s.lab_total || 0;
    });

    const avgAttendance = totalStudents > 0 ? Number((sumPercentages / totalStudents).toFixed(2)) : 0;
    const lectureAvg = totalLecConducted > 0 ? Number(((totalLecPresent / totalLecConducted) * 100).toFixed(2)) : 0;
    const labAvg = totalLabConducted > 0 ? Number(((totalLabPresent / totalLabConducted) * 100).toFixed(2)) : 0;

    // Faculty count
    const facultyCount = await getQuery("SELECT COUNT(*) as count FROM users WHERE role = 'faculty' AND department = ?", [department]);

    // Recent records
    const recentRecords = await allQuery(`
      SELECT * FROM attendance_records
      WHERE department = ?
      ORDER BY date DESC, timestamp DESC
      LIMIT 10
    `, [department]);

    res.json({
      department,
      totalStudents,
      totalFaculty: facultyCount ? facultyCount.count : 0,
      avgAttendance,
      lectureAvg,
      labAvg,
      lowAttendanceCount,
      totalLecturesConducted: totalLecConducted,
      totalLabsConducted: totalLabConducted,
      formulaMetric: {
        name: '30% Present Weighted Score (x 182.5)',
        description: 'Semester weight count based on (30% * Present Ratio * 182.5)'
      },
      recentRecords
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to compute department summary' });
  }
});

// Get Distinct Past Attendance Sessions
app.get('/api/attendance/sessions-list', async (req, res) => {
  try {
    const { department = 'Computer Department' } = req.query;
    const sessions = await allQuery(`
      SELECT 
        date, 
        subject_name, 
        session_type, 
        marked_by,
        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_count,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_count,
        COUNT(*) as total_students,
        MAX(timestamp) as last_marked
      FROM attendance_records
      WHERE department = ?
      GROUP BY date, subject_name, session_type, marked_by
      ORDER BY date DESC, last_marked DESC
    `, [department]);

    const enriched = sessions.map((s) => ({
      ...s,
      faculty_in_charge: getFacultyInCharge(s.subject_name)
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Sessions list error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance sessions' });
  }
});

// Get Specific Attendance Records by Date & Subject
app.get('/api/attendance/records', async (req, res) => {
  try {
    const { date, subject_name, session_type, department = 'Computer Department' } = req.query;
    let sql = 'SELECT * FROM attendance_records WHERE department = ?';
    const params = [department];

    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }
    if (subject_name) {
      sql += ' AND subject_name = ?';
      params.push(subject_name);
    }
    if (session_type) {
      sql += ' AND session_type = ?';
      params.push(session_type);
    }

    sql += ' ORDER BY enrolment_number ASC';
    const records = await allQuery(sql, params);

    const enriched = records.map((r) => ({
      ...r,
      batch: getStudentBatch(r.student_uid, r.enrolment_number),
      faculty_in_charge: getFacultyInCharge(r.subject_name)
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Attendance records error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// HOD & Department Overview Stats
app.get('/api/department/stats', async (req, res) => {
  try {
    const department = req.query.department || 'Computer Department';

    const students = await allQuery('SELECT * FROM students WHERE department = ? ORDER BY percentage ASC', [department]);
    const faculties = await allQuery("SELECT id, name, email, phone, avatar FROM users WHERE role = 'faculty' AND department = ?", [department]);
    const classes = await allQuery('SELECT * FROM classes WHERE department = ?', [department]);

    const lowAttendanceList = students.filter(s => s.percentage < 75);
    const criticalList = students.filter(s => s.percentage < 50);

    const totalStudents = students.length;
    const avgPercentage = totalStudents > 0
      ? (students.reduce((acc, s) => acc + s.percentage, 0) / totalStudents).toFixed(2)
      : 0;

    res.json({
      department,
      stats: {
        totalStudents,
        totalFaculty: faculties.length,
        totalClasses: classes.length,
        avgAttendancePercentage: Number(avgPercentage),
        lowAttendanceCount: lowAttendanceList.length,
        criticalAttendanceCount: criticalList.length
      },
      faculties,
      classes,
      lowAttendanceStudents: lowAttendanceList,
      allStudents: students
    });
  } catch (error) {
    console.error('Department stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve department stats' });
  }
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`AttendanceX Server running on http://localhost:${PORT}`);
  console.log(`Connected to SQLite Database: attendancex.db`);
  console.log(`=========================================`);
});
