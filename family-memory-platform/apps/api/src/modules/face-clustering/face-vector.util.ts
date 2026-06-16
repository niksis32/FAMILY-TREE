import { createHash } from 'node:crypto';

/** MVP embedding: deterministic unit vector from face tag id (replaced by InsightFace in prod). */
export function buildMvpFaceVector(faceTagId: string, mediaId: string): number[] {
  const hash = createHash('sha256').update(`${faceTagId}:${mediaId}`).digest();
  const vector: number[] = [];
  for (let i = 0; i < 32; i++) {
    vector.push((hash[i] - 128) / 128);
  }
  let norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  if (norm === 0) norm = 1;
  return vector.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) dot += a[i]! * b[i]!;
  return dot;
}

export function clusterBySimilarity(
  items: Array<{ id: string; vector: number[] }>,
  threshold: number,
  minSize: number,
): Array<{ memberIds: string[]; centroid: number[] }> {
  const clusters: Array<{ memberIds: string[]; centroid: number[] }> = [];
  const assigned = new Set<string>();

  for (const item of items) {
    if (assigned.has(item.id)) continue;
    const members = [item.id];
    assigned.add(item.id);

    for (const other of items) {
      if (assigned.has(other.id)) continue;
      if (cosineSimilarity(item.vector, other.vector) >= threshold) {
        members.push(other.id);
        assigned.add(other.id);
      }
    }

    if (members.length >= minSize) {
      const vectors = members
        .map((id) => items.find((x) => x.id === id)?.vector)
        .filter((v): v is number[] => !!v);
      const dim = vectors[0]?.length ?? 0;
      const centroid = Array.from({ length: dim }, (_, i) =>
        vectors.reduce((s, v) => s + (v[i] ?? 0), 0) / vectors.length,
      );
      clusters.push({ memberIds: members, centroid });
    }
  }

  return clusters;
}
