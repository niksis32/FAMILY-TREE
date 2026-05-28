import { Injectable } from '@nestjs/common';
import type { TreeGraphResponse, TreeViewMode } from './tree.types';
import { TreeViewDataService } from './tree-view-data.service';
import type { TreeViewDataQuery } from '@family/shared';
import type { AuthenticatedUser } from '../auth/current-user.decorator';

@Injectable()
export class TreeService {
  constructor(private readonly viewData: TreeViewDataService) {}

  async getAncestors(personId: string): Promise<TreeGraphResponse> {
    return this.legacyGraph(personId, 'ancestors');
  }

  async getDescendants(personId: string): Promise<TreeGraphResponse> {
    return this.legacyGraph(personId, 'descendants');
  }

  async getFullGraph(personId: string): Promise<TreeGraphResponse> {
    return this.legacyGraph(personId, 'full');
  }

  getViewData(personId: string, query: TreeViewDataQuery = {}, user?: AuthenticatedUser) {
    return this.viewData.getViewData(personId, query, user);
  }

  private async legacyGraph(personId: string, scope: TreeViewMode): Promise<TreeGraphResponse> {
    const viewData = await this.viewData.getViewData(personId, { scope }, undefined);
    return this.viewData.toLegacyGraph(viewData);
  }
}
