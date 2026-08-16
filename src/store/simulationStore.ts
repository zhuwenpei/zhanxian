import { create } from 'zustand';
import { SimulationState, SideState, UnitState, CellState, Side, SimulationStatus } from '../types/simulation';
import { generateInitialState } from '../engine/simulator';
import { simulateTick, clearTickEngineCaches } from '../engine/tickEngine';
import { getCountryName } from '../data/countryNames';
import { gridDisk, cellToLatLng, latLngToCell, getResolution } from 'h3-js';
import { calculateFrontlineEdges } from '../engine/frontlineEngine';
import { clearH3Caches, getCachedNeighbors, getCachedLatLng } from '../engine/h3Cache';
import { getScaledDateString } from '../utils/dateUtils';

interface SimulationActions {
  initSimulation: (
    redIso: string, 
    blueIso: string, 
    seed: string, 
    date: string, 
    mode: SimulationState['mode'], 
    era: SimulationState['era'],
    evalMode: 'ai' | 'local',
    localOverrides?: {
      redScore: number;
      blueScore: number;
      redCasualtyModifier: number;
      blueCasualtyModifier: number;
      redTroops?: number;
      redReserves?: number;
      blueTroops?: number;
      blueReserves?: number;
      useExistingCells?: boolean;
      scenario?: SimulationState['scenario'];
      customRedName?: string;
      customBlueName?: string;
      warMode?: 'external' | 'civil_war';
      civilWarType?: 'rebellion' | 'full_scale';
      overlapPriority?: 'red' | 'blue';
      disableLanding?: boolean;
      delayAdvance?: boolean;
      disableCapitalPenetration?: boolean;
      surpriseAttackDuration?: number;
    },
    advancedCombatMode?: boolean,
    mapResolution?: 'auto' | 'ultra' | 'detailed' | 'standard' | 'coarse' | 'neighborhood' | 'community' | 'street' | 'building' | 'room'
  ) => Promise<boolean | string>;
  runTick: () => void;
  setSpeed: (speed: number) => void;
  pause: () => void;
  play: () => void;
  reset: () => void;
  loadState: (state: SimulationState) => void;
  exportState: () => string;
  applyReplayFrame: (index: number, customCellOwners?: Record<string, Side> | boolean, customCaptured?: string[], customRedUnits?: any[], customBlueUnits?: any[]) => void;
  setEditMode: (isEdit: boolean) => void;
  setLockMap: (val: boolean) => void;
  setCedeTerritoryMode: (isCede: boolean) => void;
  setBrushType: (type: 'red' | 'blue' | 'eraser' | 'fill_red' | 'fill_blue' | 'hq_red' | 'hq_blue') => void;
  setBrushRadius: (radius: number) => void;
  paintCell: (cellId: string, type: 'red' | 'blue' | 'eraser') => void;
  floodFillCell: (cellId: string, type: 'red' | 'blue' | 'eraser', radius: number) => void;
  setHeadquartersCell: (side: Side, cellId: string) => void;
  clearAllCells: () => void;
  endWarWithResult: (result: 'red_win' | 'blue_win' | 'restore' | 'maintain' | 'treaty') => void;
  toggleShowUnits: () => void;
  mapStyle: 'osm' | 'google' | 'google_road' | 'baidu' | 'tencent' | 'offline';
  setMapStyle: (style: 'osm' | 'google' | 'google_road' | 'baidu' | 'tencent' | 'offline') => void;
  setTimeMultiplier: (multiplier: number) => void;
  setTimeRecalibration: (multiplier: number, customStartDate?: string) => void;
  mapInstance: any;
  setMapInstance: (map: any) => void;
}

export const useSimulationStore = create<SimulationState & SimulationActions>((set, get) => ({
  status: 'setup',
  mapInstance: null,
  setMapInstance: (map) => set({ mapInstance: map }),
  isEditMode: false,
  lockMap: false,
  isCedeTerritoryMode: false,
  brushType: 'red',
  brushRadius: 2,
  evalMode: 'ai',
  mapStyle: 'osm',
  setMapStyle: (style) => set({ mapStyle: style }),
  timeMultiplier: 1,
  setTimeMultiplier: (multiplier) => get().setTimeRecalibration(multiplier),
  setTimeRecalibration: (multiplier, customStartDate) => {
    const validK = Math.max(0.0001, multiplier);
    const state = get();
    let updatedHistory = state.history;
    if (customStartDate && state.history && state.history.length > 0) {
      updatedHistory = state.history.map((frame, i) => {
        if (i === 0) {
          return { ...frame, currentDate: customStartDate };
        }
        return frame;
      });
    }
    set({
      timeMultiplier: validK,
      history: updatedHistory,
      currentDate: customStartDate ? customStartDate : state.currentDate
    });
    if (updatedHistory && updatedHistory.length > 0) {
      const idx = state.replayIndex !== null ? state.replayIndex : updatedHistory.length - 1;
      get().applyReplayFrame(idx);
    }
  },
  showUnits: true,
  currentDate: '2023-01-01',
  startYear: 2023,
  startMonth: 1,
  startDay: 1,
  localRedTroops: 1000000,
  localRedReserves: 500000,
  localBlueTroops: 1000000,
  localBlueReserves: 500000,
  tick: 0,
  speed: 1,
  seed: '',
  mode: 'balanced',
  surpriseAttackDuration: 7,
  era: 'modern',
  advancedCombatMode: false,
  dailyEventText: '',
  red: {} as SideState,
  blue: {} as SideState,
  cells: {},
  frontlineEdges: [],
  winner: null,
  resultReason: null,
  geminiAssessment: null,
  isAssessing: false,
  assessmentError: null,
  history: [],
  replayIndex: null,
  isRecordingVideo: false,
  videoProgress: 0,

  initSimulation: async (redIso, blueIso, seed, date, mode, era, evalMode, localOverrides, advancedCombatMode, mapResolution = 'auto') => {
    clearH3Caches();
    clearTickEngineCaches();
    set({ isAssessing: true, assessmentError: null });
    let profile = null;
    
    // Extract year, month, day from date string for internal state
    const [y, m, d] = date.split('-').map(Number);

    try {
      const res = await fetch('/api/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redCountryName: getCountryName(redIso),
          blueCountryName: getCountryName(blueIso),
          redIso3: redIso,
          blueIso3: blueIso,
          era,
          mode,
          evalMode,
          localOverrides,
          advancedCombatMode,
          date // Pass full date for historical context
        })
      });
      if (res.ok) {
        profile = await res.json();
      } else {
        throw new Error('API server returned an error during profile generation');
      }
    } catch (err: any) {
      console.warn("Using deterministic fallback profile generator:", err.message || err);
    }

    const currentCells = localOverrides?.useExistingCells ? get().cells : undefined;
    const result = generateInitialState(
      redIso, 
      blueIso, 
      seed, 
      date, 
      mode, 
      profile, 
      mapResolution, 
      currentCells, 
      era,
      localOverrides?.customRedName,
      localOverrides?.customBlueName,
      localOverrides?.overlapPriority
    ) as any;
    if (typeof result === 'string') {
      set({ isAssessing: false, assessmentError: result });
      return result; // Error message
    }

    const initialCellOwners: Record<string, Side> = {};
    for (const cid in result.cells) {
      if (result.cells[cid].owner) {
        initialCellOwners[cid] = result.cells[cid].owner;
      }
    }

    const initialHistoryFrame = {
      tick: 0,
      currentDate: date,
      redActiveTroops: result.red.activeTroops,
      redReserveTroops: result.red.reserveTroops,
      redLosses: 0,
      redSurrendered: 0,
      redCells: result.red.controlledCells,
      blueActiveTroops: result.blue.activeTroops,
      blueReserveTroops: result.blue.reserveTroops,
      blueLosses: 0,
      blueSurrendered: 0,
      blueCells: result.blue.controlledCells,
      redMembers: result.red.members ? result.red.members.map((m: any) => ({ ...m })) : undefined,
      blueMembers: result.blue.members ? result.blue.members.map((m: any) => ({ ...m })) : undefined,
      cellOwners: initialCellOwners,
      frontlineEdges: result.frontlineEdges || []
    };

    let initialEvent = profile?.strategicPlan ? `战略制定完成：${profile.strategicPlan}` : '推演部署就绪。';
    if (result.hasBeachheads) {
      initialEvent = `【两栖登陆战】由于两国不接壤，双方已在对方海岸建立登陆桥头堡，海运通道已开启，海上登陆进攻正式打响！${initialEvent}`;
    }

    set({ 
      ...result,
      lastTickCapturedCells: [],
      era,
      evalMode,
      advancedCombatMode,
      mapResolution,
      startYear: y,
      startMonth: m,
      startDay: d,
      currentDate: date,
      localRedTroops: localOverrides?.redTroops ?? get().localRedTroops,
      localRedReserves: localOverrides?.redReserves ?? get().localRedReserves,
      localBlueTroops: localOverrides?.blueTroops ?? get().localBlueTroops,
      localBlueReserves: localOverrides?.blueReserves ?? get().localBlueReserves,
      dailyEventText: initialEvent,
      disableLanding: localOverrides?.disableLanding || false,
      delayAdvance: localOverrides?.delayAdvance || false,
      disableCapitalPenetration: localOverrides?.disableCapitalPenetration || false,
      surpriseAttackDuration: localOverrides?.surpriseAttackDuration ?? 7,
      scenario: localOverrides?.scenario || 'modern',
      isAssessing: false,
      assessmentError: null,
      timeMultiplier: 1,
      history: [initialHistoryFrame],
      replayIndex: null,
      timelineMilestones: undefined,
      timelineAnalysis: undefined,
      aiSchematicBattlefields: null,
      aiSchematicLoading: false
    });
    return true;
  },
  
  runTick: () => {
    const state = get();
    if (state.status !== 'running' && state.status !== 'paused') return;
    const nextState = simulateTick(state);
    set(nextState as any);
    
    // Save to local storage asynchronously every 50 ticks to keep UI tick execution hyper-fast
    if ((state.tick || 0) % 50 === 0) {
      setTimeout(() => {
        try {
          localStorage.setItem('simulation_autosave', get().exportState());
        } catch (e) {}
      }, 0);
    }
  },
  setSpeed: (speed) => set({ speed }),
  pause: () => {
    const state = get();
    if ((state as any)._transitionInterval) {
      clearInterval((state as any)._transitionInterval);
      (state as any)._transitionInterval = null;
    }
    set({ status: 'paused' });
    try {
      localStorage.setItem('simulation_autosave', get().exportState());
    } catch (e) {}
  },
  play: () => {
    set({ status: 'running' });
  },
  reset: () => {
    const state = get();
    if ((state as any)._transitionInterval) {
      clearInterval((state as any)._transitionInterval);
      (state as any)._transitionInterval = null;
    }
    // Re-run init with same params
    if (state.red.iso2 && state.blue.iso2) {
      const isLocal = state.evalMode === 'local' || !state.geminiAssessment;
      get().initSimulation(
        state.red.iso2, 
        state.blue.iso2, 
        state.seed, 
        state.currentDate, 
        state.mode, 
        state.era || 'modern', 
        isLocal ? 'local' : 'ai',
        isLocal ? {
          redScore: state.geminiAssessment?.redScore || 100,
          blueScore: state.geminiAssessment?.blueScore || 100,
          redCasualtyModifier: state.geminiAssessment?.redCasualtyModifier || 1.0,
          blueCasualtyModifier: state.geminiAssessment?.blueCasualtyModifier || 1.0,
          redTroops: state.localRedTroops,
          redReserves: state.localRedReserves,
          blueTroops: state.localBlueTroops,
          blueReserves: state.localBlueReserves,
          surpriseAttackDuration: state.surpriseAttackDuration
        } : {
          redScore: 100,
          blueScore: 100,
          redCasualtyModifier: 1.0,
          blueCasualtyModifier: 1.0,
          surpriseAttackDuration: state.surpriseAttackDuration
        },
        state.advancedCombatMode
      );
    }
  },
  loadState: (state) => set({ ...state, status: 'paused' }),
  toggleShowUnits: () => set(s => ({ showUnits: !s.showUnits })),
  exportState: () => {
    const state = get();
    // Exclude actions
    const { initSimulation, tick, setSpeed, pause, play, reset, loadState, exportState, applyReplayFrame, ...data } = state;
    return JSON.stringify(data);
  },

  applyReplayFrame: (index: number, customOwners?: Record<string, Side>, customCaptured?: string[], customRedUnits?: any[], customBlueUnits?: any[]) => {
    const state = get();
    if (!state.history || index < 0 || index >= state.history.length) return;
    const frame = state.history[index];
    
    if ((state as any)._transitionInterval) {
      clearInterval((state as any)._transitionInterval);
      (state as any)._transitionInterval = null;
    }

    const cellOwnersToUse = customOwners || frame.cellOwners;
    const currentCells = state.cells;
    const updatedCells = { ...currentCells };
    let cellsChanged = false;

    // Optimized update: only touch cells that need changing
    for (const cid in cellOwnersToUse) {
      const cell = currentCells[cid];
      if (cell) {
        const newOwner = cellOwnersToUse[cid];
        const initialOrig = cell.initialOriginalOwner || cell.originalOwner;
        const newOrigOwner = frame.cellOriginalOwners?.[cid] ?? initialOrig;

        if (cell.owner !== newOwner || cell.originalOwner !== newOrigOwner) {
          updatedCells[cid] = {
            ...cell,
            initialOriginalOwner: initialOrig,
            owner: newOwner,
            originalOwner: newOrigOwner
          };
          cellsChanged = true;
        }
      }
    }

    const multiplier = state.timeMultiplier || 1;
    const startDate = state.history[0]?.currentDate || frame.currentDate || '2023-01-01';
    const scaledCurrentDate = getScaledDateString(startDate, index, multiplier);

    set({
      replayIndex: index,
      currentDate: scaledCurrentDate,
      tick: frame.tick,
      dailyEventText: frame.dailyEventText || '',
      lastTickCapturedCells: customCaptured || frame.lastTickCapturedCells || [],
      red: {
        ...state.red,
        activeTroops: frame.redActiveTroops,
        reserveTroops: frame.redReserveTroops,
        militaryLosses: frame.redLosses,
        surrendered: frame.redSurrendered || 0,
        controlledCells: frame.redCells,
        members: frame.redMembers ? frame.redMembers.map(m => ({ ...m })) : state.red.members,
        units: customRedUnits || (frame.redUnits ? frame.redUnits.map(u => ({ ...u })) : [])
      },
      blue: {
        ...state.blue,
        activeTroops: frame.blueActiveTroops,
        reserveTroops: frame.blueReserveTroops,
        militaryLosses: frame.blueLosses,
        surrendered: frame.blueSurrendered || 0,
        controlledCells: frame.blueCells,
        members: frame.blueMembers ? frame.blueMembers.map(m => ({ ...m })) : state.blue.members,
        units: customBlueUnits || (frame.blueUnits ? frame.blueUnits.map(u => ({ ...u })) : [])
      },
      cells: cellsChanged ? updatedCells : currentCells,
      frontlineEdges: customOwners ? calculateFrontlineEdges(updatedCells) : frame.frontlineEdges
    });
  },

  setEditMode: (isEdit) => set({ isEditMode: isEdit }),
  setLockMap: (val) => set({ lockMap: val }),
  setCedeTerritoryMode: (isCede) => set({ isCedeTerritoryMode: isCede }),
  setBrushType: (type) => set({ brushType: type }),
  setBrushRadius: (radius) => set({ brushRadius: radius }),

  paintCell: (cellId, type) => {
    const state = get();
    const cells = { ...state.cells };
    
    if (type === 'eraser') {
      delete cells[cellId];
    } else {
      const existing = cells[cellId];
      cells[cellId] = {
        id: cellId,
        owner: type,
        originalOwner: type,
        terrainModifier: existing?.terrainModifier ?? (0.8 + Math.random() * 0.4),
        urbanExposure: existing?.urbanExposure ?? Math.random(),
        supplyConnected: true,
        distanceToHeadquarters: 0,
        daysDisconnected: 0
      };
    }
    
    const updated = recalculateMapAfterEdit(cells, state);
    set(updated as any);
  },

  floodFillCell: (cellId, type, radius) => {
    const state = get();
    const cells = { ...state.cells };
    
    const disk = gridDisk(cellId, radius);
    disk.forEach(cid => {
      if (type === 'eraser') {
        delete cells[cid];
      } else {
        const existing = cells[cid];
        cells[cid] = {
          id: cid,
          owner: type,
          originalOwner: type,
          terrainModifier: existing?.terrainModifier ?? (0.8 + Math.random() * 0.4),
          urbanExposure: existing?.urbanExposure ?? Math.random(),
          supplyConnected: true,
          distanceToHeadquarters: 0,
          daysDisconnected: 0
        };
      }
    });

    const updated = recalculateMapAfterEdit(cells, state);
    set(updated as any);
  },

  setHeadquartersCell: (side, cellId) => {
    const state = get();
    const cells = { ...state.cells };
    if (!cells[cellId]) return;
    
    cells[cellId].owner = side;
    
    const sideKey = side === 'red' ? 'red' : 'blue';
    const updated = recalculateMapAfterEdit(cells, state);
    set({
      ...updated,
      [sideKey]: {
        ...updated[sideKey],
        headquartersCell: cellId
      }
    } as any);
  },

  clearAllCells: () => {
    const state = get();
    const emptyCells: Record<string, CellState> = {};
    
    set({
      cells: emptyCells,
      frontlineEdges: [],
      red: {
        ...state.red,
        controlledCells: 0,
        initialCellCount: 0,
        headquartersCell: '',
        units: []
      },
      blue: {
        ...state.blue,
        controlledCells: 0,
        initialCellCount: 0,
        headquartersCell: '',
        units: []
      }
    });
  },

  endWarWithResult: (result) => {
    const state = get();
    const cells = { ...state.cells };
    let reason = "";

    if (result === 'red_win') {
      for (const cid in cells) {
        if (cells[cid].owner) cells[cid].owner = 'red';
      }
      reason = `${state.blue.countryName} 宣布投降，${state.red.countryName} 赢得全面胜利并占领全境。`;
    } else if (result === 'blue_win') {
      for (const cid in cells) {
        if (cells[cid].owner) cells[cid].owner = 'blue';
      }
      reason = `${state.red.countryName} 宣布投降，${state.blue.countryName} 赢得全面胜利并占领全境。`;
    } else if (result === 'restore') {
      for (const cid in cells) {
        cells[cid].owner = cells[cid].originalOwner;
      }
      reason = "双方达成停战协议，恢复战前边界，所有占领区已归还。";
    } else if (result === 'treaty') {
      const smoothedCells = applyPeaceTreatyBorderSmoothing(cells);
      for (const cid in cells) {
        cells[cid].owner = smoothedCells[cid].owner;
      }
      reason = "双方签署和平条约，在维持当前战线基础上清理包围圈与严重突出部，重新划定并融入更合理的国家边界。";
    } else {
      reason = "双方签订紧急停战协议，维持当前战线，推演结束。";
    }

    const updatedState = recalculateMapAfterEdit(cells, state);
    
    // Capture final frame for history
    const finalCellOwners: Record<string, Side> = {};
    const finalOriginalOwners: Record<string, Side> = {};
    for (const cid in updatedState.cells) {
      finalCellOwners[cid] = updatedState.cells[cid].owner;
      finalOriginalOwners[cid] = updatedState.cells[cid].originalOwner;
    }

    const baseFrame = {
      tick: state.tick + 1,
      currentDate: state.currentDate,
      redActiveTroops: updatedState.red.activeTroops,
      redReserveTroops: updatedState.red.reserveTroops,
      redLosses: updatedState.red.militaryLosses,
      redSurrendered: updatedState.red.surrendered || 0,
      redCells: updatedState.red.controlledCells,
      blueActiveTroops: updatedState.blue.activeTroops,
      blueReserveTroops: updatedState.blue.reserveTroops,
      blueLosses: updatedState.blue.militaryLosses,
      blueSurrendered: updatedState.blue.surrendered || 0,
      blueCells: updatedState.blue.controlledCells,
      redMembers: updatedState.red.members ? updatedState.red.members.map((m: any) => ({ ...m })) : undefined,
      blueMembers: updatedState.blue.members ? updatedState.blue.members.map((m: any) => ({ ...m })) : undefined,
      cellOwners: finalCellOwners,
      cellOriginalOwners: finalOriginalOwners,
      frontlineEdges: updatedState.frontlineEdges || [],
      dailyEventText: reason
    };

    let endingFrames = [baseFrame];

    if (result === 'red_win' || result === 'blue_win' || result === 'maintain' || result === 'treaty') {
      const isCompleteWin = result === 'red_win' || result === 'blue_win';
      const winnerName = isCompleteWin 
        ? (result === 'red_win' ? state.red.countryName : state.blue.countryName)
        : "双方";

      // Frame 1: Highlight captured cells (cells that are currently occupied, i.e. owner !== originalOwner)
      const capturedCells: string[] = [];
      for (const cid in cells) {
        if (cells[cid].owner && cells[cid].originalOwner && cells[cid].owner !== cells[cid].originalOwner) {
          capturedCells.push(cid);
        }
      }

      const frame1 = {
        ...baseFrame,
        dailyEventText: `【终局时刻】${reason}`,
        lastTickCapturedCells: capturedCells
      };

      // Frame 2: Occupational administration / demarcation
      const frame2 = {
        ...baseFrame,
        tick: state.tick + 2,
        dailyEventText: isCompleteWin 
          ? `【战后管制】${winnerName}建立战后秩序管制，全面接管全境设施。`
          : `【战线停火】双方建立停火隔离带，重新划定并管制前线实际控制区。`,
        lastTickCapturedCells: []
      };

      // Frame 3: Native territory transition: turn all currently occupied cells into native/original territories of their respective owners
      const nativeOriginals: Record<string, Side> = {};
      for (const cid in cells) {
        if (cells[cid].owner) {
          nativeOriginals[cid] = cells[cid].owner;
        } else {
          nativeOriginals[cid] = cells[cid].originalOwner;
        }
      }

      const frame3 = {
        ...baseFrame,
        tick: state.tick + 3,
        cellOriginalOwners: nativeOriginals,
        dailyEventText: isCompleteWin
          ? `【平定融入】战后新秩序全面确定，划定区域正式划归并彻底融入${winnerName}国家本土。`
          : `【领土确认】根据停战成果重新划定法定国界，占领区正式划归并彻底融入各自国家本土。`,
        lastTickCapturedCells: []
      };

      endingFrames = [frame1, frame2, frame3];
    }

    set({ 
      ...updatedState,
      status: 'finished',
      resultReason: reason,
      history: [...(state.history || []), ...endingFrames],
      winner: result === 'red_win' ? 'red' : (result === 'blue_win' ? 'blue' : null)
    } as any);
  }
}));

const recalculateMapAfterEdit = (cells: Record<string, CellState>, currentState: SimulationState) => {
  let redCellsCount = 0;
  let blueCellsCount = 0;
  const allIds = Object.keys(cells);
  
  for (let i = 0; i < allIds.length; i++) {
    const c = cells[allIds[i]];
    if (c.owner === 'red') redCellsCount++;
    else if (c.owner === 'blue') blueCellsCount++;
  }
  
  let redHQ = currentState.red.headquartersCell;
  if (!redHQ || !cells[redHQ] || cells[redHQ].owner !== 'red') {
    for (let i = 0; i < allIds.length; i++) {
      if (cells[allIds[i]].owner === 'red') {
        redHQ = allIds[i];
        break;
      }
    }
  }
  
  let blueHQ = currentState.blue.headquartersCell;
  if (!blueHQ || !cells[blueHQ] || cells[blueHQ].owner !== 'blue') {
    for (let i = 0; i < allIds.length; i++) {
      if (cells[allIds[i]].owner === 'blue') {
        blueHQ = allIds[i];
        break;
      }
    }
  }

  const redBorder: string[] = [];
  const blueBorder: string[] = [];
  for (let i = 0; i < allIds.length; i++) {
    const cid = allIds[i];
    const c = cells[cid];
    const neighbors = getCachedNeighbors(cid);
    for (let j = 0; j < neighbors.length; j++) {
      const n = neighbors[j];
      if (cells[n] && cells[n].owner !== c.owner) {
        if (c.owner === 'red') redBorder.push(cid);
        else blueBorder.push(cid);
        break;
      }
    }
  }

  const redistributeUnits = (sideId: 'red' | 'blue', border: string[], activeTroops: number) => {
    if (border.length === 0) return [];
    
    const unitCount = border.length;
    const strengthPerUnit = Math.max(100, Math.round((activeTroops || 100000) / unitCount));
    
    return border.map((cellId, index) => {
      const [lat, lng] = getCachedLatLng(cellId);
      return {
        id: `${sideId}-${index}`,
        side: sideId,
        strength: strengthPerUnit,
        maxStrength: strengthPerUnit,
        cellId,
        longitude: lng,
        latitude: lat,
        status: 'active' as const,
        supplyConnected: true,
        daysIsolated: 0,
        experience: 1.0,
      };
    });
  };

  const redUnits = redistributeUnits('red', redBorder, currentState.red.activeTroops || 100000);
  const blueUnits = redistributeUnits('blue', blueBorder, currentState.blue.activeTroops || 100000);

  const frontlineEdges = calculateFrontlineEdges(cells);
  clearTickEngineCaches();

  return {
    cells,
    red: {
      ...currentState.red,
      controlledCells: redCellsCount,
      initialCellCount: redCellsCount,
      headquartersCell: redHQ,
      units: redUnits
    },
    blue: {
      ...currentState.blue,
      controlledCells: blueCellsCount,
      initialCellCount: blueCellsCount,
      headquartersCell: blueHQ,
      units: blueUnits
    },
    frontlineEdges
  };
};

function applyPeaceTreatyBorderSmoothing(cells: Record<string, CellState>): Record<string, CellState> {
  const newCells: Record<string, CellState> = JSON.parse(JSON.stringify(cells));

  // 1. Record initial status prior to treaty smoothing
  const initialOccupancy: Record<string, { owner: Side; originalOwner: Side; wasOccupied: boolean }> = {};
  for (const cid in cells) {
    initialOccupancy[cid] = {
      owner: cells[cid].owner,
      originalOwner: cells[cid].originalOwner,
      wasOccupied: cells[cid].owner !== cells[cid].originalOwner
    };
  }

  // 2. Identify global land components and per-side original mainlands
  const visitedGlobal = new Set<string>();
  const globalLandComponents: string[][] = [];

  for (const cid in cells) {
    if (!visitedGlobal.has(cid)) {
      const comp: string[] = [];
      const queue = [cid];
      visitedGlobal.add(cid);
      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++];
        comp.push(curr);
        const neighbors = getCachedNeighbors(curr);
        for (const n of neighbors) {
          if (n !== curr && cells[n] && !visitedGlobal.has(n)) {
            visitedGlobal.add(n);
            queue.push(n);
          }
        }
      }
      globalLandComponents.push(comp);
    }
  }

  globalLandComponents.sort((a, b) => b.length - a.length);
  const globalMainlandSet = new Set<string>(globalLandComponents[0] || []);

  const getSideOriginalMainland = (side: Side) => {
    const visited = new Set<string>();
    const comps: string[][] = [];
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
          for (const n of neighbors) {
            if (n !== curr && cells[n] && cells[n].originalOwner === side && !visited.has(n)) {
              visited.add(n);
              queue.push(n);
            }
          }
        }
        comps.push(comp);
      }
    }
    comps.sort((a, b) => b.length - a.length);
    return new Set<string>(comps[0] || []);
  };

  const redOriginalMainland = getSideOriginalMainland('red');
  const blueOriginalMainland = getSideOriginalMainland('blue');

  // Identify island cells (cells that are physically separated from global mainland or original side mainland)
  const islandCellSet = new Set<string>();
  for (const cid in cells) {
    const origOwner = cells[cid].originalOwner;
    const isGlobalMainland = globalMainlandSet.has(cid);
    const isSideMainland = origOwner === 'red' ? redOriginalMainland.has(cid) : blueOriginalMainland.has(cid);
    
    if (!isGlobalMainland || !isSideMainland) {
      islandCellSet.add(cid);
    }
  }

  // Helper to find connected components of a side and clean up mainland pockets
  const cleanupPockets = () => {
    for (const side of ['red', 'blue'] as const) {
      const visited = new Set<string>();
      const components: string[][] = [];
      
      for (const cid in newCells) {
        if (newCells[cid].owner === side && !visited.has(cid)) {
          const comp: string[] = [];
          const queue = [cid];
          visited.add(cid);
          
          while (queue.length > 0) {
            const curr = queue.shift()!;
            comp.push(curr);
            
            const neighbors = getCachedNeighbors(curr);
            for (const n of neighbors) {
              if (n !== curr && newCells[n] && newCells[n].owner === side && !visited.has(n)) {
                visited.add(n);
                queue.push(n);
              }
            }
          }
          components.push(comp);
        }
      }
      
      if (components.length > 1) {
        components.sort((a, b) => b.length - a.length);
        const otherSide = side === 'red' ? 'blue' : 'red';
        for (let i = 1; i < components.length; i++) {
          for (const cid of components[i]) {
            // Rule: If island cell, ONLY flip to other side if it was ALREADY occupied prior to peace treaty.
            // Unoccupied island cells MUST remain with their original owner!
            if (islandCellSet.has(cid)) {
              if (initialOccupancy[cid].wasOccupied) {
                newCells[cid].owner = otherSide;
              } else {
                newCells[cid].owner = initialOccupancy[cid].originalOwner;
              }
            } else {
              // Mainland pocket cleanup
              newCells[cid].owner = otherSide;
            }
          }
        }
      }
    }
  };

  // 1. Initial pocket cleanup
  cleanupPockets();

  // 2. Perform majority & salient smoothing until convergence to resolve all bulges/protrusions/semi-enclosed areas
  for (let iter = 0; iter < 20; iter++) {
    const tempOwners: Record<string, 'red' | 'blue'> = {};
    let changed = false;
    
    for (const cid in newCells) {
      const currentOwner = newCells[cid].owner;
      if (!currentOwner) continue;
      
      // Island protection rule during smoothing:
      // An island cell that was NOT occupied prior to peace treaty CANNOT be flipped to enemy during smoothing.
      if (islandCellSet.has(cid) && !initialOccupancy[cid].wasOccupied) {
        continue;
      }

      const neighbors = getCachedNeighbors(cid);
      let redCount = 0;
      let blueCount = 0;
      
      for (const n of neighbors) {
        if (n !== cid && newCells[n]) {
          if (newCells[n].owner === 'red') redCount++;
          else if (newCells[n].owner === 'blue') blueCount++;
        }
      }
      
      const totalNeighbors = redCount + blueCount;
      if (totalNeighbors === 0) continue;
      
      const enemyCount = currentOwner === 'red' ? blueCount : redCount;
      const friendlyCount = currentOwner === 'red' ? redCount : blueCount;
      const otherSide = currentOwner === 'red' ? 'blue' : 'red';

      // Salient / Protrusion / Semi-enclosed pocket rule:
      if (enemyCount >= 4 || (enemyCount >= 3 && friendlyCount <= 2)) {
        if (islandCellSet.has(cid)) {
          if (initialOccupancy[cid].wasOccupied && otherSide === initialOccupancy[cid].owner) {
            tempOwners[cid] = otherSide;
            changed = true;
          }
        } else {
          tempOwners[cid] = otherSide;
          changed = true;
        }
      }
    }
    
    if (!changed) break;
    
    // Apply changes in this pass
    for (const cid in tempOwners) {
      newCells[cid].owner = tempOwners[cid];
    }
  }

  // 3. Final pocket cleanup
  cleanupPockets();

  // 4. Final strict check for island cells:
  // "规定如果是岛屿那么签订和平条约后只有先前已经占领的岛屿才能占领。"
  // Any island cell that was NOT occupied prior to signing the peace treaty MUST remain with its original owner!
  for (const cid in newCells) {
    if (islandCellSet.has(cid)) {
      if (!initialOccupancy[cid].wasOccupied) {
        newCells[cid].owner = initialOccupancy[cid].originalOwner;
      }
    }
  }

  return newCells;
}
