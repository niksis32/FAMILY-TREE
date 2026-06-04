import { BadRequestException } from '@nestjs/common';
import { Kind, type DocumentNode, parse, visit } from 'graphql';

const INTROSPECTION_FIELDS = new Set(['__schema', '__type', '__typename']);

function maxFieldDepth(node: DocumentNode): number {
  let max = 0;

  function walk(selectionSet: { selections: readonly { kind: string; name?: { value: string }; selectionSet?: unknown }[] } | undefined, depth: number) {
    if (!selectionSet?.selections?.length) return;
    for (const selection of selectionSet.selections) {
      if (selection.kind !== Kind.FIELD || !selection.name) continue;
      const next = depth + 1;
      max = Math.max(max, next);
      if (selection.selectionSet) {
        walk(selection.selectionSet as typeof selectionSet, next);
      }
    }
  }

  for (const def of node.definitions) {
    if (def.kind !== Kind.OPERATION_DEFINITION || !def.selectionSet) continue;
    walk(def.selectionSet, 0);
  }

  return max;
}

function collectRootFieldNames(node: DocumentNode): string[] {
  const names: string[] = [];
  for (const def of node.definitions) {
    if (def.kind !== Kind.OPERATION_DEFINITION || !def.selectionSet) continue;
    for (const selection of def.selectionSet.selections) {
      if (selection.kind === Kind.FIELD && selection.name) {
        names.push(selection.name.value);
      }
    }
  }
  return names;
}

export function assertCommunityGraphqlQueryAllowed(
  source: string,
  opts: {
    maxDepth: number;
    allowIntrospection: boolean;
    allowFederationService: boolean;
  },
): DocumentNode {
  let document: DocumentNode;
  try {
    document = parse(source);
  } catch {
    throw new BadRequestException('Invalid GraphQL query syntax');
  }

  const depth = maxFieldDepth(document);
  if (depth > opts.maxDepth) {
    throw new BadRequestException(`GraphQL query exceeds max depth (${opts.maxDepth})`);
  }

  const rootFields = collectRootFieldNames(document);
  for (const name of rootFields) {
    if (name === '_service') {
      if (!opts.allowFederationService) {
        throw new BadRequestException('Federation _service query is disabled');
      }
      continue;
    }
    if (INTROSPECTION_FIELDS.has(name) || name.startsWith('__')) {
      if (!opts.allowIntrospection) {
        throw new BadRequestException('GraphQL introspection is disabled in production');
      }
    }
  }

  visit(document, {
    Field(node) {
      const name = node.name.value;
      if (name.startsWith('__') && name !== '__typename') {
        if (!opts.allowIntrospection) {
          throw new BadRequestException('GraphQL introspection is disabled in production');
        }
      }
    },
  });

  return document;
}
