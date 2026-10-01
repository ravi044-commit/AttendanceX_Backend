// restore-missing-students.js
import { db, runQuery, getQuery, allQuery, rawStudentList } from './database.js';
import bcrypt from 'bcryptjs';

// Helper to check if a student already exists
const studentExists = async (enrol) => {
    const row = await getQuery(
        `SELECT 1 FROM students WHERE enrolment_number = ?`,
        [enrol]
    );
    return !!row;
};

// Main restoration routine
(async () => {
    for (const s of rawStudentList) {
        if (await studentExists(s.enrollment_number)) continue; // skip existing

        // ---- create a user record -------------------------------------------------
        const formattedUid = `STU-COMP-${String(s.uid).padStart(3, '0')}`;
        const email = `${s.enrollment_number}@attendancex.edu`;
        const passwordHash = bcrypt.hashSync(s.enrollment_number, 10);
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`;

        const userRes = await runQuery(
            `INSERT INTO users (uid, name, email, password, role, department, avatar)
       VALUES (?, ?, ?, ?, 'student', 'Computer Department', ?)`,
            [formattedUid, s.name, email, passwordHash, avatar]
        );

        // ---- calculate attendance stats -------------------------------------------
        const isAbsent = s.status === 'Absent';
        const lecTotal = 30;
        const labTotal = 20;
        const totalClasses = lecTotal + labTotal;
        const lecPres = isAbsent ? Math.floor(15 + Math.random() * 5) : Math.floor(25 + Math.random() * 5);
        const labPres = isAbsent ? Math.floor(10 + Math.random() * 4) : Math.floor(17 + Math.random() * 3);
        const totalPres = lecPres + labPres;

        const calculatePercentage = (present, total) => (total ? ((present / total) * 100).toFixed(2) : 0);
        const calculateWeightedScore = (ratio) => (0.30 * (ratio * 182.5)).toFixed(2);

        const percentage = calculatePercentage(totalPres, totalClasses);
        const weightedScore = calculateWeightedScore(totalPres / totalClasses);
        const studentStatus = isAbsent ? 'On Leave' : 'Active';

        // ---- insert the student record --------------------------------------------
        await runQuery(
            `INSERT INTO students (
         uid, user_id, name, enrolment_number, student_photo,
         department, semester, division, status,
         total_classes_present, total_classes_conducted,
         percentage, weighted_percentage,
         lecture_present, lecture_total,
         lab_present, lab_total
       ) VALUES (?,?,?,?,?, 'Computer Department', 6, 'A', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                formattedUid,
                userRes.id,
                s.name,
                s.enrollment_number,
                avatar,
                studentStatus,
                totalPres,
                totalClasses,
                percentage,
                weightedScore,
                lecPres,
                lecTotal,
                labPres,
                labTotal,
            ]
        );

        console.log(`✅ Restored ${s.enrollment_number} – ${s.name}`);
    }

    console.log('🟢 All missing students have been restored.');
    process.exit(0);
})();
