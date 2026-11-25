export type GridDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Grid-aware D-pad target: one press selects the adjacent poster and scrolls it
 * into view at the same time, instead of letting the browser scroll first.
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
