import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSimulationStore } from '../store/simulationStore';
import { h3ToMultiPolygonFeature } from '../engine/gridEngine';
import { getCachedLatLng, getCachedNeighbors } from '../engine/h3Cache';
import bbox from '@turf/bbox';
import * as turf from '@turf/turf';
import { cellToLatLng, latLngToCell, getResolution } from 'h3-js';
import UnitPopup from './UnitPopup';
import { UnitState } from '../types/simulation';
import countriesData from 'world-atlas/countries-50m.json';
import { feature } from 'topojson-client';

import { registerTileProtocols } from '../utils/tileProtocols';

// Register custom aligned tile protocols (bing, google_road, tencent, baidu)
registerTileProtocols();

const worldGeoJSON = feature(countriesData as any, (countriesData as any).objects.land);

const OFFLINE_STYLE = {
  version: 8 as const,
  sources: {
    'world-land': {
      type: 'geojson' as const,
      data: worldGeoJSON
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: {
        'background-color': '#bae6fd' // Soft sky blue
      }
    },
    {
      id: 'world-land-fill',
      type: 'fill' as const,
      source: 'world-land',
      paint: {
        'fill-color': '#f3f4f6', // Light gray land
        'fill-opacity': 1.0
      }
    },
    {
      id: 'world-land-outline',
      type: 'line' as const,
      source: 'world-land',
      paint: {
        'line-color': '#cbd5e1', // Soft slate coastline
        'line-width': 0.8
      }
    }
  ]
};

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors, &copy; CARTO'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: {
        'background-color': '#0f172a'
      }
    },
    {
      id: 'osm',
      type: 'raster' as const,
      source: 'osm',
      paint: {
        'raster-opacity': 0.85
      }
    }
  ]
};

const GOOGLE_STYLE = {
  version: 8 as const,
  sources: {
    google: {
      type: 'raster' as const,
      tiles: [
        'bing://{z}/{x}/{y}'
      ],
      tileSize: 256,
      attribution: 'Bing High-Resolution Satellite'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: {
        'background-color': '#0a101d'
      }
    },
    {
      id: 'google',
      type: 'raster' as const,
      source: 'google',
      paint: {
        'raster-opacity': 1.0,
        'raster-fade-duration': 0
      }
    }
  ]
};

const GOOGLE_ROAD_STYLE = {
  version: 8 as const,
  sources: {
    google_road: {
      type: 'raster' as const,
      tiles: [
        'https://mt0.google.com/vt/lyrs=m&hl=zh-CN&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=m&hl=zh-CN&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=m&hl=zh-CN&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=m&hl=zh-CN&x={x}&y={y}&z={z}'
      ],
      tileSize: 256,
      attribution: '&copy; Google Maps'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: {
        'background-color': '#f7f7f7'
      }
    },
    {
      id: 'google_road',
      type: 'raster' as const,
      source: 'google_road',
      paint: {
        'raster-opacity': 1.0,
        'raster-fade-duration': 0
      }
    }
  ]
};

const BAIDU_STYLE = {
  version: 8 as const,
  sources: {
    baidu: {
      type: 'raster' as const,
      tiles: [
        'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        'https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        'https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'
      ],
      tileSize: 256,
      attribution: '&copy; 高德地图'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: {
        'background-color': '#f7f7f7'
      }
    },
    {
      id: 'baidu',
      type: 'raster' as const,
      source: 'baidu',
      paint: {
        'raster-opacity': 1.0,
        'raster-fade-duration': 0
      }
    }
  ]
};

const TENCENT_STYLE = {
  version: 8 as const,
  sources: {
    tencent: {
      type: 'raster' as const,
      tiles: [
        'https://rt0.map.gtimg.com/tile?z={z}&x={x}&y={y}&styleid=1000&version=117',
        'https://rt1.map.gtimg.com/tile?z={z}&x={x}&y={y}&styleid=1000&version=117',
        'https://rt2.map.gtimg.com/tile?z={z}&x={x}&y={y}&styleid=1000&version=117',
        'https://rt3.map.gtimg.com/tile?z={z}&x={x}&y={y}&styleid=1000&version=117'
      ],
      tileSize: 256,
      attribution: '&copy; 腾讯地图'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: {
        'background-color': '#f7f7f7'
      }
    },
    {
      id: 'tencent',
      type: 'raster' as const,
      source: 'tencent',
      paint: {
        'raster-opacity': 1.0,
        'raster-fade-duration': 0
      }
    }
  ]
};

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitState | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const hasFittedBounds = useRef(false);
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<number | null>(null);
  
  const status = useSimulationStore(s => s.status);
  const cells = useSimulationStore(s => s.cells);
  const red = useSimulationStore(s => s.red);
  const blue = useSimulationStore(s => s.blue);
  const isRecordingVideo = useSimulationStore(s => s.isRecordingVideo);
  const frontlineEdges = useSimulationStore(s => s.frontlineEdges);
  const tick = useSimulationStore(s => s.tick);
  const lastTickCapturedCells = useSimulationStore(s => s.lastTickCapturedCells);

  const isEditMode = useSimulationStore(s => s.isEditMode || false);
  const lockMap = useSimulationStore(s => s.lockMap || false);
  const brushType = useSimulationStore(s => s.brushType || 'red');
  const brushRadius = useSimulationStore(s => s.brushRadius || 2);
  const evalMode = useSimulationStore(s => s.evalMode || 'ai');
  const setEditMode = useSimulationStore(s => s.setEditMode);
  const setBrushType = useSimulationStore(s => s.setBrushType);
  const setBrushRadius = useSimulationStore(s => s.setBrushRadius);
  const clearAllCells = useSimulationStore(s => s.clearAllCells);
  const showUnits = useSimulationStore(s => s.showUnits);
  const mapStyle = useSimulationStore(s => s.mapStyle || 'osm');

  const setupLayers = useCallback((map: maplibregl.Map) => {
    if (!map) return;
    const isGoogle = (useSimulationStore.getState().mapStyle || 'osm') === 'google';
    const showUnits = useSimulationStore.getState().showUnits;
    const scenario = useSimulationStore.getState().scenario;
    const isHistorical = scenario === 'ww1' || scenario === 'ww2';
    
    // Images
    const createUnitIcon = (color: string) => {
      const size = 10;
      const h = 6;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(0.5, 0.5, size - 1, h - 1, 1);
      } else {
        ctx.rect(0.5, 0.5, size - 1, h - 1);
      }
      ctx.fill();
      ctx.stroke();
      return { width: size, height: h, data: ctx.getImageData(0, 0, size, h).data };
    };

    if (!map.hasImage('red-unit')) map.addImage('red-unit', createUnitIcon('#dc2626'), { pixelRatio: 1 });
    if (!map.hasImage('blue-unit')) map.addImage('blue-unit', createUnitIcon('#2563eb'), { pixelRatio: 1 });

    const createStarPath = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = (Math.PI / 2) * 3;
      let step = Math.PI / spikes;
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerRadius;
        let y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
    };

    const createCapitalStarIcon = (color: string) => {
      const size = 48;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      createStarPath(ctx, size / 2, size / 2, 5, 18, 7.5);
      ctx.fill();
      return { width: size, height: size, data: ctx.getImageData(0, 0, size, size).data };
    };

    const createImportantCityDotIcon = (color: string) => {
      const size = 32;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2);
      ctx.fill();
      return { width: size, height: size, data: ctx.getImageData(0, 0, size, size).data };
    };

    if (!map.hasImage('red-capital-star')) map.addImage('red-capital-star', createCapitalStarIcon('#dc2626'), { pixelRatio: 2 });
    if (!map.hasImage('blue-capital-star')) map.addImage('blue-capital-star', createCapitalStarIcon('#2563eb'), { pixelRatio: 2 });
    if (!map.hasImage('neutral-capital-star')) map.addImage('neutral-capital-star', createCapitalStarIcon('#eab308'), { pixelRatio: 2 });
    if (!map.hasImage('capital-star')) map.addImage('capital-star', createCapitalStarIcon('#dc2626'), { pixelRatio: 2 });

    if (!map.hasImage('red-city-dot')) map.addImage('red-city-dot', createImportantCityDotIcon('#dc2626'), { pixelRatio: 2 });
    if (!map.hasImage('blue-city-dot')) map.addImage('blue-city-dot', createImportantCityDotIcon('#2563eb'), { pixelRatio: 2 });
    if (!map.hasImage('neutral-city-dot')) map.addImage('neutral-city-dot', createImportantCityDotIcon('#eab308'), { pixelRatio: 2 });
    if (!map.hasImage('city-dot')) map.addImage('city-dot', createImportantCityDotIcon('#dc2626'), { pixelRatio: 2 });

    const fillOp = isGoogle ? 0.58 : 0.62;
    const capturedFillOp = isGoogle ? 0.50 : 0.65;

    // Sources
    if (!map.getSource('red-territory')) map.addSource('red-territory', { type: 'geojson', data: turf.featureCollection([]) });
    if (!map.getSource('blue-territory')) map.addSource('blue-territory', { type: 'geojson', data: turf.featureCollection([]) });
    if (!map.getSource('red-captured-territory')) map.addSource('red-captured-territory', { type: 'geojson', data: turf.featureCollection([]) });
    if (!map.getSource('blue-captured-territory')) map.addSource('blue-captured-territory', { type: 'geojson', data: turf.featureCollection([]) });
    if (!map.getSource('newly-captured-territory')) map.addSource('newly-captured-territory', { type: 'geojson', data: turf.featureCollection([]) });
    if (!map.getSource('units')) map.addSource('units', { type: 'geojson', data: turf.featureCollection([]) });
    if (!map.getSource('frontline')) map.addSource('frontline', { type: 'geojson', data: turf.featureCollection([]) });
    if (!map.getSource('cities')) map.addSource('cities', { type: 'geojson', data: turf.featureCollection([]) });

    // Layers
    if (!map.getLayer('frontline-glow')) {
      map.addLayer({
        id: 'frontline-glow', type: 'line', source: 'frontline',
        paint: { 'line-color': '#fffb8f', 'line-width': 3.5, 'line-opacity': 0.3, 'line-blur': 3 }
      });
    }
    if (!map.getLayer('frontline-core')) {
      map.addLayer({
        id: 'frontline-core', type: 'line', source: 'frontline',
        paint: { 'line-color': '#ffffff', 'line-width': 1.2 }
      });
    }
    if (!map.getLayer('red-fill')) {
      map.addLayer({
        id: 'red-fill', type: 'fill', source: 'red-territory',
        paint: { 'fill-color': '#9f1d20', 'fill-opacity': fillOp , 'fill-antialias': false }
      });
    }
    if (!map.getLayer('red-line')) {
      map.addLayer({
        id: 'red-line', type: 'line', source: 'red-territory', minzoom: 4,
        paint: { 'line-color': '#9f1d20', 'line-width': 0 }
      });
    }
    if (!map.getLayer('blue-fill')) {
      map.addLayer({
        id: 'blue-fill', type: 'fill', source: 'blue-territory',
        paint: { 'fill-color': '#12609a', 'fill-opacity': fillOp , 'fill-antialias': false }
      });
    }
    if (!map.getLayer('blue-line')) {
      map.addLayer({
        id: 'blue-line', type: 'line', source: 'blue-territory', minzoom: 4,
        paint: { 'line-color': '#12609a', 'line-width': 0 }
      });
    }
    if (!map.getLayer('red-captured-fill')) {
      map.addLayer({
        id: 'red-captured-fill', type: 'fill', source: 'red-captured-territory',
        paint: { 'fill-color': '#f87171', 'fill-opacity': capturedFillOp , 'fill-antialias': false }
      });
    }
    if (!map.getLayer('red-captured-line')) {
      map.addLayer({
        id: 'red-captured-line', type: 'line', source: 'red-captured-territory', minzoom: 4,
        paint: { 'line-color': '#f87171', 'line-width': 0 }
      });
    }
    if (!map.getLayer('blue-captured-fill')) {
      map.addLayer({
        id: 'blue-captured-fill', type: 'fill', source: 'blue-captured-territory',
        paint: { 'fill-color': '#60a5fa', 'fill-opacity': capturedFillOp , 'fill-antialias': false }
      });
    }
    if (!map.getLayer('blue-captured-line')) {
      map.addLayer({
        id: 'blue-captured-line', type: 'line', source: 'blue-captured-territory', minzoom: 4,
        paint: { 'line-color': '#60a5fa', 'line-width': 0 }
      });
    }
    if (!map.getLayer('newly-captured-fill')) {
      map.addLayer({
        id: 'newly-captured-fill', type: 'fill', source: 'newly-captured-territory',
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': ['coalesce', ['get', 'opacity'], capturedFillOp],
          'fill-antialias': false
        }
      });
    }

    if (!map.getLayer('cities-layer')) {
      map.addLayer({
        id: 'cities-layer',
        type: 'symbol',
        source: 'cities',
        layout: {
          'icon-image': [
            'coalesce',
            ['get', 'icon'],
            ['match', ['get', 'type'], 'capital', 'red-capital-star', 'red-city-dot']
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.7, 9, 1.1]
        }
      });
    }


    if (!map.getLayer('city-labels')) {
      map.addLayer({
        id: 'city-labels', type: 'symbol', source: 'cities',
        layout: {
          'text-field': ['get', 'name'], 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 8, 'text-offset': [0, 1.0], 'text-anchor': 'top',
        },
        paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.2 }
      });
    }

    // Requirement 6: Hide modern labels for historical scenarios
    const hideModernLabels = () => {
      const layers = map.getStyle()?.layers || [];
      const labelLayers = layers.filter(l => 
        l.id.includes('label') || 
        l.id.includes('place') || 
        l.id.includes('poi') ||
        l.id.includes('road') ||
        l.id.includes('boundary')
      );
      
      const scenario = useSimulationStore.getState().scenario;
      const isHistorical = scenario === 'ww1' || scenario === 'ww2';
      
      labelLayers.forEach(l => {
        if (map.getLayer(l.id)) {
          map.setLayoutProperty(l.id, 'visibility', isHistorical ? 'none' : 'visible');
        }
      });
    };
    
    // Note: Since we use raster tiles for OSM/Google, we can't hide labels within the tiles.
    // But we can try to use a more neutral style if we had one.
    // For now, if it's Google Satellite, it's mostly labels on top.
  }, []);

  const redIso = red?.iso2;
  const blueIso = blue?.iso2;
  const replayIndex = useSimulationStore(s => s.replayIndex);

  useEffect(() => {
    hasFittedBounds.current = false;
  }, [redIso, blueIso]);

  // Style switching logic
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      const handleLoad = () => {
        setupLayers(map);
        setStyleLoaded(true);
      };

      setStyleLoaded(false);
      const targetStyle = 
        mapStyle === 'google' ? GOOGLE_STYLE :
        mapStyle === 'google_road' ? GOOGLE_ROAD_STYLE :
        mapStyle === 'baidu' ? BAIDU_STYLE :
        mapStyle === 'tencent' ? TENCENT_STYLE :
        mapStyle === 'offline' ? OFFLINE_STYLE :
        OSM_STYLE;
      map.setStyle(targetStyle as any);
      
      map.once('styledata', () => {
        // Wait for style to be fully loaded
        const check = () => {
          if (map.isStyleLoaded()) {
            setupLayers(map);
            setStyleLoaded(true);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }
  }, [mapStyle, setupLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;
    if (map.getLayer('units-layer')) {
      map.setLayoutProperty('units-layer', 'visibility', showUnits ? 'visible' : 'none');
    }
  }, [showUnits, styleLoaded]);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: OSM_STYLE as any,
      center: [0, 20],
      zoom: 1.5,
      maxPitch: 60,
      antialias: false,
      // @ts-ignore - MapLibre supports this but it might be missing from types
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
      cooperativeGestures: false,
    } as any);
    
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
    
    mapRef.current = map;
    useSimulationStore.getState().setMapInstance(map);

    map.on('load', () => {
      setupLayers(map);
      setStyleLoaded(true);
    });

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lockMap) {
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.doubleClickZoom.disable();
    } else {
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.doubleClickZoom.enable();
    }
  }, [lockMap]);

  // Update territory and frontline when cells change (optimized for fluidity)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;
    if (!map.getSource('red-territory')) return;

    const isRunning = status === 'running';
    const now = performance.now();

    const updateSource = (name: string, data: any) => {
      const source = map.getSource(name) as maplibregl.GeoJSONSource;
      if (source) source.setData(data);
    };

    const performUpdate = () => {
      if (status === 'setup' && Object.keys(cells).length === 0) {
        hasFittedBounds.current = false;
        updateSource('red-territory', turf.featureCollection([]));
        updateSource('blue-territory', turf.featureCollection([]));
        updateSource('red-captured-territory', turf.featureCollection([]));
        updateSource('blue-captured-territory', turf.featureCollection([]));
        updateSource('newly-captured-territory', turf.featureCollection([]));
        updateSource('frontline', turf.featureCollection([]));
        updateSource('cities', turf.featureCollection([]));
        updateSource('units', turf.featureCollection([]));
        return;
      }

      if (status === 'setup') {
        hasFittedBounds.current = false;
      }

      const redCells: string[] = [];
      const blueCells: string[] = [];
      const redCapturedCells: string[] = [];
      const blueCapturedCells: string[] = [];
      
      const newlyCapturedMap = new Map<string, number>();
      if (status !== 'setup' && lastTickCapturedCells) {
        for (let i = 0; i < lastTickCapturedCells.length; i++) {
          const item = lastTickCapturedCells[i];
          if (!item) continue;
          const parts = item.split(':');
          const cid = parts[0];
          const opacity = parts.length === 2 ? parseFloat(parts[1]) : 1.0;
          newlyCapturedMap.set(cid, opacity);
        }
      }

      const newlyCapturedFeatures: any[] = [];
      const cellIds = Object.keys(cells);

      for (let i = 0; i < cellIds.length; i++) {
        const id = cellIds[i];
        const cell = cells[id];
        if (newlyCapturedMap.has(id)) {
          const opacity = newlyCapturedMap.get(id) ?? 1.0;
          try {
            const cellPoly = h3ToMultiPolygonFeature([id]);
            if (cellPoly && cellPoly.geometry) {
              cellPoly.properties = { ...cellPoly.properties, opacity };
              newlyCapturedFeatures.push(cellPoly);
            }
          } catch (e) {}
        } else {
          if (cell.owner === 'red') {
            if (cell.originalOwner === 'red') {
              redCells.push(id);
            } else {
              redCapturedCells.push(id);
            }
          } else if (cell.owner === 'blue') {
            if (cell.originalOwner === 'blue') {
              blueCells.push(id);
            } else {
              blueCapturedCells.push(id);
            }
          }
        }
      }

      let redFeature = turf.featureCollection([]);
      let blueFeature = turf.featureCollection([]);
      let redCapFeature = turf.featureCollection([]);
      let blueCapFeature = turf.featureCollection([]);
      let newCapFeature = newlyCapturedFeatures.length > 0 
        ? turf.featureCollection(newlyCapturedFeatures)
        : turf.featureCollection([]);

      if (redCells.length > 0) redFeature = turf.featureCollection([h3ToMultiPolygonFeature(redCells)]);
      if (blueCells.length > 0) blueFeature = turf.featureCollection([h3ToMultiPolygonFeature(blueCells)]);
      if (redCapturedCells.length > 0) redCapFeature = turf.featureCollection([h3ToMultiPolygonFeature(redCapturedCells)]);
      if (blueCapturedCells.length > 0) blueCapFeature = turf.featureCollection([h3ToMultiPolygonFeature(blueCapturedCells)]);

      updateSource('red-territory', redFeature);
      updateSource('blue-territory', blueFeature);
      updateSource('red-captured-territory', redCapFeature);
      updateSource('blue-captured-territory', blueCapFeature);
      updateSource('newly-captured-territory', newCapFeature);

      const isEditModeCurrent = useSimulationStore.getState().isEditMode;
      if (!hasFittedBounds.current && (redCells.length > 0 || blueCells.length > 0) && !isEditModeCurrent) {
        const conflictPoints: [number, number][] = [];

        // 1. Frontline edges
        if (frontlineEdges && frontlineEdges.length > 0) {
          for (const line of frontlineEdges) {
            for (const pt of line) {
              if (Array.isArray(pt) && pt.length >= 2) {
                conflictPoints.push([pt[0], pt[1]]);
              }
            }
          }
        }

        // 2. Captured/changed cells
        for (const cid of [...redCapturedCells, ...blueCapturedCells]) {
          const [lat, lng] = getCachedLatLng(cid);
          conflictPoints.push([lng, lat]);
        }

        // 3. Border contact cells where red and blue meet
        if (conflictPoints.length < 2) {
          for (const cid in cells) {
            const cell = cells[cid];
            if (!cell.owner) continue;
            const enemy = cell.owner === 'red' ? 'blue' : 'red';
            const neighbors = getCachedNeighbors(cid);
            if (neighbors.some(n => cells[n] && cells[n].owner === enemy)) {
              const [lat, lng] = getCachedLatLng(cid);
              conflictPoints.push([lng, lat]);
            }
          }
        }

        let box: [number, number, number, number] | null = null;
        if (conflictPoints.length >= 2) {
          const fc = turf.featureCollection(conflictPoints.map(p => turf.point(p)));
          box = bbox(fc) as [number, number, number, number];
        } else if (redFeature.features.length > 0 && blueFeature.features.length > 0) {
          const combined = turf.featureCollection([...redFeature.features, ...blueFeature.features]);
          box = bbox(combined) as [number, number, number, number];
        }

        if (box) {
          map.fitBounds([box[0], box[1], box[2], box[3]], {
            padding: 80,
            duration: 1800,
            maxZoom: 9
          });
          hasFittedBounds.current = true;
        }
      }

      const frontlineSource = map.getSource('frontline') as maplibregl.GeoJSONSource;
      if (frontlineSource) {
        if (frontlineEdges && frontlineEdges.length > 0) {
          frontlineSource.setData(turf.multiLineString(frontlineEdges));
        } else {
          frontlineSource.setData(turf.featureCollection([]));
        }
      }

      const cityFeatures: any[] = [];
      for (const id in cells) {
        const cell = cells[id];
        if (cell.isCapital || cell.isImportantCity) {
          const cachedCoord = getCachedLatLng(id);
          const lat = cell.cityLat !== undefined ? cell.cityLat : cachedCoord[0];
          const lng = cell.cityLng !== undefined ? cell.cityLng : cachedCoord[1];
          const owner = cell.owner || 'red';
          const isCapital = !!cell.isCapital;
          const iconName = `${owner}-${isCapital ? 'capital-star' : 'city-dot'}`;

          cityFeatures.push(
            turf.point([lng, lat], {
              name: cell.cityName || (isCapital ? '首都' : '城市'),
              type: isCapital ? 'capital' : 'city',
              owner: cell.owner,
              icon: iconName
            })
          );
        }
      }
      const citiesSource = map.getSource('cities') as maplibregl.GeoJSONSource;
      if (citiesSource) {
        citiesSource.setData(turf.featureCollection(cityFeatures));
      }

      lastUpdateRef.current = performance.now();
      pendingUpdateRef.current = null;
    };

    if (isRunning) {
      // Throttle heavy territory calculations to max 20 FPS during simulation play for absolute buttery smoothness
      const elapsed = now - lastUpdateRef.current;
      if (elapsed >= 50) {
        if (pendingUpdateRef.current !== null) {
          cancelAnimationFrame(pendingUpdateRef.current);
        }
        performUpdate();
      } else {
        if (pendingUpdateRef.current === null) {
          pendingUpdateRef.current = requestAnimationFrame(() => {
            performUpdate();
          });
        }
      }
    } else {
      if (pendingUpdateRef.current !== null) {
        cancelAnimationFrame(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
      performUpdate();
    }

    return () => {
      if (pendingUpdateRef.current !== null) {
        cancelAnimationFrame(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    };
  }, [cells, status, styleLoaded, frontlineEdges, lastTickCapturedCells]);

  // Update units independently on every tick without recalculating territory polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;
    if (!map.getSource('units')) return;

    // Unit rendering
    const unitFeatures: any[] = [];
    const redUnits = Array.isArray(red?.units) ? red.units : [];
    const blueUnits = Array.isArray(blue?.units) ? blue.units : [];
    
    // Frontline: active or isolated, display half density of unit cards evenly placed across frontline
    const activeRedUnits = redUnits.filter(u => u.status === 'active' || u.status === 'isolated');
    const activeBlueUnits = blueUnits.filter(u => u.status === 'active' || u.status === 'isolated');

    const getUnitNum = (u: any) => {
      if (!u || !u.id) return 0;
      const parts = String(u.id).split('-');
      const val = parseInt(parts[parts.length - 1], 10);
      return isNaN(val) ? 0 : val;
    };

    activeRedUnits.sort((a, b) => getUnitNum(a) - getUnitNum(b));
    activeBlueUnits.sort((a, b) => getUnitNum(a) - getUnitNum(b));

    const selectStableEvenly = (units: any[], ratio: number) => {
      if (units.length === 0) return [];
      const stride = Math.max(1, Math.round(1 / ratio));
      if (units.length <= stride) return units;
      return units.filter((_, idx) => idx % stride === 0);
    };

    const redUnitsToDraw = selectStableEvenly(activeRedUnits, 1 / 3);
    const blueUnitsToDraw = selectStableEvenly(activeBlueUnits, 1 / 3);

    redUnitsToDraw.forEach(u => {
      unitFeatures.push(turf.point([u.longitude, u.latitude], { side: u.side, id: u.id, strength: u.strength }));
    });

    blueUnitsToDraw.forEach(u => {
      unitFeatures.push(turf.point([u.longitude, u.latitude], { side: u.side, id: u.id, strength: u.strength }));
    });
    const unitsSource = map.getSource('units') as maplibregl.GeoJSONSource;
    if (unitsSource) unitsSource.setData(turf.featureCollection(unitFeatures));

  }, [red.units, blue.units, status, styleLoaded, tick]);

  // Resize handler to ensure container dimensions are matched

  // Resize handler to ensure container dimensions are matched
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, [styleLoaded]);

  return (
    <>
      <div 
        ref={mapContainer} 
        className="absolute inset-0 z-0 w-full h-full touch-none transform-gpu will-change-transform" 
        style={{ width: '100%', height: '100%', touchAction: 'none', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }} 
      />
      {selectedUnit && <UnitPopup unit={selectedUnit} onClose={() => setSelectedUnit(null)} />}
    </>
  );
}
