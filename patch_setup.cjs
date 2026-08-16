const fs = require('fs');
let code = fs.readFileSync('src/components/SetupPanel.tsx', 'utf8');

// We want to move the mode selector outside of the evalMode check, or just add the surprise attack mode as a separate toggle if needed.
// Actually, let's just make the mode selector visible for both.
const oldCode = `{evalMode === 'ai' ? (
          <div className="flex flex-col gap-2">
            <label className="text-gray-400 text-sm">实力模式</label>
            <select value={mode} onChange={e => setMode(e.target.value as any)} className="bg-gray-800 border border-gray-600 rounded p-2 text-sm outline-none">
              <option value="balanced">均衡</option>
              <option value="red_adv">红方优势</option>
              <option value="blue_adv">蓝方优势</option>
              <option value="random">完全随机</option>
              <option value="surprise_attack">突袭模式 (优势方突袭或劣势方抢攻)</option>
            </select>
          </div>
        ) : (`;

const newCode = `<div className="flex flex-col gap-2">
          <label className="text-gray-400 text-sm">战斗开局模式 (影响开局10回合)</label>
          <select value={mode} onChange={e => setMode(e.target.value as any)} className="bg-gray-800 border border-gray-600 rounded p-2 text-sm outline-none">
            <option value="balanced">常规均衡对战</option>
            <option value="red_adv">AI预设: 红方优势</option>
            <option value="blue_adv">AI预设: 蓝方优势</option>
            <option value="random">AI预设: 完全随机</option>
            <option value="surprise_attack">🔥 突袭模式 (进攻方优势/强行抢攻)</option>
          </select>
        </div>

        {evalMode === 'ai' ? null : (`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/components/SetupPanel.tsx', code);
console.log("Updated SetupPanel mode selector visibility");
