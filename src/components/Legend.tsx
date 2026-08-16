import React from 'react';

export default function Legend() {
  return (
    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm p-3 border border-white/20 rounded text-xs text-gray-200 flex flex-col gap-2 z-10 pointer-events-none">
      <div className="flex items-center gap-2">
        <div className="w-4 h-3 bg-[#9f1d20] border border-white/50" />
        <span>红方控制区</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-3 bg-[#12609a] border border-white/50" />
        <span>蓝方控制区</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-[2px] bg-white shadow-[0_0_4px_#fff]" />
        <span>当前战线</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-2.5 border border-white shadow-sm flex items-center justify-center">
           <div className="w-full h-full bg-[#ff4d4d]" />
        </div>
        <span>一个单位 (最多10000人)</span>
      </div>
    </div>
  );
}
