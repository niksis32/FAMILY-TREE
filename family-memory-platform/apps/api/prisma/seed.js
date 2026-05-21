const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const { loadGeographySeed } = await import('../../../scripts/geography/seed-loader.mjs');
  const geoCounts = await loadGeographySeed(prisma);
  console.log('Geography seed:', geoCounts);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.local' },
    update: {
      displayName: 'Family Platform Admin',
      role: 'ADMIN',
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: 'admin@example.local',
      displayName: 'Family Platform Admin',
      role: 'ADMIN',
      passwordHash: 'replace_before_real_auth',
    },
  });

  const ivan = await upsertPerson({
    id: 'seed-person-ivan',
    givenName: 'Иван',
    familyName: 'Петров',
    gender: 'MALE',
    birthDate: new Date('1948-04-12T00:00:00.000Z'),
    isLiving: false,
    deathDate: new Date('2018-09-03T00:00:00.000Z'),
    biography: 'Демо-персона для первого MVP-релиза.',
  });

  const maria = await upsertPerson({
    id: 'seed-person-maria',
    givenName: 'Мария',
    familyName: 'Петрова',
    gender: 'FEMALE',
    birthDate: new Date('1952-06-21T00:00:00.000Z'),
    isLiving: true,
    biography: 'Демо-персона для проверки семьи, timeline и дерева.',
  });

  const anna = await upsertPerson({
    id: 'seed-person-anna',
    givenName: 'Анна',
    familyName: 'Петрова',
    gender: 'FEMALE',
    birthDate: new Date('1978-02-10T00:00:00.000Z'),
    isLiving: true,
    privacyLevel: 'FAMILY',
    biography: 'Демо-ребёнок в тестовой семье.',
  });

  const family = await prisma.family.upsert({
    where: { id: 'seed-family-petrov' },
    update: {
      name: 'Семья Петровых',
      notes: 'Демо-семья для проверки CRUD, дерева и timeline.',
      deletedAt: null,
    },
    create: {
      id: 'seed-family-petrov',
      name: 'Семья Петровых',
      notes: 'Демо-семья для проверки CRUD, дерева и timeline.',
    },
  });

  await upsertFamilyMember(family.id, ivan.id, 'HUSBAND');
  await upsertFamilyMember(family.id, maria.id, 'WIFE');
  await upsertFamilyMember(family.id, anna.id, 'CHILD');

  await upsertRelationship('seed-rel-ivan-anna-parent', ivan.id, anna.id, 'PARENT');
  await upsertRelationship('seed-rel-maria-anna-parent', maria.id, anna.id, 'PARENT');
  await upsertRelationship('seed-rel-ivan-maria-spouse', ivan.id, maria.id, 'SPOUSE');

  await prisma.event.upsert({
    where: { id: 'seed-event-ivan-birth' },
    update: {
      type: 'BIRTH',
      date: ivan.birthDate,
      description: 'Рождение Ивана Петрова',
      deletedAt: null,
    },
    create: {
      id: 'seed-event-ivan-birth',
      personId: ivan.id,
      type: 'BIRTH',
      date: ivan.birthDate,
      description: 'Рождение Ивана Петрова',
    },
  });

  await prisma.event.upsert({
    where: { id: 'seed-event-family-marriage' },
    update: {
      type: 'MARRIAGE',
      date: new Date('1975-08-16T00:00:00.000Z'),
      description: 'Демо-событие брака семьи Петровых',
      deletedAt: null,
    },
    create: {
      id: 'seed-event-family-marriage',
      familyId: family.id,
      type: 'MARRIAGE',
      date: new Date('1975-08-16T00:00:00.000Z'),
      description: 'Демо-событие брака семьи Петровых',
    },
  });

  await prisma.source.upsert({
    where: { id: 'seed-source-family-archive' },
    update: {
      title: 'Семейный архив',
      repository: 'Локальный архив',
      notes: 'Демо-источник для проверки источников и цитат.',
      deletedAt: null,
    },
    create: {
      id: 'seed-source-family-archive',
      title: 'Семейный архив',
      repository: 'Локальный архив',
      notes: 'Демо-источник для проверки источников и цитат.',
    },
  });

  console.log(`Seed completed. Admin: ${admin.email}, family: ${family.name}`);
}

async function upsertPerson(data) {
  return prisma.person.upsert({
    where: { id: data.id },
    update: {
      ...data,
      deletedAt: null,
    },
    create: data,
  });
}

async function upsertFamilyMember(familyId, personId, role) {
  return prisma.familyMember.upsert({
    where: {
      familyId_personId: {
        familyId,
        personId,
      },
    },
    update: {
      role,
      deletedAt: null,
    },
    create: {
      familyId,
      personId,
      role,
    },
  });
}

async function upsertRelationship(id, fromPersonId, toPersonId, type) {
  return prisma.relationship.upsert({
    where: { id },
    update: {
      fromPersonId,
      toPersonId,
      type,
      confidence: 1,
      deletedAt: null,
    },
    create: {
      id,
      fromPersonId,
      toPersonId,
      type,
      confidence: 1,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
