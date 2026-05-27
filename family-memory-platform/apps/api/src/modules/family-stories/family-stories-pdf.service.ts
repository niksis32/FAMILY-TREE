import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PublicFamilyStoryPayloadDto } from '@family/shared';

@Injectable()
export class FamilyStoriesPdfService {
  constructor(private readonly config: ConfigService) {}

  buildPrintableHtml(payload: PublicFamilyStoryPayloadDto): string {
    const timelineRows = payload.timeline
      .map(
        (e: { date?: string | null; title: string; description?: string | null }) =>
          `<tr><td>${escapeHtml(e.date ?? '')}</td><td><strong>${escapeHtml(e.title)}</strong><br/>${escapeHtml(e.description ?? '')}</td></tr>`,
      )
      .join('');

    const persons = payload.persons
      .map(
        (p: { displayName: string; birthYear?: number | null; deathYear?: number | null }) =>
          `<li>${escapeHtml(p.displayName)}${p.birthYear ? ` (${p.birthYear}${p.deathYear ? `–${p.deathYear}` : ''})` : ''}</li>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(payload.title)}</title>
  <style>
    body { font-family: Georgia, serif; margin: 40px; color: #1a1a1a; }
    h1 { font-size: 2.2rem; margin-bottom: 0.25rem; }
    .cover { border-bottom: 3px solid #c9a227; padding-bottom: 24px; margin-bottom: 32px; }
    .narrative { line-height: 1.65; margin: 24px 0; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    ul { columns: 2; }
    @media print { body { margin: 20mm; } }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(payload.title)}</h1>
    ${payload.ogDescription ? `<p>${escapeHtml(payload.ogDescription)}</p>` : ''}
  </div>
  ${payload.narrativeText ? `<div class="narrative">${escapeHtml(payload.narrativeText)}</div>` : ''}
  <h2>Persons</h2>
  <ul>${persons}</ul>
  <h2>Timeline</h2>
  <table>${timelineRows}</table>
</body>
</html>`;
  }

  async renderPdfBuffer(html: string): Promise<Buffer> {
    const executablePath =
      this.config.get<string>('PUPPETEER_EXECUTABLE_PATH') ??
      this.config.get<string>('CHROMIUM_PATH');

    if (!executablePath) {
      throw new ServiceUnavailableException(
        'PDF export requires PUPPETEER_EXECUTABLE_PATH or CHROMIUM_PATH. Set Chrome/Chromium path in .env.',
      );
    }

    try {
      const puppeteer = await import('puppeteer-core');
      const browser = await puppeteer.default.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        });
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ServiceUnavailableException(`PDF generation failed: ${message}`);
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
