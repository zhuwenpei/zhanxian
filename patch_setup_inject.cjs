const fs = require('fs');
let code = fs.readFileSync('src/components/SetupPanel.tsx', 'utf8');

const regex = /(<div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">)/;

const newCode = `<div className="flex flex-col gap-1.5 border border-gray-800 bg-gray-800/40 p-2.5 rounded-xl">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">战斗开局模式</label>
          <select value={mode} onChange={e => setMode(e.target.value as any)} className="bg-gray-800 border border-gray-600 rounded p-2 text-xs font-bold text-white outline-none focus:border-red-500">
            <option value="balanced">常规均衡对战</option>
            <option value="red_adv">AI预设: 红方优势</option>
            <option value="blue_adv">AI预设: 蓝方优势</option>
            <option value="random">AI预设: 完全随机</option>
            <option value="surprise_attack">🔥 突袭模式 (进攻方抢攻)</option>
          </select>
        </div>

        $1`;

code = code.replace(regex, newCode);
fs.writeFileSync('src/components/SetupPanel.tsx', code);
console.log("Injected mode selector");
