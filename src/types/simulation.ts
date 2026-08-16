import { Feature, Polygon, MultiPolygon } from 'geojson';

export type Side = 'red' | 'blue';

export interface CountryMemberState {
  iso3: string;
  countryName: string;
  name?: string;
  activeTroops: number;
  initialActiveTroops: number;
  reserveTroops: number;
  initialReserveTroops: number;
  militaryLosses: number;
  firepower: number;
  morale: number;
  logistics: number;
  score: number;
}

export interface SideState {
  id: Side;
  name: string; // "红方" | "蓝方"
  countryName: string;
  iso2: string;
  iso3: string;
  color: string;
  activeTroops: number;
  initialActiveTroops: number;
  reserveTroops: number;
  initialReserveTroops: number;
  firepower: number;
  morale: number;
  logistics: number;
  initiative: number;
  militaryLosses: number;
  civilianLosses: number;
  controlledCells: number;
  initialCellCount: number;
  headquartersCell: string;
  headquartersOccupiedDays: number;
  units: UnitState[];
  highCasualtyTicks?: number;
  surrendered: number;
  members?: CountryMemberState[];
  capitalCell?: string;
  capitalName?: string;
  capitalEvacuating?: boolean;
  evacuationCountdown?: number;
  capitalRelocated?: boolean;
  capitalOccupied?: boolean;
}

export type UnitStatus = 'active' | 'retreating' | 'isolated' | 'destroyed';

export interface UnitState {
  id: string;
  side: Side;
  strength: number;
  maxStrength: number;
  cellId: string; // H3 index
  longitude: number;
  latitude: number;
  status: UnitStatus;
  supplyConnected: boolean;
  daysIsolated: number;
  experience: number;
}

export interface CellState {
  id: string; // H3 index
  owner: Side;
  originalOwner: Side;
  initialOriginalOwner?: Side;
  neighbors?: string[];
  terrainModifier: number;
  urbanExposure: number;
  supplyConnected: boolean;
  daysDisconnected: number;
  distanceToHeadquarters: number;
  isCapital?: boolean;
  isImportantCity?: boolean;
  isFormerCapital?: boolean;
  isLandingCell?: boolean;
  isMainlandLanding?: boolean;
  landingOriginCell?: string;
  cityName?: string;
  cityLat?: number;
  cityLng?: number;
}

export type SimulationStatus = 'setup' | 'running' | 'paused' | 'finished';

export interface GeminiAssessment {
  redScore: number;
  blueScore: number;
  ratio: number;
  reasoning: string;
  redSpeedModifier: number;
  blueSpeedModifier: number;
  redCasualtyModifier: number;
  blueCasualtyModifier: number;
  strategicPlan?: string; // AI generated strategic plan
}

export interface ReplayFrame {
  tick: number;
  currentDate: string;
  redActiveTroops: number;
  redReserveTroops: number;
  redLosses: number;
  redSurrendered?: number;
  redCells: number;
  blueActiveTroops: number;
  blueReserveTroops: number;
  blueLosses: number;
  blueSurrendered?: number;
  blueCells: number;
  redMembers?: CountryMemberState[];
  blueMembers?: CountryMemberState[];
  cellOwners: Record<string, Side>; // H3 index -> Side owner
  cellOriginalOwners?: Record<string, Side>; // H3 index -> Side originalOwner
  redUnits?: UnitState[];
  blueUnits?: UnitState[];
  frontlineEdges: [number, number][][];
  dailyEventText?: string; // event text for history replay
  lastTickCapturedCells?: string[];
  originalHistoryIdx?: number;
}

export interface SimulationState {
  status: SimulationStatus;
  currentDate: string; // YYYY-MM-DD
  startYear?: number;
  startMonth?: number;
  startDay?: number;
  localRedTroops?: number;
  localRedReserves?: number;
  localBlueTroops?: number;
  localBlueReserves?: number;
  tick: number;
  speed: number;
  seed: string;
  mode: 'balanced' | 'red_adv' | 'blue_adv' | 'random' | 'surprise_attack';
  surpriseAttackDuration?: number; // Duration of surprise attack phase in ticks/turns
  era: 'modern' | 'cold_war' | 'ww2' | 'ww1' | 'nineteenth_century';
  scenario?: 'modern' | 'ww2' | 'ww1' | 'custom_draw';
  mapResolution?: 'auto' | 'ultra' | 'detailed' | 'standard' | 'coarse' | 'neighborhood' | 'community' | 'street' | 'building' | 'room';
  advancedCombatMode?: boolean; // advanced combat mode toggle
  dailyEventText?: string; // e.g. "红方在中路发动穿插突破", "双方陷入拉锯战"
  red: SideState;
  blue: SideState;
  cells: Record<string, CellState>;
  frontlineEdges: [number, number][][]; // Array of line strings for rendering
  winner: Side | null;
  resultReason: string | null;
  geminiAssessment: GeminiAssessment | null;
  isAssessing: boolean;
  assessmentError: string | null;
  history: ReplayFrame[];
  replayIndex: number | null;
  isRecordingVideo?: boolean;
  videoProgress?: number;
  lockMap?: boolean;
  hasBeachheads?: boolean;
  disableLanding?: boolean;
  delayAdvance?: boolean;
  disableCapitalPenetration?: boolean;
  isEditMode?: boolean;
  isCedeTerritoryMode?: boolean;
  brushType?: 'red' | 'blue' | 'eraser' | 'fill_red' | 'fill_blue' | 'hq_red' | 'hq_blue';
  brushRadius?: number;
  evalMode?: 'ai' | 'local';
  showUnits: boolean;
  lastTickCapturedCells?: string[];
  mapStyle?: 'osm' | 'google' | 'google_road' | 'baidu' | 'tencent' | 'offline';
  timeMultiplier?: number;
  timelineMilestones?: any[];
  timelineAnalysis?: string;
  aiSchematicBattlefields?: any[] | null;
  aiSchematicLoading?: boolean;
}
