import { gridDisk, cellToBoundary, cellToLatLng } from 'h3-js';

const neighborsCache = new Map<string, string[]>();
const boundaryCache = new Map<string, [number, number][]>();
const latLngCache = new Map<string, [number, number]>();

export function getCachedNeighbors(cellId: string): string[] {
  let cached = neighborsCache.get(cellId);
  if (!cached) {
    cached = gridDisk(cellId, 1);
    neighborsCache.set(cellId, cached);
  }
  return cached;
}

export function getCachedBoundary(cellId: string): [number, number][] {
  let cached = boundaryCache.get(cellId);
  if (!cached) {
    cached = cellToBoundary(cellId);
    boundaryCache.set(cellId, cached);
  }
  return cached;
}

export function getCachedLatLng(cellId: string): [number, number] {
  let cached = latLngCache.get(cellId);
  if (!cached) {
    cached = cellToLatLng(cellId);
    latLngCache.set(cellId, cached);
  }
  return [cached[0], cached[1]];
}

export function clearH3Caches() {
  neighborsCache.clear();
  boundaryCache.clear();
  latLngCache.clear();
}
