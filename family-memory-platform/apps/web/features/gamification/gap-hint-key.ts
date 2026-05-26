/** Maps API hintKey to gamification.missingData namespace key */
export function gapHintMessageKey(hintKey: string): string {
  return hintKey
    .replace('gamification.missingData.gaps.', 'gaps.')
    .replace('gamification.gaps.', 'gaps.');
}
