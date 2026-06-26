/**
 * PDF export privacy filter tests (PROMPT 5-F).
 * Run: node --test apps/api/src/modules/pdf-export/pdf-export.privacy.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';

function filterPersonsForExport(persons) {
  return persons
    .filter((p) => p && p.privacyLevel !== 'PRIVATE' && !p.isLiving)
    .map((p) => ({
      id: p.id,
      givenName: p.givenName,
      familyName: p.familyName,
    }));
}

test('excludes living persons from export', () => {
  const rows = [
    { id: '1', givenName: 'Ivan', familyName: 'Petrov', isLiving: true, privacyLevel: 'FAMILY' },
    { id: '2', givenName: 'Anna', familyName: 'Petrova', isLiving: false, privacyLevel: 'FAMILY' },
  ];
  const out = filterPersonsForExport(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, '2');
});

test('excludes PRIVATE privacy level', () => {
  const rows = [
    { id: '1', givenName: 'Secret', familyName: 'X', isLiving: false, privacyLevel: 'PRIVATE' },
    { id: '2', givenName: 'Public', familyName: 'Y', isLiving: false, privacyLevel: 'PUBLIC' },
  ];
  const out = filterPersonsForExport(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].givenName, 'Public');
});
