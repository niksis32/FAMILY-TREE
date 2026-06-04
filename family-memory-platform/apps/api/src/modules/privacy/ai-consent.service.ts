import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async hasLocalProcessingConsent(userId: string): Promise<boolean> {
    const row = await this.prisma.userConsent.findUnique({
      where: { userId_consentKey: { userId, consentKey: 'AI_LOCAL_PROCESSING' } },
      select: { granted: true },
    });
    return row?.granted === true;
  }

  async assertLocalProcessingConsent(userId: string): Promise<void> {
    if (!(await this.hasLocalProcessingConsent(userId))) {
      throw new ForbiddenException(
        'AI local processing consent is required. Enable AI_LOCAL_PROCESSING in Privacy Center.',
      );
    }
  }
}
