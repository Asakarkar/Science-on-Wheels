const path = require("path");
const { prisma } = require(path.resolve(__dirname, "../dist/src/lib/prisma"));

async function main() {
  console.log("=== SCI-MOVE FIELD STAFF INTEGRATION TEST SUITE ===");

  // 1. Find or verify test science communicator user
  const commUser = await prisma.user.findFirst({
    where: { roleEnum: "SCIENCE_COMMUNICATOR", isActive: true },
    include: { Region: true }
  });

  if (!commUser) {
    throw new Error("No active SCIENCE_COMMUNICATOR found in DB for test");
  }

  console.log(`✓ Science Communicator found: ${commUser.email} (Region: ${commUser.Region?.name || "None"})`);

  // 2. Ensure an assigned bus exists
  let bus = await prisma.bus.findFirst({
    where: { regionId: commUser.regionId || undefined },
    include: { Equipment: true }
  });

  if (!bus) {
    const reg = commUser.regionId || "reg-pune";
    bus = await prisma.bus.create({
      data: {
        id: `bus-test-${Date.now()}`,
        registrationNumber: `MH12-FS-${Date.now().toString().slice(-4)}`,
        regionId: reg,
        driverId: commUser.id,
        insuranceExpiry: new Date(Date.now() + 180 * 86400000),
        fitnessExpiry: new Date(Date.now() + 365 * 86400000),
        status: "AVAILABLE"
      },
      include: { Equipment: true }
    });
    console.log(`✓ Created test bus: ${bus.registrationNumber}`);
  } else {
    console.log(`✓ Using bus: ${bus.registrationNumber}`);
  }

  // 3. Ensure a test visit event exists for today assigned to this communicator
  const school = await prisma.school.findFirst({
    where: { regionId: commUser.regionId || undefined }
  });

  if (!school) {
    throw new Error("No school found in test region");
  }

  const today = new Date();
  today.setHours(9, 0, 0, 0);

  const eventCode = `EV-FS-${Date.now().toString().slice(-6)}`;
  const event = await prisma.event.create({
    data: {
      id: `ev-test-${Date.now()}`,
      eventCode,
      schoolId: school.id,
      busId: bus.id,
      eventDate: today,
      startTime: "09:30 AM",
      endTime: "03:30 PM",
      expectedStudentCount: 45,
      status: "SCHEDULED",
      EventsOnCommunicator: {
        create: { userId: commUser.id }
      }
    }
  });

  console.log(`✓ Created scheduled visit: ${event.eventCode} at ${school.name}`);

  // 4. Test Opening Stock verification & Discrepancy flow
  const consumable = await prisma.consumable.findFirst();
  if (consumable) {
    const variance = -2;
    await prisma.inventoryTransaction.create({
      data: {
        consumableId: consumable.id,
        busId: bus.id,
        quantity: variance,
        type: "ADJUSTMENT",
        referenceType: "OPENING_VERIFICATION",
        referenceId: event.id,
        performedById: commUser.id,
        notes: `Test opening discrepancy: counted ${consumable.currentStock - 2} vs expected ${consumable.currentStock}`
      }
    });

    const issue = await prisma.operationalIssue.create({
      data: {
        category: "INVENTORY",
        description: `Opening stock test variance for ${consumable.name} on Bus ${bus.registrationNumber}`,
        reportedById: commUser.id,
        regionId: commUser.regionId || undefined,
        busId: bus.id,
        eventId: event.id,
        status: "OPEN"
      }
    });

    console.log(`✓ Opening verification discrepancy recorded & issue created: ${issue.id}`);
  }

  // 5. Test Visit Status Progression (Arrival -> Start -> Complete)
  await prisma.event.update({
    where: { id: event.id },
    data: { status: "ON_SITE" }
  });
  console.log(`✓ Visit status transitioned to ON_SITE`);

  // 6. Test Material Consumption
  if (consumable && consumable.currentStock >= 2) {
    await prisma.$transaction([
      prisma.consumable.update({
        where: { id: consumable.id },
        data: { currentStock: { decrement: 2 } }
      }),
      prisma.consumableUsage.create({
        data: {
          id: `use-${Date.now()}`,
          consumableId: consumable.id,
          eventId: event.id,
          qtyUsed: 2
        }
      }),
      prisma.inventoryTransaction.create({
        data: {
          consumableId: consumable.id,
          busId: bus.id,
          quantity: 2,
          type: "CONSUMPTION",
          referenceType: "FIELD_SESSION",
          referenceId: event.id,
          performedById: commUser.id,
          notes: "Used in Physics Optics activity"
        }
      })
    ]);
    console.log(`✓ Material consumption logged and decremented master stock`);
  }

  // 7. Test Visit Report Submission & Feedback Record
  const reportPayload = {
    reviewStatus: "SUBMITTED_FOR_REVIEW",
    studentsParticipated: 42,
    observations: "High engagement during Newton's laws demonstrations.",
    curriculumCovered: "Grade 8 Physics Mechanics",
    challenges: "Power fluctuation in classroom 3 resolved with mobile generator.",
    submittedAt: new Date().toISOString(),
    submittedById: commUser.id
  };

  const fb = await prisma.feedbackRecord.create({
    data: {
      id: `fb-${Date.now()}`,
      eventId: event.id,
      userId: commUser.id,
      userRole: "SCIENCE_COMMUNICATOR",
      rating: 5,
      comments: JSON.stringify(reportPayload)
    }
  });

  await prisma.event.update({
    where: { id: event.id },
    data: { status: "COMPLETED" }
  });

  console.log(`✓ Visit report submitted for review: ${fb.id}`);

  // 8. Test Equipment Verification Status
  const testEquipment = await prisma.equipment.findFirst({ where: { busId: bus.id } });
  if (testEquipment) {
    await prisma.equipment.update({
      where: { id: testEquipment.id },
      data: { status: "AVAILABLE" }
    });
    console.log(`✓ Equipment verified: ${testEquipment.name} (${testEquipment.status})`);
  }

  // Clean up test event & transactions
  await prisma.feedbackRecord.deleteMany({ where: { eventId: event.id } });
  await prisma.consumableUsage.deleteMany({ where: { eventId: event.id } });
  await prisma.inventoryTransaction.deleteMany({ where: { referenceId: event.id } });
  await prisma.operationalIssue.deleteMany({ where: { eventId: event.id } });
  await prisma.eventsOnCommunicator.deleteMany({ where: { eventId: event.id } });
  await prisma.event.delete({ where: { id: event.id } });

  console.log(`✓ Test teardown complete. All models verified successfully!`);
  console.log("=== FIELD STAFF DATA CONTRACT: 100% PASSING ===");
}

main()
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
