async function testAuth() {
  const roles = [
    { role: 'admin', email: 'raviadmin@attendancex.edu', pass: 'Admin@123' },
    { role: 'hod', email: 'hod.cg.ajudiya@attendancex.edu', pass: 'Hod@123' },
    { role: 'faculty', email: 'faculty.jd.vadalia@attendancex.edu', pass: 'Faculty@123' },
    // Every student logs in with <enrolment_number>@attendancex.edu and their OWN enrolment number as the password
    { role: 'student', email: '246250307001@attendancex.edu', pass: '246250307001' }
  ];

  for (const r of roles) {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: r.email, password: r.pass, role: r.role })
    });
    const data = await res.json();
    console.log(`Testing Login [${r.role.toUpperCase()}]:`, res.status === 200 ? 'SUCCESS' : 'FAILED', data.user ? `Logged in as: ${data.user.name}` : data);
  }
}

testAuth();
