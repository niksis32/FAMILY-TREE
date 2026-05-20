import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAncestorTree,
  buildDescendantTree,
  buildTimeline,
  calculatePersonPrivacy,
  detectRelationshipCycles,
  hideLivingPersonsForPublicView,
  mapGedcomPersonToInternalModel,
  mapInternalPersonToGedcom,
  validateParentChildAge,
  validateRelationshipSet,
} from '../dist/index.js';

const persons = new Map([
  ['grandparent', { id: 'grandparent', givenName: 'Ivan', birthDate: '1930-01-01', deathDate: '2000-01-01' }],
  ['parent', { id: 'parent', givenName: 'Anna', birthDate: '1960-01-01', deathDate: null, isLiving: true }],
  ['child', { id: 'child', givenName: 'Daria', birthDate: '1990-01-01', deathDate: null, isLiving: true }],
]);

const relationships = [
  { id: 'r1', fromPersonId: 'grandparent', toPersonId: 'parent', type: 'parent' },
  { id: 'r2', fromPersonId: 'parent', toPersonId: 'child', type: 'parent' },
];

describe('@family/genealogy-core tree builders', () => {
  it('builds ancestor tree from parent-child relationships', () => {
    const tree = buildAncestorTree('child', relationships);

    assert.equal(tree.rootPersonId, 'child');
    assert.equal(tree.direction, 'ancestors');
    assert.equal(tree.nodes.children[0].personId, 'parent');
    assert.equal(tree.nodes.children[0].children[0].personId, 'grandparent');
  });

  it('builds descendant tree from parent-child relationships', () => {
    const tree = buildDescendantTree('grandparent', relationships);

    assert.equal(tree.rootPersonId, 'grandparent');
    assert.equal(tree.direction, 'descendants');
    assert.equal(tree.nodes.children[0].personId, 'parent');
    assert.equal(tree.nodes.children[0].children[0].personId, 'child');
  });
});

describe('@family/genealogy-core relationship rules', () => {
  it('detects parent-child cycles', () => {
    const cycles = detectRelationshipCycles([
      ...relationships,
      { id: 'r3', fromPersonId: 'child', toPersonId: 'grandparent', type: 'parent' },
    ]);

    assert.equal(cycles.length, 1);
    assert.deepEqual(cycles[0], ['grandparent', 'parent', 'child', 'grandparent']);
  });

  it('validates parent-child age difference', () => {
    assert.equal(
      validateParentChildAge({ birthDate: '2010-01-01' }, { birthDate: '2018-01-01' }).valid,
      false,
    );
    assert.equal(
      validateParentChildAge({ birthDate: '1980-01-01' }, { birthDate: '2010-01-01' }).valid,
      true,
    );
  });
});

describe('@family/genealogy-core privacy rules', () => {
  it('calculates default privacy from living status', () => {
    assert.equal(calculatePersonPrivacy({ deathDate: null, isLiving: true }), 'family');
    assert.equal(calculatePersonPrivacy({ deathDate: '1999-01-01' }), 'public');
  });

  it('hides living persons for public tree view', () => {
    const tree = buildDescendantTree('grandparent', relationships);
    const publicTree = hideLivingPersonsForPublicView(tree.nodes, persons);

    assert.equal(publicTree.isHidden, false);
    assert.equal(publicTree.children[0].isHidden, true);
    assert.equal(publicTree.children[0].displayName, 'Living person');
  });
});

describe('@family/genealogy-core timeline and GEDCOM', () => {
  it('builds sorted person timeline', () => {
    const timeline = buildTimeline(
      { id: 'child', givenName: 'Daria', birthDate: '1990-01-01', deathDate: null },
      [{ id: 'e1', personId: 'child', type: 'education', title: 'School', date: '2000-09-01' }],
    );

    assert.deepEqual(
      timeline.map((event) => event.type),
      ['birth', 'education'],
    );
  });

  it('maps GEDCOM person records both directions', () => {
    const person = mapGedcomPersonToInternalModel({
      id: '@I1@',
      name: 'Anna /Volkova/',
      sex: 'F',
      birthDate: '12 APR 1958',
    });

    assert.equal(person.id, 'I1');
    assert.equal(person.givenName, 'Anna');
    assert.equal(person.familyName, 'Volkova');
    assert.equal(person.gender, 'female');

    assert.deepEqual(mapInternalPersonToGedcom(person), {
      id: 'I1',
      name: 'Anna /Volkova/',
      sex: 'F',
      birthDate: '12 APR 1958',
      deathDate: undefined,
    });
  });
});

describe('@family/genealogy-core validation rules', () => {
  it('validates relationship references, cycles and parent age', () => {
    const issues = validateRelationshipSet(
      [
        ...relationships,
        { id: 'bad-age', fromPersonId: 'child', toPersonId: 'parent', type: 'parent' },
        { id: 'missing', fromPersonId: 'unknown', toPersonId: 'child', type: 'parent' },
      ],
      persons,
    );

    assert.ok(issues.some((issue) => issue.code === 'relationship.parent_child_age'));
    assert.ok(issues.some((issue) => issue.code === 'relationship.person.missing'));
  });
});
