import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSimulationStore } from '../store/simulationStore';
import { Play, Pause, ChevronDown, ChevronUp, SkipForward, Settings, Download, Share2, Upload, RotateCcw, Save, Square, Eye, EyeOff, Maximize, Minimize } from 'lucide-react';
import clsx from 'clsx';

export default function SimulationControls() {
  const [collapsed, setCollapsed] = useState(false);
  const [endWarMenuOpen, setEndWarMenuOpen] = useState(false);

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

  const { status, speed, setSpeed, play, pause, runTick, endWarWithResult, reset, showUnits, toggleShowUnits, timeMultiplier, mapStyle, setMapStyle } = useSimulationStore();
  
  return (
    <>
      <div className="glass-dark rounded-2xl flex items-center p-1.5 gap-1 max-w-[calc(100vw-1rem)] overflow-x-auto overflow-y-visible shadow-xl z-30 transition-all border border-white/10 no-scrollbar touch-pan-x whitespace-nowrap shrink-0 pointer-events-auto">
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-white transition-transform active:scale-90 shrink-0 cursor-pointer" 
          title={collapsed ? "展开面板" : "收起面板"}
        >
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {collapsed ? (
          <div className="flex items-center gap-1 animate-in fade-in duration-150">
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            {status === 'running' ? (
              <button onClick={pause} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white cursor-pointer" title="暂停模拟">
                <Pause size={15} />
              </button>
            ) : (
              <button onClick={play} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white bg-indigo-500/20 cursor-pointer" title="开始/继续模拟">
                <Play size={15} className="ml-0.5" />
              </button>
            )}

            <button onClick={runTick} disabled={status === 'running'} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white disabled:opacity-20 cursor-pointer" title="推进一天">
              <SkipForward size={15} />
            </button>

            <span className="text-[10px] font-black text-white/50 px-1.5 font-mono">{speed}×</span>

            <div className="w-px h-5 bg-white/10 mx-0.5" />

            <button
              onClick={toggleFullscreen}
              className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white cursor-pointer"
              title={isFullscreen ? "退出全屏" : "全屏显示"}
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 animate-in slide-in-from-left-2 duration-200 shrink-0">
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            
            {status === 'running' ? (
              <button onClick={pause} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white cursor-pointer">
                <Pause size={15} />
              </button>
            ) : (
              <button onClick={play} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white bg-indigo-500/20 cursor-pointer">
                <Play size={15} className="ml-0.5" />
              </button>
            )}

            <button onClick={runTick} disabled={status === 'running'} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white disabled:opacity-20 cursor-pointer">
              <SkipForward size={15} />
            </button>

            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  pause();
                  setEndWarMenuOpen(!endWarMenuOpen);
                }} 
                className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-red-400 hover:text-white hover:bg-red-500/30 transition-all cursor-pointer"
                title="矢量停战"
              >
                <Square size={13} fill="currentColor" />
              </button>

              {endWarMenuOpen && createPortal(
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-200 pointer-events-auto">
                  <div 
                    className="absolute inset-0" 
                    onClick={() => setEndWarMenuOpen(false)}
                  />
                  <div className="relative glass-card p-4 shadow-2xl flex flex-col gap-2.5 w-72 max-w-full animate-in zoom-in-95 duration-150 rounded-2xl">
                    <div className="text-[10px] font-black text-white/40 px-2 py-1 uppercase tracking-[0.2em] border-b border-white/5 mb-1 flex justify-between items-center">
                      <span>结束战争 / 选择停战结局</span>
                      <button onClick={() => setEndWarMenuOpen(false)} className="hover:text-white p-1 cursor-pointer">✕</button>
                    </div>
                    
                    {[
                      { id: 'red_win', label: '红方全面胜利', emoji: '🚩', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-300' },
                      { id: 'blue_win', label: '蓝方全面胜利', emoji: '🚩', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-300' },
                      { id: 'restore', label: '恢复原状 (战前边界)', emoji: '🔄', bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/80' },
                      { id: 'maintain', label: '维持现状 (当前战线)', emoji: '⏸️', bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/80' },
                      { id: 'treaty', label: '签订和平条约 (整理边界)', emoji: '📜', bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-300' },
                    ].map(opt => (
                      <button 
                        key={opt.id}
                        onClick={() => {
                          endWarWithResult(opt.id as any);
                          setEndWarMenuOpen(false);
                        }}
                        className={clsx(
                          "text-left px-3 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 border cursor-pointer",
                          opt.bg, opt.border, opt.text, "hover:brightness-125"
                        )}
                      >
                        {opt.emoji} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>,
                document.body
              )}
            </div>

            <div className="w-px h-5 bg-white/10 mx-0.5" />

            <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5">
              {[1, 2, 4, 8].map(s => (
                <button 
                  key={s} 
                  onClick={() => setSpeed(s)}
                  className={clsx(
                    "w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-black transition-all cursor-pointer",
                    speed === s ? "bg-white text-black shadow-md" : "hover:bg-white/10 text-white/60"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-white/10 mx-0.5" />

            <button
              onClick={toggleFullscreen}
              className="px-2.5 py-1 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title={isFullscreen ? "退出全屏" : "全屏显示"}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
              <span>{isFullscreen ? "还原" : "全屏"}</span>
            </button>

            <div className="w-px h-5 bg-white/10 mx-0.5" />

            <button onClick={() => reset()} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white cursor-pointer" title="重置">
              <RotateCcw size={15} />
            </button>

            <div className="w-px h-5 bg-white/10 mx-0.5" />

            <div className="flex items-center bg-black/30 p-0.5 rounded-xl border border-white/5 gap-1 shrink-0">
              <button
                onClick={() => setMapStyle('offline')}
                className={clsx(
                  "px-2 py-1 text-[10px] font-bold rounded-lg transition-all tracking-wider cursor-pointer whitespace-nowrap",
                  mapStyle === 'offline' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
                )}
              >
                离线地图
              </button>
              <button
                onClick={() => setMapStyle('osm')}
                className={clsx(
                  "px-2 py-1 text-[10px] font-bold rounded-lg transition-all tracking-wider cursor-pointer",
                  mapStyle === 'osm' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
                )}
              >
                CARTO
              </button>
              <button
                onClick={() => setMapStyle('google_road')}
                className={clsx(
                  "px-2 py-1 text-[10px] font-bold rounded-lg transition-all tracking-wider cursor-pointer",
                  mapStyle === 'google_road' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
                )}
              >
                谷歌路网
              </button>
              <button
                onClick={() => setMapStyle('google')}
                className={clsx(
                  "px-2 py-1 text-[10px] font-bold rounded-lg transition-all tracking-wider cursor-pointer",
                  mapStyle === 'google' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
                )}
              >
                必应卫星
              </button>
              <button
                onClick={() => setMapStyle('baidu')}
                className={clsx(
                  "px-2 py-1 text-[10px] font-bold rounded-lg transition-all tracking-wider cursor-pointer",
                  mapStyle === 'baidu' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
                )}
              >
                高德地图
              </button>
              <button
                onClick={() => setMapStyle('tencent')}
                className={clsx(
                  "px-2 py-1 text-[10px] font-bold rounded-lg transition-all tracking-wider cursor-pointer",
                  mapStyle === 'tencent' ? "bg-white text-black shadow-md" : "text-white/40 hover:text-white"
                )}
              >
                腾讯地图
              </button>
            </div>

            <div className="w-px h-5 bg-white/10 mx-0.5" />

            <button onClick={() => {
              try {
                localStorage.setItem('simulation_autosave', useSimulationStore.getState().exportState());
                alert('进度已手动保存到浏览器。');
              } catch (e) {}
            }} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white cursor-pointer" title="保存">
              <Save size={15} />
            </button>

            <button onClick={async () => {
              const data = useSimulationStore.getState().exportState();
              const filename = `simulation_save_${new Date().getTime()}.json`;
              const blob = new Blob([data], {type: 'application/json'});
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              alert('已完成战局数据导出下载！');
            }} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white cursor-pointer" title="下载/导出战局数据">
              <Download size={15} />
            </button>

            <button onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = (e: any) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (re) => {
                    try {
                      const state = JSON.parse(re.target?.result as string);
                      useSimulationStore.getState().loadState(state);
                    } catch (err) {
                      alert('导入失败: 无法解析 JSON。');
                    }
                  };
                  reader.readAsText(file);
                }
              };
              input.click();
            }} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white cursor-pointer" title="导入">
              <Upload size={15} />
            </button>

            <button onClick={() => useSimulationStore.setState({ status: 'setup' })} className="glass-button w-8 h-8 flex items-center justify-center rounded-xl text-white cursor-pointer" title="设置">
              <Settings size={15} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
