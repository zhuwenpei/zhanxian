import { polygonToCells, cellsToMultiPolygon, getResolution, getHexagonAreaAvg, latLngToCell } from 'h3-js';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import { area } from '@turf/turf';

const H3_AVG_AREA_KM2: Record<number, number> = {
  15: 0.00000089,
  14: 0.0000062,
  13: 0.0000438,
  12: 0.000307,
  11: 0.002149,
  10: 0.015047,
  9: 0.105331,
  8: 0.737320,
  7: 5.161240,
  6: 36.12870,
  5: 252.9010,
  4: 1770.300,
  3: 12392.10,
  2: 86744.90
};

export function getOptimalResolution(
  redFeature: Feature<Polygon | MultiPolygon>,
  blueFeature: Feature<Polygon | MultiPolygon>,
  mapResolution: 'auto' | 'ultra' | 'detailed' | 'standard' | 'coarse' | 'neighborhood' | 'community' | 'street' | 'building' | 'room' = 'auto'
): number {
  const redArea = area(redFeature as any) / 1e6;
  const blueArea = area(blueFeature as any) / 1e6;

  // 1. Establish max cell capacity and maximum target resolution based on the precision presets
  let maxCap = 90000;
  let targetRes = 8;

  if (mapResolution === 'room') {
    maxCap = 9600000;
    targetRes = 15;
  } else if (mapResolution === 'building') {
    maxCap = 4800000;
    targetRes = 14;
  } else if (mapResolution === 'street') {
    maxCap = 2400000;
    targetRes = 13;
  } else if (mapResolution === 'community') {
    maxCap = 1200000;
    targetRes = 12;
  } else if (mapResolution === 'neighborhood') {
    maxCap = 600000;
    targetRes = 11;
  } else if (mapResolution === 'ultra') {
    maxCap = 450000;
    targetRes = 10;
  } else if (mapResolution === 'detailed') {
    maxCap = 240000;
    targetRes = 9;
  } else if (mapResolution === 'standard') {
    maxCap = 120000;
    targetRes = 8;
  } else if (mapResolution === 'coarse') {
    maxCap = 27000;
    targetRes = 6;
  } else { // 'auto'
    const totalArea = redArea + blueArea;
    if (totalArea < 0.005) { // under 5,000 m2 (very tiny room / building level)
      maxCap = 15000;
      targetRes = 15;
    } else if (totalArea < 0.05) { // under 50,000 m2 (micro building / facility level)
      maxCap = 15000;
      targetRes = 14;
    } else if (totalArea < 0.5) { // under 500,000 m2 (tactical street level)
      maxCap = 15000;
      targetRes = 13;
    } else if (totalArea < 5) { // under 5 km2 (micro community level)
      maxCap = 15000;
      targetRes = 12;
    } else if (totalArea < 50) { // under 50 km2 (urban neighborhood level)
      maxCap = 15000;
      targetRes = 11;
    } else if (totalArea < 500) { // under 500 km2 (small city / urban level)
      maxCap = 30000;
      targetRes = 10;
    } else if (totalArea < 5000) { // under 5,000 km2 (metropolitan / county level)
      maxCap = 60000;
      targetRes = 9;
    } else if (totalArea < 50000) { // under 50,000 km2 (province / standard level)
      maxCap = 120000;
      targetRes = 8;
    } else { // Large countries / global theater
      maxCap = 150000;
      targetRes = 6;
    }
  }

  // 2. Incrementally search down to resolution 2.
  // We prefer a resolution where BOTH sides have at least 1 cell to ensure an active battle.
  // If that's impossible (due to extreme asymmetry), we fallback to the highest resolution that fits the cap.
  let fallbackRes = 4;
  let fallbackFound = false;

  for (let r = targetRes; r >= 2; r--) {
    const avgArea = H3_AVG_AREA_KM2[r];
    if (!avgArea) continue;

    // Fast O(1) cell count estimation to prevent OOM
    const estimatedTotal = (redArea + blueArea) / avgArea;
    if (estimatedTotal > maxCap) {
      continue;
    }

    try {
      const redCells = featureToH3(redFeature, r);
      const blueCells = featureToH3(blueFeature, r);
      const total = redCells.length + blueCells.length;

      if (total > 0 && total <= maxCap) {
        if (redCells.length > 0 && blueCells.length > 0) {
          return r;
        }
        if (!fallbackFound) {
          fallbackRes = r;
          fallbackFound = true;
        }
      }
    } catch (e) {
      console.warn("H3 conversion error at resolution", r, e);
    }
  }

  return fallbackRes;
}

function getPolygonCenter(polygonCoords: number[][][]): [number, number] {
  const outerRing = polygonCoords[0];
  if (!outerRing || outerRing.length === 0) return [0, 0];
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  const limit = outerRing.length > 1 ? outerRing.length - 1 : outerRing.length;
  for (let i = 0; i < limit; i++) {
    sumLat += outerRing[i][0];
    sumLng += outerRing[i][1];
    count++;
  }
  return [sumLat / count, sumLng / count];
}

export function featureToH3(feature: Feature<Polygon | MultiPolygon>, res: number): string[] {
  const cells: string[] = [];
  
  const convertRing = (ring: number[][]): number[][] => {
    return ring.map(coord => [coord[1], coord[0]]);
  };
  
  const convertPolygon = (poly: number[][][]): number[][][] => {
    return poly.map(convertRing);
  };

  if (feature.geometry.type === 'Polygon') {
    const converted = convertPolygon(feature.geometry.coordinates);
    let newCells: string[] = [];
    try {
      newCells = polygonToCells(converted, res, false);
    } catch (e) {
      console.warn("polygonToCells failed, using fallback", e);
    }
    if (newCells.length === 0) {
      const center = getPolygonCenter(converted);
      try {
        const fallbackCell = latLngToCell(center[0], center[1], res);
        if (fallbackCell) newCells.push(fallbackCell);
      } catch (e) {
        console.error("latLngToCell failed in fallback", e);
      }
    }
    for (let i = 0; i < newCells.length; i++) {
      cells.push(newCells[i]);
    }
  } else if (feature.geometry.type === 'MultiPolygon') {
    for (const polygon of feature.geometry.coordinates) {
      const converted = convertPolygon(polygon);
      let newCells: string[] = [];
      try {
        newCells = polygonToCells(converted, res, false);
      } catch (e) {
        console.warn("polygonToCells failed for multipolygon, using fallback", e);
      }
      if (newCells.length === 0) {
        const center = getPolygonCenter(converted);
        try {
          const fallbackCell = latLngToCell(center[0], center[1], res);
          if (fallbackCell) newCells.push(fallbackCell);
        } catch (e) {
          console.error("latLngToCell failed in fallback", e);
        }
      }
      for (let i = 0; i < newCells.length; i++) {
        cells.push(newCells[i]);
      }
    }
  }
  return cells;
}

const multiPolyCache = new Map<string, Feature<Polygon | MultiPolygon>>();

export function h3ToMultiPolygonFeature(cells: string[]): Feature<Polygon | MultiPolygon> {
  if (!cells || cells.length === 0) {
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'MultiPolygon', coordinates: [] }
    };
  }

  // Build a fast cache key based on array length + first/middle/last samples + sum hash
  const len = cells.length;
  let sampleKey = `${len}:${cells[0]}:${cells[len - 1]}`;
  if (len > 4) {
    sampleKey += `:${cells[Math.floor(len / 4)]}:${cells[Math.floor(len / 2)]}:${cells[Math.floor((3 * len) / 4)]}`;
  }
  
  const cached = multiPolyCache.get(sampleKey);
  if (cached) return cached;

  let resultFeature: Feature<Polygon | MultiPolygon>;
  try {
    const coords = cellsToMultiPolygon(cells, true);
    if (coords && coords.length > 0) {
      resultFeature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'MultiPolygon',
          coordinates: coords
        }
      };
      multiPolyCache.set(sampleKey, resultFeature);
      if (multiPolyCache.size > 200) {
        const first = multiPolyCache.keys().next().value;
        if (first) multiPolyCache.delete(first);
      }
      return resultFeature;
    }
  } catch (err) {
    console.warn("h3ToMultiPolygonFeature merging failed, falling back to individual hexagons:", err);
  }

  // Robust fallback: render each cell as an individual polygon, preventing any holes or rendering failures
  const fallbackCoords = cells
    .map(c => {
      try {
        const poly = cellsToMultiPolygon([c], false);
        return poly && poly[0];
      } catch (e) {
        return null;
      }
    })
    .filter((poly): poly is any => poly !== null && poly.length > 0);

  resultFeature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: fallbackCoords
    }
  };
  multiPolyCache.set(sampleKey, resultFeature);
  return resultFeature;
}
