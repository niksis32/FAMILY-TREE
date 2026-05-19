/**
 * @family/genealogy-core — framework-agnostic genealogy domain logic.
 * No DB, no HTTP: safe to unit-test and reuse in web (client preview) and api.
 */

export * from './person.model';
export * from './relationship.rules';
export * from './tree-builder';
export * from './privacy-rules';
export * from './gedcom-mapper';
