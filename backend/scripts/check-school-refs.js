const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const schools = await prisma.school.findMany({ select: { id: true, name: true } });
    console.log('Existing schools:', schools);

    for (const s of schools) {
      const events = await prisma.event.count({ where: { schoolId: s.id } });
      const routeStops = await prisma.routeStop.count({ where: { schoolId: s.id } });
      const registrations = await prisma.schoolRegistration.count({ where: { schoolId: s.id } });
      const students = await prisma.student.count({ where: { schoolId: s.id } });
      const teachers = await prisma.teacher.count({ where: { schoolId: s.id } });
      console.log(`School ${s.id}: events=${events}, routeStops=${routeStops}, registrations=${registrations}, students=${students}, teachers=${teachers}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

check();

