const fs = require('fs');
let code = fs.readFileSync('src/components/ReplayControls.tsx', 'utf8');

code = code.replace(/import TacticalSituationMapModal from '.\/TacticalSituationMapModal';/g, "import ThreeDSituationMapModal from './ThreeDSituationMapModal';");

code = code.replace(/<TacticalSituationMapModal/g, "<ThreeDSituationMapModal");

// Remove the old button "生成时局图" and replace with "3D时局图"
const oldButton = `<button
            onClick={() => setIsSituationMapOpen(true)}
            className="flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-xs font-bold active:scale-95 shadow-lg"
            title="生成战区国家国旗填色时局图，随意选择时间点击即可生成分享"
          >
            <Compass size={14} />
            <span>生成时局图</span>
          </button>`;

const newButton = `<button
            onClick={() => setIsSituationMapOpen(true)}
            className="flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-xs font-bold active:scale-95 shadow-lg"
            title="生成5000万像素3D立体景深时局图"
          >
            <Compass size={14} />
            <span>3D时局图</span>
          </button>`;

code = code.replace(oldButton, newButton);

fs.writeFileSync('src/components/ReplayControls.tsx', code);
console.log("Updated ReplayControls");
