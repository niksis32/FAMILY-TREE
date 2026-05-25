import type { ThreeLayoutResult } from '@family/tree-experience';
import type { CameraWaypoint } from './use-tree-3d-store';

export function buildCameraTour(
  layout: ThreeLayoutResult,
  rootPersonId: string | null,
): CameraWaypoint[] {
  const { bounds, layers, nodes } = layout;
  const spanX = Math.max(bounds.maxX - bounds.minX, 6);
  const spanY = Math.max(bounds.maxY - bounds.minY, 4);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  const waypoints: CameraWaypoint[] = [
    {
      position: [centerX, centerY + spanY * 0.8 + 8, centerZ + spanX * 1.4 + 14],
      target: [centerX, centerY, centerZ],
      label: 'overview',
    },
  ];

  const sortedLayers = [...layers].sort((a, b) => a.generation - b.generation);
  for (const layer of sortedLayers) {
    const layerNodes = nodes.filter((n) => n.generation === layer.generation);
    if (layerNodes.length === 0) continue;
    const lx =
      layerNodes.reduce((sum, n) => sum + n.x, 0) / layerNodes.length;
    const lz =
      layerNodes.reduce((sum, n) => sum + n.z, 0) / layerNodes.length;
    waypoints.push({
      position: [lx + spanX * 0.35, layer.y + 5, lz + spanX * 0.9 + 10],
      target: [lx, layer.y, lz],
      label: layer.label,
    });
  }

  if (rootPersonId) {
    const root = nodes.find((n) => n.personId === rootPersonId);
    if (root) {
      waypoints.push({
        position: [root.x + 3, root.y + 2.5, root.z + 7],
        target: [root.x, root.y, root.z],
        label: 'root',
      });
    }
  }

  waypoints.push({
    position: [centerX - spanX * 0.6, centerY + spanY * 0.5 + 6, centerZ + spanX + 12],
    target: [centerX, centerY, centerZ],
    label: 'finale',
  });

  return waypoints;
}
