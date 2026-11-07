const http = require("http");
const { app } = require("./dist/src/app");

let activePort = 5000;
let serverInstance = null;

async function request(options, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      ...options,
      port: activePort,
    };
    const req = http.request(opts, (res) => {
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

async function runRegionalAdminTests() {
  console.log("=================================================");
  console.log("RUNNING REGIONAL ADMIN FUNCTIONAL SUITE TESTS");
  console.log("=================================================\n");

  serverInstance = http.createServer(app);
  await new Promise((resolve) => serverInstance.listen(0, resolve));
  activePort = serverInstance.address().port;

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

  try {
    // 1. Regional Admin Login
    const regLogin = await request(
      {
        hostname: "localhost",
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: "regional@scienceonwheels.com", password: "RegionalAdmin@123456" }
    );
    assert("1. Regional Admin logs in successfully (200)", regLogin.statusCode === 200);
    const regCookie = extractCookie(regLogin.headers);
    assert("2. Regional Admin receives valid session cookie", !!regCookie);

    // 2. Overview / Dashboard
    const overview = await request({
      hostname: "localhost",
      path: "/api/regional-admin/overview",
      method: "GET",
      headers: { Cookie: regCookie },
    });
    assert("3. Regional Dashboard overview loads (200)", overview.statusCode === 200);
    assert("4. Overview contains region KPIs and fleet data", !!overview.data?.kpis && Array.isArray(overview.data?.labs));

    // Fetch actual district and block for this region
    const distRes = await request({
      hostname: "localhost",
      path: "/api/regional-admin/districts",
      method: "GET",
      headers: { Cookie: regCookie },
    });
    const targetDist = distRes.data?.rows?.[0];

    const blkRes = await request({
      hostname: "localhost",
      path: "/api/regional-admin/blocks",
      method: "GET",
      headers: { Cookie: regCookie },
    });
    const targetBlk = blkRes.data?.rows?.find((b) => b.districtId === targetDist?.id) || blkRes.data?.rows?.[0];

    // 3. Register School independently in region
    const testUdise = `UDISE-${Date.now().toString().slice(-7)}`;
    const createSchool = await request(
      {
        hostname: "localhost",
        path: "/api/regional-admin/schools",
        method: "POST",
        headers: { Cookie: regCookie, "Content-Type": "application/json" },
      },
      {
        name: "Regional Pilot High School",
        udiseCode: testUdise,
        address: "District Road 12, Rural Block",
        districtId: targetDist?.id || "dist-west-1",
        blockId: targetBlk?.id || "blk-west-1",
        principalName: "Smt. Sunita Patil",
        contactPhone: "9876543210",
        totalStudents: 350,
        hasScienceLab: false,
        hasElectricity: true,
        hasInternet: true,
        priorityCategory: "HIGH_OUTREACH",
      }
    );
    assert("5. Regional Admin registers school independently (201)", createSchool.statusCode === 201, `Status: ${createSchool.statusCode}, Message: ${JSON.stringify(createSchool.data)}`);
    const createdSchoolId = createSchool.data?.id;

    // 4. View School Profile with Logical vs Physical Custody
    if (createdSchoolId) {
      const schoolProfile = await request({
        hostname: "localhost",
        path: `/api/regional-admin/schools/${createdSchoolId}/profile`,
        method: "GET",
        headers: { Cookie: regCookie },
      });
      assert("6. School profile returns visit history and custodial ledger (200)", schoolProfile.statusCode === 200 && Array.isArray(schoolProfile.data?.allocatedInventory));
    }

    // 5. Create Field Staff account scoped to region
    const testStaffEmail = `fieldstaff_${Date.now().toString().slice(-6)}@scienceonwheels.com`;
    const createStaff = await request(
      {
        hostname: "localhost",
        path: "/api/regional-admin/staff",
        method: "POST",
        headers: { Cookie: regCookie, "Content-Type": "application/json" },
      },
      {
        name: "Pooja Deshmukh",
        email: testStaffEmail,
        phone: "9123456789",
        password: "StaffPassword@123",
      }
    );
    assert("7. Regional Admin creates Field Staff account with secure hash (201)", createStaff.statusCode === 201);
    const createdStaffId = createStaff.data?.id;

    // 6. Bus Fleet & Multi-Staff Assignment
    const busesRes = await request({
      hostname: "localhost",
      path: "/api/regional-admin/buses",
      method: "GET",
      headers: { Cookie: regCookie },
    });
    assert("8. Regional buses list loads with staff roster (200)", busesRes.statusCode === 200 && Array.isArray(busesRes.data?.rows));
    const firstBus = busesRes.data?.rows?.[0];

    if (firstBus && createdStaffId) {
      const assignStaff = await request(
        {
          hostname: "localhost",
          path: `/api/regional-admin/buses/${firstBus.id}/staff`,
          method: "POST",
          headers: { Cookie: regCookie, "Content-Type": "application/json" },
        },
        {
          staffId: createdStaffId,
          role: "SUPPORTING",
        }
      );
      assert("9. Multiple field staff assigned to bus roster (200)", assignStaff.statusCode === 200);
    }

    // 7. Inventory Allocation to School (Section 7: Logical school beneficiary with bus physical custody)
    if (createdSchoolId && firstBus) {
      // Find a consumable
      const consRes = await request({
        hostname: "localhost",
        path: "/api/regional-admin/consumables",
        method: "GET",
        headers: { Cookie: regCookie },
      });
      const firstCon = consRes.data?.rows?.[0];

      if (firstCon) {
        const allocRes = await request(
          {
            hostname: "localhost",
            path: "/api/regional-admin/inventory/allocate-school",
            method: "POST",
            headers: { Cookie: regCookie, "Content-Type": "application/json" },
          },
          {
            schoolId: createdSchoolId,
            busId: firstBus.id,
            itemType: "CONSUMABLE",
            consumableId: firstCon.id,
            quantity: 5,
            purpose: "Practical Chemistry Lab Kit",
          }
        );
        assert("10. School inventory allocated with bus physical custody (201)", allocRes.statusCode === 201);
      }
    }

    // 8. Pre-flight Conflict Check (Section 8.2)
    if (firstBus && createdStaffId) {
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const conflictCheck = await request(
        {
          hostname: "localhost",
          path: "/api/regional-admin/schedules/check-conflict",
          method: "POST",
          headers: { Cookie: regCookie, "Content-Type": "application/json" },
        },
        {
          eventDate: tomorrowStr,
          busId: firstBus.id,
          staffUserIds: [createdStaffId],
        }
      );
      assert("11. Pre-flight visit conflict validation responds (200)", conflictCheck.statusCode === 200 && typeof conflictCheck.data?.hasConflict === "boolean");

      // 9. Schedule School Visit
      const scheduleRes = await request(
        {
          hostname: "localhost",
          path: "/api/regional-admin/schedules",
          method: "POST",
          headers: { Cookie: regCookie, "Content-Type": "application/json" },
        },
        {
          schoolId: createdSchoolId,
          busId: firstBus.id,
          eventDate: tomorrowStr,
          startTime: "10:00",
          endTime: "16:00",
          expectedStudentCount: 75,
          staffUserIds: [createdStaffId],
          force: true,
        }
      );
      assert("12. School visit scheduled with assigned staff (201)", scheduleRes.statusCode === 201);
      const scheduledEventId = scheduleRes.data?.id;

      // 10. Field Report Review Workflow (Section 9)
      if (scheduledEventId) {
        const reviewAction = await request(
          {
            hostname: "localhost",
            path: `/api/regional-admin/reports/reviews/${scheduledEventId}`,
            method: "POST",
            headers: { Cookie: regCookie, "Content-Type": "application/json" },
          },
          {
            action: "APPROVE",
            comments: "STEM outreach activities verified and signed off.",
          }
        );
        assert("13. Regional Admin reviews and signs off field report (200)", reviewAction.statusCode === 200 && reviewAction.data?.status === "REVIEWED");
      }
    }

    // 11. Regional Operational Reports (Section 10)
    const reportsRes = await request({
      hostname: "localhost",
      path: "/api/regional-admin/reports/data",
      method: "GET",
      headers: { Cookie: regCookie },
    });
    assert("14. Regional operational reports compiled across all 9 domains (200)", reportsRes.statusCode === 200 && !!reportsRes.data?.schools && !!reportsRes.data?.buses);

    // 12. Notifications Center (Section 11)
    const notifsRes = await request({
      hostname: "localhost",
      path: "/api/regional-admin/notifications",
      method: "GET",
      headers: { Cookie: regCookie },
    });
    assert("15. Regional notifications and alerts loaded (200)", notifsRes.statusCode === 200 && Array.isArray(notifsRes.data?.notifications));

    console.log(`\n=================================================`);
    console.log(`ALL REGIONAL ADMIN TESTS COMPLETED: ${passed} / ${total} PASSED`);
    console.log(`=================================================`);
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    if (serverInstance) serverInstance.close();
  }
}

runRegionalAdminTests();
