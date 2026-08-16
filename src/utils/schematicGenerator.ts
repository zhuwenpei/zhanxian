import * as turf from '@turf/turf';
import { ReplayFrame, CellState, SideState } from '../types/simulation';
import { getCachedLatLng } from '../engine/h3Cache';
import { h3ToMultiPolygonFeature } from '../engine/gridEngine';
import { findSeaStartingPoint } from './landGeoJSON';

export interface PhaseArrowFeature {
  type: 'Feature';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: {
    phase: 1 | 2 | 3 | 4 | 5;
    side: 'red' | 'blue';
    color: string;
    label: string;
  };
}

export interface PhaseFrontlineFeature {
  type: 'Feature';
  geometry: GeoJSON.MultiLineString | GeoJSON.LineString;
  properties: {
    phase: 1 | 2 | 3 | 4 | 5;
    color: string;
    dasharray: string;
    label: string;
  };
}

export interface KeyBattlefield {
  id: string;
  name: string;
  phase: number;
  date: string;
  lng: number;
  lat: number;
  redForces: number;
  blueForces: number;
  redLosses: number;
  blueLosses: number;
}

export interface SchematicData {
  title: string;
  subtitle: string;
  numPhases: number;
  phase1Arrows: GeoJSON.FeatureCollection;
  phase2Arrows: GeoJSON.FeatureCollection;
  phase3Arrows: GeoJSON.FeatureCollection;
  phase4Arrows: GeoJSON.FeatureCollection;
  phase5Arrows: GeoJSON.FeatureCollection;
  enemyRetreatArrows: GeoJSON.FeatureCollection;
  phase1Frontline: GeoJSON.FeatureCollection;
  phase2Frontline: GeoJSON.FeatureCollection;
  phase3Frontline: GeoJSON.FeatureCollection;
  phase4Frontline: GeoJSON.FeatureCollection;
  phase5Frontline: GeoJSON.FeatureCollection;
  phase1Territory: GeoJSON.FeatureCollection;
  phase2Territory: GeoJSON.FeatureCollection;
  phase3Territory: GeoJSON.FeatureCollection;
  phase4Territory: GeoJSON.FeatureCollection;
  phase5Territory: GeoJSON.FeatureCollection;
  redOriginalTerritory: GeoJSON.FeatureCollection;
  blueOriginalTerritory: GeoJSON.FeatureCollection;
  encirclementZones: GeoJSON.FeatureCollection;
  militaryMarkers: GeoJSON.FeatureCollection;
  keyBattlefields: KeyBattlefield[];
  bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

// Generate smooth curved arrow polygon with optional multi-head splits
export function createCurvedArrowPolygon(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
  curveAmount: number = 0.2,
  headWidth: number = 0.06, // Reduced from 0.12
  baseWidth: number = 0.04, // Reduced from 0.06
  isMultiHead: boolean = false
): GeoJSON.Polygon {
  // Vector calculations
  const dx = endLng - startLng;
  const dy = endLat - startLat;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return turf.polygon([[[startLng, startLat], [startLng + 0.01, startLat], [startLng, startLat + 0.01], [startLng, startLat]]]).geometry as GeoJSON.Polygon;

  const nx = -dy / len; // Normal vector
  const ny = dx / len;

  // Midpoint with curved offset
  const midLng = (startLng + endLng) / 2 + nx * len * curveAmount;
  const midLat = (startLat + endLat) / 2 + ny * len * curveAmount;

  // Sample points along quadratic Bezier
  const steps = 30;
  const curvePts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const invT = 1 - t;
    const x = invT * invT * startLng + 2 * invT * t * midLng + t * t * endLng;
    const y = invT * invT * startLat + 2 * invT * t * midLat + t * t * endLat;
    curvePts.push([x, y]);
  }

  const leftEdge: [number, number][] = [];
  const rightEdge: [number, number][] = [];

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const [p1x, p1y] = curvePts[i];
    const [p2x, p2y] = curvePts[i + 1];
    const tangentX = p2x - p1x;
    const tangentY = p2y - p1y;
    const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
    const normX = -tangentY / tangentLen;
    const normY = tangentX / tangentLen;

    // Taper from narrow (30% of baseWidth) to wide (baseWidth)
    const w = baseWidth * (0.3 + t * 0.7);

    leftEdge.push([p1x + normX * w, p1y + normY * w]);
    rightEdge.push([p1x - normX * w, p1y - normY * w]);
  }

  const tip = curvePts[steps];
  const prev = curvePts[steps - 1];
  const tX = tip[0] - prev[0];
  const tY = tip[1] - prev[1];
  const tLen = Math.sqrt(tX * tX + tY * tY) || 1;
  const nX = -tY / tLen;
  const nY = tX / tLen;

  if (isMultiHead) {
    // Multi-head split (creates a 3-pronged attack head)
    const hL1 = [tip[0] + nX * headWidth * 1.4 - (tX / tLen) * headWidth * 0.8, tip[1] + nY * headWidth * 1.4 - (tY / tLen) * headWidth * 0.8] as [number, number];
    const hL2 = [tip[0] + nX * headWidth * 0.6, tip[1] + nY * headWidth * 0.6] as [number, number];
    const tipCenter = [tip[0] + (tX / tLen) * headWidth * 1.2, tip[1] + (tY / tLen) * headWidth * 1.2] as [number, number];
    const hR2 = [tip[0] - nX * headWidth * 0.6, tip[1] - nY * headWidth * 0.6] as [number, number];
    const hR1 = [tip[0] - nX * headWidth * 1.4 - (tX / tLen) * headWidth * 0.8, tip[1] - nY * headWidth * 1.4 - (tY / tLen) * headWidth * 0.8] as [number, number];

    const polyRing = [
      ...leftEdge,
      hL1, hL2, tipCenter, hR2, hR1,
      ...rightEdge.reverse(),
      leftEdge[0]
    ];
    return { type: 'Polygon', coordinates: [polyRing] };
  } else {
    // Standard sharp military arrow head
    const headLeft = [tip[0] + nX * headWidth - (tX / tLen) * headWidth * 0.9, tip[1] + nY * headWidth - (tY / tLen) * headWidth * 0.9] as [number, number];
    const arrowTip = [tip[0] + (tX / tLen) * headWidth * 1.1, tip[1] + (tY / tLen) * headWidth * 1.1] as [number, number];
    const headRight = [tip[0] - nX * headWidth - (tX / tLen) * headWidth * 0.9, tip[1] - nY * headWidth - (tY / tLen) * headWidth * 0.9] as [number, number];

    const polyRing = [
      ...leftEdge,
      headLeft, arrowTip, headRight,
      ...rightEdge.reverse(),
      leftEdge[0]
    ];
    return { type: 'Polygon', coordinates: [polyRing] };
  }
}

export function generateSchematicData(
  red: SideState,
  blue: SideState,
  history: ReplayFrame[],
  cells: Record<string, CellState>,
  startDate: string,
  endDate: string,
  zoom: number = 6
): SchematicData {
  // Calculate maximum geographic span of the conflict region dynamically first
  let globalMaxSpan = 0.35;
  const allLngsInit: number[] = [];
  const allLatsInit: number[] = [];
  for (const cid in cells) {
    const [lat, lng] = getCachedLatLng(cid);
    allLngsInit.push(lng);
    allLatsInit.push(lat);
  }
  if (allLngsInit.length > 0) {
    let minLngI = Infinity, maxLngI = -Infinity;
    let minLatI = Infinity, maxLatI = -Infinity;
    for (let i = 0; i < allLngsInit.length; i++) {
      if (allLngsInit[i] < minLngI) minLngI = allLngsInit[i];
      if (allLngsInit[i] > maxLngI) maxLngI = allLngsInit[i];
      if (allLatsInit[i] < minLatI) minLatI = allLatsInit[i];
      if (allLatsInit[i] > maxLatI) maxLatI = allLatsInit[i];
    }
    const spanLngI = maxLngI - minLngI;
    const spanLatI = maxLatI - minLatI;
    globalMaxSpan = Math.max(0.0001, Math.max(spanLngI, spanLatI));
  }

  const zoomFactor = Math.pow(2, 6 - zoom);
  const spanScale = Math.min(1.0, Math.max(0.005, globalMaxSpan / 2.0));
  const calculatedBaseWidth = Math.max(0.0002, Math.min(0.5, 0.11 * zoomFactor * spanScale));
  const calculatedHeadWidth = Math.max(0.0004, Math.min(0.75, 0.18 * zoomFactor * spanScale));

  const title = `${red.countryName || '红方'} 与 ${blue.countryName || '蓝方'} 战役示意图`;
  const subtitle = `(${startDate || '1949年'} - ${endDate || '推演结束'})`;

  const totalFrames = history.length || 1;
  const numPhases = totalFrames <= 12 ? 3 : (totalFrames <= 28 ? 4 : 5);

  const getIdx = (frac: number) => Math.min(totalFrames - 1, Math.max(0, Math.floor(totalFrames * frac)));

  let p1Index = getIdx(0.20), p2Index = getIdx(0.40), p3Index = getIdx(0.60), p4Index = getIdx(0.80), p5Index = totalFrames - 1;
  if (numPhases === 3) {
    p1Index = getIdx(0.33);
    p2Index = getIdx(0.66);
    p3Index = totalFrames - 1;
    p4Index = totalFrames - 1;
    p5Index = totalFrames - 1;
  } else if (numPhases === 4) {
    p1Index = getIdx(0.25);
    p2Index = getIdx(0.50);
    p3Index = getIdx(0.75);
    p4Index = totalFrames - 1;
    p5Index = totalFrames - 1;
  }

  const defaultFrame: ReplayFrame = {
    tick: 0,
    currentDate: startDate,
    redActiveTroops: red.activeTroops || 0,
    redReserveTroops: red.reserveTroops || 0,
    redLosses: 0,
    blueActiveTroops: blue.activeTroops || 0,
    blueReserveTroops: blue.reserveTroops || 0,
    blueLosses: 0,
    redCells: 0,
    blueCells: 0,
    cellOwners: {},
    frontlineEdges: []
  };

  const f0 = history[0] || defaultFrame;
  const f1 = history[p1Index] || f0;
  const f2 = history[p2Index] || f1;
  const f3 = history[p3Index] || f2;
  const f4 = history[p4Index] || f3;
  const f5 = history[p5Index] || f4;

  // Helper to get captured points and cell IDs per phase
  const getCapturedData = (startFrame: ReplayFrame, endFrame: ReplayFrame) => {
    const changesBySide: Record<'red' | 'blue', { pos: [number, number], isLanding: boolean }[]> = { red: [], blue: [] };
    const cellIdsBySide: Record<'red' | 'blue', string[]> = { red: [], blue: [] };
    const currOwners = endFrame.cellOwners || {};
    const prevOwners = startFrame.cellOwners || {};

    for (const cid in currOwners) {
      const oNow = currOwners[cid];
      const oPrev = prevOwners[cid];
      if (oNow && oPrev && oNow !== oPrev) {
        const [lat, lng] = getCachedLatLng(cid);
        const cell = cells[cid];
        changesBySide[oNow].push({ 
          pos: [lng, lat], 
          isLanding: !!(cell?.isLandingCell || cell?.isMainlandLanding) 
        });
        cellIdsBySide[oNow].push(cid);
      }
    }
    return { points: changesBySide, cellIds: cellIdsBySide };
  };

  const p1Data = getCapturedData(f0, f1);
  const p2Data = getCapturedData(f1, f2);
  const p3Data = getCapturedData(f2, f3);
  const p4Data = getCapturedData(f3, f4);
  const p5Data = getCapturedData(f4, f5);

  const p1Changes = p1Data.points;
  const p2Changes = p2Data.points;
  const p3Changes = p3Data.points;
  const p4Changes = p4Data.points;
  const p5Changes = p5Data.points;

  const getPosList = (changes: { pos: [number, number], isLanding: boolean }[]) => changes.map(c => c.pos);

  // Build Phase Captured Territory Polygons for Hatching
  const buildTerritoryFeatureCollection = (cellIds: Record<'red' | 'blue', string[]>, phaseNum: number) => {
    const features: GeoJSON.Feature[] = [];
    const colors = ['#dc2626', '#ea580c', '#f59e0b', '#10b981', '#a855f7'];
    const selectedColor = colors[Math.min(phaseNum - 1, colors.length - 1)];

    if (cellIds.red.length > 0) {
      const poly = h3ToMultiPolygonFeature(cellIds.red);
      if (poly.geometry.coordinates && poly.geometry.coordinates.length > 0) {
        features.push(turf.feature(poly.geometry, { phase: phaseNum, side: 'red', color: selectedColor }));
      }
    }
    if (cellIds.blue.length > 0) {
      const poly = h3ToMultiPolygonFeature(cellIds.blue);
      if (poly.geometry.coordinates && poly.geometry.coordinates.length > 0) {
        features.push(turf.feature(poly.geometry, { phase: phaseNum, side: 'blue', color: '#2563eb' }));
      }
    }
    return turf.featureCollection(features);
  };

  const phase1Territory = buildTerritoryFeatureCollection(p1Data.cellIds, 1);
  const phase2Territory = numPhases >= 2 ? buildTerritoryFeatureCollection(p2Data.cellIds, 2) : turf.featureCollection([]);
  const phase3Territory = numPhases >= 3 ? buildTerritoryFeatureCollection(p3Data.cellIds, 3) : turf.featureCollection([]);
  const phase4Territory = numPhases >= 4 ? buildTerritoryFeatureCollection(p4Data.cellIds, 4) : turf.featureCollection([]);
  const phase5Territory = numPhases >= 5 ? buildTerritoryFeatureCollection(p5Data.cellIds, 5) : turf.featureCollection([]);

  // Calculate actual initial border cells between red and blue at tick 0 based on initial owners
  const initialRedBorderPts: [number, number][] = [];
  const initialBlueBorderPts: [number, number][] = [];
  const initialOwners = f0.cellOwners || {};

  for (const cid in cells) {
    const owner0 = initialOwners[cid] || cells[cid].originalOwner || cells[cid].owner;
    const [lat, lng] = getCachedLatLng(cid);
    let isBorder = false;
    const neighbors = cells[cid].neighbors || [];
    for (const nid of neighbors) {
      const neighborOwner = initialOwners[nid] || (cells[nid] && (cells[nid].originalOwner || cells[nid].owner));
      if (neighborOwner && neighborOwner !== owner0) {
        isBorder = true;
        break;
      }
    }
    if (isBorder) {
      if (owner0 === 'red') initialRedBorderPts.push([lng, lat]);
      else if (owner0 === 'blue') initialBlueBorderPts.push([lng, lat]);
    }
  }

  // Fallback to all cells if no specific border neighbor found
  if (initialRedBorderPts.length === 0) {
    for (const cid in cells) {
      const owner0 = initialOwners[cid] || cells[cid].originalOwner || cells[cid].owner;
      if (owner0 === 'red') {
        const [lat, lng] = getCachedLatLng(cid);
        initialRedBorderPts.push([lng, lat]);
      }
    }
  }
  if (initialBlueBorderPts.length === 0) {
    for (const cid in cells) {
      const owner0 = initialOwners[cid] || cells[cid].originalOwner || cells[cid].owner;
      if (owner0 === 'blue') {
        const [lat, lng] = getCachedLatLng(cid);
        initialBlueBorderPts.push([lng, lat]);
      }
    }
  }

  // Dynamic clustering distance: standard is 0.35, but scales down for smaller regions
  const dynamicClusteringDistance = Math.max(0.005, Math.min(0.35, globalMaxSpan / 5.0));

  // Spatial clustering helper to split captured cells into operational thrust clusters without strict limits
  const clusterPoints = (pts: [number, number][], maxClusters = 12): [number, number][][] => {
    if (pts.length === 0) return [];
    
    // Scale targetMax based on the number of points to ensure long fronts get enough arrows
    const dynamicLimit = Math.max(8, Math.min(40, Math.floor(pts.length / 12)));
    const targetMax = Math.max(maxClusters, dynamicLimit);
    
    // For single points or if there's only 1 point, return immediately
    if (pts.length <= 1) return pts.map(p => [p]);

    let currentDist = dynamicClusteringDistance;
    let clusters: [number, number][][] = [];
    
    // Attempt to achieve a healthy division of forces, especially in small regions (small countries)
    // where they'd otherwise merge into a single massive cluster
    const minDesiredClusters = Math.min(pts.length, 10);
    for (let attempt = 0; attempt < 5; attempt++) {
      clusters = [];
      const used = new Array(pts.length).fill(false);

      for (let i = 0; i < pts.length; i++) {
        if (used[i]) continue;
        const currentCluster: [number, number][] = [pts[i]];
        used[i] = true;

        for (let j = i + 1; j < pts.length; j++) {
          if (used[j]) continue;
          const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
          if (d < currentDist) {
            currentCluster.push(pts[j]);
            used[j] = true;
          }
        }
        clusters.push(currentCluster);
      }

      if (clusters.length >= minDesiredClusters) {
        break;
      }
      currentDist *= 0.5; // Shrink search radius iteratively
    }

    // Sort by cluster size and geographic position for logical chronological sequencing
    clusters.sort((a, b) => b.length - a.length);
    return clusters.slice(0, targetMax);
  };

  const buildPhaseArrowFeatures = (
    ptsWithData: { pos: [number, number], isLanding: boolean }[],
    phaseNum: number,
    color: string,
    side: 'red' | 'blue'
  ) => {
    const features: GeoJSON.Feature[] = [];
    if (ptsWithData.length === 0) return features;

    const pts = ptsWithData.map(p => p.pos);
    // Dynamically decide base clusters based on capture volume
    const dynamicBase = Math.max(12, Math.min(32, Math.floor(pts.length / 10)));
    const clusters = clusterPoints(pts, dynamicBase);

    let borderCandidates: [number, number][] = side === 'red' ? initialRedBorderPts : initialBlueBorderPts;
    if (phaseNum === 2 && p1Changes[side].length > 0) borderCandidates = p1Changes[side].map(c => c.pos);
    if (phaseNum === 3 && p2Changes[side].length > 0) borderCandidates = p2Changes[side].map(c => c.pos);
    if (phaseNum === 4 && p3Changes[side].length > 0) borderCandidates = p3Changes[side].map(c => c.pos);
    if (phaseNum === 5 && p4Changes[side].length > 0) borderCandidates = p4Changes[side].map(c => c.pos);

    clusters.forEach((cluster, idx) => {
      if (cluster.length === 0) return;

      const avgTargetLng = cluster.reduce((sum, p) => sum + p[0], 0) / cluster.length;
      const avgTargetLat = cluster.reduce((sum, p) => sum + p[1], 0) / cluster.length;

      // Find nearest border/territory candidate point of this side to determine true attack vector
      const baseBorderCandidates = (side === 'red' ? initialRedBorderPts : initialBlueBorderPts);
      let nearestBp: [number, number] | null = null;
      let minDistToBp = Infinity;

      const candidatesToSearch = (borderCandidates.length > 0 ? borderCandidates : baseBorderCandidates);
      candidatesToSearch.forEach(bp => {
        const d = Math.hypot(bp[0] - avgTargetLng, bp[1] - avgTargetLat);
        if (d < minDistToBp) {
          minDistToBp = d;
          nearestBp = bp;
        }
      });

      if (!nearestBp && baseBorderCandidates.length > 0) {
        baseBorderCandidates.forEach(bp => {
          const d = Math.hypot(bp[0] - avgTargetLng, bp[1] - avgTargetLat);
          if (d < minDistToBp) {
            minDistToBp = d;
            nearestBp = bp;
          }
        });
      }

      // Attack vector from attacker's border towards target cluster
      let vecX = side === 'red' ? 1.0 : -1.0;
      let vecY = 0.0;
      if (nearestBp && minDistToBp > 0.0001) {
        vecX = (avgTargetLng - nearestBp[0]) / minDistToBp;
        vecY = (avgTargetLat - nearestBp[1]) / minDistToBp;
      }

      // Default fallback coordinates scale down with the size of the country
      let startLng = avgTargetLng - vecX * Math.min(0.25, globalMaxSpan * 0.25);
      let startLat = avgTargetLat - vecY * Math.min(0.25, globalMaxSpan * 0.25);

      const clusterData = cluster.map(cp => {
        return ptsWithData.find(pd => pd.pos[0] === cp[0] && pd.pos[1] === cp[1]);
      });
      const landingCells = clusterData.filter(d => d?.isLanding);
      
      // A cluster is a landing if it contains landing cells AND the attacker was not already adjacent by land
      // We use minDistToBp > 0.15 (approx 16km) to differentiate between cross-border push and landing
      const isActuallyLanding = (landingCells.length > 0 || clusterData.some(d => d?.isLanding)) && minDistToBp > 0.15;

      if (isActuallyLanding) {
        // Landing arrow starts exactly close to the coastline (using tiny offset)
        const distanceDegrees = Math.max(0.003, Math.min(0.012, globalMaxSpan * 0.03));
        if (landingCells.length > 0) {
          const avgLandingLng = landingCells.reduce((s, c) => s + c!.pos[0], 0) / landingCells.length;
          const avgLandingLat = landingCells.reduce((s, c) => s + c!.pos[1], 0) / landingCells.length;
          
          let dirX = avgLandingLng - avgTargetLng;
          let dirY = avgLandingLat - avgTargetLat;
          if (Math.hypot(dirX, dirY) < 0.001) {
            dirX = -vecX;
            dirY = -vecY;
          }

          // Landing arrow MUST originate strictly from sea (water) pointing to beachhead/inland
          const seaPt = findSeaStartingPoint(avgLandingLng, avgLandingLat, avgLandingLng - dirX, avgLandingLat - dirY, distanceDegrees);
          startLng = seaPt.startLng;
          startLat = seaPt.startLat;
        } else {
          const seaPt = findSeaStartingPoint(avgTargetLng, avgTargetLat, avgTargetLng + vecX * 0.2, avgTargetLat + vecY * 0.2, distanceDegrees);
          startLng = seaPt.startLng;
          startLat = seaPt.startLat;
        }
      } else if (nearestBp) {
        // Not a landing: Ensure arrow starts at the border candidate
        startLng = nearestBp[0];
        startLat = nearestBp[1];
      }

      // Determine correct direction of advance and project all points in the cluster to find the furthest advanced frontpoint
      let endLng = avgTargetLng;
      let endLat = avgTargetLat;
      const targetDirX = avgTargetLng - startLng;
      const targetDirY = avgTargetLat - startLat;
      const targetLen = Math.hypot(targetDirX, targetDirY);

      if (targetLen > 0.0001) {
        const ux = targetDirX / targetLen;
        const uy = targetDirY / targetLen;

        // Find the cell in the cluster that is furthest along this attack direction (advancing borderline)
        let maxScore = -Infinity;
        let bestCp: [number, number] | null = null;
        
        cluster.forEach(cp => {
          const score = (cp[0] - startLng) * ux + (cp[1] - startLat) * uy;
          if (score > maxScore) {
            maxScore = score;
            bestCp = cp;
          }
        });

        if (bestCp) {
          endLng = bestCp[0];
          endLat = bestCp[1];
        }
      }

      let dist = Math.hypot(endLng - startLng, endLat - startLat);
      
      // Scale minimum arrow distance dynamically based on the maxSpan of the country
      const minArrowDist = Math.max(0.0005, Math.min(0.005, globalMaxSpan * 0.02));
      if (dist < minArrowDist) return;

      // If it's a massive jump, restrict the arrow length so it doesn't cross the whole map.
      // Crucial: Cap the arrow by shifting the END (head) backward towards the start, NOT shifting the start!
      const MAX_ARROW_DIST = Math.max(0.05, Math.min(1.2, globalMaxSpan * 0.85));
      if (dist > MAX_ARROW_DIST) {
        const ratio = MAX_ARROW_DIST / dist;
        endLng = startLng + (endLng - startLng) * ratio;
        endLat = startLat + (endLat - startLat) * ratio;
        dist = MAX_ARROW_DIST;
      }

      const baseCurves = [0.12, 0.2, -0.15, 0.25, -0.2, 0.08, -0.08, 0.18];
      const curve = baseCurves[idx % baseCurves.length];

      // Scale arrow head and base widths dynamically to prevent arrow distortion on short paths
      const scaleByLength = Math.min(1.0, dist / Math.max(0.001, calculatedHeadWidth * 1.5));
      const arrowHeadWidth = Math.max(0.0005, calculatedHeadWidth * scaleByLength);
      const arrowBaseWidth = Math.max(0.0003, calculatedBaseWidth * scaleByLength);

      const arrowGeom = createCurvedArrowPolygon(
        startLng, startLat,
        endLng, endLat,
        curve,
        arrowHeadWidth,
        arrowBaseWidth,
        false
      );

      const isStalemateOrCounter = pts.length < 2 || (side === 'red' && p1Changes.blue.length > p1Changes.red.length);
      const chronologicalLabels = isStalemateOrCounter ? [
        '第一波次：防御坚守与节点巩固',
        '第二波次：战线拉锯与火力消耗',
        '第三波次：局部反击与阵地争夺',
        '第四波次：预备集群快速驰援',
        '第五波次：战略纵深稳固防线'
      ] : [
        '第一波次：首要突破口强渡撕裂',
        '第二波次：战线横向扩张与突破',
        '第三波次：纵深快速穿插迂回',
        '第四波次：侧翼钳形合围机动',
        '第五波次：关键交通节点拔除',
        '第六波次：战术口袋阵合围切断',
        '第七波次：战略纵深纵贯挺进',
        '第八波次：战果巩固与总攻推进'
      ];

      const labelText = chronologicalLabels[idx % chronologicalLabels.length];

      features.push(
        turf.feature(arrowGeom, {
          phase: phaseNum,
          side,
          color,
          label: `${side === 'red' ? (red.countryName || '红方') : (blue.countryName || '蓝方')} 第${phaseNum}阶段 - ${labelText}`
        })
      );
    });

    return features;
  };

  const capPhaseArrows = (arrows: GeoJSON.Feature[], maxCount = 20) => {
    if (arrows.length <= maxCount) return arrows;
    return arrows.slice(0, maxCount);
  };

  // Phase Arrow Collections (capped at max 20 arrows per phase to prevent map clutter)
  const p1ArrowFeatures = capPhaseArrows([
    ...buildPhaseArrowFeatures(p1Changes.red, 1, '#ef4444', 'red'),
    ...buildPhaseArrowFeatures(p1Changes.blue, 1, '#3b82f6', 'blue')
  ], 20);

  const p2ArrowFeatures = numPhases >= 2 ? capPhaseArrows([
    ...buildPhaseArrowFeatures(p2Changes.red, 2, '#ea580c', 'red'),
    ...buildPhaseArrowFeatures(p2Changes.blue, 2, '#60a5fa', 'blue')
  ], 20) : [];

  const p3ArrowFeatures = numPhases >= 3 ? capPhaseArrows([
    ...buildPhaseArrowFeatures(p3Changes.red, 3, '#eab308', 'red'),
    ...buildPhaseArrowFeatures(p3Changes.blue, 3, '#93c5fd', 'blue')
  ], 20) : [];

  const p4ArrowFeatures = numPhases >= 4 ? capPhaseArrows([
    ...buildPhaseArrowFeatures(p4Changes.red, 4, '#10b981', 'red'),
    ...buildPhaseArrowFeatures(p4Changes.blue, 4, '#a7f3d0', 'blue')
  ], 20) : [];

  const p5ArrowFeatures = numPhases >= 5 ? capPhaseArrows([
    ...buildPhaseArrowFeatures(p5Changes.red, 5, '#a855f7', 'red'),
    ...buildPhaseArrowFeatures(p5Changes.blue, 5, '#c084fc', 'blue')
  ], 20) : [];

  // Enemy Retreat/Defensive Line Features
  const retreatFeatures: GeoJSON.Feature[] = [];
  if (p2Changes.blue.length > 0 || p3Changes.blue.length > 0) {
    const retreatPts = [...p2Changes.blue.map(c => c.pos), ...p3Changes.blue.map(c => c.pos)];
    if (retreatPts.length > 3) {
      const avgLng = retreatPts.reduce((s, p) => s + p[0], 0) / retreatPts.length;
      const avgLat = retreatPts.reduce((s, p) => s + p[1], 0) / retreatPts.length;
      const arrow = createCurvedArrowPolygon(avgLng, avgLat, avgLng + 0.3, avgLat + 0.3, -0.2, calculatedHeadWidth, calculatedBaseWidth, false);
      retreatFeatures.push(turf.feature(arrow, { phase: 3, side: 'blue', color: '#64748b', label: '敌军全线后撤防御线' }));
    }
  }

  // Phase Frontlines
  const p1Lines = f1.frontlineEdges && f1.frontlineEdges.length > 0 ? turf.multiLineString(f1.frontlineEdges) : null;
  const p2Lines = f2.frontlineEdges && f2.frontlineEdges.length > 0 ? turf.multiLineString(f2.frontlineEdges) : null;
  const p3Lines = f3.frontlineEdges && f3.frontlineEdges.length > 0 ? turf.multiLineString(f3.frontlineEdges) : null;
  const p4Lines = f4.frontlineEdges && f4.frontlineEdges.length > 0 ? turf.multiLineString(f4.frontlineEdges) : null;
  const p5Lines = f5.frontlineEdges && f5.frontlineEdges.length > 0 ? turf.multiLineString(f5.frontlineEdges) : null;

  const phase1Frontline = turf.featureCollection(p1Lines ? [turf.feature(p1Lines.geometry, { phase: 1, color: '#ef4444', label: '第一阶段边境突破线' })] : []);
  const phase2Frontline = numPhases >= 2 && p2Lines ? turf.featureCollection([turf.feature(p2Lines.geometry, { phase: 2, color: '#ea580c', label: '第二阶段前沿推进线' })]) : turf.featureCollection([]);
  const phase3Frontline = numPhases >= 3 && p3Lines ? turf.featureCollection([turf.feature(p3Lines.geometry, { phase: 3, color: '#eab308', label: '第三阶段攻防拉锯线' })]) : turf.featureCollection([]);
  const phase4Frontline = numPhases >= 4 && p4Lines ? turf.featureCollection([turf.feature(p4Lines.geometry, { phase: 4, color: '#10b981', label: '第四阶段战术包围线' })]) : turf.featureCollection([]);
  const phase5Frontline = numPhases >= 5 && p5Lines ? turf.featureCollection([turf.feature(p5Lines.geometry, { phase: 5, color: '#a855f7', label: '第五阶段终极控制线' })]) : turf.featureCollection([]);

  // Encirclement Zones (Empty per requirement 4: 战役地图中敌军被歼灭的区域不需要显示)
  const encirclementFeatures: GeoJSON.Feature[] = [];

  // Military Markers
  const markerFeatures: GeoJSON.Feature[] = [];

  // Capital Markers
  for (const cid in cells) {
    const c = cells[cid];
    if (c.isCapital) {
      const [lat, lng] = getCachedLatLng(cid);
      markerFeatures.push(
        turf.point([c.cityLng ?? lng, c.cityLat ?? lat], {
          name: c.cityName || '首都',
          type: 'capital',
          owner: c.owner
        })
      );
    }
  }

  // Non-capital City Markers
  for (const cid in cells) {
    const c = cells[cid];
    if (c.isImportantCity && !c.isCapital) {
      const [lat, lng] = getCachedLatLng(cid);
      markerFeatures.push(
        turf.point([c.cityLng ?? lng, c.cityLat ?? lat], {
          name: c.cityName || '要冲城市',
          type: 'city',
          owner: c.owner
        })
      );
    }
  }

  // Calculate overall simulation center for reliable fallback
  let defaultCenterLng = 0, defaultCenterLat = 0;
  const cellKeys = Object.keys(cells);
  if (cellKeys.length > 0) {
    let sumLng = 0, sumLat = 0;
    for (const cid of cellKeys) {
      const [lat, lng] = getCachedLatLng(cid);
      sumLng += lng;
      sumLat += lat;
    }
    defaultCenterLng = sumLng / cellKeys.length;
    defaultCenterLat = sumLat / cellKeys.length;
  }

  // Generate Key Battlefields (重要战场 - 交叉刀 ⚔️ 标记)
  const keyBattlefields: KeyBattlefield[] = [];

  // Helper to find average position from changes or fallback to default center
  const getBattlePos = (changes: { pos: [number, number] }[]): [number, number] => {
    if (changes.length > 0) {
      const avgLng = changes.reduce((s, p) => s + p.pos[0], 0) / changes.length;
      const avgLat = changes.reduce((s, p) => s + p.pos[1], 0) / changes.length;
      return [avgLng, avgLat];
    }
    return [defaultCenterLng, defaultCenterLat];
  };

  // 1. Phase 1 breakthrough
  const [p1Lng, p1Lat] = getBattlePos(p1Changes.red);
  keyBattlefields.push({
    id: 'battle-p1',
    name: '第一阶段 边境要塞突破战',
    phase: 1,
    date: f1.currentDate || startDate,
    lng: p1Lng,
    lat: p1Lat,
    redForces: Math.round((red.activeTroops || 100000) * 0.9),
    blueForces: Math.round((blue.activeTroops || 100000) * 0.85),
    redLosses: f1.redLosses || Math.round((red.militaryLosses || 5000) * 0.2),
    blueLosses: f1.blueLosses || Math.round((blue.militaryLosses || 8000) * 0.2)
  });

  // 2. Phase 2 encirclement
  if (p2Changes.red.length > 0 || numPhases >= 2) {
    const [p2Lng, p2Lat] = p2Changes.red.length > 0 ? getBattlePos(p2Changes.red) : [p1Lng, p1Lat];
    keyBattlefields.push({
      id: 'battle-p2',
      name: '第二阶段 纵深侧翼迂回战',
      phase: 2,
      date: f2.currentDate || endDate,
      lng: p2Lng,
      lat: p2Lat,
      redForces: Math.round((red.activeTroops || 100000) * 0.85),
      blueForces: Math.round((blue.activeTroops || 100000) * 0.75),
      redLosses: Math.max(0, (f2.redLosses || 0) - (f1.redLosses || 0)) || Math.round((red.militaryLosses || 5000) * 0.2),
      blueLosses: Math.max(0, (f2.blueLosses || 0) - (f1.blueLosses || 0)) || Math.round((blue.militaryLosses || 8000) * 0.25)
    });
  }

  // 3. Phase 3 stalemate / central hubs battle
  if (p3Changes.red.length > 0 || numPhases >= 3) {
    const [p3Lng, p3Lat] = p3Changes.red.length > 0 ? getBattlePos(p3Changes.red) : [p1Lng, p1Lat];
    keyBattlefields.push({
      id: 'battle-p3',
      name: '第三阶段 战略枢纽拉锯战',
      phase: 3,
      date: f3.currentDate || endDate,
      lng: p3Lng,
      lat: p3Lat,
      redForces: Math.round((red.activeTroops || 100000) * 0.8),
      blueForces: Math.round((blue.activeTroops || 100000) * 0.7),
      redLosses: Math.max(0, (f3.redLosses || 0) - (f2.redLosses || 0)) || Math.round((red.militaryLosses || 5000) * 0.25),
      blueLosses: Math.max(0, (f3.blueLosses || 0) - (f2.blueLosses || 0)) || Math.round((blue.militaryLosses || 8000) * 0.2)
    });
  }

  // 4. Phase 4 tactical encirclement
  if (p4Changes.red.length > 0 || numPhases >= 4) {
    const [p4Lng, p4Lat] = p4Changes.red.length > 0 ? getBattlePos(p4Changes.red) : [p1Lng, p1Lat];
    keyBattlefields.push({
      id: 'battle-p4',
      name: '第四阶段 环形口袋合围会战',
      phase: 4,
      date: f4.currentDate || endDate,
      lng: p4Lng,
      lat: p4Lat,
      redForces: Math.round((red.activeTroops || 100000) * 0.75),
      blueForces: Math.round((blue.activeTroops || 100000) * 0.6),
      redLosses: Math.max(0, (f4.redLosses || 0) - (f3.redLosses || 0)) || Math.round((red.militaryLosses || 5000) * 0.15),
      blueLosses: Math.max(0, (f4.blueLosses || 0) - (f3.blueLosses || 0)) || Math.round((blue.militaryLosses || 8000) * 0.2)
    });
  }

  // 5. Phase 5 decisive fortress/final battle
  if (p5Changes.red.length > 0 || (blue.headquartersCell && cells[blue.headquartersCell]) || numPhases >= 5) {
    let avgLng = defaultCenterLng, avgLat = defaultCenterLat;
    if (p5Changes.red.length > 0) {
      avgLng = p5Changes.red.reduce((s, p) => s + p.pos[0], 0) / p5Changes.red.length;
      avgLat = p5Changes.red.reduce((s, p) => s + p.pos[1], 0) / p5Changes.red.length;
    } else if (blue.headquartersCell && cells[blue.headquartersCell]) {
      const [hLat, hLng] = getCachedLatLng(blue.headquartersCell);
      avgLng = hLng; avgLat = hLat;
    } else {
      avgLng = p1Lng; avgLat = p1Lat;
    }
    keyBattlefields.push({
      id: 'battle-p5',
      name: '第五阶段 终局要塞决胜会战',
      phase: 5,
      date: f5.currentDate || endDate,
      lng: avgLng,
      lat: avgLat,
      redForces: Math.round(f5.redActiveTroops || red.activeTroops),
      blueForces: Math.round(f5.blueActiveTroops || blue.activeTroops),
      redLosses: Math.max(0, (f5.redLosses || 0) - (f4.redLosses || 0)) || Math.round((red.militaryLosses || 5000) * 0.2),
      blueLosses: Math.max(0, (f5.blueLosses || 0) - (f4.blueLosses || 0)) || Math.round((blue.militaryLosses || 8000) * 0.15)
    });
  }

  // Push Key Battlefields to markerFeatures as 'key_battlefield'
  keyBattlefields.forEach(kb => {
    markerFeatures.push(
      turf.point([kb.lng, kb.lat], {
        id: kb.id,
        name: kb.name,
        type: 'key_battlefield',
        phase: kb.phase,
        date: kb.date,
        redForces: kb.redForces,
        blueForces: kb.blueForces,
        redLosses: kb.redLosses,
        blueLosses: kb.blueLosses
      })
    );
  });

  // Calculate Map Bounding Box (Strictly Focus on Active Combat / Conflict Area)
  let conflictCoords: [number, number][] = [];
  
  // 1. Collect all frontlines
  const addLines = (lines: GeoJSON.Feature<GeoJSON.MultiLineString> | null) => {
    if (!lines) return;
    lines.geometry.coordinates.forEach(line => line.forEach(pt => conflictCoords.push([pt[0], pt[1]])));
  };
  addLines(p1Lines); addLines(p2Lines); addLines(p3Lines); addLines(p4Lines); addLines(p5Lines);

  // 2. Collect all attack & retreat arrows
  const addArrows = (features: GeoJSON.Feature[]) => {
    if (!features) return;
    features.forEach(f => {
      if (f.geometry.type === 'Polygon') {
        f.geometry.coordinates[0].forEach(pt => conflictCoords.push([pt[0], pt[1]]));
      }
    });
  };
  addArrows(p1ArrowFeatures); addArrows(p2ArrowFeatures); addArrows(p3ArrowFeatures); addArrows(p4ArrowFeatures); addArrows(p5ArrowFeatures);
  addArrows(retreatFeatures);

  // 3. Collect key battlefields
  keyBattlefields.forEach(kb => {
    conflictCoords.push([kb.lng, kb.lat]);
  });

  // 4. Collect cells that experienced combat/occupation/frontline status during the war
  for (const cid in cells) {
    const cell = cells[cid];
    const isOccupiedOrChanged = (cell.owner && cell.originalOwner && cell.owner !== cell.originalOwner) ||
                                (cell.initialOriginalOwner && cell.owner !== cell.initialOriginalOwner);
    const isFrontlineCell = !!(cell as any).frontline || !!(cell as any).isFrontline;
    if (isOccupiedOrChanged || isFrontlineCell) {
      const [lat, lng] = getCachedLatLng(cid);
      conflictCoords.push([lng, lat]);
    }
  }

  // 5. Fallback 1: If conflictCoords has too few points (e.g. static confrontation), collect border cells between opposing sides
  if (conflictCoords.length < 2) {
    for (const cid in cells) {
      const cell = cells[cid];
      const owner0 = cell.owner || cell.originalOwner;
      const neighbors = cells[cid].neighbors || [];
      const isBorder = neighbors.some(nid => cells[nid] && (cells[nid].owner || cells[nid].originalOwner) !== owner0);
      if (isBorder) {
        const [lat, lng] = getCachedLatLng(cid);
        conflictCoords.push([lng, lat]);
      }
    }
  }

  // 6. Fallback 2: If still empty (e.g. single country scenario with no movement), use all cells
  if (conflictCoords.length === 0) {
    for (const cid in cells) {
      const [lat, lng] = getCachedLatLng(cid);
      conflictCoords.push([lng, lat]);
    }
  }

  if (conflictCoords.length === 0) {
    conflictCoords = [[118, 31], [121, 32]];
  }

  const bboxRes = turf.bbox(turf.featureCollection(conflictCoords.map(c => turf.point(c))));
  const rawSpanLng = bboxRes[2] - bboxRes[0];
  const rawSpanLat = bboxRes[3] - bboxRes[1];

  // Calculate generous padding around the active combat zone (25% of span, min buffer ~0.08 deg / ~10km for optimal framing)
  const paddingLng = Math.max(0.08, rawSpanLng * 0.25);
  const paddingLat = Math.max(0.08, rawSpanLat * 0.25);

  const minLng = Math.max(-179.9, bboxRes[0] - paddingLng);
  const minLat = Math.max(-85, bboxRes[1] - paddingLat);
  const maxLng = Math.min(179.9, bboxRes[2] + paddingLng);
  const maxLat = Math.min(85, bboxRes[3] + paddingLat);
  const bounds: [number, number, number, number] = [minLng, minLat, maxLng, maxLat];

  // Calculate original territories of red and blue for outline tracing
  const redOriginalCellIds = Object.keys(cells).filter(cid => (cells[cid].originalOwner === 'red' || cells[cid].initialOriginalOwner === 'red'));
  const blueOriginalCellIds = Object.keys(cells).filter(cid => (cells[cid].originalOwner === 'blue' || cells[cid].initialOriginalOwner === 'blue'));

  const redOriginalFeatures: GeoJSON.Feature[] = [];
  if (redOriginalCellIds.length > 0) {
    const poly = h3ToMultiPolygonFeature(redOriginalCellIds);
    if (poly.geometry.coordinates && poly.geometry.coordinates.length > 0) {
      redOriginalFeatures.push(turf.feature(poly.geometry, { side: 'red', color: '#dc2626' }));
    }
  }

  const blueOriginalFeatures: GeoJSON.Feature[] = [];
  if (blueOriginalCellIds.length > 0) {
    const poly = h3ToMultiPolygonFeature(blueOriginalCellIds);
    if (poly.geometry.coordinates && poly.geometry.coordinates.length > 0) {
      blueOriginalFeatures.push(turf.feature(poly.geometry, { side: 'blue', color: '#2563eb' }));
    }
  }

  const redOriginalTerritory = turf.featureCollection(redOriginalFeatures);
  const blueOriginalTerritory = turf.featureCollection(blueOriginalFeatures);

  return {
    title,
    subtitle,
    numPhases,
    phase1Arrows: turf.featureCollection(p1ArrowFeatures),
    phase2Arrows: turf.featureCollection(p2ArrowFeatures),
    phase3Arrows: turf.featureCollection(p3ArrowFeatures),
    phase4Arrows: turf.featureCollection(p4ArrowFeatures),
    phase5Arrows: turf.featureCollection(p5ArrowFeatures),
    enemyRetreatArrows: turf.featureCollection(retreatFeatures),
    phase1Frontline,
    phase2Frontline,
    phase3Frontline,
    phase4Frontline,
    phase5Frontline,
    phase1Territory,
    phase2Territory,
    phase3Territory,
    phase4Territory,
    phase5Territory,
    redOriginalTerritory,
    blueOriginalTerritory,
    encirclementZones: turf.featureCollection(encirclementFeatures),
    militaryMarkers: turf.featureCollection(markerFeatures),
    keyBattlefields,
    bounds
  };
}
