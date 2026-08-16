import React, { useState } from 'react';
import clsx from 'clsx';
import { useSimulationStore } from '../store/simulationStore';
import WarSchematicMap from './WarSchematicMap';
import TimelineSection from './TimelineSection';
import AnalyticsSection from './AnalyticsSection';
import { Map, Clock, BarChart3, ShieldAlert, RotateCcw, Play, Scissors, Trophy, Maximize, X } from 'lucide-react';

interface ResultDialogProps {
  onClose: () => void;
}

export default function ResultDialog({ onClose }: ResultDialogProps) {
  const { winner, resultReason, red, blue, tick, history } = useSimulationStore();
  const [activeTab, setActiveTab] = useState<'schematic' | 'timeline' | 'analytics' | 'details'>('schematic');

  const winnerName = winner === 'red' ? (red.countryName || '红方') : (blue.countryName || '蓝方');

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center p-2 sm:p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card border border-white/10 shadow-2xl w-[98vw] h-[98vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header & Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between p-4 border-b border-white/5 gap-3 shrink-0 bg-black/20 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>战役结算与全景报告</span>
              </h2>
              <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold flex items-center gap-3 mt-1">
                <span>胜者: <strong className={winner === 'red' ? 'text-red-400' : 'text-blue-400'}>{winnerName}</strong></span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>推演持续: <strong className="text-amber-300">{tick} 天</strong></span>
                <span className="hidden md:inline w-1 h-1 rounded-full bg-white/10" />
                <span className="hidden md:inline text-white/30 italic">{resultReason}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={toggleBrowserFullscreen}
              className="bg-white/5 hover:bg-white/10 text-white font-black py-2 px-4 rounded-xl active:scale-95 transition-all text-[11px] flex items-center gap-2 border border-white/5 uppercase tracking-widest"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span>全屏</span>
            </button>

            <button 
              onClick={() => {
                onClose();
                useSimulationStore.setState({ isCedeTerritoryMode: true });
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black py-2 px-4 rounded-xl active:scale-95 transition-all text-[11px] flex items-center gap-2 shadow-lg shadow-emerald-500/20 uppercase tracking-widest"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>领土割让</span>
            </button>

            <button 
              onClick={onClose}
              className="bg-amber-500 hover:bg-amber-400 text-black font-black py-2 px-4 rounded-xl active:scale-95 transition-all text-[11px] flex items-center gap-2 shadow-lg shadow-amber-500/20 uppercase tracking-widest"
            >
              <Play className="w-3.5 h-3.5" />
              <span>战地回放</span>
            </button>

            <button 
              onClick={() => useSimulationStore.setState({ status: 'setup' })}
              className="bg-white/5 hover:bg-white/10 text-white font-black py-2 px-4 rounded-xl active:scale-95 transition-all text-[11px] flex items-center gap-2 border border-white/5 uppercase tracking-widest"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重修战局</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-2 bg-black/20 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-hide">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full max-w-3xl mx-auto">
            {[
              { id: 'schematic', label: '战争示意图', icon: Map },
              { id: 'timeline', label: 'AI 战役时间线', icon: Clock },
              { id: 'analytics', label: '战损与战线', icon: BarChart3 },
              { id: 'details', label: '参战兵力明细', icon: ShieldAlert }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95",
                  activeTab === tab.id
                    ? 'bg-white text-black font-black shadow-xl'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            <div className={`flex-col gap-4 h-full flex-1 min-h-[500px] ${activeTab === 'schematic' ? 'flex' : 'hidden'}`}>
              <WarSchematicMap />
            </div>

            {activeTab === 'timeline' && <TimelineSection />}

            {activeTab === 'analytics' && <AnalyticsSection />}

            {activeTab === 'details' && (
              <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Red Forces Panel */}
                  <div className="glass-card bg-red-500/5 border border-red-500/20 p-6 rounded-3xl flex flex-col gap-5">
                    <div className="flex items-center justify-between pb-4 border-b border-red-500/20">
                      <div>
                        <h4 className="font-black text-red-400 text-lg uppercase tracking-widest flex items-center gap-2">
                          <span>{red.countryName || '红方'} 核心战力与损耗明细</span>
                        </h4>
                        <p className="text-[10px] text-red-300/60 font-bold uppercase tracking-wider mt-0.5">
                          首都: {red.capitalName || '中央要塞'} ({red.capitalOccupied ? '已失陷' : (red.capitalRelocated ? '已战时迁都' : '安全控制')})
                        </p>
                      </div>
                      <span className="text-[10px] font-black text-red-500/60 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 uppercase tracking-widest">
                        {red.id.toUpperCase()} SIDE
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: '初始现役兵力', value: `${(red.initialActiveTroops || red.activeTroops).toLocaleString()} 人`, color: 'text-white/80' },
                        { label: '剩余现役兵力', value: `${(red.activeTroops || 0).toLocaleString()} 人`, color: 'text-white font-black' },
                        { label: '初始预备役', value: `${(red.initialReserveTroops || 0).toLocaleString()} 人`, color: 'text-white/60' },
                        { label: '剩余预备役', value: `${(red.reserveTroops || 0).toLocaleString()} 人`, color: 'text-white/80' },
                        { label: '累计阵亡/失踪', value: `${(red.militaryLosses || 0).toLocaleString()} 人`, color: 'text-red-400 font-black' },
                        { label: '解缴/被俘/投降', value: `${(red.surrendered || 0).toLocaleString()} 人`, color: 'text-amber-400 font-bold' },
                        { label: '平民与次生波及', value: `${(red.civilianLosses || 0).toLocaleString()} 人`, color: 'text-red-300/80' },
                        { label: '领土控制网格', value: `${red.controlledCells || 0} / 初始${red.initialCellCount || 0}`, color: 'text-emerald-400 font-bold' },
                        { label: '综合火力指数', value: red.firepower, color: 'text-amber-400 font-black' },
                        { label: '前线战斗意志', value: `${red.morale}%`, color: 'text-emerald-400 font-bold' },
                        { label: '战略后勤补给', value: `${red.logistics}%`, color: 'text-blue-400 font-bold' },
                        { label: '战场主导权', value: `${red.initiative || 50}%`, color: 'text-purple-400 font-bold' }
                      ].map(item => (
                        <div key={item.label} className="flex justify-between items-center bg-white/[0.03] p-2.5 sm:p-3 rounded-xl border border-white/[0.05]">
                          <span className="text-[10px] sm:text-[11px] font-bold text-white/40 uppercase tracking-wider">{item.label}</span>
                          <strong className={clsx("text-xs sm:text-sm font-bold", item.color)}>{item.value}</strong>
                        </div>
                      ))}
                    </div>

                    {/* Member countries breakdown if coalition */}
                    {red.members && red.members.length > 0 && (
                      <div className="mt-2 pt-4 border-t border-red-500/20">
                        <h5 className="text-xs font-bold text-red-300 mb-2 uppercase tracking-wider">联军成员国兵力与战损</h5>
                        <div className="space-y-1.5">
                          {red.members.map(m => (
                            <div key={m.iso3} className="flex justify-between items-center bg-red-950/20 p-2 rounded-lg text-xs text-white/80">
                              <span className="font-bold">{m.countryName || m.name}</span>
                              <div className="flex gap-3 text-[11px]">
                                <span>现役: <strong className="text-white">{m.activeTroops.toLocaleString()}</strong></span>
                                <span>阵亡: <strong className="text-red-400">{m.militaryLosses.toLocaleString()}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Blue Forces Panel */}
                  <div className="glass-card bg-blue-500/5 border border-blue-500/20 p-6 rounded-3xl flex flex-col gap-5">
                    <div className="flex items-center justify-between pb-4 border-b border-blue-500/20">
                      <div>
                        <h4 className="font-black text-blue-400 text-lg uppercase tracking-widest flex items-center gap-2">
                          <span>{blue.countryName || '蓝方'} 核心战力与损耗明细</span>
                        </h4>
                        <p className="text-[10px] text-blue-300/60 font-bold uppercase tracking-wider mt-0.5">
                          首都: {blue.capitalName || '中央要塞'} ({blue.capitalOccupied ? '已失陷' : (blue.capitalRelocated ? '已战时迁都' : '安全控制')})
                        </p>
                      </div>
                      <span className="text-[10px] font-black text-blue-500/60 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">
                        {blue.id.toUpperCase()} SIDE
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: '初始现役兵力', value: `${(blue.initialActiveTroops || blue.activeTroops).toLocaleString()} 人`, color: 'text-white/80' },
                        { label: '剩余现役兵力', value: `${(blue.activeTroops || 0).toLocaleString()} 人`, color: 'text-white font-black' },
                        { label: '初始预备役', value: `${(blue.initialReserveTroops || 0).toLocaleString()} 人`, color: 'text-white/60' },
                        { label: '剩余预备役', value: `${(blue.reserveTroops || 0).toLocaleString()} 人`, color: 'text-white/80' },
                        { label: '累计阵亡/失踪', value: `${(blue.militaryLosses || 0).toLocaleString()} 人`, color: 'text-blue-400 font-black' },
                        { label: '解缴/被俘/投降', value: `${(blue.surrendered || 0).toLocaleString()} 人`, color: 'text-amber-400 font-bold' },
                        { label: '平民与次生波及', value: `${(blue.civilianLosses || 0).toLocaleString()} 人`, color: 'text-blue-300/80' },
                        { label: '领土控制网格', value: `${blue.controlledCells || 0} / 初始${blue.initialCellCount || 0}`, color: 'text-emerald-400 font-bold' },
                        { label: '综合火力指数', value: blue.firepower, color: 'text-amber-400 font-black' },
                        { label: '前线战斗意志', value: `${blue.morale}%`, color: 'text-emerald-400 font-bold' },
                        { label: '战略后勤补给', value: `${blue.logistics}%`, color: 'text-blue-400 font-bold' },
                        { label: '战场主导权', value: `${blue.initiative || 50}%`, color: 'text-purple-400 font-bold' }
                      ].map(item => (
                        <div key={item.label} className="flex justify-between items-center bg-white/[0.03] p-2.5 sm:p-3 rounded-xl border border-white/[0.05]">
                          <span className="text-[10px] sm:text-[11px] font-bold text-white/40 uppercase tracking-wider">{item.label}</span>
                          <strong className={clsx("text-xs sm:text-sm font-bold", item.color)}>{item.value}</strong>
                        </div>
                      ))}
                    </div>

                    {/* Member countries breakdown if coalition */}
                    {blue.members && blue.members.length > 0 && (
                      <div className="mt-2 pt-4 border-t border-blue-500/20">
                        <h5 className="text-xs font-bold text-blue-300 mb-2 uppercase tracking-wider">联军成员国兵力与战损</h5>
                        <div className="space-y-1.5">
                          {blue.members.map(m => (
                            <div key={m.iso3} className="flex justify-between items-center bg-blue-950/20 p-2 rounded-lg text-xs text-white/80">
                              <span className="font-bold">{m.countryName || m.name}</span>
                              <div className="flex gap-3 text-[11px]">
                                <span>现役: <strong className="text-white">{m.activeTroops.toLocaleString()}</strong></span>
                                <span>阵亡: <strong className="text-blue-400">{m.militaryLosses.toLocaleString()}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
