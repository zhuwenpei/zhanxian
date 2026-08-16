import React, { useState, useRef, useEffect } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { Side } from '../types/simulation';
import { Video, X, AlertCircle, Loader2, Download, Check, Share2, XCircle } from 'lucide-react';
import { getCountryFlagEmoji } from '../utils/countryFlags';
import { getScaledDateString, getScaledDateTimeString } from '../utils/dateUtils';
import { getCachedLatLng, getCachedNeighbors } from '../engine/h3Cache';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import ysFixWebmDuration from 'fix-webm-duration';
import clsx from 'clsx';

function createLiquidGlassTexture(width: number, height: number, scale: number): HTMLCanvasElement {
  const glassCanvas = document.createElement('canvas');
  glassCanvas.width = width;
  glassCanvas.height = height;
  const gctx = glassCanvas.getContext('2d')!;

  const radius = 12 * scale;
  
  gctx.save();
  
  gctx.beginPath();
  if (gctx.roundRect) {
    gctx.roundRect(0, 0, width, height, radius);
  } else {
    gctx.rect(0, 0, width, height);
  }
  gctx.clip();

  // Deep dark glass background mimicking a sleek control panel button
  const baseGrad = gctx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0, 'rgba(10, 12, 18, 0.85)');
  baseGrad.addColorStop(0.5, 'rgba(15, 18, 28, 0.75)');
  baseGrad.addColorStop(1, 'rgba(8, 10, 14, 0.9)');
  gctx.fillStyle = baseGrad;
  gctx.fillRect(0, 0, width, height);

  // Diagonal refraction beam (liquid gloss)
  const sheenGrad = gctx.createLinearGradient(0, 0, width, height);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
  sheenGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.0)');
  sheenGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.05)');
  sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
  sheenGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.05)');
  sheenGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.0)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  gctx.fillStyle = sheenGrad;
  gctx.fillRect(0, 0, width, height);

  // Top gloss edge reflection
  const topGloss = gctx.createLinearGradient(0, 0, 0, height * 0.45);
  topGloss.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  topGloss.addColorStop(0.1, 'rgba(255, 255, 255, 0.15)');
  topGloss.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  gctx.fillStyle = topGloss;
  gctx.fillRect(0, 0, width, height * 0.45);

  // Bottom warm glow reflection
  const bottomGlow = gctx.createLinearGradient(0, height * 0.6, 0, height);
  bottomGlow.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
  bottomGlow.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
  gctx.fillStyle = bottomGlow;
  gctx.fillRect(0, height * 0.6, width, height * 0.4);

  gctx.restore();

  // 3D double beveled border
  const borderGrad = gctx.createLinearGradient(0, 0, width, height);
  borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  borderGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.25)');
  borderGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
  borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

  gctx.strokeStyle = borderGrad;
  gctx.lineWidth = 1.5 * scale;
  gctx.beginPath();
  if (gctx.roundRect) {
    gctx.roundRect(0.75 * scale, 0.75 * scale, width - 1.5 * scale, height - 1.5 * scale, radius);
  } else {
    gctx.rect(0.75 * scale, 0.75 * scale, width - 1.5 * scale, height - 1.5 * scale);
  }
  gctx.stroke();

  // Highlight line at absolute top edge
  gctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  gctx.lineWidth = 1 * scale;
  gctx.beginPath();
  gctx.moveTo(radius, 1.5 * scale);
  gctx.lineTo(width - radius, 1.5 * scale);
  gctx.stroke();

  return glassCanvas;
}

interface CaptureEvent {
  dayIndex: number;
  cellId: string;
  side: Side;
  rawGlobalTime: number;
  smoothedGlobalTime: number;
}

function getContinuousNormalizedMap(captured: string[], side: Side, prevOwners: Record<string, Side>) {
  const norms = new Map<string, number>();
  if (captured.length === 0) return norms;
  
  const capturedSet = new Set(captured);
  const queue: { id: string; d: number }[] = [];
  const visited = new Set<string>();
  
  for (let i = 0; i < captured.length; i++) {
    const cid = captured[i];
    const neighbors = getCachedNeighbors(cid);
    let hasFriendlyNeighbor = false;
    for (let j = 0; j < neighbors.length; j++) {
      if (prevOwners[neighbors[j]] === side) {
        hasFriendlyNeighbor = true;
        break;
      }
    }
    if (hasFriendlyNeighbor) {
      queue.push({ id: cid, d: 0 });
      visited.add(cid);
    }
  }

  if (queue.length === 0) {
    for (let i = 0; i < captured.length; i++) {
      const cid = captured[i];
      queue.push({ id: cid, d: 0 });
      visited.add(cid);
    }
  }

  let maxD = 0;
  let head = 0;
  while(head < queue.length) {
    const curr = queue[head++];
    maxD = Math.max(maxD, curr.d);
    norms.set(curr.id, curr.d);
    
    const neighbors = getCachedNeighbors(curr.id);
    for (let j = 0; j < neighbors.length; j++) {
      const nid = neighbors[j];
      if (capturedSet.has(nid) && !visited.has(nid)) {
        visited.add(nid);
        queue.push({ id: nid, d: curr.d + 1 });
      }
    }
  }

  for (let i = 0; i < captured.length; i++) {
    const cid = captured[i];
    const d = norms.get(cid) || 0;
    norms.set(cid, maxD === 0 ? 0.5 : d / maxD);
  }
  
  return norms;
}

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoExportModal({ isOpen, onClose }: VideoExportModalProps) {
  const currentStoreStyle = useSimulationStore(s => s.mapStyle || 'osm');
  const [selectedMapStyle, setSelectedMapStyle] = useState<'google' | 'google_road' | 'osm' | 'baidu' | 'tencent' | 'offline'>(currentStoreStyle);
  const [durationSec, setDurationSec] = useState<number>(12);

  useEffect(() => {
    if (isOpen) {
      setSelectedMapStyle(useSimulationStore.getState().mapStyle || 'osm');
    }
  }, [isOpen]);
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'landscape'>('portrait');
  const [manualSubSteps, setManualSubSteps] = useState<'default' | '30' | '15' | '10' | '5' | '1'>('default');
  const [exporting, setExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortExportRef = useRef<boolean>(false);

  const history = useSimulationStore(s => s.history || []);
  const timeMultiplier = useSimulationStore(s => s.timeMultiplier || 1);
  const red = useSimulationStore(s => s.red);
  const blue = useSimulationStore(s => s.blue);
  const mapInstance = useSimulationStore(s => s.mapInstance);
  const setMapStyle = useSimulationStore(s => s.setMapStyle);
  const applyReplayFrame = useSimulationStore(s => s.applyReplayFrame);
  const replayIndex = useSimulationStore(s => s.replayIndex);

  if (!isOpen) return null;

  const isEndingFrame = (frame: any) => {
    if (!frame) return false;
    const txt = frame.dailyEventText || '';
    return (
      txt.startsWith('【终局时刻】') ||
      txt.startsWith('【战后管制】') ||
      txt.startsWith('【战后秩序】') ||
      txt.startsWith('【战线停火】') ||
      txt.startsWith('【平定融入】') ||
      txt.startsWith('【领土确认】') ||
      txt.startsWith('【停战协议】')
    );
  };

  // Build expanded history frames enforcing minimum 3 FPS (subdividing daily cell flips chronologically if needed)
  const buildExpandedHistoryFrames = (sourceHistory: typeof history, reqSec: number, targetFPS: number = 30) => {
    if (!sourceHistory || sourceHistory.length === 0) return [];
    
    const startDateStr = sourceHistory[0]?.currentDate || '2023-01-01';

    // Helper to smoothly interpolate coordinates and strengths of units between frames using cubic easing
    const interpolateUnits = (prevUnits: any[] = [], currUnits: any[] = [], alpha: number) => {
      const prevMap = new Map<string, any>();
      prevUnits.forEach(u => prevMap.set(u.id, u));
      
      // Smooth cubic ease-in-out for fluid acceleration/deceleration of troop movement
      const easeAlpha = alpha * alpha * (3 - 2 * alpha);

      return currUnits.map(currUnit => {
        const prevUnit = prevMap.get(currUnit.id);
        if (prevUnit) {
          const dLat = currUnit.latitude - prevUnit.latitude;
          const dLng = currUnit.longitude - prevUnit.longitude;
          const distSq = dLat * dLat + dLng * dLng;
          // If distance moved is excessively large (> ~250km), transition smoothly without zooming across screen
          if (distSq > 6.0) {
            return alpha < 0.5 ? { ...prevUnit } : { ...currUnit };
          }
          return {
            ...currUnit,
            latitude: prevUnit.latitude + dLat * easeAlpha,
            longitude: prevUnit.longitude + dLng * easeAlpha,
            strength: Math.round(prevUnit.strength + (currUnit.strength - prevUnit.strength) * easeAlpha)
          };
        }
        return currUnit;
      });
    };

    // If manualSubSteps is '1', output 1 frame per day (no interpolation)
    if (manualSubSteps === '1') {
      return sourceHistory.map((frame, i) => ({
        ...frame,
        originalHistoryIdx: i,
        currentDate: getScaledDateString(startDateStr, i, timeMultiplier),
        redUnits: frame.redUnits ? frame.redUnits.map((u: any) => ({ ...u })) : [],
        blueUnits: frame.blueUnits ? frame.blueUnits.map((u: any) => ({ ...u })) : []
      })) as any;
    }

    const totalTargetFrames = Math.max(30, Math.round(reqSec * targetFPS));
    const totalDays = sourceHistory.length;
    
    let targetSubStepsPerDay = 30;
    if (manualSubSteps === 'default') {
      // Auto-calculate the sub-steps per day to perfectly fill the target frame count for 30 FPS smooth interpolation!
      // High Performance Optimization: Cap targetSubStepsPerDay at 8 to reduce memory overhead and worker repaints by 4x-5x without losing quality!
      targetSubStepsPerDay = Math.min(8, Math.max(1, Math.round(totalTargetFrames / totalDays)));
    } else {
      targetSubStepsPerDay = parseInt(manualSubSteps, 10) || 30;
    }

    const subSteps = Math.max(1, targetSubStepsPerDay);

    // Efficiency: Pre-calculate capture events and group them by day
    const allEventsByDay: CaptureEvent[][] = Array.from({ length: sourceHistory.length }, () => []);
    const eventLookup = new Map<string, CaptureEvent[]>();
    const cellIds = sourceHistory.length > 0 && sourceHistory[0].cellOwners ? Object.keys(sourceHistory[0].cellOwners) : [];

    for (let i = 1; i < sourceHistory.length; i++) {
      const prevFrame = sourceHistory[i - 1];
      const currFrame = sourceHistory[i];
      if (isEndingFrame(currFrame)) continue;

      const prevOwners = prevFrame.cellOwners || {};
      const currOwners = currFrame.cellOwners || {};
      
      const redCaptured: string[] = [];
      const blueCaptured: string[] = [];
      
      for (let j = 0; j < cellIds.length; j++) {
        const cid = cellIds[j];
        const currOwner = currOwners[cid];
        const prevOwner = prevOwners[cid];
        if (currOwner !== prevOwner) {
          if (currOwner === 'red') redCaptured.push(cid);
          else if (currOwner === 'blue') blueCaptured.push(cid);
        }
      }

      const redNorms = getContinuousNormalizedMap(redCaptured, 'red', prevOwners);
      const blueNorms = getContinuousNormalizedMap(blueCaptured, 'blue', prevOwners);

      for (const [cid, norm] of redNorms.entries()) {
        const rawTime = (i - 1) + norm;
        const ev = { dayIndex: i, cellId: cid, side: 'red' as Side, rawGlobalTime: rawTime, smoothedGlobalTime: rawTime };
        allEventsByDay[i].push(ev);
        if (!eventLookup.has(cid)) eventLookup.set(cid, []);
        eventLookup.get(cid)!.push(ev);
      }

      for (const [cid, norm] of blueNorms.entries()) {
        const rawTime = (i - 1) + norm;
        const ev = { dayIndex: i, cellId: cid, side: 'blue' as Side, rawGlobalTime: rawTime, smoothedGlobalTime: rawTime };
        allEventsByDay[i].push(ev);
        if (!eventLookup.has(cid)) eventLookup.set(cid, []);
        eventLookup.get(cid)!.push(ev);
      }
    }

    const allEventsFlat = allEventsByDay.flat();

    // Step B: Apply spatial-temporal Laplacian smoothing on event times
    const numIterations = 2;
    const lambda = 0.35;
    
    for (let iter = 0; iter < numIterations; iter++) {
      for (let e = 0; e < allEventsFlat.length; e++) {
        const ev = allEventsFlat[e];
        const neighbors = getCachedNeighbors(ev.cellId);
        let neighborTimesSum = 0;
        let neighborTimesCount = 0;

        for (let n = 0; n < neighbors.length; n++) {
          const nid = neighbors[n];
          const nEvents = eventLookup.get(nid);
          if (nEvents && nEvents.length > 0) {
            let bestNEv = nEvents[0];
            let minDiff = Math.abs(bestNEv.smoothedGlobalTime - ev.smoothedGlobalTime);
            for (let k = 1; k < nEvents.length; k++) {
              const diff = Math.abs(nEvents[k].smoothedGlobalTime - ev.smoothedGlobalTime);
              if (diff < minDiff) {
                minDiff = diff;
                bestNEv = nEvents[k];
              }
            }
            if (minDiff < 2.0) {
              neighborTimesSum += bestNEv.smoothedGlobalTime;
              neighborTimesCount++;
            }
          } else if (sourceHistory[0].cellOwners?.[nid] === ev.side && ev.rawGlobalTime < 1.5) {
            neighborTimesSum += 0;
            neighborTimesCount++;
          }
        }

        if (neighborTimesCount > 0) {
          ev.smoothedGlobalTime = (1 - lambda) * ev.smoothedGlobalTime + lambda * (neighborTimesSum / neighborTimesCount);
        }
      }
    }

    // Efficiency: Pre-group all events into subframe buckets
    const subframeBuckets: CaptureEvent[][] = Array.from({ length: (sourceHistory.length - 1) * subSteps + 1 }, () => []);
    for (const ev of allEventsFlat) {
      const bucketIdx = Math.max(1, Math.ceil(ev.smoothedGlobalTime * subSteps));
      if (bucketIdx < subframeBuckets.length) {
        subframeBuckets[bucketIdx].push(ev);
      }
    }

    const expanded: typeof history = [];
    const firstFrame = {
      ...sourceHistory[0],
      originalHistoryIdx: 0,
      currentDate: getScaledDateString(startDateStr, 0, timeMultiplier),
      redUnits: sourceHistory[0].redUnits ? sourceHistory[0].redUnits.map((u: any) => ({ ...u })) : [],
      blueUnits: sourceHistory[0].blueUnits ? sourceHistory[0].blueUnits.map((u: any) => ({ ...u })) : []
    };
    expanded.push(firstFrame);

    let currentCellOwners = { ...(sourceHistory[0].cellOwners || {}) };
    let lastCellOwnersRef = currentCellOwners;
    const fadeDuration = Math.max(1, Math.min(8, Math.round(subSteps / 3)));
    const fadeFracDays = fadeDuration / subSteps;

    // Efficiency: Maintain a sliding window buffer of active events for cell highlighting
    const activeHighlightEvents: CaptureEvent[] = [];

    for (let i = 1; i < sourceHistory.length; i++) {
      const prevFrame = sourceHistory[i - 1];
      const currFrame = sourceHistory[i];
      const scaledDate = getScaledDateString(startDateStr, i, timeMultiplier);

      if (isEndingFrame(currFrame)) {
        currentCellOwners = { ...(currFrame.cellOwners || {}) };
        lastCellOwnersRef = currentCellOwners;

        // Generate subSteps fade-out frames so any active highlight trails decay smoothly to opacity 0
        for (let step = 1; step <= subSteps; step++) {
          const alpha = step / subSteps;
          const currentFracDay = (i - 1) + alpha;

          // Remove expired highlight events
          const minTime = currentFracDay - fadeFracDays;
          while (activeHighlightEvents.length > 0 && activeHighlightEvents[0].smoothedGlobalTime <= minTime) {
            activeHighlightEvents.shift();
          }

          const cellsToHighlight: string[] = [];
          for (let e = 0; e < activeHighlightEvents.length; e++) {
            const ev = activeHighlightEvents[e];
            if (ev.smoothedGlobalTime <= currentFracDay) {
              const ageFrac = currentFracDay - ev.smoothedGlobalTime;
              const opacity = Math.max(0, 1.0 - (ageFrac / fadeFracDays));
              if (opacity > 0.05) {
                cellsToHighlight.push(`${ev.cellId}:${opacity.toFixed(2)}`);
              }
            }
          }

          expanded.push({
            ...currFrame,
            originalHistoryIdx: i,
            currentDate: scaledDate,
            redLosses: currFrame.redLosses ?? prevFrame.redLosses,
            blueLosses: currFrame.blueLosses ?? prevFrame.blueLosses,
            redActiveTroops: currFrame.redActiveTroops ?? prevFrame.redActiveTroops,
            blueActiveTroops: currFrame.blueActiveTroops ?? prevFrame.blueActiveTroops,
            cellOwners: currentCellOwners,
            redUnits: interpolateUnits(prevFrame.redUnits, currFrame.redUnits, alpha),
            blueUnits: interpolateUnits(prevFrame.blueUnits, currFrame.blueUnits, alpha),
            lastTickCapturedCells: cellsToHighlight
          } as any);
        }
        continue;
      }

      for (let step = 1; step <= subSteps; step++) {
        const alpha = step / subSteps;
        const g = (i - 1) * subSteps + step;
        const currentFracDay = g / subSteps;

        const subFracTick = (i - 1) + (step / subSteps);
        const subScaledDayIndex = Math.round(subFracTick * timeMultiplier);
        const subScaledDate = getScaledDateString(startDateStr, subScaledDayIndex, 1);

        // Use pre-bucketed events
        const newlyFlippedEvents = subframeBuckets[g] || [];
        let cellOwnersRef = lastCellOwnersRef;

        if (newlyFlippedEvents.length > 0) {
          currentCellOwners = { ...currentCellOwners };
          for (let e = 0; e < newlyFlippedEvents.length; e++) {
            const ev = newlyFlippedEvents[e];
            if (ev.side) currentCellOwners[ev.cellId] = ev.side;
            else delete currentCellOwners[ev.cellId];
          }
          cellOwnersRef = currentCellOwners;
          lastCellOwnersRef = currentCellOwners;
        }

        for (let e = 0; e < newlyFlippedEvents.length; e++) {
          activeHighlightEvents.push(newlyFlippedEvents[e]);
        }

        // Remove expired highlight events outside the fade window
        const minTime = currentFracDay - fadeFracDays;
        while (activeHighlightEvents.length > 0 && activeHighlightEvents[0].smoothedGlobalTime <= minTime) {
          activeHighlightEvents.shift();
        }

        const cellsToHighlight: string[] = [];
        for (let e = 0; e < activeHighlightEvents.length; e++) {
          const ev = activeHighlightEvents[e];
          if (ev.smoothedGlobalTime <= currentFracDay) {
            const ageFrac = currentFracDay - ev.smoothedGlobalTime;
            const opacity = Math.max(0.1, 1.0 - (ageFrac / fadeFracDays));
            cellsToHighlight.push(`${ev.cellId}:${opacity.toFixed(2)}`);
          }
        }

        expanded.push({
          ...currFrame,
          originalHistoryIdx: i,
          currentDate: subScaledDate,
          redLosses: Math.round((prevFrame.redLosses || 0) + ((currFrame.redLosses || 0) - (prevFrame.redLosses || 0)) * alpha),
          blueLosses: Math.round((prevFrame.blueLosses || 0) + ((currFrame.blueLosses || 0) - (prevFrame.blueLosses || 0)) * alpha),
          redActiveTroops: Math.round((prevFrame.redActiveTroops || 0) + ((currFrame.redActiveTroops || 0) - (prevFrame.redActiveTroops || 0)) * alpha),
          blueActiveTroops: Math.round((prevFrame.blueActiveTroops || 0) + ((currFrame.blueActiveTroops || 0) - (prevFrame.blueActiveTroops || 0)) * alpha),
          cellOwners: cellOwnersRef,
          redUnits: interpolateUnits(prevFrame.redUnits, currFrame.redUnits, alpha),
          blueUnits: interpolateUnits(prevFrame.blueUnits, currFrame.blueUnits, alpha),
          lastTickCapturedCells: cellsToHighlight
        } as any);
      }
    }

    // Append tail clean frames so the video ends on a clean board state with zero residual trails
    if (expanded.length > 0) {
      const lastExp = expanded[expanded.length - 1];
      for (let pad = 0; pad < 45; pad++) {
        expanded.push({
          ...lastExp,
          lastTickCapturedCells: []
        });
      }
    }

    return expanded;
  };

  const handleExport = async () => {
    if (!mapInstance) {
      setErrorMsg('地图实例未就绪，请确保地图已加载。');
      return;
    }
    if (history.length === 0) {
      setErrorMsg('没有可导出的历史战局数据。');
      return;
    }

    setExporting(true);
    setProgress(0);
    setErrorMsg(null);
    setStatusText('正在准备视频渲染引擎...');
    abortExportRef.current = false;

    // Apply the first frame immediately so the map has layers to render while waiting for style
    applyReplayFrame(0);

    const originalMapStyle = useSimulationStore.getState().mapStyle || 'google';
    const originalReplayIndex = replayIndex;

    let frameDelayMs = 0;
    let encoder: any = null;
    let recorder: MediaRecorder | null = null;

    try {
      // 1. Set user selected map style
      setMapStyle(selectedMapStyle);

      // Wait for map style and layers to load
      await new Promise<void>((resolve) => {
        let retry = 0;
        const check = () => {
          if (mapInstance.isStyleLoaded()) {
            const layers = mapInstance.getStyle()?.layers || [];
            const hasRedLayer = layers.some((l: any) => l.id === 'red-fill');
            const hasBlueLayer = layers.some((l: any) => l.id === 'blue-fill');
            
            if ((hasRedLayer && hasBlueLayer) || retry > 20) {
              resolve();
            } else {
              retry++;
              setTimeout(check, 100);
            }
          } else if (retry > 40) {
            resolve();
          } else {
            retry++;
            setTimeout(check, 100);
          }
        };
        check();
      });

      setStatusText('正在预留 2 秒加载时间，确保地图图层完整渲染...');
      await new Promise(r => setTimeout(r, 2000));
      setStatusText('准备开始导出...');

      let exportWidth, exportHeight;
      if (resolution === '1080p') {
        exportWidth = aspectRatio === 'portrait' ? 1080 : 1920;
        exportHeight = aspectRatio === 'portrait' ? 1920 : 1080;
      } else {
        exportWidth = aspectRatio === 'portrait' ? 720 : 1280;
        exportHeight = aspectRatio === 'portrait' ? 1280 : 720;
      }

      const previewCanvas = previewCanvasRef.current;
      if (!previewCanvas) throw new Error('无法初始化渲染Canvas');
      previewCanvas.width = exportWidth;
      previewCanvas.height = exportHeight;

      const ctx = previewCanvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) throw new Error('无法创建Canvas 2D上下文');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const scale = exportWidth / (aspectRatio === 'portrait' ? 1080 : 1920);
      const panelW = (aspectRatio === 'portrait' ? 320 : 280) * scale;
      const panelH = (aspectRatio === 'portrait' ? 130 : 120) * scale;
      const glassTextureCanvas = createLiquidGlassTexture(panelW, panelH, scale);

      const targetFPS = 30;
      const bitRate = resolution === '1080p' ? 12000000 : 8000000;
      
      const canUseVideoEncoder = typeof VideoEncoder !== 'undefined';
      let muxer: any = null;
      encoder = null;
      recorder = null;
      const chunks: Blob[] = [];

      if (canUseVideoEncoder) {
        muxer = new Muxer({
          target: new ArrayBufferTarget(),
          video: {
            codec: 'avc',
            width: exportWidth,
            height: exportHeight
          },
          fastStart: 'in-memory'
        });

        encoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (e) => {
            console.error('VideoEncoder Error:', e);
            // We don't throw here, allowing the loop to continue and potentially use MediaRecorder fallback
          }
        });

        try {
          encoder.configure({
            codec: 'avc1.64002a', 
            width: exportWidth,
            height: exportHeight,
            bitrate: bitRate,
            framerate: targetFPS,
            hardwareAcceleration: 'prefer-hardware'
          });
        } catch (err) {
          console.error('VideoEncoder configuration failed:', err);
          encoder = null; // Mark as failed
        }
      }

      // Always start MediaRecorder as a primary or fallback
      try {
        const stream = previewCanvas.captureStream(targetFPS);
        const mimeTypes = [
          'video/mp4;codecs=avc1',
          'video/webm;codecs=h264',
          'video/webm;codecs=vp9',
          'video/webm'
        ];
        const chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';
        recorder = new MediaRecorder(stream, {
          mimeType: chosenMime,
          videoBitsPerSecond: bitRate
        });
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.start(1000); // Capture in 1s chunks for better reliability
      } catch (err) {
        console.error('MediaRecorder start failed:', err);
      }

      const exportFrames = buildExpandedHistoryFrames(history, durationSec);
      const totalTargetFrames = Math.max(30, Math.round(durationSec * targetFPS));
      const repeatsPerDay = Math.max(1, Math.round(totalTargetFrames / exportFrames.length));

      let currentFrameIndex = 0;
      chunks.length = 0; // Clear previous chunks if any

      for (let dayIdx = 0; dayIdx < exportFrames.length; dayIdx++) {
        if (abortExportRef.current) {
          throw new Error('USER_ABORTED');
        }
        const pct = Math.round(((dayIdx + 1) / exportFrames.length) * 100);
        setProgress(pct);

        const dayFrame = exportFrames[dayIdx];
        const totalDaysScaled = (history.length - 1) * timeMultiplier;
        const progressVal = exportFrames.length > 1 ? dayIdx / (exportFrames.length - 1) : 0;
        const smoothDay = Math.round(progressVal * totalDaysScaled) + 1;
        const currentDayText = `第 ${smoothDay} 天`;
        setStatusText(`正在渲染战局画面 (${pct}%) - ${currentDayText}`);

        // Get the exact original history index stored in buildExpandedHistoryFrames
        const originalHistoryIdx = (dayFrame as any).originalHistoryIdx !== undefined ? (dayFrame as any).originalHistoryIdx : dayIdx;

        // Apply frame with custom owners, captured cells, and interpolated units.
        applyReplayFrame(
          originalHistoryIdx,
          dayFrame.cellOwners,
          dayFrame.lastTickCapturedCells || [],
          (dayFrame as any).redUnits,
          (dayFrame as any).blueUnits
        );
        
        // 1. Yield to allow React to render and call the MapView's useEffect (which calls map.getSource().setData)
        await new Promise(r => setTimeout(r, 16));

        // 2. Wait for MapLibre to be fully updated, style loaded, and GeoJSON worker processing complete
        await new Promise<void>(resolve => {
          let resolved = false;
          let retry = 0;
          
          const onIdle = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };
          
          mapInstance.once('idle', onIdle);
          
          const check = () => {
            if (resolved) return;
            
            const isLoaded = 
              mapInstance.isStyleLoaded() &&
              (!mapInstance.getSource('red-territory') || mapInstance.isSourceLoaded('red-territory')) &&
              (!mapInstance.getSource('blue-territory') || mapInstance.isSourceLoaded('blue-territory')) &&
              (!mapInstance.getSource('red-captured-territory') || mapInstance.isSourceLoaded('red-captured-territory')) &&
              (!mapInstance.getSource('blue-captured-territory') || mapInstance.isSourceLoaded('blue-captured-territory')) &&
              (!mapInstance.getSource('frontline') || mapInstance.isSourceLoaded('frontline'));
            
            if (isLoaded) {
              resolved = true;
              mapInstance.off('idle', onIdle);
              resolve();
            } else if (retry > 150) { // Up to 2.4 seconds safety timeout
              resolved = true;
              mapInstance.off('idle', onIdle);
              resolve();
            } else {
              retry++;
              setTimeout(check, 16);
            }
          };
          
          mapInstance.triggerRepaint();
          check();
        });

        // Calculate single frame delay
        frameDelayMs = (durationSec * 1000) / totalTargetFrames;

        // Calculate repetitions per frame to ensure we perfectly match totalTargetFrames for precise timing and speed
        let currentRepeats = Math.max(1, Math.round(totalTargetFrames / exportFrames.length));

        const isLastDay = dayIdx === exportFrames.length - 1;
        
        if (isLastDay) {
          currentRepeats = Math.max(currentRepeats, Math.round(targetFPS * 2.5)); // Hold final clean screen for 2.5s
        }

        for (let rep = 0; rep < currentRepeats; rep++) {
          if (abortExportRef.current) {
            throw new Error('USER_ABORTED');
          }
          // Since rep=0 already waited for stable map rendering above, we only need to repaint and wait for subsequent frames (e.g. holding screen)
          if (rep > 0) {
            mapInstance.triggerRepaint();
            await new Promise<void>(r => {
              const t = setTimeout(() => r(), 16);
              mapInstance.once('render', () => { clearTimeout(t); r(); });
            });
          }
          
          // Force synchronous render to ensure WebGL buffer has the latest graphics drawn
          if (mapInstance && typeof (mapInstance as any)._render === 'function') {
            try {
              (mapInstance as any)._render();
            } catch (err) {
              console.warn('MapLibre _render failed:', err);
            }
          }
          
          const mapCanvas = mapInstance.getCanvas();
          
          if (mapCanvas && mapCanvas.width > 0 && mapCanvas.height > 0) {
            // 1. Clear with theme background first
            const mapBgColor = selectedMapStyle === 'google' ? '#050b14' : (selectedMapStyle === 'offline' ? '#bae6fd' : (selectedMapStyle === 'google_road' || selectedMapStyle === 'baidu' || selectedMapStyle === 'tencent' ? '#f7f7f7' : '#0f172a'));
            ctx.fillStyle = mapBgColor;
            ctx.fillRect(0, 0, exportWidth, exportHeight);

            // 2. High quality draw (filling the frame)
            const mapW = mapCanvas.width;
            const mapH = mapCanvas.height;
            const scale = Math.max(exportWidth / mapW, exportHeight / mapH);
            const drawW = mapW * scale;
            const drawH = mapH * scale;
            const drawX = (exportWidth - drawW) / 2;
            const drawY = (exportHeight - drawH) / 2;

            ctx.drawImage(mapCanvas, drawX, drawY, drawW, drawH);
          } else {
            // Fallback: fill with background if canvas is temporarily invalid
            const mapBgColor = selectedMapStyle === 'google' ? '#050b14' : (selectedMapStyle === 'offline' ? '#bae6fd' : (selectedMapStyle === 'google_road' || selectedMapStyle === 'baidu' || selectedMapStyle === 'tencent' ? '#f7f7f7' : '#0f172a'));
            ctx.fillStyle = mapBgColor;
            ctx.fillRect(0, 0, exportWidth, exportHeight);
          }

          // --- DRAW IN-GAME HUD OVERLAYS ---
          const redLosses = (dayFrame.redLosses || 0) + (dayFrame.redSurrendered || 0);
          const blueLosses = (dayFrame.blueLosses || 0) + (dayFrame.blueSurrendered || 0);

          const scale = exportWidth / (aspectRatio === 'portrait' ? 1080 : 1920);

          ctx.save();

          // 1. TOP-LEFT: Casualty & Loss Panel ("损失")
          const panelW = (aspectRatio === 'portrait' ? 320 : 280) * scale;
          const panelH = (aspectRatio === 'portrait' ? 130 : 120) * scale;
          const panelX = 36 * scale;
          const panelY = 36 * scale;

          if (glassTextureCanvas) {
            ctx.drawImage(glassTextureCanvas, panelX, panelY);
          } else {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(panelX, panelY, panelW, panelH, 12 * scale);
            else ctx.rect(panelX, panelY, panelW, panelH);
            ctx.fill();
            ctx.stroke();
          }

          // Title: "损失"
          ctx.fillStyle = '#94a3b8';
          ctx.font = `bold ${16 * scale}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText('损失', panelX + 18 * scale, panelY + 28 * scale);

          // Red Row: Block + Large Number
          const blockW = 14 * scale;
          const blockH = 14 * scale;
          const redRowY = panelY + 44 * scale;

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(panelX + 18 * scale, redRowY, blockW, blockH, 3 * scale);
          else ctx.rect(panelX + 18 * scale, redRowY, blockW, blockH);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${26 * scale}px monospace, sans-serif`;
          ctx.fillText(redLosses.toLocaleString(), panelX + 42 * scale, redRowY + 14 * scale);

          // Blue Row: Block + Large Number
          const blueRowY = panelY + 80 * scale;

          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(panelX + 18 * scale, blueRowY, blockW, blockH, 3 * scale);
          else ctx.rect(panelX + 18 * scale, blueRowY, blockW, blockH);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${26 * scale}px monospace, sans-serif`;
          ctx.fillText(blueLosses.toLocaleString(), panelX + 42 * scale, blueRowY + 14 * scale);

          // 2. TOP-RIGHT: Date & Display
          const dateBoxX = exportWidth - 40 * scale;
          const dateBoxY = 40 * scale;

          const startDateStr = history[0]?.currentDate || '2023-01-01';
          const totalDaysScaled = (history.length - 1) * timeMultiplier;
          const progressVal = exportFrames.length > 1 ? dayIdx / (exportFrames.length - 1) : 0;
          const formattedDate = getScaledDateTimeString(startDateStr, totalDaysScaled, progressVal);

          // Split into date part and time part (几点几分) to display on separate lines
          const dateParts = formattedDate.split(' ');
          const datePart = dateParts[0] || formattedDate;
          const timePart = dateParts[1] || '';

          ctx.textAlign = 'right';
          // Line 1: Date (YYYY/MM/DD)
          ctx.font = `bold ${30 * scale}px monospace, sans-serif`;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 5 * scale;
          ctx.strokeText(datePart, dateBoxX, dateBoxY + 32 * scale);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(datePart, dateBoxX, dateBoxY + 32 * scale);

          let currentY = dateBoxY + 32 * scale;

          // Line 2: Specific Time (几点几分 - HH:mm) on a NEW LINE
          if (timePart) {
            currentY += 42 * scale;
            ctx.font = `bold ${38 * scale}px monospace, sans-serif`;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 6 * scale;
            ctx.strokeText(timePart, dateBoxX, currentY);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(timePart, dateBoxX, currentY);
          }

          // Line 3: Day counter / milestone status
          currentY += 38 * scale;
          const scaledDayIndex = Math.round(progressVal * totalDaysScaled);
          const scaledDay = scaledDayIndex + 1;
          let dayText = `第 ${scaledDay} 天`;
          const eventTxt = dayFrame.dailyEventText || '';
          if (eventTxt.startsWith('【终局时刻】')) dayText = '终局时刻';
          else if (eventTxt.startsWith('【战后管制】')) dayText = '战后管制';
          else if (eventTxt.startsWith('【战线停火】')) dayText = '战线停火';
          else if (eventTxt.startsWith('【平定融入】')) dayText = '平定融入';
          else if (eventTxt.startsWith('【领土确认】')) dayText = '领土确认';
          else if (eventTxt.startsWith('【停战协议】')) dayText = '停战协议';

          ctx.font = `bold ${24 * scale}px sans-serif`;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4 * scale;
          ctx.strokeText(dayText, dateBoxX, currentY);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(dayText, dateBoxX, currentY);

          /* 
          // 3. BOTTOM CENTER: Event text banner - REMOVED AS REQUESTED
          if (dayFrame.dailyEventText) {
            ...
          }
          */

          ctx.restore();

          // Encode Frame safely preventing memory leak and black screen
          if (canUseVideoEncoder && encoder && encoder.state === 'configured') {
            try {
              const timestamp = (currentFrameIndex * 1000000) / targetFPS;
              const frame = new VideoFrame(previewCanvas, { timestamp });
              try {
                encoder.encode(frame, { keyFrame: currentFrameIndex % (targetFPS * 2) === 0 });
              } finally {
                frame.close();
              }
              currentFrameIndex++;
              
              // Backpressure: Wait if encoder queue is too large to prevent out-of-memory GPU crash
              while (encoder.encodeQueueSize > 4) {
                await new Promise(r => setTimeout(r, 10));
              }
            } catch (e) {
              console.error('Encoding error:', e);
            }
          } else {
            // Fallback: Just wait for MediaRecorder to capture or skip if encoder failed
            await new Promise(r => setTimeout(r, 1000 / targetFPS));
            currentFrameIndex++;
          }
        }
      }

      let videoBlob: Blob | null = null;
      let usedMp4 = false;

      if (canUseVideoEncoder && encoder && muxer && encoder.state !== 'closed' && currentFrameIndex > 0) {
        setStatusText('正在封装 MP4 格式...');
        try {
          if (encoder.state === 'configured') {
            await encoder.flush();
          }
          muxer.finalize();
          const { buffer } = muxer.target;
          if (buffer && buffer.byteLength > 1000) { // Check for minimum valid size
            videoBlob = new Blob([buffer], { type: 'video/mp4' });
            usedMp4 = true;
          }
        } catch (e: any) {
          console.error('MP4 Muxing/Finalization failed, falling back to WebM:', e);
        }
      }

      if (!usedMp4 && recorder) {
        setStatusText('正在生成视频文件...');
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        
        videoBlob = await new Promise<Blob>((resolve) => {
          const onStop = async () => {
            const rawBlob = new Blob(chunks, { type: recorder!.mimeType });
            if (rawBlob.size > 0 && recorder!.mimeType.includes('webm')) {
              const totalDurationMs = (currentFrameIndex / targetFPS) * 1000;
              const fixedBlob = await new Promise<Blob>(r => {
                ysFixWebmDuration(rawBlob, totalDurationMs, r);
              });
              resolve(fixedBlob);
            } else {
              resolve(rawBlob);
            }
          };
          if (recorder!.state === 'inactive') onStop();
          else recorder!.onstop = onStop;
        });
      }

      if (!videoBlob || videoBlob.size === 0) {
        throw new Error('视频文件数据生成为空，请重试');
      }

      const isMp4 = videoBlob.type.includes('mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      const extUpper = ext.toUpperCase();
      const url = URL.createObjectURL(videoBlob);
      const generatedFileName = `frontline-war-replay-${Date.now()}.${ext}`;
      
      setDownloadUrl(url);
      setFileName(generatedFileName);
      setExporting(false);
      
      setStatusText(`✅ 导出成功！点击下方【下载视频】按钮即可保存视频文件到本地。`);

      // Attempt background save
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = generatedFileName;
      document.body.appendChild(a);
      
      setTimeout(() => {
        try {
          const link = document.body.querySelector(`a[download="${generatedFileName}"]`) as HTMLAnchorElement;
          if (link) {
            link.click();
          } else {
            a.click();
          }
        } catch (err) {
          console.error('Auto-save failed:', err);
        } finally {
          setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
          }, 1000);
        }
      }, 800);

      // Restore original state
      setMapStyle(originalMapStyle);
      if (originalReplayIndex !== null) applyReplayFrame(originalReplayIndex);
    } catch (err: any) {
      if (err?.message === 'USER_ABORTED' || abortExportRef.current) {
        if (recorder && recorder.state !== 'inactive') {
          try { recorder.stop(); } catch (_) {}
        }
        if (encoder && encoder.state !== 'closed') {
          try { encoder.close(); } catch (_) {}
        }
        setExporting(false);
        setProgress(0);
        setStatusText('导出视频已按需中断');
        if (typeof originalMapStyle !== 'undefined') setMapStyle(originalMapStyle);
        if (typeof originalReplayIndex !== 'undefined' && originalReplayIndex !== null) applyReplayFrame(originalReplayIndex);
        return;
      }
      console.error(err);
      setErrorMsg(`导出失败: ${err.message || '未知错误'}`);
      setExporting(false);
      // @ts-ignore
      if (typeof originalMapStyle !== 'undefined') setMapStyle(originalMapStyle);
      // @ts-ignore
      if (typeof originalReplayIndex !== 'undefined' && originalReplayIndex !== null) applyReplayFrame(originalReplayIndex);
    }
  };

  return (
    <div className={clsx(
      "fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden transition-all duration-300",
      exporting ? "bg-black/10" : "bg-black/40 backdrop-blur-md animate-in fade-in"
    )}>
      <div className="w-full max-w-xl glass-card shadow-2xl p-6 text-white my-auto border border-white/10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-5 border-b border-white/5 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <Video size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">视频导出引擎</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-bold mt-0.5">高品质战局重现系统</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="p-2 text-white/20 hover:text-white rounded-xl hover:bg-white/5 transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-[11px] font-bold animate-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Live Export Preview Canvas (renders dynamically during export) */}
        <div className={`mb-6 overflow-hidden rounded-2xl border border-white/5 bg-black/40 transition-all ${exporting ? 'block' : 'hidden'}`}>
          <canvas 
            ref={previewCanvasRef} 
            className="w-full h-auto max-h-[240px] object-contain block mx-auto" 
          />
        </div>

        <div className="space-y-6">
          {/* Base Map Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">地图样式</label>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {[
                { id: 'offline', label: '离线地图', sub: '天蓝海岸线' },
                { id: 'osm', label: 'CARTO 矢量', sub: '精简地形数据' },
                { id: 'google_road', label: '谷歌路网', sub: '交通路网图层' },
                { id: 'google', label: '必应卫星', sub: '高清卫星图像' },
                { id: 'baidu', label: '高德地图', sub: '高德标准地图' },
                { id: 'tencent', label: '腾讯地图', sub: '腾讯矢量图层' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedMapStyle(opt.id as any)}
                  disabled={exporting}
                  className={clsx(
                    "flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95",
                    selectedMapStyle === opt.id
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-500/5 font-black"
                      : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/5 font-bold"
                  )}
                >
                  <span className="text-[11px]">{opt.label}</span>
                  <span className="text-[8px] opacity-60 mt-0.5">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">预期时长</label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {[5, 8, 12, 15, 20, 25, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDurationSec(sec)}
                  disabled={exporting}
                  className={clsx(
                    "py-2.5 rounded-xl border text-xs font-black transition-all active:scale-90 tabular-nums",
                    durationSec === sec
                      ? "bg-indigo-500 border-indigo-400 text-white shadow-lg"
                      : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/5"
                  )}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Resolution & Aspect Ratio */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">画面构图</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'portrait', label: '竖屏', sub: '9:16' },
                  { id: 'landscape', label: '横屏', sub: '16:9' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAspectRatio(opt.id as any)}
                    disabled={exporting}
                    className={clsx(
                      "flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all active:scale-95",
                      aspectRatio === opt.id 
                        ? "bg-white text-black font-black border-white" 
                        : "bg-white/[0.03] border-white/5 text-white/40"
                    )}
                  >
                    <span className="text-[10px]">{opt.label}</span>
                    <span className="text-[8px] opacity-60 font-medium">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">插帧平滑</label>
              <select 
                value={manualSubSteps} 
                onChange={(e) => setManualSubSteps(e.target.value as any)}
                disabled={exporting}
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl p-3 text-[11px] font-black outline-none focus:border-indigo-500/40 text-white/80 appearance-none cursor-pointer"
              >
                <option value="default">智能全动态插帧 (30FPS)</option>
                <option value="30">高密度插帧 (30帧/日)</option>
                <option value="15">中等插帧 (15帧/日)</option>
                <option value="10">标准插帧 (10帧/日)</option>
                <option value="5">低密度插帧 (5帧/日)</option>
                <option value="1">原始推演帧 (按天渲染)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">导出质量</label>
            <select 
              value={resolution} 
              onChange={(e) => setResolution(e.target.value as any)}
              disabled={exporting}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl p-3 text-[11px] font-black outline-none focus:border-indigo-500/40 text-white/80 appearance-none cursor-pointer"
            >
              <option value="1080p">Ultra HD 1080P (12Mbps)</option>
              <option value="720p">Standard HD 720P (8Mbps)</option>
            </select>
          </div>

          {exporting && (
            <div className="mt-4 p-5 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-3 text-[11px] font-bold text-white/80 min-w-0 truncate">
                  <Loader2 size={16} className="animate-spin text-indigo-400 shrink-0" />
                  <span className="truncate">{statusText}</span>
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-black text-indigo-400 tabular-nums">{progress}%</span>
                  <button
                    type="button"
                    onClick={() => {
                      abortExportRef.current = true;
                      setStatusText('正在中断导出...');
                    }}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-xl text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <XCircle size={14} />
                    <span>中断导出</span>
                  </button>
                </div>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden p-px">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <div className="text-[9px] text-white/30 mt-2 bg-black/20 p-3 rounded-xl border border-white/5 leading-relaxed italic">
                💡 为了保证完美播放与兼容性，系统会自动尝试封装 MP4(H.264) 格式。您可以直接保存、下载并在本地媒体播放器中正常播放。
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-white/5">
          <button
            type="button"
            onClick={() => {
              if (downloadUrl) {
                URL.revokeObjectURL(downloadUrl);
                setDownloadUrl(null);
              }
              onClose();
            }}
            disabled={exporting}
            className="px-5 py-3 rounded-xl text-xs font-black text-white/40 hover:text-white transition-all uppercase tracking-widest active:scale-95"
          >
            {downloadUrl ? '完成退出' : '放弃配置'}
          </button>
          
          {exporting ? (
            <button
              type="button"
              onClick={() => {
                abortExportRef.current = true;
                setStatusText('正在中断导出...');
              }}
              className="flex items-center gap-2 px-8 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-2xl text-[11px] font-black transition-all shadow-xl active:scale-95 uppercase tracking-widest cursor-pointer"
            >
              <XCircle size={16} />
              <span>中断导出</span>
            </button>
          ) : downloadUrl ? (
            <button
              type="button"
              onClick={() => {
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setStatusText('✅ 视频已成功触发下载！请在浏览器的下载栏中查看和保存。');
              }}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl text-[11px] font-black transition-all shadow-xl active:scale-95 uppercase tracking-widest cursor-pointer"
            >
              <Download size={16} />
              <span>立即下载视频</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-gray-100 disabled:opacity-20 text-black rounded-2xl text-[11px] font-black transition-all shadow-xl active:scale-95 uppercase tracking-widest"
            >
              {exporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>渲染处理中...</span>
                </>
              ) : (
                <>
                  <Video size={16} className="fill-current" />
                  <span>启动渲染引擎</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
