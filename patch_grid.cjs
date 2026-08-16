const fs = require('fs');
let code = fs.readFileSync('src/engine/gridEngine.ts', 'utf8');

const oldFunc = code.substring(code.indexOf('export function getOptimalResolution'), code.indexOf('  for (let r = targetRes;'));

const newFunc = `export function getOptimalResolution(
  redFeature: Feature<Polygon | MultiPolygon>,
  blueFeature: Feature<Polygon | MultiPolygon>,
  mapResolution: 'auto' | 'standard' | 'detailed' | 'ultra' | 'coarse' = 'auto'
): number {
  const redArea = area(redFeature as any) / 1e6;
  const blueArea = area(blueFeature as any) / 1e6;
  const minArea = Math.min(redArea, blueArea);

  let targetRes = 6;
  if (minArea < 1000) targetRes = 10;
  else if (minArea < 10000) targetRes = 9;
  else if (minArea < 50000) targetRes = 8;
  else if (minArea < 300000) targetRes = 7;
  else if (minArea < 2000000) targetRes = 6;
  else if (minArea < 8000000) targetRes = 5;
  else targetRes = 4;

  let maxCap = 120000;

  if (mapResolution === 'ultra' || mapResolution === 'detailed') {
    targetRes = Math.min(targetRes + 1, 10);
    maxCap = 250000;
  } else if (mapResolution === 'coarse') {
    targetRes = Math.max(targetRes - 1, 3);
    maxCap = 25000;
  }

`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/engine/gridEngine.ts', code);
console.log("Patched gridEngine getOptimalResolution");
