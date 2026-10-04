import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:5000/api';
const faceDbBase = process.env.FACE_DB_PATH
  ? (path.isAbsolute(process.env.FACE_DB_PATH) ? process.env.FACE_DB_PATH : path.resolve(__dirname, process.env.FACE_DB_PATH))
  : path.resolve(__dirname, 'face_db');

async function runFaceEnrollmentTest() {
  console.log('====================================================');
  console.log('       Face Enrollment System Verification         ');
  console.log('====================================================\n');
  console.log(`Using Face Database Path: ${faceDbBase}`);

  const testUid = 'STU-TEST-999';
  const dummy1x1JpgBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  try {
    // 1. Initial count check
    console.log('1. Checking initial photo count...');
    const countRes1 = await fetch(`${API_BASE}/face/count/${testUid}`);
    const countData1 = await countRes1.json();
    console.log('   Current photo count:', countData1.photoCount);

    // 2. Enroll face image
    console.log('2. Enrolling test face snapshot...');
    const enrollRes = await fetch(`${API_BASE}/face/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: testUid,
        image: dummy1x1JpgBase64
      })
    });
    const enrollData = await enrollRes.json();
    console.log('   Enroll response:', enrollData.message, '| saved:', enrollData.filename);

    if (!enrollData.success) {
      throw new Error(`Enrollment failed: ${enrollData.error}`);
    }

    // 3. Verify count updated
    console.log('3. Verifying updated photo count...');
    const countRes2 = await fetch(`${API_BASE}/face/count/${testUid}`);
    const countData2 = await countRes2.json();
    console.log('   Updated photo count:', countData2.photoCount);

    if (countData2.photoCount >= 1) {
      console.log('\n✓ PASS: Face photo enrolled and verified successfully in face database!');
    } else {
      console.error('\n✗ FAIL: Photo count was not incremented.');
    }

    // Cleanup test files
    const directFile = path.resolve(faceDbBase, `${testUid}.jpg`);
    if (fs.existsSync(directFile)) {
      await fs.promises.unlink(directFile);
    }
    const subDir = path.resolve(faceDbBase, testUid);
    if (fs.existsSync(subDir)) {
      await fs.promises.rm(subDir, { recursive: true, force: true });
    }
    console.log('   Cleaned up test artifacts.');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runFaceEnrollmentTest();
