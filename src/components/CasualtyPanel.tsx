import React, { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function CasualtyPanel() {
  const red = useSimulationStore(s => s.red);
  const blue = useSimulationStore(s => s.blue);
  const isCedeTerritoryMode = useSimulationStore(s => s.isCedeTerritoryMode);
  const setCedeTerritoryMode = useSimulationStore(s => s.setCedeTerritoryMode);

  const [isExpanded, setIsExpanded] = useState(false);

  const redCas = red.militaryLosses + red.civilianLosses;
  const blueCas = blue.militaryLosses + blue.civilianLosses;
  const redTotalLoss = redCas + (red.surrendered || 0);
  const blueTotalLoss = blueCas + (blue.surrendered || 0);

  return (
    <div className="flex flex-col gap-3 max-w-[280px] sm:max-w-xs">
      <div className="glass-card overflow-hidden shadow-2xl transition-all border border-white/10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors cursor-pointer group"
        >
          <div className="flex flex-col gap-2 min-w-0 w-full pr-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-3 bg-[#9f1d20] border border-white/20 rounded-[1px] shrink-0 shadow-sm" />
                <span className="text-[10px] text-white/50 font-black uppercase tracking-wider truncate">{red.countryName || '红方'}</span>
              </div>
              <span className="text-sm font-black text-red-500 tabular-nums tracking-tight">{redTotalLoss.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-4 h-3 bg-[#12609a] border border-white/20 rounded-[1px] shrink-0 shadow-sm" />
                <span className="text-[10px] text-white/50 font-black uppercase tracking-wider truncate">{blue.countryName || '蓝方'}</span>
              </div>
              <span className="text-sm font-black text-blue-500 tabular-nums tracking-tight">{blueTotalLoss.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center pl-3 border-l border-white/5 text-white/20 group-hover:text-white/60 transition-colors shrink-0">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="border-t border-white/5 p-4 flex flex-col gap-4 bg-white/[0.02]"
            >
              <div className="text-[10px] font-black text-white/30 border-b border-white/5 pb-2 flex items-center justify-between uppercase tracking-[0.15em]">
                <span>损耗详情</span>
                <span className="text-[9px] bg-white/5 text-white/40 border border-white/5 px-2 py-0.5 rounded-full font-bold">
                  实时统计
                </span>
              </div>
              
              <div className="flex flex-col gap-4">
                {[
                  { side: 'red', data: red, cas: redCas, color: 'bg-[#9f1d20]', text: 'text-red-400' },
                  { side: 'blue', data: blue, cas: blueCas, color: 'bg-[#12609a]', text: 'text-blue-400' }
                ].map(item => (
                  <div key={item.side} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-4 h-3 ${item.color} border border-white/20 rounded-[1px] shrink-0`} />
                        <div className="font-black text-[11px] truncate text-white/90 uppercase tracking-wide">{item.data.countryName}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5">
                        <span className="text-[9px] text-white/30 block font-black uppercase tracking-widest mb-0.5">伤亡</span>
                        <span className="text-sm font-black text-white/90 tabular-nums tracking-tight">
                          {item.cas.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-xl p-2.5">
                        <span className="text-[9px] text-amber-500/40 block font-black uppercase tracking-widest mb-0.5">投降</span>
                        <span className="text-sm font-black text-amber-500 tabular-nums tracking-tight">
                          {(item.data.surrendered || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isCedeTerritoryMode && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card bg-emerald-500/20 text-white p-4 rounded-2xl border border-emerald-500/30 shadow-xl backdrop-blur-xl"
        >
          <p className="font-bold text-sm mb-3">割让领土模式: 点击地图以改变领土所有权。</p>
          <button 
            onClick={() => setCedeTerritoryMode(false)}
            className="w-full bg-white/10 hover:bg-white/20 py-2 rounded-xl text-xs font-black transition-all border border-white/10 uppercase tracking-widest"
          >
            完成并退出
          </button>
        </motion.div>
      )}
    </div>
  );
}
