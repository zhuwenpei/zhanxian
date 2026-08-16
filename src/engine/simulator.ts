import { loadCountryGeoJSON } from './countryLoader';
import { getOptimalResolution, featureToH3 } from './gridEngine';
import { calculateFrontlineEdges } from './frontlineEngine';
import { SimulationState, SideState, Side, CellState, UnitState, UnitStatus } from '../types/simulation';
import { getCountryName } from '../data/countryNames';
import { getCitiesForIso, BUILTIN_CITIES } from '../data/cities';
import * as turf from '@turf/turf';
import seedrandom from 'seedrandom';
import { gridDisk, cellToLatLng, areNeighborCells } from 'h3-js';
import { simulateTick } from './tickEngine';
import { getHistoricalFeature } from '../data/historicalBorders';
import { getCachedLatLng, getCachedNeighbors } from './h3Cache';

export function checkAdjacency(redFeature: any, blueFeature: any): boolean {
  // Check if distance is 0 or they intersect
  try {
    const overlap = turf.intersect(turf.featureCollection([redFeature, blueFeature]));
    if (overlap && overlap.geometry && (overlap.geometry as any).coordinates.length > 0) return true;
  } catch(e) {}
  
  // Also check turf.booleanIntersects
  if (turf.booleanIntersects(redFeature, blueFeature)) return true;
  
  return false;
}

export function loadCombinedFeature(isoString: string) {
  const isos = isoString.split(',').map(s => s.trim().toUpperCase());
  if (isos.length === 1) {
    return loadCountryGeoJSON(isos[0]);
  }
  const features = isos.map(iso => loadCountryGeoJSON(iso)).filter(Boolean) as any[];
  if (features.length === 0) return null;
  
  const allPolygons: any[] = [];
  features.forEach(f => {
    if (f.geometry.type === 'Polygon') {
      allPolygons.push(f.geometry.coordinates);
    } else if (f.geometry.type === 'MultiPolygon') {
      for (let i = 0; i < f.geometry.coordinates.length; i++) {
        allPolygons.push(f.geometry.coordinates[i]);
      }
    }
  });
  
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'MultiPolygon' as const,
      coordinates: allPolygons
    }
  };
}

export function generateInitialState(
  redIso: string,
  blueIso: string,
  seed: string,
  date: string,
  mode: SimulationState['mode'],
  profile?: any,
  mapResolution: 'auto' | 'ultra' | 'detailed' | 'standard' | 'coarse' | 'neighborhood' | 'community' | 'street' | 'building' | 'room' = 'auto',
  currentCells?: Record<string, CellState>,
  era: SimulationState['era'] = 'modern',
  customRedName?: string,
  customBlueName?: string,
  overlapPriority: 'red' | 'blue' = 'red'
): Partial<SimulationState> | string {
  let redFeature = getHistoricalFeature(redIso, era);
  let blueFeature = getHistoricalFeature(blueIso, era);

  if (!redFeature || !blueFeature) return '无法读取国家地理数据。';

  // Requirement 3: Theater Clipping for Large Nations (2000km, or 450km for Large vs Small)
  // Prevents lag when loading massive countries while keeping the conflict zone detailed
  const redAreaSqKm = turf.area(redFeature as any) / 1e6;
  const blueAreaSqKm = turf.area(blueFeature as any) / 1e6;

  // Use balanced buffer (1000km) for Large vs Small country wars to avoid over-detailing and slow progress
  const redBufferDist = (redAreaSqKm > 2000000 && blueAreaSqKm < 1500000) ? 1000 : 2000;
  const blueBufferDist = (blueAreaSqKm > 2000000 && redAreaSqKm < 1500000) ? 1000 : 2000;

  if (redAreaSqKm > 2000000) {
    try {
      const blueBuffer = turf.buffer(blueFeature as any, redBufferDist, { units: 'kilometers' });
      if (blueBuffer) {
        const blueBbox = turf.bbox(blueBuffer);
        const bboxPolygon = turf.bboxPolygon(blueBbox);
        const clipped = turf.intersect(turf.featureCollection([redFeature as any, bboxPolygon as any]));
        if (clipped && clipped.geometry) {
          redFeature = clipped as any;
        }
      }
    } catch (e) {
      console.warn("Failed to clip red country with bbox:", e);
    }
  }

  if (blueAreaSqKm > 2000000) {
    try {
      const redBuffer = turf.buffer(redFeature as any, blueBufferDist, { units: 'kilometers' });
      if (redBuffer) {
        const redBbox = turf.bbox(redBuffer);
        const bboxPolygon = turf.bboxPolygon(redBbox);
        const clipped = turf.intersect(turf.featureCollection([blueFeature as any, bboxPolygon as any]));
        if (clipped && clipped.geometry) {
          blueFeature = clipped as any;
        }
      }
    } catch (e) {
      console.warn("Failed to clip blue country with bbox:", e);
    }
  }

  let hasAdjacency = checkAdjacency(redFeature, blueFeature);

  const effectiveResolution = mapResolution;

  const res = getOptimalResolution(redFeature, blueFeature, effectiveResolution);
  
  let redCellsList: string[] = [];
  let blueCellsList: string[] = [];
  const cells: Record<string, CellState> = {};
  const rng = seedrandom(seed);

  if (currentCells && Object.keys(currentCells).length > 0) {
    // Use pre-painted cells if provided
    for (const cid in currentCells) {
      const c = currentCells[cid];
      if (c.owner === 'red') redCellsList.push(cid);
      else if (c.owner === 'blue') blueCellsList.push(cid);
      
      cells[cid] = {
        ...c,
        terrainModifier: c.terrainModifier || (0.82 + rng() * 0.36),
        urbanExposure: c.urbanExposure || rng(),
        supplyConnected: true,
        distanceToHeadquarters: 0,
        daysDisconnected: 0
      };
    }
  } else {
    redCellsList = featureToH3(redFeature, res);
    blueCellsList = featureToH3(blueFeature, res);

    if (redCellsList.length === 0 || blueCellsList.length === 0) return 'H3网格生成失败，国家面积过小或不支持。';

    // Filter out overlapping cells according to overlapPriority
    if (overlapPriority === 'blue') {
      for (const c of blueCellsList) {
        cells[c] = { id: c, owner: 'blue', originalOwner: 'blue', terrainModifier: 0.82 + rng() * 0.36, urbanExposure: rng(), supplyConnected: true, distanceToHeadquarters: 0, daysDisconnected: 0 };
      }
      for (const c of redCellsList) {
        if (!cells[c]) {
          cells[c] = { id: c, owner: 'red', originalOwner: 'red', terrainModifier: 0.82 + rng() * 0.36, urbanExposure: rng(), supplyConnected: true, distanceToHeadquarters: 0, daysDisconnected: 0 };
        }
      }
    } else {
      for (const c of redCellsList) {
        cells[c] = { id: c, owner: 'red', originalOwner: 'red', terrainModifier: 0.82 + rng() * 0.36, urbanExposure: rng(), supplyConnected: true, distanceToHeadquarters: 0, daysDisconnected: 0 };
      }
      for (const c of blueCellsList) {
        if (!cells[c]) {
          cells[c] = { id: c, owner: 'blue', originalOwner: 'blue', terrainModifier: 0.82 + rng() * 0.36, urbanExposure: rng(), supplyConnected: true, distanceToHeadquarters: 0, daysDisconnected: 0 };
        }
      }
    }
  }

  // Find closest cell helper
  const getClosest = (target: number[], cellList: string[]) => {
    let best = cellList[0];
    let minDist = Infinity;
    for (const c of cellList) {
      if (!cells[c]) continue;
      const [lat, lng] = getCachedLatLng(c);
      const dist = (lng - target[0])**2 + (lat - target[1])**2;
      if (dist < minDist) {
        minDist = dist;
        best = c;
      }
    }
    return best;
  };

  // Setup Cities and Capitals
  let redCities: any[] = [];
  let blueCities: any[] = [];

  const isCustomDraw = !!(currentCells && Object.keys(currentCells).length > 0);

  if (isCustomDraw) {
    // Generate tactical cities based on user's drawn cells
    if (redCellsList.length > 0) {
      // Find the capital cell (closest to center)
      const centerOfMass = turf.centerOfMass(redFeature).geometry.coordinates;
      const capitalCell = getClosest(centerOfMass, redCellsList);
      const [capLat, capLng] = getCachedLatLng(capitalCell);
      
      redCities.push({
        name: customRedName ? `${customRedName}指挥部` : "红方指挥部",
        lat: capLat,
        lng: capLng,
        isCapital: true
      });

      // Filter out capital, and pick up to 4 other cells to be important nodes
      const otherCells = redCellsList.filter(c => c !== capitalCell);
      if (otherCells.length > 0) {
        // Deterministic spread using rng
        const names = ["前沿阵地", "后勤军需库", "核心枢纽", "街区要塞"];
        const countToPick = Math.min(names.length, otherCells.length);
        const step = Math.floor(otherCells.length / (countToPick + 1)) || 1;
        for (let i = 0; i < countToPick; i++) {
          const idx = ((i + 1) * step) % otherCells.length;
          const cellId = otherCells[idx];
          const [lat, lng] = getCachedLatLng(cellId);
          redCities.push({
            name: names[i],
            lat,
            lng,
            isCapital: false
          });
        }
      }
    }

    if (blueCellsList.length > 0) {
      // Find the capital cell (closest to center)
      const centerOfMass = turf.centerOfMass(blueFeature).geometry.coordinates;
      const capitalCell = getClosest(centerOfMass, blueCellsList);
      const [capLat, capLng] = getCachedLatLng(capitalCell);
      
      blueCities.push({
        name: customBlueName ? `${customBlueName}指挥部` : "蓝方指挥部",
        lat: capLat,
        lng: capLng,
        isCapital: true
      });

      // Filter out capital, and pick up to 4 other cells to be important nodes
      const otherCells = blueCellsList.filter(c => c !== capitalCell);
      if (otherCells.length > 0) {
        // Deterministic spread using rng
        const names = ["前沿据点", "弹药整备所", "防线中枢", "社区堡垒"];
        const countToPick = Math.min(names.length, otherCells.length);
        const step = Math.floor(otherCells.length / (countToPick + 1)) || 1;
        for (let i = 0; i < countToPick; i++) {
          const idx = ((i + 1) * step) % otherCells.length;
          const cellId = otherCells[idx];
          const [lat, lng] = getCachedLatLng(cellId);
          blueCities.push({
            name: names[i],
            lat,
            lng,
            isCapital: false
          });
        }
      }
    }
  } else {
    redCities = getCitiesForIso(redIso);
    blueCities = getCitiesForIso(blueIso);
  }

  const redCenter = turf.centerOfMass(redFeature).geometry.coordinates; // [lng, lat]
  const blueCenter = turf.centerOfMass(blueFeature).geometry.coordinates;

  let redCapitalCell = '';
  let redCapitalName = customRedName ? `${customRedName}指挥部` : (getCountryName(redIso) + '首都');
  let blueCapitalCell = '';
  let blueCapitalName = customBlueName ? `${customBlueName}指挥部` : (getCountryName(blueIso) + '首都');

  // Apply Red Cities
  if (redCities.length > 0) {
    for (const city of redCities) {
      const closestCell = getClosest([city.lng, city.lat], redCellsList);
      if (closestCell && cells[closestCell]) {
        cells[closestCell].cityName = city.name;
        cells[closestCell].cityLat = city.lat;
        cells[closestCell].cityLng = city.lng;
        if (city.isCapital) {
          cells[closestCell].isCapital = true;
          if (!redCapitalCell) {
            redCapitalCell = closestCell;
            redCapitalName = city.name;
          }
        } else {
          cells[closestCell].isImportantCity = true;
        }
      }
    }
  }
  if (!redCapitalCell) {
    redCapitalCell = getClosest(redCenter, redCellsList);
    if (cells[redCapitalCell]) {
      cells[redCapitalCell].isCapital = true;
      cells[redCapitalCell].cityName = redCapitalName;
      const [lat, lng] = getCachedLatLng(redCapitalCell);
      cells[redCapitalCell].cityLat = lat;
      cells[redCapitalCell].cityLng = lng;
    }
  }

  // Apply Blue Cities
  if (blueCities.length > 0) {
    for (const city of blueCities) {
      const closestCell = getClosest([city.lng, city.lat], blueCellsList);
      if (closestCell && cells[closestCell]) {
        cells[closestCell].cityName = city.name;
        cells[closestCell].cityLat = city.lat;
        cells[closestCell].cityLng = city.lng;
        if (city.isCapital) {
          cells[closestCell].isCapital = true;
          if (!blueCapitalCell) {
            blueCapitalCell = closestCell;
            blueCapitalName = city.name;
          }
        } else {
          cells[closestCell].isImportantCity = true;
        }
      }
    }
  }
  if (!blueCapitalCell) {
    blueCapitalCell = getClosest(blueCenter, blueCellsList);
    if (cells[blueCapitalCell]) {
      cells[blueCapitalCell].isCapital = true;
      cells[blueCapitalCell].cityName = blueCapitalName;
      const [lat, lng] = getCachedLatLng(blueCapitalCell);
      cells[blueCapitalCell].cityLat = lat;
      cells[blueCapitalCell].cityLng = lng;
    }
  }

  const redHQ = redCapitalCell;
  const blueHQ = blueCapitalCell;

  // Initial territory: each country starts owning 100% of its original territory.
  // Landings and beachheads will be conducted dynamically during combat execution in tickEngine.

  let redTroops = 100000;
  let redReserve = 30000;
  let blueTroops = 100000;
  let blueReserve = 30000;
  let redFirepower = 100;
  let blueFirepower = 100;
  let redMorale = 1.0;
  let blueMorale = 1.0;
  let redLogistics = 1.0;
  let blueLogistics = 1.0;

  if (profile) {
    redTroops = profile.redActiveTroops;
    redReserve = profile.redReserveTroops;
    blueTroops = profile.blueActiveTroops;
    blueReserve = profile.blueReserveTroops;
    redFirepower = profile.redFirepower;
    blueFirepower = profile.blueFirepower;
    redMorale = profile.redMorale;
    blueMorale = profile.blueMorale;
    redLogistics = profile.redLogistics;
    blueLogistics = profile.blueLogistics;
  } else {
    // Generate Base Stats
    const redArea = turf.area(redFeature) / 1e6; // sq km
    const blueArea = turf.area(blueFeature) / 1e6;

    let baseTroops = Math.sqrt(redArea + blueArea) * 300;
    baseTroops = Math.max(100000, Math.min(1200000, baseTroops));
    baseTroops = Math.round(baseTroops / 10000) * 10000;

    let redMult = 1;
    let blueMult = 1;
    if (mode === 'balanced') {
      redMult = 0.85 + rng() * 0.3;
      blueMult = 0.85 + rng() * 0.3;
    } else if (mode === 'red_adv') {
      redMult = 1.15 + rng() * 0.2;
      blueMult = 0.85 + rng() * 0.15;
    } else if (mode === 'blue_adv') {
      redMult = 0.85 + rng() * 0.15;
      blueMult = 1.15 + rng() * 0.2;
    } else {
      redMult = 0.5 + rng() * 1.0;
      blueMult = 0.5 + rng() * 1.0;
    }

    redTroops = Math.round((baseTroops * redMult) / 10000) * 10000;
    blueTroops = Math.round((baseTroops * blueMult) / 10000) * 10000;

    redReserve = Math.round(redTroops * (0.3 + rng() * 0.6) / 10000) * 10000;
    blueReserve = Math.round(blueTroops * (0.3 + rng() * 0.6) / 10000) * 10000;
    
    redFirepower = mode === 'red_adv' ? 120 : mode === 'blue_adv' ? 80 : 100;
    blueFirepower = mode === 'blue_adv' ? 120 : mode === 'red_adv' ? 80 : 100;
  }

  // Parse alliance member details
  const buildMembers = (isoString: string, sideProfileMembers?: any[], totalTroops?: number, totalReserves?: number) => {
    if (sideProfileMembers && sideProfileMembers.length > 0) {
      return sideProfileMembers.map(m => ({
        iso3: m.iso3,
        countryName: m.countryName || getCountryName(m.iso3),
        activeTroops: m.activeTroops,
        initialActiveTroops: m.activeTroops,
        reserveTroops: m.reserveTroops,
        initialReserveTroops: m.reserveTroops,
        militaryLosses: 0,
        firepower: m.firepower || 100,
        morale: m.morale || 1.0,
        logistics: m.logistics || 1.0,
        score: m.score || 100
      }));
    }
    const isos = isoString.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (isos.length <= 1) {
      return [{
        iso3: isos[0] || isoString,
        countryName: getCountryName(isos[0] || isoString),
        activeTroops: totalTroops || 100000,
        initialActiveTroops: totalTroops || 100000,
        reserveTroops: totalReserves || 30000,
        initialReserveTroops: totalReserves || 30000,
        militaryLosses: 0,
        firepower: 100,
        morale: 1.0,
        logistics: 1.0,
        score: 100
      }];
    }
    // Multiple countries in alliance: divide troops proportionally or build individually
    const perTroop = Math.round((totalTroops || 100000) / isos.length);
    const perReserve = Math.round((totalReserves || 30000) / isos.length);
    return isos.map(iso => ({
      iso3: iso,
      countryName: getCountryName(iso),
      activeTroops: perTroop,
      initialActiveTroops: perTroop,
      reserveTroops: perReserve,
      initialReserveTroops: perReserve,
      militaryLosses: 0,
      firepower: 100,
      morale: 1.0,
      logistics: 1.0,
      score: 100
    }));
  };

  const redMembers = buildMembers(redIso, profile?.redMembers, redTroops, redReserve);
  const blueMembers = buildMembers(blueIso, profile?.blueMembers, blueTroops, blueReserve);

  const calculatedRedTroops = redMembers.reduce((sum, m) => sum + m.activeTroops, 0);
  const calculatedRedReserves = redMembers.reduce((sum, m) => sum + m.reserveTroops, 0);
  const calculatedBlueTroops = blueMembers.reduce((sum, m) => sum + m.activeTroops, 0);
  const calculatedBlueReserves = blueMembers.reduce((sum, m) => sum + m.reserveTroops, 0);

  const getAllianceName = (members: any[], fallbackIso: string, sideName: string) => {
    if (members.length > 1) {
      return members.map(m => m.countryName).join(' + ');
    }
    return getCountryName(fallbackIso) || sideName;
  };

  const createSide = (
    id: Side,
    iso: string,
    troops: number,
    reserve: number,
    firepower: number,
    morale: number,
    logistics: number,
    hq: string,
    members: any[]
  ): SideState => ({
    id,
    name: id === 'red' ? '红方' : '蓝方',
    countryName: (id === 'red' 
      ? (profile?.customRedName || profile?.redCountryName) 
      : (profile?.customBlueName || profile?.blueCountryName)) || getAllianceName(members, iso, id === 'red' ? '红方同盟' : '蓝方同盟'),
    iso2: iso,
    iso3: iso,
    color: id === 'red' ? '#9f1d20' : '#12609a',
    activeTroops: troops,
    initialActiveTroops: troops,
    reserveTroops: reserve,
    initialReserveTroops: reserve,
    firepower,
    morale,
    logistics,
    initiative: 1.0,
    militaryLosses: 0,
    civilianLosses: 0,
    controlledCells: id === 'red' ? redCellsList.length : blueCellsList.length,
    initialCellCount: id === 'red' ? redCellsList.length : blueCellsList.length,
    headquartersCell: hq,
    headquartersOccupiedDays: 0,
    capitalCell: hq,
    capitalName: id === 'red' ? redCapitalName : blueCapitalName,
    capitalEvacuating: false,
    evacuationCountdown: 3,
    capitalRelocated: false,
    capitalOccupied: false,
    units: [],
    surrendered: 0,
    members
  });

  const redState = createSide('red', redIso, calculatedRedTroops, calculatedRedReserves, redFirepower, redMorale, redLogistics, redHQ, redMembers);
  const blueState = createSide('blue', blueIso, calculatedBlueTroops, calculatedBlueReserves, blueFirepower, blueMorale, blueLogistics, blueHQ, blueMembers);

  // Find border cells
  const redBorder: string[] = [];
  const blueBorder: string[] = [];
  for (const cid in cells) {
    const c = cells[cid];
    const neighbors = gridDisk(cid, 1);
    for (const n of neighbors) {
      if (cells[n] && cells[n].owner !== c.owner) {
        if (c.owner === 'red') redBorder.push(cid);
        else blueBorder.push(cid);
        break;
      }
    }
  }

  const generateUnitsOnBorder = (side: SideState, border: string[]) => {
    if (border.length === 0) return;
    const unitCount = border.length;
    const strengthPerUnit = Math.max(100, Math.round(side.activeTroops / unitCount));
    
    border.forEach((cellId, index) => {
      const [lat, lng] = getCachedLatLng(cellId);
      side.units.push({
        id: `${side.id}-${index}`,
        side: side.id,
        strength: strengthPerUnit,
        maxStrength: strengthPerUnit,
        cellId,
        longitude: lng,
        latitude: lat,
        status: 'active',
        supplyConnected: true,
        daysIsolated: 0,
        experience: 1.0,
      });
    });
  };

  generateUnitsOnBorder(redState, redBorder);
  generateUnitsOnBorder(blueState, blueBorder);

  const initialCellOwners: Record<string, Side> = {};
  for (const cid in cells) {
    if (cells[cid].owner) {
      initialCellOwners[cid] = cells[cid].owner;
    }
  }

  const frontlineEdges = calculateFrontlineEdges(cells);

  const initialHistory = [{
    tick: 0,
    currentDate: date,
    redActiveTroops: redState.activeTroops,
    redReserveTroops: redState.reserveTroops,
    redLosses: redState.militaryLosses,
    redSurrendered: redState.surrendered || 0,
    redCells: redState.controlledCells,
    blueActiveTroops: blueState.activeTroops,
    blueReserveTroops: blueState.reserveTroops,
    blueLosses: blueState.militaryLosses,
    blueSurrendered: blueState.surrendered || 0,
    blueCells: blueState.controlledCells,
    redMembers: redState.members ? redState.members.map(m => ({ ...m })) : undefined,
    blueMembers: blueState.members ? blueState.members.map(m => ({ ...m })) : undefined,
    cellOwners: initialCellOwners,
    frontlineEdges: frontlineEdges,
    dailyEventText: "双方对峙局势就绪，正式拉开冲突序幕。"
  }];

  const simState: SimulationState = {
    status: 'paused',
    currentDate: date,
    tick: 0,
    speed: 1,
    seed,
    mode,
    surpriseAttackDuration: (profile && profile.surpriseAttackDuration) || 7,
    era: 'modern',
    showUnits: true,
    isAssessing: false,
    assessmentError: null,
    red: redState,
    blue: blueState,
    cells,
    frontlineEdges,
    winner: null,
    resultReason: null,
    geminiAssessment: profile || null,
    history: initialHistory,
    replayIndex: null,
    hasBeachheads: !hasAdjacency,
  };

  return simState;
}
