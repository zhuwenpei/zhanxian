const fs = require('fs');
let code = fs.readFileSync('src/engine/gridEngine.ts', 'utf8');

const regex = /const minArea = Math\.min\(redArea, blueArea\);([\s\S]*?)let maxCap = /;
const replacement = `const minArea = Math.min(redArea, blueArea);
  const maxArea = Math.max(redArea, blueArea);

  let targetRes = 6;
  if (minArea < 1000) targetRes = 9;
  else if (minArea < 10000) targetRes = 8;
  else if (minArea < 50000) targetRes = 7;
  else if (minArea < 300000) targetRes = 6;
  else if (minArea < 2000000) targetRes = 5;
  else targetRes = 4;

  // Protect against OOM by capping targetRes based on the LARGEST area
  let maxAllowedRes = 6;
  if (maxArea < 1000) maxAllowedRes = 10;
  else if (maxArea < 10000) maxAllowedRes = 9;
  else if (maxArea < 50000) maxAllowedRes = 8;
  else if (maxArea < 300000) maxAllowedRes = 7;
  else if (maxArea < 2000000) maxAllowedRes = 6;
  else if (maxArea < 10000000) maxAllowedRes = 5;
  else maxAllowedRes = 4;

  targetRes = Math.min(targetRes, maxAllowedRes);

  let maxCap = `;

code = code.replace(regex, replacement);
fs.writeFileSync('src/engine/gridEngine.ts', code);
console.log("Patched getOptimalResolution safety cap");
