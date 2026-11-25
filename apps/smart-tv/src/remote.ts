import { gridNeighbor, type GridDirection } from './gridFocus';

export function isBack(event: Pick<KeyboardEvent, 'key' | 'keyCode'>) {
  return (
    event.key === 'Escape' ||
    event.key === 'BrowserBack' ||
    event.keyCode === 10009 ||
    event.keyCode === 461
  );
}
export type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
const gridDirection = (direction: Direction) =>
  direction.replace('Arrow', '').toLowerCase() as GridDirection;
/** Geometry-based movement, restricted to the active dialog/screen. Native IME owns text fields. */
export function moveFocus(direction: Direction) {
  const current = document.activeElement as HTMLElement | null;
  if (
    current?.matches('input:not([type=checkbox]):not([type=range]),textarea') &&
    (direction === 'ArrowLeft' || direction === 'ArrowRight')
  )
    return false;
  // In the catalog, resolve the exact adjacent poster first: focus and scroll happen
  // in the same key press instead of the browser scrolling before focus moves.
  const poster = current?.classList.contains('poster') ? current : null;
  const grid = poster?.closest<HTMLElement>('.grid');
  if (poster && grid) {
    const posters = Array.from(grid.querySelectorAll<HTMLElement>('.poster'));
    const index = posters.indexOf(poster);
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
    const next = gridNeighbor(index, gridDirection(direction), posters.length, columns);
    if (next !== undefined) {
      const target = posters[next];
      target?.focus();
      target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return true;
    }
  }
  const scope = document.querySelector('[data-focus-scope]') || document;
  const nodes = Array.from(
    scope.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input,select,summary,[tabindex="0"]',
    ),
  ).filter((node) => node.getClientRects().length > 0);
  if (!current || !nodes.includes(current)) {
    nodes[0]?.focus();
    return true;
  }
  const rect = current.getBoundingClientRect();
  const x = rect.x + rect.width / 2,
    y = rect.y + rect.height / 2;
  const horizontal = direction === 'ArrowLeft' || direction === 'ArrowRight';
  const sign = direction === 'ArrowLeft' || direction === 'ArrowUp' ? -1 : 1;
  let best: HTMLElement | undefined,
    score = Infinity;
  for (const node of nodes) {
    if (node === current) continue;
    const r = node.getBoundingClientRect(),
      dx = r.x + r.width / 2 - x,
      dy = r.y + r.height / 2 - y;
    const primary = (horizontal ? dx : dy) * sign,
      secondary = Math.abs(horizontal ? dy : dx);
    if (primary < 2) continue;
    const value = primary + secondary * 3;
    if (value < score) {
      score = value;
      best = node;
    }
  }
  best?.focus();
  best?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  return true;
}
