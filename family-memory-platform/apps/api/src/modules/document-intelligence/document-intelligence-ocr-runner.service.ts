import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { AiService, type AiRequestAudit } from '../ai/ai.service';
import { DocumentsService } from '../documents/documents.service';
import { DocumentIntelligenceStoreService } from './document-intelligence-store.service';
import { extractPlainTextFromOcr } from './document-intelligence-text.util';

export type DocumentOcrRunResult = {
  aiResult: unknown;
  ocr: unknown;
  plainText: string;
};

@Injectable()
export class DocumentIntelligenceOcrRunnerService {
  constructor(
    private readonly ai: AiService,
    private readonly documents: DocumentsService,
    private readonly store: DocumentIntelligenceStoreService,
  ) {}

  async run(
    documentId: string,
    language: string,
    user: AuthenticatedUser,
  ): Promise<DocumentOcrRunResult> {
    const doc = await this.documents.findOne(documentId, user);
    const presigned = await this.documents.getPresignedDownloadUrl(documentId, user);
    const audit: AiRequestAudit = {
      userId: user.id,
      workspaceId: doc.workspaceId,
      scope: { documentId: doc.id },
    };
    const aiResult = await this.ai.documentOcr(
      {
        documentId: doc.id,
        fileName: doc.title,
        mimeType: doc.mimeType,
        storageKey: doc.storageKey,
        downloadUrl: presigned.downloadUrl,
        language,
        textHint: doc.ocrText ?? '',
      },
      audit,
    );

    const ocr = this.unwrapAi(aiResult);
    const entry = await this.store.ensure(documentId);
    entry.ocr = ocr;
    entry.updatedAt = new Date().toISOString();
    await this.store.save(documentId, entry);

    const plainText = extractPlainTextFromOcr(ocr);
    if (plainText) {
      await this.documents.update(documentId, { ocrText: plainText });
    }

    return { aiResult, ocr, plainText };
  }

  /** Background OCR jobs pass only userId — document access was gated at enqueue time. */
  async runForJob(documentId: string, language: string, userId: string): Promise<DocumentOcrRunResult> {
    return this.run(documentId, language, {
      id: userId,
      email: '',
      role: 'EDITOR',
    });
  }

  private unwrapAi(result: unknown): unknown {
    const extracted = this.ai.extractData(result);
    if (extracted != null) return extracted;
    return result;
  }
}
