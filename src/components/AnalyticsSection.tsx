import React from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, BarChart, Bar } from 'recharts';
import { Swords, ShieldAlert, Award, TrendingUp, Users, Flag, Activity, Scale } from 'lucide-react';

export default function AnalyticsSection() {
  const { history, red, blue, winner, resultReason } = useSimulationStore();

  const redName = red.countryName || '红方';
  const blueName = blue.countryName || '蓝方';

  // Total Initial Force
  const redInitTotal = (red.initialActiveTroops || 100000) + (red.initialReserveTroops || 50000);
  const blueInitTotal = (blue.initialActiveTroops || 100000) + (blue.initialReserveTroops || 50000);

  // Total Losses & Surrendered
  const redLosses = red.militaryLosses || 0;
  const blueLosses = blue.militaryLosses || 0;
  const redSurrendered = red.surrendered || 0;
  const blueSurrendered = blue.surrendered || 0;

  // Casualty Percentages
  const redCasualtyRate = ((redLosses + redSurrendered) / Math.max(1, redInitTotal) * 100).toFixed(1);
  const blueCasualtyRate = ((blueLosses + blueSurrendered) / Math.max(1, blueInitTotal) * 100).toFixed(1);

  // Casualty Exchange Ratio (Exchange ratio: Blue Losses / Red Losses)
  const exchangeRatioVal = redLosses > 0 ? (blueLosses / redLosses).toFixed(2) : '1.00';

  // Reserve Consumption Rate
  const redReserveRemaining = red.reserveTroops || 0;
  const redReserveUsed = Math.max(0, (red.initialReserveTroops || 0) - redReserveRemaining);
  const redReserveRate = ((redReserveUsed / Math.max(1, red.initialReserveTroops || 1)) * 100).toFixed(1);

  const blueReserveRemaining = blue.reserveTroops || 0;
  const blueReserveUsed = Math.max(0, (blue.initialReserveTroops || 0) - blueReserveRemaining);
  const blueReserveRate = ((blueReserveUsed / Math.max(1, blue.initialReserveTroops || 1)) * 100).toFixed(1);

  // Daily Averages and Peaks
  const totalDays = Math.max(1, history.length);
  const redAvgDailyLoss = Math.round(redLosses / totalDays);
  const blueAvgDailyLoss = Math.round(blueLosses / totalDays);

  let redPeakDailyLoss = 0;
  let bluePeakDailyLoss = 0;
  let maxLossDayRed = 1;
  let maxLossDayBlue = 1;

  for (let i = 1; i < history.length; i++) {
    const rDelta = (history[i].redLosses || 0) - (history[i - 1].redLosses || 0);
    const bDelta = (history[i].blueLosses || 0) - (history[i - 1].blueLosses || 0);
    if (rDelta > redPeakDailyLoss) { redPeakDailyLoss = rDelta; maxLossDayRed = history[i].tick || i + 1; }
    if (bDelta > bluePeakDailyLoss) { bluePeakDailyLoss = bDelta; maxLossDayBlue = history[i].tick || i + 1; }
  }

  // Active Force Retention
  const redActiveRemaining = red.activeTroops || 0;
  const blueActiveRemaining = blue.activeTroops || 0;
  const redRetentionRate = ((redActiveRemaining / Math.max(1, red.initialActiveTroops || 1)) * 100).toFixed(1);
  const blueRetentionRate = ((blueActiveRemaining / Math.max(1, blue.initialActiveTroops || 1)) * 100).toFixed(1);

  // Territory Net Change
  const firstFrame = history[0] || { redCells: 1, blueCells: 1 };
  const lastFrame = history[history.length - 1] || firstFrame;
  const redCellGain = (lastFrame.redCells || 0) - (firstFrame.redCells || 0);

  // Process history frames into chart data points
  const chartData = history.map((f, i) => {
    const totalCells = (f.redCells || 0) + (f.blueCells || 0) || 1;
    const redPct = Math.round(((f.redCells || 0) / totalCells) * 100);
    const bluePct = 100 - redPct;

    const prevFrame = i > 0 ? history[i - 1] : f;
    const redDaily = Math.max(0, (f.redLosses || 0) - (prevFrame.redLosses || 0));
    const blueDaily = Math.max(0, (f.blueLosses || 0) - (prevFrame.blueLosses || 0));

    return {
      day: `第${f.tick || i + 1}天`,
      tick: f.tick,
      date: f.currentDate,
      [redName]: redPct,
      [blueName]: bluePct,
      [`${redName}现役兵力`]: f.redActiveTroops || 0,
      [`${blueName}现役兵力`]: f.blueActiveTroops || 0,
      [`${redName}累计伤亡`]: f.redLosses || 0,
      [`${blueName}累计伤亡`]: f.blueLosses || 0,
      [`${redName}单日损耗`]: redDaily,
      [`${blueName}单日损耗`]: blueDaily
    };
  });

  return (
    <div className="w-full flex flex-col gap-6 text-gray-200">
      
      {/* Top Comprehensive Tactical Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* KPI 1: Casualty Exchange Ratio */}
        <div className="bg-slate-900/90 border border-amber-500/30 p-3.5 sm:p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-bold text-gray-300">战损交换比 (Exchange)</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-300">1 : {exchangeRatioVal}</span>
            <span className="text-xs text-gray-400">({redName}:{blueName})</span>
          </div>
          <div className="text-[11px] text-gray-400 border-t border-gray-800 pt-1.5 flex justify-between">
            <span>{redName}损耗: <strong>{(redLosses/1000).toFixed(1)}k</strong></span>
            <span>{blueName}损耗: <strong>{(blueLosses/1000).toFixed(1)}k</strong></span>
          </div>
        </div>

        {/* KPI 2: Overall Casualty Rate % */}
        <div className="bg-slate-900/90 border border-gray-700/80 p-3.5 sm:p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-bold text-gray-300">总兵力伤亡率</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-red-400 mr-1">{redName}:</span>
              <span className="text-lg font-bold text-red-400">{redCasualtyRate}%</span>
            </div>
            <div>
              <span className="text-xs text-blue-400 mr-1">{blueName}:</span>
              <span className="text-lg font-bold text-blue-400">{blueCasualtyRate}%</span>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 border-t border-gray-800 pt-1.5 flex justify-between">
            <span>被俘/解缴: {redSurrendered.toLocaleString()}人</span>
            <span>被俘/解缴: {blueSurrendered.toLocaleString()}人</span>
          </div>
        </div>

        {/* KPI 3: Daily Average & Peak Attrition */}
        <div className="bg-slate-900/90 border border-gray-700/80 p-3.5 sm:p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-bold text-gray-300">日均 & 战损峰值</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">{redName}日均损耗:</span>
              <strong className="text-red-400">{redAvgDailyLoss.toLocaleString()}人/日</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{blueName}日均损耗:</span>
              <strong className="text-blue-400">{blueAvgDailyLoss.toLocaleString()}人/日</strong>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 border-t border-gray-800 pt-1.5 flex justify-between">
            <span>峰值第{maxLossDayRed}天({redPeakDailyLoss.toLocaleString()})</span>
            <span>峰值第{maxLossDayBlue}天({bluePeakDailyLoss.toLocaleString()})</span>
          </div>
        </div>

        {/* KPI 4: Active Force Retention & Reserve Mobilization */}
        <div className="bg-slate-900/90 border border-gray-700/80 p-3.5 sm:p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-bold text-gray-300">战力存续与预备役动员</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">{redName}现役存续:</span>
              <strong className="text-emerald-400">{redRetentionRate}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{blueName}现役存续:</span>
              <strong className="text-blue-300">{blueRetentionRate}%</strong>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 border-t border-gray-800 pt-1.5 flex justify-between">
            <span>预备役已动员: {redReserveRate}%</span>
            <span>预备役已动员: {blueReserveRate}%</span>
          </div>
        </div>

      </div>

      {/* 1. Territory Area Chart */}
      <div className="bg-gray-800/80 border border-gray-700/80 p-4 sm:p-5 rounded-xl shadow-lg flex flex-col gap-3">
        <h4 className="text-sm sm:text-base font-bold text-white flex items-center justify-between">
          <span>领土控制比例与战线交错变化</span>
          <span className="text-xs text-gray-400 font-normal">基于全局 H3 网格实时推演占比 (净转移: {redCellGain >= 0 ? `+${redCellGain}` : redCellGain} 网格)</span>
        </h4>
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickFormatter={v => `${v}%`} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: any) => [`${value}%`]}
              />
              <Area type="monotone" dataKey={redName} stackId="1" stroke="#ef4444" fill="url(#colorRed)" />
              <Area type="monotone" dataKey={blueName} stackId="1" stroke="#60a5fa" fill="url(#colorBlue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Active Forces Retention Line Chart */}
      <div className="bg-gray-800/80 border border-gray-700/80 p-4 sm:p-5 rounded-xl shadow-lg flex flex-col gap-3">
        <h4 className="text-sm sm:text-base font-bold text-white flex items-center justify-between">
          <span>现役可动员兵力动态衰减曲线</span>
          <span className="text-xs text-gray-400 font-normal">实时在线可作战部队规模 (人)</span>
        </h4>
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: any) => [`${value.toLocaleString()} 人`]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Line type="monotone" dataKey={`${redName}现役兵力`} stroke="#ef4444" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey={`${blueName}现役兵力`} stroke="#60a5fa" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Casualties Line Chart */}
      <div className="bg-gray-800/80 border border-gray-700/80 p-4 sm:p-5 rounded-xl shadow-lg flex flex-col gap-3">
        <h4 className="text-sm sm:text-base font-bold text-white flex items-center justify-between">
          <span>累计战损与单日伤亡对比</span>
          <span className="text-xs text-gray-400 font-normal">包含阵亡、重伤与包围战歼灭</span>
        </h4>
        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: any) => [`${value.toLocaleString()} 人`]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Line type="monotone" dataKey={`${redName}累计伤亡`} stroke="#ef4444" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey={`${blueName}累计伤亡`} stroke="#60a5fa" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
