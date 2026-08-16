import React, { useState, useEffect } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { parseFlexibleDate } from '../utils/dateUtils';
import { Clock, Check, RotateCcw, X, Sparkles, Calendar, HelpCircle, ArrowRight, CalendarRange, Sliders } from 'lucide-react';
import clsx from 'clsx';
import { addMinutes, format } from 'date-fns';

interface TimeRecalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function dateToDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToDisplay(datetimeLocalStr: string): string {
  if (!datetimeLocalStr) return '';
  return datetimeLocalStr.replace('T', ' ');
}

function formatMinutesToDuration(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return '0分钟';
  const days = Math.floor(totalMinutes / 1440);
  const remainingMinutes = totalMinutes % 1440;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = Math.round(remainingMinutes % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}分钟`);
  return parts.join(' ');
}

export default function TimeRecalibrationModal({ isOpen, onClose }: TimeRecalibrationModalProps) {
  const history = useSimulationStore(s => s.history || []);
  const currentMultiplier = useSimulationStore(s => s.timeMultiplier || 1);
  const setTimeRecalibration = useSimulationStore(s => s.setTimeRecalibration);

  const N = history.length || 1;
  const baseStartDateStr = history[0]?.currentDate || '2023-01-01';

  const [activeTab, setActiveTab] = useState<'range' | 'multiplier'>('range');
  const [startDatetimeLocal, setStartDatetimeLocal] = useState<string>('');
  const [endDatetimeLocal, setEndDatetimeLocal] = useState<string>('');

  const [selectedK, setSelectedK] = useState<number>(currentMultiplier);
  const [customDaysInput, setCustomDaysInput] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const startObj = parseFlexibleDate(baseStartDateStr);
      const startLocal = dateToDatetimeLocal(startObj);

      const frameSteps = Math.max(1, N - 1);
      const totalMinutes = Math.round(frameSteps * currentMultiplier * 1440);
      const endObj = addMinutes(startObj, totalMinutes);
      const endLocal = dateToDatetimeLocal(endObj);

      setStartDatetimeLocal(startLocal);
      setEndDatetimeLocal(endLocal);
      setSelectedK(currentMultiplier);
      setCustomDaysInput(String(Number((currentMultiplier * frameSteps).toFixed(2))));
    }
  }, [isOpen, baseStartDateStr, currentMultiplier, N]);

  if (!isOpen) return null;

  const presets = [1, 2, 3, 5, 10, 30];
  const frameSteps = Math.max(1, N - 1);

  const handleStartChange = (val: string) => {
    setStartDatetimeLocal(val);
    const sDate = new Date(val);
    const eDate = new Date(endDatetimeLocal);
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate > sDate) {
      const diffMins = (eDate.getTime() - sDate.getTime()) / 60000;
      const computedK = diffMins / (1440 * frameSteps);
      setSelectedK(computedK);
      setCustomDaysInput(String(Number((diffMins / 1440).toFixed(2))));
    }
  };

  const handleEndChange = (val: string) => {
    setEndDatetimeLocal(val);
    const sDate = new Date(startDatetimeLocal);
    const eDate = new Date(val);
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate > sDate) {
      const diffMins = (eDate.getTime() - sDate.getTime()) / 60000;
      const computedK = diffMins / (1440 * frameSteps);
      setSelectedK(computedK);
      setCustomDaysInput(String(Number((diffMins / 1440).toFixed(2))));
    }
  };

  const addDurationToEnd = (minutesToAdd: number) => {
    const sDate = new Date(startDatetimeLocal);
    if (isNaN(sDate.getTime())) return;
    const newEnd = addMinutes(sDate, minutesToAdd);
    const newEndLocal = dateToDatetimeLocal(newEnd);
    setEndDatetimeLocal(newEndLocal);

    const diffMins = (newEnd.getTime() - sDate.getTime()) / 60000;
    const computedK = diffMins / (1440 * frameSteps);
    setSelectedK(computedK);
    setCustomDaysInput(String(Number((diffMins / 1440).toFixed(2))));
  };

  const handleSelectPreset = (k: number) => {
    setSelectedK(k);
    const sDate = new Date(startDatetimeLocal);
    if (!isNaN(sDate.getTime())) {
      const targetMins = Math.round(frameSteps * k * 1440);
      const newEnd = addMinutes(sDate, targetMins);
      setEndDatetimeLocal(dateToDatetimeLocal(newEnd));
    }
    setCustomDaysInput(String(Number((k * frameSteps).toFixed(2))));
  };

  const handleDaysInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomDaysInput(valStr);
    const targetDays = parseFloat(valStr);
    if (!isNaN(targetDays) && targetDays > 0) {
      const computedK = targetDays / frameSteps;
      setSelectedK(computedK);
      const sDate = new Date(startDatetimeLocal);
      if (!isNaN(sDate.getTime())) {
        const targetMins = Math.round(targetDays * 1440);
        const newEnd = addMinutes(sDate, targetMins);
        setEndDatetimeLocal(dateToDatetimeLocal(newEnd));
      }
    }
  };

  const handleMultiplierInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      setSelectedK(val);
      setCustomDaysInput(String(Number((val * frameSteps).toFixed(2))));
      const sDate = new Date(startDatetimeLocal);
      if (!isNaN(sDate.getTime())) {
        const targetMins = Math.round(frameSteps * val * 1440);
        const newEnd = addMinutes(sDate, targetMins);
        setEndDatetimeLocal(dateToDatetimeLocal(newEnd));
      }
    }
  };

  const handleApply = () => {
    const formattedStart = datetimeLocalToDisplay(startDatetimeLocal);
    setTimeRecalibration(selectedK, formattedStart);
    onClose();
  };

  const handleReset = () => {
    const startObj = parseFlexibleDate(baseStartDateStr);
    const startLocal = dateToDatetimeLocal(startObj);
    const targetMinutes = frameSteps * 1440;
    const endObj = addMinutes(startObj, targetMinutes);
    const endLocal = dateToDatetimeLocal(endObj);

    setStartDatetimeLocal(startLocal);
    setEndDatetimeLocal(endLocal);
    setSelectedK(1);
    setCustomDaysInput(String(frameSteps));
    setTimeRecalibration(1, datetimeLocalToDisplay(startLocal));
    onClose();
  };

  const sDateObj = new Date(startDatetimeLocal);
  const eDateObj = new Date(endDatetimeLocal);
  const isRangeValid = !isNaN(sDateObj.getTime()) && !isNaN(eDateObj.getTime()) && eDateObj > sDateObj;
  const currentDiffMins = isRangeValid ? Math.round((eDateObj.getTime() - sDateObj.getTime()) / 60000) : 0;
  const minutesPerFrame = Math.round(currentDiffMins / frameSteps);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-100 flex items-center gap-2">
                重修战争时间
                {currentMultiplier !== 1 && (
                  <span className="text-xs px-2 py-0.5 bg-purple-900/80 text-purple-300 border border-purple-500/40 rounded-full">
                    当前: {currentMultiplier.toFixed(2)}x 缩放
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-400">精确到分钟标定推演起始与结束时间或拉伸时长</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* Rule Note */}
          <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-xs text-purple-200/90 leading-relaxed flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-purple-300">重修规则：</span>
              可直接输入<b>开始与结束时间（精确到分钟）</b>进行精确重修，或通过<b>目标总天数/缩放倍率</b>调整时间轴。推演界面及导出视频将自动按此时间戳计算。
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-gray-800/90 p-1 rounded-xl border border-gray-700/80 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('range')}
              className={clsx(
                "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === 'range'
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-750"
              )}
            >
              <CalendarRange size={14} />
              <span>直接指定开始/结束时间 (精确到分)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('multiplier')}
              className={clsx(
                "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                activeTab === 'multiplier'
                  ? "bg-purple-600 text-white shadow-md shadow-purple-900/30"
                  : "text-gray-400 hover:text-white hover:bg-gray-750"
              )}
            >
              <Sliders size={14} />
              <span>按倍率 / 目标总天数</span>
            </button>
          </div>

          {/* Key Indicators Bar */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-gray-800/80 p-2.5 rounded-xl border border-gray-700/70 flex flex-col items-center text-center">
              <span className="text-[11px] text-gray-400">原始推演帧数</span>
              <span className="text-base font-bold font-mono text-indigo-400">{N} 帧 ({frameSteps} 步)</span>
            </div>
            <div className="bg-gray-800/80 p-2.5 rounded-xl border border-gray-700/70 flex flex-col items-center text-center">
              <span className="text-[11px] text-gray-400">重修缩放系数</span>
              <span className="text-base font-bold font-mono text-purple-400">{selectedK.toFixed(3)} x</span>
            </div>
            <div className="bg-gray-800/80 p-2.5 rounded-xl border border-gray-700/70 flex flex-col items-center text-center">
              <span className="text-[11px] text-gray-400">重修总时长</span>
              <span className="text-base font-bold font-mono text-amber-400">{formatMinutesToDuration(currentDiffMins)}</span>
            </div>
          </div>

          {/* TAB 1: Direct Start & End Time Input (Minute Precision) */}
          {activeTab === 'range' && (
            <div className="flex flex-col gap-3.5 bg-gray-800/40 p-3.5 rounded-xl border border-gray-750">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Calendar size={13} />
                  开始时间 (精确到分钟)
                </label>
                <input
                  type="datetime-local"
                  value={startDatetimeLocal}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="w-full bg-gray-900 border border-indigo-500/50 rounded-xl px-3 py-2 text-sm font-mono text-indigo-200 focus:outline-none focus:border-indigo-400 shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Calendar size={13} />
                    结束时间 (精确到分钟)
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">快捷增加时长:</span>
                </div>
                <input
                  type="datetime-local"
                  value={endDatetimeLocal}
                  onChange={(e) => handleEndChange(e.target.value)}
                  className="w-full bg-gray-900 border border-amber-500/50 rounded-xl px-3 py-2 text-sm font-mono text-amber-200 focus:outline-none focus:border-amber-400 shadow-sm"
                />

                {/* Quick duration buttons */}
                <div className="flex items-center gap-1.5 mt-1 overflow-x-auto pb-1">
                  {[
                    { label: '+12小时', mins: 720 },
                    { label: '+1天', mins: 1440 },
                    { label: '+7天', mins: 10080 },
                    { label: '+30天', mins: 43200 },
                    { label: '+100天', mins: 144000 }
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => addDurationToEnd(item.mins)}
                      className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-[11px] font-mono border border-gray-700 transition-colors shrink-0 cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {!isRangeValid && (
                <div className="p-2.5 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-300 font-medium">
                  ⚠️ 提示：结束时间必须晚于开始时间，请调整正确的时间范围。
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Multiplier & Target Days */}
          {activeTab === 'multiplier' && (
            <div className="flex flex-col gap-3 bg-gray-800/40 p-3.5 rounded-xl border border-gray-750">
              {/* Quick Preset Buttons */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>快捷整倍数倍率</span>
                  <span className="text-[11px] text-gray-500 font-normal">1帧 = k天</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {presets.map(k => {
                    const isSelected = Math.abs(selectedK - k) < 0.001;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleSelectPreset(k)}
                        className={clsx(
                          "py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center border cursor-pointer active:scale-95",
                          isSelected
                            ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40"
                            : "bg-gray-800/90 border-gray-700 text-gray-300 hover:bg-gray-750 hover:text-white"
                        )}
                      >
                        <span>{k}x</span>
                        <span className="text-[10px] opacity-75 font-mono">{k * frameSteps}天</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                {/* Target Total Days Input */}
                <div className="flex flex-col gap-1.5 bg-gray-800/80 p-3 rounded-xl border border-gray-700/60 shadow-inner">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={12} />
                    目标重修总天数
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.01"
                      value={customDaysInput}
                      onChange={handleDaysInputChange}
                      className="w-full bg-gray-900 border border-amber-500/50 rounded-lg px-3 py-1.5 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-500 shadow-sm"
                      placeholder={`原始为 ${frameSteps} 天`}
                    />
                    <span className="absolute right-3 text-xs text-gray-400 font-mono">天</span>
                  </div>
                </div>

                {/* Multiplier Input */}
                <div className="flex flex-col gap-1.5 bg-gray-800/80 p-3 rounded-xl border border-gray-700/60 opacity-90">
                  <label className="text-xs font-bold text-gray-300">缩放系数 (k)</label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.01"
                      value={selectedK}
                      onChange={handleMultiplierInputChange}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                      placeholder="例如: 0.5"
                    />
                    <span className="absolute right-3 text-xs text-gray-400 font-mono">x</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date Range Preview Box */}
          <div className="bg-gray-800/90 border border-gray-700 p-3.5 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>重修时间戳预览 (Range)</span>
              </span>
              <span className="text-[11px] text-indigo-300 font-mono font-normal">
                每帧步进 ≈ {formatMinutesToDuration(minutesPerFrame)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono bg-gray-900/90 p-2.5 rounded-lg border border-gray-750 gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">起始时间 (第1帧)</span>
                <span className="text-indigo-300 font-bold">{datetimeLocalToDisplay(startDatetimeLocal) || '---'}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-gray-500">截止时间 (第{N}帧)</span>
                <span className="text-amber-300 font-bold">{datetimeLocalToDisplay(endDatetimeLocal) || '---'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-gray-700 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>恢复原始 1x</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!isRangeValid}
              onClick={handleApply}
              className={clsx(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95",
                isRangeValid
                  ? "bg-purple-600 hover:bg-purple-500 text-white"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              )}
            >
              <Check size={14} />
              <span>应用重修时间</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

