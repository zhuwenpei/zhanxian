import React, { useState, useEffect, useRef } from 'react';
import * as turf from '@turf/turf';
import maplibregl from 'maplibre-gl';
import { useSimulationStore } from '../store/simulationStore';
import { getWorldLandMultiPolygon } from '../utils/landGeoJSON';
import { saveCustomCountry, getSavedCustomCountries, CustomCountry, CustomCity, downloadCustomCountryAsFile, shareOrDownloadCustomCountry, getCustomCountryById } from '../utils/customCountryStore';
import { searchCountries } from '../data/countryNames';
import { getHistoricalFeature } from '../data/historicalBorders';
import { registerTileProtocols } from '../utils/tileProtocols';
import { Check, RotateCcw, Trash2, X, MapPin, Sparkles, AlertCircle, Crown, Building2, Layers, Search, Target, ChevronDown, ChevronUp, Save, Plus, ImageIcon, Move, Maximize, Minimize, Lock, Unlock, Eye, EyeOff, Scissors, Download, Share2 } from 'lucide-react';

registerTileProtocols();

function getFeatureForTarget(iso3: string): any {
  if (!iso3) return null;
  if (iso3.startsWith('CUSTOM_') || iso3.startsWith('custom-')) {
    const custom = getCustomCountryById(iso3);
    return custom?.feature || null;
  }
  return getHistoricalFeature(iso3, 'modern');
}

function ensureFeature(f: any): any {
  if (!f) return null;
  if (f.type === 'Feature') return f;
  if (f.type === 'Polygon' || f.type === 'MultiPolygon') {
    return { type: 'Feature', properties: f.properties || {}, geometry: f };
  }
  if (f.geometry) {
    return { type: 'Feature', properties: f.properties || {}, geometry: f.geometry };
  }
  return null;
}

function combineGeometriesToMultiPolygon(f1: any, f2: any): any {
  if (!f1) return f2;
  if (!f2) return f1;
  
  const feat1 = ensureFeature(f1);
  const feat2 = ensureFeature(f2);

  if (!feat1) return feat2;
  if (!feat2) return feat1;

  try {
    const unioned = turf.union(turf.featureCollection([feat1, feat2]));
    if (unioned && unioned.geometry) return unioned;
  } catch (e) {
    console.warn('turf.union failed, falling back to manual ring combination', e);
  }

  // Fallback to manual ring extraction if union fails
  const rings: any[] = [];
  const extractRings = (feat: any) => {
    if (!feat) return;
    const geom = feat.geometry || feat;
    if (!geom) return;
    if (geom.type === 'Polygon') {
      rings.push(geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      for (let i = 0; i < geom.coordinates.length; i++) {
        rings.push(geom.coordinates[i]);
      }
    }
  };

  extractRings(feat1);
  extractRings(feat2);

  return {
    type: 'Feature',
    properties: feat1.properties || feat2.properties || {},
    geometry: {
      type: 'MultiPolygon',
      coordinates: rings
    }
  };
}

function simplifySinglePolygon(polyFeat: any): any {
  if (!polyFeat) return polyFeat;
  try {
    let processed = turf.cleanCoords(polyFeat);
    const featArea = turf.area(processed);
    
    let precision = 5;
    let tolerance = 0.0015;
    
    if (featArea < 10000) { // Tiny buildings / rooms (under 1 hectare / 10,000 m2)
      precision = 8;
      tolerance = 0.00000005;
    } else if (featArea < 1e6) { // Under 1 km2
      precision = 7;
      tolerance = 0.0000005;
    } else if (featArea < 1e8) { // Under 100 km2
      precision = 6;
      tolerance = 0.00005;
    } else if (featArea < 1e10) { // Under 10,000 km2
      precision = 5;
      tolerance = 0.0005;
    } else {
      precision = 5;
      tolerance = 0.0015;
    }
    
    processed = turf.truncate(processed, { precision, coordinates: 2, mutate: false });
    const simplified = turf.simplify(processed, { tolerance, highQuality: true, mutate: false });
    
    if (!simplified || !simplified.geometry || (simplified.geometry.type === 'Polygon' && (!simplified.geometry.coordinates || simplified.geometry.coordinates.length === 0))) {
      return processed;
    }
    return simplified;
  } catch (e) {
    return polyFeat;
  }
}

function simplifyFeature(feat: any): any {
  if (!feat) return feat;
  const geom = feat.geometry || feat;
  if (!geom || !geom.type) return feat;

  try {
    if (geom.type === 'Polygon') {
      return simplifySinglePolygon(feat.type === 'Feature' ? feat : turf.feature(geom));
    } else if (geom.type === 'MultiPolygon') {
      const newPolyCoords: any[] = [];
      for (const polyCoords of geom.coordinates) {
        const pFeat = turf.polygon(polyCoords);
        const simpP = simplifySinglePolygon(pFeat);
        if (simpP && simpP.geometry && simpP.geometry.coordinates && simpP.geometry.coordinates.length > 0) {
          newPolyCoords.push(simpP.geometry.coordinates);
        } else {
          newPolyCoords.push(polyCoords);
        }
      }
      return {
        type: 'Feature',
        properties: feat.properties || {},
        geometry: {
          type: 'MultiPolygon',
          coordinates: newPolyCoords
        }
      };
    }
    return feat;
  } catch (e) {
    console.warn('Failed to simplify custom country feature:', e);
    return feat;
  }
}

interface DrawCountryOverlayProps {
  map: maplibregl.Map | null;
  initialCountry?: CustomCountry | null;
  onClose: () => void;
  onSaved: (customId: string, customName: string) => void;
  onSavedUpdate?: () => void;
}

const clampLat = (lat: number) => Math.max(-85, Math.min(85, lat));

// Mercator projection helpers for visual alignment
const project = (lng: number, lat: number) => {
  const merc = maplibregl.MercatorCoordinate.fromLngLat([lng, lat]);
  return [merc.x, merc.y] as [number, number];
};
const unproject = (x: number, y: number) => {
  const merc = new maplibregl.MercatorCoordinate(x, y, 0);
  const lnlt = merc.toLngLat();
  return [lnlt.lng, lnlt.lat] as [number, number];
};

const getUVFromLngLat = (pt: [number, number], bounds: [number, number][] | null) => {
  if (!bounds || bounds.length < 4) return [0.5, 0.5] as [number, number];
  const p = project(pt[0], pt[1]);
  const pb = bounds.map(b => project(b[0], b[1]));
  const [tl, tr, br] = pb;
  
  // Vector-based UV calculation in projected space (assuming parallelogram for simplicity)
  const v1 = [tr[0] - tl[0], tr[1] - tl[1]];
  const v2 = [pb[3][0] - tl[0], pb[3][1] - tl[1]];
  const vp = [p[0] - tl[0], p[1] - tl[1]];
  
  const det = v1[0] * v2[1] - v1[1] * v2[0];
  if (Math.abs(det) < 1e-15) return [0.5, 0.5] as [number, number];
  
  const u = (vp[0] * v2[1] - vp[1] * v2[0]) / det;
  const v = (v1[0] * vp[1] - v1[1] * vp[0]) / det;
  return [u, v] as [number, number];
};

const getLngLatFromUV = (uv: [number, number], bounds: [number, number][] | null) => {
  if (!bounds || bounds.length < 4) return [0, 0] as [number, number];
  const pb = bounds.map(b => project(b[0], b[1]));
  const [tl, tr, br, bl] = pb;
  
  const u = uv[0];
  const v = uv[1];
  
  // Interpolation in projected space
  const px = (1 - u) * (1 - v) * tl[0] + u * (1 - v) * tr[0] + u * v * br[0] + (1 - u) * v * bl[0];
  const py = (1 - u) * (1 - v) * tl[1] + u * (1 - v) * tr[1] + u * v * br[1] + (1 - u) * v * bl[1];
  
  return unproject(px, py);
};

export default function DrawCountryOverlay({ map, initialCountry, onClose, onSaved, onSavedUpdate }: DrawCountryOverlayProps) {
  const mapStyle = useSimulationStore(s => s.mapStyle || 'osm');
  const setMapStyle = useSimulationStore(s => s.setMapStyle);
  const [drawMode, setDrawMode] = useState<'nodes' | 'capital' | 'city' | 'trace' | 'hole'>('nodes');
  const [clipMode, setClipMode] = useState<'inside' | 'outside'>('inside');
  const [nodes, setNodes] = useState<[number, number][]>(initialCountry?.feature ? [] : (initialCountry?.nodes || []));
  const [holes, setHoles] = useState<[number, number][][]>(initialCountry?.holes || []);
  const [capital, setCapital] = useState<CustomCity | undefined>(initialCountry?.capital);
  const [cities, setCities] = useState<CustomCity[]>(initialCountry?.cities || []);
  const [filledFeature, setFilledFeature] = useState<any | null>(initialCountry?.feature || null);
  
  // Down point ref to distinguish dragging map vs clicking to place nodes
  const downPointRef = useRef<{ x: number; y: number } | null>(null);
  
  // Reference image tracing state
  const [traceImage, setTraceImage] = useState<string | null>(null);
  const [imageBounds, setImageBounds] = useState<[number, number][] | null>(null);
  const [isImageFixed, setIsImageFixed] = useState(false);
  const [imageOpacity, setImageOpacity] = useState(0.7);
  const [useBlankMap, setUseBlankMap] = useState(false);
  const traceImageAspectRatioRef = useRef<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Alignment tool state
  const [isAligning, setIsAligning] = useState(false);
  const [alignPairs, setAlignPairs] = useState<{ map: [number, number] | null; imgUV: [number, number] | null }[]>([]);
  const [alignTarget, setAlignTarget] = useState<'map' | 'img'>('map');
  const alignMarkersRef = useRef<maplibregl.Marker[]>([]);
  
  // Specific country restriction feature (supports multi-country selection)
  const [selectedRestrictCountries, setSelectedRestrictCountries] = useState<Array<{ iso3: string; name: string }>>([]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [countryName, setCountryName] = useState(initialCountry?.name || '');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAlignPanelCollapsed, setIsAlignPanelCollapsed] = useState(false);
  const [savedCountryObj, setSavedCountryObj] = useState<CustomCountry | null>(null);
  
  const [cityInputModal, setCityInputModal] = useState<{
    isOpen: boolean;
    type: 'capital' | 'city';
    lngLat: [number, number];
    name: string;
  }>({ isOpen: false, type: 'capital', lngLat: [0, 0], name: '' });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const partCount = (() => {
    if (!filledFeature) return 0;
    const geom = filledFeature.geometry || filledFeature;
    if (!geom) return 0;
    if (geom.type === 'Polygon') return 1;
    if (geom.type === 'MultiPolygon') return geom.coordinates.length;
    return 0;
  })();

  // Reset map style to osm on unmount
  useEffect(() => {
    return () => {
      setMapStyle('osm');
    };
  }, [setMapStyle]);

  // Add map click handler and disable double click zoom
  useEffect(() => {
    if (!map) return;

    // Requirement 1: Ensure pan/zoom gestures are active
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.touchZoomRotate.enable();
    map.boxZoom.enable();
    map.dragRotate.enable();
    
    map.doubleClickZoom.disable();
    map.getCanvas().style.cursor = (drawMode === 'nodes' || drawMode === 'trace' || isAligning) ? 'crosshair' : 'pointer';

    const handleMouseDown = (e: maplibregl.MapMouseEvent) => {
      downPointRef.current = { x: e.point.x, y: e.point.y };
    };

    const handleClick = (e: maplibregl.MapMouseEvent) => {

      // Check if user was dragging/panning the map instead of a clean click
      if (downPointRef.current) {
        const dx = Math.abs(e.point.x - downPointRef.current.x);
        const dy = Math.abs(e.point.y - downPointRef.current.y);
        if (dx > 4 || dy > 4) {
          return; // Ignore click because map was dragged/panned
        }
      }

      const lng = e.lngLat.lng;
      const lat = clampLat(e.lngLat.lat);

      // 1. HIGHEST PRIORITY: Alignment Tool
      if (isAligning) {
        setAlignPairs(prev => {
          const next = [...prev];
          // Find first pair that has the current target empty, or create new pair if all are full
          let targetIdx = next.findIndex(p => alignTarget === 'map' ? !p.map : !p.imgUV);
          
          if (targetIdx === -1) {
            // No empty slot for this target type, create/append a new pair
            if (alignTarget === 'map') {
              next.push({ map: [lng, lat], imgUV: null });
              setAlignTarget('img'); // Auto-toggle to image for the next click
            } else {
              const uv = getUVFromLngLat([lng, lat], imageBounds);
              next.push({ map: null, imgUV: uv });
              setAlignTarget('map'); // Auto-toggle to map for the next click
            }
          } else {
            // Fill the empty slot
            if (alignTarget === 'map') {
              next[targetIdx].map = [lng, lat];
              setAlignTarget('img');
            } else {
              const uv = getUVFromLngLat([lng, lat], imageBounds);
              next[targetIdx].imgUV = uv;
              setAlignTarget('map');
            }
          }
          return next;
        });

        const targetName = alignTarget === 'map' ? '地图' : '底图';
        setSuccessMsg(`📍 已记录${targetName}参考点。已自动切换至下个目标。`);
        return;
      }

      // 2. CHECK: If using reference image, it MUST be fixed before tracing nodes/cities
      if (traceImage && !isImageFixed && (drawMode === 'nodes' || drawMode === 'trace' || drawMode === 'capital' || drawMode === 'city')) {
        setErrorMsg('请先“固定底图”（点击锁图标）以确保绘图参考位置准确！');
        return;
      }

      // 3. Normal Drawing Logic
      if (drawMode === 'nodes' || drawMode === 'trace') {
        // Requirement 1: Allow placing nodes anywhere (sea included)
        setErrorMsg(null);
        setNodes(prev => [...prev, [lng, lat]]);
      } else if (drawMode === 'hole') {
        setErrorMsg(null);
        setHoles(prev => {
          if (prev.length === 0) return [[[lng, lat]]];
          const last = [...prev[prev.length - 1], [lng, lat]];
          return [...prev.slice(0, -1), last];
        });
      } else if (drawMode === 'capital') {
        setCityInputModal({
          isOpen: true,
          type: 'capital',
          lngLat: [lng, lat],
          name: capital?.name || '都城'
        });
      } else if (drawMode === 'city') {
        setCityInputModal({
          isOpen: true,
          type: 'city',
          lngLat: [lng, lat],
          name: `城市${cities.length + 1}`
        });
      }
    };

    const handleDblClick = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
    };

    map.on('mousedown', handleMouseDown);
    map.on('touchstart', handleMouseDown);
    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('touchstart', handleMouseDown);
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
      map.getCanvas().style.cursor = '';
      map.doubleClickZoom.enable();
    };
  }, [map, drawMode, capital, cities, isAligning, alignTarget, isImageFixed, traceImage, imageBounds]);

  // Render map layers for polygon, nodes, capital, and cities
  useEffect(() => {
    if (!map) return;

    // Toggle map layers visibility based on blank map or alignment mode
    const layers = map.getStyle()?.layers;
    if (layers) {
      layers.forEach(l => {
        if (l.id.startsWith('draw-') || l.id.startsWith('trace-')) return;
        try {
          map.setLayoutProperty(l.id, 'visibility', useBlankMap ? 'none' : 'visible');
        } catch (e) {}
      });
    }

    const setupLayers = () => {
      if (!map.getStyle()) return;

      if (!map.getSource('draw-target-country-source')) {
        map.addSource('draw-target-country-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        map.addLayer({
          id: 'draw-target-country-fill',
          type: 'fill',
          source: 'draw-target-country-source',
          paint: {
            'fill-color': '#06b6d4',
            'fill-opacity': 0.22
          }
        });
        map.addLayer({
          id: 'draw-target-country-line',
          type: 'line',
          source: 'draw-target-country-source',
          paint: {
            'line-color': '#06b6d4',
            'line-width': 2.5,
            'line-dasharray': [3, 2]
          }
        });
      }

      if (!map.getSource('draw-country-source')) {
        map.addSource('draw-country-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        // Filled land territory
        map.addLayer({
          id: 'draw-country-fill',
          type: 'fill',
          source: 'draw-country-source',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': '#eab308',
            'fill-opacity': 0.45
          }
        });

        // Boundary lines
        map.addLayer({
          id: 'draw-country-line',
          type: 'line',
          source: 'draw-country-source',
          filter: ['in', '$type', 'LineString', 'Polygon'],
          paint: {
            'line-color': '#f59e0b',
            'line-width': 0,
            'line-dasharray': [2, 1]
          }
        });

        // Boundary nodes
        map.addLayer({
          id: 'draw-country-points',
          type: 'circle',
          source: 'draw-country-source',
          filter: ['==', 'kind', 'boundaryNode'],
          paint: {
            'circle-radius': 6,
            'circle-color': '#ef4444',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });

        // Hole nodes
        map.addLayer({
          id: 'draw-country-hole-points',
          type: 'circle',
          source: 'draw-country-source',
          filter: ['==', 'kind', 'holeNode'],
          paint: {
            'circle-radius': 5,
            'circle-color': '#dc2626',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.8
          }
        });

        // Capital marker point
        map.addLayer({
          id: 'draw-country-capital',
          type: 'circle',
          source: 'draw-country-source',
          filter: ['==', 'kind', 'capital'],
          paint: {
            'circle-radius': 8,
            'circle-color': '#f59e0b',
            'circle-stroke-width': 0
          }
        });

        // Capital label
        map.addLayer({
          id: 'draw-country-capital-label',
          type: 'symbol',
          source: 'draw-country-source',
          filter: ['==', 'kind', 'capital'],
          layout: {
            'text-field': ['concat', '⭐ ', ['get', 'name']],
            'text-size': 13,
            'text-offset': [0, 1.4],
            'text-anchor': 'top'
          },
          paint: {
            'text-color': '#fef08a',
            'text-halo-color': '#000000',
            'text-halo-width': 2
          }
        });

        // Cities points
        map.addLayer({
          id: 'draw-country-cities',
          type: 'circle',
          source: 'draw-country-source',
          filter: ['==', 'kind', 'city'],
          paint: {
            'circle-radius': 6,
            'circle-color': '#38bdf8',
            'circle-stroke-width': 0
          }
        });

        // Cities labels
        map.addLayer({
          id: 'draw-country-cities-label',
          type: 'symbol',
          source: 'draw-country-source',
          filter: ['==', 'kind', 'city'],
          layout: {
            'text-field': ['concat', '🏙️ ', ['get', 'name']],
            'text-size': 11,
            'text-offset': [0, 1.3],
            'text-anchor': 'top'
          },
          paint: {
            'text-color': '#e0f2fe',
            'text-halo-color': '#000000',
            'text-halo-width': 2
          }
        });
      }
    };

    const updateSourceData = () => {
      const features: any[] = [];

      // Add boundary node points
      nodes.forEach((pt, idx) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: pt },
          properties: { kind: 'boundaryNode', index: idx + 1 }
        });
      });

      // Add hole node points (red dots)
      holes.forEach((hole, holeIdx) => {
        hole.forEach((pt, ptIdx) => {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: pt },
            properties: { kind: 'holeNode', holeIndex: holeIdx, index: ptIdx + 1 }
          });
        });
      });

      // Add capital feature
      if (capital) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [capital.lng, capital.lat] },
          properties: { kind: 'capital', name: capital.name }
        });
      }

      // Add city features
      cities.forEach((c) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
          properties: { kind: 'city', name: c.name }
        });
      });

      // Boundary lines connecting nodes (including holes)
      if (nodes.length >= 2) {
        const outerRing = nodes.length >= 3 ? [...nodes, nodes[0]] : nodes;
        
        if (nodes.length >= 3) {
          // Multi-ring polygon for holes
          const innerRings = holes
            .filter(h => h.length >= 3)
            .map(h => [...h, h[0]]);
            
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [outerRing, ...innerRings]
            },
            properties: { kind: 'boundaryLine' }
          });
        } else {
          // Just a line string if not enough nodes
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: outerRing
            },
            properties: { kind: 'boundaryLine' }
          });
        }
      }

      // Add land filled feature
      if (filledFeature) {
        features.push({
          ...filledFeature,
          properties: { kind: 'landPoly' }
        });
      }

      const source = map.getSource('draw-country-source') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features
        });
      }

      const targetSource = map.getSource('draw-target-country-source') as maplibregl.GeoJSONSource;
      if (targetSource) {
        if (selectedRestrictCountries.length > 0) {
          let combined: any = null;
          for (const target of selectedRestrictCountries) {
            const feat = getFeatureForTarget(target.iso3);
            if (feat) {
              combined = combined ? combineGeometriesToMultiPolygon(combined, feat) : feat;
            }
          }
          targetSource.setData({
            type: 'FeatureCollection',
            features: combined ? [combined] : []
          });
        } else {
          targetSource.setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }
    };

    setupLayers();
    updateSourceData();

    const handleStyleData = () => {
      setupLayers();
      updateSourceData();
    };

    map.on('styledata', handleStyleData);
    map.on('load', handleStyleData);

    return () => {
      map.off('styledata', handleStyleData);
      map.off('load', handleStyleData);
    };
  }, [map, nodes, holes, capital, cities, filledFeature, selectedRestrictCountries, mapStyle]);

  // Handle base map visibility (Blank Map mode)
  useEffect(() => {
    if (!map) return;
    const layers = map.getStyle()?.layers;
    if (layers) {
      layers.forEach(l => {
        // Don't hide our own layers
        if (l.id.startsWith('draw-') || l.id.startsWith('trace-')) return;
        
        try {
          map.setLayoutProperty(l.id, 'visibility', useBlankMap ? 'none' : 'visible');
        } catch (e) {
          // Some layers might not have visibility property
        }
      });
    }
  }, [map, useBlankMap]);

  // Handle reference image layer specifically to avoid re-adding it on every node update
  useEffect(() => {
    if (!map) return;

    const setupTraceImage = () => {
      if (traceImage && imageBounds) {
        if (!map.getSource('trace-image-source')) {
          map.addSource('trace-image-source', {
            type: 'image',
            url: traceImage,
            coordinates: imageBounds
          });
          
          // Ensure it's under drawing layers but above map
          // We'll move it to the bottom of the map's layer stack if it exists
          map.addLayer({
            id: 'trace-image-layer',
            type: 'raster',
            source: 'trace-image-source',
            paint: {
              'raster-opacity': imageOpacity,
              'raster-fade-duration': 0
            }
          });
        } else {
          const imgSource = map.getSource('trace-image-source') as any;
          if (imgSource) {
            // Safety: ensure bounds are not corrupt
            const validBounds = imageBounds.every(coord => 
              coord && typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
              !isNaN(coord[0]) && !isNaN(coord[1])
            );
            
            if (validBounds) {
              if (imgSource.setCoordinates) {
                imgSource.setCoordinates(imageBounds);
              } else {
                imgSource.updateImage({
                  url: traceImage,
                  coordinates: imageBounds
                });
              }
            }
          }
          if (map.getLayer('trace-image-layer')) {
            map.setPaintProperty('trace-image-layer', 'raster-opacity', imageOpacity);
            
            // Re-ensure it's below drawing layers
            const beforeId = map.getLayer('draw-country-fill') ? 'draw-country-fill' : 
                             map.getLayer('draw-country-line') ? 'draw-country-line' : 
                             map.getLayer('draw-country-points') ? 'draw-country-points' : undefined;
            if (beforeId) {
              map.moveLayer('trace-image-layer', beforeId);
            }
          }
        }
      } else {
        if (map.getLayer('trace-image-layer')) map.removeLayer('trace-image-layer');
        if (map.getSource('trace-image-source')) map.removeSource('trace-image-source');
      }
    };

    if (map.isStyleLoaded()) {
      setupTraceImage();
    }

    const handleStyleData = () => {
      if (map.isStyleLoaded()) {
        setupTraceImage();
      }
    };

    map.on('styledata', handleStyleData);

    return () => {
      map.off('styledata', handleStyleData);
    };
  }, [map, traceImage, imageBounds, imageOpacity, mapStyle]);

  // Clean up layers when component unmounts
  useEffect(() => {
    return () => {
      if (!map) return;
      try {
        const layersToRemove = [
          'trace-image-layer',
          'draw-target-country-line',
          'draw-country-capital-label',
          'draw-country-capital',
          'draw-country-cities-label',
          'draw-country-cities',
          'draw-country-hole-points',
          'draw-country-points',
          'draw-country-line',
          'draw-country-fill',
          'align-lines-layer'
        ];

        layersToRemove.forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });

        const sourcesToRemove = [
          'draw-country-source',
          'draw-target-country-source',
          'trace-image-source',
          'align-lines-source'
        ];

        sourcesToRemove.forEach(sourceId => {
          if (map.getSource(sourceId)) {
            const style = map.getStyle();
            if (style && style.layers) {
              style.layers.forEach(l => {
                if ((l as any).source === sourceId) {
                  if (map.getLayer(l.id)) map.removeLayer(l.id);
                }
              });
            }
            map.removeSource(sourceId);
          }
        });
        
        // Clean up markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        alignMarkersRef.current.forEach(m => m.remove());
        alignMarkersRef.current = [];
      } catch (e) {
        console.warn('Error cleaning up draw layers', e);
      }
    };
  }, [map]);

  // Handle image markers (Move & Scale)
  useEffect(() => {
    if (!map || !traceImage || !imageBounds || isImageFixed || isAligning) {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      return;
    }

    // Only recreate if needed (optimization)
    if (markersRef.current.length === 0) {
      // 1. Center Marker for Moving
      const centerEl = document.createElement('div');
      centerEl.className = 'w-8 h-8 bg-indigo-600/80 text-white rounded-full cursor-move shadow-2xl flex items-center justify-center border-2 border-white';
      centerEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>';
      
      const tl = imageBounds[0];
      const br = imageBounds[2];
      const center: [number, number] = [(tl[0] + br[0]) / 2, (tl[1] + br[1]) / 2];

      const moveMarker = new maplibregl.Marker({
        element: centerEl,
        draggable: true
      })
        .setLngLat(center)
        .addTo(map);

      moveMarker.on('drag', () => {
        const newCenter = moveMarker.getLngLat();
        setImageBounds(prev => {
          if (!prev) return null;
          const oldTL = prev[0];
          const oldBR = prev[2];
          const oldCenterProj = project((oldTL[0] + oldBR[0]) / 2, (oldTL[1] + oldBR[1]) / 2);
          const newCenterProj = project(newCenter.lng, newCenter.lat);
          
          const dx = newCenterProj[0] - oldCenterProj[0];
          const dy = newCenterProj[1] - oldCenterProj[1];
          
          return prev.map(coord => {
            const proj = project(coord[0], coord[1]);
            return unproject(proj[0] + dx, proj[1] + dy);
          }) as [number, number][];
        });
      });

      // 2. Corner Marker for Scaling (Bottom-Right)
      const scaleEl = document.createElement('div');
      scaleEl.className = 'w-6 h-6 bg-white border-2 border-indigo-600 rounded-lg cursor-nwse-resize shadow-lg flex items-center justify-center';
      scaleEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>';

      const scaleMarker = new maplibregl.Marker({
        element: scaleEl,
        draggable: true
      })
        .setLngLat(br)
        .addTo(map);

      scaleMarker.on('drag', () => {
        const newBR = scaleMarker.getLngLat();
        setImageBounds(prev => {
          if (!prev) return null;
          const oldTL = prev[0];
          const oldBR = prev[2];
          const centerProj = project((oldTL[0] + oldBR[0]) / 2, (oldTL[1] + oldBR[1]) / 2);
          const newBRProj = project(newBR.lng, newBR.lat);
          
          const halfWidth = Math.abs(newBRProj[0] - centerProj[0]);
          const aspect = traceImageAspectRatioRef.current || 1;
          const halfHeight = halfWidth / aspect;
          
          return [
            unproject(centerProj[0] - halfWidth, centerProj[1] - halfHeight), // TL
            unproject(centerProj[0] + halfWidth, centerProj[1] - halfHeight), // TR
            unproject(centerProj[0] + halfWidth, centerProj[1] + halfHeight), // BR
            unproject(centerProj[0] - halfWidth, centerProj[1] + halfHeight)  // BL
          ];
        });
      });

      markersRef.current = [moveMarker, scaleMarker];
    } else {
      // Update existing markers
      const tl = imageBounds[0];
      const br = imageBounds[2];
      const center: [number, number] = [(tl[0] + br[0]) / 2, (tl[1] + br[1]) / 2];
      
      markersRef.current[0].setLngLat([center[0], clampLat(center[1])]);
      markersRef.current[1].setLngLat([br[0], clampLat(br[1])]);
    }
  }, [map, traceImage, imageBounds, isImageFixed]);

  // Handle alignment markers
  useEffect(() => {
    if (!map || !isAligning) {
      alignMarkersRef.current.forEach(m => m.remove());
      alignMarkersRef.current = [];
      return;
    }

    // Refresh markers
    alignMarkersRef.current.forEach(m => m.remove());
    alignMarkersRef.current = [];

    alignPairs.forEach((pair, i) => {
      // Map marker (Blue)
      if (pair.map) {
        const elMap = document.createElement('div');
        elMap.className = 'w-6 h-6 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg cursor-pointer transform hover:scale-110 transition-transform';
        elMap.innerText = `M${i + 1}`;
        elMap.title = `地图参考点 ${i + 1}`;
        const m1 = new maplibregl.Marker({ element: elMap }).setLngLat([pair.map[0], clampLat(pair.map[1])]).addTo(map);
        alignMarkersRef.current.push(m1);
      }

      // Image marker (Orange)
      if (pair.imgUV) {
        const elImg = document.createElement('div');
        elImg.className = 'w-6 h-6 bg-orange-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg cursor-pointer transform hover:scale-110 transition-transform';
        elImg.innerText = `I${i + 1}`;
        elImg.title = `底图对应点 ${i + 1}`;
        const pos = getLngLatFromUV(pair.imgUV, imageBounds);
        const m2 = new maplibregl.Marker({ element: elImg }).setLngLat([pos[0], clampLat(pos[1])]).addTo(map);
        alignMarkersRef.current.push(m2);
      }
    });

    // Drawing dashed lines between paired points
    if (!map.getSource('align-lines-source')) {
      map.addSource('align-lines-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'align-lines-layer',
        type: 'line',
        source: 'align-lines-source',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2,
          'line-dasharray': [4, 2],
          'line-opacity': 0.8
        }
      });
    }

    const lineFeatures = alignPairs
      .filter(p => p.map && p.imgUV)
      .map((p, i) => ({
        type: 'Feature',
        properties: { index: i },
        geometry: {
          type: 'LineString',
          coordinates: [getLngLatFromUV(p.imgUV!, imageBounds), p.map!]
        }
      }));

    (map.getSource('align-lines-source') as any).setData({
      type: 'FeatureCollection',
      features: lineFeatures
    });

    return () => {
      alignMarkersRef.current.forEach(m => m.remove());
      alignMarkersRef.current = [];
      if (map.getLayer('align-lines-layer')) map.removeLayer('align-lines-layer');
      if (map.getSource('align-lines-source')) map.removeSource('align-lines-source');
    };
  }, [map, isAligning, alignPairs, imageBounds]);

  const applyAlignment = () => {
    const validPairs = alignPairs.filter(p => p.map && p.imgUV) as { map: [number, number]; imgUV: [number, number] }[];
    if (validPairs.length < 2) {
      setErrorMsg('对齐工具建议至少设置 2 组参考点以进行比例与旋转对齐（当前: ' + validPairs.length + ' 组）');
      return;
    }

    if (!imageBounds) return;

    try {
      // Similarity Transform that strictly preserves original image aspect ratio
      // Map point (X, Y) = A*u_scaled - B*v + Tx, Y = B*u_scaled + A*v + Ty
      // where u_scaled = u * aspectRatio
      const n = validPairs.length;
      const R = traceImageAspectRatioRef.current || 1;
      let sumU = 0, sumV = 0, sumX = 0, sumY = 0;
      
      const projectedPairs = validPairs.map(p => ({
        u_s: p.imgUV[0] * R, // Scale U by aspect ratio
        v: p.imgUV[1],
        proj: project(p.map[0], p.map[1])
      }));

      projectedPairs.forEach(p => {
        sumU += p.u_s; sumV += p.v;
        sumX += p.proj[0]; sumY += p.proj[1];
      });

      const meanU = sumU / n;
      const meanV = sumV / n;
      const meanX = sumX / n;
      const meanY = sumY / n;

      let numA = 0, numB = 0, den = 0;
      projectedPairs.forEach(p => {
        const du = p.u_s - meanU;
        const dv = p.v - meanV;
        const dx = p.proj[0] - meanX;
        const dy = p.proj[1] - meanY;
        
        numA += (dx * du + dy * dv);
        numB += (dy * du - dx * dv);
        den += (du * du + dv * dv);
      });

      if (Math.abs(den) < 1e-15) {
        setErrorMsg('对齐计算失败：参考点重合或距离太近，请重新选择。');
        return;
      }

      const A = numA / den;
      const B = numB / den;
      const tx = meanX - (A * meanU - B * meanV);
      const ty = meanY - (B * meanU + A * meanV);

      const transform = (u: number, v: number): [number, number] => {
        const us = u * R;
        const px = A * us - B * v + tx;
        const py = B * us + A * v + ty;
        return unproject(px, py);
      };

      const newBounds: [number, number][] = [
        transform(0, 0), // TL
        transform(1, 0), // TR
        transform(1, 1), // BR
        transform(0, 1)  // BL
      ];
      
      setImageBounds(newBounds);
      setAlignPairs([]);
      setAlignTarget('map');
      setIsAligning(false);
      setSuccessMsg('✨ 底图对齐完成（比例已严格锁定）！');
    } catch (e) {
      console.error('Similarity alignment failed', e);
      setErrorMsg('对齐失败，请检查参考点分布。');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      
      // Get image dimensions to maintain aspect ratio
      const img = new Image();
      img.onload = () => {
        setTraceImage(url);
        
        if (map) {
          const center = map.getCenter();
          const zoom = map.getZoom();
          const span = 6 / Math.pow(2, zoom);
          const centerProj = project(center.lng, center.lat);
          const aspectRatio = img.width / img.height;
          traceImageAspectRatioRef.current = aspectRatio;
          
          // span is in Lng degrees, convert to a rough Mercator span
          const edgeProj = project(center.lng + span, center.lat);
          const projSpanX = Math.abs(edgeProj[0] - centerProj[0]);
          
          const halfWidth = projSpanX * aspectRatio;
          const halfHeight = projSpanX;
          
          const newBounds: [number, number][] = [
            unproject(centerProj[0] - halfWidth, centerProj[1] - halfHeight), // TL
            unproject(centerProj[0] + halfWidth, centerProj[1] - halfHeight), // TR
            unproject(centerProj[0] + halfWidth, centerProj[1] + halfHeight), // BR
            unproject(centerProj[0] - halfWidth, centerProj[1] + halfHeight)  // BL
          ];
          setImageBounds(newBounds);
          setIsImageFixed(false);
          setDrawMode('trace');
        }
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleUndoNode = () => {
    if (drawMode === 'hole') {
      setHoles(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.length === 0) return prev.slice(0, -1);
        const updatedLast = last.slice(0, -1);
        return [...prev.slice(0, -1), updatedLast];
      });
    } else {
      setNodes(prev => prev.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    setNodes([]);
    setHoles([]);
    setCapital(undefined);
    setCities([]);
    setFilledFeature(null);
  };

  // Add a new enclave/part
  const handleAddNewPart = () => {
    if (nodes.length < 3) {
      setErrorMsg('请先在地图上标注至少 3 个边界节点，再创建当前部分的领土版图！');
      return;
    }

    try {
      const closedCoords = [...nodes, nodes[0]];
      let userPoly: any = turf.polygon([closedCoords]);
      
      // Cleanly subtract any drawn hole regions
      for (const h of holes.filter(h => h.length >= 3)) {
        try {
          const holePoly = turf.polygon([[...h, h[0]]]);
          const diffHole = turf.difference(turf.featureCollection([userPoly, holePoly]));
          if (diffHole && diffHole.geometry) {
            userPoly = diffHole;
          }
        } catch (e) {
          console.warn('Hole subtraction failed in handleAddNewPart', e);
        }
      }
      
      // FIX: Ensure polygon is valid (no self-intersections) before boolean operations
      try {
        const userArea = turf.area(userPoly);
        const precision = userArea < 10000 ? 8 : (userArea < 1e6 ? 7 : 5);
        userPoly = turf.truncate(userPoly, { precision });
        const buffered = turf.buffer(userPoly, 0);
        if (buffered) userPoly = buffered as any;
      } catch (e) {
        console.warn('Poly fix failed in handleAddNewPart, using raw', e);
      }

      const worldLand = getWorldLandMultiPolygon();

      let targetMask: any = worldLand;
      if (selectedRestrictCountries.length > 0) {
        let combined: any = null;
        for (const target of selectedRestrictCountries) {
          const feat = getFeatureForTarget(target.iso3);
          if (feat) {
            combined = combined ? combineGeometriesToMultiPolygon(combined, feat) : feat;
          }
        }
        if (combined) {
          targetMask = combined;
        }
      }

      let processedArea: any = null;
      if (clipMode === 'inside' || selectedRestrictCountries.length === 0) {
        processedArea = turf.intersect(turf.featureCollection([userPoly as any, targetMask as any]));
      } else {
        // Outside mode: (User Drawing - Selected Countries) then intersected with Land
        // Buffer targetMask slightly (~0.008 deg / ~800m) so coastal alignment differences are completely covered into sea
        let subtractMask = targetMask;
        try {
          const bufferedMask = turf.buffer(targetMask, 0.008, { units: 'degrees' });
          if (bufferedMask && bufferedMask.geometry) subtractMask = bufferedMask;
        } catch (e) {
          console.warn('Buffer subtraction mask failed', e);
        }
        const diff = turf.difference(turf.featureCollection([userPoly as any, subtractMask as any]));
        if (diff && diff.geometry) {
          processedArea = turf.intersect(turf.featureCollection([diff as any, worldLand as any]));
        }
      }

      let intersected = processedArea;
      let usedFallbackMsg: string | null = null;

      // Fallback 1: If restricted country is active but intersection is empty, fall back to global land
      if ((!intersected || !intersected.geometry) && selectedRestrictCountries.length > 0) {
        intersected = turf.intersect(turf.featureCollection([userPoly as any, worldLand as any]));
        if (intersected && intersected.geometry) {
          const countryNames = selectedRestrictCountries.map(c => c.name).join('、');
          usedFallbackMsg = `⚠️ 当前绘制的这部分超出【${countryNames}】范围，已自动为您保留其覆盖的其他陆地区域！`;
        }
      }

      // Fallback 2: If intersection is still empty (pure ocean or error), keep raw user polygon
      if (!intersected || !intersected.geometry) {
        intersected = userPoly;
        usedFallbackMsg = `⚠️ 未能在绘制区域内切分出陆地，已直接为您保留原始绘制版图。`;
      }

      if (intersected && intersected.geometry) {
        let merged = intersected;
        if (filledFeature) {
          merged = combineGeometriesToMultiPolygon(filledFeature, intersected);
        }
        // Simplify merged feature to keep localStorage footprint low!
        merged = simplifyFeature(merged);
        setFilledFeature(merged);
        setNodes([]); // Clear nodes so user can draw the next enclave
        setHoles([]); // Clear holes too
        setErrorMsg(null);
        if (usedFallbackMsg) {
          setSuccessMsg(`🎉 当前部分已生成！${usedFallbackMsg}`);
        } else {
          setSuccessMsg('🎉 成功生成并累积当前部分的领地！您可以在地图其他地方继续点击绘制下一块飞地。');
        }
        setTimeout(() => setSuccessMsg(null), 4500);
      }
    } catch (e) {
      console.warn('Add part intersection calculation error, falling back', e);
      const closedCoords = [...nodes, nodes[0]];
      const holeRings = holes.filter(h => h.length >= 3).map(h => [...h, h[0]]);
      const userPoly = turf.polygon([closedCoords, ...holeRings]);
      let merged = userPoly;
      if (filledFeature) {
        merged = combineGeometriesToMultiPolygon(filledFeature, userPoly);
      }
      setFilledFeature(merged);
      setNodes([]);
      setHoles([]);
      setSuccessMsg('🎉 成功生成当前部分版图（因计算错误直接保留原始绘制版图，请继续绘制下一部分）');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleGenerateTerritory = () => {
    if (nodes.length < 3) {
      setErrorMsg('请标定至少 3 个节点以围成边界区域！');
      return;
    }

    try {
      const closedCoords = [...nodes, nodes[0]];
      let userPoly: any = turf.polygon([closedCoords]);

      // Cleanly subtract any drawn hole regions
      for (const h of holes.filter(h => h.length >= 3)) {
        try {
          const holePoly = turf.polygon([[...h, h[0]]]);
          const diffHole = turf.difference(turf.featureCollection([userPoly, holePoly]));
          if (diffHole && diffHole.geometry) {
            userPoly = diffHole;
          }
        } catch (e) {
          console.warn('Hole subtraction failed in handleGenerateTerritory', e);
        }
      }
      
      // FIX: Ensure polygon is valid
      try {
        const userArea = turf.area(userPoly);
        const precision = userArea < 10000 ? 8 : (userArea < 1e6 ? 7 : 5);
        userPoly = turf.truncate(userPoly, { precision });
        const buffered = turf.buffer(userPoly, 0);
        if (buffered) userPoly = buffered as any;
      } catch (e) {
        console.warn('Poly fix failed, using raw', e);
      }

      const worldLand = getWorldLandMultiPolygon();

      let targetMask: any = worldLand;
      if (selectedRestrictCountries.length > 0) {
        let combined: any = null;
        for (const target of selectedRestrictCountries) {
          const feat = getFeatureForTarget(target.iso3);
          if (feat) {
            combined = combined ? combineGeometriesToMultiPolygon(combined, feat) : feat;
          }
        }
        if (combined) {
          targetMask = combined;
        }
      }

      let processedArea: any = null;
      if (clipMode === 'inside' || selectedRestrictCountries.length === 0) {
        processedArea = turf.intersect(turf.featureCollection([userPoly as any, targetMask as any]));
      } else {
        // Outside mode: buffer targetMask slightly (~0.008 deg / ~800m) to cleanly extend mask past coastlines into ocean
        let subtractMask = targetMask;
        try {
          const bufferedMask = turf.buffer(targetMask, 0.008, { units: 'degrees' });
          if (bufferedMask && bufferedMask.geometry) subtractMask = bufferedMask;
        } catch (e) {
          console.warn('Buffer subtraction mask failed', e);
        }
        const diff = turf.difference(turf.featureCollection([userPoly as any, subtractMask as any]));
        if (diff && diff.geometry) {
          processedArea = turf.intersect(turf.featureCollection([diff as any, worldLand as any]));
        }
      }

      let intersected = processedArea;
      let usedFallbackMsg: string | null = null;

      if ((!intersected || !intersected.geometry) && selectedRestrictCountries.length > 0) {
        intersected = turf.intersect(turf.featureCollection([userPoly as any, worldLand as any]));
        if (intersected && intersected.geometry) {
          const countryNames = selectedRestrictCountries.map(c => c.name).join('、');
          usedFallbackMsg = `⚠️ 当前绘制的部分超出【${countryNames}】范围，已自动为您保留其覆盖的其他陆地区域！`;
        }
      }

      if (!intersected || !intersected.geometry) {
        intersected = userPoly;
        usedFallbackMsg = `⚠️ 未能在绘制区域内切分出陆地，已直接为您保留原始绘制版图。`;
      }

      if (intersected && intersected.geometry) {
        let finalFeat = intersected;
        if (filledFeature) {
          finalFeat = combineGeometriesToMultiPolygon(filledFeature, intersected);
        }
        finalFeat = simplifyFeature(finalFeat);
        setFilledFeature(finalFeat);
        setNodes([]); 
        setHoles([]); 
        setErrorMsg(null);
        if (usedFallbackMsg) {
          setSuccessMsg(`🎉 版图已生成！${usedFallbackMsg}`);
          setTimeout(() => setSuccessMsg(null), 4500);
        } else {
          setSuccessMsg('🎉 版图生成成功！');
          setTimeout(() => setSuccessMsg(null), 2000);
        }
      }
    } catch (e) {
      console.warn('Generation calculation error, falling back', e);
      const closedCoords = [...nodes, nodes[0]];
      const holeRings = holes.filter(h => h.length >= 3).map(h => [...h, h[0]]);
      const userPoly = turf.polygon([closedCoords, ...holeRings]);
      let finalFeat = userPoly;
      if (filledFeature) {
        finalFeat = combineGeometriesToMultiPolygon(filledFeature, userPoly);
      }
      setFilledFeature(finalFeat);
      setNodes([]);
      setHoles([]);
      setSuccessMsg('🎉 已生成原始版图');
      setTimeout(() => setSuccessMsg(null), 2000);
    }
  };

  const handleOpenSaveNamingModal = () => {
    setSavedCountryObj(null);
    setSuccessMsg(null);
    setErrorMsg(null);

    // If there are unsaved nodes, try to generate them first
    if (nodes.length >= 3) {
      handleGenerateTerritory();
      setTimeout(() => setIsNamingModalOpen(true), 150);
      return;
    }

    if (!filledFeature) {
      setErrorMsg('请先标定节点并点击“生成领土”后再保存！');
      return;
    }
    setIsNamingModalOpen(true);
  };
  const handleSaveCityConfirm = () => {
    if (!cityInputModal.name.trim()) return;

    if (cityInputModal.type === 'capital') {
      setCapital({
        name: cityInputModal.name.trim(),
        isCapital: true,
        lng: cityInputModal.lngLat[0],
        lat: cityInputModal.lngLat[1]
      });
    } else {
      const newCity: CustomCity = {
        name: cityInputModal.name.trim(),
        isCapital: false,
        lng: cityInputModal.lngLat[0],
        lat: cityInputModal.lngLat[1]
      };
      setCities(prev => [...prev.filter(c => c.name !== newCity.name), newCity]);
    }

    setCityInputModal({ isOpen: false, type: 'capital', lngLat: [0, 0], name: '' });
  };

  const handleConfirmSaveCountry = () => {
    if (!countryName.trim()) {
      setErrorMsg('请输入有效的国家名称！');
      return;
    }

    if (!filledFeature) {
      setErrorMsg('缺失有效的国家陆地几何数据！');
      return;
    }

    try {
      // Final aggressive cleanup: truncate and simplify one last time with dynamic precision
      const featArea = turf.area(filledFeature);
      const precision = featArea < 10000 ? 8 : (featArea < 1e6 ? 7 : 5);
      const scaleFactor = Math.pow(10, precision);

      const cleaned = turf.truncate(filledFeature, { precision, coordinates: 2 });
      const simplified = simplifyFeature(cleaned);

      // Truncate raw nodes/holes as well to save space with the correct precision
      const truncatedNodes = nodes.map(n => [
        Math.round(n[0] * scaleFactor) / scaleFactor,
        Math.round(n[1] * scaleFactor) / scaleFactor
      ] as [number, number]);
      
      const truncatedHoles = holes.map(h => 
        h.map(n => [
          Math.round(n[0] * scaleFactor) / scaleFactor,
          Math.round(n[1] * scaleFactor) / scaleFactor
        ] as [number, number])
      );

      const saved = saveCustomCountry(
        countryName,
        simplified,
        capital,
        cities,
        truncatedNodes,
        truncatedHoles,
        initialCountry?.id
      );

      setSavedCountryObj(saved);
      setSuccessMsg(`🎉 国家 “${saved.name}” 已成功保存！`);
      setErrorMsg(null);
    } catch (e: any) {
      console.error('Save custom country failed:', e);
      setErrorMsg(`⚠️ 保存失败：${e.message || '存储空间已满。请尝试清空其他自定义国家或点击“清空”简化版图再试。'}`);
      setSuccessMsg(null);
    }
  };

  return (
    <div className="absolute inset-x-0 top-3 z-50 flex flex-col items-center pointer-events-none px-2 sm:px-4 max-w-full">
      {/* Main Control Panel Bar */}
      <div className={`glass-dark border border-amber-500/40 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-2 text-white transition-all duration-300 pointer-events-auto animate-fade-in max-w-[calc(100vw-1rem)] overflow-x-auto overflow-y-hidden no-scrollbar touch-pan-x ${isAligning ? 'p-0 border-0 bg-transparent w-full max-w-lg' : isCollapsed ? 'p-1.5 w-auto' : 'p-2.5 max-w-2xl w-full'}`}>
        
        {/* Header & Mode Switcher (Hidden when collapsed or aligning) */}
        {!isCollapsed && !isAligning && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-amber-200">
                {initialCountry ? `编辑国家：${initialCountry.name.replace(/^🎨\s*\[.*?\]\s*/, '').replace(/^\d+:\s*/, '')}` : '绘制新国家'}
              </h3>
              <p className="text-[10px] text-gray-400">
                {selectedRestrictCountries.length > 0
                  ? `领土将${clipMode === 'inside' ? '限制在' : '扣除'}【${selectedRestrictCountries.map(c => c.name).join('、')}】${clipMode === 'inside' ? '边境内' : '边境部分'}`
                  : '可跨越海面连线，填充时将自动切除海面仅保留陆地'}
              </p>
            </div>
          </div>
        )}

        {isCollapsed && !isAligning && (
          <div className="flex items-center gap-2 px-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-200">
              {initialCountry ? `编辑：${initialCountry.name.replace(/^🎨\s*\[.*?\]\s*/, '').replace(/^\d+:\s*/, '')}` : '正在绘制'}
            </span>
          </div>
        )}

        {/* Specific Country Boundary Restriction Selector (Hidden when collapsed or aligning) */}
        {!isCollapsed && !isAligning && (
          <div className="relative pointer-events-auto">
            <div className="flex flex-wrap items-center gap-1.5 glass-card px-2 py-1 rounded-xl text-xs border border-white/10 max-w-xl">
              <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-gray-400 font-medium whitespace-nowrap text-[11px] shrink-0">多国限制/保内外:</span>

              {selectedRestrictCountries.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  {selectedRestrictCountries.map(c => (
                    <span key={c.iso3} className="flex items-center gap-1 font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-500/40 shadow-sm text-[11px]">
                      {c.name}
                      <button
                        type="button"
                        onClick={() => setSelectedRestrictCountries(prev => prev.filter(item => item.iso3 !== c.iso3))}
                        className="text-cyan-400 hover:text-red-400 text-xs ml-0.5 font-bold transition-colors"
                        title="移除此国家"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCountryDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1 text-cyan-300 hover:text-white text-[11px] font-bold bg-cyan-500/20 hover:bg-cyan-500/30 px-2 py-0.5 rounded-lg border border-cyan-500/30 transition-colors"
                  >
                    <span>+ 选择更多</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRestrictCountries([])}
                    className="text-xs text-red-400 hover:text-red-300 px-1 py-0.5 font-bold"
                  >
                    清空
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(prev => !prev)}
                  className="flex items-center gap-1 text-gray-200 hover:text-white text-[11px] font-bold bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 transition-colors"
                >
                  <span>🌐 全球陆地 (未限制)</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
              )}

              {/* Inside / Outside Clip Mode toggle */}
              <div className="flex items-center gap-1 ml-1 pl-1 border-l border-white/10 shrink-0">
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setClipMode('inside')}
                  title="保内：绘制与保留在选中多国范围内的陆地"
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    clipMode === 'inside' ? 'bg-amber-500 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  保内
                </button>
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setClipMode('outside')}
                  title="保外：扣除选中多国范围，保留多国以外的陆地"
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    clipMode === 'outside' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  保外
                </button>
              </div>

              {/* Load Selected Countries' Geometries button */}
              {selectedRestrictCountries.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    let combined: any = null;
                    for (const target of selectedRestrictCountries) {
                      const feat = getFeatureForTarget(target.iso3);
                      if (feat) {
                        combined = combined ? combineGeometriesToMultiPolygon(combined, feat) : feat;
                      }
                    }
                    if (!combined) {
                      setErrorMsg('无法获取所选国家的矢量边界');
                      return;
                    }
                    const worldLand = getWorldLandMultiPolygon();
                    let result: any = combined;
                    if (clipMode === 'outside') {
                      let subtractMask = combined;
                      try {
                        const bufferedMask = turf.buffer(combined, 0.008, { units: 'degrees' });
                        if (bufferedMask && bufferedMask.geometry) subtractMask = bufferedMask;
                      } catch (e) {
                        console.warn('Buffer subtraction mask failed', e);
                      }
                      const diff = turf.difference(turf.featureCollection([worldLand as any, subtractMask as any]));
                      if (diff && diff.geometry) result = diff;
                    }
                    result = simplifyFeature(result);
                    setFilledFeature(result);
                    const countryNames = selectedRestrictCountries.map(c => c.name).join('、');
                    setSuccessMsg(`🎉 已成功载入【${countryNames}】的 ${clipMode === 'inside' ? '完整版图' : '保外区域'}！`);
                    setTimeout(() => setSuccessMsg(null), 3500);
                  }}
                  className="ml-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-lg shadow-sm transition-transform active:scale-95 shrink-0"
                >
                  ⚡ 直接载入多国版图
                </button>
              )}
            </div>

            {/* Dropdown search menu */}
            {isCountryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-[100] glass-dark border border-white/10 rounded-xl shadow-2xl p-2 w-64 flex flex-col gap-1.5 text-xs animate-fade-in">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={countrySearchQuery}
                    onChange={e => setCountrySearchQuery(e.target.value)}
                    placeholder="搜索国家 (如: 中国/日本/美国)..."
                    className="w-full glass-input pl-8 pr-2 py-1 text-xs text-white placeholder-slate-400 outline-none focus:border-amber-500/50"
                    autoFocus
                  />
                </div>

                <div className="max-h-52 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRestrictCountries([]);
                      setIsCountryDropdownOpen(false);
                    }}
                    className={`text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                      selectedRestrictCountries.length === 0 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <span>🌐 全球陆地 (取消全部国家限制)</span>
                    {selectedRestrictCountries.length === 0 && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>

                  {(() => {
                    const savedCustoms = getSavedCustomCountries();
                    const filteredCustoms = countrySearchQuery
                      ? savedCustoms.filter(c => c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()))
                      : savedCustoms;
                    if (filteredCustoms.length === 0) return null;
                    return (
                      <>
                        <div className="px-2.5 py-1 text-[9px] font-bold text-amber-400/80 uppercase tracking-wider border-b border-white/5 mt-1 select-none">
                          🛠️ 已保存自定义领土 ({filteredCustoms.length})
                        </div>
                        {filteredCustoms.map(c => {
                          const isSelected = selectedRestrictCountries.some(item => item.iso3 === c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedRestrictCountries(prev => prev.filter(item => item.iso3 !== c.id));
                                } else {
                                  setSelectedRestrictCountries(prev => [...prev, { iso3: c.id, name: c.name }]);
                                }
                              }}
                              className={`text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                                isSelected ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-white/5 text-slate-300'
                              }`}
                            >
                              <span className="truncate">🎨 {c.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </button>
                          );
                        })}
                      </>
                    );
                  })()}

                  {searchCountries(countrySearchQuery).map(c => {
                    const cleanName = c.name.replace(/^🎨\s*\[.*?\]\s*/, '').replace(/^\d+:\s*/, '');
                    const isSelected = selectedRestrictCountries.some(item => item.iso3 === c.iso3);
                    return (
                      <button
                        key={c.iso3}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedRestrictCountries(prev => prev.filter(item => item.iso3 !== c.iso3));
                          } else {
                            setSelectedRestrictCountries(prev => [...prev, { iso3: c.iso3, name: cleanName }]);
                          }
                        }}
                        className={`text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                          isSelected ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <span className="truncate">{cleanName}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Draw Tool Modes (Hidden during alignment) */}
        {!isAligning && (
          <div className="flex items-center gap-1 glass-card p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => { setDrawMode('nodes'); setIsCollapsed(false); }}
              disabled={isAligning}
              className={`px-2 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                drawMode === 'nodes' ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white disabled:opacity-30'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {!isCollapsed && <span>划定边界 ({nodes.length})</span>}
              {isCollapsed && <span>{nodes.length}</span>}
            </button>

            <button
              onClick={() => { setDrawMode('capital'); setIsCollapsed(false); }}
              disabled={isAligning}
              className={`px-2 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                drawMode === 'capital' ? 'bg-amber-500 text-slate-950 shadow' : 'text-gray-400 hover:text-white disabled:opacity-30'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              {!isCollapsed && <span>{capital ? '重定都城' : '放置都城'}</span>}
            </button>

            <button
              onClick={() => { setDrawMode('city'); setIsCollapsed(false); }}
              disabled={isAligning}
              className={`px-2 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                drawMode === 'city' ? 'bg-sky-600 text-white shadow' : 'text-gray-400 hover:text-white disabled:opacity-30'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {!isCollapsed && <span>放置城市 ({cities.length})</span>}
              {isCollapsed && <span>{cities.length}</span>}
            </button>

            <button
              onClick={() => { 
                setDrawMode('hole'); 
                setIsCollapsed(false);
                setHoles(prev => {
                  if (prev.length === 0 || prev[prev.length - 1].length > 0) {
                    return [...prev, []];
                  }
                  return prev;
                });
              }}
              disabled={isAligning}
              className={`px-2 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                drawMode === 'hole' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white disabled:opacity-30'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              {!isCollapsed && <span>减去区域 ({holes.filter(h => h.length > 0).length})</span>}
              {isCollapsed && <span>{holes.filter(h => h.length > 0).length}</span>}
            </button>

            <button
              onClick={() => { 
                setDrawMode('trace'); 
                setIsCollapsed(false); 
                if (traceImage) setUseBlankMap(true);
              }}
              disabled={isAligning}
              className={`px-2 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                drawMode === 'trace' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white disabled:opacity-30'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {!isCollapsed && <span>描边底图</span>}
            </button>
          </div>
        )}

        {/* Basemap Selection (Hidden during alignment) */}
        {!isAligning && (
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
            <span className="text-[10px] text-amber-200/80 font-bold px-1.5 uppercase tracking-wider">底图:</span>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setMapStyle('osm')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                mapStyle === 'osm' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              CARTO
            </button>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setMapStyle('google_road')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                mapStyle === 'google_road' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              谷歌路网
            </button>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setMapStyle('google')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                mapStyle === 'google' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              必应卫星
            </button>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setMapStyle('baidu')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                mapStyle === 'baidu' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              高德地图
            </button>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setMapStyle('tencent')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                mapStyle === 'tencent' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              腾讯地图
            </button>
          </div>
        )}

        {/* Fullscreen Toggle Button */}
        {!isAligning && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={toggleFullscreen}
            className="px-2.5 py-1 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer shrink-0"
            title={isFullscreen ? "退出全屏" : "全屏显示"}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? "还原" : "全屏"}</span>
          </button>
        )}

        {/* Alignment Tool Special Panel */}
        {isAligning && (
          <div className={`bg-slate-900/95 backdrop-blur-md border-2 border-amber-500/50 rounded-2xl shadow-2xl flex flex-col pointer-events-auto w-full max-w-lg transition-all ${isAlignPanelCollapsed ? 'p-2' : 'p-4 gap-3'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <Target className="w-5 h-5" />
                <span className="font-bold text-sm text-white">底图对齐校准工具</span>
                {isAlignPanelCollapsed && (
                  <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">
                    已设 {alignPairs.filter(p => p.map && p.imgUV).length} 组
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsAlignPanelCollapsed(!isAlignPanelCollapsed)}
                  className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                  title={isAlignPanelCollapsed ? "展开" : "收起"}
                >
                  {isAlignPanelCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => { setIsAligning(false); setAlignPairs([]); }}
                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                  title="关闭对齐工具"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {!isAlignPanelCollapsed && (
              <>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  请按顺序标注：先点地图位置 (M)，再点底图对应点 (I)。建议设置 2-3 组。比例将严格保持，仅执行缩放和旋转。
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUseBlankMap(!useBlankMap)}
                    className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl border-2 transition-all ${
                      useBlankMap ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {useBlankMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span className="text-xs font-bold">{useBlankMap ? '当前: 纯净图层' : '当前: 地图叠加'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!map) return;
                      const center = map.getCenter();
                      const centerProj = project(center.lng, center.lat);
                      const zoom = map.getZoom();
                      const span = 6 / Math.pow(2, zoom);
                      const aspect = traceImageAspectRatioRef.current || 1;
                      
                      // Get a projected span
                      const edgeProj = project(center.lng + span, center.lat);
                      const projSpanX = Math.abs(edgeProj[0] - centerProj[0]);
                      
                      const halfWidth = projSpanX * aspect;
                      const halfHeight = projSpanX;
                      
                      const newBounds: [number, number][] = [
                        unproject(centerProj[0] - halfWidth, centerProj[1] - halfHeight),
                        unproject(centerProj[0] + halfWidth, centerProj[1] - halfHeight),
                        unproject(centerProj[0] + halfWidth, centerProj[1] + halfHeight),
                        unproject(centerProj[0] - halfWidth, centerProj[1] + halfHeight)
                      ];
                      setImageBounds(newBounds);
                      setIsImageFixed(false);
                      setSuccessMsg('底图已重置到屏幕中央 (已应用投影修正)');
                    }}
                    className="flex-1 p-2 rounded-xl border-2 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 text-xs font-bold transition-all"
                  >
                    重置底图位置
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAlignPairs([]);
                      setAlignTarget('map');
                      setSuccessMsg('参考点已清空');
                    }}
                    className="p-2 rounded-xl border-2 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 text-[10px] font-bold transition-all whitespace-nowrap"
                  >
                    重置
                  </button>
                  <button
                    onClick={() => setAlignTarget('map')}
                    className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      alignTarget === 'map' 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300' 
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-[10px] font-bold">1. 打地图点 (M)</span>
                    <span className="text-[9px] opacity-70">点击 OSM 上的位置</span>
                  </button>

                  <button
                    onClick={() => setAlignTarget('img')}
                    className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      alignTarget === 'img' 
                        ? 'bg-orange-500/20 border-orange-400 text-orange-300' 
                        : 'border-slate-700 bg-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-[10px] font-bold">2. 打底图点 (I)</span>
                    <span className="text-[9px] opacity-70">点击图中的对应点</span>
                  </button>
                </div>

                {/* Pair List Visualization */}
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                  {alignPairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-gray-800/80 p-1.5 rounded-lg border border-gray-700 text-[10px]">
                      <span className="text-gray-500 font-bold mr-1">#{idx+1}</span>
                      <div className={`w-2 h-2 rounded-full ${pair.map ? 'bg-blue-500' : 'bg-gray-700'}`} title="地图点" />
                      <div className={`w-2 h-2 rounded-full ${pair.imgUV ? 'bg-orange-500' : 'bg-gray-700'}`} title="底图点" />
                      <button 
                        onClick={() => setAlignPairs(prev => prev.filter((_, i) => i !== idx))}
                        className="ml-1 text-gray-500 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {alignPairs.length === 0 && (
                    <div className="text-center w-full py-2 text-gray-600 text-[10px] italic">尚未记录任何参考点</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsAligning(false);
                      setAlignPairs([]);
                    }}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2 rounded-xl text-xs transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={applyAlignment}
                    disabled={alignPairs.filter(p => p.map && p.imgUV).length < 3}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg shadow-emerald-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    完成对齐并应用 ({alignPairs.filter(p => p.map && p.imgUV).length} 组)
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Trace Image Controls (Hidden when collapsed or not in trace/align mode) */}
        {!isCollapsed && !isAligning && drawMode === 'trace' && (
          <div className="flex items-center gap-2 border-l border-gray-700 pl-3">
            {!traceImage ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>上传底图</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsImageFixed(!isImageFixed)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    isImageFixed ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                  title={isImageFixed ? "解锁底图以调整位置" : "固定底图开始描边"}
                >
                  {isImageFixed ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
                
                <div className="flex flex-col gap-1 w-20">
                  <div className="flex justify-between text-[8px] text-gray-500 uppercase font-bold px-0.5">
                    <span>透明度</span>
                    <span>{Math.round(imageOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={imageOpacity}
                    onChange={e => setImageOpacity(parseFloat(e.target.value))}
                    className="h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <button
                  onClick={() => {
                    setTraceImage(null);
                    setImageBounds(null);
                    setIsAligning(false);
                    setAlignPairs([]);
                  }}
                  className="p-1.5 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 rounded-lg text-red-200 transition-all"
                  title="移除底图"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="h-6 w-px bg-gray-700 mx-1" />

                <button
                  onClick={() => {
                    setIsAligning(true);
                    setIsImageFixed(true);
                    setIsCollapsed(true);
                    setSuccessMsg('📍 对齐工具已开启');
                  }}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 border border-amber-600/50 rounded-lg text-amber-400 transition-all"
                  title="开启对齐工具"
                >
                  <Target className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setUseBlankMap(!useBlankMap)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    useBlankMap ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                  title={useBlankMap ? "显示底图" : "切换为纯净绘图背景"}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {!isAligning && (
            <>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={handleUndoNode}
                disabled={nodes.length === 0}
                title="撤销上一个边界节点"
                className="p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 disabled:opacity-40 transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={handleClearAll}
                title="清空全部图形与城市"
                className="p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 disabled:opacity-40 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={handleAddNewPart}
                disabled={nodes.length < 3}
                title="将当前封闭区域暂存为此国家的一个部分（支持多部分飞地），并清空画笔以便开始画新部分"
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-lg disabled:opacity-40 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>新部分</span>
              </button>

              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={handleGenerateTerritory}
                disabled={nodes.length < 3}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-lg disabled:opacity-40 transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{drawMode === 'trace' ? '转化地图' : '生成领土'}</span>
              </button>

              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={handleOpenSaveNamingModal}
                disabled={!filledFeature && nodes.length < 3}
                title={initialCountry ? "保存对该自定义国家的修改" : "保存新国家"}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-lg disabled:opacity-40 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{initialCountry ? "保存修改" : "保存国家"}</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-amber-400 transition-all active:scale-95"
            title={isCollapsed ? "展开面板" : "收起面板"}
          >
            {isCollapsed ? <Plus className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 rotate-180" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 bg-red-950/80 hover:bg-red-900 border border-red-700 rounded-lg text-red-200 transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info bar for Capital / City list (Hidden when collapsed) */}
      {!isCollapsed && (capital || cities.length > 0 || partCount > 0) && (
        <div className="mt-2 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-3 text-xs text-slate-200 pointer-events-auto">
          {partCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-400 font-bold border-r border-slate-700/60 pr-3 mr-1">
              🎨 领土包含: {partCount} 个部分/飞地
            </span>
          )}
          {capital && (
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              ⭐ 都城: {capital.name}
              <button
                onClick={() => setCapital(undefined)}
                className="text-slate-500 hover:text-red-400 text-xs ml-1"
                title="移除都城"
              >
                ✕
              </button>
            </span>
          )}
          {cities.map((c, i) => (
            <span key={i} className="flex items-center gap-1 text-sky-300">
              🏙️ {c.name}
              <button
                onClick={() => setCities(prev => prev.filter((_, idx) => idx !== i))}
                className="text-slate-500 hover:text-red-400 text-xs ml-0.5"
                title="移除城市"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Error Toast */}
      {errorMsg && (
        <div className="mt-2 bg-red-900/90 border border-red-500 text-red-100 text-xs px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 backdrop-blur-md pointer-events-auto animate-bounce">
          <AlertCircle className="w-4 h-4 text-red-300" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Toast */}
      {successMsg && !isNamingModalOpen && (
        <div className="mt-2 bg-emerald-900/90 border border-emerald-500 text-emerald-100 text-xs px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 backdrop-blur-md pointer-events-auto">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* City / Capital Naming Modal */}
      {cityInputModal.isOpen && (
        <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-xs w-full flex flex-col gap-3 text-white shadow-2xl">
            <div className="flex items-center gap-2 text-amber-300 font-bold border-b border-slate-800 pb-2 text-sm">
              {cityInputModal.type === 'capital' ? <Crown className="w-5 h-5 text-amber-400" /> : <Building2 className="w-5 h-5 text-sky-400" />}
              <span>{cityInputModal.type === 'capital' ? '标注都城' : '标注重要城市'}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">城市名称</label>
              <input
                type="text"
                value={cityInputModal.name}
                onChange={e => setCityInputModal(prev => ({ ...prev, name: e.target.value }))}
                placeholder={cityInputModal.type === 'capital' ? '如: 君士坦丁堡' : '如: 亚历山大'}
                className="bg-slate-800 border border-slate-600 rounded-xl p-2 text-sm outline-none focus:border-amber-500 text-white"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setCityInputModal({ isOpen: false, type: 'capital', lngLat: [0, 0], name: '' })}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveCityConfirm}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow"
              >
                确定放置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Country Naming Modal */}
      {isNamingModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto animate-fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/80 p-6 rounded-2xl max-w-sm w-full flex flex-col gap-4 text-white shadow-2xl relative">
            <button
              onClick={() => setIsNamingModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-amber-200">
                  {savedCountryObj ? '保存成功' : (initialCountry ? '保存编辑后的国家' : '保存绘制的国家')}
                </h4>
                <p className="text-xs text-slate-400">
                  {savedCountryObj ? '领土配置文件已成功生成' : '海岸线与陆地区域已自动精密切割'}
                </p>
              </div>
            </div>

            {savedCountryObj ? (
              <div className="flex flex-col gap-3 py-1 animate-fade-in">
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 text-xs rounded-xl text-center font-bold flex flex-col gap-1.5 shadow-lg">
                  <span className="text-sm">🎉 国家 “{savedCountryObj.name}” 已成功保存！</span>
                  <span className="text-[11px] text-emerald-300/90 font-normal leading-relaxed">
                    您可以分享该国家配置文件给好友，或直接在模拟场景中应用。
                  </span>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => shareOrDownloadCustomCountry(savedCountryObj)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    分享国家配置文件 (JSON)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsNamingModalOpen(false);
                      onSaved(savedCountryObj.id, savedCountryObj.name);
                    }}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    应用并完成
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSavedUpdate?.();
                      setIsNamingModalOpen(false);
                      setNodes([]);
                      setHoles([]);
                      setCapital(undefined);
                      setCities([]);
                      setFilledFeature(null);
                      setCountryName('');
                      setSelectedRestrictCountries([{ iso3: savedCountryObj.id, name: savedCountryObj.name }]);
                      setSavedCountryObj(null);
                    }}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    继续绘制下一国家
                  </button>
                </div>
              </div>
            ) : (
              <>
                {errorMsg && (
                  <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs rounded-xl font-bold">
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-amber-400">请输入国名</label>
                  <input
                    type="text"
                    value={countryName}
                    onChange={e => setCountryName(e.target.value)}
                    placeholder="如: 自由国 / 亚特兰蒂斯 / 龙之国"
                    className="bg-slate-800 border border-slate-600 rounded-xl p-2.5 text-sm outline-none focus:border-amber-500 text-white"
                    autoFocus
                  />
                </div>

                {capital && (
                  <div className="text-xs text-amber-300 font-bold bg-amber-950/40 p-2 rounded-lg border border-amber-800/50">
                    ⭐ 关联都城: {capital.name}
                  </div>
                )}

                {cities.length > 0 && (
                  <div className="text-xs text-sky-300 font-bold bg-sky-950/40 p-2 rounded-lg border border-sky-800/50">
                    🏙️ 关联重要城市 ({cities.length}): {cities.map(c => c.name).join(', ')}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={() => setIsNamingModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                  >
                    取消
                  </button>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={handleConfirmSaveCountry}
                    disabled={!countryName.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg disabled:opacity-40 transition-all active:scale-95"
                  >
                    保存国家
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
