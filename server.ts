import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini API Client
let aiClient: GoogleGenAI | null = null;

function isValidApiKey(key: string | undefined): boolean {
  if (!key) return false;
  // Common placeholders or obviously too short keys are considered invalid
  if (key.startsWith('YOUR_') || key.includes('API_KEY') || key.length < 10) return false;
  return true;
}

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!isValidApiKey(key)) {
      console.warn("WARNING: GEMINI_API_KEY is missing or invalid. AI features will be disabled.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key!,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

function getLocalFallbackCustomCountries(redName: string, blueName: string) {
  const red = (redName || '').toLowerCase();
  const blue = (blueName || '').toLowerCase();
  
  if (red.includes('德') || red.includes('germany') || red.includes('普鲁士')) {
    if (blue.includes('俄') || blue.includes('苏') || blue.includes('russia') || blue.includes('soviet')) {
      return { redIsos: ["DEU", "POL", "CZE", "AUT"], blueIsos: ["RUS", "BLR", "UKR", "LVA", "LTU", "EST"] };
    }
  }
  if (red.includes('罗马') || red.includes('rome')) {
    if (blue.includes('迦太基') || blue.includes('carthage') || blue.includes('突尼斯')) {
      return { redIsos: ["ITA", "GRC", "ESP", "FRA"], blueIsos: ["TUN", "DZA", "LBY"] };
    }
  }
  if (red.includes('希腊') || red.includes('greece')) {
    if (blue.includes('波斯') || blue.includes('土耳其') || blue.includes('persia') || blue.includes('turkey')) {
      return { redIsos: ["GRC"], blueIsos: ["TUR", "IRN"] };
    }
  }
  if (red.includes('法') || red.includes('france')) {
    if (blue.includes('德') || blue.includes('germany') || blue.includes('普鲁士')) {
      return { redIsos: ["FRA", "BEL"], blueIsos: ["DEU", "CZE"] };
    }
  }
  
  // Reasonable neighbor countries as standard fallback
  return { redIsos: ["DEU", "AUT", "CZE"], blueIsos: ["FRA", "BEL", "NLD"] };
}

// Secure API Route for unified Military Strength & Profile Generation
app.post('/api/generate-custom-countries', async (req, res) => {
  const { redName, blueName } = req.body;
  if (!redName || !blueName) {
    return res.status(400).json({ error: 'Missing country names' });
  }

  try {
    const ai = getAiClient();
    if (!ai) {
      console.warn("No valid GEMINI_API_KEY available for custom countries. Using local mapping fallback.");
      return res.json(getLocalFallbackCustomCountries(redName, blueName));
    }
    
    const prompt = `User wants to simulate a war between "${redName}" and "${blueName}". 
Please map these two historical/custom countries to a list of modern ISO 3166-1 alpha-3 country codes.
CRITICAL: The two countries MUST share a land border or be very close. They must NOT have any holes or empty neutral countries between them.
If they were historically separated by buffer states, distribute the buffer states between them so their borders touch perfectly.
For example, if Nazi Germany and Soviet Union, give Poland to them so they touch.
Return ONLY valid ISO 3166-1 alpha-3 codes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            redIsos: { type: Type.ARRAY, items: { type: Type.STRING } },
            blueIsos: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["redIsos", "blueIsos"]
        }
      }
    });
    
    const text = response.text;
    if (text) {
      return res.json(JSON.parse(text));
    } else {
      throw new Error("Empty response from AI");
    }
  } catch (error: any) {
    console.warn('Custom Country AI Error, falling back to local mapping:', error.message || error);
    try {
      return res.json(getLocalFallbackCustomCountries(redName, blueName));
    } catch (fallbackError) {
      res.status(500).json({ error: 'Failed to generate custom countries' });
    }
  }
});

app.post('/api/generate-profile', async (req, res) => {
  try {
    const { redCountryName, blueCountryName, redIso3, blueIso3, era, mode, evalMode, localOverrides, advancedCombatMode, date } = req.body;
    
    if (!redIso3 || !blueIso3) {
      return res.status(400).json({ error: 'Missing red or blue country identifiers' });
    }

    if (evalMode === 'local') {
      const overrides = localOverrides || { redScore: 100, blueScore: 100, redCasualtyModifier: 1.0, blueCasualtyModifier: 1.0, redTroops: 1000000, redReserves: 500000, blueTroops: 1000000, blueReserves: 500000 };
      const profile = calculateLocalModeProfile(
        redCountryName,
        blueCountryName,
        redIso3,
        blueIso3,
        era,
        Number(overrides.redScore),
        Number(overrides.blueScore),
        Number(overrides.redCasualtyModifier),
        Number(overrides.blueCasualtyModifier),
        Number(overrides.redTroops || 1000000),
        Number(overrides.redReserves || 500000),
        Number(overrides.blueTroops || 1000000),
        Number(overrides.blueReserves || 500000),
        !!advancedCombatMode
      );
      return res.json(profile);
    }

    const ai = getAiClient();
    if (!ai) {
      console.warn("No GEMINI_API_KEY available. Falling back to default deterministic historical baseline.");
      const fallback = calculateDeterministicProfile(redCountryName, blueCountryName, redIso3, blueIso3, era, mode, !!advancedCombatMode);
      fallback.reasoning = `【本地核心雷达估算】${fallback.reasoning}`;
      return res.json(fallback);
    }

    const eraDescriptions: Record<string, string> = {
      modern: "现代 (2020年代) - 精确制导武器、无人机、数字化指挥与现代化常备军",
      cold_war: "冷战时期 (1950-1980年代) - 大规模装甲兵团、机械化作战与高额战略备战储蓄",
      ww2: "第二次世界大战时期 (1939-1945年) - 摩托化步兵、全面战争总动员与高比例军队 and 预备役动员",
      ww1: "第一次世界大战时期 (1914-1918年) - 堑壕战、铁丝网与数百万级大规模堑壕炮兵对决",
      nineteenth_century: "近代工业革命时期 (19世纪末/1890年代) - 工业化初期步兵排枪、后膛装弹与蒸汽火车运输后勤"
    };

    const selectedEraDesc = eraDescriptions[era] || eraDescriptions.modern;

    const systemInstruction = `You are an elite military strategist, historian, and geopolitical analyst with deep expertise in operational research and attrition modeling.
Analyze a hypothetical land conflict between two specified countries in the chosen era and mode.
Your goal is to generate a highly realistic, mathematically grounded military profile for both sides.

CRITICAL MILITARY DISPARITY & REALISM REQUIREMENTS (核心军事真实性要求):
1. **Accurate Strategic Power & Technology Assessment (真实军事与科技指标评估)**:
   - Modern top-tier military powers (such as China / USA) possess vast technological, stealth, C4ISR, drone, and industrial manufacturing advantages over regional or developing militaries.
   - For example, China (CHN) in 2026 possesses world-class 5th-generation stealth fighters (J-20/J-35), hypersonic arsenals (DF-17/DF-26), Type 055 guided missile destroyers, satellite reconnaissance, and immense industrial production capacity.
   - China (CHN) and USA should be evaluated as Tier 0 superpower forces (Score ~150-180). Regional military powers like India (IND), Vietnam (VNM), or Taiwan (TWN) have significantly lower modern tech integration and should be scored lower (IND ~90-110, VNM ~70-85, TWN ~75-90).
2. **Casualty Ratios (战损比 casualtyModifier, 0.4 - 1.6)**:
   - A smaller casualtyModifier means FEWER casualties taken. A higher casualtyModifier means MORE casualties taken.
   - When a top-tier modern military (Score 160) engages a force with inferior C4ISR or air defense (Score 85), the superior side takes significantly fewer casualties (e.g. Red casualtyModifier = 0.45 - 0.65, Blue casualtyModifier = 1.35 - 1.70).
3. **Troop Counts (兵力规模)**:
   - Provide accurate active and reserve military personnel based on real country order of battle.
4. **Deep Reasoning (深度思考与推演逻辑)**:
   - In 'reasoning', give a professional concise summary in Chinese (under 150 characters). Explicitly mention key technological/firepower factors (e.g., "红方凭借五代隐身战机、高超音速导弹与全域C4ISR情报网占据绝对制空权与火网优势，蓝方防空系统严重滞后，红方战损比设为0.55，蓝方设为1.45。").`;

    const prompt = `Military Operational Assessment Request:
- Red: ${redCountryName} (${redIso3})
- Blue: ${blueCountryName} (${blueIso3})
- Era: ${era} (${selectedEraDesc})
- Specific Date: ${date || '2023-01-01'}
- Strategic Mode: ${mode}
- Advanced Combat Mode: ${advancedCombatMode ? "ENABLED" : "DISABLED"}

Please perform a rigorous deep-thinking analysis of their military balance. Calculate scores and casualty modifiers that reflect a professional staff college assessment. Avoid "gamey" or "unrealistic" numbers.`;

    const profile = await callGeminiProfileWithFallback(
      redCountryName,
      blueCountryName,
      redIso3,
      blueIso3,
      era,
      mode,
      systemInstruction,
      prompt,
      ai,
      !!advancedCombatMode
    );

    // If AI did not return troop counts, fill from database as fallback
    if (!profile.redActiveTroops || profile.redActiveTroops <= 0) {
      const redMils = lookupMilitaryData(redIso3, era);
      profile.redActiveTroops = redMils.active;
      profile.redReserveTroops = redMils.reserve;
    }
    if (!profile.blueActiveTroops || profile.blueActiveTroops <= 0) {
      const blueMils = lookupMilitaryData(blueIso3, era);
      profile.blueActiveTroops = blueMils.active;
      profile.blueReserveTroops = blueMils.reserve;
    }

    if (localOverrides?.customRedName) profile.customRedName = localOverrides.customRedName;
    if (localOverrides?.customBlueName) profile.customBlueName = localOverrides.customBlueName;

    res.json(profile);
  } catch (error: any) {
    console.log("[Profile Generation Flow] Safe bypass initiated, falling back to deterministic local calculations.", error);
    const fallback = calculateDeterministicProfile(
      req.body.redCountryName || '红方',
      req.body.blueCountryName || '蓝方',
      req.body.redIso3 || 'CHN',
      req.body.blueIso3 || 'IND',
      req.body.era || 'modern',
      req.body.mode || 'balanced'
    );
    fallback.reasoning = `【应急战术雷达模拟】${fallback.reasoning}`;
    res.json(fallback);
  }
});

// Helper for local fallback timeline generation
function generateLocalTimelineFallback(
  redName: string,
  blueName: string,
  winner: string,
  resultReason: string,
  historySummary: any[]
) {
  try {
    const frames = Array.isArray(historySummary) && historySummary.length > 0 ? historySummary : [];
  const totalFrames = frames.length;
  
  const milestones: any[] = [];
  const winnerName = winner === 'red' ? (redName || '红方') : (blueName || '蓝方');
  const loserName = winner === 'red' ? (blueName || '蓝方') : (redName || '红方');

  if (totalFrames <= 1) {
    milestones.push({
      day: 1,
      date: frames[0]?.date || '2026-04-21',
      phase: '第一阶段-强攻破局',
      title: '第一阶段：边境突击与第一道防线撕裂',
      location: '边境第一道前沿防线',
      summary: `${redName} 重装机械化集群沿主干轴线夜间强攻，集中重炮压制 ${blueName} 边境前沿，双方前线机动部队全线撕裂交火。`,
      redTerritoryPct: 50,
      blueTerritoryPct: 50,
      redCasualties: frames[0]?.redLosses || 0,
      blueCasualties: frames[0]?.blueLosses || 0,
      keyEventTag: '首战破局',
      type: 'breakthrough'
    });
  } else {
    // Pick 5 strategic key frames from timeline
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

    uniqueIndices.forEach((idx, i) => {
      const f = frames[idx];
      const prevF = idx > 0 ? frames[uniqueIndices[i - 1]] || frames[0] : f;

      const totalCells = (f.redCells || 0) + (f.blueCells || 0) || 1;
      const redPct = Math.round(((f.redCells || 0) / totalCells) * 100);
      const bluePct = 100 - redPct;

      const rDelta = Math.max(0, (f.redLosses || 0) - (prevF.redLosses || 0));
      const bDelta = Math.max(0, (f.blueLosses || 0) - (prevF.blueLosses || 0));
      const combinedDelta = rDelta + bDelta;

      let summaryText = '';
      if (i === 0) {
        summaryText = `${redName} 战术集群集中重装力量，在电子与重火炮掩护下沿前沿接触线发动强攻，迅速击穿 ${blueName} 第一道预设防线，建立突破口。`;
      } else if (i === 1) {
        summaryText = `${redName} 突击矛头向纵深关键枢纽快速挺进，成功切断 ${blueName} 多条战术补给干线。${blueName} 调动预备集群组织反冲击，双方围绕战术要地展开激战，本阶段产生约 ${combinedDelta.toLocaleString()} 人战损。`;
      } else if (i === 2) {
        summaryText = `${redName} 主力实施两翼钳形迂回攻势，分割 ${blueName} 前线防御集群，形成多处包围态势，守军承受高强度打击，战线发生重大转折。`;
      } else if (i === 3) {
        summaryText = `战事进入核心要地攻坚与防区决战。${winnerName} 集中炮兵与破障集群对最后核心要塞发起总攻，${loserName} 防御节点接连失守。`;
      } else {
        summaryText = `战场推进达到临界终点。${resultReason || `${winnerName} 凭借绝对战术主动权锁定胜局`}` + `。双方控制区最终定格为 ${redName} ${redPct}% 对 ${blueName} ${bluePct}%，全线战局尘埃落定。`;
      }

      milestones.push({
        day: f.tick || (idx + 1),
        date: f.date || `第${f.tick || idx + 1}天`,
        phase: phaseNames[Math.min(i, phaseNames.length - 1)],
        title: titles[Math.min(i, titles.length - 1)],
        location: f.capturedCity || (i === 0 ? '边境突破口' : (i === 2 ? '纵深包围圈' : '主要战术轴线')),
        summary: summaryText,
        redTerritoryPct: redPct,
        blueTerritoryPct: bluePct,
        redCasualties: f.redLosses || 0,
        blueCasualties: f.blueLosses || 0,
        keyEventTag: i === 0 ? '首战破局' : (i === 2 ? '重大转折' : (i === 4 ? '推演结束' : '激战')),
        type: eventTypes[Math.min(i, eventTypes.length - 1)]
      });
    });
  }

  return { 
      milestones, 
      overallAnalysis: `战役推演共持续 ${totalFrames} 个时间步，${winnerName} 最终获得胜利。` 
    };
  } catch (e) {
    return { milestones: [], overallAnalysis: '无法生成战役总结。' };
  }
}

app.post('/api/generate-timeline', async (req, res) => {
  const { redName, blueName, winner, resultReason, historySummary } = req.body;

  try {
    const ai = getAiClient();
    if (!ai) {
      console.warn("No GEMINI_API_KEY available. Skipping AI timeline generation.");
      return res.json(generateLocalTimelineFallback(redName, blueName, winner, resultReason, historySummary));
    }

    const prompt = `你是一位高阶军事历史学家与战略战术参谋。
请根据以下战役历史演变、推演统计与实际战线交战数据（含每日控制区比例、战损增量、攻占城市/据点），为战役报告生成极具代入感、符合实际地缘 scales 的【高精度推演时间轴】。

【战局基本信息】
- 红方: ${redName || '红方'}
- 蓝方: ${blueName || '蓝方'}
- 胜负判定: ${winner === 'red' ? redName : blueName} 获胜, 原因为 "${resultReason}"

【推演历史快照 (按时间排序)】
${JSON.stringify(historySummary, null, 2)}

关键要求：
1. 【战线数据精准对应】：必须基于传入的 historySummary 中真实发生的事件（如 dailyEventText、capturedCity、兵力变化和控制区增减），严禁脱离数据虚构不符合事实的地理大动作。
2. 【极小国家/微型地区适配】：若交战双方为微型国家、城市州或小面积战区，请避免使用“几百公里”、“辽阔平原”等大国概念，而应采用符合其地理尺度的措辞（如“核心街区/防线枢纽/港口要塞/前沿要地”）。
3. 【5个核心节点】：提取 5 个最具代表性的关键战略节点（首战突破、纵深推演、包围转折、要塞决战、终局结算）。
4. 【节点属性】：为每个节点分配正确的 day, date, phase, title, location, summary, redTerritoryPct, blueTerritoryPct, redCasualties, blueCasualties, keyEventTag (4字以内), type ('breakthrough' | 'battle' | 'encirclement' | 'capital_fall' | 'treaty')。
5. 返回整体战役宏观分析 (overallAnalysis)。`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  date: { type: Type.STRING },
                  phase: { type: Type.STRING },
                  title: { type: Type.STRING },
                  location: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  redTerritoryPct: { type: Type.INTEGER },
                  blueTerritoryPct: { type: Type.INTEGER },
                  redCasualties: { type: Type.INTEGER },
                  blueCasualties: { type: Type.INTEGER },
                  keyEventTag: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ["day", "date", "phase", "title", "location", "summary", "redTerritoryPct", "blueTerritoryPct", "redCasualties", "blueCasualties", "keyEventTag", "type"]
              }
            },
            overallAnalysis: { type: Type.STRING }
          },
          required: ["milestones", "overallAnalysis"]
        }
      }
    });

    const text = response.text;
    if (text) {
      return res.json(JSON.parse(text));
    } else {
      throw new Error("Empty response from AI");
    }
  } catch (error: any) {
    console.warn('AI Timeline Generation Error:', error.message || error);
    return res.json(generateLocalTimelineFallback(redName, blueName, winner, resultReason, historySummary));
  }
});

app.post('/api/generate-schematic-battles', async (req, res) => {
  const { redName, blueName, era, winner, resultReason, keyBattlefields, historySummary } = req.body;

  try {
    const ai = getAiClient();
    if (!ai) {
      console.warn("No GEMINI_API_KEY available. Skipping AI schematic battlefields.");
      return res.json({ keyBattlefields });
    }

    const prompt = `你是一位高阶军事历史学家与战略战术参谋。
请根据以下战役历史演变数据，为战役示意图生成【4-6个关键战役/会战节点】的名称、日期、概括位置(lng, lat)和双方投入兵力与战损。
【注意】：不要生成箭头数据或坐标。

【战局基本信息】
- 红方: ${redName || '红方'}
- 蓝方: ${blueName || '蓝方'}
- 时代背景: ${era}
- 最终结果: ${winner === 'red' ? redName : blueName} 获胜, 原因为 "${resultReason}"

【推演历史关键快照】
${JSON.stringify(historySummary, null, 2)}

要求：
1. 严谨精炼地生成4至6个（不多也不少）富有军事专业色彩的关键战役名称 (name)，如 "第一阶段 边境要塞突破战"、"第二阶段 枢纽拉锯战" 等。
2. 给出准确发生日期 (date, 如 "2026/04/22")，以及战役中心坐标 (lng, lat)（坐标需分布在实际交战战场范围内）。
3. 给出红蓝双方投入兵力 (redForces, blueForces) 与战损 (redLosses, blueLosses)。`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keyBattlefields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING, description: "富有军事色彩的重要战役名称" },
                  phase: { type: Type.INTEGER, description: "战役阶段 (1 至 5)" },
                  date: { type: Type.STRING, description: "发生日期" },
                  lng: { type: Type.NUMBER, description: "战役中心点经度" },
                  lat: { type: Type.NUMBER, description: "战役中心点纬度" },
                  redForces: { type: Type.INTEGER, description: "红方投入兵力" },
                  blueForces: { type: Type.INTEGER, description: "蓝方投入兵力" },
                  redLosses: { type: Type.INTEGER, description: "红方战损" },
                  blueLosses: { type: Type.INTEGER, description: "蓝方战损" }
                },
                required: ["id", "name", "phase", "date", "lng", "lat", "redForces", "blueForces", "redLosses", "blueLosses"]
              }
            }
          },
          required: ["keyBattlefields"]
        }
      }
    });

    const text = response.text;
    if (text) {
      let data = JSON.parse(text);
      return res.json(data);
    } else {
      throw new Error("Empty response from AI");
    }
  } catch (error: any) {
    console.warn('AI Schematic Battles Generation Error:', error.message || error);
    return res.json({ keyBattlefields });
  }
});


app.get('/api/military-data', (req, res) => {
  const { code, era } = req.query;
  if (!code || !era) return res.status(400).json({ error: 'Missing code or era' });
  try {
    // @ts-ignore
    const result = lookupMilitaryData(code as string, era as string);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Data lookup failed' });
  }
});

function getCountryTech(iso3: string, era: string): number {
  const code = (iso3 || '').toUpperCase();
  if (era === 'modern') {
    if (code === 'USA' || code === 'CHN') return 1.55; // Tier 0 Stealth, C4ISR, Hypersonic, Type 055, Carrier Groups
    if (code === 'RUS') return 1.25;
    if (code === 'ISR' || code === 'JPN' || code === 'KOR') return 1.25;
    if (code === 'FRA' || code === 'GBR' || code === 'DEU') return 1.20;
    if (code === 'IND') return 0.95; // Hybrid weapon systems, varied logistics
    if (code === 'PAK' || code === 'TUR' || code === 'IRN' || code === 'TWN') return 1.00;
    if (code === 'PRK' || code === 'VNM' || code === 'EGY') return 0.85;
    return 0.80;
  }
  if (era === 'cold_war') {
    if (code === 'USA' || code === 'RUS') return 1.35;
    if (code === 'DEU' || code === 'GBR' || code === 'FRA') return 1.20;
    if (code === 'CHN') return 1.05;
    if (code === 'IND') return 0.90;
    return 0.85;
  }
  if (era === 'ww2') {
    if (code === 'DEU' || code === 'USA') return 1.35;
    if (code === 'RUS' || code === 'GBR' || code === 'JPN') return 1.20;
    if (code === 'FRA' || code === 'ITA') return 1.05;
    if (code === 'CHN') return 0.80;
    return 0.75;
  }
  return 1.0;
}

function getCountryTier(iso3: string): number {
  const code = (iso3 || '').toUpperCase();
  const tier0 = ['CHN', 'IND', 'USA', 'RUS'];
  const tier1 = ['KOR', 'PRK', 'PAK', 'VNM', 'UKR', 'FRA', 'GBR', 'DEU', 'JPN', 'BRA', 'EGY', 'TUR', 'IRN', 'SAU'];
  const tier2 = ['PHL', 'THA', 'IDN', 'MMR', 'MYS', 'ESP', 'ITA', 'CAN', 'AUS', 'ZAF', 'COL', 'ARG', 'SWE', 'NOR', 'POL'];
  
  if (tier0.includes(code)) return 0;
  if (tier1.includes(code)) return 1;
  if (tier2.includes(code)) return 2;
  return 3;
}

function lookupSingleMilitaryData(code: string, era: string): { active: number; reserve: number } {
  const database: Record<string, Record<string, { active: number; reserve: number }>> = {
    USA: {
      modern: { active: 1390000, reserve: 840000 },
      cold_war: { active: 2100000, reserve: 1500000 },
      ww2: { active: 12000000, reserve: 4000000 },
      ww1: { active: 4700000, reserve: 1000000 },
      nineteenth_century: { active: 300000, reserve: 200000 }
    },
    CHN: {
      modern: { active: 2000000, reserve: 510000 },
      cold_war: { active: 4500000, reserve: 6000000 },
      ww2: { active: 5000000, reserve: 3000000 },
      ww1: { active: 1000000, reserve: 500000 },
      nineteenth_century: { active: 800000, reserve: 400000 }
    },
    RUS: {
      modern: { active: 1320000, reserve: 2000000 },
      cold_war: { active: 3800000, reserve: 5000000 },
      ww2: { active: 12500000, reserve: 8000000 },
      ww1: { active: 5300000, reserve: 3000000 },
      nineteenth_century: { active: 1200000, reserve: 800000 }
    },
    IND: {
      modern: { active: 1450000, reserve: 1150000 },
      cold_war: { active: 1100000, reserve: 500000 },
      ww2: { active: 2500000, reserve: 1000000 },
      ww1: { active: 1300000, reserve: 400000 },
      nineteenth_century: { active: 250000, reserve: 100000 }
    },
    PRK: {
      modern: { active: 1280000, reserve: 6000000 },
      cold_war: { active: 1000000, reserve: 3000000 },
      ww2: { active: 200000, reserve: 100000 },
      ww1: { active: 50000, reserve: 20000 },
      nineteenth_century: { active: 30000, reserve: 10000 }
    },
    KOR: {
      modern: { active: 500000, reserve: 3100000 },
      cold_war: { active: 600000, reserve: 2000000 },
      ww2: { active: 100000, reserve: 50000 },
      ww1: { active: 30000, reserve: 10000 },
      nineteenth_century: { active: 20000, reserve: 10000 }
    },
    PAK: {
      modern: { active: 650000, reserve: 550000 },
      cold_war: { active: 400000, reserve: 300000 },
      ww2: { active: 100000, reserve: 50000 },
      ww1: { active: 50000, reserve: 20000 },
      nineteenth_century: { active: 0, reserve: 0 }
    },
    VNM: {
      modern: { active: 480000, reserve: 5000000 },
      cold_war: { active: 1000000, reserve: 2000000 },
      ww2: { active: 80000, reserve: 50000 },
      ww1: { active: 50000, reserve: 30000 },
      nineteenth_century: { active: 80000, reserve: 40000 }
    },
    UKR: {
      modern: { active: 900000, reserve: 1200000 },
      cold_war: { active: 500000, reserve: 1000000 },
      ww2: { active: 2000000, reserve: 2000000 },
      ww1: { active: 1000000, reserve: 1000000 },
      nineteenth_century: { active: 200000, reserve: 200000 }
    },
    MNG: {
      modern: { active: 10000, reserve: 130000 },
      cold_war: { active: 35000, reserve: 50000 },
      ww2: { active: 20000, reserve: 30000 },
      ww1: { active: 5000, reserve: 5000 },
      nineteenth_century: { active: 5000, reserve: 5000 }
    },
    FRA: {
      modern: { active: 200000, reserve: 35000 },
      cold_war: { active: 500000, reserve: 400000 },
      ww2: { active: 5000000, reserve: 2000000 },
      ww1: { active: 4000000, reserve: 3500000 },
      nineteenth_century: { active: 500000, reserve: 400000 }
    },
    GBR: {
      modern: { active: 150000, reserve: 45000 },
      cold_war: { active: 320000, reserve: 200000 },
      ww2: { active: 4500000, reserve: 1500000 },
      ww1: { active: 4000000, reserve: 2000000 },
      nineteenth_century: { active: 250000, reserve: 150000 }
    },
    DEU: {
      modern: { active: 180000, reserve: 30000 },
      cold_war: { active: 490000, reserve: 750000 },
      ww2: { active: 12500000, reserve: 4000000 },
      ww1: { active: 4500000, reserve: 4000000 },
      nineteenth_century: { active: 500000, reserve: 600000 }
    },
    JPN: {
      modern: { active: 240000, reserve: 55000 },
      cold_war: { active: 180000, reserve: 40000 },
      ww2: { active: 6000000, reserve: 3000000 },
      ww1: { active: 800000, reserve: 600000 },
      nineteenth_century: { active: 120000, reserve: 100000 }
    }
  };

  if (database[code] && database[code][era]) {
    return database[code][era];
  }

  const tier = getCountryTier(code);
  const fallbacks: Record<string, { active: number[]; reserve: number[] }> = {
    modern: {
      active: [1700000, 450000, 180000, 25000],
      reserve: [900000, 350000, 100000, 10000]
    },
    cold_war: {
      active: [3500000, 900000, 350000, 50000],
      reserve: [3000000, 750000, 250000, 30000]
    },
    ww2: {
      active: [6000000, 2000000, 550000, 90000],
      reserve: [4500000, 1500000, 400000, 60000]
    },
    ww1: {
      active: [4500000, 1400000, 400000, 60000],
      reserve: [3500000, 1000000, 300000, 40000]
    },
    nineteenth_century: {
      active: [1100000, 350000, 100000, 15000],
      reserve: [750000, 220000, 60000, 8000]
    }
  };

  const selectedEra = fallbacks[era] ? era : 'modern';
  const eraData = fallbacks[selectedEra];
  
  const baseActive = eraData.active[tier];
  const baseReserve = eraData.reserve[tier];
  
  // Predictable small variance to keep values organic but realistic
  const codeSum = code.charCodeAt(0) + code.charCodeAt(1) + (code.charCodeAt(2) || 0);
  const pseudoRandom = 0.9 + ((codeSum % 20) / 100); // 0.9 - 1.1 based on ISO code
  
  return {
    active: Math.round((baseActive * pseudoRandom) / 1000) * 1000,
    reserve: Math.round((baseReserve * pseudoRandom) / 1000) * 1000
  };
}

function lookupMilitaryData(code: string, era: string): { active: number; reserve: number } {
  const codes = (code || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
  if (codes.length === 0) return { active: 1000000, reserve: 500000 };

  let totalActive = 0;
  let totalReserve = 0;
  for (const singleCode of codes) {
    const data = lookupSingleMilitaryData(singleCode, era);
    totalActive += data.active;
    totalReserve += data.reserve;
  }
  return { active: totalActive, reserve: totalReserve };
}

function calculateLocalModeProfile(
  redCountryName: string,
  blueCountryName: string,
  redIso3: string,
  blueIso3: string,
  era: string,
  redScore: number,
  blueScore: number,
  redCasualtyModifier: number,
  blueCasualtyModifier: number,
  redTroops: number,
  redReserves: number,
  blueTroops: number,
  blueReserves: number,
  advancedCombatMode?: boolean
) {
  const ratio = parseFloat((redScore / (blueScore || 1)).toFixed(2));
  
  // Use overrides instead of looking up database in local mode if values provided
  const finalRedActive = redTroops;
  const finalRedReserve = redReserves;
  const finalBlueActive = blueTroops;
  const finalBlueReserve = blueReserves;

  let redSpeedModifier = 1.0;
  let blueSpeedModifier = 1.0;

  if (ratio > 1.0) {
    redSpeedModifier = parseFloat(Math.min(1.5, 1.0 + (ratio - 1.0) * 0.6).toFixed(2));
  } else if (ratio < 1.0) {
    const invRatio = 1.0 / (ratio || 0.1);
    blueSpeedModifier = parseFloat(Math.min(1.5, 1.0 + (invRatio - 1.0) * 0.6).toFixed(2));
  }

  let eraText = "当前时期";
  if (era === 'ww1') eraText = "一战时期";
  else if (era === 'ww2') eraText = "二战时期";
  else if (era === 'cold_war') eraText = "冷战时期";
  else if (era === 'modern') eraText = "现代";
  else if (era === 'nineteenth_century') eraText = "19世纪末近代";

  const reasoning = `【本地自定配置】双方于${eraText}展开推演沙盘。红方军事实力：${redScore}，战损比：${redCasualtyModifier}；蓝方军事实力：${blueScore}，战损比：${blueCasualtyModifier}。常备军和预备役数据由本地战术库加载。`;

  let strategicPlan = "";
  if (advancedCombatMode) {
    strategicPlan = `【高级战术预设】主力采取穿插切割作战，构建双向合围圈，并在空中与精确火力支援下，直接闪击压迫对方指挥中心（首都）。`;
  }

  return {
    redActiveTroops: finalRedActive,
    redReserveTroops: finalRedReserve,
    redFirepower: 100,
    redMorale: 1.0,
    redLogistics: 1.0,
    blueActiveTroops: finalBlueActive,
    blueReserveTroops: finalBlueReserve,
    blueFirepower: 100,
    blueMorale: 1.0,
    blueLogistics: 1.0,
    redScore,
    blueScore,
    ratio,
    reasoning,
    redSpeedModifier,
    blueSpeedModifier,
    redCasualtyModifier,
    blueCasualtyModifier,
    strategicPlan
  };
}

function calculateDeterministicProfile(
  redCountryName: string,
  blueCountryName: string,
  redIso3: string,
  blueIso3: string,
  era: string,
  mode: string,
  advancedCombatMode?: boolean
) {
  const redMils = lookupMilitaryData(redIso3, era);
  const blueMils = lookupMilitaryData(blueIso3, era);
  let redActive = redMils.active;
  let redReserve = redMils.reserve;
  let blueActive = blueMils.active;
  let blueReserve = blueMils.reserve;

  const redTech = getCountryTech(redIso3, era);
  const blueTech = getCountryTech(blueIso3, era);

  let redFirepower = Math.round(100 * redTech);
  let blueFirepower = Math.round(100 * blueTech);
  let redMorale = 1.0;
  let blueMorale = 1.0;
  let redLogistics = 1.0;
  let blueLogistics = 1.0;

  if (mode === 'red_adv') {
    redFirepower = Math.round(redFirepower * 1.2);
    blueFirepower = Math.round(blueFirepower * 0.8);
    redMorale = 1.15;
    blueMorale = 0.85;
    redActive = Math.round(redActive * 1.3);
  } else if (mode === 'blue_adv') {
    blueFirepower = Math.round(blueFirepower * 1.2);
    redFirepower = Math.round(redFirepower * 0.8);
    blueMorale = 1.15;
    redMorale = 0.85;
    blueActive = Math.round(blueActive * 1.3);
  } else if (mode === 'random') {
    redFirepower = Math.round(redFirepower * (0.8 + Math.random() * 0.4));
    blueFirepower = Math.round(blueFirepower * (0.8 + Math.random() * 0.4));
    redMorale = parseFloat((0.8 + Math.random() * 0.4).toFixed(2));
    blueMorale = parseFloat((0.8 + Math.random() * 0.4).toFixed(2));
    redLogistics = parseFloat((0.8 + Math.random() * 0.4).toFixed(2));
    blueLogistics = parseFloat((0.8 + Math.random() * 0.4).toFixed(2));
  }

  const redPower = (redActive + redReserve * 0.5) * (redFirepower / 100) * redMorale * redLogistics;
  const bluePower = (blueActive + blueReserve * 0.5) * (blueFirepower / 100) * blueMorale * blueLogistics;

  const baseRef = 1000000;
  let redScore = Math.round(60 * redTech + (redPower / baseRef) * 15);
  let blueScore = Math.round(60 * blueTech + (bluePower / baseRef) * 15);

  redScore = Math.max(30, Math.min(180, redScore));
  blueScore = Math.max(30, Math.min(180, blueScore));

  const ratio = parseFloat((redScore / blueScore).toFixed(2));

  let eraText = "当前时期";
  if (era === 'ww1') eraText = "一战时期";
  else if (era === 'ww2') eraText = "二战时期";
  else if (era === 'cold_war') eraText = "冷战时期";
  else if (era === 'modern') eraText = "现代";
  else if (era === 'nineteenth_century') eraText = "19世纪末近代";

  let reasoning = `在${eraText}背景下，红方(${redCountryName})军队数达${(redActive/10000).toFixed(1)}万，蓝方(${blueCountryName})达${(blueActive/10000).toFixed(1)}万。双方在边境展开对峙作战。`;

  let redSpeedModifier = 1.0;
  let blueSpeedModifier = 1.0;
  let redCasualtyModifier = 1.0;
  let blueCasualtyModifier = 1.0;

  if (ratio > 1.0) {
    redSpeedModifier = parseFloat(Math.min(1.5, 1.0 + (ratio - 1.0) * 0.6).toFixed(2));
    blueCasualtyModifier = parseFloat(Math.min(1.3, 1.0 + (ratio - 1.0) * 0.4).toFixed(2));
    redCasualtyModifier = parseFloat(Math.max(0.7, 1.0 - (ratio - 1.0) * 0.3).toFixed(2));
  } else if (ratio < 1.0) {
    const invRatio = 1.0 / (ratio || 0.1);
    blueSpeedModifier = parseFloat(Math.min(1.5, 1.0 + (invRatio - 1.0) * 0.6).toFixed(2));
    redCasualtyModifier = parseFloat(Math.min(1.3, 1.0 + (invRatio - 1.0) * 0.4).toFixed(2));
    blueCasualtyModifier = parseFloat(Math.max(0.7, 1.0 - (invRatio - 1.0) * 0.3).toFixed(2));
  }

  let strategicPlan = "";
  if (advancedCombatMode) {
    strategicPlan = `【大本营参谋】红蓝双方参谋部已制定出分割包围战略：由强势方发起穿插包围，意图截断敌方交通大动脉，并包抄、剥离其指挥中枢（首都）。`;
  }

  return {
    redActiveTroops: redActive,
    redReserveTroops: redReserve,
    redFirepower,
    redMorale,
    redLogistics,
    blueActiveTroops: blueActive,
    blueReserveTroops: blueReserve,
    blueFirepower,
    blueMorale,
    blueLogistics,
    redScore,
    blueScore,
    ratio,
    reasoning,
    redSpeedModifier,
    blueSpeedModifier,
    redCasualtyModifier,
    blueCasualtyModifier,
    strategicPlan
  };
}

async function callGeminiProfileWithFallback(
  redCountryName: string,
  blueCountryName: string,
  redIso3: string,
  blueIso3: string,
  era: string,
  mode: string,
  systemInstruction: string,
  prompt: string,
  ai: GoogleGenAI,
  advancedCombatMode?: boolean
) {
  const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting unified military profile generation using ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              redActiveTroops: { type: Type.INTEGER, description: "Realistic active duty troops for Red country during selected era" },
              redReserveTroops: { type: Type.INTEGER, description: "Realistic reserve troops for Red country during selected era" },
              redFirepower: { type: Type.INTEGER, description: "Base firepower capability score for Red (e.g. 100)" },
              redMorale: { type: Type.NUMBER, description: "Red troop morale multiplier (0.5 - 1.5)" },
              redLogistics: { type: Type.NUMBER, description: "Red logistics efficiency multiplier (0.5 - 1.5)" },
              blueActiveTroops: { type: Type.INTEGER, description: "Realistic active duty troops for Blue country during selected era" },
              blueReserveTroops: { type: Type.INTEGER, description: "Realistic reserve troops for Blue country during selected era" },
              blueFirepower: { type: Type.INTEGER, description: "Base firepower capability score for Blue (e.g. 100)" },
              blueMorale: { type: Type.NUMBER, description: "Blue troop morale multiplier (0.5 - 1.5)" },
              blueLogistics: { type: Type.NUMBER, description: "Blue logistics efficiency multiplier (0.5 - 1.5)" },
              redScore: { type: Type.NUMBER, description: "Calculated capability score for Red (typically 30 - 150)" },
              blueScore: { type: Type.NUMBER, description: "Calculated capability score for Blue (typically 30 - 150)" },
              ratio: { type: Type.NUMBER, description: "Ratio of Red strength to Blue strength" },
              reasoning: { type: Type.STRING, description: "A highly realistic compact strategic summary in Chinese, under 150 characters, no markdown." },
              redSpeedModifier: { type: Type.NUMBER, description: "Red movement and territory advancement speed multiplier (0.7 - 1.5)" },
              blueSpeedModifier: { type: Type.NUMBER, description: "Blue movement and territory advancement speed multiplier (0.7 - 1.5)" },
              redCasualtyModifier: { type: Type.NUMBER, description: "Red combat casualty multiplier (0.7 - 1.3, lower is better)" },
              blueCasualtyModifier: { type: Type.NUMBER, description: "Blue combat casualty multiplier (0.7 - 1.3, lower is better)" },
              strategicPlan: { type: Type.STRING, description: "If advancedCombatMode is enabled, a detailed custom attack or defense strategic plan in Chinese under 100 characters, targeting capitals or doing encirclement. Otherwise empty." }
            },
            required: [
              "redActiveTroops", "redReserveTroops", "redFirepower", "redMorale", "redLogistics",
              "blueActiveTroops", "blueReserveTroops", "blueFirepower", "blueMorale", "blueLogistics",
              "redScore", "blueScore", "ratio", "reasoning", 
              "redSpeedModifier", "blueSpeedModifier", "redCasualtyModifier", "blueCasualtyModifier",
              "strategicPlan"
            ]
          }
        }
      });

      const text = response.text;
      if (text) {
        console.log(`Successfully generated profile using ${model}`);
        return JSON.parse(text);
      }
    } catch (err: any) {
      console.warn(`[Profile Gen] Model ${model} failed. Error:`, err.message || err);
      lastError = err;
    }
  }

  console.log("[Profile Gen] Fallback to deterministic local calculator.");
  return calculateDeterministicProfile(redCountryName, blueCountryName, redIso3, blueIso3, era, mode, advancedCombatMode);
}

async function start() {
  // Integrate Vite for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log("Vite development server mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving production build from dist.");
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error("Failed to start server:", err);
});
