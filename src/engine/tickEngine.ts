import { SimulationState, SideState, UnitState, CellState, Side, ReplayFrame } from '../types/simulation';
import { calculateFrontlineEdges } from './frontlineEngine';
import { getCachedNeighbors, getCachedLatLng } from './h3Cache';
import { addDays, format } from 'date-fns';
import seedrandom from 'seedrandom';
import { gridDisk, cellToLatLng, getResolution, getHexagonAreaAvg } from 'h3-js';
import countriesData from 'world-atlas/countries-50m.json';
import { feature } from 'topojson-client';
import * as turf from '@turf/turf';

function getBorderCells(cells: Record<string, CellState>, owner: 'red' | 'blue', enemyOwner: 'red' | 'blue'): CellState[] {
  const result: CellState[] = [];
  for (const cid in cells) {
    const c = cells[cid];
    if (c.owner === owner) {
      const neighbors = getCachedNeighbors(cid);
      for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        if (cells[n] && cells[n].owner === enemyOwner) {
          result.push(c);
          break;
        }
      }
    }
  }
  return result;
}

let cachedWorldFeatures: any[] | null = null;
let featureBboxes: { feature: any, bbox: [number, number, number, number] }[] | null = null;
let filteredFeatureBboxes: { feature: any, bbox: [number, number, number, number] }[] | null = null;
let coastalCellsSet: Set<string> | null = null;
const waterCache = new Map<string, boolean>();
let landAdjacentCache: boolean | null = null;
const mainlandCache = new Map<Side, Set<string>>();

export function clearTickEngineCaches() {
  filteredFeatureBboxes = null;
  coastalCellsSet = null;
  waterCache.clear();
  landAdjacentCache = null;
  mainlandCache.clear();
}

function getWorldFeatures() {
  if (!cachedWorldFeatures) {
    try {
      const fc = feature(countriesData as any, (countriesData as any).objects.countries) as any;
      cachedWorldFeatures = fc.features || [];
      featureBboxes = cachedWorldFeatures.map(f => ({
        feature: f,
        bbox: turf.bbox(f) as [number, number, number, number]
      }));
    } catch (e) {
      cachedWorldFeatures = [];
      featureBboxes = [];
    }
  }
  return cachedWorldFeatures;
}

function getFilteredFeatureBboxes(cells: Record<string, CellState>) {
  if (filteredFeatureBboxes) return filteredFeatureBboxes;
  if (!cachedWorldFeatures) getWorldFeatures();
  const fbs = featureBboxes || [];
  if (fbs.length === 0) return [];
  
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  
  for (const cid in cells) {
    const [lat, lng] = getCachedLatLng(cid);
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  
  const bufferedBbox = [minLng - 5, minLat - 5, maxLng + 5, maxLat + 5];
  filteredFeatureBboxes = fbs.filter(({ bbox }) => {
    return !(bbox[2] < bufferedBbox[0] || bbox[0] > bufferedBbox[2] || bbox[3] < bufferedBbox[1] || bbox[1] > bufferedBbox[3]);
  });
  return filteredFeatureBboxes;
}

function getCoastalCellsSet(cells: Record<string, CellState>): Set<string> {
  if (coastalCellsSet) return coastalCellsSet;
  coastalCellsSet = new Set<string>();
  getFilteredFeatureBboxes(cells);
  for (const cid in cells) {
    const neighbors = getCachedNeighbors(cid);
    for (let i = 0; i < neighbors.length; i++) {
      const n = neighbors[i];
      if (!cells[n] && isWaterCell(n, cells)) {
        coastalCellsSet.add(cid);
        break;
      }
    }
  }
  return coastalCellsSet;
}

function isWaterCell(cellId: string, cells?: Record<string, CellState>): boolean {
  if (waterCache.has(cellId)) return waterCache.get(cellId)!;
  let isWater = true;
  try {
    const [lat, lng] = getCachedLatLng(cellId);
    const fbs = cells ? getFilteredFeatureBboxes(cells) : (featureBboxes || []);
    const pt = turf.point([lng, lat]);
    
    for (let i = 0; i < fbs.length; i++) {
      const { feature, bbox } = fbs[i];
      if (lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]) {
        if (turf.booleanPointInPolygon(pt, feature)) {
          isWater = false;
          break;
        }
      }
    }
  } catch (e) {}
  waterCache.set(cellId, isWater);
  return isWater;
}

function areCountriesLandAdjacent(cells: Record<string, CellState>): boolean {
  if (landAdjacentCache !== null) return landAdjacentCache;
  for (const cid in cells) {
    const c = cells[cid];
    if (c.originalOwner) {
      const neighbors = getCachedNeighbors(cid);
      for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        if (cells[n] && cells[n].originalOwner && cells[n].originalOwner !== c.originalOwner) {
          landAdjacentCache = true;
          return true; // Found a shared land border!
        }
      }
    }
  }
  landAdjacentCache = false;
  return false;
}

// Helper to identify mainland cells (largest contiguous land component of original territory)
function getMainlandCellSet(cells: Record<string, CellState>, side: Side): Set<string> {
  if (mainlandCache.has(side)) return mainlandCache.get(side)!;
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const cid in cells) {
    if (cells[cid].originalOwner === side && !visited.has(cid)) {
      const comp: string[] = [];
      const queue = [cid];
      visited.add(cid);
      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++];
        comp.push(curr);
        const neighbors = getCachedNeighbors(curr);
        for (let i = 0; i < neighbors.length; i++) {
          const n = neighbors[i];
          if (cells[n] && cells[n].originalOwner === side && !visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
      components.push(comp);
    }
  }

  if (components.length === 0) {
    const s = new Set<string>();
    mainlandCache.set(side, s);
    return s;
  }
  components.sort((a, b) => b.length - a.length);
  const s = new Set(components[0]);
  mainlandCache.set(side, s);
  return s;
}

function getDistanceKm(cellA: string, cellB: string): number {
  if (!cellA || !cellB) return 0;
  const [latA, lngA] = getCachedLatLng(cellA);
  const [latB, lngB] = getCachedLatLng(cellB);
  const dLat = (latA - latB) * 111.0;
  const dLng = (lngA - lngB) * 111.0 * Math.cos(((latA + latB) / 2) * (Math.PI / 180));
  return Math.hypot(dLat, dLng);
}

// BFS to find which cells of a side are connected to their Headquarters, capitals, cities, or part of a major contiguous territory
function calculateSupplyConnectivity(
  cells: Record<string, CellState>,
  redHQ: string,
  blueHQ: string,
  redCapital?: string,
  blueCapital?: string
) {
  // 1. Reset all supplyConnected to false
  for (const cid in cells) {
    cells[cid].supplyConnected = false;
  }

  let cellCount = 0;
  for (const _ in cells) {
    cellCount++;
  }
  // Dynamic threshold for major contiguous territory: 0.5% of total cells, but strictly capped between 12 and 80 cells.
  // Any cut-off component larger than this forms its own local resistance front (has enough local resources) and is not treated as a pocket.
  const majorTerritoryThreshold = Math.min(80, Math.max(12, Math.round(cellCount * 0.005)));

  // 2. Helper to find components of a given owner
  const visited = new Set<string>();

  // 3. Find all components for red and blue
  for (const cid in cells) {
    const c = cells[cid];
    if (c.owner && !visited.has(cid)) {
      const owner = c.owner;
      
      // Inline component finding for speed
      const comp: string[] = [];
      const queue: string[] = [cid];
      visited.add(cid);
      let head = 0;
      
      let hasSupplySource = false;
      let containsLandingCell = false;

      while (head < queue.length) {
        const currId = queue[head++];
        comp.push(currId);
        const cell = cells[currId];
        
        // Check for supply source while building component
        if (!hasSupplySource) {
          const isHQ = (owner === 'red' && (currId === redHQ || (redCapital && currId === redCapital))) || 
                       (owner === 'blue' && (currId === blueHQ || (blueCapital && currId === blueCapital)));
          if (isHQ || cell.isCapital || cell.isImportantCity || cell.cityName) {
            hasSupplySource = true;
          }
        }
        
        if (!containsLandingCell && cell.isLandingCell) {
          containsLandingCell = true;
        }

        const neighbors = getCachedNeighbors(currId);
        for (let j = 0; j < neighbors.length; j++) {
          const n = neighbors[j];
          if (cells[n] && cells[n].owner === owner && !visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
      
      if (comp.length >= majorTerritoryThreshold) {
        hasSupplySource = true;
      }

      if (containsLandingCell) {
        if (hasSupplySource) {
          // If already connected to main supply network, the landing force has linked up! Clear isLandingCell status
          for (let j = 0; j < comp.length; j++) {
            cells[comp[j]].isLandingCell = false;
          }
        } else {
          // Stands as a beachhead, but they HAVE SUPPLY as per user requirement! (landing troops won't be out-of-supply)
          hasSupplySource = true;
        }
      }

      // Mark all cells in this component accordingly
      for (let j = 0; j < comp.length; j++) {
        const id = comp[j];
        cells[id].supplyConnected = hasSupplySource;
        if (hasSupplySource) {
          cells[id].daysDisconnected = 0;
        } else {
          cells[id].daysDisconnected = (cells[id].daysDisconnected || 0) + 1;
        }
      }
    }
  }
}

export function simulateTick(state: SimulationState): Partial<SimulationState> {
  if (state.winner) return {}; // No more updates if game is won

  const cells = { ...state.cells };
  const red = { ...state.red, units: state.red.units.map(u => ({ ...u })) };
  const blue = { ...state.blue, units: state.blue.units.map(u => ({ ...u })) };

  const rng = seedrandom(`${state.seed}-${state.tick}`);

  const startRedLosses = state.red.militaryLosses || 0;
  const startRedSurrendered = state.red.surrendered || 0;
  const startBlueLosses = state.blue.militaryLosses || 0;
  const startBlueSurrendered = state.blue.surrendered || 0;

  let redCasMod = state.geminiAssessment?.redCasualtyModifier ?? 1.0;
  let blueCasMod = state.geminiAssessment?.blueCasualtyModifier ?? 1.0;
  let redSpeedMod = state.geminiAssessment?.redSpeedModifier ?? 1.0;
  let blueSpeedMod = state.geminiAssessment?.blueSpeedModifier ?? 1.0;

  // Track previous territory for morale calculation
  const redPreviousCells = red.controlledCells;
  const bluePreviousCells = blue.controlledCells;

  // 1. Calculate Military Powers strictly proportional to active troops and user/AI comprehensive capability scores
  const redScore = state.geminiAssessment?.redScore ?? 100;
  const blueScore = state.geminiAssessment?.blueScore ?? 100;

  // The ratio used for stalemate logic is strictly the ratio of input military strengths (redScore vs blueScore)
  const inputScoreRatio = Math.max(redScore, blueScore) / Math.max(1, Math.min(redScore, blueScore));
  
  // Requirement 2: Deadlock state detection (Updated per user request)
  const isDeadlock = (inputScoreRatio < 2.0) || 
                     (inputScoreRatio < 3.0 && state.tick >= 4) || 
                     (inputScoreRatio < 4.0 && state.tick >= 6);

  const isLandAdjacent = areCountriesLandAdjacent(cells);

  const getPowerScaling = (side: SideState) => {
    if (!isLandAdjacent) return 1.0;
    const activeUnits = side.units.filter(u => u.status !== 'destroyed');
    if (activeUnits.length === 0) return 1.0;
    const landingUnits = activeUnits.filter(u => cells[u.cellId]?.isLandingCell);
    const landingRatio = landingUnits.length / activeUnits.length;
    return 1.0 - (landingRatio * 0.5);
  };

  const redPowerScaling = getPowerScaling(red);
  const bluePowerScaling = getPowerScaling(blue);

  const baseRedPower = red.activeTroops * (redScore / 100) * (red.morale || 1.0) * red.logistics * redPowerScaling;
  const baseBluePower = blue.activeTroops * (blueScore / 100) * (blue.morale || 1.0) * blue.logistics * bluePowerScaling;

  let redPower = baseRedPower;
  let bluePower = baseBluePower;

  // Surprise attack logic
  const surpriseDuration = state.surpriseAttackDuration || 7;
  if (state.mode === 'surprise_attack') {
    if (state.tick < surpriseDuration) {
      // Defender casualties +30% during the surprise attack phase
      blueCasMod *= 1.3;
    }
    if (baseRedPower <= baseBluePower && state.tick < surpriseDuration) {
      // Attacker is weaker: can occupy small amount of territory for surprise duration
      redPower = baseBluePower * 1.35; // Artificial boost to allow initial push
      redSpeedMod *= 0.25; // Controlled speed/amount of territory
    }
  }

  // Stronger side designation and capability gap
  const isRedStronger = redPower >= bluePower;
  const strongerSide: 'red' | 'blue' = isRedStronger ? 'red' : 'blue';
  const weakerSide: 'red' | 'blue' = isRedStronger ? 'blue' : 'red';
  
  const strongerPower = isRedStronger ? redPower : bluePower;
  const weakerPower = isRedStronger ? bluePower : redPower;
  const gapRatio = strongerPower / (weakerPower || 1);

  // 2. Determine Counter-offensive probabilities.
  let isCounterOffensive = false;
  let dailyEventText = "";
  
  // Requirement 5: Amphibious Landing Mechanism
  const performLanding = (attacker: SideState, defender: SideState) => {
    if (state.disableLanding) return;
    if (attacker.controlledCells === 0 || defender.controlledCells === 0) return;
    
    // Find potential landing sites (defender's coastal cells touching actual water/sea, not neutral land borders)
    const allCoastal = getCoastalCellsSet(cells);
    const defenderCoastalCells = Object.keys(cells).filter(cid => {
      return cells[cid].owner === defender.id && allCoastal.has(cid);
    });

    if (defenderCoastalCells.length < 5) return;

    // Identify defender's mainland cells
    const defenderMainland = getMainlandCellSet(cells, defender.id);

    // Trigger condition: random chance OR if stalemate
    const landingChance = 0.05; // 5% chance per day
    if (rng() < landingChance) {
      // Requirement 5: One landing session per day, max 2 spots (beachheads)
      const spotsCount = 2;
      let spotsFound = 0;
      const shuffled = [...defenderCoastalCells].sort(() => rng() - 0.5);
      
      for (const spotId of shuffled) {
        if (spotsFound >= spotsCount) break;
        // Ensure spot is not already next to attacker territory (that would be regular push)
        const neighbors = getCachedNeighbors(spotId);
        if (neighbors.some(n => cells[n] && cells[n].owner === attacker.id)) continue;
        
        const isTargetMainland = defenderMainland.has(spotId);

        // Establish beachhead
        cells[spotId].owner = attacker.id;
        cells[spotId].isLandingCell = true; // Mark as landing cell
        cells[spotId].isMainlandLanding = isTargetMainland;
        cells[spotId].landingOriginCell = spotId;
        attacker.controlledCells++;
        defender.controlledCells--;
        spotsFound++;
        
        // Capture 1-2 neighbors to expand beachhead slightly
        for (const n of neighbors) {
          if (cells[n] && cells[n].owner === defender.id && rng() > 0.5) {
            cells[n].owner = attacker.id;
            cells[n].isLandingCell = true; // Mark as landing cell
            cells[n].isMainlandLanding = isTargetMainland;
            cells[n].landingOriginCell = spotId;
            attacker.controlledCells++;
            defender.controlledCells--;
          }
        }
      }

      if (spotsFound > 0) {
        dailyEventText += ` 【海上登陆】${attacker.countryName}海军陆战队在敌方海岸线成功建立${spotsFound}个滩头阵地，开辟第二战场！`;
      }
    }
  };

  // Only the stronger side or a side with enough troops can land
  if (gapRatio > 1.2 && !isCounterOffensive) {
    if (isRedStronger) performLanding(red, blue);
    else performLanding(blue, red);
  }

  // Check if side is defeated (no territory or no personnel)
  const redDefeated = red.controlledCells <= 0 || (red.activeTroops <= 0 && red.reserveTroops <= 0);
  const blueDefeated = blue.controlledCells <= 0 || (blue.activeTroops <= 0 && blue.reserveTroops <= 0);

  // Mobilize reserve troops to active troops if active troops are critically low (e.g. <= 10000)
  if (red.activeTroops <= 10000 && red.reserveTroops > 0) {
    const mobNeeded = Math.max(5000, Math.floor(red.initialActiveTroops * 0.1));
    const mob = Math.min(red.reserveTroops, Math.max(mobNeeded, Math.floor(red.reserveTroops * 0.2)));
    red.activeTroops += mob;
    red.reserveTroops -= mob;
  }
  if (blue.activeTroops <= 10000 && blue.reserveTroops > 0) {
    const mobNeeded = Math.max(5000, Math.floor(blue.initialActiveTroops * 0.1));
    const mob = Math.min(blue.reserveTroops, Math.max(mobNeeded, Math.floor(blue.reserveTroops * 0.2)));
    blue.activeTroops += mob;
    blue.reserveTroops -= mob;
  }

  // Requirement 2: Strictly forbid counter-offensives if military strength gap is greater than 2x (>2.0), UNLESS the weaker side has a massive troop advantage (e.g. 5x)
  const strongerActiveTroopsCalc = isRedStronger ? red.activeTroops : blue.activeTroops;
  const weakerActiveTroopsCalc = isRedStronger ? blue.activeTroops : red.activeTroops;
  const troopRatio = weakerActiveTroopsCalc / (strongerActiveTroopsCalc || 1);
  const isGapOver2x = (gapRatio >= 2.0 || (redScore / (blueScore || 1)) >= 2.0 || (blueScore / (redScore || 1)) >= 2.0) && troopRatio < 3.0;

  if (state.mode !== 'surprise_attack' && (((!isGapOver2x && gapRatio < 1.2 && state.tick < 30)) || troopRatio >= 3.0)) {
    const triggerChance = troopRatio >= 3.0 ? 0.25 : 0.05; // High chance if massive troop advantage
    if (rng() < triggerChance) {
        isCounterOffensive = true;
        const targetCountryName = weakerSide === 'red' ? red.countryName : blue.countryName;
        dailyEventText = `【防线反击】${targetCountryName}在前线指挥部组织下，乘敌进攻波次间隙发起战术反击，集中装甲力量收复失地！`;
    }
  }

  // 3. Calculate Base Casualties strictly proportional to casualty modifiers (independent of troop counts and military power)
  const isLocal = state.evalMode === 'local' || !state.geminiAssessment;
  const baselineScale = isLocal ? 10000 : 1500;
  
  // In local mode, we want the ratio to be very close to the user's input coefficients.
  // We remove the power factor so that casualty modifiers act as direct ratio inputs.
  const redPowerFactor = isLocal ? 1.0 : Math.sqrt(blueScore / redScore);
  const bluePowerFactor = isLocal ? 1.0 : Math.sqrt(redScore / blueScore);

  let redCas = Math.floor(baselineScale * (redCasMod || 1.0) * redPowerFactor * (0.9 + rng() * 0.2));
  let blueCas = Math.floor(baselineScale * (blueCasMod || 1.0) * bluePowerFactor * (0.9 + rng() * 0.2));

  // Check if there is an active engagement/combat zone (currently touching cells with different owners)
  let hasActiveEngagement = false;
  for (const cid in cells) {
    const c = cells[cid];
    if (c.owner === 'red') {
      const neighbors = getCachedNeighbors(cid);
      for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        if (cells[n] && cells[n].owner === 'blue') {
          hasActiveEngagement = true;
          break;
        }
      }
    }
    if (hasActiveEngagement) break;
  }

  if (!hasActiveEngagement) {
    redCas = 0;
    blueCas = 0;
  }

  // Requirement 1: In deadlock, attacker suffers +5% extra casualties (+5%), while defender casualties continue at normal pace
  if (isDeadlock && hasActiveEngagement) {
    if (strongerSide === 'red') {
      redCas = Math.floor(redCas * 1.05);
    } else {
      blueCas = Math.floor(blueCas * 1.05);
    }
  }

  // Daily casualty caps (max 2% daily loss per side for realistic attrition)
  // Only cap in AI mode, ensuring a minimum attrition rate if territory is still held
  if (!isLocal && hasActiveEngagement) {
    const redTotalPersonnel = red.activeTroops + red.reserveTroops;
    const blueTotalPersonnel = blue.activeTroops + blue.reserveTroops;
    if (redTotalPersonnel > 0) {
      redCas = Math.min(redCas, Math.max(50, Math.floor(redTotalPersonnel * 0.02)));
    }
    if (blueTotalPersonnel > 0) {
      blueCas = Math.min(blueCas, Math.max(50, Math.floor(blueTotalPersonnel * 0.02)));
    }
  }

  // 4. Run Supply Connectivity Check (Request 5)
  calculateSupplyConnectivity(cells, red.headquartersCell, blue.headquartersCell, red.capitalCell, blue.capitalCell);

  // Clearance logic: If disconnected for 6+ turns with multiple enemy neighbors, it gets occupied by the enemy
  for (const cid in cells) {
    const c = cells[cid];
    if (c.daysDisconnected >= 6) {
      // Find the encircling side (the side that owns the neighbors)
      const neighbors = getCachedNeighbors(c.id);
      const enemyNeighbors = neighbors.filter(n => cells[n] && cells[n].owner !== c.owner);
      if (enemyNeighbors.length >= 3) {
        const enemySide = cells[enemyNeighbors[0]].owner;
        c.owner = enemySide;
        c.daysDisconnected = 0; // Reset after capture
        c.supplyConnected = true; // Briefly connected to encircling side
      }
    }
  }

  // Apply encirclement checks & penalties to units
  const allCoastal = getCoastalCellsSet(cells);
  const powerRatioForEncirclement = isRedStronger
    ? (red.activeTroops * red.firepower) / (blue.activeTroops * blue.firepower || 1)
    : (blue.activeTroops * blue.firepower) / (red.activeTroops * red.firepower || 1);

  const applySupplyStatusToSideUnits = (side: SideState, sideId: 'red' | 'blue') => {
    const isStronger = sideId === strongerSide;
    const bypassEncirclement = isStronger && powerRatioForEncirclement > 2.0;

    side.units.forEach(u => {
      if (u.status === 'destroyed') return;
      const cell = cells[u.cellId];
      if (cell && !cell.supplyConnected) {
        if (bypassEncirclement) {
          // Ignore penalty if stronger side is surrounded and military gap > 2
          u.supplyConnected = true;
          u.status = 'active';
          u.daysIsolated = 0;
        } else {
          u.supplyConnected = false;
          u.status = 'isolated';
          u.daysIsolated = (u.daysIsolated || 0) + 1;
          // Increased attrition for isolated units (0.4%-0.8% per day) due to ammunition/fuel depletion
          const isCoastalUnit = allCoastal.has(u.cellId);
          const attritionFraction = isCoastalUnit ? 0.004 : 0.008;
          let attritionAmount = Math.min(u.strength, Math.round(u.strength * attritionFraction));
          
          // Cap per-unit isolated attrition per tick (0 when no active engagement on map)
          const sideCas = sideId === 'red' ? redCas : blueCas;
          const maxUnitAttrition = hasActiveEngagement ? Math.max(25, Math.round(sideCas * 0.06)) : 0;
          attritionAmount = Math.min(attritionAmount, maxUnitAttrition);

          if (attritionAmount > 0) {
            u.strength -= attritionAmount;
            
            // 30% are counted as military losses (killed/wounded), 70% as surrenders
            const casPortion = Math.round(attritionAmount * 0.3);
            const surrPortion = attritionAmount - casPortion;
            
            side.activeTroops = Math.max(0, side.activeTroops - attritionAmount);
            side.militaryLosses = (side.militaryLosses || 0) + casPortion;
            side.surrendered = (side.surrendered || 0) + surrPortion;
          }
          
          // Disband/destroy unit when strength falls below 500
          if (u.strength < 500) {
            u.status = 'destroyed';
            const remaining = u.strength;
            u.strength = 0;
            if (remaining > 0) {
              side.activeTroops = Math.max(0, side.activeTroops - remaining);
              side.surrendered = (side.surrendered || 0) + remaining;
            }
          }
        }
      } else {
        u.supplyConnected = true;
        u.status = 'active';
        u.daysIsolated = 0;
      }
    });
  };

  applySupplyStatusToSideUnits(red, 'red');
  applySupplyStatusToSideUnits(blue, 'blue');

  // Encirclement / Isolated unit casualty penalty: increased penalty cap (max 1.45x)
  const redIsoUnitsCount = red.units.filter(u => u.status === 'isolated').length;
  const blueIsoUnitsCount = blue.units.filter(u => u.status === 'isolated').length;

  if (redIsoUnitsCount > 0) {
    const redPenalty = 1.0 + Math.min(0.45, redIsoUnitsCount * 0.08);
    redCas = Math.floor(redCas * redPenalty);
  }
  if (blueIsoUnitsCount > 0) {
    const bluePenalty = 1.0 + Math.min(0.45, blueIsoUnitsCount * 0.08);
    blueCas = Math.floor(blueCas * bluePenalty);
  }

  // Apply casualties to units (Isolated units suffer significantly higher share, 1.7x)
  const applyCasWeighted = (side: SideState, sideId: 'red' | 'blue', cas: number) => {
    const activeUnits = side.units.filter(u => u.status !== 'destroyed');
    if (activeUnits.length === 0) return;

    let totalWeight = 0;
    activeUnits.forEach(u => {
      const cell = cells[u.cellId];
      const isInEnemyTerritory = cell && cell.originalOwner !== sideId;
      
      let weight = u.status === 'isolated' ? 1.7 : 1.0;
      // Requirement 2: Attrition increase during deadlock in enemy territory
      if (isDeadlock && isInEnemyTerritory) {
        weight *= 1.1;
      }
      totalWeight += weight;
    });

    let remaining = cas;
    activeUnits.forEach(u => {
      const cell = cells[u.cellId];
      const isInEnemyTerritory = cell && cell.originalOwner !== sideId;
      
      let weight = u.status === 'isolated' ? 1.3 : 1.0;
      if (isDeadlock && isInEnemyTerritory) {
        weight *= 1.1;
      }
      const share = Math.min(u.strength, Math.floor(cas * (weight / totalWeight)) + (rng() > 0.5 ? 1 : 0));
      u.strength -= share;
      remaining -= share;
      if (u.strength <= 0) u.status = 'destroyed';
    });
  };

  // Calculate surrender portion based on morale (5% by default, higher when morale is lower)
  const getSurrenderRatio = (morale: number) => {
    const m = Math.max(0.1, morale || 1.0);
    // Base 5% at morale 1.0. Lower morale -> higher surrender ratio
    // Tone down for local mode to avoid runaway ratios
    const baseRatio = isLocal ? 0.02 : 0.05;
    const ratio = baseRatio / Math.pow(m, 1.2);
    return Math.min(0.30, Math.max(0.01, ratio));
  };

  const redSurrenderRatio = getSurrenderRatio(red.morale);
  const blueSurrenderRatio = getSurrenderRatio(blue.morale);

  const redBaseSurrendered = Math.floor(redCas * redSurrenderRatio);
  const blueBaseSurrendered = Math.floor(blueCas * blueSurrenderRatio);

  // 4.5. Process Unit Rout (溃逃) and Surrenders (投降) based on Morale
  const processRoutsAndDirectSurrenders = (side: SideState, sideId: 'red' | 'blue') => {
    if (!hasActiveEngagement) return { routedUnits: 0, routedTroops: 0, directSurrenders: 0 };
    if ((side.morale || 1.0) >= 1.0) return { routedUnits: 0, routedTroops: 0, directSurrenders: 0 };

    // Rout probability per unit increases as morale decreases below 1.0 (reduced by 50%)
    const routBaseChance = (isLocal ? 0.03 : 0.07) * 0.5;
    const routChance = Math.max(0, 1.0 - (side.morale || 1.0)) * routBaseChance;
    let routedUnits = 0;
    let routedTroops = 0;

    side.units.forEach(u => {
      if (u.status === 'destroyed') return;
      if (rng() < routChance) {
        u.status = 'retreating';
        // Flee/desert percentage reduced by 50%
        const fleePct = (isLocal ? (0.01 + rng() * 0.02) : (0.02 + rng() * 0.04)) * 0.5;
        const fledCount = Math.floor(u.strength * fleePct);
        if (fledCount > 0) {
          u.strength -= fledCount;
          routedTroops += fledCount;
          routedUnits++;
        }
      }
    });

    if (routedTroops > 0) {
      side.activeTroops = Math.max(0, side.activeTroops - routedTroops);
    }

    // Direct surrenders from active troops due to low morale (reduced by 50%)
    const surrenderScale = (isLocal ? 0.001 : 0.0035) * 0.5;
    const directSurrenders = Math.floor(side.activeTroops * surrenderScale * Math.pow(1.0 - (side.morale || 1.0), 1.8));

    if (directSurrenders > 0) {
      side.activeTroops = Math.max(0, side.activeTroops - directSurrenders);
      applyCasWeighted(side, sideId, directSurrenders);
    }

    return { routedUnits, routedTroops, directSurrenders };
  };

  const redRouts = processRoutsAndDirectSurrenders(red, 'red');
  const blueRouts = processRoutsAndDirectSurrenders(blue, 'blue');

  const redDailySurrendered = redBaseSurrendered + redRouts.directSurrenders;
  const blueDailySurrendered = blueBaseSurrendered + blueRouts.directSurrenders;

  // Red casualty division: apply to reserves/active, and add to losses
  if (red.controlledCells > 0) {
    if (red.reserveTroops >= redCas) {
      red.reserveTroops -= redCas;
    } else {
      const overflow = redCas - red.reserveTroops;
      red.reserveTroops = 0;
      red.activeTroops = Math.max(0, red.activeTroops - overflow);
      applyCasWeighted(red, 'red', overflow);
    }
    if (redCas > 0) {
      red.militaryLosses += Math.max(1, redCas - redBaseSurrendered);
    }
    red.surrendered = (red.surrendered || 0) + redDailySurrendered;
  }

  // Blue casualty division: apply to reserves/active, and add to losses
  if (blue.controlledCells > 0) {
    if (blue.reserveTroops >= blueCas) {
      blue.reserveTroops -= blueCas;
    } else {
      const overflow = blueCas - blue.reserveTroops;
      blue.reserveTroops = 0;
      blue.activeTroops = Math.max(0, blue.activeTroops - overflow);
      applyCasWeighted(blue, 'blue', overflow);
    }
    if (blueCas > 0) {
      blue.militaryLosses += Math.max(1, blueCas - blueBaseSurrendered);
    }
    blue.surrendered = (blue.surrendered || 0) + blueDailySurrendered;
  }

  // Update alliance member statistics proportionally
  const updateMembersAfterTick = (side: SideState) => {
    if (!side.members || side.members.length === 0) return;
    const totalCurrentTroops = side.activeTroops;
    const initialTotalActive = side.initialActiveTroops || 1;

    side.members = side.members.map(m => {
      const ratio = m.initialActiveTroops / initialTotalActive;
      const currentActive = Math.max(0, Math.round(totalCurrentTroops * ratio));
      const losses = Math.max(0, m.initialActiveTroops - currentActive);
      return {
        ...m,
        activeTroops: currentActive,
        militaryLosses: losses
      };
    });
  };

  updateMembersAfterTick(red);
  updateMembersAfterTick(blue);

  let cellCountTmp = 0;
  for (const _ in cells) cellCountTmp++;
  const totalCellsCount = cellCountTmp;

  // 5. Tactical Breakthrough, Landing Assault, and Sector Operations (Request 2, 3, 4)
  const globallyCapturedInThisTick = new Set<string>();

  const flipCells = (
    attacker: 'red' | 'blue',
    defender: 'red' | 'blue',
    count: number,
    isReclaiming: boolean = false,
    customSectorCount?: number
  ) => {
    let effectiveCount = count;
    // Scale up count for smaller maps to ensure geographical advance (distanceBasedCellCount) is never throttled by the total size
    const mapSizeScale = Math.max(1.0, 1000 / Math.max(1, totalCellsCount));
    effectiveCount = effectiveCount * mapSizeScale;

    if (state.delayAdvance) {
      effectiveCount = Math.max(1, Math.round(effectiveCount * 0.5));
    }

    const attackerScore = attacker === 'red' ? redScore : blueScore;
    const attackerPower = attacker === 'red' ? redPower : bluePower;

    let scoreTierMultiplier = 1;
    if (attackerScore >= 2500 || attackerPower >= 2500) {
      scoreTierMultiplier = 10;
    } else if (attackerScore >= 1000 || attackerPower >= 1000) {
      scoreTierMultiplier = 6;
    } else if (attackerScore >= 500 || attackerPower >= 500) {
      scoreTierMultiplier = 3;
    }

    // Campaign pacing calibration: daily territorial gain per tick scales proportionally to total cells in the map
    // This makes small country wars much slower and large country wars much faster.
    let defCells: CellState[] = [];
    if (isReclaiming || attacker === weakerSide || isCounterOffensive) {
      for (const cid in cells) {
        const c = cells[cid];
        if (c.owner === defender && c.originalOwner === attacker) {
          defCells.push(c);
        }
      }
      // If all original lost territory has been recovered, push into defender's native territory!
      if (defCells.length === 0) {
        for (const cid in cells) {
          const c = cells[cid];
          if (c.owner === defender) {
            defCells.push(c);
          }
        }
      }
    } else {
      for (const cid in cells) {
        const c = cells[cid];
        if (c.owner === defender) {
          defCells.push(c);
        }
      }
    }
    if (defCells.length === 0) return 0;

    const attackerCountryName = attacker === 'red' ? red.countryName : blue.countryName;
    const defenderCountryName = defender === 'red' ? red.countryName : blue.countryName;
    
    // Fallback for targetHQ if invalid
    let targetHQ = defender === 'red' ? red.headquartersCell : blue.headquartersCell;
    if (!targetHQ || !cells[targetHQ]) {
       targetHQ = defCells[0]?.id || '';
    }

    // Find defender border cells contiguous to attacker
    const defenderBorderCells: CellState[] = [];
    for (let i = 0; i < defCells.length; i++) {
      const c = defCells[i];
      const neighbors = getCachedNeighbors(c.id);
      let bordersAttacker = false;
      for (let j = 0; j < neighbors.length; j++) {
        const n = neighbors[j];
        if (cells[n] && cells[n].owner === attacker) {
          bordersAttacker = true;
          break;
        }
      }
      if (bordersAttacker) {
        defenderBorderCells.push(c);
      }
    }

    // Distance-based progress calibration:
    // Convert real geographical advance depth (km) and frontline width (km) into cell count,
    // so small country wars (fine mesh) and large country wars (coarse mesh) progress at real km/day speeds.
    let sampleCell = '';
    for (const cid in cells) {
      sampleCell = cid;
      break;
    }
    const sampleRes = sampleCell ? getResolution(sampleCell) : 6;
    const cellAreaKm2 = getHexagonAreaAvg(sampleRes, 'km2'); // average area per cell in km2
    const cellWidthKm = Math.sqrt(cellAreaKm2) * 1.07; // approximate cell width/diameter in km

    const activeBorderCellsCount = Math.max(1, defenderBorderCells.length);
    const frontlineWidthKm = activeBorderCellsCount * cellWidthKm;

    // Baseline daily advance depth in kilometers (25 km - 55 km)
    let dailyAdvanceDepthKm = 24.0 * Math.max(0.85, Math.log10((gapRatio || 1.0) + 1));
    // Requirement 5: Keep advance speeds of big and small countries uniform and controlled.
    // Limit score tier speed multiplication so larger nations do not jump at warp speeds.
    if (scoreTierMultiplier > 1) {
      dailyAdvanceDepthKm *= Math.min(1.15, 1.0 + (scoreTierMultiplier - 1) * 0.015);
    }
    if (isCounterOffensive || isReclaiming) {
      dailyAdvanceDepthKm *= 1.2;
    }
    if (state.delayAdvance) {
      dailyAdvanceDepthKm *= 0.5;
    }

    // Target daily advance area in km²
    const targetAdvanceAreaKm2 = frontlineWidthKm * dailyAdvanceDepthKm;
    
    // Convert target advance area into cell count
    const distanceBasedCellCount = Math.max(state.delayAdvance ? 1 : 2, Math.round(targetAdvanceAreaKm2 / cellAreaKm2));

    // STRICTLY respect the caller's 'count' parameter (which implements the <5x ratio limits)
    // If defender has very few cells left (less than 50), allow faster cleanup so the simulation doesn't stall on the last few cells
    const maxDefCellsToFlip = defCells.length < 50 
      ? defCells.length 
      : Math.max(25, Math.round(defCells.length * 0.5));
    const tacticalCount = Math.min(maxDefCellsToFlip, Math.min(distanceBasedCellCount, effectiveCount));
    let flipped = 0;

    // --- SCENARIO A: AMPHIBIOUS LANDING & ISLAND-HOPPING (No direct land border currently exists) ---
    if (defenderBorderCells.length === 0) {
      if (state.disableLanding) {
        dailyEventText = `【战线停滞】由于两栖登陆功能已关闭且双方不接壤，无法发起海上突击。`;
        return 0;
      }
      const attackerHQ = attacker === 'red' ? red.headquartersCell : blue.headquartersCell;
      const [attLat, attLng] = getCachedLatLng(attackerHQ);

      // Find coastal defender cells closest to attacker's base/coast
      const sortedCoastalDefenders = [...defCells].sort((a, b) => {
        const [latA, lngA] = getCachedLatLng(a.id);
        const [latB, lngB] = getCachedLatLng(b.id);
        const distA = (latA - attLat) ** 2 + (lngA - attLng) ** 2;
        const distB = (latB - attLat) ** 2 + (lngB - attLng) ** 2;
        return distA - distB;
      });

      // Establish 1 to 5 landing beachheads (主要抢滩登陆战区)
      const numLandingSectors = Math.min(5, Math.max(1, Math.floor(sortedCoastalDefenders.length / 20)));
      const landingBeachheads = sortedCoastalDefenders.slice(0, numLandingSectors);

      for (let i = 0; i < landingBeachheads.length; i++) {
        const beachhead = landingBeachheads[i];
        if (cells[beachhead.id].owner === defender && !globallyCapturedInThisTick.has(beachhead.id)) {
          cells[beachhead.id].owner = attacker;
          globallyCapturedInThisTick.add(beachhead.id);
          flipped++;
          if (attacker === 'red') { red.controlledCells++; blue.controlledCells--; }
          else { blue.controlledCells++; red.controlledCells--; }
        }
      }

      if (flipped > 0) {
        dailyEventText = `【抢滩登陆】${attackerCountryName}海空特勤编队突入${defenderCountryName}沿海，建立${flipped}处第一阶段战术抢滩登陆场！`;
      }
      return flipped;
    }

    const weakerSideState = weakerSide === 'red' ? red : blue;
    const territoryLossPct = weakerSideState.initialCellCount > 0 ? (weakerSideState.initialCellCount - weakerSideState.controlledCells) / weakerSideState.initialCellCount : 0;

    // SCENARIO B: CONTINUOUS FRONTLINE SECTOR OPERATIONS
    // Regulated to max 5 sectors (or customSectorCount if specified)
    const maxSectorsCap = 5;
    const calculatedSectors = customSectorCount 
      ? Math.min(customSectorCount, maxSectorsCap)
      : Math.min(maxSectorsCap, Math.max(1, Math.ceil(defenderBorderCells.length / 16)));
    const numSectors = Math.min(calculatedSectors, defenderBorderCells.length);

    // Calculate distance to target HQ (capital) in km
    const [hqLat, hqLng] = targetHQ ? getCachedLatLng(targetHQ) : [0, 0];
    const minKmToHQ = defenderBorderCells.length > 0 
      ? defenderBorderCells.reduce((min, c) => {
          const [cLat, cLng] = getCachedLatLng(c.id);
          const dist = Math.hypot(cLat - hqLat, cLng - hqLng) * 111.0;
          return dist < min ? dist : min;
        }, 999999) 
      : 99999;

    const isNearCapital = !state.disableCapitalPenetration && minKmToHQ <= 200.0;

    // Determine spearheads: If within 200km of capital and capital penetration enabled, prioritize spearheads closest to the capital
    const spearheads: CellState[] = [];
    if (!state.disableCapitalPenetration && isNearCapital && targetHQ && defenderBorderCells.length > 0) {
      const sortedByHQ = [...defenderBorderCells].sort((a, b) => {
        const [latA, lngA] = getCachedLatLng(a.id);
        const [latB, lngB] = getCachedLatLng(b.id);
        const distA = Math.hypot(latA - hqLat, lngA - hqLng);
        const distB = Math.hypot(latB - hqLat, lngB - hqLng);
        return distA - distB;
      });
      const step = Math.max(1, Math.floor(sortedByHQ.length / (numSectors || 1)));
      for (let i = 0; i < sortedByHQ.length && spearheads.length < numSectors; i += step) {
        spearheads.push(sortedByHQ[i]);
      }
    } else {
      const step = Math.max(1, Math.floor(defenderBorderCells.length / (numSectors || 1)));
      for (let i = 0; i < defenderBorderCells.length && spearheads.length < numSectors; i += step) {
        spearheads.push(defenderBorderCells[i]);
      }
    }

    // Determine spearhead sector influence areas to concentrate widening and prevent full frontline creep
    const spearheadAreaCells = new Set<string>();
    const weakerMorale = weakerSide === 'red' ? red.morale : blue.morale;
    const ratio = inputScoreRatio;
    const isOverwhelmingAdvantage = ratio >= 10.0;
    let sectorRadius = isOverwhelmingAdvantage ? 4 : 8;
    if (state.delayAdvance) {
      sectorRadius = isOverwhelmingAdvantage ? 2 : 3; // Thinner/sharper spearheads under delayAdvance mode
    }

    for (let i = 0; i < spearheads.length; i++) {
      const sh = spearheads[i];
      const ringCells = gridDisk(sh.id, sectorRadius); // cells within radius rings of the attack sector center
      for (let j = 0; j < ringCells.length; j++) {
        spearheadAreaCells.add(ringCells[j]);
      }
    }

    // Power ratio based progression constraints (strictly using input score ratio as requested)
    let baseSectorLimit = 18;

    // Scale limits based on total cells to normalize speed for large vs small countries
    const scaleFactor = Math.sqrt(totalCellsCount / 500); 
    
    // Requirement 9: Rout logic - Territory loss > 70% AND capital occupied
    const isRouted = (weakerSideState.capitalOccupied && territoryLossPct > 0.7);

    if (isRouted && ratio >= 4.0) {
      baseSectorLimit = Math.round(25 * scaleFactor); 
    } else if (ratio < 2.0) {
      // 1. 低于2倍：原地僵持拉锯 (3-5格)
      baseSectorLimit = Math.max(3, Math.round(5 * scaleFactor)); 
    } else if (ratio < 3.0) {
      // 2. 2-3倍：小幅推进拉锯
      baseSectorLimit = Math.round(8 * scaleFactor);
    } else if (ratio < 4.0) {
      // 3. 3-4倍：稳步推进
      baseSectorLimit = Math.round(12 * scaleFactor);
    } else if (ratio < 5.0) {
      // 4. 4-5倍：稳步加速推进
      baseSectorLimit = Math.round(18 * scaleFactor);
    } else {
      // 5. 大于5倍：多路穿插推进
      baseSectorLimit = Math.round(25 * scaleFactor);
    }
    if (state.delayAdvance) {
      baseSectorLimit = Math.max(1, Math.round(baseSectorLimit * 0.5));
    }
    const perSectorLimit = Math.min(baseSectorLimit, Math.max(1, Math.floor(tacticalCount / (numSectors || 1))));

    // --- PRIORITIZE CLOSING POCKETS / SEMI-ENCIRCLEMENT MOUTHS ---
    // A defender-owned cell is considered a pocket mouth if it has 4 or 5 neighbors owned by the attacker.
    // We prioritize capturing cells with 5 attacker neighbors (narrowest gap), then 4.
    const hasReclaimTarget = (isReclaiming || attacker === weakerSide || isCounterOffensive) && defCells.some(c => c.originalOwner === attacker);
    const pocketMouths: CellState[] = [];
    for (let i = 0; i < defCells.length; i++) {
      const c = defCells[i];
      if (c.owner !== defender || globallyCapturedInThisTick.has(c.id)) continue;
      if (hasReclaimTarget && c.originalOwner !== attacker) continue;
      const neighbors = getCachedNeighbors(c.id);
      let attackerNeighborsCount = 0;
      for (let j = 0; j < neighbors.length; j++) {
        const n = neighbors[j];
        if (cells[n] && cells[n].owner === attacker) {
          attackerNeighborsCount++;
        }
      }
      if (attackerNeighborsCount >= 4 && attackerNeighborsCount < 6) {
        pocketMouths.push(c);
      }
    }

    pocketMouths.sort((a, b) => {
      const neighborsA = getCachedNeighbors(a.id);
      let attCountA = 0;
      for (let j = 0; j < neighborsA.length; j++) {
        if (cells[neighborsA[j]] && cells[neighborsA[j]].owner === attacker) attCountA++;
      }
      const neighborsB = getCachedNeighbors(b.id);
      let attCountB = 0;
      for (let j = 0; j < neighborsB.length; j++) {
        if (cells[neighborsB[j]] && cells[neighborsB[j]].owner === attacker) attCountB++;
      }
      return attCountB - attCountA; // Sort descending: 5 first, then 4
    });

    let pocketFlips = 0;
    // Allow up to 35% of tacticalCount to be spent closing pockets first, so we don't starve spearheads completely, but still guarantee closing gaps
    const maxPocketFlips = Math.max(2, Math.floor(tacticalCount * 0.35));
    for (let i = 0; i < pocketMouths.length; i++) {
      const mouth = pocketMouths[i];
      if (flipped >= tacticalCount || pocketFlips >= maxPocketFlips) break;
      if (cells[mouth.id].owner === defender && !globallyCapturedInThisTick.has(mouth.id)) {
        cells[mouth.id].owner = attacker;
        if (spearheadAreaCells.has(mouth.id) || cells[mouth.id].isImportantCity || cells[mouth.id].isCapital) {
          globallyCapturedInThisTick.add(mouth.id);
        }
        flipped++;
        pocketFlips++;
        if (attacker === 'red') { red.controlledCells++; blue.controlledCells--; }
        else { blue.controlledCells++; red.controlledCells--; }
      }
    }

    for (let sIdx = 0; sIdx < spearheads.length; sIdx++) {
      const startCell = spearheads[sIdx];
      let currentCell = startCell.id;
      let pierces = 0;

      // Requirement 1: If land-adjacent and landing on defender's mainland:
      // - Max advance depth 100-200km (150km) from landing origin beachhead
      // - No deep penetration/encirclement (sector limit capped at 1)
      const isMainlandLandingForce = isLandAdjacent && cells[startCell.id]?.isLandingCell && cells[startCell.id]?.isMainlandLanding;
      let effectiveSectorLimit = isMainlandLandingForce ? 1 : perSectorLimit;
      if (state.delayAdvance) {
        effectiveSectorLimit = Math.max(1, Math.round(effectiveSectorLimit * 0.5));
      }
      const landingOrigin = cells[startCell.id]?.landingOriginCell || startCell.id;

      while (pierces < effectiveSectorLimit && flipped < tacticalCount) {
        if (cells[currentCell].owner === defender && !globallyCapturedInThisTick.has(currentCell)) {
          cells[currentCell].owner = attacker;
          globallyCapturedInThisTick.add(currentCell);
          flipped++;
          if (attacker === 'red') { red.controlledCells++; blue.controlledCells--; }
          else { blue.controlledCells++; red.controlledCells--; }
        }

        // Advance to next cell with organic curve & terrain weighting for dynamic narrow spearhead
        const currentNeighbors = getCachedNeighbors(currentCell);
        const defNeighbors: string[] = [];
        for (let j = 0; j < currentNeighbors.length; j++) {
          const n = currentNeighbors[j];
          if (!cells[n] || cells[n].owner !== defender || globallyCapturedInThisTick.has(n)) continue;
          if (hasReclaimTarget && cells[n].originalOwner !== attacker) continue;
          if (isMainlandLandingForce) {
            const distFromBeachhead = getDistanceKm(landingOrigin, n);
            if (distFromBeachhead > 150.0) continue;
          }
          defNeighbors.push(n);
        }
        if (defNeighbors.length === 0) break;

        defNeighbors.sort((a, b) => {
          const [latA, lngA] = getCachedLatLng(a);
          const [latB, lngB] = getCachedLatLng(b);
          const [latHQ, lngHQ] = getCachedLatLng(targetHQ);

          const distA = Math.hypot(latA - latHQ, lngA - lngHQ);
          const distB = Math.hypot(latB - latHQ, lngB - lngHQ);

          const terrA = cells[a]?.terrainModifier ?? 1.0;
          const terrB = cells[b]?.terrainModifier ?? 1.0;

          // Natural organic curve jitter to remove stiffness
          const curveA = (rng() - 0.5) * 0.4;
          const curveB = (rng() - 0.5) * 0.4;

          // Requirement 1: If forces are within 200km of enemy capital and capital penetration enabled, prioritize capital penetration with higher distance weight
          const distKmA = distA * 111.0;
          const distKmB = distB * 111.0;
          const hqWeight = (!state.disableCapitalPenetration && (distKmA <= 200.0 || distKmB <= 200.0 || isNearCapital)) ? 1.8 : 0.0;
          return (distA * hqWeight + terrA * 0.3 + curveA) - (distB * hqWeight + terrB * 0.3 + curveB);
        });

        currentCell = defNeighbors[0];
        pierces += 1.0;
        
        // Every few pierces, try to widen the local area slightly to avoid 1-cell thin lines
        const localNeighbors = getCachedNeighbors(currentCell);
        const widenThreshold = state.delayAdvance ? 0.85 : 0.4;
        for (let j = 0; j < localNeighbors.length; j++) {
          const ln = localNeighbors[j];
          if (cells[ln] && cells[ln].owner === defender && flipped < tacticalCount && rng() > widenThreshold) {
            cells[ln].owner = attacker;
            if (spearheadAreaCells.has(ln) || cells[ln].isImportantCity || cells[ln].isCapital) {
              globallyCapturedInThisTick.add(ln);
            }
            flipped++;
            if (attacker === 'red') { red.controlledCells++; blue.controlledCells--; }
            else { blue.controlledCells++; red.controlledCells--; }
          }
        }
      }
    }

    // Process city capture events in this tick
    const defState = defender === 'red' ? red : blue;
    for (const cId of globallyCapturedInThisTick) {
      const c = cells[cId];
      if (c.isImportantCity) {
        // No morale impact as per user request
        dailyEventText = `【城市失守】${defenderCountryName}城市[${c.cityName || '重点城市'}]被占领！`;
      } else if (c.isCapital) {
        defState.capitalOccupied = true;
        defState.capitalEvacuating = false;
        // No morale impact as per user request
        dailyEventText = `【首都陷落】${defenderCountryName}首都[${c.cityName || '首都'}]被攻陷！没能完成迁都，局势急转直下！`;
      }
    }

    // Widen corridors and expand pockets section by section gradually (1 cell per captured cell)
    if (flipped < tacticalCount) {
      // Find captured cells that border defender territory and widen gradually (restricted to main attack direction sectors to avoid full front creep)
      const capturedBorder: string[] = [];
      for (const cid in cells) {
        const c = cells[cid];
        if (c.owner === attacker && spearheadAreaCells.has(cid)) {
          const neighbors = getCachedNeighbors(cid);
          let bordersDefender = false;
          for (let j = 0; j < neighbors.length; j++) {
            const n = neighbors[j];
            if (cells[n] && cells[n].owner === defender) {
              bordersDefender = true;
              break;
            }
          }
          if (bordersDefender) {
            capturedBorder.push(cid);
          }
        }
      }
      
      let borderQueue = [...Array.from(globallyCapturedInThisTick), ...capturedBorder];
      
      // Fallback: If no localized cells are found to widen, widen any cells on the border to ensure tactical progression
      if (borderQueue.length === 0) {
        const generalBorder: string[] = [];
        for (const cid in cells) {
          const c = cells[cid];
          if (c.owner === attacker) {
            const neighbors = getCachedNeighbors(cid);
            let bordersDefender = false;
            for (let j = 0; j < neighbors.length; j++) {
              const n = neighbors[j];
              if (cells[n] && cells[n].owner === defender) {
                bordersDefender = true;
                break;
              }
            }
            if (bordersDefender) {
              generalBorder.push(cid);
            }
          }
        }
        borderQueue = [...Array.from(globallyCapturedInThisTick), ...generalBorder];
      }

      let head = 0;
      while (head < borderQueue.length && flipped < tacticalCount) {
        const curr = borderQueue[head++];
        const neighbors = getCachedNeighbors(curr);
        const defNeighbors: string[] = [];
        for (let j = 0; j < neighbors.length; j++) {
          const n = neighbors[j];
          if (cells[n] && cells[n].owner === defender && !globallyCapturedInThisTick.has(n)) {
            defNeighbors.push(n);
          }
        }
        
        // Take at most 1 adjacent cell at a time to maintain thin spearhead and gradual expansion
        for (let j = 0; j < Math.min(1, defNeighbors.length); j++) {
          const n = defNeighbors[j];
          if (flipped >= tacticalCount) break;
          cells[n].owner = attacker;
          if (spearheadAreaCells.has(n) || cells[n].isImportantCity || cells[n].isCapital) {
            globallyCapturedInThisTick.add(n);
          }
          flipped++;
          if (attacker === 'red') { red.controlledCells++; blue.controlledCells--; }
          else { blue.controlledCells++; red.controlledCells--; }
        }
      }
    }

    return flipped;
  };

  let cellsFlipped = 0;

  // Requirement 2: Equal strength check
  // Balanced forces (power & score ratio <= 1.25) maintain a border tug-of-war stalemate unless one side suffers a strategic failure (e.g. encirclement)
  const powerRatio = Math.max(redPower, bluePower) / Math.max(1, Math.min(redPower, bluePower));
  const scoreRatio = Math.max(redScore, blueScore) / Math.max(1, Math.min(redScore, blueScore));
  
  const redIsolatedCount = red.units.filter(u => u.status === 'isolated').length;
  const blueIsolatedCount = blue.units.filter(u => u.status === 'isolated').length;

  const redTerritoryLossPct = red.initialCellCount > 0 ? (red.initialCellCount - red.controlledCells) / red.initialCellCount : 0;
  const blueTerritoryLossPct = blue.initialCellCount > 0 ? (blue.initialCellCount - blue.controlledCells) / blue.initialCellCount : 0;

  const redStrategicFailure = (red.capitalOccupied && redTerritoryLossPct > 0.7);
  const blueStrategicFailure = (blue.capitalOccupied && blueTerritoryLossPct > 0.7);

  const weakerSideState = weakerSide === 'red' ? red : blue;
  const weakerMorale = weakerSide === 'red' ? red.morale : blue.morale;
  const isEqualStrength = (inputScoreRatio <= 1.25) && (!redStrategicFailure && !blueStrategicFailure);

  if (state.mode === 'surprise_attack') {
    const surpriseDuration = Math.max(1, state.surpriseAttackDuration ?? 7);
    const redCountryName = red.countryName;
    const blueCountryName = blue.countryName;

    if (state.tick < surpriseDuration) {
      // Phase 1: 突袭回合内，防守方全力防御不反攻，进攻方撕开防线
      let speed = Math.max(8, Math.round(totalCellsCount * 0.015 * (0.8 + rng() * 0.4) * 2.0 * redSpeedMod));
      if (state.delayAdvance) speed = Math.max(1, Math.round(speed * 0.5));
      cellsFlipped = flipCells('red', 'blue', speed, false);
      dailyEventText = `【战前突袭】第 ${state.tick}/${surpriseDuration} 回合：${redCountryName}发起出其不意的闪电突袭！${blueCountryName}防守方猝不及防全力防守无力反击，红方装甲突击群撕开前沿防线持续推进。`;
    } else if (state.tick === surpriseDuration) {
      // Phase 2: 突袭回合结束那一回合，防守方开始反攻，同时进攻方还能在2-3个扇区内进攻
      const sectorCount = rng() < 0.5 ? 2 : 3;
      let redSpeed = Math.max(5, Math.round(totalCellsCount * 0.008 * (0.8 + rng() * 0.4) * 1.5 * redSpeedMod));
      let blueSpeed = Math.max(8, Math.round(totalCellsCount * 0.015 * (0.8 + rng() * 0.4) * 2.0 * blueSpeedMod));
      if (state.delayAdvance) {
        redSpeed = Math.max(1, Math.round(redSpeed * 0.5));
        blueSpeed = Math.max(1, Math.round(blueSpeed * 0.5));
      }
      const redFlips = flipCells('red', 'blue', redSpeed, false, sectorCount);
      const blueFlips = flipCells('blue', 'red', blueSpeed, true);
      cellsFlipped = redFlips + blueFlips;
      dailyEventText = `【攻守转换】第 ${state.tick} 回合：突袭攻势达到终点！${blueCountryName}防守主力完成战役集结并打响全线反攻；同时${redCountryName}进攻方凭借战场余威，仍在 ${sectorCount} 个前沿扇区保持顽强突击！`;
    } else {
      // Phase 3: 再往后，进攻方不再进攻，防守方反攻
      let blueSpeed = Math.max(10, Math.round(totalCellsCount * 0.02 * (0.8 + rng() * 0.4) * 2.2 * blueSpeedMod));
      if (state.delayAdvance) blueSpeed = Math.max(1, Math.round(blueSpeed * 0.5));
      cellsFlipped = flipCells('blue', 'red', blueSpeed, true);
      dailyEventText = `【防守方大反攻】第 ${state.tick} 回合：${redCountryName}突袭动能耗尽已全面转入守势停止进攻；${blueCountryName}防守军团展开战略大反攻，持续收复失地并反推敌方战线！`;
    }
  } else if (isEqualStrength) {
    // Equal strength countries battle strictly along border line (国境线反复拉锯战)
    // Removed border swapping flip logic to prevent "smooth sliding" perception
    cellsFlipped = 0;
    dailyEventText = `【战局拉锯】${red.countryName}与${blue.countryName}军事实力相当（差距 ${inputScoreRatio.toFixed(1)} 倍），在边境展开反复拉锯战，战线基本维持现状。`;
  } else if (isCounterOffensive) {
    // The weaker side reclaims some cells
    let speed = Math.max(5, Math.round(totalCellsCount * 0.001 * (0.8 + rng() * 0.4) * 2.5));
    const weakerScore = weakerSide === 'red' ? redScore : blueScore;
    if (weakerScore >= 1000 || weakerPower >= 1000) {
      speed = speed * 4;
    }
    if (state.delayAdvance) {
      speed = Math.max(1, Math.round(speed * 0.5));
    }
    cellsFlipped = flipCells(weakerSide, strongerSide, speed, true);
  } else {
    // Standard tactical breakthrough offensive by the stronger side
    const strongerActiveUnits = (strongerSide === 'red' ? red.units : blue.units).filter(u => u.status === 'active' || u.status === 'isolated');
    const strongerActiveTroops = strongerSide === 'red' ? red.activeTroops : blue.activeTroops;
    const weakerActiveTroops = weakerSide === 'red' ? red.activeTroops : blue.activeTroops;
    const strongCountry = strongerSide === 'red' ? red.countryName : blue.countryName;

    if (strongerActiveUnits.length === 0 || strongerActiveTroops <= 1000) {
      cellsFlipped = 0;
      dailyEventText = `【攻势停滞】由于${strongCountry}前线进攻主力几乎消耗殆尽，战线陷入绝对停滞。`;
    } else if (weakerActiveTroops > strongerActiveTroops * 20.0) {
      // If outnumbered by dozens of times (over 20x), the offensive force absolutely cannot advance due to massive numbers gap
      cellsFlipped = 0;
      dailyEventText = `【兵力悬殊】虽然${strongCountry}在战术及技术指标上占据优势，但面对数十倍的绝对兵力劣势，攻势被完全遏制。`;
    } else {
      const ratio = inputScoreRatio;
      let basePct = 0.005;
      if (ratio > 20.0) basePct = 0.15;
      else if (ratio > 10.0) basePct = 0.10;
      else if (ratio > 5.0) basePct = 0.06;
      else if (ratio > 4.0) basePct = 0.045;
      else if (ratio > 3.0) basePct = 0.035;
      else if (ratio > 2.0) basePct = 0.02;
      else if (ratio > 1.25) basePct = 0.012;
      if (state.delayAdvance) basePct *= 0.5;

      // Lower morale on the weaker side makes them defend poorly, making stronger side progress faster
      const weakerMorale = weakerSide === 'red' ? (red.morale || 1.0) : (blue.morale || 1.0);
      const moraleProgressModifier = Math.max(1.0, 1.5 - weakerMorale); 
      
      // Progress decay: for significant power advantage (ratio >= 2.0), momentum does not decay
      const timeDecay = ratio >= 2.0 ? 1.0 : Math.max(0.6, 1.0 - (state.tick * 0.003));

      const minSpeedFloor = state.delayAdvance ? 3 : 12;
      let speed = Math.max(minSpeedFloor, Math.round(totalCellsCount * basePct * timeDecay * moraleProgressModifier * (0.8 + rng() * 0.4) * 2.5));
      
      // Proportional slowdown if outnumbered (only applies when power gap is narrow, i.e. ratio < 1.3)
      const troopOutnumberedRatio = weakerActiveTroops / (strongerActiveTroops || 1);
      if (ratio < 1.3 && troopOutnumberedRatio > 1.5) {
        speed = Math.max(1, Math.round(speed / Math.sqrt(troopOutnumberedRatio)));
      }

      const speedMod = strongerSide === 'red' ? redSpeedMod : blueSpeedMod;
      const res = state.mapResolution || 4;
      let resNum = 4;
      if (res === 'coarse') resNum = 3;
      if (res === 'auto') resNum = 4;
      if (res === 'detailed') resNum = 5;
      if (res === 'ultra') resNum = 6;
      if (res === 'neighborhood') resNum = 7;
      if (res === 'community') resNum = 8;
      if (res === 'street') resNum = 9;
      if (res === 'building') resNum = 10;
      if (res === 'room') resNum = 11;
      const resMultiplier = 1.0;
      let modifiedSpeed = Math.max(1, Math.round(speed * speedMod * resMultiplier));
      if (state.delayAdvance) {
        modifiedSpeed = Math.max(1, Math.round(modifiedSpeed * 0.5));
      }
      

      // Implements User's Updated Strength Bracket Rules:
      // - 1-3倍：缓慢推进3-5回合后陷入拉锯（双方反复占领领土但没有呈现哪一方有明显优势，拉锯不是战线不动）
      // - 3-5倍：推进速度为正常二分之一，没有时间限制，不会僵持拉锯
      // - 5倍以上：照常（正常推进）
      if (ratio < 3.0) {
        // 1-3倍: 缓慢推进 3-5 回合后陷入拉锯
        const pullStalemateTick = 3 + Math.floor(seedrandom(`${state.seed}-stalemate`)() * 3); // 3, 4, or 5 ticks
        
        if (state.tick <= pullStalemateTick) {
          // 前 3-5 回合：缓慢推进 (e.g. 30% of normal speed)
          const slowSpeed = Math.max(1, Math.round(modifiedSpeed * 0.3));
          cellsFlipped = flipCells(strongerSide, weakerSide, slowSpeed);
          dailyEventText = `【战线缓慢推移】战力差距为 ${ratio.toFixed(1)} 倍，${strongCountry}正向前线缓慢推移。`;
        } else {
          // 3-5 回合后：陷入拉锯（双方反复占领领土，交替进退）
          const isAttackerAdvancing = (state.tick % 2 === 0) || rng() < 0.5;
          const seesawSpeed = Math.max(1, Math.round(modifiedSpeed * 0.25));

          if (isAttackerAdvancing) {
            cellsFlipped = flipCells(strongerSide, weakerSide, seesawSpeed);
            dailyEventText = `【边境拉锯战】战力差距 ${ratio.toFixed(1)} 倍，双方在前线陷入反复拉锯，${strongCountry}小幅攻占部分阵地。`;
          } else {
            // Defender reclaims slightly less than seesawSpeed to ensure net progress over time and prevent infinite loop!
            const reclaimSpeed = Math.max(1, Math.round(seesawSpeed * 0.7));
            cellsFlipped = flipCells(weakerSide, strongerSide, reclaimSpeed, true);
            dailyEventText = `【边境拉锯战】战力差距 ${ratio.toFixed(1)} 倍，双方在前线陷入反复拉锯，${weakerSideState.countryName}发起反击收复部分失地。`;
          }
        }
      } else if (ratio < 5.0) {
        // 3-5倍: 推进速度为正常二分之一，没有时间限制，不会僵持拉锯
        const halfSpeed = Math.max(1, Math.round(modifiedSpeed * 0.5));
        cellsFlipped = flipCells(strongerSide, weakerSide, halfSpeed);
        dailyEventText = `【稳步推进】战力差距 ${ratio.toFixed(1)} 倍，攻方以正常二分之一速度稳步推进战线。`;
      } else if (ratio < 10.0) {
        // 5倍以上明显优势，正常穿插推进
        cellsFlipped = flipCells(strongerSide, weakerSide, modifiedSpeed);
        if (cellsFlipped === 0) {
          dailyEventText = `【战略对峙】虽然${strongCountry}拥有绝对优势，但已被守军死死卡住的战略要地挡住攻势。`;
        } else {
          if (state.advancedCombatMode) {
            dailyEventText = `【战术击穿】拥有高达 ${ratio.toFixed(1)} 倍压倒性优势的${strongCountry}部队呈合围之势，重锤击碎守军核心防线！`;
          } else {
            if (cellsFlipped > 40) {
              dailyEventText = `【防线崩解】在 ${ratio.toFixed(1)} 倍雷霆攻势下，守军防线全线崩塌，丢下大量重装备和阵地迅速向后溃退。`;
            } else {
              dailyEventText = `【迅猛推进】${strongCountry}凭借压倒性的输入实力优势，全线快速推进并占领大量领土。`;
            }
          }
        }
      } else {
        // 10倍以上极高优势：穿插更加细长且频繁
        const penetrationSpeed = Math.round(modifiedSpeed * 1.2);
        cellsFlipped = flipCells(strongerSide, weakerSide, penetrationSpeed);
        dailyEventText = `【闪击合围】实力差距已达恐怖的 ${ratio.toFixed(1)} 倍！${strongCountry}精锐装甲集群展开大规模向心穿插，将守军战线反复分割，多处口袋阵正在形成！`;
      }
    }
  }

  // Overwrite event text when sides are not in direct contact
  if (!hasActiveEngagement) {
    cellsFlipped = 0;
    dailyEventText = `【对峙待战】双方未在前线直接接触（攻方筹备跨海登陆或正在建立对峙集结线），当日无直接地面交战人员伤亡。`;
  }

  // Requirement 2: Check Capital Evacuation Threat & Relocation Process (100km warning & 3-turn countdown)
  const checkCapitalEvacuation = (side: SideState, enemy: SideState) => {
    if (!side.capitalCell || !cells[side.capitalCell] || side.capitalOccupied) return;
    const capCell = side.capitalCell;
    
    // Check if capital cell was captured
    if (cells[capCell].owner === enemy.id) {
      side.capitalOccupied = true;
      side.capitalEvacuating = false;
      // Morale impact removed as per user request
      dailyEventText = `【首都陷落】${side.countryName}首都[${side.capitalName || '首都'}]已被攻陷！局势正急剧恶化。`;
      return;
    }

    const [capLat, capLng] = getCachedLatLng(capCell);
    let minEnemyDistKm = Infinity;

    // Calculate distance to nearest enemy cell
    const thresholdDegSq = (100.0 / 111.0) ** 2; // ~0.811
    for (const cId in cells) {
      if (cells[cId].owner === enemy.id) {
        const [eLat, eLng] = getCachedLatLng(cId);
        const dLat = capLat - eLat;
        const dLng = capLng - eLng;
        const degSq = dLat * dLat + dLng * dLng;
        if (degSq < thresholdDegSq) {
          const distKm = Math.sqrt(degSq) * 111.0;
          if (distKm < minEnemyDistKm) minEnemyDistKm = distKm;
        }
      }
    }

    if (minEnemyDistKm <= 100.0 && !side.capitalEvacuating && !side.capitalRelocated) {
      side.capitalEvacuating = true;
      side.evacuationCountdown = 3;
      dailyEventText = `【前线告急】敌军逼近${side.countryName}首都[${side.capitalName}]100公里防线！政府全面启动紧急迁都程序（预计3回合后完成）。`;
    } else if (side.capitalEvacuating) {
      side.evacuationCountdown = (side.evacuationCountdown ?? 3) - 1;
      if (side.evacuationCountdown <= 0) {
        // Find new capital in deep rear territory (prefer existing cities)
        let safeCells: CellState[] = [];
        for (const cid in cells) {
          const c = cells[cid];
          if (c.owner === side.id && cid !== capCell && (c.cityName || c.isImportantCity)) {
            safeCells.push(c);
          }
        }
        if (safeCells.length === 0) {
          for (const cid in cells) {
            const c = cells[cid];
            if (c.owner === side.id && cid !== capCell) {
              safeCells.push(c);
            }
          }
        }
        if (safeCells.length > 0) {
          const enemyHQCell = enemy.capitalCell || enemy.headquartersCell;
          let fallbackCell = '';
          for (const cid in cells) {
            fallbackCell = cid;
            break;
          }
          const [eHQLat, eHQLng] = getCachedLatLng(enemyHQCell || fallbackCell);
          
          safeCells.sort((a, b) => {
            const [latA, lngA] = getCachedLatLng(a.id);
            const [latB, lngB] = getCachedLatLng(b.id);
            const distA = Math.hypot(latA - eHQLat, lngA - eHQLng);
            const distB = Math.hypot(latB - eHQLat, lngB - eHQLng);
            return distB - distA; // furthest from enemy
          });

          const newCapCell = safeCells[0].id;
          cells[capCell].isCapital = false;
          cells[capCell].isImportantCity = true; 
          cells[capCell].isFormerCapital = true; // Mark as former capital for morale reduction
          
          cells[newCapCell].isCapital = true;
          const oldName = side.capitalName || '原首都';
          
          side.capitalCell = newCapCell;
          side.capitalName = cells[newCapCell].cityName || oldName; // Keep existing city name
          side.capitalEvacuating = false;
          side.capitalRelocated = true;

          // Morale drop removed as per user request
          dailyEventText = `【成功迁都】${side.countryName}三回合战时迁都预案顺利完成，政府成功转移至后方战略要地，原首都[${oldName}]降为重点城市！`;
        }
      } else {
        dailyEventText = `【紧急迁都】${side.countryName}政府正在紧张组织战时迁都（还需${side.evacuationCountdown}回合完成）。`;
      }
    }
  };

  checkCapitalEvacuation(red, blue);
  checkCapitalEvacuation(blue, red);

  // Calculate Morale shifts
  const redCellDiff = red.controlledCells - redPreviousCells;
  const blueCellDiff = blue.controlledCells - bluePreviousCells;
  
  // Territorial morale shifts removed as per user request
  
  // Requirement 8: Eliminate encircled pockets immediately using connected component analysis
  const reducePockets = (owner: Side) => {
    const enemy = owner === 'red' ? 'blue' : 'red';
    let totalPocketsEliminated = 0;
    
    // Identify coastal cells with sea access (water neighbors)
    const allCoastal = getCoastalCellsSet(cells);
    const seaAccessCells = new Set<string>();
    for (const cid in cells) {
      if (cells[cid].owner === owner && allCoastal.has(cid)) {
        seaAccessCells.add(cid);
      }
    }

    // Find all connected components of owner cells
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const cid in cells) {
      if (cells[cid].owner === owner && !visited.has(cid)) {
        const comp: string[] = [];
        const queue: string[] = [cid];
        visited.add(cid);
        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          comp.push(curr);
          const neighbors = getCachedNeighbors(curr);
          for (let i = 0; i < neighbors.length; i++) {
            const n = neighbors[i];
            if (cells[n] && cells[n].owner === owner && !visited.has(n)) {
              visited.add(n);
              queue.push(n);
            }
          }
        }
        components.push(comp);
      }
    }

    // Check each component to see if it is a pocket
    for (const comp of components) {
      const firstCell = cells[comp[0]];
      if (firstCell && firstCell.supplyConnected) {
        continue;
      }

      let hasEnemyNeighbor = false;
      let isCoastalComponent = false;
      for (const cid of comp) {
        if (seaAccessCells.has(cid)) {
          isCoastalComponent = true;
        }
        const neighbors = getCachedNeighbors(cid);
        for (let i = 0; i < neighbors.length; i++) {
          const n = neighbors[i];
          if (cells[n] && cells[n].owner === enemy) {
            hasEnemyNeighbor = true;
          }
        }
      }

      // If it is cut off from supply and has at least one enemy neighbor, it's a pocket!
      if (hasEnemyNeighbor) {
        // Find border cells of the pocket that touch the enemy (outer shell of the pocket)
        const borderCells: string[] = [];
        for (const cid of comp) {
          const neighbors = getCachedNeighbors(cid);
          let touchesEnemy = false;
          for (let i = 0; i < neighbors.length; i++) {
            const n = neighbors[i];
            if (cells[n] && cells[n].owner === enemy) {
              touchesEnemy = true;
              break;
            }
          }
          if (touchesEnemy) {
            borderCells.push(cid);
          }
        }

        // Shuffle border cells for organic attack origins
        for (let i = borderCells.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          const temp = borderCells[i];
          borderCells[i] = borderCells[j];
          borderCells[j] = temp;
        }

        // Fallback to prevent stall if no border cell is found
        if (borderCells.length === 0 && comp.length > 0) {
          borderCells.push(comp[0]);
        }

        // Determine how much of the pocket to collapse in this tick
        // Faster collapse: clear most on Day 1, finish by Day 2.
        const pocketDays = cells[comp[0]].daysDisconnected || 1;
        let collapseRatio = 1.0;
        if (pocketDays <= 1) {
          collapseRatio = 0.65 + rng() * 0.15; // ~65-80% on Day 1
        } else {
          collapseRatio = 1.0; // 100% on Day 2 or later
        }
        
        let collapseVolume = Math.ceil(comp.length * collapseRatio);
        // Ensure small remnants or small pockets collapse instantly
        if (comp.length <= 5) collapseVolume = comp.length;
        
        const toFlip = new Set<string>();
        const queue = [...borderCells];
        
        while (queue.length > 0 && toFlip.size < collapseVolume) {
          const curr = queue.shift()!;
          if (!toFlip.has(curr) && cells[curr].owner === owner) {
            toFlip.add(curr);
            
            const neighbors = [...getCachedNeighbors(curr)];
            // Randomize neighbor iteration for more organic shape
            for (let i = neighbors.length - 1; i > 0; i--) {
              const j = Math.floor(rng() * (i + 1));
              const temp = neighbors[i];
              neighbors[i] = neighbors[j];
              neighbors[j] = temp;
            }
            
            for (const n of neighbors) {
              if (cells[n] && cells[n].owner === owner && !toFlip.has(n)) {
                queue.push(n);
              }
            }
          }
        }

        // Flip the computed organic volume
        const pocketSize = toFlip.size;
        for (const cid of toFlip) {
          cells[cid].owner = enemy;
          globallyCapturedInThisTick.add(cid);
          totalPocketsEliminated++;
          if (enemy === 'red') {
            red.controlledCells++;
            blue.controlledCells--;
          } else {
            blue.controlledCells++;
            red.controlledCells--;
          }
        }

        // Apply casualties specifically for this eliminated outer layer of the pocket
        const encircledSide = owner === 'red' ? red : blue;
        const totalCellsBefore = Math.max(1, encircledSide.controlledCells + pocketSize);
        const cellDensity = (encircledSide.activeTroops + encircledSide.reserveTroops) / totalCellsBefore;
        const basePerCellLoss = Math.min(35, Math.max(10, Math.round(cellDensity * 0.004)));
        let trappedLoss = Math.round(pocketSize * basePerCellLoss);

        if (isCoastalComponent) {
          trappedLoss = Math.round(trappedLoss * 0.70);
        }

        const dailyCas = owner === 'red' ? blueCas : redCas;
        const maxTrappedLossCap = Math.max(100, Math.round(dailyCas * 0.20));
        trappedLoss = Math.min(trappedLoss, maxTrappedLossCap);

        if (trappedLoss > 0) {
          if (encircledSide.reserveTroops >= trappedLoss) {
            encircledSide.reserveTroops -= trappedLoss;
          } else {
            const overflow = trappedLoss - encircledSide.reserveTroops;
            encircledSide.reserveTroops = 0;
            encircledSide.activeTroops = Math.max(0, encircledSide.activeTroops - overflow);
          }
          encircledSide.militaryLosses += trappedLoss;
          encircledSide.surrendered = (encircledSide.surrendered || 0) + Math.round(trappedLoss * 0.5);
        }
      }
    }

    if (totalPocketsEliminated > 0) {
      cellsFlipped += totalPocketsEliminated;
    }
  };

  reducePockets('red');
  reducePockets('blue');

  // Strictly enforce casualty ratio bounds so encirclement penalties remain realistic (max ~1.35x of baseline ratio)
  // preventing runaway 1:85 casualty explosions.
  const redDailyAddedLoss = (red.militaryLosses - startRedLosses) + ((red.surrendered || 0) - startRedSurrendered);
  const blueDailyAddedLoss = (blue.militaryLosses - startBlueLosses) + ((blue.surrendered || 0) - startBlueSurrendered);

  const targetRatioRedToBlue = (redCasMod || 1.0) / (blueCasMod || 1.0);
  
  // Maximum allowed daily casualties for each side (allowing up to 1.35x encirclement penalty over baseline input ratio)
  const maxRedDailyLoss = Math.max(20, Math.round(blueDailyAddedLoss * targetRatioRedToBlue * 1.35));
  const maxBlueDailyLoss = Math.max(20, Math.round((redDailyAddedLoss / (targetRatioRedToBlue || 1.0)) * 1.35));

  if (redDailyAddedLoss > maxRedDailyLoss && redDailyAddedLoss > 50) {
    const factor = maxRedDailyLoss / redDailyAddedLoss;
    const addedLosses = red.militaryLosses - startRedLosses;
    const addedSurrendered = (red.surrendered || 0) - startRedSurrendered;
    red.militaryLosses = startRedLosses + Math.round(addedLosses * factor);
    red.surrendered = startRedSurrendered + Math.round(addedSurrendered * factor);
  }

  if (blueDailyAddedLoss > maxBlueDailyLoss && blueDailyAddedLoss > 50) {
    const factor = maxBlueDailyLoss / blueDailyAddedLoss;
    const addedLosses = blue.militaryLosses - startBlueLosses;
    const addedSurrendered = (blue.surrendered || 0) - startBlueSurrendered;
    blue.militaryLosses = startBlueLosses + Math.round(addedLosses * factor);
    blue.surrendered = startBlueSurrendered + Math.round(addedSurrendered * factor);
  }

  // 6. Snapping Active Units strictly to latest Border frontline (keeps units engaged)
  const currentRedBorder: string[] = [];
  const currentBlueBorder: string[] = [];
  for (const cid in cells) {
    const c = cells[cid];
    if (!c.owner) continue;
    const enemy = c.owner === 'red' ? 'blue' : 'red';
    const neighbors = getCachedNeighbors(cid);
    for (const n of neighbors) {
      if (cells[n] && cells[n].owner === enemy) {
        if (c.owner === 'red') {
          currentRedBorder.push(cid);
        } else {
          currentBlueBorder.push(cid);
        }
        break;
      }
    }
  }

  const moveUnitsToBorder = (sideState: SideState, borderCells: string[]) => {
    if (borderCells.length === 0) {
      sideState.units = [];
      return;
    }

    const targetCount = Math.max(3, Math.ceil(borderCells.length / 3));

    let activeUnits = sideState.units.filter(u => u.status !== 'destroyed');

    if (activeUnits.length < targetCount) {
      const unitsToAdd = targetCount - activeUnits.length;
      for (let i = 0; i < unitsToAdd; i++) {
        const cellId = borderCells[Math.floor(rng() * borderCells.length)];
        const [lat, lng] = getCachedLatLng(cellId);
        const unitIndex = activeUnits.length + i;
        activeUnits.push({
          id: `${sideState.id}-${unitIndex}`,
          side: sideState.id,
          cellId,
          latitude: lat,
          longitude: lng,
          status: 'active',
          strength: 1000,
          maxStrength: 1000,
          supplyConnected: true,
          daysIsolated: 0,
          experience: 1.0
        });
      }
    }

    if (activeUnits.length > targetCount * 1.5) {
      activeUnits = activeUnits.slice(0, Math.floor(targetCount * 1.2));
    }

    // 1. Sort border cells geographically (west-to-east) to get a continuous order
    const borderCellsWithCoords = borderCells.map(cid => {
      const [lat, lng] = getCachedLatLng(cid);
      return { id: cid, lat, lng };
    });
    borderCellsWithCoords.sort((a, b) => a.lng - b.lng);

    // 2. Select evenly distributed target points along the ordered border
    const targetBorderCells: { id: string; lat: number; lng: number }[] = [];
    if (activeUnits.length > 0) {
      const step = borderCellsWithCoords.length / activeUnits.length;
      for (let i = 0; i < activeUnits.length; i++) {
        const index = Math.min(borderCellsWithCoords.length - 1, Math.floor(i * step));
        targetBorderCells.push(borderCellsWithCoords[index]);
      }
    }

    // 3. Match each existing unit to its closest target border cell (minimum spatial displacement)
    // This prevents units from sliding laterally parallel to the frontline every day!
    const baseStrengthPerUnit = Math.max(100, Math.round(sideState.activeTroops / Math.max(1, activeUnits.length)));

    if (targetBorderCells.length > 0) {
      type MatchPair = { unitIdx: number; targetIdx: number; distSq: number };
      const pairs: MatchPair[] = [];

      for (let uIdx = 0; uIdx < activeUnits.length; uIdx++) {
        const u = activeUnits[uIdx];
        for (let tIdx = 0; tIdx < targetBorderCells.length; tIdx++) {
          const t = targetBorderCells[tIdx];
          const dLat = t.lat - u.latitude;
          const dLng = t.lng - u.longitude;
          pairs.push({ unitIdx: uIdx, targetIdx: tIdx, distSq: dLat * dLat + dLng * dLng });
        }
      }

      pairs.sort((a, b) => a.distSq - b.distSq);

      const assignedUnits = new Set<number>();
      const assignedTargets = new Set<number>();

      for (const pair of pairs) {
        if (!assignedUnits.has(pair.unitIdx) && !assignedTargets.has(pair.targetIdx)) {
          assignedUnits.add(pair.unitIdx);
          assignedTargets.add(pair.targetIdx);

          const unit = activeUnits[pair.unitIdx];
          const target = targetBorderCells[pair.targetIdx];

          unit.cellId = target.id;
          unit.latitude = target.lat;
          unit.longitude = target.lng;

          let strength = baseStrengthPerUnit;
          if (isLandAdjacent && cells[target.id]?.isLandingCell) {
            strength = Math.max(100, Math.round(baseStrengthPerUnit * 0.5));
          }
          unit.strength = strength;
          unit.maxStrength = strength;
        }
      }

      // Fallback for any unassigned unit if activeUnits > targetBorderCells
      for (let uIdx = 0; uIdx < activeUnits.length; uIdx++) {
        if (!assignedUnits.has(uIdx)) {
          const unit = activeUnits[uIdx];
          let bestTarget = targetBorderCells[0];
          let minD = Infinity;
          for (const t of targetBorderCells) {
            const d = (t.lat - unit.latitude) ** 2 + (t.lng - unit.longitude) ** 2;
            if (d < minD) {
              minD = d;
              bestTarget = t;
            }
          }
          if (bestTarget) {
            unit.cellId = bestTarget.id;
            unit.latitude = bestTarget.lat;
            unit.longitude = bestTarget.lng;
            unit.strength = baseStrengthPerUnit;
            unit.maxStrength = baseStrengthPerUnit;
          }
        }
      }
    }

    sideState.units = activeUnits;
  };

  moveUnitsToBorder(red, currentRedBorder);
  moveUnitsToBorder(blue, currentBlueBorder);

  // Recalculate Frontline paths
  let frontlineEdges = calculateFrontlineEdges(cells);

  // Supply line notifications in daily log if isolated units exist
  if (redIsolatedCount > 0 && rng() > 0.6) {
    dailyEventText += ` 【补给线告急】红方有 ${redIsolatedCount} 支前线部队被包围，弹尽粮绝！`;
  }
  if (blueIsolatedCount > 0 && rng() > 0.6) {
    dailyEventText += ` 【补给线告急】蓝方有 ${blueIsolatedCount} 支前线部队被包围，弹尽粮绝！`;
  }

  // Append morale events of routs and direct surrenders
  let moraleEventText = "";
  if (redRouts.routedUnits > 0 || redRouts.directSurrenders > 0) {
    moraleEventText += ` 因前线士气低落，红方有 ${redRouts.routedUnits} 支部队溃退，共计 ${(redRouts.routedTroops + redRouts.directSurrenders).toLocaleString()} 人溃逃或就地投降。`;
  }
  if (blueRouts.routedUnits > 0 || blueRouts.directSurrenders > 0) {
    moraleEventText += ` 因前线士气低落，蓝方有 ${blueRouts.routedUnits} 支部队溃退，共计 ${(blueRouts.routedTroops + blueRouts.directSurrenders).toLocaleString()} 人溃逃或就地投降。`;
  }

  if (moraleEventText) {
    dailyEventText += moraleEventText;
  }

  let winner = null;
  let resultReason = null;
  let status = state.status;

  // Victory Conditions Evaluation
  const redInitialPersonnel = red.initialActiveTroops + red.initialReserveTroops;
  const redCurrentPersonnel = red.activeTroops + red.reserveTroops;
  const redPersonnelLossPct = redInitialPersonnel > 0 ? (redInitialPersonnel - redCurrentPersonnel) / redInitialPersonnel : 0;

  const blueInitialPersonnel = blue.initialActiveTroops + blue.initialReserveTroops;
  const blueCurrentPersonnel = blue.activeTroops + blue.reserveTroops;
  const bluePersonnelLossPct = blueInitialPersonnel > 0 ? (blueInitialPersonnel - blueCurrentPersonnel) / blueInitialPersonnel : 0;

  // Track extreme casualty ratios
  red.highCasualtyTicks = red.highCasualtyTicks || 0;
  blue.highCasualtyTicks = blue.highCasualtyTicks || 0;
  
  if (red.militaryLosses > blue.militaryLosses * 20 && red.militaryLosses > 1000) {
    red.highCasualtyTicks++;
  } else {
    red.highCasualtyTicks = 0;
  }
  
  if (blue.militaryLosses > red.militaryLosses * 20 && blue.militaryLosses > 1000) {
    blue.highCasualtyTicks++;
  } else {
    blue.highCasualtyTicks = 0;
  }

  const finalPowerRatio = Math.max(redPower, bluePower) / Math.max(1, Math.min(redPower, bluePower));
  const isRedFullyDefeated = red.controlledCells <= 0 || (red.activeTroops <= 0 && red.reserveTroops <= 0);
  const isBlueFullyDefeated = blue.controlledCells <= 0 || (blue.activeTroops <= 0 && blue.reserveTroops <= 0);

  if (isRedFullyDefeated) {
    winner = 'blue';
    if (red.controlledCells <= 0) {
      resultReason = `红方(${red.countryName})全部领土已被蓝方完全攻占，国家宣告覆灭。`;
    } else {
      resultReason = `红方(${red.countryName})前线武装力量与战略预备队已完全消耗殆尽，无力再战，被迫宣告无条件投降。`;
    }
    status = 'finished';
  } else if (isBlueFullyDefeated) {
    winner = 'red';
    if (blue.controlledCells <= 0) {
      resultReason = `蓝方(${blue.countryName})全部领土已被红方完全攻占，国家宣告覆灭。`;
    } else {
      resultReason = `蓝方(${blue.countryName})前线武装力量与战略预备队已完全消耗殆尽，无力再战，被迫宣告无条件投降。`;
    }
    status = 'finished';
  } else if (finalPowerRatio < 4.0 && red.controlledCells > 0 && blue.controlledCells > 0) {
    // 差距低于四倍且双方均未覆灭/耗尽，不允许出现胜者
    winner = null;
    resultReason = null;
    status = 'running';
  } else {
    // 依然未分胜负，继续战斗
    winner = null;
    resultReason = null;
    status = 'running';
  }

  // Handle immediate surrender occupation
  const newlyFlippedWinnerCells: string[] = [];
  if (status === 'finished' && winner) {
    const loser = winner === 'red' ? 'blue' : 'red';
    for (const cid in cells) {
      if (cells[cid].owner === loser) {
        cells[cid].owner = winner;
        newlyFlippedWinnerCells.push(cid);
      }
    }
    // Update frontline immediately for the last frame
    frontlineEdges = calculateFrontlineEdges(cells);
  }

  // 7. Save Frame to History Log
  let history = state.history ? [...state.history] : [];
  if (history.length === 0) {
    const initialOwners: Record<string, Side> = {};
    const initialOriginalOwners: Record<string, Side> = {};
    for (const cid in state.cells) {
      initialOwners[cid] = state.cells[cid].owner;
      initialOriginalOwners[cid] = state.cells[cid].originalOwner;
    }
    history.push({
      tick: state.tick,
      currentDate: state.currentDate,
      redActiveTroops: state.red.activeTroops,
      redReserveTroops: state.red.reserveTroops,
      redLosses: state.red.militaryLosses,
      redSurrendered: state.red.surrendered || 0,
      redCells: state.red.controlledCells,
      blueActiveTroops: state.blue.activeTroops,
      blueReserveTroops: state.blue.reserveTroops,
      blueLosses: state.blue.militaryLosses,
      blueSurrendered: state.blue.surrendered || 0,
      blueCells: state.blue.controlledCells,
      redMembers: state.red.members ? state.red.members.map(m => ({ ...m })) : undefined,
      blueMembers: state.blue.members ? state.blue.members.map(m => ({ ...m })) : undefined,
      cellOwners: initialOwners,
      cellOriginalOwners: initialOriginalOwners,
      frontlineEdges: state.frontlineEdges,
      redUnits: state.red.units.map(u => ({ ...u })),
      blueUnits: state.blue.units.map(u => ({ ...u })),
      dailyEventText: "双方对峙局势就绪，正式拉开冲突序幕。"
    });
  }

  const cellOwners: Record<string, Side> = {};
  const cellOriginalOwners: Record<string, Side> = {};
  for (const cid in cells) {
    cellOwners[cid] = cells[cid].owner;
    cellOriginalOwners[cid] = cells[cid].originalOwner;
  }

  const nextTick = state.tick + 1;
  const nextDate = format(addDays(new Date(state.currentDate), 1), 'yyyy-MM-dd');

  const combinedCapturedThisTick = Array.from(new Set([...Array.from(globallyCapturedInThisTick), ...newlyFlippedWinnerCells]));

  if (status === 'finished' && winner) {
    const winnerSide = winner === 'red' ? red : blue;
    const loserSide = winner === 'red' ? blue : red;

    // Requirement 3: Ending Phase 1 (变动地区显示白色拖尾)
    history.push({
      tick: nextTick,
      currentDate: nextDate,
      redActiveTroops: red.activeTroops,
      redReserveTroops: red.reserveTroops,
      redLosses: red.militaryLosses,
      redSurrendered: red.surrendered || 0,
      redCells: red.controlledCells,
      blueActiveTroops: blue.activeTroops,
      blueReserveTroops: blue.reserveTroops,
      blueLosses: blue.militaryLosses,
      blueSurrendered: blue.surrendered || 0,
      blueCells: blue.controlledCells,
      redMembers: red.members ? red.members.map(m => ({ ...m })) : undefined,
      blueMembers: blue.members ? blue.members.map(m => ({ ...m })) : undefined,
      cellOwners: { ...cellOwners },
      cellOriginalOwners: { ...cellOriginalOwners },
      frontlineEdges,
      redUnits: red.units.map(u => ({ ...u })),
      blueUnits: blue.units.map(u => ({ ...u })),
      dailyEventText: `【终局时刻】${loserSide.countryName}防线全面崩溃，${winnerSide.countryName}精锐部队迅速进驻并接收全境！`,
      lastTickCapturedCells: combinedCapturedThisTick
    });

    // Requirement 3: Ending Phase 2 (显示占领 - 浅蓝/浅红)
    const dateDay2 = format(addDays(new Date(nextDate), 1), 'yyyy-MM-dd');
    history.push({
      tick: nextTick + 1,
      currentDate: dateDay2,
      redActiveTroops: red.activeTroops,
      redReserveTroops: red.reserveTroops,
      redLosses: red.militaryLosses,
      redSurrendered: red.surrendered || 0,
      redCells: red.controlledCells,
      blueActiveTroops: blue.activeTroops,
      blueReserveTroops: blue.reserveTroops,
      blueLosses: blue.militaryLosses,
      blueSurrendered: blue.surrendered || 0,
      blueCells: blue.controlledCells,
      redMembers: red.members ? red.members.map(m => ({ ...m })) : undefined,
      blueMembers: blue.members ? blue.members.map(m => ({ ...m })) : undefined,
      cellOwners: { ...cellOwners },
      cellOriginalOwners: { ...cellOriginalOwners },
      frontlineEdges: [],
      redUnits: red.units.map(u => ({ ...u })),
      blueUnits: blue.units.map(u => ({ ...u })),
      dailyEventText: `【战后管制】${winnerSide.countryName}建立战后秩序管制，全面接管全境占领设施与行政建制。`,
      lastTickCapturedCells: []
    });

    // Requirement 3: Ending Phase 3 (算入本土 - 深蓝/深红)
    const dateDay3 = format(addDays(new Date(nextDate), 2), 'yyyy-MM-dd');
    const nativeOriginalOwners: Record<string, Side> = {};
    for (const cid in cells) {
      if (cells[cid].owner === winner) {
        nativeOriginalOwners[cid] = winner;
      } else {
        nativeOriginalOwners[cid] = cells[cid].originalOwner;
      }
    }
    history.push({
      tick: nextTick + 2,
      currentDate: dateDay3,
      redActiveTroops: red.activeTroops,
      redReserveTroops: red.reserveTroops,
      redLosses: red.militaryLosses,
      redSurrendered: red.surrendered || 0,
      redCells: red.controlledCells,
      blueActiveTroops: blue.activeTroops,
      blueReserveTroops: blue.reserveTroops,
      blueLosses: blue.militaryLosses,
      blueSurrendered: blue.surrendered || 0,
      blueCells: blue.controlledCells,
      redMembers: red.members ? red.members.map(m => ({ ...m })) : undefined,
      blueMembers: blue.members ? blue.members.map(m => ({ ...m })) : undefined,
      cellOwners: { ...cellOwners },
      cellOriginalOwners: nativeOriginalOwners,
      frontlineEdges: [],
      redUnits: red.units.map(u => ({ ...u })),
      blueUnits: blue.units.map(u => ({ ...u })),
      dailyEventText: `【平定融入】战后新秩序全面确定，划定区域正式划归并彻底融入${winnerSide.countryName}国家本土。`,
      lastTickCapturedCells: []
    });
  } else {
    history.push({
      tick: nextTick,
      currentDate: nextDate,
      redActiveTroops: red.activeTroops,
      redReserveTroops: red.reserveTroops,
      redLosses: red.militaryLosses,
      redSurrendered: red.surrendered || 0,
      redCells: red.controlledCells,
      blueActiveTroops: blue.activeTroops,
      blueReserveTroops: blue.reserveTroops,
      blueLosses: blue.militaryLosses,
      blueSurrendered: blue.surrendered || 0,
      blueCells: blue.controlledCells,
      redMembers: red.members ? red.members.map(m => ({ ...m })) : undefined,
      blueMembers: blue.members ? blue.members.map(m => ({ ...m })) : undefined,
      cellOwners,
      cellOriginalOwners,
      frontlineEdges,
      redUnits: red.units.map(u => ({ ...u })),
      blueUnits: blue.units.map(u => ({ ...u })),
      dailyEventText,
      lastTickCapturedCells: Array.from(globallyCapturedInThisTick)
    });
  }

  return {
    tick: nextTick,
    currentDate: nextDate,
    cells,
    red,
    blue,
    frontlineEdges,
    winner: winner as any,
    resultReason,
    status,
    dailyEventText,
    history,
    lastTickCapturedCells: Array.from(globallyCapturedInThisTick)
  };
}
