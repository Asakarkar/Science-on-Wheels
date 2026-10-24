import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { env } from "../src/config/env";

const permissionKeys = [
  "dashboard.view",
  "organization.view", "organization.manage",
  "people.view", "people.manage",
  "labs.view", "labs.manage",
  "schools.view", "schools.manage",
  "curriculum.view", "curriculum.manage",
  "resources.view", "resources.manage",
  "operations.view", "operations.manage",
  "monitoring.view", "monitoring.manage",
  "analytics.view", "analytics.export",
  "security.view", "security.manage",
  "field.schedule.view",
  "field.lab.view",
  "field.route.view", "field.route.execute",
  "field.visit.view", "field.visit.execute",
  "field.session.view", "field.session.execute",
  "field.inventory.view", "field.inventory.record",
  "field.issue.report",
  "field.trip.view", "field.trip.execute",
  "field.safety.record",
  "field.records.view",
];

async function main() {
  console.log("Starting Science on Wheels database seed...");

  // --------------------------------------------------
  // 1. Create permissions (parallel)
  // --------------------------------------------------
  await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: { description: key },
        create: { key, description: key, updatedAt: new Date() },
      })
    )
  );

  // --------------------------------------------------
  // 2. Create roles (parallel)
  // --------------------------------------------------
  const roles = [
    {
      name: "SUPER_ADMIN",
      description: "Organization-wide Super Administrator",
    },
    {
      name: "REGIONAL_ADMIN",
      description: "Regional Administrator",
    },
    {
      name: "SCIENCE_COMMUNICATOR",
      description: "Science Communicator / Instructor",
    },
  ] as const;

  await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: { name: role.name, description: role.description },
      })
    )
  );

  // Fetch all permissions and roles once
  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map((p) => [p.key, p.id]));

  const allRoles = await prisma.role.findMany();
  const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));

  const rolePermissionMap: Record<string, string[]> = {
    SUPER_ADMIN: permissionKeys,
    REGIONAL_ADMIN: [
      "dashboard.view","organization.view","people.view","people.manage",
      "labs.view","labs.manage","schools.view","schools.manage",
      "curriculum.view","resources.view","resources.manage",
      "operations.view","operations.manage","monitoring.view","monitoring.manage",
      "analytics.view","analytics.export","security.view"
    ],
    SCIENCE_COMMUNICATOR: [
      "dashboard.view","field.schedule.view","field.lab.view","field.route.view",
      "field.route.execute","field.visit.view","field.visit.execute",
      "field.session.view","field.session.execute","field.inventory.view",
      "field.inventory.record","field.issue.report","field.records.view"
    ]
  };

  const rolePermTasks: Promise<any>[] = [];
  for (const [roleName, keys] of Object.entries(rolePermissionMap)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;
    for (const key of keys) {
      const permissionId = permMap.get(key);
      if (!permissionId) continue;
      rolePermTasks.push(
        prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId } },
          update: {},
          create: { roleId, permissionId }
        })
      );
    }
  }
  await Promise.all(rolePermTasks);

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "SUPER_ADMIN" },
  });

  // --------------------------------------------------
  // 5. Seed Geography: State, Region, District
  // --------------------------------------------------
  const state = await prisma.state.upsert({
    where: { code: "MH" },
    update: { name: "Maharashtra" },
    create: {
      id: "state-mh",
      name: "Maharashtra",
      code: "MH",
    },
  });

  const region = await prisma.region.upsert({
    where: { id: "region-west-1" },
    update: { name: "Western Region", stateId: state.id },
    create: {
      id: "region-west-1",
      name: "Western Region",
      stateId: state.id,
    },
  });

  await prisma.district.upsert({
    where: { id: "district-pune" },
    update: { name: "Pune", regionId: region.id },
    create: {
      id: "district-pune",
      name: "Pune",
      regionId: region.id,
    },
  });

  // --------------------------------------------------
  // 6. Get other roles
  // --------------------------------------------------
  const regionalRole = await prisma.role.findUniqueOrThrow({
    where: { name: "REGIONAL_ADMIN" },
  });

  const fieldRole = await prisma.role.findUniqueOrThrow({
    where: { name: "SCIENCE_COMMUNICATOR" },
  });

  // --------------------------------------------------
  // 7. Create / update bootstrap Super Admin
  // --------------------------------------------------
  const email = env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  const passwordHash = await hashPassword(
    env.BOOTSTRAP_ADMIN_PASSWORD
  );

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  let admin;

  if (existingAdmin) {
    admin = await prisma.user.update({
      where: {
        email,
      },
      data: {
        name: env.BOOTSTRAP_ADMIN_NAME,
        roleEnum: "SUPER_ADMIN",
        roleId: adminRole.id,
        isActive: true,
        status: "ACTIVE",
        passwordHash,
      },
    });

    console.log(`Existing Super Admin updated: ${admin.email}`);
  } else {
    admin = await prisma.user.create({
      data: {
        name: env.BOOTSTRAP_ADMIN_NAME,
        email,
        passwordHash,
        roleEnum: "SUPER_ADMIN",
        roleId: adminRole.id,
        isActive: true,
        status: "ACTIVE",
      },
    });

    console.log(`Super Admin created: ${admin.email}`);
  }

  // --------------------------------------------------
  // 8. Create / update Regional Administrator
  // --------------------------------------------------
  const regionalEmail = "regional@scienceonwheels.com";
  const regionalPasswordHash = await hashPassword("RegionalAdmin@123456");

  const existingRegional = await prisma.user.findUnique({
    where: { email: regionalEmail },
  });

  let regionalAdmin;
  if (existingRegional) {
    regionalAdmin = await prisma.user.update({
      where: { email: regionalEmail },
      data: {
        name: "Regional Administrator",
        roleEnum: "REGIONAL_ADMIN",
        roleId: regionalRole.id,
        regionId: region.id,
        isActive: true,
        status: "ACTIVE",
        passwordHash: regionalPasswordHash,
      },
    });
    console.log(`Existing Regional Admin updated: ${regionalAdmin.email}`);
  } else {
    regionalAdmin = await prisma.user.create({
      data: {
        name: "Regional Administrator",
        email: regionalEmail,
        passwordHash: regionalPasswordHash,
        roleEnum: "REGIONAL_ADMIN",
        roleId: regionalRole.id,
        regionId: region.id,
        isActive: true,
        status: "ACTIVE",
      },
    });
    console.log(`Regional Admin created: ${regionalAdmin.email}`);
  }

  // --------------------------------------------------
  // 9. Create / update Field Operator (Science Communicator)
  // --------------------------------------------------
  const fieldEmail = "field@scienceonwheels.com";
  const fieldPasswordHash = await hashPassword("FieldOperator@123456");

  const existingField = await prisma.user.findUnique({
    where: { email: fieldEmail },
  });

  let fieldOperator;
  if (existingField) {
    fieldOperator = await prisma.user.update({
      where: { email: fieldEmail },
      data: {
        name: "Field Science Communicator",
        roleEnum: "SCIENCE_COMMUNICATOR",
        roleId: fieldRole.id,
        regionId: region.id,
        isActive: true,
        status: "ACTIVE",
        passwordHash: fieldPasswordHash,
      },
    });
    console.log(`Existing Field Operator updated: ${fieldOperator.email}`);
  } else {
    fieldOperator = await prisma.user.create({
      data: {
        name: "Field Science Communicator",
        email: fieldEmail,
        passwordHash: fieldPasswordHash,
        roleEnum: "SCIENCE_COMMUNICATOR",
        roleId: fieldRole.id,
        regionId: region.id,
        isActive: true,
        status: "ACTIVE",
      },
    });
    console.log(`Field Operator created: ${fieldOperator.email}`);
  }

  // --------------------------------------------------
  // 10. Seed Blocks in Pune District
  // --------------------------------------------------
  const blocks = [
    { id: "block-haveli", name: "Haveli", districtId: "district-pune" },
    { id: "block-pune-city", name: "Pune City", districtId: "district-pune" },
    { id: "block-baramati", name: "Baramati", districtId: "district-pune" },
    { id: "block-shirur", name: "Shirur", districtId: "district-pune" },
  ];

  for (const b of blocks) {
    await prisma.block.upsert({
      where: { id: b.id },
      update: { name: b.name, districtId: b.districtId },
      create: b,
    });
  }
  console.log(`Blocks seeded: ${blocks.length}`);

  // --------------------------------------------------
  // 11. Seed Mobile Laboratories (Buses)
  // --------------------------------------------------
  const buses = [
    {
      id: "bus-pune-01",
      busCode: "MH-12-SOW-01",
      registrationNumber: "MH12SA1001",
      regionId: region.id,
      status: "AVAILABLE" as const,
      seatingCapacity: 4,
      currentLat: 18.5204,
      currentLng: 73.8567,
      lastGpsUpdate: new Date(),
      insuranceExpiry: new Date(Date.now() + 300 * 24 * 3600 * 1000),
      fitnessExpiry: new Date(Date.now() + 300 * 24 * 3600 * 1000),
      serviceDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    },
    {
      id: "bus-pune-02",
      busCode: "MH-12-SOW-02",
      registrationNumber: "MH12SA1002",
      regionId: region.id,
      status: "AVAILABLE" as const,
      seatingCapacity: 4,
      currentLat: 18.5314,
      currentLng: 73.8446,
      lastGpsUpdate: new Date(),
      insuranceExpiry: new Date(Date.now() + 250 * 24 * 3600 * 1000),
      fitnessExpiry: new Date(Date.now() + 250 * 24 * 3600 * 1000),
      serviceDate: new Date(Date.now() - 15 * 24 * 3600 * 1000),
    },
  ];

  for (const bus of buses) {
    await prisma.bus.upsert({
      where: { id: bus.id },
      update: bus,
      create: bus,
    });
  }
  console.log(`Mobile Labs seeded: ${buses.length}`);

  // --------------------------------------------------
  // 12. Seed Schools across Blocks
  // --------------------------------------------------
  const schools = [
    {
      id: "school-zp-wagholi",
      udiseCode: "27250100101",
      name: "Zilla Parishad High School, Wagholi",
      address: "Pune-Nagar Road, Wagholi, Pune 412207",
      regionId: region.id,
      districtId: "district-pune",
      blockId: "block-haveli",
      latitude: 18.5793,
      longitude: 73.9814,
      contactPhone: "+91 98220 11221",
      totalStudents: 420,
      hasScienceLab: false,
      hasElectricity: true,
      hasInternet: true,
      priorityScore: 88.5,
      priorityCategory: "HIGH_OUTREACH" as const,
    },
    {
      id: "school-mg-baramati",
      udiseCode: "27250200202",
      name: "Mahatma Gandhi Secondary School, Baramati",
      address: "Vidyanagari, MIDC Road, Baramati, Pune 413133",
      regionId: region.id,
      districtId: "district-pune",
      blockId: "block-baramati",
      latitude: 18.1519,
      longitude: 74.5772,
      contactPhone: "+91 98220 33442",
      totalStudents: 680,
      hasScienceLab: true,
      hasElectricity: true,
      hasInternet: true,
      priorityScore: 65.0,
      priorityCategory: "MEDIUM_PRIORITY" as const,
    },
    {
      id: "school-kg-shirur",
      udiseCode: "27250300303",
      name: "Kasturba Gandhi Balika Vidyalaya, Shirur",
      address: "Ghodnadi Campus, Taluka Shirur, Pune 412210",
      regionId: region.id,
      districtId: "district-pune",
      blockId: "block-shirur",
      latitude: 18.8256,
      longitude: 74.3758,
      contactPhone: "+91 98220 55663",
      totalStudents: 310,
      hasScienceLab: false,
      hasElectricity: true,
      hasInternet: false,
      priorityScore: 94.0,
      priorityCategory: "HIGH_OUTREACH" as const,
    },
    {
      id: "school-sp-pune",
      udiseCode: "27250400404",
      name: "Savitribai Phule Secondary School, Pune",
      address: "Shivaji Nagar, Pune 411005",
      regionId: region.id,
      districtId: "district-pune",
      blockId: "block-pune-city",
      latitude: 18.5308,
      longitude: 73.8475,
      contactPhone: "+91 98220 77884",
      totalStudents: 850,
      hasScienceLab: true,
      hasElectricity: true,
      hasInternet: true,
      priorityScore: 45.0,
      priorityCategory: "STANDARD" as const,
    },
    {
      id: "school-zp-loni",
      udiseCode: "27250500505",
      name: "Zilla Parishad Madhyamik Shala, Loni Kalbhor",
      address: "Solapur Highway, Loni Kalbhor, Haveli, Pune 412201",
      regionId: region.id,
      districtId: "district-pune",
      blockId: "block-haveli",
      latitude: 18.4907,
      longitude: 74.0194,
      contactPhone: "+91 98220 99005",
      totalStudents: 390,
      hasScienceLab: false,
      hasElectricity: true,
      hasInternet: false,
      priorityScore: 82.0,
      priorityCategory: "HIGH_OUTREACH" as const,
    },
  ];

  for (const s of schools) {
    await prisma.school.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    });
  }
  console.log(`Schools seeded: ${schools.length}`);

  // --------------------------------------------------
  // 13. Seed Equipment Masters & Physical Equipment Assets
  // --------------------------------------------------
  const equipmentMasters = [
    {
      id: "eqm-microscope",
      name: "Compound Optical Microscope (1000x)",
      category: "Biology / Microscopy",
      unit: "piece",
      trackable: true,
      minimumStock: 2,
      description: "Binocular high-power laboratory microscope with LED illumination and oil immersion objective.",
    },
    {
      id: "eqm-telescope",
      name: "Refractor Astronomical Telescope (70mm)",
      category: "Astronomy",
      unit: "piece",
      trackable: true,
      minimumStock: 1,
      description: "Portable astronomical refractor telescope with azimuth mount for celestial observation.",
    },
    {
      id: "eqm-vandegraaff",
      name: "Van de Graaff Electrostatic Generator",
      category: "Physics / Electrostatics",
      unit: "piece",
      trackable: true,
      minimumStock: 1,
      description: "Demonstration generator producing up to 250kV for electrostatics, spark and charge experiments.",
    },
    {
      id: "eqm-spectroscope",
      name: "Direct Vision Diffraction Spectroscope",
      category: "Physics / Optics",
      unit: "piece",
      trackable: true,
      minimumStock: 2,
      description: "Handheld optical spectroscope with wavelength scale for emission spectra identification.",
    },
    {
      id: "eqm-digital-balance",
      name: "Precision Electronic Balance (0.01g)",
      category: "Chemistry / Lab Tools",
      unit: "piece",
      trackable: true,
      minimumStock: 2,
      description: "Digital laboratory scale for accurate reagent measurement and density experiments.",
    },
    {
      id: "eqm-ray-optics",
      name: "Laser Ray Optics Demonstration Kit",
      category: "Physics / Optics",
      unit: "piece",
      trackable: true,
      minimumStock: 2,
      description: "Magnetic multi-beam laser box with cylindrical lenses, prisms and mirrors for ray tracing.",
    },
  ];

  for (const em of equipmentMasters) {
    await prisma.equipmentMaster.upsert({
      where: { name: em.name },
      update: em,
      create: em,
    });
  }
  console.log(`Equipment Masters seeded: ${equipmentMasters.length}`);

  const equipmentAssets = [
    {
      id: "eq-mic-01",
      assetTag: "SOW-EQ-001",
      name: "Compound Optical Microscope - Unit 1",
      category: "Biology / Microscopy",
      status: "ASSIGNED_TO_BUS" as const,
      busId: "bus-pune-01",
      purchaseDate: new Date("2025-06-15"),
      cost: 14500,
      equipmentMasterId: "eqm-microscope",
    },
    {
      id: "eq-mic-02",
      assetTag: "SOW-EQ-002",
      name: "Compound Optical Microscope - Unit 2",
      category: "Biology / Microscopy",
      status: "ASSIGNED_TO_BUS" as const,
      busId: "bus-pune-01",
      purchaseDate: new Date("2025-06-15"),
      cost: 14500,
      equipmentMasterId: "eqm-microscope",
    },
    {
      id: "eq-tel-01",
      assetTag: "SOW-EQ-003",
      name: "Astronomical Telescope (70mm) - Unit 1",
      category: "Astronomy",
      status: "ASSIGNED_TO_BUS" as const,
      busId: "bus-pune-01",
      purchaseDate: new Date("2025-07-10"),
      cost: 26000,
      equipmentMasterId: "eqm-telescope",
    },
    {
      id: "eq-vdg-01",
      assetTag: "SOW-EQ-004",
      name: "Van de Graaff Generator 250kV",
      category: "Physics / Electrostatics",
      status: "ASSIGNED_TO_BUS" as const,
      busId: "bus-pune-01",
      purchaseDate: new Date("2025-08-01"),
      cost: 19800,
      equipmentMasterId: "eqm-vandegraaff",
    },
    {
      id: "eq-bal-01",
      assetTag: "SOW-EQ-005",
      name: "Precision Electronic Balance - Unit 1",
      category: "Chemistry / Lab Tools",
      status: "ASSIGNED_TO_BUS" as const,
      busId: "bus-pune-02",
      purchaseDate: new Date("2025-08-20"),
      cost: 7200,
      equipmentMasterId: "eqm-digital-balance",
    },
    {
      id: "eq-opt-01",
      assetTag: "SOW-EQ-006",
      name: "Laser Ray Optics Kit - Unit 1",
      category: "Physics / Optics",
      status: "ASSIGNED_TO_BUS" as const,
      busId: "bus-pune-02",
      purchaseDate: new Date("2025-09-05"),
      cost: 9500,
      equipmentMasterId: "eqm-ray-optics",
    },
  ];

  for (const eq of equipmentAssets) {
    await prisma.equipment.upsert({
      where: { assetTag: eq.assetTag },
      update: eq,
      create: eq,
    });
  }
  console.log(`Equipment Assets seeded: ${equipmentAssets.length}`);

  // --------------------------------------------------
  // 14. Seed Consumables & Stock Levels
  // --------------------------------------------------
  const consumables = [
    {
      id: "con-litmus",
      name: "Litmus Paper Strips (Red & Blue)",
      category: "Chemistry Reagents",
      currentStock: 450,
      minimumStock: 100,
      unitMetric: "strips",
      expiryDate: new Date("2027-12-31"),
    },
    {
      id: "con-test-tubes",
      name: "Borosilicate Test Tubes (15x125mm)",
      category: "Glassware",
      currentStock: 160,
      minimumStock: 40,
      unitMetric: "pieces",
      expiryDate: null,
    },
    {
      id: "con-copper-sulphate",
      name: "Copper Sulphate Crystals (CuSO4·5H2O)",
      category: "Chemical Reagents",
      currentStock: 2800,
      minimumStock: 500,
      unitMetric: "grams",
      expiryDate: new Date("2028-06-30"),
    },
    {
      id: "con-magnesium-ribbon",
      name: "Magnesium Ribbon (Pure)",
      category: "Chemical Reagents",
      currentStock: 35,
      minimumStock: 10,
      unitMetric: "meters",
      expiryDate: new Date("2029-01-01"),
    },
    {
      id: "con-glass-slides",
      name: "Microscope Prepared Slides & Covers",
      category: "Biology Supplies",
      currentStock: 520,
      minimumStock: 120,
      unitMetric: "pieces",
      expiryDate: null,
    },
    {
      id: "con-alkaline-cells",
      name: "9V Alkaline Demonstration Batteries",
      category: "Physics & Electronics",
      currentStock: 6,
      minimumStock: 15,
      unitMetric: "units",
      expiryDate: new Date("2026-11-30"),
    },
  ];

  for (const c of consumables) {
    await prisma.consumable.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  console.log(`Consumables seeded: ${consumables.length}`);

  // --------------------------------------------------
  // 15. Seed Inventory Transactions
  // --------------------------------------------------
  const transactions = [
    {
      id: "tx-init-01",
      consumableId: "con-litmus",
      busId: "bus-pune-01",
      quantity: 150,
      type: "RECEIPT" as const,
      notes: "Initial stocking for Pune Mobile Lab 1",
    },
    {
      id: "tx-init-02",
      consumableId: "con-test-tubes",
      busId: "bus-pune-01",
      quantity: 80,
      type: "RECEIPT" as const,
      notes: "Glassware delivery from central supplier",
    },
    {
      id: "tx-init-03",
      consumableId: "con-copper-sulphate",
      busId: "bus-pune-01",
      quantity: 1000,
      type: "RECEIPT" as const,
      notes: "Chemistry crystals allocated for demonstrations",
    },
    {
      id: "tx-init-04",
      consumableId: "con-glass-slides",
      busId: "bus-pune-02",
      quantity: 200,
      type: "RECEIPT" as const,
      notes: "Biology slides kit allocated to Mobile Lab 2",
    },
  ];

  for (const tx of transactions) {
    await prisma.inventoryTransaction.upsert({
      where: { id: tx.id },
      update: tx,
      create: tx,
    });
  }
  console.log(`Inventory Transactions seeded: ${transactions.length}`);

  // --------------------------------------------------
  // 16. Seed School Registrations
  // --------------------------------------------------
  const registrations = [
    {
      id: "reg-wagholi-01",
      schoolId: "school-zp-wagholi",
      preferredDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      expectedStudentCount: 220,
      topicsRequested: ["Optics", "Electrostatics", "Cell Structure"],
      status: "APPROVED",
      remarks: "High outreach priority rural school - readiness approved",
    },
    {
      id: "reg-shirur-01",
      schoolId: "school-kg-shirur",
      preferredDate: new Date(Date.now() + 21 * 24 * 3600 * 1000),
      expectedStudentCount: 180,
      topicsRequested: ["Chemical Reactions", "Acids and Bases", "Astronomy"],
      status: "PENDING",
      remarks: "Awaiting communicator schedule assignment",
    },
  ];

  for (const r of registrations) {
    await prisma.schoolRegistration.upsert({
      where: { id: r.id },
      update: r,
      create: r,
    });
  }
  console.log(`School Registrations seeded: ${registrations.length}`);

  console.log("");
  console.log("========================================");
  console.log("Science on Wheels RBAC bootstrap complete");
  console.log("========================================");
  console.log(`1. Super Admin: ${admin.email} (password: ${env.BOOTSTRAP_ADMIN_PASSWORD})`);
  console.log(`2. Regional Admin: ${regionalAdmin.email} (password: RegionalAdmin@123456)`);
  console.log(`3. Field Operator: ${fieldOperator.email} (password: FieldOperator@123456)`);
  console.log("========================================");
}

main()
  .catch((error) => {
    console.error("Database seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });