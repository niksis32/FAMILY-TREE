import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DNA_DISCLAIMER =
  'Raw genotype data stored for genealogy research only. Not intended for medical or health interpretation.';

@Injectable()
export class DnaConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async assertImportConsent(userId: string) {
    const consent = await this.prisma.userConsent.findUnique({
      where: { userId_consentKey: { userId, consentKey: 'DNA_DATA_IMPORT' } },
    });
    if (!consent?.granted) {
      throw new ForbiddenException('DNA_DATA_IMPORT consent is required before importing DNA data');
    }
  }

  async grantImportConsent(userId: string) {
    await this.prisma.userConsent.upsert({
      where: { userId_consentKey: { userId, consentKey: 'DNA_DATA_IMPORT' } },
      create: {
        userId,
        consentKey: 'DNA_DATA_IMPORT',
        granted: true,
        grantedAt: new Date(),
      },
      update: {
        granted: true,
        grantedAt: new Date(),
        revokedAt: null,
      },
    });
    return {
      consentKey: 'DNA_DATA_IMPORT',
      granted: true,
      disclaimer: DNA_DISCLAIMER,
    };
  }

  disclaimer() {
    return DNA_DISCLAIMER;
  }
}
