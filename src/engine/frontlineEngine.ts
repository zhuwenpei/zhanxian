import { getCachedNeighbors, getCachedBoundary } from './h3Cache';
import { CellState } from '../types/simulation';

export function calculateFrontlineEdges(cells: Record<string, CellState>): [number, number][][] {
  const processedPairs = new Set<string>();
  const lines: [number, number][][] = [];

  for (const cid in cells) {
    const cell = cells[cid];
    const neighbors = getCachedNeighbors(cid);

    // Fast check: Skip cells that have no enemy neighbors at all
    let hasBorder = false;
    for (let j = 0; j < neighbors.length; j++) {
      const n = neighbors[j];
      if (n !== cid && cells[n] && cells[n].owner !== cell.owner) {
        hasBorder = true;
        break;
      }
    }
    if (!hasBorder) continue;

    const b1 = getCachedBoundary(cid);

    for (let j = 0; j < neighbors.length; j++) {
      const n = neighbors[j];
      if (n === cid || !cells[n] || cells[n].owner === cell.owner) continue;

      const pairId = cid < n ? cid + n : n + cid;
      if (processedPairs.has(pairId)) continue;
      processedPairs.add(pairId);

      const b2 = getCachedBoundary(n);

      // Find shared vertices without excessive string allocation
      // H3 boundaries are always in order around the cell.
      const shared: [number, number][] = [];
      
      for (let k = 0; k < b1.length; k++) {
        const v1 = b1[k];
        for (let l = 0; l < b2.length; l++) {
          const v2 = b2[l];
          // Use a small epsilon for coordinate matching instead of toFixed strings
          if (Math.abs(v1[0] - v2[0]) < 0.0001 && Math.abs(v1[1] - v2[1]) < 0.0001) {
            shared.push(v1);
            break;
          }
        }
        if (shared.length >= 2) break;
      }

      if (shared.length >= 2) {
        lines.push([
          [shared[0][1], shared[0][0]],
          [shared[1][1], shared[1][0]]
        ]);
      }
    }
  }

  return lines;
}
