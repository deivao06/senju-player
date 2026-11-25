export type GridDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Resolve the adjacent card inside a catalog grid.
 * A single D-pad press must select the neighbor and let the list scroll to it;
 * returning undefined at an edge preserves the existing menu/header fallback.
 */
export function gridNeighbor(
  index: number,
  direction: GridDirection,
  total: number,
  columns: number,
): number | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= total || columns < 1) return undefined;
  if (direction === 'left' && index % columns === 0) return undefined;
  if (direction === 'right' && index % columns === columns - 1) return undefined;
  const delta =
    direction === 'down' ? columns : direction === 'up' ? -columns : direction === 'right' ? 1 : -1;
  const next = index + delta;
  return next >= 0 && next < total ? next : undefined;
}
