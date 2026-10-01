import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

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

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const calculatePercentage = (present, total) => {
  if (!total || total === 0) return 0;
  return Number(((present / total) * 100).toFixed(2));
};

const calculateWeightedScore = (presentRatio) => {
  return Number((0.30 * (presentRatio * 182.5)).toFixed(2));
};

const rawStudentList = [
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

async function seedRealStudents() {
  console.log(`Starting migration of ${rawStudentList.length} real students...`);

  // 1. Remove existing student records and their attendance records
  await runQuery(`DELETE FROM attendance_records`);
  await runQuery(`DELETE FROM students`);
  await runQuery(`DELETE FROM users WHERE role = 'student'`);

  console.log('Old dummy students removed.');

  const hashPass = (pw) => bcrypt.hashSync(pw, 10);

  // 2. Insert all 99 real students
  // Each student logs in with <enrolment_number>@attendancex.edu and a password
  // equal to their OWN enrolment number (unique per student, not shared).
  for (const s of rawStudentList) {
    const formattedUid = `STU-COMP-${String(s.uid).padStart(3, '0')}`;
    const cleanNameParts = s.name.toLowerCase().split(' ').filter(Boolean);
    const firstName = cleanNameParts[0] || 'student';
    const email = `${s.enrollment_number}@attendancex.edu`;
    const studentPassword = hashPass(s.enrollment_number);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`;

    // Set initial realistic attendance
    const isAbsent = s.status === 'Absent';
    const lecTotal = 30;
    const labTotal = 20;
    const totalClasses = lecTotal + labTotal; // 50

    // Absent students have lower attendance (e.g. 55-65%), present students have high (80-98%)
    const lecPres = isAbsent ? Math.floor(15 + Math.random() * 5) : Math.floor(25 + Math.random() * 5);
    const labPres = isAbsent ? Math.floor(10 + Math.random() * 4) : Math.floor(17 + Math.random() * 3);
    const totalPres = lecPres + labPres;

    const percentage = calculatePercentage(totalPres, totalClasses);
    const weightedScore = calculateWeightedScore(totalPres / totalClasses);
    const studentStatus = isAbsent ? 'On Leave' : 'Active';

    // Insert user account for login
    const userRes = await runQuery(`
      INSERT INTO users (uid, name, email, password, role, department, avatar)
      VALUES (?, ?, ?, ?, 'student', 'Computer Department', ?)
    `, [formattedUid, s.name, email, studentPassword, avatar]);

    // Insert student table entry
    await runQuery(`
      INSERT INTO students (
        uid, user_id, name, enrolment_number, student_photo, department,
        semester, division, status, total_classes_present, total_classes_conducted,
        percentage, weighted_percentage, lecture_present, lecture_total,
        lab_present, lab_total
      )
      VALUES (?, ?, ?, ?, ?, 'Computer Department', 6, 'A', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      formattedUid, userRes.id, s.name, s.enrollment_number, avatar,
      studentStatus, totalPres, totalClasses, percentage, weightedScore,
      lecPres, lecTotal, labPres, labTotal
    ]);
  }

  // 3. Seed attendance records for recent classes for all students
  const dates = ['2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25'];
  const subjects = [
    { name: 'IOT - Internet of Things (Lecture)', type: 'Lecture', faculty: 'C.G.Ajudiya' },
    { name: 'IOT Lab - Internet of Things Laboratory', type: 'Lab', faculty: 'C.G.Ajudiya' },
    { name: 'ST - Software Testing (Lecture)', type: 'Lecture', faculty: 'J.D.Vadalia' },
    { name: 'ST Lab - Software Testing Laboratory', type: 'Lab', faculty: 'J.D.Vadalia' },
    { name: 'IS - Information Security (Lecture)', type: 'Lecture', faculty: 'P.V.Patel' },
    { name: 'IS Lab - Information Security Laboratory', type: 'Lab', faculty: 'P.V.Patel' },
    { name: 'CHSM - Computer Hardware Architecture and System Maintenance (Lecture)', type: 'Lecture', faculty: 'J.V.Shparia' },
    { name: 'CHSM Lab - Computer Hardware Architecture and System Maintenance Lab', type: 'Lab', faculty: 'J.V.Shparia' },
    { name: 'Vibe Lab - Project & Practical Innovation Lab', type: 'Lab', faculty: 'Shubham' }
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

  // 4. Update Department overall count and average attendance
  const count = await getQuery(`SELECT COUNT(*) as c, AVG(percentage) as avgPct FROM students WHERE department = 'Computer Department'`);
  await runQuery(`
    UPDATE departments
    SET total_students = ?, avg_attendance = ?
    WHERE name = 'Computer Department'
  `, [count.c, Number(count.avgPct.toFixed(2))]);

  console.log(`Successfully migrated all ${rawStudentList.length} real students!`);
  console.log(`Computer Department total students: ${count.c}, average attendance: ${count.avgPct.toFixed(2)}%`);
  db.close();
}

seedRealStudents().catch(err => {
  console.error('Migration error:', err);
  db.close();
});
