const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const states = await prisma.state.findMany();
    const regions = await prisma.region.findMany({ include: { State: true } });
    const districts = await prisma.district.findMany({ include: { Region: true } });
    const blocks = await prisma.block.findMany();
    const schools = await prisma.school.findMany({ select: { id: true, name: true, districtId: true } });
    const importedSchedules = await prisma.importedSchoolSchedule.count();

    console.log('States:', states);
    console.log('Regions:', regions);
    console.log('Districts:', districts);
    console.log('Blocks count:', blocks.length);
    console.log('Schools count:', schools.length);
    console.log('ImportedSchoolSchedule count:', importedSchedules);
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();

