const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('node:crypto');

const prisma = new PrismaClient();

const SEED_TENANT_ID = 'seed-tenant-default';
const SEED_WORKSPACE_ID = 'seed-workspace-default';
const DEMO_PASSWORD = 'Test12345!';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const { loadGeographySeed } = await import('../../../scripts/geography/seed-loader.mjs');
  const geoCounts = await loadGeographySeed(prisma);
  console.log('Geography seed:', geoCounts);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'seed-default' },
    update: { name: 'Seed tenant' },
    create: {
      id: SEED_TENANT_ID,
      slug: 'seed-default',
      name: 'Seed tenant',
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Default workspace' } },
    update: { isDefault: true },
    create: {
      id: SEED_WORKSPACE_ID,
      tenantId: tenant.id,
      name: 'Default workspace',
      isDefault: true,
    },
  });

  const passwordHash = hashPassword(DEMO_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.local' },
    update: {
      displayName: 'Family Platform Admin',
      role: 'ADMIN',
      isActive: true,
      deletedAt: null,
      passwordHash,
    },
    create: {
      email: 'admin@example.local',
      displayName: 'Family Platform Admin',
      role: 'ADMIN',
      passwordHash,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@example.local' },
    update: {
      displayName: 'Workspace Viewer',
      role: 'VIEWER',
      isActive: true,
      deletedAt: null,
      passwordHash,
    },
    create: {
      email: 'viewer@example.local',
      displayName: 'Workspace Viewer',
      role: 'VIEWER',
      passwordHash,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: admin.id,
      },
    },
    update: { role: 'OWNER' },
    create: {
      workspaceId: workspace.id,
      userId: admin.id,
      role: 'OWNER',
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: viewer.id,
      },
    },
    update: { role: 'VIEWER' },
    create: {
      workspaceId: workspace.id,
      userId: viewer.id,
      role: 'VIEWER',
    },
  });

  await upsertConsent(admin.id, 'AI_LOCAL_PROCESSING', true);
  await upsertConsent(admin.id, 'GDPR_DATA_PROCESSING', true);

  const ivan = await upsertPerson({
    id: 'seed-person-ivan',
    workspaceId: workspace.id,
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
    workspaceId: workspace.id,
    givenName: 'Мария',
    familyName: 'Петрова',
    gender: 'FEMALE',
    birthDate: new Date('1952-06-21T00:00:00.000Z'),
    isLiving: true,
    biography: 'Демо-персона для проверки семьи, timeline и дерева.',
  });

  const anna = await upsertPerson({
    id: 'seed-person-anna',
    workspaceId: workspace.id,
    givenName: 'Анна',
    familyName: 'Петрова',
    gender: 'FEMALE',
    birthDate: new Date('1978-02-10T00:00:00.000Z'),
    isLiving: true,
    privacyLevel: 'FAMILY',
    biography: 'Демо-ребёнок в тестовой семье.',
  });

  await upsertPerson({
    id: 'seed-person-secret',
    workspaceId: workspace.id,
    givenName: 'Секретный',
    familyName: 'Предок',
    gender: 'MALE',
    birthDate: new Date('1900-03-01T00:00:00.000Z'),
    isLiving: false,
    deathDate: new Date('1965-11-20T00:00:00.000Z'),
    privacyLevel: 'PRIVATE',
    biography: 'PRIVATE seed person for privacy smoke tests.',
  });

  const family = await prisma.family.upsert({
    where: { id: 'seed-family-petrov' },
    update: {
      name: 'Семья Петровых',
      notes: 'Демо-семья для проверки CRUD, дерева и timeline.',
      workspaceId: workspace.id,
      deletedAt: null,
    },
    create: {
      id: 'seed-family-petrov',
      workspaceId: workspace.id,
      name: 'Семья Петровых',
      notes: 'Демо-семья для проверки CRUD, дерева и timeline.',
    },
  });

  await upsertFamilyMember(workspace.id, family.id, ivan.id, 'HUSBAND');
  await upsertFamilyMember(workspace.id, family.id, maria.id, 'WIFE');
  await upsertFamilyMember(workspace.id, family.id, anna.id, 'CHILD');

  await upsertRelationship(workspace.id, 'seed-rel-ivan-anna-parent', ivan.id, anna.id, 'PARENT');
  await upsertRelationship(workspace.id, 'seed-rel-maria-anna-parent', maria.id, anna.id, 'PARENT');
  await upsertRelationship(workspace.id, 'seed-rel-ivan-maria-spouse', ivan.id, maria.id, 'SPOUSE');

  await prisma.event.upsert({
    where: { id: 'seed-event-ivan-birth' },
    update: {
      workspaceId: workspace.id,
      type: 'BIRTH',
      date: ivan.birthDate,
      description: 'Рождение Ивана Петрова',
      deletedAt: null,
    },
    create: {
      id: 'seed-event-ivan-birth',
      workspaceId: workspace.id,
      personId: ivan.id,
      type: 'BIRTH',
      date: ivan.birthDate,
      description: 'Рождение Ивана Петрова',
    },
  });

  await prisma.event.upsert({
    where: { id: 'seed-event-family-marriage' },
    update: {
      workspaceId: workspace.id,
      type: 'MARRIAGE',
      date: new Date('1975-08-16T00:00:00.000Z'),
      description: 'Демо-событие брака семьи Петровых',
      deletedAt: null,
    },
    create: {
      id: 'seed-event-family-marriage',
      workspaceId: workspace.id,
      familyId: family.id,
      type: 'MARRIAGE',
      date: new Date('1975-08-16T00:00:00.000Z'),
      description: 'Демо-событие брака семьи Петровых',
    },
  });

  await prisma.source.upsert({
    where: { id: 'seed-source-family-archive' },
    update: {
      workspaceId: workspace.id,
      title: 'Семейный архив',
      repository: 'Локальный архив',
      notes: 'Демо-источник для проверки источников и цитат.',
      deletedAt: null,
    },
    create: {
      id: 'seed-source-family-archive',
      workspaceId: workspace.id,
      title: 'Семейный архив',
      repository: 'Локальный архив',
      notes: 'Демо-источник для проверки источников и цитат.',
    },
  });

  console.log(
    `Seed completed. Admin: ${admin.email}, viewer: ${viewer.email}, workspace: ${workspace.id}, family: ${family.name}`,
  );
}

async function upsertConsent(userId, consentKey, granted) {
  return prisma.userConsent.upsert({
    where: { userId_consentKey: { userId, consentKey } },
    update: {
      granted,
      grantedAt: granted ? new Date() : null,
      revokedAt: granted ? null : new Date(),
    },
    create: {
      userId,
      consentKey,
      granted,
      grantedAt: granted ? new Date() : null,
      revokedAt: granted ? null : undefined,
    },
  });
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

async function upsertFamilyMember(workspaceId, familyId, personId, role) {
  return prisma.familyMember.upsert({
    where: {
      familyId_personId: {
        familyId,
        personId,
      },
    },
    update: {
      workspaceId,
      role,
      deletedAt: null,
    },
    create: {
      workspaceId,
      familyId,
      personId,
      role,
    },
  });
}

async function upsertRelationship(workspaceId, id, fromPersonId, toPersonId, type) {
  return prisma.relationship.upsert({
    where: { id },
    update: {
      workspaceId,
      fromPersonId,
      toPersonId,
      type,
      confidence: 1,
      deletedAt: null,
    },
    create: {
      id,
      workspaceId,
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
