import React, { useState, useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { searchCountries, getCountryName } from '../data/countryNames';
import { searchHistoricalCountries } from '../data/historicalCountries';
import DrawCountryOverlay from './DrawCountryOverlay';
import { X, AlertCircle, Loader2, Maximize, Minimize, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { getSavedCustomCountries, deleteCustomCountry, CustomCountry, downloadCustomCountryAsFile, importCustomCountryFromJSON, shareOrDownloadCustomCountry } from '../utils/customCountryStore';

export default function SetupPanel() {
  const initSimulation = useSimulationStore(s => s.initSimulation);
  const mapInstance = useSimulationStore(s => s.mapInstance);
  
  const [redSearch, setRedSearch] = useState('');
  const [blueSearch, setBlueSearch] = useState('');
  const [isDrawOverlayActive, setIsDrawOverlayActive] = useState(false);
  const [editingCustomCountry, setEditingCustomCountry] = useState<CustomCountry | null>(null);
  const [customCountries, setCustomCountries] = useState(getSavedCustomCountries());
  const [isSavedCountriesOpen, setIsSavedCountriesOpen] = useState(false);
  const [isGridDensityOpen, setIsGridDensityOpen] = useState(false);
  const [deletingCustomId, setDeletingCustomId] = useState<string | null>(null);
  const [overlapPriority, setOverlapPriority] = useState<'red' | 'blue'>('red');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleImportCountryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importCustomCountryFromJSON(content);
        const updatedList = getSavedCustomCountries();
        setCustomCountries(updatedList);
        alert(`🎉 成功导入自定义国家：“${imported.name}”！`);
      } catch (err: any) {
        alert(`⚠️ 导入失败：${err.message || '无效的文件格式'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  const [scenario, setScenario] = useState<'modern' | 'ww2' | 'ww1' | 'custom_draw'>('modern');
  
  const [redAlliance, setRedAlliance] = useState<{ iso3: string; name: string }[]>([
    { iso3: 'CHN', name: '中国' }
  ]);
  const [blueAlliance, setBlueAlliance] = useState<{ iso3: string; name: string }[]>([
    { iso3: 'IND', name: '印度' }
  ]);

  const redIso = redAlliance.map(c => c.iso3).join(',');
  const blueIso = blueAlliance.map(c => c.iso3).join(',');
  const redName = redAlliance.map(c => c.name).join(' + ');
  const blueName = blueAlliance.map(c => c.name).join(' + ');

  const [startYear, setStartYear] = useState(2023);
  const [startMonth, setStartMonth] = useState(1);
  const [startDay, setStartDay] = useState(1);
  const [seed, setSeed] = useState(Math.random().toString(36).substring(7));
  const [mode, setMode] = useState<'balanced' | 'red_adv' | 'blue_adv' | 'random' | 'surprise_attack'>('balanced');
  const [surpriseAttackDuration, setSurpriseAttackDuration] = useState<number>(7);
  const [era, setEra] = useState<'modern' | 'cold_war' | 'ww2' | 'ww1' | 'nineteenth_century'>('modern');
  const [mapResolution, setMapResolution] = useState<'auto' | 'ultra' | 'detailed' | 'standard' | 'coarse' | 'neighborhood' | 'community' | 'street'>('ultra');
  const [advancedCombatMode, setAdvancedCombatMode] = useState(true);
  const [disableLanding, setDisableLanding] = useState(false);
  const [delayAdvance, setDelayAdvance] = useState(false);
  const [disableCapitalPenetration, setDisableCapitalPenetration] = useState(false);

  const [evalMode, setEvalMode] = useState<'ai' | 'local'>('ai');
  const [redScore, setRedScore] = useState(100);
  const [blueScore, setBlueScore] = useState(100);
  const [redCasualty, setRedCasualty] = useState(1.0);
  const [blueCasualty, setBlueCasualty] = useState(1.0);
  const [redTroops, setRedTroops] = useState(1000000);
  const [redReserves, setRedReserves] = useState(500000);
  const [blueTroops, setBlueTroops] = useState(1000000);
  const [blueReserves, setBlueReserves] = useState(500000);
  const [useMilitaryDatabase, setUseMilitaryDatabase] = useState(true);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCommanderDrawing, setIsCommanderDrawing] = useState(false);

  // Auto-load saved setup configuration on mount to preserve previous settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sim_setup_config');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.redAlliance && Array.isArray(p.redAlliance) && p.redAlliance.length > 0) setRedAlliance(p.redAlliance);
        if (p.blueAlliance && Array.isArray(p.blueAlliance) && p.blueAlliance.length > 0) setBlueAlliance(p.blueAlliance);
        if (p.mapResolution) setMapResolution(p.mapResolution);
        if (p.startYear) setStartYear(p.startYear);
        if (p.startMonth) setStartMonth(p.startMonth);
        if (p.startDay) setStartDay(p.startDay);
        if (p.mode) setMode(['red_adv', 'blue_adv', 'random'].includes(p.mode) ? 'balanced' : p.mode);
        if (p.surpriseAttackDuration) setSurpriseAttackDuration(p.surpriseAttackDuration);
        if (p.era) setEra(p.era);
        if (p.advancedCombatMode !== undefined) setAdvancedCombatMode(p.advancedCombatMode);
        if (p.disableLanding !== undefined) setDisableLanding(p.disableLanding);
        if (p.delayAdvance !== undefined) setDelayAdvance(p.delayAdvance);
        if (p.disableCapitalPenetration !== undefined) setDisableCapitalPenetration(p.disableCapitalPenetration);
        if (p.evalMode) setEvalMode(p.evalMode);
        if (p.redScore) setRedScore(p.redScore);
        if (p.blueScore) setBlueScore(p.blueScore);
        if (p.redCasualty) setRedCasualty(p.redCasualty);
        if (p.blueCasualty) setBlueCasualty(p.blueCasualty);
        if (p.redTroops) setRedTroops(p.redTroops);
        if (p.redReserves) setRedReserves(p.redReserves);
        if (p.blueTroops) setBlueTroops(p.blueTroops);
        if (p.blueReserves) setBlueReserves(p.blueReserves);
        if (p.scenario) setScenario(p.scenario);
        if (p.countryMode) setCountryMode(p.countryMode);
        if (p.redCustomInput) setRedCustomInput(p.redCustomInput);
        if (p.blueCustomInput) setBlueCustomInput(p.blueCustomInput);
        if (p.useMilitaryDatabase !== undefined) setUseMilitaryDatabase(p.useMilitaryDatabase);
        if (p.overlapPriority) setOverlapPriority(p.overlapPriority);
      }
    } catch (e) {
      console.warn("Failed to load saved setup config from localStorage:", e);
    }
  }, []);

  const saveCurrentSetup = () => {
    try {
      const config = {
        redAlliance,
        blueAlliance,
        mapResolution,
        startYear,
        startMonth,
        startDay,
        mode,
        surpriseAttackDuration,
        era,
        advancedCombatMode,
        disableLanding,
        delayAdvance,
        disableCapitalPenetration,
        evalMode,
        redScore,
        blueScore,
        redCasualty,
        blueCasualty,
        redTroops,
        redReserves,
        blueTroops,
        blueReserves,
        scenario,
        countryMode,
        redCustomInput,
        blueCustomInput,
        useMilitaryDatabase,
        overlapPriority
      };
      localStorage.setItem('sim_setup_config', JSON.stringify(config));
    } catch (e) {}
  };

  // Auto-fetch military data from database
  useEffect(() => {
    if (useMilitaryDatabase && evalMode === 'local') {
      const fetchMils = async () => {
        try {
          const [redRes, blueRes] = await Promise.all([
            fetch(`/api/military-data?code=${encodeURIComponent(redIso)}&era=${encodeURIComponent(era)}`),
            fetch(`/api/military-data?code=${encodeURIComponent(blueIso)}&era=${encodeURIComponent(era)}`)
          ]);
          if (redRes.ok && blueRes.ok) {
            const rData = await redRes.json();
            const bData = await blueRes.json();
            setRedTroops(rData.active);
            setRedReserves(rData.reserve);
            setBlueTroops(bData.active);
            setBlueReserves(bData.reserve);
          }
        } catch (e) {
          // In development, this might happen during dev server restart.
          console.warn("Could not fetch military database data (server might be restarting).", e);
        }
      };
      fetchMils();
    }
  }, [redIso, blueIso, era, useMilitaryDatabase, evalMode]);

  const [countryMode, setCountryMode] = useState<'standard' | 'custom'>('standard');
  const [redCustomInput, setRedCustomInput] = useState('');
  const [blueCustomInput, setBlueCustomInput] = useState('');
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [mapGenerationMessage, setMapGenerationMessage] = useState('');
  const isEditMode = useSimulationStore(s => s.isEditMode);
  const lockMap = useSimulationStore(s => s.lockMap);
  const setLockMap = useSimulationStore(s => s.setLockMap);
  const brushType = useSimulationStore(s => s.brushType);
  const brushRadius = useSimulationStore(s => s.brushRadius);
  const setEditMode = useSimulationStore(s => s.setEditMode);
  const setBrushType = useSimulationStore(s => s.setBrushType);
  const setBrushRadius = useSimulationStore(s => s.setBrushRadius);
  const clearAllCells = useSimulationStore(s => s.clearAllCells);

  const getSearchResults = (query: string) => {
    if (!query) return [];
    const lower = query.toLowerCase().trim();
    if (scenario === 'modern') {
      return searchCountries(lower).map(c => ({
        ...c,
        name: c.name.replace(/^🎨\s*\[.*?\]\s*/, '').replace(/^\d+:\s*/, '')
      }));
    } else {
      const customMatches = searchCountries(lower)
        .filter(c => c.iso3.startsWith('CUSTOM_'))
        .map(c => ({ 
          iso2: c.iso2, 
          iso3: c.iso3, 
          name: c.name.replace(/^🎨\s*\[.*?\]\s*/, '').replace(/^\d+:\s*/, '')
        }));
      
      const histMatches = searchHistoricalCountries(lower, scenario as any).map(c => ({
        iso2: c.iso3,
        iso3: c.iso3,
        name: c.name
      }));
      return [...customMatches, ...histMatches];
    }
  };

  const handleGenerateCustomCountries = async () => {
    if (!redCustomInput.trim() || !blueCustomInput.trim()) {
      setError('请完整输入两个历史/自定义国家名称。');
      return;
    }
    setIsGeneratingMap(true);
    setMapGenerationMessage('AI正在进行深层地缘分析，重构高贴合且无镂空的现代等价疆域中...');
    setError('');
    try {
      const res = await fetch('/api/generate-custom-countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redName: redCustomInput, blueName: blueCustomInput })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.redIsos && data.blueIsos && data.redIsos.length > 0 && data.blueIsos.length > 0) {
          setRedAlliance(data.redIsos.map((iso: string) => ({ iso3: iso, name: getCountryName(iso) || iso })));
          setBlueAlliance(data.blueIsos.map((iso: string) => ({ iso3: iso, name: getCountryName(iso) || iso })));
          setMapGenerationMessage(`疆域地缘对照生成成功！红方现代等价辖区: ${data.redIsos.join(', ')}；蓝方现代等价辖区: ${data.blueIsos.join(', ')}。`);
        } else {
          setError('AI生成的国家地理对照码为空，请使用更具体或更知名的国家名称重试。');
        }
      } else {
        const errData = await res.json();
        setError(errData.error || 'AI生成疆域失败，请稍后重试。');
      }
    } catch (err) {
      setError('生成疆域发生网络错误。');
    } finally {
      setIsGeneratingMap(false);
    }
  };

  const handleStart = async () => {
    saveCurrentSetup();
    let currentRedIso = redIso;
    let currentBlueIso = blueIso;

    setLoading(true);
    setError('');

    // If custom drawing scenario is active, we check if there are painted cells
    const isDrawingScenario = scenario === 'custom_draw';
    if (isDrawingScenario) {
      const cells = useSimulationStore.getState().cells;
      const redCells = Object.values(cells).filter(c => c.owner === 'red');
      const blueCells = Object.values(cells).filter(c => c.owner === 'blue');
      if (redCells.length === 0 || blueCells.length === 0) {
        setError('请先在地图上涂画双方领土（点击右上角“绘制地图”）。');
        setLoading(false);
        return;
      }
      // For drawing mode, we use CHN/USA as dummy ISOs just for profile generation context if needed
      currentRedIso = 'CHN';
      currentBlueIso = 'USA';
    } else if (countryMode === 'custom') {
      if (!redCustomInput.trim() || !blueCustomInput.trim()) {
        setError('请输入完整的红方与蓝方自定义/历史国名。');
        setLoading(false);
        return;
      }

      if (redAlliance.length === 0 || blueAlliance.length === 0 || mapGenerationMessage === '') {
        setIsGeneratingMap(true);
        setMapGenerationMessage('AI正在进行深层地缘分析，为您重构贴合疆域中...');
        try {
          const customRes = await fetch('/api/generate-custom-countries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ redName: redCustomInput, blueName: blueCustomInput })
          });
          if (customRes.ok) {
            const customData = await customRes.json();
            if (customData.redIsos && customData.blueIsos && customData.redIsos.length > 0 && customData.blueIsos.length > 0) {
              const newRed = customData.redIsos.map((iso: string) => ({ iso3: iso, name: getCountryName(iso) || iso }));
              const newBlue = customData.blueIsos.map((iso: string) => ({ iso3: iso, name: getCountryName(iso) || iso }));
              setRedAlliance(newRed);
              setBlueAlliance(newBlue);
              currentRedIso = customData.redIsos.join(',');
              currentBlueIso = customData.blueIsos.join(',');
              setMapGenerationMessage(`地缘对比生成成功！`);
            } else {
              setError('生成自定义疆域失败，请重试或使用知名国家名称。');
              setIsGeneratingMap(false);
              setLoading(false);
              return;
            }
          } else {
            setError('网络解析自定义国家失败，请重试。');
            setIsGeneratingMap(false);
            setLoading(false);
            return;
          }
        } catch (e) {
          setError('生成自定义疆域出现网络错误。');
          setIsGeneratingMap(false);
          setLoading(false);
          return;
        } finally {
          setIsGeneratingMap(false);
        }
      }
    }

    if (currentRedIso === currentBlueIso && currentRedIso !== '') {
      setError('双方不能选择完全相同的国家组合。');
      setLoading(false);
      return;
    }

    // AI Deep Thinking Phased Messages
    const phases = [
      '正在进行全球军情资料库深度检索...',
      '正在建模双方历史兵力对比与兵源潜能...',
      '正在结合地缘政治因素分析双方战略重心...',
      '正在推演最贴合实战的战损比与战术参数...',
      '参谋部方案汇总中，准备部署沙盘...'
    ];
    
    let phaseIdx = 0;
    setCurrentPhase(phases[0]);
    const interval = setInterval(() => {
      if (phaseIdx < phases.length - 1) {
        phaseIdx++;
        setCurrentPhase(phases[phaseIdx]);
      }
    }, 2000);

    const formattedDate = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    
    try {
      const customOverrides = {
        redScore,
        blueScore,
        redCasualtyModifier: redCasualty,
        blueCasualtyModifier: blueCasualty,
        redTroops,
        redReserves,
        blueTroops,
        blueReserves,
        customRedName: isDrawingScenario ? customSaveNameRed : (countryMode === 'custom' ? redCustomInput : undefined),
        customBlueName: isDrawingScenario ? customSaveNameBlue : (countryMode === 'custom' ? blueCustomInput : undefined),
        useExistingCells: isDrawingScenario,
        scenario,
        overlapPriority,
        disableLanding,
        delayAdvance,
        disableCapitalPenetration,
        surpriseAttackDuration: mode === 'surprise_attack' ? surpriseAttackDuration : undefined
      };

      const res = await initSimulation(currentRedIso, currentBlueIso, seed, formattedDate, mode, era, evalMode, customOverrides, advancedCombatMode, mapResolution);

      if (typeof res === 'string') {
        setError(res);
      }
    } catch (err) {
      setError('初始化模拟失败');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleLoadAuto = () => {
    try {
      const data = localStorage.getItem('simulation_autosave');
      if (data) {
        useSimulationStore.getState().loadState(JSON.parse(data));
      }
    } catch (e) {
      setError('无法加载自动保存的进度。');
    }
  };

  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [customSaveNameRed, setCustomSaveNameRed] = useState('自定义红国');
  const [customSaveNameBlue, setCustomSaveNameBlue] = useState('自定义蓝国');
  const [showSaveCountryModal, setShowSaveCountryModal] = useState(false);

  const handleSaveMapAsCustomCountry = () => {
    const cells = useSimulationStore.getState().cells;
    const redCellCount = Object.values(cells).filter(c => c.owner === 'red').length;
    const blueCellCount = Object.values(cells).filter(c => c.owner === 'blue').length;
    if (redCellCount === 0 || blueCellCount === 0) {
      alert('请至少在地图上涂画一些红方和蓝方的领土领地！');
      return;
    }
    setScenario('custom_draw');
    setCountryMode('standard');
    setShowSaveCountryModal(false);
    saveCurrentSetup();
    alert(`已将自定版图成功保存为剧本：绘制国家！势力名称：「${customSaveNameRed}」与「${customSaveNameBlue}」。`);
  };

  if (isDrawOverlayActive) {
    return (
      <DrawCountryOverlay
        map={mapInstance}
        initialCountry={editingCustomCountry}
        onClose={() => {
          setIsDrawOverlayActive(false);
          setEditingCustomCountry(null);
        }}
        onSavedUpdate={() => {
          setCustomCountries(getSavedCustomCountries());
        }}
        onSaved={(customId, customName) => {
          setIsDrawOverlayActive(false);
          setEditingCustomCountry(null);
          setCustomCountries(getSavedCustomCountries());
          
          // Update name in alliances if it already exists, or auto-add if appropriate
          const updateAlliance = (list: { iso3: string; name: string }[]) => 
            list.map(a => a.iso3 === customId ? { ...a, name: customName } : a);

          setRedAlliance(prev => updateAlliance(prev));
          setBlueAlliance(prev => updateAlliance(prev));

          const isInAny = redAlliance.some(a => a.iso3 === customId) || blueAlliance.some(a => a.iso3 === customId);
          
          if (!isInAny) {
            if (redAlliance.length === 0) {
              setRedAlliance([{ iso3: customId, name: customName }]);
            } else {
              setBlueAlliance(prev => [...prev, { iso3: customId, name: customName }]);
            }
          }
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/40 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto pointer-events-auto">
      <div className="w-full max-w-xl glass-card border border-white/10 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-200 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 sticky top-0 bg-black/30 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-xl border border-red-500/20">
              <span className="text-lg">⚔️</span>
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">战争模拟配置</h2>
              <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-bold mt-0.5">战略推演参谋部</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFullscreen}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 border border-white/10"
              title={isFullscreen ? "退出全屏" : "全屏显示"}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
              <span>{isFullscreen ? "还原" : "全屏"}</span>
            </button>

            <button 
              onClick={() => setIsDrawOverlayActive(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <span>🖌️ 绘制领土</span>
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-8 scrollbar-hide">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[11px] font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
             <button 
               onClick={handleLoadAuto}
               className="flex items-center justify-center gap-2 py-3 bg-white/[0.03] border border-white/5 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl text-[11px] font-black transition-all active:scale-95 uppercase tracking-widest"
             >
               📂 加载自动存档
             </button>
             <button 
               onClick={() => {
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
                         alert('🎉 成功导入并加载推演配置/存档！');
                       } catch (err) {
                         alert('导入失败: 无法解析 JSON。');
                       }
                     };
                     reader.readAsText(file);
                   }
                 };
                 input.click();
               }}
               className="flex items-center justify-center gap-2 py-3 bg-white/[0.03] border border-white/5 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl text-[11px] font-black transition-all active:scale-95 uppercase tracking-widest cursor-pointer"
             >
               📥 导入配置
             </button>
          </div>

          {/* Core Settings Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">战役开局预设</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'balanced', label: '常规对攻', icon: '⚖️' },
                  { id: 'surprise_attack', label: '闪击突袭', icon: '🔥' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id as any)}
                    className={clsx(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 cursor-pointer",
                      mode === opt.id
                        ? "bg-white text-black border-white shadow-xl"
                        : "bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/5"
                    )}
                  >
                    <span className="text-lg mb-1">{opt.icon}</span>
                    <span className="text-[10px] font-black whitespace-nowrap">{opt.label}</span>
                  </button>
                ))}
              </div>

              {mode === 'surprise_attack' && (
                <div className="p-3.5 bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/25 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-red-300 flex items-center gap-1.5">
                      <span>⚡ 突袭持续回合数</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-200 border border-red-500/30 font-bold">
                        第 1 ~ {surpriseAttackDuration} 回合
                      </span>
                    </label>
                    <span className="text-[9px] text-white/40 font-mono">自定义输入</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={surpriseAttackDuration}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setSurpriseAttackDuration(isNaN(val) ? 1 : Math.max(1, Math.min(100, val)));
                        }}
                        className="w-20 bg-black/50 border border-red-500/40 rounded-xl px-2.5 py-1.5 text-xs font-black text-white text-center focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/50"
                        placeholder="回合数"
                      />
                      <span className="ml-1 text-[10px] text-red-200/70 font-bold">回</span>
                    </div>

                    <div className="flex items-center gap-1 flex-1">
                      {[3, 5, 7, 10, 15].map(turns => (
                        <button
                          key={turns}
                          type="button"
                          onClick={() => setSurpriseAttackDuration(turns)}
                          className={clsx(
                            "flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all active:scale-95 cursor-pointer border",
                            surpriseAttackDuration === turns
                              ? "bg-red-500 text-white border-red-400 shadow-sm"
                              : "bg-white/[0.04] hover:bg-white/[0.08] text-white/60 border-white/5"
                          )}
                        >
                          {turns}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-[10px] text-red-200/70 leading-relaxed bg-black/20 p-2 rounded-xl border border-red-500/10 space-y-0.5">
                    <div>• <b className="text-red-300">突袭期(1~{surpriseAttackDuration}回)</b>：防守方全力防守不会反攻，进攻方撕开突破口。</div>
                    <div>• <b className="text-orange-300">转换期(第{surpriseAttackDuration}回)</b>：防守方吹响反攻号角，进攻方在2-3个扇区维持余威攻势。</div>
                    <div>• <b className="text-sky-300">反攻期(第{surpriseAttackDuration + 1}回及之后)</b>：进攻方停滞不再进攻，防守方展开全线反攻！</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Saved Custom Countries Management Section */}
          <div className="space-y-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-3xl transition-all">
            <div 
              className="flex items-center justify-between px-1 cursor-pointer select-none"
              onClick={() => setIsSavedCountriesOpen(!isSavedCountriesOpen)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🎨</span>
                <label className="text-[10px] font-black text-amber-300 uppercase tracking-[0.2em] cursor-pointer">
                  已保存自定义领土 ({customCountries.length})
                </label>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSavedCountriesOpen(!isSavedCountriesOpen);
                }}
                className="text-amber-300/70 hover:text-amber-300 text-xs font-bold flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 cursor-pointer"
              >
                <span>{isSavedCountriesOpen ? '收起' : '展开列表'}</span>
                {isSavedCountriesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {isSavedCountriesOpen && (
              <div className="space-y-3 pt-2 border-t border-amber-500/10 animate-in fade-in duration-200">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded-xl text-[10px] font-black transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <span>📥 导入国家</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCustomCountry(null);
                      setIsDrawOverlayActive(true);
                    }}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-black transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ 绘制新领土</span>
                  </button>
                </div>

                {customCountries.length === 0 ? (
                  <div className="p-4 bg-black/30 rounded-2xl border border-dashed border-white/10 text-center">
                    <p className="text-[10px] text-white/40 font-bold mb-2">暂无已保存的自定义领土</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomCountry(null);
                        setIsDrawOverlayActive(true);
                      }}
                      className="px-3 py-1.5 bg-amber-500 text-black font-black rounded-xl text-[10px] hover:bg-amber-400 transition-all active:scale-95 cursor-pointer"
                    >
                      🖌️ 立即手绘自定义国家
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                    {customCountries.map(c => {
                      const isRed = redAlliance.some(a => a.iso3 === c.id);
                      const isBlue = blueAlliance.some(a => a.iso3 === c.id);
                      return (
                        <div 
                          key={c.id}
                          className="p-3 bg-black/40 border border-white/10 hover:border-amber-500/40 rounded-2xl flex flex-col gap-2 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <span className="text-xs">🎨</span>
                              <span className="text-xs font-black text-white truncate max-w-[110px]">{c.name}</span>
                              {c.capital?.name && (
                                <span className="text-[9px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded font-mono truncate max-w-[70px]">
                                  首府: {c.capital.name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCustomCountry(c);
                                  setIsDrawOverlayActive(true);
                                }}
                                className="p-1 text-white/50 hover:text-amber-300 hover:bg-white/10 rounded-lg transition-colors text-[10px] cursor-pointer"
                                title="重新编辑领土"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => shareOrDownloadCustomCountry(c)}
                                className="p-1 text-white/50 hover:text-indigo-300 hover:bg-white/10 rounded-lg transition-colors text-[10px] cursor-pointer"
                                title="导出 JSON 文件"
                              >
                                📤
                              </button>
                              {deletingCustomId === c.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteCustomCountry(c.id);
                                      setCustomCountries(getSavedCustomCountries());
                                      setRedAlliance(prev => prev.filter(a => a.iso3 !== c.id));
                                      setBlueAlliance(prev => prev.filter(a => a.iso3 !== c.id));
                                      setDeletingCustomId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-red-500/30 hover:bg-red-500/50 text-red-200 border border-red-500/50 rounded-lg text-[9px] font-black transition-all cursor-pointer"
                                    title="确认删除"
                                  >
                                    确认
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingCustomId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 text-white/60 border border-white/10 rounded-lg text-[9px] font-black transition-all cursor-pointer"
                                    title="取消"
                                  >
                                    取消
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingCustomId(c.id);
                                  }}
                                  className="p-1 text-white/40 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-[10px] cursor-pointer"
                                  title="删除"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (isRed) {
                                  setRedAlliance(prev => prev.filter(a => a.iso3 !== c.id));
                                } else {
                                  setRedAlliance(prev => [...prev.filter(a => a.iso3 !== c.id), { iso3: c.id, name: `🎨 [自定义] ${c.name}` }]);
                                  setBlueAlliance(prev => prev.filter(a => a.iso3 !== c.id));
                                }
                              }}
                              className={clsx(
                                "flex-1 py-1 rounded-xl text-[10px] font-black transition-all border cursor-pointer",
                                isRed 
                                  ? "bg-red-500/30 text-red-200 border-red-500/50" 
                                  : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                              )}
                            >
                              {isRed ? '✓ 已入红方' : '+ 指派红方'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (isBlue) {
                                  setBlueAlliance(prev => prev.filter(a => a.iso3 !== c.id));
                                } else {
                                  setBlueAlliance(prev => [...prev.filter(a => a.iso3 !== c.id), { iso3: c.id, name: `🎨 [自定义] ${c.name}` }]);
                                  setRedAlliance(prev => prev.filter(a => a.iso3 !== c.id));
                                }
                              }}
                              className={clsx(
                                "flex-1 py-1 rounded-xl text-[10px] font-black transition-all border cursor-pointer",
                                isBlue 
                                  ? "bg-blue-500/30 text-blue-200 border-blue-500/50" 
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                              )}
                            >
                              {isBlue ? '✓ 已入蓝方' : '+ 指派蓝方'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Country Selection Area */}
          <div className="space-y-6">
            {countryMode === 'standard' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Red Alliance */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">红方阵营</label>
                    <span className="text-[9px] text-white/20 font-bold uppercase">Multi-select</span>
                  </div>
                  <div className="flex flex-wrap gap-2 p-3 bg-black/40 border border-white/5 rounded-2xl min-h-[56px] items-center">
                    {redAlliance.length === 0 ? (
                      <span className="text-[10px] text-white/10 font-black italic w-full text-center">待指派参战国</span>
                    ) : (
                      redAlliance.map((c) => (
                        <div
                          key={c.iso3}
                          className="inline-flex items-center gap-2 bg-red-500/10 text-red-300 border border-red-500/20 text-[10px] font-black px-3 py-1.5 rounded-xl group hover:bg-red-500/20 transition-all cursor-default animate-in zoom-in-90"
                        >
                          {c.name.replace(/^🎨\s*\[.*?\]\s*/, '').replace(/^\d+:\s*/, '')}
                          <button
                            type="button"
                            onClick={() => setRedAlliance(redAlliance.filter(a => a.iso3 !== c.iso3))}
                            className="text-red-500 hover:text-white transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="relative group">
                    <input 
                      type="text" 
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-[11px] font-black focus:border-red-500/40 outline-none transition-all placeholder:text-white/10"
                      placeholder="搜索并加入红方盟国..."
                      value={redSearch}
                      onChange={e => setRedSearch(e.target.value)}
                    />
                    {redSearch && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl max-h-48 overflow-y-auto z-30 shadow-2xl p-2 animate-in slide-in-from-top-2">
                        {getSearchResults(redSearch).map(c => (
                          <button 
                            key={c.iso3} 
                            className="w-full p-3 hover:bg-white/5 rounded-xl flex items-center justify-between text-left transition-all"
                            onClick={() => {
                              if (!redAlliance.some(a => a.iso3 === c.iso3)) {
                                setRedAlliance([...redAlliance, { iso3: c.iso3, name: c.name }]);
                              }
                              setRedSearch('');
                            }}
                          >
                            <span className="text-[11px] font-black text-white/80">{c.name}</span>
                            <span className="text-[9px] text-white/20 font-mono">{c.iso3}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Blue Alliance */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">蓝方阵营</label>
                    <span className="text-[9px] text-white/20 font-bold uppercase">Multi-select</span>
                  </div>
                  <div className="flex flex-wrap gap-2 p-3 bg-black/40 border border-white/5 rounded-2xl min-h-[56px] items-center">
                    {blueAlliance.length === 0 ? (
                      <span className="text-[10px] text-white/10 font-black italic w-full text-center">待指派参战国</span>
                    ) : (
                      blueAlliance.map((c) => (
                        <div
                          key={c.iso3}
                          className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-black px-3 py-1.5 rounded-xl group hover:bg-blue-500/20 transition-all cursor-default animate-in zoom-in-90"
                        >
                          {c.name.replace(/^🎨\s*\[.*?\]\s*/, '').replace(/^\d+:\s*/, '')}
                          <button
                            type="button"
                            onClick={() => setBlueAlliance(blueAlliance.filter(a => a.iso3 !== c.iso3))}
                            className="text-blue-500 hover:text-white transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="relative group">
                    <input 
                      type="text" 
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-[11px] font-black focus:border-blue-500/40 outline-none transition-all placeholder:text-white/10"
                      placeholder="搜索并加入蓝方盟国..."
                      value={blueSearch}
                      onChange={e => setBlueSearch(e.target.value)}
                    />
                    {blueSearch && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl max-h-48 overflow-y-auto z-30 shadow-2xl p-2 animate-in slide-in-from-top-2">
                        {getSearchResults(blueSearch).map(c => (
                          <button 
                            key={c.iso3} 
                            className="w-full p-3 hover:bg-white/5 rounded-xl flex items-center justify-between text-left transition-all"
                            onClick={() => {
                              if (!blueAlliance.some(a => a.iso3 === c.iso3)) {
                                setBlueAlliance([...blueAlliance, { iso3: c.iso3, name: c.name }]);
                              }
                              setBlueSearch('');
                            }}
                          >
                            <span className="text-[11px] font-black text-white/80">{c.name}</span>
                            <span className="text-[9px] text-white/20 font-mono">{c.iso3}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-6 bg-white/[0.03] border border-white/5 rounded-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] px-1">红方自定义势力名</label>
                    <input 
                      type="text"
                      placeholder="如: 魏国 / 雅典同盟"
                      value={redCustomInput}
                      onChange={e => setRedCustomInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] font-black focus:border-red-500/40 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] px-1">蓝方自定义势力名</label>
                    <input 
                      type="text"
                      placeholder="如: 蜀国 / 斯巴达阵营"
                      value={blueCustomInput}
                      onChange={e => setBlueCustomInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] font-black focus:border-blue-500/40 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCustomCountries}
                  disabled={!redCustomInput.trim() || !blueCustomInput.trim() || isGeneratingMap}
                  className="w-full bg-indigo-500 hover:bg-indigo-400 text-black font-black text-[11px] py-4 rounded-2xl transition-all disabled:opacity-20 active:scale-95 uppercase tracking-widest"
                >
                  {isGeneratingMap ? 'AI 正在分析并拼合疆域...' : 'AI 解析生成匹配疆域'}
                </button>

                {mapGenerationMessage && (
                  <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl font-bold leading-relaxed italic animate-in slide-in-from-bottom-2">
                    ✨ {mapGenerationMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced Config Section */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Map Precision */}
              <div className="space-y-3 p-4 bg-white/[0.03] border border-white/5 rounded-3xl transition-all">
                <div 
                  className="flex items-center justify-between px-1 cursor-pointer select-none"
                  onClick={() => setIsGridDensityOpen(!isGridDensityOpen)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📐</span>
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] cursor-pointer">
                      兵棋网格精度 ({
                        {
                          auto: '智能适配',
                          room: '战术室内级 (~1m)',
                          building: '微观楼宇级 (~3m)',
                          street: '巷战路网级 (~10m)',
                          community: '微观社区级 (~30m)',
                          neighborhood: '中观街区级 (~100m)',
                          ultra: '城市级 (~300m)',
                          detailed: '极致精细 (~1km)',
                          standard: '标准均衡 (~5km)',
                          coarse: '轻量极速 (~10km)'
                        }[mapResolution] || mapResolution
                      })
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsGridDensityOpen(!isGridDensityOpen);
                    }}
                    className="text-white/60 hover:text-white text-xs font-bold flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10 cursor-pointer"
                  >
                    <span>{isGridDensityOpen ? '收起' : '展开设置'}</span>
                    {isGridDensityOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {isGridDensityOpen && (
                  <div className="space-y-4 pt-2 border-t border-white/5 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'auto', label: '智能适配 (推荐)', icon: '🤖' },
                        { id: 'room', label: '战术室内级 (~1m)', icon: '🚪' },
                        { id: 'building', label: '微观楼宇级 (~3m)', icon: '🏢' },
                        { id: 'street', label: '巷战路网级 (~10m)', icon: '⚔️' },
                        { id: 'community', label: '微观社区级 (~30m)', icon: '🏘️' },
                        { id: 'neighborhood', label: '中观街区级 (~100m)', icon: '🧱' },
                        { id: 'ultra', label: '城市级 (~300m)', icon: '🏙️' },
                        { id: 'detailed', label: '极致精细 (~1km)', icon: '🔍' },
                        { id: 'standard', label: '标准均衡 (~5km)', icon: '🏗️' },
                        { id: 'coarse', label: '轻量极速 (~10km)', icon: '⚡' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setMapResolution(opt.id as any)}
                          className={clsx(
                            "flex items-center gap-2 p-2.5 rounded-xl border transition-all active:scale-95 justify-start cursor-pointer",
                            opt.id === 'auto' ? "col-span-2 justify-center" : "",
                            mapResolution === opt.id
                              ? "bg-white text-black border-white shadow-lg"
                              : "bg-white/[0.03] border-white/5 text-white/40"
                          )}
                        >
                          <span className="text-sm">{opt.icon}</span>
                          <span className="text-[10px] font-black">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="text-[9px] text-white/35 leading-normal mt-2 px-1 space-y-1">
                      <p>💡 <span className="text-white/50 font-bold">微观/街区/楼宇/室内级</span> 专门针对 <span className="text-emerald-400 font-bold">沙盘绘制模式</span> 下的建筑物、街巷、社区微观斗争而设计，提供极致的战术网格还原。</p>
                      <p>⚠️ 推演大国或大范围疆域时，系统会自动将精度限制在合适范围以防卡顿。</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Date Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] px-1">模拟起始时间</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[8px] text-white/20 uppercase font-bold ml-1">年份</span>
                    <input 
                      type="number" 
                      value={startYear} 
                      onChange={e => setStartYear(parseInt(e.target.value) || 2023)} 
                      className="w-full bg-white/[0.03] border border-white/5 rounded-xl p-3 text-[10px] font-black outline-none focus:border-white/20" 
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-white/20 uppercase font-bold ml-1">月份</span>
                    <select 
                      value={startMonth} 
                      onChange={e => setStartMonth(parseInt(e.target.value))} 
                      className="w-full bg-white/[0.03] border border-white/5 rounded-xl p-3 text-[10px] font-black outline-none appearance-none cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m}月</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-white/20 uppercase font-bold ml-1">日期</span>
                    <input 
                      type="number" 
                      value={startDay} 
                      onChange={e => setStartDay(parseInt(e.target.value) || 1)} 
                      className="w-full bg-white/[0.03] border border-white/5 rounded-xl p-3 text-[10px] font-black outline-none focus:border-white/20" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Evaluation Toggle Overlay */}
            <div className="flex flex-col gap-4 p-5 bg-white/[0.03] border border-white/5 rounded-3xl">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">推演决策核心</label>
                <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                  <button
                    onClick={() => setEvalMode('ai')}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all",
                      evalMode === 'ai' ? "bg-white text-black" : "text-white/40"
                    )}
                  >
                    🤖 AI 深度分析
                  </button>
                  <button
                    onClick={() => setEvalMode('local')}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all",
                      evalMode === 'local' ? "bg-white text-black" : "text-white/40"
                    )}
                  >
                    ⚙️ 本地规则设定
                  </button>
                </div>
              </div>

              {evalMode === 'local' && (
                <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">红方核心参数</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={useMilitaryDatabase} onChange={e => setUseMilitaryDatabase(e.target.checked)} className="w-3 h-3 rounded-full border-white/10 bg-black/40 accent-red-500" />
                        <span className="text-[8px] text-white/20 font-bold">自动调配</span>
                      </label>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[8px] text-white/20 uppercase font-bold ml-1">综合战力</span>
                          <input type="number" value={redScore} onChange={e => setRedScore(parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] font-black text-red-300" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-white/20 uppercase font-bold ml-1">战损修正</span>
                          <input type="number" step="0.1" value={redCasualty} onChange={e => setRedCasualty(parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] font-black text-red-300" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] text-white/20 uppercase font-bold ml-1">部署现役兵力</span>
                        <input type="number" disabled={useMilitaryDatabase} value={redTroops} onChange={e => setRedTroops(parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] font-black text-red-300 disabled:opacity-20" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">蓝方核心参数</span>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[8px] text-white/20 uppercase font-bold ml-1">综合战力</span>
                          <input type="number" value={blueScore} onChange={e => setBlueScore(parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] font-black text-blue-300" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-white/20 uppercase font-bold ml-1">战损修正</span>
                          <input type="number" step="0.1" value={blueCasualty} onChange={e => setBlueCasualty(parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] font-black text-blue-300" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] text-white/20 uppercase font-bold ml-1">部署现役兵力</span>
                        <input type="number" disabled={useMilitaryDatabase} value={blueTroops} onChange={e => setBlueTroops(parseInt(e.target.value) || 0)} className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-[10px] font-black text-blue-300 disabled:opacity-20" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Overlap Priority Setting */}
            <div className="flex flex-col gap-3 p-5 bg-white/[0.03] border border-white/5 rounded-3xl">
              <div className="flex items-center justify-between px-1">
                <div className="space-y-0.5 max-w-[60%]">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">双方重叠领土归属</label>
                  <p className="text-[8px] text-white/20 font-bold leading-normal">若双方初始领土存在边界重叠，设定优先划归哪一方。</p>
                </div>
                <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                  <button
                    onClick={() => {
                      setOverlapPriority('red');
                      setTimeout(saveCurrentSetup, 0);
                    }}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer",
                      overlapPriority === 'red' ? "bg-red-500/20 text-red-300" : "text-white/40 hover:text-white"
                    )}
                  >
                    🔴 红方优先
                  </button>
                  <button
                    onClick={() => {
                      setOverlapPriority('blue');
                      setTimeout(saveCurrentSetup, 0);
                    }}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all cursor-pointer",
                      overlapPriority === 'blue' ? "bg-blue-500/20 text-blue-300" : "text-white/40 hover:text-white"
                    )}
                  >
                    🔵 蓝方优先
                  </button>
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              {[
                { 
                  id: 'advanced', 
                  label: '启用高级战争艺术模式', 
                  sub: '启用后，AI 将推演纵深穿插、合围截断补给线等复杂战术逻辑。',
                  checked: advancedCombatMode,
                  onChange: setAdvancedCombatMode
                },
                { 
                  id: 'landing', 
                  label: '关闭两栖登陆/海上突击功能', 
                  sub: '启用后，双方将无法通过海洋发起抢滩登陆。若不接壤，将进入战线对峙。',
                  checked: disableLanding,
                  onChange: setDisableLanding
                },
                {
                  id: "delayAdvance",
                  label: "开启延缓推进 (减速模式)",
                  sub: "打开后双方推进速度和穿插宽度速度长度都会减半，以防止推进过快。",
                  checked: delayAdvance,
                  onChange: setDelayAdvance
                },
                {
                  id: "disableCapitalPenetration",
                  label: "关闭首都穿插模式",
                  sub: "开启后，AI 推进和纵深穿插时不再识别和优先向敌方首都方向挺进。",
                  checked: disableCapitalPenetration,
                  onChange: setDisableCapitalPenetration
                }
              ].map(opt => (
                <label key={opt.id} className="flex items-start gap-4 p-5 bg-white/[0.03] border border-white/5 rounded-3xl transition-all hover:bg-white/[0.05] cursor-pointer select-none">
                  <div className="relative inline-flex items-center mt-1">
                    <input 
                      type="checkbox" 
                      checked={opt.checked} 
                      onChange={e => opt.onChange(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-xl"></div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-black text-white">{opt.label}</span>
                    <p className="text-[9px] text-white/30 leading-relaxed font-bold italic">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-xl sticky bottom-0 z-20">
          <button 
            onClick={handleStart}
            disabled={loading || !(scenario === 'custom_draw' || countryMode === 'standard' || (redCustomInput.trim() !== '' && blueCustomInput.trim() !== '' && redName === redCustomInput && blueName === blueCustomInput))}
            className="w-full py-4 bg-white hover:bg-gray-100 disabled:opacity-20 text-black font-black text-sm rounded-2xl transition-all shadow-2xl active:scale-[0.98] uppercase tracking-[0.2em]"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 size={20} className="animate-spin" />
                <span>参谋部推演中...</span>
              </div>
            ) : (
              scenario === 'custom_draw' ? '进入沙盘绘制模式' : '立即启动深度战争推演'
            )}
          </button>
        </div>
      </div>

      {/* Hidden file input for importing custom country JSON */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleImportCountryFile}
        className="hidden"
      />
    </div>
  );
}
