import { Module } from '@nestjs/common';
import { AskArchiveModule } from '../ask-archive/ask-archive.module';
import { FaceClusteringModule } from '../face-clustering/face-clustering.module';
import { MemoryStoriesModule } from '../memory-stories/memory-stories.module';
import { SocialArchiveImportModule } from '../social-archive-import/social-archive-import.module';

/** Umbrella module for BLOCK 3 — Media & AI Memory Engine */
@Module({
  imports: [FaceClusteringModule, MemoryStoriesModule, SocialArchiveImportModule, AskArchiveModule],
  exports: [FaceClusteringModule, MemoryStoriesModule, SocialArchiveImportModule, AskArchiveModule],
})
export class MediaAiBlockModule {}
