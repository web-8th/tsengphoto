/**
 * Helpers for react-masonry-css.
 *
 * The library only supports round-robin placement (no height balancing).
 * We pack into columns ourselves, then pass one child per column to Masonry
 * so its round-robin keeps that packing intact.
 */

export type MasonryBreakpointCols = {
  default: number;
  [width: number]: number;
};

/** Mirror react-masonry-css breakpoint resolution. */
export function getMasonryColumnCount(
  breakpointCols: MasonryBreakpointCols,
  width: number
): number {
  let columns = breakpointCols.default;
  let matchedBreakpoint = Infinity;

  for (const breakpoint of Object.keys(breakpointCols)) {
    if (breakpoint === 'default') continue;
    const breakpointWidth = Number(breakpoint);
    if (
      Number.isFinite(breakpointWidth) &&
      breakpointWidth > 0 &&
      width <= breakpointWidth &&
      breakpointWidth < matchedBreakpoint
    ) {
      matchedBreakpoint = breakpointWidth;
      columns = breakpointCols[breakpointWidth];
    }
  }

  return Math.max(1, columns || 1);
}

/** Place each item into the currently shortest column. */
export function packMasonryColumns<T>(
  items: T[],
  columnCount: number,
  getHeight: (item: T) => number
): T[][] {
  const count = Math.max(1, columnCount);
  const columns: T[][] = Array.from({ length: count }, () => []);
  const heights = Array.from({ length: count }, () => 0);

  for (const item of items) {
    let target = 0;
    for (let i = 1; i < count; i++) {
      if (heights[i] < heights[target]) target = i;
    }
    columns[target].push(item);
    heights[target] += Math.max(getHeight(item), 0.01);
  }

  return columns;
}
