const fs = require('fs');

let tick = fs.readFileSync('src/engine/tickEngine.ts', 'utf8');
tick = tick.replace(/const minKmToHQ = defenderBorderCells\.length > 0 \? Math\.min\(\.\.\.defenderBorderCells\.map\(c => \{\n\s*const \[cLat, cLng\] = getCachedLatLng\(c\.id\);\n\s*return Math\.hypot\(cLat - hqLat, cLng - hqLng\) \* 111\.0;\n\s*\}\)\) : 99999;/, 
`const minKmToHQ = defenderBorderCells.length > 0 
      ? defenderBorderCells.reduce((min, c) => {
          const [cLat, cLng] = getCachedLatLng(c.id);
          const dist = Math.hypot(cLat - hqLat, cLng - hqLng) * 111.0;
          return dist < min ? dist : min;
        }, 999999) 
      : 99999;`);
fs.writeFileSync('src/engine/tickEngine.ts', tick);

let scheme = fs.readFileSync('src/utils/schematicGenerator.ts', 'utf8');
scheme = scheme.replace(/const minLng = Math\.min\(\.\.\.allLngs\);\n\s*const maxLng = Math\.max\(\.\.\.allLngs\);\n\s*const minLat = Math\.min\(\.\.\.allLats\);\n\s*const maxLat = Math\.max\(\.\.\.allLats\);/,
`let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    for (let i = 0; i < allLngs.length; i++) {
      if (allLngs[i] < minLng) minLng = allLngs[i];
      if (allLngs[i] > maxLng) maxLng = allLngs[i];
      if (allLats[i] < minLat) minLat = allLats[i];
      if (allLats[i] > maxLat) maxLat = allLats[i];
    }`);
fs.writeFileSync('src/utils/schematicGenerator.ts', scheme);

console.log("Patched Math spread calls");
