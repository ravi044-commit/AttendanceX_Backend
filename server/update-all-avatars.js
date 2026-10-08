import { allQuery, runQuery } from './database.js';
import { getAvatarUrl } from './avatarUtils.js';

async function updateAllAvatars() {
  console.log('--- Starting Avatar Database Update ---');

  // 1. Update all users in `users` table
  const users = await allQuery('SELECT id, uid, name, role, avatar FROM users');
  console.log(`Found ${users.length} users to update.`);

  let updatedUsersCount = 0;
  for (const user of users) {
    const isStaff = user.role === 'faculty' || user.role === 'hod' || user.role === 'admin';
    const newAvatar = getAvatarUrl(user.name, null, isStaff);
    await runQuery('UPDATE users SET avatar = ? WHERE id = ?', [newAvatar, user.id]);
    updatedUsersCount++;
  }
  console.log(`Successfully updated ${updatedUsersCount} users with clean standing avatars.`);

  // 2. Update all students in `students` table
  const students = await allQuery('SELECT uid, name, student_photo FROM students');
  console.log(`Found ${students.length} students to update.`);

  let updatedStudentsCount = 0;
  for (const student of students) {
    const newAvatar = getAvatarUrl(student.name, null, false);
    await runQuery('UPDATE students SET student_photo = ? WHERE uid = ?', [newAvatar, student.uid]);
    updatedStudentsCount++;
  }
  console.log(`Successfully updated ${updatedStudentsCount} students with clean standing avatars.`);

  console.log('--- Avatar Database Update Complete ---');
  process.exit(0);
}

updateAllAvatars().catch(err => {
  console.error('Error updating avatars:', err);
  process.exit(1);
});
