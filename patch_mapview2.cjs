const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

code = code.replace(/id: 'red-captured-line', type: 'line', source: 'red-captured-territory',/g, "id: 'red-captured-line', type: 'line', source: 'red-captured-territory', minzoom: 4,");
code = code.replace(/id: 'blue-captured-line', type: 'line', source: 'blue-captured-territory',/g, "id: 'blue-captured-line', type: 'line', source: 'blue-captured-territory', minzoom: 4,");

fs.writeFileSync('src/components/MapView.tsx', code);
console.log("Patched MapView lines");
