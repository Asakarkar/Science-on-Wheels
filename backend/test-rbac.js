const http = require("http");

async function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });
    req.on("error", reject);
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers["set-cookie"];
  if (!setCookie) return "";
  return Array.isArray(setCookie) ? setCookie[0].split(";")[0] : setCookie.split(";")[0];
}

async function testRBAC() {
  console.log("=================================================");
  console.log("RUNNING COMPLETE RBAC AND ENDPOINT AUDIT");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function assert(name, condition, details = "") {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${name}`);
    } else {
      console.error(`[FAIL] ${name} ${details}`);
    }
  }

  // 1. Health check
  const health = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/health",
    method: "GET",
  });
  assert("Health check returns 200 ok", health.statusCode === 200 && health.data?.ok === true);

  // 2. Unauthenticated guards
  const unauthSuper = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/super-admin/users",
    method: "GET",
  });
  assert("Unauthenticated Super Admin access returns 401", unauthSuper.statusCode === 401);

  const unauthRegional = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/regional-admin/schools",
    method: "GET",
  });
  assert("Unauthenticated Regional Admin access returns 401", unauthRegional.statusCode === 401);

  const unauthField = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/field/dashboard",
    method: "GET",
  });
  assert("Unauthenticated Field access returns 401", unauthField.statusCode === 401);

  // 3. Invalid credentials test
  const badLogin = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: "admin@scienceonwheels.com", password: "wrongpassword123" }
  );
  assert("Invalid password login fails with 401", badLogin.statusCode === 401);

  // 4. Test SUPER_ADMIN Login & RBAC
  console.log("\n--- Testing Super Admin RBAC ---");
  const adminLogin = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: "admin@scienceonwheels.com", password: "SuperAdmin@123456" }
  );
  assert("Super Admin login succeeds with 200", adminLogin.statusCode === 200 && adminLogin.data?.user?.role === "SUPER_ADMIN");
  const adminCookie = extractCookie(adminLogin.headers);
  assert("Super Admin receives session cookie", !!adminCookie);

  const adminMe = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/me",
    method: "GET",
    headers: { Cookie: adminCookie },
  });
  assert("Super Admin /api/me returns correct identity", adminMe.statusCode === 200 && adminMe.data?.role === "SUPER_ADMIN");

  const adminSuperAccess = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/super-admin/users",
    method: "GET",
    headers: { Cookie: adminCookie },
  });
  assert("Super Admin can access /api/super-admin/users (200)", adminSuperAccess.statusCode === 200);

  const adminRegionalForbidden = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/regional-admin/schools",
    method: "GET",
    headers: { Cookie: adminCookie },
  });
  assert("Super Admin forbidden from /api/regional-admin/schools (403)", adminRegionalForbidden.statusCode === 403);

  // 5. Test REGIONAL_ADMIN Login & RBAC
  console.log("\n--- Testing Regional Admin RBAC ---");
  const regLogin = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: "regional@scienceonwheels.com", password: "RegionalAdmin@123456" }
  );
  assert("Regional Admin login succeeds with 200", regLogin.statusCode === 200 && regLogin.data?.user?.role === "REGIONAL_ADMIN");
  const regCookie = extractCookie(regLogin.headers);

  const regMe = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/me",
    method: "GET",
    headers: { Cookie: regCookie },
  });
  assert("Regional Admin has region assigned", regMe.statusCode === 200 && regMe.data?.regionId === "region-west-1");

  const regAccessSchools = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/regional-admin/schools",
    method: "GET",
    headers: { Cookie: regCookie },
  });
  assert("Regional Admin can access /api/regional-admin/schools (200)", regAccessSchools.statusCode === 200);

  const regSuperForbidden = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/super-admin/users",
    method: "GET",
    headers: { Cookie: regCookie },
  });
  assert("Regional Admin forbidden from /api/super-admin/users (403)", regSuperForbidden.statusCode === 403);

  // 6. Test SCIENCE_COMMUNICATOR (Field) Login & RBAC
  console.log("\n--- Testing Field Operator RBAC ---");
  const fieldLogin = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    { email: "field@scienceonwheels.com", password: "FieldOperator@123456" }
  );
  assert("Field operator login succeeds with 200", fieldLogin.statusCode === 200 && fieldLogin.data?.user?.role === "SCIENCE_COMMUNICATOR");
  const fieldCookie = extractCookie(fieldLogin.headers);

  const fieldDashboard = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/field/dashboard",
    method: "GET",
    headers: { Cookie: fieldCookie },
  });
  assert("Field operator can access /api/field/dashboard (200)", fieldDashboard.statusCode === 200);

  const fieldSuperForbidden = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/super-admin/users",
    method: "GET",
    headers: { Cookie: fieldCookie },
  });
  assert("Field operator forbidden from /api/super-admin/users (403)", fieldSuperForbidden.statusCode === 403);

  const fieldRegionalForbidden = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/regional-admin/schools",
    method: "GET",
    headers: { Cookie: fieldCookie },
  });
  assert("Field operator forbidden from /api/regional-admin/schools (403)", fieldRegionalForbidden.statusCode === 403);

  console.log("\n=================================================");
  console.log(`RBAC AUDIT COMPLETE: ${passed} / ${total} TESTS PASSED`);
  console.log("=================================================");
}

testRBAC().catch(console.error);
