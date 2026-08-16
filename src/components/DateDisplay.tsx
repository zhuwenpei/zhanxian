import React from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { parseFlexibleDate } from '../utils/dateUtils';

export default function DateDisplay() {
  const dateStr = useSimulationStore(s => s.currentDate);
  const date = parseFlexibleDate(dateStr);
  const year = format(date, 'yyyy');
  const hasTime = dateStr.includes(':') || dateStr.includes('T');
  const monthDay = hasTime ? format(date, 'MM/dd HH:mm') : format(date, 'MM/dd');

  return (
    <div className="flex flex-col items-end gap-1">
      <motion.div 
        key={dateStr}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-dark px-3 py-1.5 rounded-xl flex items-center gap-2.5 shadow-lg border border-white/10"
      >
        <span className="text-[9px] font-extrabold text-white/40 uppercase tracking-widest hidden sm:inline">推演时间</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg md:text-xl font-black tabular-nums tracking-tight text-amber-300">
            {monthDay}
          </span>
          <span className="text-xs font-bold tabular-nums text-white/50">
            {year}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

