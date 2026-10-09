import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'attendancex.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database: attendancex.db');
  }
});

export const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const calculatePercentage = (present, total) => {
  if (!total || total === 0) return 0;
  return Number(((present / total) * 100).toFixed(2));
};

export const calculateWeightedScore = (presentRatio) => {
  return Number((0.30 * (presentRatio * 182.5)).toFixed(2));
};

export const rawStudentList = [
  { "uid": 1, "enrollment_number": "246250307001", "name": "AMBALIYA JAY RAMSHIBHAI", "status": "Present" },
  { "uid": 2, "enrollment_number": "246250307002", "name": "ANSARI AHMADRAZA SAHIDRAJAK", "status": "Present" },
  { "uid": 3, "enrollment_number": "246250307003", "name": "BARAD JENIL RITESH", "status": "Present" },
  { "uid": 4, "enrollment_number": "246250307005", "name": "BOSAMIYA SHALAKA SANJAYBHAI", "status": "Present" },
  { "uid": 5, "enrollment_number": "246250307006", "name": "CHANDRA KRISHNA SANJAYBHAI", "status": "Present" },
  { "uid": 6, "enrollment_number": "246250307007", "name": "CHANDRA SUJAL MANISHBHAI", "status": "Present" },
  { "uid": 7, "enrollment_number": "246250307008", "name": "CHAUHAN DURVA HITESH", "status": "Present" },
  { "uid": 8, "enrollment_number": "246250307009", "name": "CHAUHAN YUVRAJ NILESHBHAI", "status": "Present" },
  { "uid": 9, "enrollment_number": "246250307010", "name": "CHAVDA HARSHIT", "status": "Present" },
  { "uid": 10, "enrollment_number": "246250307013", "name": "CHHATBAR KUSHAL JAYKUMAR", "status": "Present" },
  { "uid": 11, "enrollment_number": "246250307014", "name": "CHUDASAMA ZIYA ATUL", "status": "Present" },
  { "uid": 12, "enrollment_number": "246250307015", "name": "DANGAR JAYDEEP SAJANBHAI", "status": "Present" },
  { "uid": 13, "enrollment_number": "246250307016", "name": "DAVDA SAKHI SHYAM", "status": "Present" },
  { "uid": 14, "enrollment_number": "246250307018", "name": "DAVERA SAHIL JENTIBHAI", "status": "Present" },
  { "uid": 15, "enrollment_number": "246250307019", "name": "DEVMURARI SHUBHAM BIPINBHAI", "status": "Present" },
  { "uid": 16, "enrollment_number": "246250307021", "name": "DHOKIYA YASH PREMJIBHAI", "status": "Present" },
  { "uid": 17, "enrollment_number": "246250307022", "name": "DHOLARIYA BHRANTI PUNITKUMAR", "status": "Present" },
  { "uid": 18, "enrollment_number": "246250307023", "name": "GAGIYA JEMISH KISHORBHAI", "status": "Present" },
  { "uid": 19, "enrollment_number": "246250307024", "name": "GANGAJALIYA KHUSHI BIPINBHAI", "status": "Present" },
  { "uid": 20, "enrollment_number": "246250307025", "name": "GHUMRA DIYA JASMINKUMAR", "status": "Present" },
  { "uid": 21, "enrollment_number": "246250307026", "name": "GHUMRA RISHI MAYUR", "status": "Present" },
  { "uid": 22, "enrollment_number": "246250307027", "name": "GODHANI HELLY HARESH", "status": "Present" },
  { "uid": 23, "enrollment_number": "246250307028", "name": "GOHEL PRIYESH RAJESH", "status": "Present" },
  { "uid": 24, "enrollment_number": "246250307030", "name": "GOJIYA ARJUN MARKHIBHAI", "status": "Present" },
  { "uid": 25, "enrollment_number": "246250307031", "name": "GOJIYA CHIRAG MUKESHBHAI", "status": "Present" },
  { "uid": 26, "enrollment_number": "246250307032", "name": "GORFAD DEEP GIRISHBHAI", "status": "Present" },
  { "uid": 27, "enrollment_number": "246250307033", "name": "GUDKA SHRIYA ALPESH", "status": "Present" },
  { "uid": 28, "enrollment_number": "246250307034", "name": "GUDKA SHUBH NEJUL", "status": "Present" },
  { "uid": 29, "enrollment_number": "246250307035", "name": "JADEJA NISHITABA DASHRATHSINH", "status": "Present" },
  { "uid": 30, "enrollment_number": "246250307036", "name": "JAINIL DHARMESH CHAVDA", "status": "Present" },
  { "uid": 31, "enrollment_number": "246250307037", "name": "JOISAR DHAIRYA PRITESH", "status": "Present" },
  { "uid": 32, "enrollment_number": "246250307038", "name": "JOISHAR VEER SHAILESHBHAI", "status": "Present" },
  { "uid": 33, "enrollment_number": "246250307039", "name": "JOSHI DARSH SANJAYBHAI", "status": "Present" },
  { "uid": 34, "enrollment_number": "246250307040", "name": "JOSHI MAULIK NIRAJBHAI", "status": "Present" },
  { "uid": 35, "enrollment_number": "246250307041", "name": "JOSHI MAYANK HITESHBHAI", "status": "Present" },
  { "uid": 36, "enrollment_number": "246250307043", "name": "KALARIA RADHA AJAYBHAI", "status": "Present" },
  { "uid": 37, "enrollment_number": "246250307045", "name": "KANZARIYA SUMIT DHARAMSHIBHAI", "status": "Present" },
  { "uid": 38, "enrollment_number": "246250307046", "name": "KARSHARIYA SHYAM RAMNIKBHAI", "status": "Present" },
  { "uid": 39, "enrollment_number": "246250307047", "name": "KATARMAL NIRAV PRADIPBHAI", "status": "Present" },
  { "uid": 40, "enrollment_number": "246250307049", "name": "KHAN SUHA MEHBOOB", "status": "Present" },
  { "uid": 41, "enrollment_number": "246250307050", "name": "KHONA DAKSH ABHAY", "status": "Present" },
  { "uid": 42, "enrollment_number": "246250307051", "name": "KORADIA DEV GIRISHBHAI", "status": "Present" },
  { "uid": 43, "enrollment_number": "246250307053", "name": "MAKWANA HIMANSHI RAJESH", "status": "Present" },
  { "uid": 44, "enrollment_number": "246250307055", "name": "MAKWANA KRISH MANOJBHAI", "status": "Present" },
  { "uid": 45, "enrollment_number": "246250307056", "name": "MARU PARAS GANGJIBHAI", "status": "Present" },
  { "uid": 46, "enrollment_number": "246250307057", "name": "MEGHNATHI ADITYA AMITGIRI", "status": "Present" },
  { "uid": 47, "enrollment_number": "246250307058", "name": "MEHTA DRASHAN MEHULBHAI", "status": "Present" },
  { "uid": 48, "enrollment_number": "246250307059", "name": "MEHTA RUCHITAA JIGNESH", "status": "Present" },
  { "uid": 49, "enrollment_number": "246250307061", "name": "METAR M.SAFVAN RAFIKBHAI", "status": "Absent" },
  { "uid": 50, "enrollment_number": "246250307062", "name": "MODHA HRUTAV HARISHBHAI", "status": "Present" },
  { "uid": 51, "enrollment_number": "246250307063", "name": "NAKUM KARAN SHAILESHBHAI", "status": "Present" },
  { "uid": 52, "enrollment_number": "246250307064", "name": "NAKUM RAVI HASMUKH", "status": "Present" },
  { "uid": 53, "enrollment_number": "246250307065", "name": "NAKUM SHYAM NANJIBHAI", "status": "Present" },
  { "uid": 54, "enrollment_number": "246250307066", "name": "NANDA DARSHAN JAYDEEP", "status": "Present" },
  { "uid": 55, "enrollment_number": "246250307067", "name": "NANGESH KEVALBHAI VARJANGBHAI", "status": "Present" },
  { "uid": 56, "enrollment_number": "246250307068", "name": "ODICH JIGNESH DINESHBHAI", "status": "Absent" },
  { "uid": 57, "enrollment_number": "246250307070", "name": "PADIA DHRUV DEEPAKBHAI", "status": "Present" },
  { "uid": 58, "enrollment_number": "246250307072", "name": "PANDYA HANI VIPULBHAI", "status": "Present" },
  { "uid": 59, "enrollment_number": "246250307073", "name": "PANDYA SHIVAM PANKAJBHAI", "status": "Present" },
  { "uid": 60, "enrollment_number": "246250307074", "name": "PANKHANIYA DHRUV BHARATBHAI", "status": "Present" },
  { "uid": 61, "enrollment_number": "246250307075", "name": "PANKHANIYA KRISHNA HITESHBHAI", "status": "Present" },
  { "uid": 62, "enrollment_number": "246250307076", "name": "PANKHANIYA VIVEK DINESHBHAI", "status": "Present" },
  { "uid": 63, "enrollment_number": "246250307077", "name": "PAREKH MEET JATINBHAI", "status": "Present" },
  { "uid": 64, "enrollment_number": "246250307078", "name": "PARMAR ARATI MOHANBHAI", "status": "Present" },
  { "uid": 65, "enrollment_number": "246250307079", "name": "PARMAR DARSHIT MAHESHBHAI", "status": "Absent" },
  { "uid": 66, "enrollment_number": "246250307080", "name": "PARMAR HARSHKUMAR M", "status": "Present" },
  { "uid": 67, "enrollment_number": "246250307082", "name": "PARMAR MEHUL NAGJIBHAI", "status": "Present" },
  { "uid": 68, "enrollment_number": "246250307083", "name": "PARMAR VISHVA RAKESHBHAI", "status": "Present" },
  { "uid": 69, "enrollment_number": "246250307084", "name": "PATEL DEV JAYESH", "status": "Present" },
  { "uid": 70, "enrollment_number": "246250307085", "name": "PATHAR BHAGIRATHBHAI FOGABHAI", "status": "Present" },
  { "uid": 71, "enrollment_number": "246250307086", "name": "PESHAVARIYA ADITYA JAYESH", "status": "Present" },
  { "uid": 72, "enrollment_number": "246250307087", "name": "PITRODA NISHIT MRUGENBHAI", "status": "Present" },
  { "uid": 73, "enrollment_number": "246250307088", "name": "RAJANI DIYA VIMAL", "status": "Present" },
  { "uid": 74, "enrollment_number": "246250307089", "name": "RANA BHAGIRATHSINH AJITSINH", "status": "Present" },
  { "uid": 75, "enrollment_number": "246250307094", "name": "RATHOD PRIYANSU LALITBHAI", "status": "Present" },
  { "uid": 76, "enrollment_number": "246250307095", "name": "RAVAL JELAM RUSHIKUMAR", "status": "Present" },
  { "uid": 77, "enrollment_number": "246250307096", "name": "RAVAL MALAY NIKUNJ", "status": "Present" },
  { "uid": 78, "enrollment_number": "246250307097", "name": "RAVANI MEGHRAJ SHARAD", "status": "Present" },
  { "uid": 79, "enrollment_number": "246250307098", "name": "SAMANI AADITYA KAUSHIK", "status": "Present" },
  { "uid": 80, "enrollment_number": "246250307099", "name": "SATHVARA OMKUMAR SANJAYBHAI", "status": "Present" },
  { "uid": 81, "enrollment_number": "246250307100", "name": "SHIR DHRUV RAMESHBHAI", "status": "Present" },
  { "uid": 82, "enrollment_number": "246250307101", "name": "SINGH ROSHNI RAJESHKUMAR", "status": "Present" },
  { "uid": 83, "enrollment_number": "246250307102", "name": "SODHA BHAVYADEEPSINH H", "status": "Present" },
  { "uid": 84, "enrollment_number": "246250307103", "name": "SONAGARA DIVYESH AMBABHAI", "status": "Present" },
  { "uid": 85, "enrollment_number": "246250307104", "name": "SONAGARA PRAFUL SHAILESHBHAI", "status": "Present" },
  { "uid": 86, "enrollment_number": "246250307105", "name": "SORATHIYA KARM DIPESH", "status": "Present" },
  { "uid": 87, "enrollment_number": "246250307106", "name": "THAKAR KEDAR SATYAMBHAI", "status": "Present" },
  { "uid": 88, "enrollment_number": "246250307107", "name": "THAKAR PARV BHARATBHUSHAN", "status": "Present" },
  { "uid": 89, "enrollment_number": "246250307108", "name": "THAKKAR PARAMKUMAR KANAIYALAL", "status": "Present" },
  { "uid": 90, "enrollment_number": "246250307109", "name": "THANKI SHYAM DHARMESHBHAI", "status": "Present" },
  { "uid": 91, "enrollment_number": "246250307111", "name": "VADGAMA KARAN SHAILESHBHAI", "status": "Present" },
  { "uid": 92, "enrollment_number": "246250307112", "name": "VADOLIYA RAJIV ANILBHAI", "status": "Absent" },
  { "uid": 93, "enrollment_number": "246250307113", "name": "VAJA HETKUMAR ANILBHAI", "status": "Present" },
  { "uid": 94, "enrollment_number": "246250307114", "name": "VISAVADIA ADITI DHARM", "status": "Present" },
  { "uid": 95, "enrollment_number": "246250307115", "name": "VISAVADIYA DHARA RAJESHBHAI", "status": "Present" },
  { "uid": 96, "enrollment_number": "246250307116", "name": "VITHLANI BHAVYA RAJESH", "status": "Present" },
  { "uid": 97, "enrollment_number": "246250307117", "name": "ZALA HINABA MAHIPALSINH", "status": "Present" },
  { "uid": 98, "enrollment_number": "246250307118", "name": "ZALA SUNIL ASHOKBHAI", "status": "Present" },
  { "uid": 99, "enrollment_number": "236250307037", "name": "GOSWAMI SAHILPURI AJAYPURI", "status": "Present" }
];

export const getStudentBatch = (uid, enrolment) => {
  let num = null;
  if (typeof uid === 'number') num = uid;
  else if (typeof uid === 'string') {
    const match = uid.match(/(\d+)$/);
    if (match) num = parseInt(match[1], 10);
  }
  if (!num && enrolment) {
    const match = enrolment.match(/(\d+)$/);
    if (match) num = parseInt(match[1], 10);
  }
  if (num && num >= 1 && num <= 63) return 'Batch A';
  return 'Batch B';
};

export const initDatabase = async () => {
  console.log('Initializing SQLite database schema...');

  // Create Users table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'hod', 'faculty', 'student')),
      department TEXT DEFAULT 'Computer Department',
      phone TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Departments table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      hod_name TEXT,
      total_students INTEGER DEFAULT 0,
      avg_attendance REAL DEFAULT 0.0
    )
  `);

  // Create Students table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS students (
      uid TEXT PRIMARY KEY,
      user_id INTEGER,
      name TEXT NOT NULL,
      enrolment_number TEXT UNIQUE NOT NULL,
      student_photo TEXT,
      department TEXT DEFAULT 'Computer Department',
      semester INTEGER DEFAULT 5,
      division TEXT DEFAULT 'A',
      status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'On Leave', 'Detained', 'Inactive')),
      total_classes_present INTEGER DEFAULT 0,
      total_classes_conducted INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0.0,
      weighted_percentage REAL DEFAULT 0.0,
      lecture_present INTEGER DEFAULT 0,
      lecture_total INTEGER DEFAULT 0,
      lab_present INTEGER DEFAULT 0,
      lab_total INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Create Classes table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_code TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      department TEXT DEFAULT 'Computer Department',
      faculty_name TEXT NOT NULL,
      faculty_email TEXT NOT NULL,
      type TEXT CHECK(type IN ('Lecture', 'Lab')),
      semester INTEGER DEFAULT 6,
      room TEXT,
      time_slot TEXT
    )
  `);

  // Create Attendance Records table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER,
      student_uid TEXT NOT NULL,
      student_name TEXT NOT NULL,
      enrolment_number TEXT NOT NULL,
      department TEXT DEFAULT 'Computer Department',
      date TEXT NOT NULL,
      session_type TEXT CHECK(session_type IN ('Lecture', 'Lab')),
      subject_name TEXT NOT NULL,
      status TEXT CHECK(status IN ('Present', 'Absent')),
      marked_by TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_frozen INTEGER DEFAULT 0,
      FOREIGN KEY(student_uid) REFERENCES students(uid) ON DELETE CASCADE
    )
  `);

  // Ensure is_frozen column exists on attendance_records if table existed previously
  try {
    const tableInfo = await allQuery(`PRAGMA table_info(attendance_records)`);
    const hasFrozenCol = tableInfo.some((col) => col.name === 'is_frozen');
    if (!hasFrozenCol) {
      await runQuery(`ALTER TABLE attendance_records ADD COLUMN is_frozen INTEGER DEFAULT 0`);
    }
  } catch (err) {
    console.warn('Could not verify/add is_frozen column to attendance_records:', err.message);
  }

  // Create Attendance Locks / Daily Finalized Sessions table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS attendance_locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      department TEXT DEFAULT 'Computer Department',
      status TEXT DEFAULT 'Open' CHECK(status IN ('Open', 'Frozen', 'Finalized')),
      is_frozen INTEGER DEFAULT 0,
      finalized_by TEXT,
      finalized_at DATETIME,
      next_session_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, department)
    )
  `);

  // Ensure student batch divisions are updated (Roll 1-63 -> Batch A, 64+ -> Batch B)
  try {
    const allStus = await allQuery(`SELECT uid, enrolment_number FROM students`);
    for (const s of allStus) {
      const batchName = getStudentBatch(s.uid, s.enrolment_number);
      await runQuery(`UPDATE students SET division = ? WHERE uid = ?`, [batchName, s.uid]);
    }
  } catch (err) {
    console.warn('Could not update student divisions:', err.message);
  }

  // Create Email OTP Verifications table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      email TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK(purpose IN ('account_setup', 'email_change', 'password_recovery')),
      otp_code TEXT,
      otp_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 5,
      is_used INTEGER DEFAULT 0,
      resend_count INTEGER DEFAULT 0,
      last_sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await runQuery(`CREATE INDEX IF NOT EXISTS idx_email_otps_lookup ON email_otps(email, purpose, is_used)`);

  // Ensure otp_code column exists on email_otps table
  try {
    const otpsTableInfo = await allQuery(`PRAGMA table_info(email_otps)`);
    const hasOtpCode = otpsTableInfo.some((col) => col.name === 'otp_code');
    if (!hasOtpCode) {
      await runQuery(`ALTER TABLE email_otps ADD COLUMN otp_code TEXT`);
    }
  } catch (err) {
    console.warn('Could not verify/add otp_code column to email_otps table:', err.message);
  }

  // Create Password Reset Authorizations table
  await runQuery(`
    CREATE TABLE IF NOT EXISTS password_reset_authorizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      is_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await runQuery(`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_authorizations(token_hash)`);

  // Ensure setup_status and email_verified_at columns exist on users table
  try {
    const userTableInfo = await allQuery(`PRAGMA table_info(users)`);
    const hasSetupStatus = userTableInfo.some((col) => col.name === 'setup_status');
    if (!hasSetupStatus) {
      await runQuery(`ALTER TABLE users ADD COLUMN setup_status TEXT DEFAULT 'completed'`);
    }
    const hasEmailVerifiedAt = userTableInfo.some((col) => col.name === 'email_verified_at');
    if (!hasEmailVerifiedAt) {
      await runQuery(`ALTER TABLE users ADD COLUMN email_verified_at DATETIME`);
    }
  } catch (err) {
    console.warn('Could not verify/add setup columns to users table:', err.message);
  }

  // Seed default data if users table is empty
  const userCount = await getQuery(`SELECT COUNT(*) as count FROM users`);
  if (userCount && userCount.count === 0) {
    console.log('Seeding initial data for Computer Department and Roles...');
    await seedInitialData();
  }
};

const seedInitialData = async () => {
  const hashPass = (pw) => bcrypt.hashSync(pw, 10);

  // 1. Departments
  await runQuery(`
    INSERT INTO departments (name, code, hod_name, total_students, avg_attendance)
    VALUES ('Computer Department', 'COMP', 'C.G.Ajudiya', 99, 88.9)
  `);

  // 2. Default Accounts for Admin, HOD, and Faculty
  const staffUsers = [
    {
      uid: 'ADM-001',
      name: 'Ravi',
      email: 'raviadmin@attendancex.edu',
      password: hashPass('Admin@123'),
      role: 'admin',
      department: 'Computer Department',
      phone: '',
      avatar: ''
    },
    {
      uid: 'HOD-COMP-01',
      name: 'C.G.Ajudiya',
      email: 'hod.cg.ajudiya@attendancex.edu',
      password: hashPass('Hod@123'),
      role: 'hod',
      department: 'Computer Department',
      phone: '',
      avatar: ''
    },
    {
      uid: 'FAC-COMP-101',
      name: 'J.D.Vadalia',
      email: 'faculty.jd.vadalia@attendancex.edu',
      password: hashPass('Faculty@123'),
      role: 'faculty',
      department: 'Computer Department',
      phone: '',
      avatar: ''
    },
    {
      uid: 'FAC-COMP-102',
      name: 'P.V.Patel',
      email: 'faculty.pv.patel@attendancex.edu',
      password: hashPass('Faculty@123'),
      role: 'faculty',
      department: 'Computer Department',
      phone: '',
      avatar: ''
    },
    {
      uid: 'FAC-COMP-103',
      name: 'J.V.Shparia',
      email: 'faculty.jv.shparia@attendancex.edu',
      password: hashPass('Faculty@123'),
      role: 'faculty',
      department: 'Computer Department',
      phone: '',
      avatar: ''
    },
    {
      uid: 'FAC-COMP-104',
      name: 'Shubham',
      email: 'faculty.shubham@attendancex.edu',
      password: hashPass('Faculty@123'),
      role: 'faculty',
      department: 'Computer Department',
      phone: '',
      avatar: ''
    }
  ];

  for (const u of staffUsers) {
    await runQuery(`
      INSERT INTO users (uid, name, email, password, role, department, phone, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [u.uid, u.name, u.email, u.password, u.role, u.department, u.phone, u.avatar]);
  }

  // 3. Classes (Computer Department - 5th Semester, wef 05.08.26)
  const classesList = [
    { code: 'DI05000151', name: 'IOT - Internet of Things (Lecture)', type: 'Lecture', faculty: 'C.G.Ajudiya', email: 'hod.cg.ajudiya@attendancex.edu', room: 'Room-209', time: 'Mon 12:30-1:30 | Thu 10:30-11:30' },
    { code: 'DI05000151', name: 'IOT Lab - Internet of Things Laboratory', type: 'Lab', faculty: 'C.G.Ajudiya', email: 'hod.cg.ajudiya@attendancex.edu', room: 'Lab-201B / Lab-203', time: 'Mon 2:00-4:00 (B) | Wed 11:30-1:30 (A)' },
    { code: 'DI05000111', name: 'ST - Software Testing (Lecture)', type: 'Lecture', faculty: 'J.D.Vadalia', email: 'faculty.jd.vadalia@attendancex.edu', room: 'Room-209', time: 'Mon 11:30-12:30 | Wed 3:00-4:00 | Fri 12:30-1:30' },
    { code: 'DI05000111', name: 'ST Lab - Software Testing Laboratory', type: 'Lab', faculty: 'J.D.Vadalia', email: 'faculty.jd.vadalia@attendancex.edu', room: 'Lab-203', time: 'Tue 11:30-1:30 (A) | Wed 11:30-1:30 (B)' },
    { code: 'DI05007021', name: 'IS - Information Security (Lecture)', type: 'Lecture', faculty: 'P.V.Patel', email: 'faculty.pv.patel@attendancex.edu', room: 'Room-209', time: 'Tue 3:00-4:00 | Wed 2:00-3:00 | Thu 12:30-1:30' },
    { code: 'DI05007021', name: 'IS Lab - Information Security Laboratory', type: 'Lab', faculty: 'P.V.Patel', email: 'faculty.pv.patel@attendancex.edu', room: 'Lab-115', time: 'Tue 11:30-1:30 (B) | Thu 2:00-4:00 (A)' },
    { code: 'DI05000181', name: 'CHSM - Computer Hardware Architecture and System Maintenance (Lecture)', type: 'Lecture', faculty: 'J.V.Shparia', email: 'faculty.jv.shparia@attendancex.edu', room: 'Room-209', time: 'Tue 2:00-3:00 | Thu 11:30-12:30 | Fri 11:30-12:30' },
    { code: 'DI05000181', name: 'CHSM Lab - Computer Hardware Architecture and System Maintenance Lab', type: 'Lab', faculty: 'J.V.Shparia', email: 'faculty.jv.shparia@attendancex.edu', room: 'Lab-114', time: 'Mon 2:00-4:00 (A) | Thu 2:00-4:00 (B)' },
    { code: 'DI05000121', name: 'Vibe Lab - Project & Practical Innovation Lab', type: 'Lab', faculty: 'Shubham', email: 'faculty.shubham@attendancex.edu', room: 'Computer Center / Lab-114', time: 'Fri 2:00-4:00 (Batches A & B)' }
  ];

  for (const c of classesList) {
    await runQuery(`
      INSERT INTO classes (subject_code, subject_name, department, faculty_name, faculty_email, type, semester, room, time_slot)
      VALUES (?, ?, 'Computer Department', ?, ?, ?, 5, ?, ?)
    `, [c.code, c.name, c.faculty, c.email, c.type, c.room, c.time]);
  }

  // 4. Seed all 99 real students
  // Each student logs in with <enrolment_number>@attendancex.edu and a password
  // equal to their OWN enrolment number (unique per student, not shared).

  for (const s of rawStudentList) {
    const formattedUid = `STU-COMP-${String(s.uid).padStart(3, '0')}`;
    const email = `${s.enrollment_number}@attendancex.edu`;
    const studentPassword = hashPass(s.enrollment_number);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`;

    const isAbsent = s.status === 'Absent';
    const lecTotal = 30;
    const labTotal = 20;
    const totalClasses = lecTotal + labTotal;

    const lecPres = isAbsent ? Math.floor(15 + Math.random() * 5) : Math.floor(25 + Math.random() * 5);
    const labPres = isAbsent ? Math.floor(10 + Math.random() * 4) : Math.floor(17 + Math.random() * 3);
    const totalPres = lecPres + labPres;

    const percentage = calculatePercentage(totalPres, totalClasses);
    const weightedScore = calculateWeightedScore(totalPres / totalClasses);
    const studentStatus = isAbsent ? 'On Leave' : 'Active';

    const userRes = await runQuery(`
      INSERT INTO users (uid, name, email, password, role, department, avatar)
      VALUES (?, ?, ?, ?, 'student', 'Computer Department', ?)
    `, [formattedUid, s.name, email, studentPassword, avatar]);

    const batchName = s.uid <= 63 ? 'Batch A' : 'Batch B';

    await runQuery(`
      INSERT INTO students (
        uid, user_id, name, enrolment_number, student_photo, department,
        semester, division, status, total_classes_present, total_classes_conducted,
        percentage, weighted_percentage, lecture_present, lecture_total,
        lab_present, lab_total
      )
      VALUES (?, ?, ?, ?, ?, 'Computer Department', 6, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      formattedUid, userRes.id, s.name, s.enrollment_number, avatar,
      batchName, studentStatus, totalPres, totalClasses, percentage, weightedScore,
      lecPres, lecTotal, labPres, labTotal
    ]);
  }

  // 5. Seed Attendance Records for recent dates
  const dates = ['2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25'];
  const subjects = [
    { name: 'IOT - Internet of Things (Lecture)', type: 'Lecture', faculty: 'C.G.Ajudiya' },
    { name: 'ST - Software Testing (Lecture)', type: 'Lecture', faculty: 'J.D.Vadalia' },
    { name: 'IS - Information Security (Lecture)', type: 'Lecture', faculty: 'P.V.Patel' },
    { name: 'CHSM - Computer Hardware Architecture and System Maintenance (Lecture)', type: 'Lecture', faculty: 'J.V.Shparia' }
  ];

  for (const date of dates) {
    for (const sub of subjects) {
      for (const s of rawStudentList) {
        const formattedUid = `STU-COMP-${String(s.uid).padStart(3, '0')}`;
        const isPresent = s.status === 'Present' ? (Math.random() > 0.08) : (Math.random() > 0.6);
        const status = isPresent ? 'Present' : 'Absent';

        await runQuery(`
          INSERT INTO attendance_records (
            class_id, student_uid, student_name, enrolment_number,
            department, date, session_type, subject_name, status, marked_by
          )
          VALUES (1, ?, ?, ?, 'Computer Department', ?, ?, ?, ?, ?)
        `, [formattedUid, s.name, s.enrollment_number, date, sub.type, sub.name, status, sub.faculty]);
      }
    }
  }

  console.log('Database initialized with 99 students successfully!');
};
