/**
 * Comprehensive Multi-User RBAC & Concurrency Security Test Suite
 * 
 * Tests complete session isolation, token validation, RBAC boundaries,
 * token rotation, and immunity to race conditions across concurrent sessions.
 */

const { app } = require("./dist/src/app");
const { PrismaClient } = require("@prisma/client");
const { signJwt } = require("./dist/src/lib/jwt");
const http = require("http");

const prisma = new PrismaClient();

function httpRequest(serverUrl, options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, serverUrl);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
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
    if (body) {
      const payload = typeof body === "string" ? body : JSON.stringify(body);
      req.write(payload);
    }
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers["set-cookie"];
  if (!setCookie) return "";
  return Array.isArray(setCookie) ? setCookie[0].split(";")[0] : setCookie.split(";")[0];
}

async function runTestSuite() {
  console.log("===============================================================");
  console.log("CRITICAL SECURITY AUDIT: MULTI-USER RBAC & SESSION ISOLATION");
  console.log("===============================================================\n");

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

  // Start in-process server on dynamic ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test API Server running on ${baseUrl}\n`);

  try {
    const userCredentials = [
      { id: "User 1 (SUPER_ADMIN)", email: "admin@scienceonwheels.com", password: "SuperAdmin@123456", expectedRole: "SUPER_ADMIN" },
      { id: "User 2 (REGIONAL_ADMIN 1)", email: "regional@scienceonwheels.com", password: "RegionalAdmin@123456", expectedRole: "REGIONAL_ADMIN" },
      { id: "User 3 (REGIONAL_ADMIN 2)", email: "regional2@scienceonwheels.com", password: "RegionalAdmin2@123456", expectedRole: "REGIONAL_ADMIN" },
      { id: "User 4 (FIELD_OFFICER 1)", email: "field@scienceonwheels.com", password: "FieldOperator@123456", expectedRole: "SCIENCE_COMMUNICATOR" },
      { id: "User 5 (FIELD_OFFICER 2)", email: "field2@scienceonwheels.com", password: "FieldOperator2@123456", expectedRole: "SCIENCE_COMMUNICATOR" },
    ];

    // =========================================================================
    // SCENARIO 1: Five users log in simultaneously
    // =========================================================================
    console.log("--- SCENARIO 1: Five Users Logging In Simultaneously ---");
    const loginPromises = userCredentials.map((u) =>
      httpRequest(baseUrl, {
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }, { email: u.email, password: u.password })
    );

    const loginResults = await Promise.all(loginPromises);

    const userSessions = [];
    loginResults.forEach((res, idx) => {
      const u = userCredentials[idx];
      assert(`${u.id} login succeeds with 200`, res.statusCode === 200);
      assert(`${u.id} receives valid JWT access token`, typeof res.data?.token === "string" && res.data.token.split(".").length === 3);
      assert(`${u.id} receives refresh token`, typeof res.data?.refreshToken === "string" && res.data.refreshToken.split(".").length === 3);
      assert(`${u.id} receives unique sessionId`, typeof res.data?.sessionId === "string" && res.data.sessionId.length > 10);
      assert(`${u.id} returns correct role in response`, res.data?.user?.role === u.expectedRole);

      userSessions.push({
        ...u,
        token: res.data.token,
        refreshToken: res.data.refreshToken,
        sessionId: res.data.sessionId,
        cookie: extractCookie(res.headers),
      });
    });

    // Verify all 5 session IDs are strictly unique
    const uniqueSessionIds = new Set(userSessions.map((s) => s.sessionId));
    assert("All 5 simultaneous logins receive distinct, isolated session IDs", uniqueSessionIds.size === 5);

    // =========================================================================
    // SCENARIO 2: Each user accesses their respective dashboard
    // =========================================================================
    console.log("\n--- SCENARIO 2: Each User Accessing Their Respective Dashboard ---");
    // User 1 (Super Admin)
    const adminDashboard = await httpRequest(baseUrl, {
      path: "/api/super-admin/users",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[0].token}` },
    });
    assert("User 1 (Super Admin) successfully accesses /api/super-admin/users (200)", adminDashboard.statusCode === 200);

    // User 2 (Regional Admin 1)
    const reg1Dashboard = await httpRequest(baseUrl, {
      path: "/api/regional-admin/schools",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[1].token}` },
    });
    assert("User 2 (Regional Admin 1) successfully accesses /api/regional-admin/schools (200)", reg1Dashboard.statusCode === 200);

    // User 3 (Regional Admin 2)
    const reg2Dashboard = await httpRequest(baseUrl, {
      path: "/api/regional-admin/schools",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[2].token}` },
    });
    assert("User 3 (Regional Admin 2) successfully accesses /api/regional-admin/schools (200)", reg2Dashboard.statusCode === 200);

    // User 4 (Field Officer 1)
    const field1Dashboard = await httpRequest(baseUrl, {
      path: "/api/field/dashboard",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[3].token}` },
    });
    assert("User 4 (Field Officer 1) successfully accesses /api/field/dashboard (200)", field1Dashboard.statusCode === 200);

    // User 5 (Field Officer 2)
    const field2Dashboard = await httpRequest(baseUrl, {
      path: "/api/field/dashboard",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[4].token}` },
    });
    assert("User 5 (Field Officer 2) successfully accesses /api/field/dashboard (200)", field2Dashboard.statusCode === 200);

    // =========================================================================
    // SCENARIO 3: Browser refresh / profile re-fetch (/api/me)
    // =========================================================================
    console.log("\n--- SCENARIO 3: User Refresh Simulating Page Reload (/api/me) ---");
    for (let i = 0; i < userSessions.length; i++) {
      const u = userSessions[i];
      const meRes = await httpRequest(baseUrl, {
        path: "/api/me",
        method: "GET",
        headers: { Authorization: `Bearer ${u.token}` },
      });
      assert(
        `${u.id} /api/me re-fetch preserves exact identity and role (${u.expectedRole})`,
        meRes.statusCode === 200 && meRes.data?.role === u.expectedRole && meRes.data?.email === u.email
      );
    }

    // =========================================================================
    // SCENARIO 4: One user logs out (User 5)
    // =========================================================================
    console.log("\n--- SCENARIO 4: Single User Logout & Session Invalidation ---");
    const logoutRes = await httpRequest(baseUrl, {
      path: "/api/auth/logout",
      method: "POST",
      headers: { Authorization: `Bearer ${userSessions[4].token}` },
    });
    assert("User 5 logs out successfully (204)", logoutRes.statusCode === 204);

    const user5PostLogout = await httpRequest(baseUrl, {
      path: "/api/field/dashboard",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[4].token}` },
    });
    assert("User 5's invalidated session token is rejected with 401", user5PostLogout.statusCode === 401);

    // CRUCIAL: Verify all other active users (1, 2, 3, 4) remain completely unaffected
    const user1AfterLogout = await httpRequest(baseUrl, {
      path: "/api/super-admin/users",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[0].token}` },
    });
    assert("User 1 remains unaffected by User 5's logout (200)", user1AfterLogout.statusCode === 200);

    const user2AfterLogout = await httpRequest(baseUrl, {
      path: "/api/regional-admin/schools",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[1].token}` },
    });
    assert("User 2 remains unaffected by User 5's logout (200)", user2AfterLogout.statusCode === 200);

    // =========================================================================
    // SCENARIO 5: Token Refresh & Secure Rotation (User 2)
    // =========================================================================
    console.log("\n--- SCENARIO 5: Token Refresh & Rotation for User 2 ---");
    const refreshRes = await httpRequest(baseUrl, {
      path: "/api/auth/refresh",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, { refreshToken: userSessions[1].refreshToken });

    assert("User 2 refresh token rotation succeeds (200)", refreshRes.statusCode === 200);
    assert("New access token returned", typeof refreshRes.data?.accessToken === "string");
    assert("New refresh token returned", typeof refreshRes.data?.refreshToken === "string");

    const newAccessToken = refreshRes.data.accessToken;
    userSessions[1].token = newAccessToken;
    userSessions[1].refreshToken = refreshRes.data.refreshToken;

    // Test access with rotated access token
    const user2WithNewToken = await httpRequest(baseUrl, {
      path: "/api/regional-admin/schools",
      method: "GET",
      headers: { Authorization: `Bearer ${newAccessToken}` },
    });
    assert("User 2 accesses protected resource with rotated access token (200)", user2WithNewToken.statusCode === 200);

    // =========================================================================
    // SCENARIO 6: User role changed by administrator in database
    // =========================================================================
    console.log("\n--- SCENARIO 6: Server-Side Role Update Without Token Tampering ---");
    // Temporarily deactivate User 3
    await prisma.user.update({
      where: { email: userSessions[2].email },
      data: { status: "LOCKED" },
    });

    const user3Locked = await httpRequest(baseUrl, {
      path: "/api/regional-admin/schools",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[2].token}` },
    });
    assert("Locked account rejected immediately with 401 on next request", user3Locked.statusCode === 401);

    // Restore User 3
    await prisma.user.update({
      where: { email: userSessions[2].email },
      data: { status: "ACTIVE" },
    });

    const user3Restored = await httpRequest(baseUrl, {
      path: "/api/regional-admin/schools",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[2].token}` },
    });
    assert("Restored account immediately resumes access without token re-issuance (200)", user3Restored.statusCode === 200);

    // =========================================================================
    // SCENARIO 7: High-concurrency simultaneous requests across all sessions
    // =========================================================================
    console.log("\n--- SCENARIO 7: 25 Concurrent Requests Across All Sessions ---");
    const activeSessions = [userSessions[0], userSessions[1], userSessions[2], userSessions[3]];
    const concurrentRequests = [];

    for (let i = 0; i < 25; i++) {
      const session = activeSessions[i % activeSessions.length];
      concurrentRequests.push(
        httpRequest(baseUrl, {
          path: "/api/me",
          method: "GET",
          headers: { Authorization: `Bearer ${session.token}` },
        }).then((res) => ({
          expectedRole: session.expectedRole,
          actualRole: res.data?.role,
          expectedEmail: session.email,
          actualEmail: res.data?.email,
          statusCode: res.statusCode,
        }))
      );
    }

    const concurrentResults = await Promise.all(concurrentRequests);
    let allMatches = true;
    for (const r of concurrentResults) {
      if (r.statusCode !== 200 || r.expectedRole !== r.actualRole || r.expectedEmail !== r.actualEmail) {
        allMatches = false;
        break;
      }
    }
    assert("All 25 concurrent requests returned 200 with 100% correct isolated roles and identities", allMatches);

    // =========================================================================
    // SCENARIO 8: User attempts to access another user's protected resources
    // =========================================================================
    console.log("\n--- SCENARIO 8: Cross-Role & Privilege Escalation Prevention ---");
    // Regional Admin attempting Super Admin endpoint
    const regToAdmin = await httpRequest(baseUrl, {
      path: "/api/super-admin/users",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[1].token}` },
    });
    assert("Regional Admin forbidden from /api/super-admin/users (403)", regToAdmin.statusCode === 403);

    // Field Officer attempting Super Admin endpoint
    const fieldToAdmin = await httpRequest(baseUrl, {
      path: "/api/super-admin/users",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[3].token}` },
    });
    assert("Field Officer forbidden from /api/super-admin/users (403)", fieldToAdmin.statusCode === 403);

    // Field Officer attempting Regional Admin endpoint
    const fieldToRegional = await httpRequest(baseUrl, {
      path: "/api/regional-admin/schools",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[3].token}` },
    });
    assert("Field Officer forbidden from /api/regional-admin/schools (403)", fieldToRegional.statusCode === 403);

    // Super Admin accessing Regional Admin (unassigned region scope)
    const adminToRegional = await httpRequest(baseUrl, {
      path: "/api/regional-admin/schools",
      method: "GET",
      headers: { Authorization: `Bearer ${userSessions[0].token}` },
    });
    assert("Super Admin without assigned region rejected from Regional routes (403)", adminToRegional.statusCode === 403);

    // =========================================================================
    // SCENARIO 9: Expired token attempts access
    // =========================================================================
    console.log("\n--- SCENARIO 9: Expired Token Rejection ---");
    const expiredToken = signJwt({
      userId: userSessions[0].id,
      sessionId: "mock-session-expired",
      type: "access",
    }, -300); // Expired 5 minutes ago

    const expiredRes = await httpRequest(baseUrl, {
      path: "/api/me",
      method: "GET",
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert("Expired JWT token is rejected with 401 Unauthorized", expiredRes.statusCode === 401);

    // =========================================================================
    // SCENARIO 10: Client manually modifies frontend role or body claims
    // =========================================================================
    console.log("\n--- SCENARIO 10: Tampered Client Claims & Role Forgery Rejection ---");
    // Field Officer sending header/body claiming to be SUPER_ADMIN
    const tamperedRes = await httpRequest(baseUrl, {
      path: "/api/super-admin/users",
      method: "GET",
      headers: {
        Authorization: `Bearer ${userSessions[3].token}`,
        "x-user-role": "SUPER_ADMIN",
        "x-user-permissions": "all",
      },
    });
    assert("Backend rejects client-supplied role tampering and enforces server-side database role (403)", tamperedRes.statusCode === 403);

    // =========================================================================
    // SCENARIO 11: Cross-Tab / Shared Cookie Collision Prevention
    // =========================================================================
    console.log("\n--- SCENARIO 11: Cross-Tab Shared Cookie Collision Resistance ---");
    // User 1 (Super Admin) sends Bearer Token User 1, but ambient browser cookie has User 4 (Field Officer)
    const crossCookieRes = await httpRequest(baseUrl, {
      path: "/api/me",
      method: "GET",
      headers: {
        Authorization: `Bearer ${userSessions[0].token}`,
        Cookie: `sow_session=${userSessions[3].token}`,
      },
    });
    assert(
      "Bearer token takes absolute precedence over ambient cookie; User 1 retains Super Admin identity despite foreign cookie",
      crossCookieRes.statusCode === 200 && crossCookieRes.data?.role === "SUPER_ADMIN"
    );

    console.log("\n===============================================================");
    console.log(`MULTI-USER RBAC CONCURRENCY AUDIT COMPLETE: ${passed} / ${total} TESTS PASSED`);
    console.log("===============================================================");
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTestSuite().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});

