const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const schedules = await prisma.importedSchoolSchedule.findMany({ take: 5, orderBy: { sourceRow: 'asc' } });
    console.log('Sample ImportedSchoolSchedule:', schedules);

    const schools = await prisma.school.findMany();
    console.log('Current schools in School table:');
    schools.forEach(s => console.log(s.id, s.name, s.udiseCode, s.districtId));
  } finally {
    await prisma.$disconnect();
  }
}

check();

