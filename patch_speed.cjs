const fs = require('fs');
let code = fs.readFileSync('src/engine/tickEngine.ts', 'utf8');

code = code.replace(/let speed = Math\.max\(6, Math\.round\(totalCellsCount \* basePct \* timeDecay \* moraleProgressModifier \* \(0\.8 \+ rng\(\) \* 0\.4\)\)\);/, 
`let speed = Math.max(12, Math.round(totalCellsCount * basePct * timeDecay * moraleProgressModifier * (0.8 + rng() * 0.4) * 2.5));`);

code = code.replace(/let speed = Math\.max\(2, Math\.round\(totalCellsCount \* 0\.001 \* \(0\.8 \+ rng\(\) \* 0\.4\)\)\);/, 
`let speed = Math.max(5, Math.round(totalCellsCount * 0.001 * (0.8 + rng() * 0.4) * 2.5));`);

fs.writeFileSync('src/engine/tickEngine.ts', code);
console.log("Patched tickEngine speed");
