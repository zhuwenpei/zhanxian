const fs = require('fs');
let code = fs.readFileSync('src/components/MapView.tsx', 'utf8');

code = code.replace(/    if \(\!map\.getLayer\('newly-captured-fill'\)\) \{\n      map\.addLayer\(\{\n        id: 'newly-captured-fill', type: 'fill', source: 'newly-captured-territory',\n        paint: \{\n          'fill-color': '#ffffff',\n          'fill-opacity': \['coalesce', \['get', 'opacity'\], capturedFillOp\]\n        , 'fill-antialias': false \}\n      \}\);\n    \}\n          \}\);\n    \}/, 
`    if (!map.getLayer('newly-captured-fill')) {
      map.addLayer({
        id: 'newly-captured-fill', type: 'fill', source: 'newly-captured-territory',
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': ['coalesce', ['get', 'opacity'], capturedFillOp],
          'fill-antialias': false
        }
      });
    }`);

fs.writeFileSync('src/components/MapView.tsx', code);
console.log("Fixed MapView syntax error");
