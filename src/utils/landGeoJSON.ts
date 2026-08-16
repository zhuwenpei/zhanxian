import { feature } from 'topojson-client';
import countriesData from 'world-atlas/countries-50m.json';
import * as turf from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

let cachedLandFeatures: Feature<Polygon | MultiPolygon>[] | null = null;
let cachedLandMultiPoly: Feature<MultiPolygon> | null = null;

export function getWorldLandFeatures(): Feature<Polygon | MultiPolygon>[] {
  if (cachedLandFeatures) return cachedLandFeatures;
  const fc = feature(countriesData as any, (countriesData as any).objects.countries) as any;
  cachedLandFeatures = fc.features || [];
  return cachedLandFeatures!;
}

export function getWorldLandMultiPolygon(): Feature<MultiPolygon> {
  if (cachedLandMultiPoly) return cachedLandMultiPoly;
  const features = getWorldLandFeatures();
  const allCoords: any[] = [];
  features.forEach((f: any) => {
    if (f.geometry.type === 'Polygon') {
      allCoords.push(f.geometry.coordinates);
    } else if (f.geometry.type === 'MultiPolygon') {
      for (let i = 0; i < f.geometry.coordinates.length; i++) {
        allCoords.push(f.geometry.coordinates[i]);
      }
    }
  });
  cachedLandMultiPoly = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: allCoords
    }
  };
  return cachedLandMultiPoly;
}

/**
 * Checks if [lng, lat] is located on land.
 */
export function isPointOnLand(lng: number, lat: number): boolean {
  const pt = turf.point([lng, lat]);
  const features = getWorldLandFeatures();
  for (let i = 0; i < features.length; i++) {
    if (turf.booleanPointInPolygon(pt, features[i] as any)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if [lng, lat] is located over sea/ocean.
 */
export function isPointInSea(lng: number, lat: number): boolean {
  return !isPointOnLand(lng, lat);
}

/**
 * Given a landing beachhead coordinate [landingLng, landingLat] and target inland coordinate [targetLng, targetLat],
 * samples radial points away into the sea to ensure the landing arrow's start point is strictly over the water.
 */
export function findSeaStartingPoint(
  landingLng: number,
  landingLat: number,
  targetLng: number,
  targetLat: number,
  distanceDegrees: number = 0.25
): { startLng: number; startLat: number } {
  const dx = landingLng - targetLng;
  const dy = landingLat - targetLat;
  const len = Math.hypot(dx, dy);
  
  // Base angle points away from target (towards attacker mainland, or at least outward)
  const baseAngle = len > 0.001 ? Math.atan2(dy, dx) : 0;
  
  // We want to find the closest sea direction. We check 360 degrees.
  const anglesToTry: number[] = [0];
  for (let i = 1; i <= 16; i++) {
    const delta = (i * Math.PI) / 16; // 11.25 degree increments
    anglesToTry.push(delta);
    anglesToTry.push(-delta);
  }

  // Check small radius first to find the true coastline normal without jumping across islands
  const testRadius = 0.05; 
  let bestAngle = baseAngle;
  let foundSea = false;

  for (const delta of anglesToTry) {
    const angle = baseAngle + delta;
    const testLng = landingLng + testRadius * Math.cos(angle);
    const testLat = landingLat + testRadius * Math.sin(angle);
    if (isPointInSea(testLng, testLat)) {
      bestAngle = angle;
      foundSea = true;
      break;
    }
  }

  // If no sea found at small radius, just fallback to baseAngle
  if (!foundSea) {
    bestAngle = baseAngle;
  }

  return {
    startLng: landingLng + distanceDegrees * Math.cos(bestAngle),
    startLat: landingLat + distanceDegrees * Math.sin(bestAngle)
  };
}
