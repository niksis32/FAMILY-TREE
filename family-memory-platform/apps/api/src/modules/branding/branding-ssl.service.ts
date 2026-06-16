import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';

export type CustomDomainTlsQueueEntry = {
  workspaceId: string;
  domain: string;
  requestedAt: string;
  status: 'queued' | 'issued' | 'failed';
  error?: string;
};

@Injectable()
export class BrandingSslService {
  private readonly logger = new Logger(BrandingSslService.name);

  constructor(private readonly prisma: PrismaService) {}

  private queueDir(): string {
    return process.env.CUSTOM_DOMAIN_TLS_QUEUE_DIR?.trim() || join(process.cwd(), 'infra', 'custom-domains');
  }

  private queueFile(): string {
    return join(this.queueDir(), 'queue.json');
  }

  async provisionCustomDomainSsl(workspaceId: string) {
    const branding = await this.prisma.workspaceBranding.findUnique({ where: { workspaceId } });
    if (!branding?.customDomain) {
      throw new BadRequestException('Custom domain is not configured');
    }
    if (!branding.domainVerified) {
      throw new BadRequestException('Verify DNS ownership before provisioning TLS');
    }

    const entry: CustomDomainTlsQueueEntry = {
      workspaceId,
      domain: branding.customDomain,
      requestedAt: new Date().toISOString(),
      status: 'queued',
    };

    await mkdir(this.queueDir(), { recursive: true });
    const queue = await this.readQueue();
    const next = queue.filter((row) => row.workspaceId !== workspaceId);
    next.push(entry);
    await writeFile(this.queueFile(), JSON.stringify(next, null, 2), 'utf8');

    await this.writeTraefikDynamicConfig(branding.customDomain);

    this.logger.log(`Queued TLS provisioning for ${branding.customDomain} (workspace ${workspaceId})`);

    return {
      status: 'queued',
      domain: branding.customDomain,
      queueFile: this.queueFile(),
      traefikDynamicFile: join(this.queueDir(), `${branding.customDomain}.yml`),
      nextStep:
        'Run scripts/provision-custom-domain.sh on the VPS to issue Let\'s Encrypt certificate and reload the proxy.',
    };
  }

  private async readQueue(): Promise<CustomDomainTlsQueueEntry[]> {
    try {
      const raw = await readFile(this.queueFile(), 'utf8');
      const parsed = JSON.parse(raw) as CustomDomainTlsQueueEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async writeTraefikDynamicConfig(domain: string) {
    const content = `# Auto-generated custom domain router for ${domain}
# Traefik picks this up from /etc/traefik/dynamic when mounted in prod.

http:
  routers:
    custom-${domain.replace(/\./g, '-')}:
      rule: Host(\`${domain}\`)
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      service: family-web
  services:
    family-web:
      loadBalancer:
        servers:
          - url: http://web:3000
`;
    await writeFile(join(this.queueDir(), `${domain}.yml`), content, 'utf8');
  }
}
