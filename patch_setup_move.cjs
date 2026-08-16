const fs = require('fs');
let code = fs.readFileSync('src/components/SetupPanel.tsx', 'utf8');

const modeCode = `<div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm">战斗开局模式 (影响开局10回合)</label>
          <select value={mode} onChange={e => setMode(e.target.value as any)} className="bg-gray-800 border border-gray-600 rounded p-2 text-sm outline-none">
            <option value="balanced">常规均衡对战</option>
            <option value="red_adv">AI预设: 红方优势</option>
            <option value="blue_adv">AI预设: 蓝方优势</option>
            <option value="random">AI预设: 完全随机</option>
            <option value="surprise_attack">🔥 突袭模式 (进攻方优势/强行抢攻)</option>
          </select>
        </div>`;

code = code.replace(modeCode, '');

// insert it right after {/* Scenario Selector */} div
code = code.replace(/{ \/\* Scenario Selector \*\/ }\n/, `{/* Scenario Selector */}\n        ${modeCode}\n\n        `);

fs.writeFileSync('src/components/SetupPanel.tsx', code);
console.log("Moved mode selector to the top of SetupPanel");
