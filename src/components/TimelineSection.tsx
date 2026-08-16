import React, { useEffect, useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { Calendar, Flag, Swords, Shield, MapPin, Sparkles, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';

export interface TimelineMilestone {
  day: number;
  date: string;
  phase: string;
  title: string;
  location?: string;
  summary: string;
  redTerritoryPct: number;
  blueTerritoryPct: number;
  redCasualties: number;
  blueCasualties: number;
  keyEventTag?: string;
  type: 'breakthrough' | 'battle' | 'encirclement' | 'capital_fall' | 'treaty';
}

export default function TimelineSection() {
  const { red, blue, era, history, currentDate, startYear, startMonth, startDay, winner, resultReason, timelineMilestones, timelineAnalysis } = useSimulationStore();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const startDateStr = `${startYear || 2026}-${String(startMonth || 4).padStart(2, '0')}-${String(startDay || 21).padStart(2, '0')}`;
  const endDateStr = currentDate || '2026-05-27';
  const totalDays = history.length || 1;

  const generateClientTimelineFallback = () => {
    const redName = red.countryName || '红方';
    const blueName = blue.countryName || '蓝方';
    const winnerName = winner === 'red' ? redName : blueName;
    const loserName = winner === 'red' ? blueName : redName;
    const totalFrames = history.length;

    if (totalFrames <= 1) {
      return {
        milestones: [{
          day: 1,
          date: startDateStr,
          phase: '第一阶段-强攻破局',
          title: '第一阶段：边境突击与第一道防线撕裂',
          location: '边境第一道前沿防线',
          summary: `${redName} 重装机械化集群沿主干轴线夜间强攻，集中重炮压制 ${blueName} 边境前沿，双方前线机动部队全线撕裂交火。`,
          redTerritoryPct: 50,
          blueTerritoryPct: 50,
          redCasualties: history[0]?.redLosses || 0,
          blueCasualties: history[0]?.blueLosses || 0,
          keyEventTag: '首战破局',
          type: 'breakthrough' as const
        }],
        overallAnalysis: `推演刚刚开启，${redName} 与 ${blueName} 在前线交界地带展开试探性对峙。`
      };
    }

    const indices = [
      0,
      Math.floor(totalFrames * 0.25),
      Math.floor(totalFrames * 0.55),
      Math.floor(totalFrames * 0.8),
      totalFrames - 1
    ];
    const uniqueIndices = Array.from(new Set(indices)).sort((a, b) => a - b);

    const phaseNames = ['第一阶段-强攻破局', '第一阶段-纵深挺进', '第二阶段-分割包围', '第三阶段-要地决战', '终局阶段-战局结算'];
    const eventTypes: Array<'breakthrough' | 'battle' | 'encirclement' | 'capital_fall' | 'treaty'> = [
      'breakthrough', 'battle', 'encirclement', 'capital_fall', 'treaty'
    ];
    const titles = [
      '第一阶段：边境突破与防线撕裂战',
      '第一阶段：纵深穿插与交通干线争夺',
      '第二阶段：两翼钳形合围与口袋阵形成',
      '第三阶段：核心据点要塞攻坚决战',
      '终局阶段：战地终局结算与停火达成'
    ];

    const fallbackMilestones: TimelineMilestone[] = uniqueIndices.map((idx, i) => {
      const f = history[idx];
      const prevF = idx > 0 ? history[uniqueIndices[i - 1]] || history[0] : f;

      const totalCells = (f.redCells || 0) + (f.blueCells || 0) || 1;
      const redPct = Math.round(((f.redCells || 0) / totalCells) * 100);
      const bluePct = 100 - redPct;

      const rDelta = Math.max(0, (f.redLosses || 0) - (prevF.redLosses || 0));
      const bDelta = Math.max(0, (f.blueLosses || 0) - (prevF.blueLosses || 0));
      const combinedDelta = rDelta + bDelta;

      let summaryText = '';
      if (i === 0) {
        summaryText = `${redName} 战术集群集中重装力量，在电子与重火炮掩护下沿前沿接触线发动夜间强攻，迅速击穿 ${blueName} 第一道预设防线，建立前沿突破口。`;
      } else if (i === 1) {
        summaryText = `${redName} 突击矛头向纵深关键枢纽快速挺进，成功切断 ${blueName} 多条战术补给干线。${blueName} 调动预备集群组织反冲击，双方围绕战术要地展开激战，本阶段产生约 ${combinedDelta.toLocaleString()} 人战损。`;
      } else if (i === 2) {
        summaryText = `${redName} 主力实施两翼钳形迂回攻势，分割 ${blueName} 前线防御集群，形成多处包围态势，守军承受高强度打击，防线全面动摇。`;
      } else if (i === 3) {
        summaryText = `战事进入核心要地攻坚与防区决战。${winnerName} 集中重型火炮与破障集群对最后核心要塞发起总攻，${loserName} 核心防御节点接连失守。`;
      } else {
        summaryText = `战场推进达到临界终点。${resultReason || `${winnerName} 凭借绝对战术主动权锁定胜局`}` + `。双方控制区最终定格为 ${redName} ${redPct}% 对 ${blueName} ${bluePct}%，全线战局尘埃落定。`;
      }

      return {
        day: f.tick || (idx + 1),
        date: f.currentDate || `第${f.tick || idx + 1}天`,
        phase: phaseNames[Math.min(i, phaseNames.length - 1)],
        title: titles[Math.min(i, titles.length - 1)],
        location: (f as any).capturedCity || (i === 0 ? '边境突破口' : (i === 2 ? '纵深包围圈' : '主要战术轴线')),
        summary: summaryText,
        redTerritoryPct: redPct,
        blueTerritoryPct: bluePct,
        redCasualties: f.redLosses || 0,
        blueCasualties: f.blueLosses || 0,
        keyEventTag: i === 0 ? '强渡突破' : (i === 2 ? '口袋合围' : (i === uniqueIndices.length - 1 ? '最终决胜' : '纵深穿插')),
        type: eventTypes[Math.min(i, eventTypes.length - 1)]
      };
    });

    return {
      milestones: fallbackMilestones,
      overallAnalysis: `本场战役推演历经 ${totalFrames} 个完整周期。${winnerName} 凭借第一阶段突破口的成功撕裂与第二阶段关键纵深包围，彻底摧毁了 ${loserName} 的防务韧性，最终达成全部战略目标。`
    };
  };

  const fetchTimeline = async () => {
    setIsLoading(true);
    setError(null);

    // Summarize history into key frames for API
    const historySummary = history.map(f => ({
      tick: f.tick,
      date: f.currentDate,
      redActive: f.redActiveTroops,
      blueActive: f.blueActiveTroops,
      redLosses: f.redLosses,
      blueLosses: f.blueLosses,
      redCells: f.redCells,
      blueCells: f.blueCells,
      dailyEventText: f.dailyEventText
    }));

    try {
      const res = await fetch('/api/generate-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redName: red.countryName || '红方',
          blueName: blue.countryName || '蓝方',
          era,
          startDate: startDateStr,
          endDate: endDateStr,
          totalDays,
          winner,
          resultReason,
          historySummary
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.milestones && data.milestones.length > 0) {
          useSimulationStore.setState({
            timelineMilestones: data.milestones,
            timelineAnalysis: data.overallAnalysis || ''
          });
          return;
        }
      }
      // If endpoint non-ok or empty response, use local fallback
      const local = generateClientTimelineFallback();
      useSimulationStore.setState({
        timelineMilestones: local.milestones,
        timelineAnalysis: local.overallAnalysis
      });
    } catch (err: any) {
      console.warn('Timeline fetch failed, using local fallback:', err);
      const local = generateClientTimelineFallback();
      useSimulationStore.setState({
        timelineMilestones: local.milestones,
        timelineAnalysis: local.overallAnalysis
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!timelineMilestones && !isLoading) {
      fetchTimeline();
    }
  }, []);

  const getPhaseBadgeColor = (phase: string) => {
    if (phase.includes('一') || phase.includes('开战') || phase.includes('破局')) return 'bg-red-950/80 text-red-400 border-red-700/80';
    if (phase.includes('二') || phase.includes('包围') || phase.includes('拉锯')) return 'bg-amber-950/80 text-amber-400 border-amber-700/80';
    if (phase.includes('三') || phase.includes('决胜') || phase.includes('终局')) return 'bg-purple-950/80 text-purple-300 border-purple-700/80';
    return 'bg-blue-950/80 text-blue-300 border-blue-700/80';
  };

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'breakthrough':
        return <Swords className="w-4 h-4 text-red-400" />;
      case 'encirclement':
        return <Shield className="w-4 h-4 text-amber-400" />;
      case 'capital_fall':
        return <Flag className="w-4 h-4 text-purple-400" />;
      case 'treaty':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      default:
        return <MapPin className="w-4 h-4 text-blue-400" />;
    }
  };

  if (!timelineMilestones && !isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-900/40 border border-gray-800 rounded-xl my-4">
        <div className="relative mb-5">
          <div className="absolute inset-0 bg-amber-500/10 blur-xl rounded-full scale-150 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-gray-900 border border-amber-500/40 flex items-center justify-center relative shadow-lg">
            <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">一键生成 AI 战局演变时间线</h3>
        <p className="text-xs sm:text-sm text-gray-400 max-w-md leading-relaxed mb-6 px-4">
          通过深度分析推演全程的每日战线走势、控制区比例演变及双方累计人员伤亡，AI 参谋部将为您多维度复盘战术得失，自动生成严谨、详实的历史阶段战报时间线。
        </p>
        <button
          onClick={fetchTimeline}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-gray-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg hover:shadow-amber-500/10 active:scale-95 flex items-center gap-2 border border-amber-400/30 cursor-pointer"
        >
          <Swords className="w-4 h-4" />
          <span>生成 AI 全景战报</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-5 text-gray-200">
      {/* AI Analysis Summary Box */}
      <div className="bg-gradient-to-r from-red-950/40 via-gray-900 to-blue-950/40 border border-amber-500/30 p-4 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
            <Sparkles className="w-4 h-4 animate-pulse text-amber-400" />
            <span>AI 参谋部战线演变总结</span>
          </div>
          <button
            onClick={fetchTimeline}
            disabled={isLoading}
            className="text-xs text-gray-400 hover:text-amber-300 flex items-center gap-1 bg-gray-800/80 hover:bg-gray-700/80 px-2.5 py-1 rounded-md border border-gray-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>重新评估</span>
          </button>
        </div>
        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
          {isLoading ? '正在分析全程战线演变数据...' : (timelineAnalysis || '战事历经多个演变阶段，双方兵力在前线交错展开，完成了由边境突破至全境判定的完整推演过程。')}
        </p>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-4 py-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-gray-800/60 border border-gray-700/50 p-4 rounded-xl flex gap-4">
              <div className="w-12 h-12 bg-gray-700/50 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 bg-gray-700/60 rounded w-1/3" />
                <div className="h-3 bg-gray-700/40 rounded w-3/4" />
                <div className="h-3 bg-gray-700/40 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-red-950/50 border border-red-700/60 p-4 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchTimeline} className="ml-auto underline font-bold hover:text-red-200">重试</button>
        </div>
      )}

      {/* Vertical Timeline Card List */}
      {!isLoading && timelineMilestones && timelineMilestones.length > 0 && (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-amber-500/30 flex flex-col gap-6 my-2">
          {timelineMilestones.map((m, idx) => {
            const redPct = m.redTerritoryPct ?? 50;
            const bluePct = m.blueTerritoryPct ?? (100 - redPct);

            return (
              <div key={idx} className="relative group">
                {/* Node Dot Icon */}
                <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-8 h-8 rounded-full bg-gray-900 border-2 border-amber-500/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {getMilestoneIcon(m.type)}
                </div>

                {/* Main Card */}
                <div className="bg-gray-800/80 hover:bg-gray-800 border border-gray-700/80 group-hover:border-amber-500/50 p-4 rounded-xl shadow-xl transition-all flex flex-col gap-2.5">
                  {/* Top Bar: Date & Phase Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getPhaseBadgeColor(m.phase)}`}>
                        {m.phase}
                      </span>
                      {m.keyEventTag && (
                        <span className="text-[10px] font-medium bg-red-950/60 text-red-300 border border-red-800/50 px-2 py-0.5 rounded">
                          {m.keyEventTag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{m.date} (第{m.day}天)</span>
                    </div>
                  </div>

                  {/* Title & Location */}
                  <div className="flex flex-col">
                    <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                      <span>{m.title}</span>
                    </h4>
                    {m.location && (
                      <span className="text-xs text-amber-400/90 flex items-center gap-1 font-medium mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>主要轴线: {m.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Narrative Summary */}
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed bg-gray-900/60 p-3 rounded-lg border border-gray-700/50 font-sans">
                    {m.summary}
                  </p>

                  {/* Frontline & Territory Ratio Bar */}
                  <div className="flex flex-col gap-1 pt-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-red-400">{red.countryName || '红方'}: {redPct}% 领土</span>
                      <span className="text-blue-400">{blue.countryName || '蓝方'}: {bluePct}% 领土</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-gray-950 border border-gray-700">
                      <div style={{ width: `${redPct}%` }} className="bg-red-600 transition-all duration-500" />
                      <div style={{ width: `${bluePct}%` }} className="bg-blue-600 transition-all duration-500" />
                    </div>
                  </div>

                  {/* Casualties summary at this stage */}
                  <div className="flex justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-700/40">
                    <span>累计伤亡 ({red.countryName || '红方'}): <strong className="text-red-300">{m.redCasualties?.toLocaleString() ?? 0}人</strong></span>
                    <span>累计伤亡 ({blue.countryName || '蓝方'}): <strong className="text-blue-300">{m.blueCasualties?.toLocaleString() ?? 0}人</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
