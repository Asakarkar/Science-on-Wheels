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
  // 1. Create permissions
  // --------------------------------------------------
  for (const key of permissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: {
        description: key,
      },
      create: {
        key,
        description: key,
        updatedAt: new Date(),
      },
    });
  }

  // --------------------------------------------------
  // 2. Create roles
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
    {
      name: "DRIVER",
      description: "Mobile Laboratory Driver",
    },
  ] as const;

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {
        description: role.description,
      },
      create: {
        name: role.name,
        description: role.description,
      },
    });
  }

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
    ],
    DRIVER: [
      "dashboard.view","field.schedule.view","field.lab.view","field.route.view",
      "field.route.execute","field.visit.view","field.visit.execute",
      "field.issue.report","field.trip.view","field.trip.execute",
      "field.safety.record","field.records.view"
    ]
  };

  for (const [roleName, keys] of Object.entries(rolePermissionMap)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const key of keys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id }
      });
    }
  }

  // --------------------------------------------------
  // 3. Get Super Admin role
  // --------------------------------------------------
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: {
      name: "SUPER_ADMIN",
    },
  });

  // --------------------------------------------------
  // 4. Give Super Admin all current permissions
  // --------------------------------------------------
  for (const key of permissionKeys) {
    const permission = await prisma.permission.findUniqueOrThrow({
      where: {
        key,
      },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  // --------------------------------------------------
  // 5. Create / update bootstrap Super Admin
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

  console.log("");
  console.log("========================================");
  console.log("Science on Wheels bootstrap complete");
  console.log("========================================");
  console.log(`Super Admin: ${admin.email}`);
  console.log(`Role: ${admin.roleEnum}`);
  console.log(`Status: ${admin.status}`);
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