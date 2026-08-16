import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSimulationStore } from '../store/simulationStore';
import { generateSchematicData, KeyBattlefield, createCurvedArrowPolygon } from '../utils/schematicGenerator';
import { Download, Share2, Maximize2, Minimize2, Eye, EyeOff, Swords, X, Calendar, Shield, Users, Trophy, Target } from 'lucide-react';

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors, &copy; CARTO'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: { 'background-color': '#f8fafc' }
    },
    {
      id: 'osm',
      type: 'raster' as const,
      source: 'osm',
      paint: { 'raster-opacity': 0.92 }
    }
  ]
};

export default function WarSchematicMap() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const { red, blue, history, cells, currentDate, startYear, startMonth, startDay, era, winner, resultReason } = useSimulationStore();
  
  const [activePhase, setActivePhase] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [showEncirclement, setShowEncirclement] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [selectedBattlefield, setSelectedBattlefield] = useState<KeyBattlefield | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string | null>(null);

  const [aiBattlefields, setAiBattlefields] = useState<KeyBattlefield[] | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [mapZoom, setMapZoom] = useState<number>(6);

  const startDateStr = `${startYear || 2026}-${String(startMonth || 4).padStart(2, '0')}-${String(startDay || 21).padStart(2, '0')}`;
  const endDateStr = currentDate || '2026-05-27';

  const schematicData = useMemo(() => {
    const baseData = generateSchematicData(red, blue, history, cells, startDateStr, endDateStr, mapZoom);
    if (!aiBattlefields || aiBattlefields.length === 0) return baseData;

    // Replace keyBattlefields
    baseData.keyBattlefields = aiBattlefields;

    // Create new military markers list, filtering out generic placeholder battlefields
    const markers = baseData.militaryMarkers.features.filter(
      (f: any) => f.properties.type !== 'key_battlefield'
    );

    // Push new key_battlefield markers
    aiBattlefields.forEach(kb => {
      markers.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [kb.lng, kb.lat] },
        properties: {
          id: kb.id,
          name: kb.name,
          type: 'key_battlefield',
          phase: kb.phase,
          date: kb.date,
          redForces: kb.redForces,
          blueForces: kb.blueForces,
          redLosses: kb.redLosses,
          blueLosses: kb.blueLosses
        }
      });
    });
    baseData.militaryMarkers.features = markers;

    return baseData;
  }, [red, blue, history, cells, startDateStr, endDateStr, aiBattlefields, mapZoom]);

  const schematicDataRef = useRef(schematicData);
  useEffect(() => {
    schematicDataRef.current = schematicData;
  }, [schematicData]);

  // Fetch AI-enhanced battlefields and tactical arrows
  useEffect(() => {
    const baseData = generateSchematicData(red, blue, history, cells, startDateStr, endDateStr, 6);
    const baselineBattles = baseData.keyBattlefields;

    const fetchAiBattles = async () => {
      setIsAiLoading(true);
      try {
        const historySummary = history.map(f => ({
          tick: f.tick,
          date: f.currentDate,
          redActive: f.redActiveTroops,
          blueActive: f.blueActiveTroops,
          redLosses: f.redLosses,
          blueLosses: f.blueLosses,
          redCells: f.redCells,
          blueCells: f.blueCells,
          dailyEventText: f.dailyEventText
        }));

        const response = await fetch('/api/generate-schematic-battles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            redName: red.countryName || '红方',
            blueName: blue.countryName || '蓝方',
            era,
            winner,
            resultReason,
            keyBattlefields: baselineBattles,
            historySummary
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.keyBattlefields && data.keyBattlefields.length > 0) {
            setAiBattlefields(data.keyBattlefields);
          }
        }
      } catch (err) {
        console.warn('AI battles fetch failed:', err);
      } finally {
        setIsAiLoading(false);
      }
    };

    fetchAiBattles();
  }, [red, blue, history, cells]);

  // Push AI battlefields and arrows to MapLibre on the fly
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;

    const data = schematicData;
    try {
      if (map.getSource('military-markers')) {
        (map.getSource('military-markers') as maplibregl.GeoJSONSource).setData(data.militaryMarkers);
      }
      if (map.getSource('red-original-territory') && data.redOriginalTerritory) {
        (map.getSource('red-original-territory') as maplibregl.GeoJSONSource).setData(data.redOriginalTerritory);
      }
      if (map.getSource('blue-original-territory') && data.blueOriginalTerritory) {
        (map.getSource('blue-original-territory') as maplibregl.GeoJSONSource).setData(data.blueOriginalTerritory);
      }
      if (map.getSource('phase1-arrows')) {
        (map.getSource('phase1-arrows') as maplibregl.GeoJSONSource).setData(data.phase1Arrows);
      }
      if (map.getSource('phase2-arrows')) {
        (map.getSource('phase2-arrows') as maplibregl.GeoJSONSource).setData(data.phase2Arrows);
      }
      if (map.getSource('phase3-arrows')) {
        (map.getSource('phase3-arrows') as maplibregl.GeoJSONSource).setData(data.phase3Arrows);
      }
      if (map.getSource('phase4-arrows')) {
        (map.getSource('phase4-arrows') as maplibregl.GeoJSONSource).setData(data.phase4Arrows);
      }
      if (map.getSource('phase5-arrows')) {
        (map.getSource('phase5-arrows') as maplibregl.GeoJSONSource).setData(data.phase5Arrows);
      }
    } catch (e) {
      console.warn('Map source update failed:', e);
    }
  }, [styleLoaded, schematicData]);

  useEffect(() => {
    const handleFSChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsMapFullscreen(isFS);
      setTimeout(() => {
        mapRef.current?.resize();
      }, 100);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange);
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    // schematicData is memoized at component level

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: OSM_STYLE as any,
      center: [(schematicData.bounds[0] + schematicData.bounds[2]) / 2, (schematicData.bounds[1] + schematicData.bounds[3]) / 2],
      zoom: 6,
      preserveDrawingBuffer: true,
      antialias: false,
      powerPreference: 'high-performance'
    } as any);

    mapRef.current = map;

    map.on('zoom', () => {
      setMapZoom(map.getZoom());
    });

    // Add navigation controls for zooming/panning
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');

    map.on('load', () => {
      const currentData = schematicDataRef.current;
      // Fit to war boundary with tighter padding for better zoom
      map.fitBounds(
        [[currentData.bounds[0], currentData.bounds[1]], [currentData.bounds[2], currentData.bounds[3]]],
        { padding: 25, duration: 1000, maxZoom: 19 }
      );

      // Create high-DPI 2x custom star icon for capital
      const createStarCanvas = () => {
        const c = document.createElement('canvas'); c.width = 48; c.height = 48;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#dc2626'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
        ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeText('★', 24, 25); ctx.fillText('★', 24, 25);
        return ctx.getImageData(0, 0, 48, 48);
      };

      const createCrossCanvas = () => {
        const c = document.createElement('canvas'); c.width = 32; c.height = 32;
        const ctx = c.getContext('2d')!;
        ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(26, 26); ctx.moveTo(26, 6); ctx.lineTo(6, 26); ctx.stroke();
        return ctx.getImageData(0, 0, 32, 32);
      };

      const createSwordsCanvas = () => {
        const c = document.createElement('canvas'); c.width = 48; c.height = 48;
        const ctx = c.getContext('2d')!;
        ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = '#eab308'; ctx.shadowBlur = 8;
        ctx.fillText('⚔️', 24, 24);
        return ctx.getImageData(0, 0, 48, 48);
      };

      // Canvas pattern generator for dense diagonal territory hatching
      const createHatchCanvas = (color: string) => {
        const c = document.createElement('canvas'); c.width = 8; c.height = 8;
        const ctx = c.getContext('2d')!;
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-2, 2); ctx.lineTo(2, -2);
        ctx.moveTo(0, 8); ctx.lineTo(8, 0);
        ctx.moveTo(6, 10); ctx.lineTo(10, 6);
        ctx.stroke();
        return ctx.getImageData(0, 0, 8, 8);
      };

      if (!map.hasImage('schematic-star')) map.addImage('schematic-star', createStarCanvas(), { pixelRatio: 2 });
      if (!map.hasImage('schematic-capital-star')) map.addImage('schematic-capital-star', createStarCanvas(), { pixelRatio: 2 });
      if (!map.hasImage('schematic-cross')) map.addImage('schematic-cross', createCrossCanvas(), { pixelRatio: 2 });
      if (!map.hasImage('schematic-crossed-swords')) map.addImage('schematic-crossed-swords', createSwordsCanvas(), { pixelRatio: 2 });
      if (!map.hasImage('hatch-p1')) map.addImage('hatch-p1', createHatchCanvas('#dc2626'), { pixelRatio: 2 });
      if (!map.hasImage('hatch-p2')) map.addImage('hatch-p2', createHatchCanvas('#ea580c'), { pixelRatio: 2 });
      if (!map.hasImage('hatch-p3')) map.addImage('hatch-p3', createHatchCanvas('#a855f7'), { pixelRatio: 2 });
      if (!map.hasImage('hatch-p4')) map.addImage('hatch-p4', createHatchCanvas('#10b981'), { pixelRatio: 2 });
      if (!map.hasImage('hatch-p5')) map.addImage('hatch-p5', createHatchCanvas('#3b82f6'), { pixelRatio: 2 });

      // Add Sources
      map.addSource('red-original-territory', { type: 'geojson', data: currentData.redOriginalTerritory });
      map.addSource('blue-original-territory', { type: 'geojson', data: currentData.blueOriginalTerritory });
      map.addSource('phase1-territory', { type: 'geojson', data: currentData.phase1Territory });
      map.addSource('phase2-territory', { type: 'geojson', data: currentData.phase2Territory });
      map.addSource('phase3-territory', { type: 'geojson', data: currentData.phase3Territory });

      map.addSource('phase1-arrows', { type: 'geojson', data: currentData.phase1Arrows });
      map.addSource('phase2-arrows', { type: 'geojson', data: currentData.phase2Arrows });
      map.addSource('phase3-arrows', { type: 'geojson', data: currentData.phase3Arrows });
      map.addSource('phase4-arrows', { type: 'geojson', data: currentData.phase4Arrows });
      map.addSource('phase5-arrows', { type: 'geojson', data: currentData.phase5Arrows });
      map.addSource('retreat-arrows', { type: 'geojson', data: currentData.enemyRetreatArrows });

      map.addSource('phase1-frontline', { type: 'geojson', data: currentData.phase1Frontline });
      map.addSource('phase2-frontline', { type: 'geojson', data: currentData.phase2Frontline });
      map.addSource('phase3-frontline', { type: 'geojson', data: currentData.phase3Frontline });
      map.addSource('phase4-frontline', { type: 'geojson', data: currentData.phase4Frontline });
      map.addSource('phase5-frontline', { type: 'geojson', data: currentData.phase5Frontline });

      map.addSource('phase4-territory', { type: 'geojson', data: currentData.phase4Territory });
      map.addSource('phase5-territory', { type: 'geojson', data: currentData.phase5Territory });

      map.addSource('encirclement-zones', { type: 'geojson', data: currentData.encirclementZones });
      map.addSource('military-markers', { type: 'geojson', data: currentData.militaryMarkers });

      // Add Layers

      // 1. Captured Territory Hatching Layers (Phase 1, Phase 2, Phase 3)
      map.addLayer({
        id: 'phase1-territory-fill',
        type: 'fill',
        source: 'phase1-territory',
        paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.12 }
      });
      map.addLayer({
        id: 'phase1-territory-hatch',
        type: 'fill',
        source: 'phase1-territory',
        paint: { 'fill-pattern': 'hatch-p1', 'fill-opacity': 0.70 }
      });

      map.addLayer({
        id: 'phase2-territory-fill',
        type: 'fill',
        source: 'phase2-territory',
        paint: { 'fill-color': '#f97316', 'fill-opacity': 0.12 }
      });
      map.addLayer({
        id: 'phase2-territory-hatch',
        type: 'fill',
        source: 'phase2-territory',
        paint: { 'fill-pattern': 'hatch-p2', 'fill-opacity': 0.70 }
      });

      map.addLayer({
        id: 'phase3-territory-fill',
        type: 'fill',
        source: 'phase3-territory',
        paint: { 'fill-color': '#a855f7', 'fill-opacity': 0.12 }
      });
      map.addLayer({
        id: 'phase3-territory-hatch',
        type: 'fill',
        source: 'phase3-territory',
        paint: { 'fill-pattern': 'hatch-p3', 'fill-opacity': 0.70 }
      });

      map.addLayer({
        id: 'phase4-territory-fill',
        type: 'fill',
        source: 'phase4-territory',
        paint: { 'fill-color': '#10b981', 'fill-opacity': 0.12 }
      });
      map.addLayer({
        id: 'phase4-territory-hatch',
        type: 'fill',
        source: 'phase4-territory',
        paint: { 'fill-pattern': 'hatch-p4', 'fill-opacity': 0.70 }
      });

      map.addLayer({
        id: 'phase5-territory-fill',
        type: 'fill',
        source: 'phase5-territory',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.12 }
      });
      map.addLayer({
        id: 'phase5-territory-hatch',
        type: 'fill',
        source: 'phase5-territory',
        paint: { 'fill-pattern': 'hatch-p5', 'fill-opacity': 0.70 }
      });

      // Original Territory Outline Layers (Thin red & blue lines)
      map.addLayer({
        id: 'red-original-territory-line',
        type: 'line',
        source: 'red-original-territory',
        paint: {
          'line-color': '#dc2626',
          'line-width': 1.8,
          'line-opacity': 0.85
        }
      });

      map.addLayer({
        id: 'blue-original-territory-line',
        type: 'line',
        source: 'blue-original-territory',
        paint: {
          'line-color': '#2563eb',
          'line-width': 1.8,
          'line-opacity': 0.85
        }
      });

      // Encirclement zones fill & outline
      map.addLayer({
        id: 'encirclement-fill',
        type: 'fill',
        source: 'encirclement-zones',
        paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.18 }
      });
      map.addLayer({
        id: 'encirclement-line',
        type: 'line',
        source: 'encirclement-zones',
        paint: { 'line-color': '#dc2626', 'line-width': 2, 'line-dasharray': [3, 2] }
      });
      map.addLayer({
        id: 'encirclement-cross',
        type: 'symbol',
        source: 'encirclement-zones',
        layout: {
          'icon-image': 'schematic-cross',
          'icon-size': 0.5,
          'icon-allow-overlap': true
        }
      });

      // Phase 1 Arrows & Line
      map.addLayer({
        id: 'phase1-arrow-fill',
        type: 'fill',
        source: 'phase1-arrows',
        paint: { 'fill-color': '#dc2626', 'fill-opacity': 0.82 }
      });
      map.addLayer({
        id: 'phase1-arrow-line',
        type: 'line',
        source: 'phase1-arrows',
        paint: { 'line-color': '#991b1b', 'line-width': 1.5 }
      });
      map.addLayer({
        id: 'phase1-frontline-layer',
        type: 'line',
        source: 'phase1-frontline',
        paint: { 'line-color': '#dc2626', 'line-width': 3.5, 'line-dasharray': [4, 2] }
      });

      // Phase 2 Arrows & Line
      map.addLayer({
        id: 'phase2-arrow-fill',
        type: 'fill',
        source: 'phase2-arrows',
        paint: { 'fill-color': '#ea580c', 'fill-opacity': 0.82 }
      });
      map.addLayer({
        id: 'phase2-arrow-line',
        type: 'line',
        source: 'phase2-arrows',
        paint: { 'line-color': '#c2410c', 'line-width': 1.5 }
      });
      map.addLayer({
        id: 'phase2-frontline-layer',
        type: 'line',
        source: 'phase2-frontline',
        paint: { 'line-color': '#ea580c', 'line-width': 3.5, 'line-dasharray': [4, 2] }
      });

      // Phase 3 Arrows & Line
      map.addLayer({
        id: 'phase3-arrow-fill',
        type: 'fill',
        source: 'phase3-arrows',
        paint: { 'fill-color': '#a855f7', 'fill-opacity': 0.82 }
      });
      map.addLayer({
        id: 'phase3-arrow-line',
        type: 'line',
        source: 'phase3-arrows',
        paint: { 'line-color': '#7e22ce', 'line-width': 1.5 }
      });
      map.addLayer({
        id: 'phase3-frontline-layer',
        type: 'line',
        source: 'phase3-frontline',
        paint: { 'line-color': '#a855f7', 'line-width': 3.5, 'line-dasharray': [4, 2] }
      });

      // Phase 4 Arrows & Line
      map.addLayer({
        id: 'phase4-arrow-fill',
        type: 'fill',
        source: 'phase4-arrows',
        paint: { 'fill-color': '#10b981', 'fill-opacity': 0.82 }
      });
      map.addLayer({
        id: 'phase4-arrow-line',
        type: 'line',
        source: 'phase4-arrows',
        paint: { 'line-color': '#059669', 'line-width': 1.5 }
      });
      map.addLayer({
        id: 'phase4-frontline-layer',
        type: 'line',
        source: 'phase4-frontline',
        paint: { 'line-color': '#10b981', 'line-width': 3.5, 'line-dasharray': [4, 2] }
      });

      // Phase 5 Arrows & Line
      map.addLayer({
        id: 'phase5-arrow-fill',
        type: 'fill',
        source: 'phase5-arrows',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.82 }
      });
      map.addLayer({
        id: 'phase5-arrow-line',
        type: 'line',
        source: 'phase5-arrows',
        paint: { 'line-color': '#2563eb', 'line-width': 1.5 }
      });
      map.addLayer({
        id: 'phase5-frontline-layer',
        type: 'line',
        source: 'phase5-frontline',
        paint: { 'line-color': '#3b82f6', 'line-width': 3.5, 'line-dasharray': [4, 2] }
      });

      // Enemy Retreat Line
      map.addLayer({
        id: 'retreat-arrow-fill',
        type: 'fill',
        source: 'retreat-arrows',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.65 }
      });

      // Key Battlefield Crossed Swords ⚔️ Layer (clear crisp size)
      map.addLayer({
        id: 'markers-key-battlefield',
        type: 'symbol',
        source: 'military-markers',
        filter: ['==', ['get', 'type'], 'key_battlefield'],
        layout: {
          'icon-image': 'schematic-crossed-swords',
          'icon-size': 0.85,
          'icon-allow-overlap': true,
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 12.0,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#991b1b',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2.2
        }
      });

      // Markers & Labels (Capitals / Cities / HQ) - Clear readable sizes
      map.addLayer({
        id: 'markers-capital',
        type: 'symbol',
        source: 'military-markers',
        filter: ['==', ['get', 'type'], 'capital'],
        layout: {
          'icon-image': 'schematic-capital-star',
          'icon-size': 0.8,
          'icon-allow-overlap': true
        }
      });

      map.addLayer({
        id: 'markers-labels',
        type: 'symbol',
        source: 'military-markers',
        filter: ['!=', ['get', 'type'], 'key_battlefield'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 11.5,
          'text-offset': [0, 1.0],
          'text-anchor': 'top',
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#0f172a',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2.2
        }
      });

      // Click event for Key Battlefield Modal
      map.on('click', 'markers-key-battlefield', (e) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          setSelectedBattlefield(props as any);
        }
      });
      map.on('mouseenter', 'markers-key-battlefield', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'markers-key-battlefield', () => { map.getCanvas().style.cursor = ''; });

      setStyleLoaded(true);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Handle Resize on Fullscreen Toggle
  useEffect(() => {
    setTimeout(() => {
      mapRef.current?.resize();
    }, 150);
  }, [isMapFullscreen]);

  // Filter Layers based on selected Phase
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const setVis = (layerId: string, vis: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', vis ? 'visible' : 'none');
      }
    };

    const p1Vis = activePhase === 'all' || activePhase === 1;
    const p2Vis = activePhase === 'all' || activePhase === 2;
    const p3Vis = activePhase === 'all' || activePhase === 3;
    const p4Vis = activePhase === 'all' || activePhase === 4;
    const p5Vis = activePhase === 'all' || activePhase === 5;

    setVis('phase1-territory-fill', p1Vis);
    setVis('phase1-territory-hatch', p1Vis);
    setVis('phase1-arrow-fill', p1Vis);
    setVis('phase1-arrow-line', p1Vis);
    setVis('phase1-frontline-layer', p1Vis);

    setVis('phase2-territory-fill', p2Vis);
    setVis('phase2-territory-hatch', p2Vis);
    setVis('phase2-arrow-fill', p2Vis);
    setVis('phase2-arrow-line', p2Vis);
    setVis('phase2-frontline-layer', p2Vis);

    setVis('phase3-territory-fill', p3Vis);
    setVis('phase3-territory-hatch', p3Vis);
    setVis('phase3-arrow-fill', p3Vis);
    setVis('phase3-arrow-line', p3Vis);
    setVis('phase3-frontline-layer', p3Vis);

    setVis('phase4-territory-fill', p4Vis);
    setVis('phase4-territory-hatch', p4Vis);
    setVis('phase4-arrow-fill', p4Vis);
    setVis('phase4-arrow-line', p4Vis);
    setVis('phase4-frontline-layer', p4Vis);

    setVis('phase5-territory-fill', p5Vis);
    setVis('phase5-territory-hatch', p5Vis);
    setVis('phase5-arrow-fill', p5Vis);
    setVis('phase5-arrow-line', p5Vis);
    setVis('phase5-frontline-layer', p5Vis);
  }, [activePhase]);

  // Toggle Encirclement Zones
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const setVis = (layerId: string, vis: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', vis ? 'visible' : 'none');
      }
    };

    setVis('encirclement-fill', showEncirclement);
    setVis('encirclement-line', showEncirclement);
    setVis('encirclement-cross', showEncirclement);
  }, [showEncirclement]);

  // Toggle Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const setVis = (layerId: string, vis: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', vis ? 'visible' : 'none');
      }
    };

    setVis('markers-capital', showMarkers);
    setVis('markers-labels', showMarkers);
    setVis('markers-key-battlefield', showMarkers);
  }, [showMarkers]);

  // Handle Classical Poster PNG Export (Formatted exactly like the reference picture)
  const handleExportPNG = async () => {
    const map = mapRef.current;
    if (!map || !mapContainer.current || isExporting) return;
    setIsExporting(true);
    setExportError(null);

    // Save original state
    const originalWidth = mapContainer.current.style.width;
    const originalHeight = mapContainer.current.style.height;
    const originalPosition = mapContainer.current.style.position;
    const originalZIndex = mapContainer.current.style.zIndex;
    const originalOpacity = mapContainer.current.style.opacity;
    const originalCenter = map.getCenter();
    const originalZoom = map.getZoom();

    // 0. Hide text layers
    const hiddenLayers: string[] = [];
    try {
      const layers = map.getStyle().layers;
      if (layers) {
        layers.forEach(layer => {
          if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
            const visibility = map.getLayoutProperty(layer.id, 'visibility');
            if (visibility !== 'none') {
              map.setLayoutProperty(layer.id, 'visibility', 'none');
              hiddenLayers.push(layer.id);
            }
          }
        });
      }
    } catch (e) {
      console.warn('Failed to hide text layers', e);
    }

    try {
      // 1. Isolate the map container so it doesn't break layout while resizing
      mapContainer.current.style.position = 'fixed';
      mapContainer.current.style.top = '0';
      mapContainer.current.style.left = '0';
      mapContainer.current.style.zIndex = '1';
      mapContainer.current.style.opacity = '1';
      
      // Set to high resolution size for export (2400x3324 retina render)
      mapContainer.current.style.width = '2400px';
      mapContainer.current.style.height = '3324px';
      
      // Allow browser to apply DOM styles
      await new Promise(r => requestAnimationFrame(r));
      map.resize();
      
      // Wait for MapLibre to process resize
      await new Promise(r => requestAnimationFrame(r));
      
      map.fitBounds([
        [schematicData.bounds[0], schematicData.bounds[1]],
        [schematicData.bounds[2], schematicData.bounds[3]]
      ], { padding: 40, duration: 0, maxZoom: 19 });

      // 2. Wait for map to be fully loaded/idle
      await new Promise<void>((resolve) => {
        let timeoutId: any;
        const checkIdle = () => {
          if (map.isStyleLoaded() && map.areTilesLoaded()) {
            clearTimeout(timeoutId);
            map.off('idle', checkIdle);
            resolve();
          }
        };
        
        map.on('idle', checkIdle);
        
        // Timeout after 8 seconds if it never idles perfectly (e.g. missing tile)
        timeoutId = setTimeout(() => {
          map.off('idle', checkIdle);
          console.warn("Export idle timeout reached, proceeding with capture.");
          resolve();
        }, 8000);
        
        // Initial check in case it's already idle
        setTimeout(checkIdle, 100);
      });
      
      // 3. Extra wait + repaint to ensure map tiles and WebGL layers render completely
      map.triggerRepaint();
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 2000));
      map.triggerRepaint();
      await new Promise(r => requestAnimationFrame(r));

      const mapCanvas = map.getCanvas();
      if (!mapCanvas || mapCanvas.width === 0 || mapCanvas.height === 0) {
        throw new Error('地图渲染未准备就绪 (Map canvas not ready)');
      }

      // 4. Generate Poster
      // Full 2x High-definition poster canvas (4200 x 6300 pixels)
      const exportCanvas = document.createElement('canvas');
      const width = 4200;
      const height = 6300;
      exportCanvas.width = width;   // Actual canvas width = 4200
      exportCanvas.height = height; // Actual canvas height = 6300

      const ctx = exportCanvas.getContext('2d')!;

      // 1. Vintage Paper Background
      ctx.fillStyle = '#f5ebd6';
      ctx.fillRect(0, 0, width, height);

      // 2. Double Line Outer Frame (scaled 3x)
      ctx.strokeStyle = '#4a0e0e';
      ctx.lineWidth = 18;
      ctx.strokeRect(90, 90, width - 180, height - 180);

      ctx.lineWidth = 6;
      ctx.strokeRect(120, 120, width - 240, height - 240);

      // 3. Map Frame
      const mapX = 150;
      const mapY = 450;
      const mapW = width - 300;
      const mapH = height - 900;

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(mapX, mapY, mapW, mapH);

      // Draw the map canvas onto our poster canvas
      ctx.drawImage(mapCanvas, mapX, mapY, mapW, mapH);

      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 9;
      ctx.strokeRect(mapX, mapY, mapW, mapH);

      // 4. Top Classical Red Title Banner (scaled 3x)
      const titleText = `${red.countryName || '红方'} 与 ${blue.countryName || '蓝方'} 战役要图`;
      const subTitleText = `(${startDateStr} — ${endDateStr})`;

      const titleBoxW = 2160;
      const titleBoxH = 240;
      const titleBoxX = (width - titleBoxW) / 2;
      const titleBoxY = 150;

      ctx.fillStyle = '#fffdf7';
      ctx.fillRect(titleBoxX, titleBoxY, titleBoxW, titleBoxH);

      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 10;
      ctx.strokeRect(titleBoxX, titleBoxY, titleBoxW, titleBoxH);
      ctx.lineWidth = 3;
      ctx.strokeRect(titleBoxX + 12, titleBoxY + 12, titleBoxW - 24, titleBoxH - 24);

      ctx.fillStyle = '#7f1d1d';
      ctx.font = 'bold 90px "SimSun", "STSong", "Songti SC", serif';
      ctx.textAlign = 'center';
      ctx.fillText(titleText, width / 2, titleBoxY + 115);

      ctx.fillStyle = '#450a0a';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText(subTitleText, width / 2, titleBoxY + 195);

      // 5. Bottom Right Legend Box (Simplified to only show phase numbers)
      const legW = 950;
      const legH = schematicData.numPhases * 90 + 160;
      const legX = mapX + mapW - legW - 60;
      const legY = mapY + mapH - legH - 60;

      ctx.fillStyle = 'rgba(255, 253, 245, 0.96)';
      ctx.fillRect(legX, legY, legW, legH);
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 9;
      ctx.strokeRect(legX, legY, legW, legH);
      ctx.lineWidth = 3;
      ctx.strokeRect(legX + 9, legY + 9, legW - 18, legH - 18);

      // Legend Title
      ctx.fillStyle = '#7f1d1d';
      ctx.font = 'bold 66px "SimSun", "STSong", serif';
      ctx.textAlign = 'center';
      ctx.fillText('图   例', legX + legW / 2, legY + 80);

      ctx.beginPath();
      ctx.moveTo(legX + 60, legY + 110);
      ctx.lineTo(legX + legW - 60, legY + 110);
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Legend Items (Only Phase numbers)
      ctx.textAlign = 'left';
      ctx.font = 'bold 45px sans-serif';
      let itemY = legY + 180;

      const phaseNames = ['第一阶段', '第二阶段', '第三阶段', '第四阶段', '第五阶段'];
      const phaseColors = ['#dc2626', '#ea580c', '#a855f7', '#10b981', '#3b82f6'];

      for (let i = 0; i < schematicData.numPhases; i++) {
        const col = phaseColors[i % phaseColors.length];
        ctx.fillStyle = `${col}33`;
        ctx.fillRect(legX + 60, itemY - 28, 90, 42);
        ctx.strokeStyle = col;
        ctx.lineWidth = 4;
        ctx.strokeRect(legX + 60, itemY - 28, 90, 42);

        ctx.fillStyle = '#1e293b';
        ctx.fillText(phaseNames[i], legX + 180, itemY);
        itemY += 90;
      }

      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(legX + 25, itemY - 5); ctx.lineTo(legX + 60, itemY - 5); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#1e293b'; ctx.fillText('阶段控制界线 / 防御阵地', legX + 75, itemY);
      itemY += 28;

      ctx.fillStyle = 'rgba(220, 38, 38, 0.2)'; ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(legX + 42, itemY - 5, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dc2626'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('✕', legX + 37, itemY + 1);
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('敌军被包围歼灭地域', legX + 75, itemY);
      itemY += 28;

      ctx.font = '18px sans-serif'; ctx.fillText('⚔️', legX + 32, itemY + 2);
      ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#1e293b'; ctx.fillText('重点决战战场', legX + 75, itemY);

      ctx.fillStyle = '#450a0a';
      ctx.font = 'bold 15px "SimSun", "STSong", serif';
      ctx.textAlign = 'left';
      ctx.fillText('审图号: GS(2026)0825号', mapX + 10, height - 55);

      ctx.textAlign = 'right';
      ctx.fillText('中国地图出版集团 / 沙盘推演引擎', mapX + mapW - 10, height - 55);

      const dataUrl = exportCanvas.toDataURL('image/png');
      setPosterDataUrl(dataUrl);

    } catch (err: any) {
      console.error('Export PNG failed:', err);
      setExportError(err?.message || String(err));
    } finally {
      setIsExporting(false);
      
      // Restore text layers
      try {
        hiddenLayers.forEach(id => map.setLayoutProperty(id, 'visibility', 'visible'));
      } catch (e) {
        console.warn('Failed to restore text layers', e);
      }

      // Restore state
      if (mapContainer.current) {
        mapContainer.current.style.position = originalPosition;
        mapContainer.current.style.zIndex = originalZIndex;
        mapContainer.current.style.opacity = originalOpacity;
        mapContainer.current.style.width = originalWidth;
        mapContainer.current.style.height = originalHeight;
        
        // Wait a frame for browser to process DOM
        requestAnimationFrame(() => {
          map.resize();
          map.jumpTo({ center: originalCenter, zoom: originalZoom });
        });
      }
    }
  };


  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (wrapperRef.current.requestFullscreen) {
          await wrapperRef.current.requestFullscreen();
        } else if ((wrapperRef.current as any).webkitRequestFullscreen) {
          await (wrapperRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
      setIsMapFullscreen(!isMapFullscreen);
    }
  };

  const handleSharePoster = async () => {
    if (!posterDataUrl) return;
    try {
      const fileName = `${red.countryName || '红方'}_对_${blue.countryName || '蓝方'}_战役要图.png`;
      const link = document.createElement('a');
      link.href = posterDataUrl;
      link.download = fileName;
      link.click();
      setShareSuccessMsg('已成功下载战役要图！');
    } catch (e: any) {
      setShareSuccessMsg('下载战役要图失败，请稍后重试。');
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full rounded-xl overflow-hidden border border-gray-700 bg-slate-900 shadow-2xl flex flex-col transition-all duration-300 ${
        isMapFullscreen
          ? 'fixed inset-0 z-[1000] h-screen w-screen rounded-none border-0'
          : 'h-full min-h-[580px] flex-1'
      }`}
    >
      {/* Top Title Banner */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-50/95 border-2 border-red-900/80 px-6 py-2 rounded-lg shadow-xl text-center backdrop-blur-md max-w-[90%] pointer-events-auto">
        <h3 className="text-red-900 font-extrabold text-lg sm:text-xl tracking-wider font-serif">
          {red.countryName || '红方'} 与 {blue.countryName || '蓝方'} 战役要图
        </h3>
        <p className="text-red-950/80 text-xs font-semibold tracking-wide">
          ({startDateStr} — {endDateStr})
        </p>
      </div>

      {/* AI Generating Status Overlay */}
      {isAiLoading && (
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-red-500/40 px-4 py-1.5 rounded-full shadow-2xl text-xs font-medium text-red-400 flex items-center gap-2 animate-pulse backdrop-blur-md pointer-events-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="font-serif tracking-wider">战史总参谋部正在精细推演核心战役与战术攻势图...</span>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-gray-900/90 border border-gray-700 backdrop-blur-md p-1.5 rounded-lg shadow-lg">
        <div className="flex bg-gray-800 rounded-md p-0.5 text-xs font-medium text-gray-300">
          <button
            onClick={() => setActivePhase('all')}
            className={`px-2.5 py-1 rounded-md transition-all ${activePhase === 'all' ? 'bg-red-600 text-white font-bold shadow' : 'hover:bg-gray-700'}`}
          >
            全阶段
          </button>
          {Array.from({ length: schematicData.numPhases }, (_, i) => i + 1).map((pNum) => {
            const colors = ['bg-red-500', 'bg-orange-500', 'bg-purple-500', 'bg-emerald-500', 'bg-blue-500'];
            const names = ['一阶段', '二阶段', '三阶段', '四阶段', '五阶段'];
            return (
              <button
                key={pNum}
                onClick={() => setActivePhase(pNum as any)}
                className={`px-2.5 py-1 rounded-md transition-all ${activePhase === pNum ? `${colors[pNum - 1]} text-white font-bold shadow` : 'hover:bg-gray-700'}`}
              >
                {names[pNum - 1]}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            if (mapRef.current && schematicData.bounds) {
              mapRef.current.fitBounds(
                [[schematicData.bounds[0], schematicData.bounds[1]], [schematicData.bounds[2], schematicData.bounds[3]]],
                { padding: 35, duration: 800, maxZoom: 19 }
              );
            }
          }}
          title="重置视角聚焦至核心交战区"
          className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-amber-300 font-bold px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
        >
          <Target className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">聚焦交战区</span>
        </button>

        <button
          onClick={() => setShowEncirclement(!showEncirclement)}
          title="切换包围圈显示"
          className={`p-1.5 rounded-md text-xs flex items-center gap-1 border transition-all ${showEncirclement ? 'bg-red-900/60 border-red-500 text-red-200' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
        >
          {showEncirclement ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">包围圈</span>
        </button>

        <button
          onClick={toggleFullscreen}
          title={isMapFullscreen ? '退出全屏' : '全屏放大示意图'}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 font-bold px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
        >
          {isMapFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isMapFullscreen ? '还原' : '全屏'}</span>
        </button>

        <button
          onClick={handleExportPNG}
          disabled={isExporting}
          title="下载战役示意图"
          className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1 rounded-md text-xs flex items-center gap-1.5 shadow transition-all active:scale-95 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? '生成中...' : '下载战役图'}</span>
        </button>
      </div>

      {exportError && (
        <div className="mx-4 my-2 px-3 py-2 bg-red-900/80 border border-red-500 rounded text-red-200 text-xs flex items-center justify-between gap-2 z-10 shadow-lg animate-fade-in">
          <span>⚠️ 导出失败: {exportError}</span>
          <button onClick={() => setExportError(null)} className="text-red-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full z-0 flex-1 min-h-[500px]" />

      {/* Bottom Right Legend Box (图例) */}
      <div className="absolute bottom-3 right-3 z-20 bg-amber-50/95 border-2 border-red-950/80 p-3 rounded-lg shadow-2xl text-slate-900 font-sans text-xs max-w-[200px] backdrop-blur-sm pointer-events-auto">
        <div className="font-bold text-center border-b border-red-900/40 pb-1 mb-2 text-red-950 font-serif text-sm tracking-wider">
          图 例
        </div>
        <div className="flex flex-col gap-1.5 text-[11px] leading-tight font-medium text-slate-800">
          {Array.from({ length: schematicData.numPhases }, (_, i) => i + 1).map((pNum) => {
            const phaseColors = ['bg-red-500', 'bg-orange-500', 'bg-purple-500', 'bg-emerald-500', 'bg-blue-500'];
            const phaseNames = ['第一阶段', '第二阶段', '第三阶段', '第四阶段', '第五阶段'];
            return (
              <div key={pNum} className="flex items-center gap-2">
                <span className={`w-5 h-2.5 ${phaseColors[pNum - 1]} border border-gray-700 rounded-xs inline-block shadow-xs`} />
                <span>{phaseNames[pNum - 1]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Left Approval Stamp */}
      <div className="absolute bottom-3 left-3 z-20 bg-gray-900/85 border border-gray-700 text-[10px] text-gray-400 px-2.5 py-1 rounded shadow backdrop-blur-sm pointer-events-auto">
        审图号: GS(2026)0825号 | 中国地图出版/沙盘推演引擎
      </div>

      {/* Exporting Loading Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-[180] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in fade-in">
          <div className="bg-slate-900/90 border-2 border-amber-500/50 rounded-2xl p-8 flex flex-col items-center gap-4 text-center max-w-md shadow-2xl">
            <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <h4 className="text-xl font-bold font-serif text-amber-200">正在生成高精度战役要图...</h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              正在精准渲染地图瓦片、重装矢量箭头与地缘控制界线，请稍候...
            </p>
          </div>
        </div>
      )}

      {/* Key Battlefield Modal (点击两把交叉刀 ⚔️ 查看战役详情) */}
      {selectedBattlefield && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-red-700/80 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setSelectedBattlefield(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-gray-800 pb-3">
              <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-600 flex items-center justify-center text-red-400 text-2xl shadow-lg">
                ⚔️
              </div>
              <div>
                <h3 className="text-xl font-black text-amber-300 font-serif tracking-wide">
                  {selectedBattlefield.name}
                </h3>
                <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>发生时间: {selectedBattlefield.date}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-red-950/40 border border-red-800/60 p-3 rounded-xl">
                <div className="text-xs text-red-300 font-bold mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{red.countryName || '红方'} 参战军队</span>
                </div>
                <div className="text-lg font-black text-red-200">
                  {Number(selectedBattlefield.redForces || 0).toLocaleString()} 人
                </div>
                <div className="text-xs text-red-400/80 mt-1">
                  伤亡: {Number(selectedBattlefield.redLosses || 0).toLocaleString()} 人
                </div>
              </div>

              <div className="bg-blue-950/40 border border-blue-800/60 p-3 rounded-xl">
                <div className="text-xs text-blue-300 font-bold mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{blue.countryName || '蓝方'} 参战军队</span>
                </div>
                <div className="text-lg font-black text-blue-200">
                  {Number(selectedBattlefield.blueForces || 0).toLocaleString()} 人
                </div>
                <div className="text-xs text-blue-400/80 mt-1">
                  伤亡: {Number(selectedBattlefield.blueLosses || 0).toLocaleString()} 人
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedBattlefield(null)}
              className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all text-sm"
            >
              关闭战役档案
            </button>
          </div>
        </div>
      )}

      {/* Poster Preview Modal */}
      {posterDataUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 text-white shadow-2xl relative flex flex-col max-h-screen">
            <button
              onClick={() => setPosterDataUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold font-serif text-amber-200">战役要图生成完毕</h3>
                {shareSuccessMsg && (
                  <p className="text-xs text-emerald-400 mt-1 font-medium animate-fade-in">{shareSuccessMsg}</p>
                )}
              </div>
              <button 
                onClick={handleSharePoster}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>下载战役要图</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border-4 border-slate-800 flex items-center justify-center bg-black">
              <img src={posterDataUrl} alt="War Poster" className="max-h-full object-contain shadow-2xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
