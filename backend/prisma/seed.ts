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