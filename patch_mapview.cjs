const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

// 1. Remove newly-captured-line layer (or rather just don't add it)
code = code.replace(/if \(!map\.getLayer\('newly-captured-line'\)\) \{[\s\S]*?\}\n/g, '');

// 2. Set fill-antialias: false on all fill layers
const fillLayers = ['red-fill', 'blue-fill', 'red-captured-fill', 'blue-captured-fill', 'newly-captured-fill'];
for (const layer of fillLayers) {
  const regex = new RegExp(`(id: '${layer}', type: 'fill', source: '[^']+',\\s*paint: {)([^}]+)}`, 'g');
  code = code.replace(regex, `$1$2, 'fill-antialias': false }`);
}

// 3. Maybe also hide red-line and blue-line when zoomed out to prevent blurring?
// Actually just let's see if setting fill-antialias is enough. Wait, they specifically said "正常h3网格", so maybe red-line and blue-line are causing the smooth look because lines are anti-aliased. Let's add minzoom: 4 to the red-line and blue-line layers so they disappear when zoomed out.
code = code.replace(/id: 'red-line', type: 'line', source: 'red-territory',/g, "id: 'red-line', type: 'line', source: 'red-territory', minzoom: 4,");
code = code.replace(/id: 'blue-line', type: 'line', source: 'blue-territory',/g, "id: 'blue-line', type: 'line', source: 'blue-territory', minzoom: 4,");

fs.writeFileSync('src/components/MapView.tsx', code);
console.log("Patched MapView");
