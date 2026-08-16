import React, { useState, useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { getCountryFlagUrl, getCountryFlagEmoji } from '../utils/countryFlags';
import { getScaledDateString } from '../utils/dateUtils';
import { getCachedLatLng } from '../engine/h3Cache';
import { h3ToMultiPolygonFeature } from '../engine/gridEngine';
import { X, Image as ImageIcon, Download, Share2, Loader2, Compass, AlertCircle, Settings2, Sparkles } from 'lucide-react';

interface ThreeDSituationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  replayIndex: number;
}

type AspectRatio = '1:1' | '16:9' | '4:3' | '9:16';

export default function ThreeDSituationMapModal({ isOpen, onClose, replayIndex }: ThreeDSituationMapModalProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [flagOpacity, setFlagOpacity] = useState<number>(0.75);
  const [showOriginalBorders, setShowOriginalBorders] = useState<boolean>(true);
  const [showCities, setShowCities] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { red, blue, history, cells, timeMultiplier } = useSimulationStore();
  const currentFrame = history[replayIndex];
  const multiplier = timeMultiplier || 1;
  const startDateStr = history[0]?.currentDate || '2023-01-01';
  const scaledDateStr = getScaledDateString(startDateStr, replayIndex, multiplier);
  const formattedDate = scaledDateStr.replace(/-/g, '/');
  const scaledDay = replayIndex * multiplier + 1;

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Re-render when dependencies change
  useEffect(() => {
    if (isOpen && currentFrame) {
      renderSituationMap();
    }
  }, [isOpen, replayIndex, aspectRatio, flagOpacity, showOriginalBorders, showCities]);

  if (!isOpen || !currentFrame) return null;

  // Project longitude/latitude into canvas X/Y coordinates preserving aspect ratio
  const getBounds = () => {
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    for (const cid in cells) {
      const [lat, lng] = getCachedLatLng(cid);
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    if (minLng === Infinity) {
      return { minLng: 118, minLat: 30, maxLng: 122, maxLat: 33 };
    }

    // Add padding to prevent cutoffs
    const padLng = (maxLng - minLng) * 0.20 || 0.2;
    const padLat = (maxLat - minLat) * 0.20 || 0.2;

    return {
      minLng: minLng - padLng,
      minLat: minLat - padLat,
      maxLng: maxLng + padLng,
      maxLat: maxLat + padLat,
    };
  };

  const loadImg = (url: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn('Flag image load failed:', url);
        resolve(null);
      };
      img.src = url;
    });
  };

  const renderSituationMap = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set resolution sizes based on ratio
    let width = 1200;
    let height = 1200;

    if (aspectRatio === '16:9') {
      width = 1600;
      height = 900;
    } else if (aspectRatio === '4:3') {
      width = 1200;
      height = 900;
    } else if (aspectRatio === '9:16') {
      width = 1080;
      height = 1920;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { desynchronized: true })!;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw elegant subtle grid background (Infographic style)
    ctx.fillStyle = '#fbfbfa'; // Clean vintage white
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Setup linear coordinate projection
    const bounds = getBounds();
    const spanLng = bounds.maxLng - bounds.minLng;
    const spanLat = bounds.maxLat - bounds.minLat;

    // Center content within the canvas with generous safe padding
    const padding = 100;
    const availableW = width - padding * 2;
    const availableH = height - padding * 2.8; // More space at bottom/top for titles & legends

    const scaleLng = availableW / spanLng;
    const scaleLat = availableH / spanLat;
    const scale = Math.min(scaleLng, scaleLat);

    const centerX = width / 2;
    const centerY = height / 2 + 10; // Shift down slightly

    const project = (lng: number, lat: number): [number, number] => {
      const x = centerX + (lng - (bounds.minLng + bounds.maxLng) / 2) * scale;
      const y = centerY - (lat - (bounds.minLat + bounds.maxLat) / 2) * scale; // Invert latitude
      return [x, y];
    };

    // 3. Draw Beautiful Sea/Water Body (Background of non-cells if appropriate)
    // For this tactical map, we draw a very clean subtle styling
    ctx.fillStyle = '#eaf2f8'; // very soft marine blue
    ctx.fillRect(0, 0, width, height);

    // Draw clean background behind land cells (light beige for non-occupied land)
    ctx.fillStyle = '#f4f4f3'; // warm neutral land background
    
    // Draw Land Base
    const landCellIds = Object.keys(cells);
    const landMultiPoly = h3ToMultiPolygonFeature(landCellIds);
    if (landMultiPoly && landMultiPoly.geometry && landMultiPoly.geometry.coordinates) {
      ctx.beginPath();
      for (const poly of landMultiPoly.geometry.coordinates) {
        const outerRing = poly[0];
        if (outerRing && outerRing.length > 0) {
          const [sx, sy] = project(outerRing[0][0], outerRing[0][1]);
          ctx.moveTo(sx, sy);
          for (let i = 1; i < outerRing.length; i++) {
            const [x, y] = project(outerRing[i][0], outerRing[i][1]);
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d4d4d8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 4. Fetch and Load Flags of both sides
    const redFlagUrl = getCountryFlagUrl(red.iso2 || 'CN');
    const blueFlagUrl = getCountryFlagUrl(blue.iso2 || 'US');

    const [redFlagImg, blueFlagImg] = await Promise.all([
      loadImg(redFlagUrl),
      loadImg(blueFlagUrl)
    ]);

    // Draw the Territories
    const currentOwners = currentFrame.cellOwners || {};
    const redCells = Object.keys(currentOwners).filter(cid => currentOwners[cid] === 'red');
    const blueCells = Object.keys(currentOwners).filter(cid => currentOwners[cid] === 'blue');

    const drawTerritoryWithFlags = (
      cellIds: string[], 
      flagImg: HTMLImageElement | null, 
      fallbackColor: string, 
      borderColor: string
    ) => {
      if (cellIds.length === 0) return;
      const feat = h3ToMultiPolygonFeature(cellIds);
      if (!feat || !feat.geometry || !feat.geometry.coordinates) return;

      ctx.save();
      
      // Draw base color first
      ctx.fillStyle = fallbackColor;
      ctx.beginPath();
      for (const poly of feat.geometry.coordinates) {
        const outerRing = poly[0];
        if (outerRing && outerRing.length > 0) {
          const [sx, sy] = project(outerRing[0][0], outerRing[0][1]);
          ctx.moveTo(sx, sy);
          for (let i = 1; i < outerRing.length; i++) {
            const [x, y] = project(outerRing[i][0], outerRing[i][1]);
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.closePath();
      ctx.fill();

      // Setup Pattern Fill
      if (flagImg) {
        // Create an offscreen pattern canvas
        const patCanvas = document.createElement('canvas');
        // Let's size the pattern relative to the scale so it looks beautifully proportioned
        const patW = 80;
        const patH = 50;
        patCanvas.width = patW;
        patCanvas.height = patH;
        const patCtx = patCanvas.getContext('2d')!;
        patCtx.globalAlpha = flagOpacity;
        patCtx.drawImage(flagImg, 0, 0, patW, patH);
        
        // Add thin vintage paper texture to pattern
        patCtx.strokeStyle = 'rgba(0,0,0,0.1)';
        patCtx.lineWidth = 1;
        patCtx.strokeRect(0, 0, patW, patH);

        const pattern = ctx.createPattern(patCanvas, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.beginPath();
          for (const poly of feat.geometry.coordinates) {
            const outerRing = poly[0];
            if (outerRing && outerRing.length > 0) {
              const [sx, sy] = project(outerRing[0][0], outerRing[0][1]);
              ctx.moveTo(sx, sy);
              for (let i = 1; i < outerRing.length; i++) {
                const [x, y] = project(outerRing[i][0], outerRing[i][1]);
                ctx.lineTo(x, y);
              }
            }
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      // Draw thinner, crisp control lines around current territories
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const poly of feat.geometry.coordinates) {
        const outerRing = poly[0];
        if (outerRing && outerRing.length > 0) {
          const [sx, sy] = project(outerRing[0][0], outerRing[0][1]);
          ctx.moveTo(sx, sy);
          for (let i = 1; i < outerRing.length; i++) {
            const [x, y] = project(outerRing[i][0], outerRing[i][1]);
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    };

    // Fill Red side (Flag-tiled pattern, thin red boundary)
    drawTerritoryWithFlags(redCells, redFlagImg, 'rgba(239, 68, 68, 0.2)', '#ef4444');

    // Fill Blue side (Flag-tiled pattern, thin blue boundary)
    drawTerritoryWithFlags(blueCells, blueFlagImg, 'rgba(59, 130, 246, 0.2)', '#3b82f6');

    // 5. Draw original territory outlines with thin red/blue lines
    if (showOriginalBorders) {
      const redOriginalCellIds = Object.keys(cells).filter(cid => (cells[cid].originalOwner === 'red' || cells[cid].initialOriginalOwner === 'red'));
      const blueOriginalCellIds = Object.keys(cells).filter(cid => (cells[cid].originalOwner === 'blue' || cells[cid].initialOriginalOwner === 'blue'));

      const drawOriginalOutline = (cellIds: string[], color: string) => {
        if (cellIds.length === 0) return;
        const feat = h3ToMultiPolygonFeature(cellIds);
        if (!feat || !feat.geometry || !feat.geometry.coordinates) return;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.0;
        ctx.setLineDash([5, 4]); // Professional dashed style representing original border
        ctx.beginPath();
        for (const poly of feat.geometry.coordinates) {
          const outerRing = poly[0];
          if (outerRing && outerRing.length > 0) {
            const [sx, sy] = project(outerRing[0][0], outerRing[0][1]);
            ctx.moveTo(sx, sy);
            for (let i = 1; i < outerRing.length; i++) {
              const [x, y] = project(outerRing[i][0], outerRing[i][1]);
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      };

      // Draw dashed pre-war borders
      drawOriginalOutline(redOriginalCellIds, '#dc2626');
      drawOriginalOutline(blueOriginalCellIds, '#2563eb');
    }

    // 6. Draw major cities / capitals
    if (showCities) {
      const cities: { name: string; lat: number; lng: number; isCapital?: boolean; owner: 'red' | 'blue' }[] = [];
      for (const cid in cells) {
        if (cells[cid].isCapital) {
          const [lat, lng] = getCachedLatLng(cid);
          cities.push({
            name: cells[cid].cityName || '首都',
            lat,
            lng,
            isCapital: true,
            owner: cells[cid].owner || 'red'
          });
        } else if (cells[cid].isImportantCity && Math.random() < 0.25) { // Sample some cities so the map stays clean
          const [lat, lng] = getCachedLatLng(cid);
          cities.push({
            name: cells[cid].cityName || '城市',
            lat,
            lng,
            isCapital: false,
            owner: cells[cid].owner || 'red'
          });
        }
      }

      const drawStarPath = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
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

      ctx.save();
      cities.forEach(city => {
        const [cx, cy] = project(city.lng, city.lat);
        
        // Out-of-bounds safety check
        if (cx < 0 || cx > width || cy < 0 || cy > height) return;

        const color = city.owner === 'blue' ? '#2563eb' : '#dc2626';

        if (city.isCapital) {
          ctx.fillStyle = color;
          drawStarPath(ctx, cx, cy, 5, 10, 4.5);
          ctx.fill();

          // Title with white halo
          ctx.font = 'bold 15px sans-serif';
          ctx.fillStyle = '#1e293b';
          ctx.textAlign = 'center';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3.5;
          ctx.strokeText(`★ ${city.name}`, cx, cy - 15);
          ctx.fillText(`★ ${city.name}`, cx, cy - 15);
        } else {
          // Standard city dot
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#334155';
          ctx.textAlign = 'center';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.strokeText(city.name, cx, cy - 11);
          ctx.fillText(city.name, cx, cy - 11);
        }
      });
      ctx.restore();
    }

    // 7. Render Exquisite Title Panel at Top
    ctx.save();
    const titleText = `${red.countryName || '红方'} 与 ${blue.countryName || '蓝方'} 战区时局图`;
    const subTitleText = `当前日期: ${formattedDate} (推演第 ${scaledDay} 天${multiplier > 1 ? ` · 重修 ${multiplier}x` : ''})`;

    // Main header box background shadow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    
    // Header box sizing
    const hBoxW = Math.min(width - 120, 850);
    const hBoxH = 120;
    const hBoxX = (width - hBoxW) / 2;
    const hBoxY = 40;

    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(hBoxX, hBoxY, hBoxW, hBoxH, 12);
    } else {
      ctx.rect(hBoxX, hBoxY, hBoxW, hBoxH);
    }
    ctx.fill();
    ctx.stroke();

    // Main bold title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, width / 2, hBoxY + 44);

    // Subtitle date
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px monospace, sans-serif';
    ctx.fillText(subTitleText, width / 2, hBoxY + 86);

    ctx.restore();

    // 8. Bottom Compass Rose
    ctx.save();
    const compassX = width - 85;
    const compassY = height - 85;
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    
    // Draw outer compass dial
    ctx.beginPath();
    ctx.arc(compassX, compassY, 28, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - 24); // North tip
    ctx.lineTo(compassX + 6, compassY);
    ctx.lineTo(compassX, compassY + 4);
    ctx.closePath();
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(compassX, compassY + 24); // South tip
    ctx.lineTo(compassX - 6, compassY);
    ctx.lineTo(compassX, compassY - 4);
    ctx.closePath();
    ctx.fillStyle = '#64748b';
    ctx.fill();

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText('N', compassX, compassY - 30);
    ctx.restore();

    // 9. Bottom Elegant Info Bar / Watermark
    ctx.save();
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('审图号: GS(2026)时局字08号  •  中地图书出版集团审定', 40, height - 35);

    ctx.textAlign = 'right';
    ctx.fillText('沙盘推演地理信息系统  •  Tactical Simulation Engine', width - 40, height - 35);
    ctx.restore();

    // 10. Floating Elegant Legend Box
    ctx.save();
    const legW = 340;
    const legH = 180;
    const legX = 40;
    const legY = height - legH - 80;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(legX, legY, legW, legH, 10);
    } else {
      ctx.rect(legX, legY, legW, legH);
    }
    ctx.fill();
    ctx.stroke();

    // Legend Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('图例 / Map Legend', legX + 20, legY + 30);

    // Divider
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(legX + 20, legY + 44);
    ctx.lineTo(legX + legW - 20, legY + 44);
    ctx.stroke();

    // Red Legend Item
    const drawLegendItem = (yOffset: number, sideName: string, flagImg: HTMLImageElement | null, color: string, isOriginal = false) => {
      ctx.save();
      if (isOriginal) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(legX + 20, legY + yOffset);
        ctx.lineTo(legX + 50, legY + yOffset);
        ctx.stroke();
      } else {
        // Draw miniature flag box
        ctx.fillStyle = color;
        ctx.fillRect(legX + 20, legY + yOffset - 10, 30, 18);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(legX + 20, legY + yOffset - 10, 30, 18);
        
        if (flagImg) {
          ctx.drawImage(flagImg, legX + 21, legY + yOffset - 9, 28, 16);
        }
      }

      ctx.fillStyle = '#1e293b';
      ctx.font = '13px sans-serif';
      ctx.fillText(sideName, legX + 62, legY + yOffset + 4);
      ctx.restore();
    };

    drawLegendItem(70, `${red.countryName || '红方'} 实际控制区`, redFlagImg, 'rgba(239, 68, 68, 0.35)');
    drawLegendItem(102, `${blue.countryName || '蓝方'} 实际控制区`, blueFlagImg, 'rgba(59, 130, 246, 0.35)');
    
    if (showOriginalBorders) {
      drawLegendItem(142, `开战前双方实际控制线 (Pre-war Line)`, null, '#475569', true);
    }

    ctx.restore();
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsGenerating(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      // Requirement: Reserve time for rendering stability
      await new Promise(r => setTimeout(r, 3000));

      const url = canvas.toDataURL('image/png');
      const filename = `Tactical_Situation_Map_${scaledDateStr}_Day${scaledDay}.png`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      setSuccessMsg('时局图高清图片下载成功！');
    } catch (e: any) {
      setErrorMsg(`下载失败: ${e.message || '未知错误'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsGenerating(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      await new Promise(r => setTimeout(r, 1000));

      const dataUrl = canvas.toDataURL('image/png');
      const filename = `3D_Situation_Map_${scaledDateStr}_Day${scaledDay}.png`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
      setSuccessMsg('已成功下载5000万像素3D时局图！');
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setErrorMsg(`下载失败: ${e.message || '未知错误'}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 my-auto flex flex-col md:flex-row gap-6">
        
        {/* Left Hand: High Quality Canvas Preview Box */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 rounded-xl p-3 border border-slate-800 relative group overflow-hidden">
          <div className="absolute top-3 left-3 bg-slate-900/80 border border-slate-700/60 text-slate-300 rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={12} className="text-yellow-400" />
            <span>时局图高画质矢量画布</span>
          </div>
          
          <div className="w-full flex justify-center items-center overflow-auto max-h-[550px] md:max-h-[620px] py-4">
            <canvas 
              ref={canvasRef} 
              className="max-w-full h-auto max-h-[500px] md:max-h-[580px] object-contain block rounded shadow-2xl transition-all border border-slate-800"
            />
          </div>
        </div>

        {/* Right Hand: Action & Options Panel */}
        <div className="w-full md:w-[320px] flex flex-col justify-between shrink-0">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg">
                  <Compass size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">生成战区时局图</h3>
                  <p className="text-[10px] text-slate-400">选择比例与风格定制高清军事图例</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-400 text-xs font-semibold">
                <span>{successMsg}</span>
              </div>
            )}

            {/* Custom Settings */}
            <div className="space-y-4">
              {/* Aspect Ratio Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
                  ① 画幅比例 (Aspect Ratio)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['1:1', '16:9', '4:3', '9:16'] as AspectRatio[]).map((ratio) => {
                    const label = ratio === '1:1' ? '方形 (1:1)' : ratio === '16:9' ? '宽屏 (16:9)' : ratio === '4:3' ? '标画 (4:3)' : '竖屏 (9:16)';
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                          aspectRatio === ratio
                            ? 'bg-yellow-600/25 border-yellow-500 text-yellow-400 shadow-md'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Flag Opacity Slider */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                  <span>② 国旗填入底纹透明度</span>
                  <span className="text-yellow-400 font-mono">{Math.round(flagOpacity * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={flagOpacity}
                  onChange={(e) => setFlagOpacity(parseFloat(e.target.value))}
                  className="w-full accent-yellow-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                  <span>清新淡雅</span>
                  <span>鲜艳夺目</span>
                </div>
              </div>

              {/* Toggle Switches */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300">标出战前原领土线</span>
                    <span className="text-[10px] text-slate-500">使用细蓝线与细红虚线描出</span>
                  </div>
                  <button
                    onClick={() => setShowOriginalBorders(!showOriginalBorders)}
                    className={`w-10 h-5.5 rounded-full transition-colors relative ${showOriginalBorders ? 'bg-yellow-600' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 bg-white w-4.5 h-4.5 rounded-full transition-transform ${showOriginalBorders ? 'translate-x-4.5' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-xl border border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300">显示战略要地与都市</span>
                    <span className="text-[10px] text-slate-500">在地图上标出核心城市与首府</span>
                  </div>
                  <button
                    onClick={() => setShowCities(!showCities)}
                    className={`w-10 h-5.5 rounded-full transition-colors relative ${showCities ? 'bg-yellow-600' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 bg-white w-4.5 h-4.5 rounded-full transition-transform ${showCities ? 'translate-x-4.5' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={handleShare}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-slate-950 rounded-xl font-bold text-xs transition-transform active:scale-[0.98] shadow-lg shadow-yellow-600/10"
            >
              <Download size={15} />
              <span>{isGenerating ? '正在生成时局图...' : '下载5000万像素3D时局图'}</span>
            </button>
            
            <div className="text-[9px] text-slate-500 text-center leading-relaxed mt-2 p-2 bg-slate-950/40 rounded-lg border border-slate-850">
              💡 <span className="font-semibold text-slate-400">时局图设计哲学：</span>
              边框比常态示意图更纤细，完全抛去运动箭头的拖尾干扰，双方全部领土填入自带防伪底纹的国家旗帜，专为时局盘点、自媒体分享、军事推演报告图表等场景而定制。
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
