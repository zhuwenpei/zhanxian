import React, { useEffect, useState, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Home, FileText, Video, Compass, ChevronDown, ChevronUp, Eye, EyeOff, Clock, Maximize, Minimize } from 'lucide-react';
import clsx from 'clsx';
import VideoExportModal from './VideoExportModal';
import ThreeDSituationMapModal from './ThreeDSituationMapModal';
import TimeRecalibrationModal from './TimeRecalibrationModal';

interface ReplayControlsProps {
  onViewReport: () => void;
}

export default function ReplayControls({ onViewReport }: ReplayControlsProps) {
  const history = useSimulationStore(s => s.history || []);
  const replayIndex = useSimulationStore(s => s.replayIndex);
  const applyReplayFrame = useSimulationStore(s => s.applyReplayFrame);
  const currentDate = useSimulationStore(s => s.currentDate);
  const timeMultiplier = useSimulationStore(s => s.timeMultiplier || 1);
  const reset = () => useSimulationStore.setState({ status: 'setup' });
  const showUnits = useSimulationStore(s => s.showUnits);
  const toggleShowUnits = useSimulationStore(s => s.toggleShowUnits);
  const mapInstance = useSimulationStore(s => s.mapInstance);
  const mapStyle = useSimulationStore(s => s.mapStyle || 'osm');
  const setMapStyle = useSimulationStore(s => s.setMapStyle);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSituationMapOpen, setIsSituationMapOpen] = useState(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);

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

  const currentIndex = replayIndex !== null ? replayIndex : history.length - 1;

  const playIntervalRef = useRef<any>(null);
  const currentIndexRef = useRef(currentIndex);
  const historyRef = useRef(history);
  const applyFrameRef = useRef(applyReplayFrame);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    applyFrameRef.current = applyReplayFrame;
  }, [applyReplayFrame]);

  // When reaching the end, stop playback
  useEffect(() => {
    if (isPlaying && currentIndex >= history.length - 1) {
      setIsPlaying(false);
    }
  }, [currentIndex, history.length, isPlaying]);

  // Stable timer loop for day-by-day replay
  useEffect(() => {
    if (!isPlaying) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }

    const intervalTime = Math.max(50, Math.round(400 / playbackSpeed));
    playIntervalRef.current = setInterval(() => {
      const next = currentIndexRef.current + 1;
      if (next < historyRef.current.length) {
        currentIndexRef.current = next;
        applyFrameRef.current(next);
      } else {
        setIsPlaying(false);
      }
    }, intervalTime);

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed]);

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    const val = parseInt(e.target.value);
    applyReplayFrame(val);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    if (currentIndex > 0) {
      applyReplayFrame(currentIndex - 1);
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    if (currentIndex < history.length - 1) {
      applyReplayFrame(currentIndex + 1);
    }
  };

  const handleTogglePlay = () => {
    if (currentIndex >= history.length - 1) {
      applyReplayFrame(0);
    }
    setIsPlaying(prev => !prev);
  };

  const handleSetPlaybackSpeed = (s: number) => {
    setPlaybackSpeed(s);
  };

  if (history.length === 0) return null;

  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] glass-dark border border-white/10 p-1.5 rounded-2xl shadow-xl animate-in slide-in-from-bottom-2 duration-200 pointer-events-auto flex items-center gap-1.5 max-w-[95vw] overflow-x-auto no-scrollbar touch-pan-x">
        <button 
          onClick={() => setIsCollapsed(false)}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-white transition-all active:scale-90 shrink-0"
          title="展开控制面板"
        >
          <ChevronUp size={16} />
        </button>

        <div className="w-px h-5 bg-white/10 mx-0.5" />

        <button 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-white hover:bg-white/10 disabled:opacity-20 transition-all active:scale-90"
          title="前一天"
        >
          <ChevronLeft size={16} />
        </button>

        <button 
          onClick={handleTogglePlay}
          className="w-8 h-8 bg-white text-black hover:bg-indigo-100 rounded-xl shadow-md transition-all active:scale-90 flex items-center justify-center shrink-0 font-bold"
          title={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} className="ml-0.5" fill="currentColor" />}
        </button>

        <button 
          onClick={handleNext}
          disabled={currentIndex === history.length - 1}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-white hover:bg-white/10 disabled:opacity-20 transition-all active:scale-90"
          title="后一天"
        >
          <ChevronRight size={16} />
        </button>

        <div className="w-px h-5 bg-white/10 mx-0.5" />

        <span className="text-[10px] font-black font-mono text-amber-300 px-1 truncate max-w-[100px]">
          {currentDate}
        </span>

        <button 
          onClick={onViewReport}
          className="p-1.5 glass-button text-white/80 hover:text-white rounded-xl text-xs flex items-center gap-1"
          title="查看战报报告"
        >
          <FileText size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-2xl glass-dark border border-white/10 p-3.5 sm:p-4 rounded-2xl shadow-2xl flex flex-col gap-3 sm:gap-4 animate-in slide-in-from-bottom-3 duration-200 pointer-events-auto max-h-[90vh] overflow-y-auto no-scrollbar">
      {/* Top Header Row with Title and Pinned Collapse Button */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0">
                战局时间线回放
              </span>
              <span className="text-[10px] text-white/40 font-black uppercase tracking-wider font-mono truncate">
                Step {currentIndex + 1} / {history.length}
                {timeMultiplier > 1 && (
                  <span className="ml-1.5 text-indigo-400">· {timeMultiplier}X Interpolation</span>
                )}
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5 truncate">
              {currentDate}
            </div>
          </div>

          <button 
            onClick={() => setIsCollapsed(true)}
            className="p-2 glass-button text-white/60 hover:text-white rounded-xl transition-all active:scale-90 shrink-0 border border-white/10"
            title="收起面板"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Map Styles and Map View Utilities bar (scrollable on narrow viewports) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 max-w-full">
          <div className="flex items-center glass-card p-0.5 rounded-lg border border-white/5 gap-0.5 shrink-0">
            <button
              onClick={() => setMapStyle('offline')}
              className={clsx(
                "px-2.5 py-1 text-[10px] font-black rounded-md transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap",
                mapStyle === 'offline' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
              )}
            >
              离线地图
            </button>
            <button
              onClick={() => setMapStyle('osm')}
              className={clsx(
                "px-2.5 py-1 text-[10px] font-black rounded-md transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap",
                mapStyle === 'osm' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
              )}
            >
              CARTO
            </button>
            <button
              onClick={() => setMapStyle('google_road')}
              className={clsx(
                "px-2.5 py-1 text-[10px] font-black rounded-md transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap",
                mapStyle === 'google_road' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
              )}
            >
              谷歌路网
            </button>
            <button
              onClick={() => setMapStyle('google')}
              className={clsx(
                "px-2.5 py-1 text-[10px] font-black rounded-md transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap",
                mapStyle === 'google' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
              )}
            >
              必应卫星
            </button>
            <button
              onClick={() => setMapStyle('baidu')}
              className={clsx(
                "px-2.5 py-1 text-[10px] font-black rounded-md transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap",
                mapStyle === 'baidu' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
              )}
            >
              高德地图
            </button>
            <button
              onClick={() => setMapStyle('tencent')}
              className={clsx(
                "px-2.5 py-1 text-[10px] font-black rounded-md transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap",
                mapStyle === 'tencent' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
              )}
            >
              腾讯地图
            </button>
          </div>



          <button 
            onClick={toggleFullscreen}
            className="p-2 glass-button text-white border-white/10 rounded-lg transition-all active:scale-90 cursor-pointer shrink-0"
            title={isFullscreen ? "退出全屏" : "全屏显示"}
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </div>

      {/* Scrub Slider */}
      <div className="px-1">
        <input 
          type="range"
          min="0"
          max={history.length - 1}
          value={currentIndex}
          onChange={handleScrub}
          className="w-full accent-amber-400 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer hover:bg-white/20 transition-all"
        />
      </div>

      {/* Control Buttons Grid */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => reset()}
            className="p-2 glass-button text-white/60 hover:text-white rounded-xl border border-white/5 transition-all active:scale-90"
            title="返回主菜单"
          >
            <Home size={15} />
          </button>
          
          <button 
            onClick={onViewReport}
            className="flex items-center gap-1.5 px-3 py-2 glass-button text-white border border-white/10 rounded-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider"
          >
            <FileText size={14} />
            <span>报告详情</span>
          </button>

          <div className="w-px h-6 bg-white/10 mx-0.5" />

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-black rounded-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider shadow-md shadow-indigo-500/20"
          >
            <Video size={14} />
            <span>导出视频</span>
          </button>

          <button
            onClick={() => setIsSituationMapOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-wider shadow-md shadow-amber-500/20"
          >
            <Compass size={14} />
            <span>3D 时局图</span>
          </button>

          <button
            onClick={() => setIsTimeModalOpen(true)}
            className={clsx(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-wider active:scale-95 border",
              timeMultiplier > 1
                ? "bg-purple-500 text-black border-purple-400"
                : "glass-button text-white/60 border-white/5"
            )}
          >
            <Clock size={14} />
            <span>重修时间</span>
            {timeMultiplier > 1 && (
              <span className="ml-0.5 bg-black/20 px-1.5 rounded-full font-mono text-[9px]">{timeMultiplier}X</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 glass-button text-white disabled:opacity-20 rounded-xl border border-white/5 transition-all active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>

            <button 
              onClick={handleTogglePlay}
              className="p-3 bg-white text-black hover:bg-indigo-100 rounded-full shadow-lg transition-all active:scale-90 flex items-center justify-center shrink-0"
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>

            <button 
              onClick={handleNext}
              disabled={currentIndex === history.length - 1}
              className="p-2 glass-button text-white disabled:opacity-20 rounded-xl border border-white/5 transition-all active:scale-90"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="w-px h-6 bg-white/10 mx-0.5" />

          <div className="flex items-center gap-1 p-0.5 glass-card rounded-xl border border-white/5">
            {[0.5, 1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => handleSetPlaybackSpeed(s)}
                className={clsx(
                  "w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black transition-all",
                  playbackSpeed === s 
                    ? 'bg-white text-black shadow-md scale-105' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                )}
              >
                {s}X
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => { setIsPlaying(false); applyReplayFrame(0); }}
            className="p-2 glass-button text-white/40 hover:text-white rounded-xl border border-white/5 transition-all active:scale-90"
            title="重置"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <VideoExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <ThreeDSituationMapModal
        isOpen={isSituationMapOpen}
        onClose={() => setIsSituationMapOpen(false)}
        replayIndex={currentIndex}
      />

      <TimeRecalibrationModal
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
      />
    </div>
  );
}
