import { Module } from '@nestjs/common';
import { DuplicateMergeModule } from '../duplicate-merge/duplicate-merge.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { HintsModule } from '../hints/hints.module';
import { SearchModule } from '../search/search.module';
import { WikiModule } from '../wiki/wiki.module';

/** Umbrella module for BLOCK 2 — Knowledge Quality */
@Module({
  imports: [SearchModule, HintsModule, DuplicateMergeModule, EvidenceModule, WikiModule],
  exports: [SearchModule, HintsModule, DuplicateMergeModule, EvidenceModule, WikiModule],
})
export class KnowledgeBlockModule {}
