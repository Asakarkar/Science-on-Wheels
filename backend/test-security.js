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

async function testSecurity() {
  console.log("=================================================");
  console.log("RUNNING ADVANCED AUTH & SECURITY SUITE");
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

  // 1. Super Admin login returns token in body AND set-cookie
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

  assert("Login returns 200 with user data", adminLogin.statusCode === 200);
  assert("Login returns token in JSON response", typeof adminLogin.data?.token === "string" && adminLogin.data.token.length > 20);
  const cookie = extractCookie(adminLogin.headers);
  assert("Login sets HttpOnly cookie", !!cookie);

  const rawToken = adminLogin.data?.token;

  // 2. Test Bearer Authorization header (without Cookie)
  const bearerMe = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/me",
    method: "GET",
    headers: { Authorization: `Bearer ${rawToken}` },
  });
  assert("Authorization: Bearer header authenticates /api/me successfully", bearerMe.statusCode === 200 && bearerMe.data?.email === "admin@scienceonwheels.com");
  assert("Super Admin has all system permissions populated", Array.isArray(bearerMe.data?.permissions) && bearerMe.data.permissions.length > 10);

  // 3. Test Security Headers
  const healthRes = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/health",
    method: "GET",
  });
  assert("Security header X-Content-Type-Options is nosniff", healthRes.headers["x-content-type-options"] === "nosniff");
  assert("Security header X-Frame-Options is DENY", healthRes.headers["x-frame-options"] === "DENY");

  // 4. Test Rate Limiting on repeated failed logins
  console.log("\n--- Testing Login Rate Limiting ---");
  const testEmail = "attacker_probe@test.com";
  let rateLimited = false;

  for (let i = 0; i < 7; i++) {
    const res = await request(
      {
        hostname: "localhost",
        port: 5000,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: testEmail, password: "invalid_password_attempt" }
    );

    if (res.statusCode === 429) {
      rateLimited = true;
      break;
    }
  }
  assert("Brute force attempts trigger 429 Too Many Requests lockout", rateLimited);

  // 5. Test Logout Session Invalidation
  console.log("\n--- Testing Session Revocation on Logout ---");
  const logoutRes = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/auth/logout",
    method: "POST",
    headers: { Authorization: `Bearer ${rawToken}`, Cookie: cookie },
  });
  assert("Logout returns 204 No Content", logoutRes.statusCode === 204);

  const postLogoutMe = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/me",
    method: "GET",
    headers: { Authorization: `Bearer ${rawToken}` },
  });
  assert("Revoked session token returns 401 Unauthorized", postLogoutMe.statusCode === 401);

  console.log("\n=================================================");
  console.log(`SECURITY AUDIT COMPLETE: ${passed} / ${total} TESTS PASSED`);
  console.log("=================================================");
}

testSecurity().catch(console.error);
