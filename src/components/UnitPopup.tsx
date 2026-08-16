import React from 'react';
import { UnitState } from '../types/simulation';

interface UnitPopupProps {
  unit: UnitState;
  onClose: () => void;
}

export default function UnitPopup({ unit, onClose }: UnitPopupProps) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 border border-white/20 p-4 rounded text-white z-50 min-w-[200px] shadow-2xl backdrop-blur-sm pointer-events-auto">
      <div className="flex justify-between items-center mb-2 border-b border-white/20 pb-2">
        <h3 className="font-bold">单位信息</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white px-2">✕</button>
      </div>
      <div className="text-sm flex flex-col gap-1">
        <div><span className="text-gray-400">阵营：</span> {unit.side === 'red' ? '红方' : '蓝方'}</div>
        <div><span className="text-gray-400">人数：</span> {unit.strength.toLocaleString()} / {unit.maxStrength.toLocaleString()}</div>
        <div><span className="text-gray-400">补给：</span> {unit.supplyConnected ? '✅ 连通' : '❌ 断绝'}</div>
        <div><span className="text-gray-400">状态：</span> {unit.status === 'active' ? '战斗中' : unit.status === 'retreating' ? '撤退' : '孤立'}</div>
        <div><span className="text-gray-400">被围天数：</span> {unit.daysIsolated} 天</div>
      </div>
    </div>
  );
}
