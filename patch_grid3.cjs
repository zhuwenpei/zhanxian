const fs = require('fs');
let code = fs.readFileSync('src/engine/gridEngine.ts', 'utf8');

code = code.replace(/targetRes = Math\.min\(targetRes \+ 1, 10\);/, 'targetRes = Math.min(targetRes + 1, Math.min(10, maxAllowedRes + 1));');

fs.writeFileSync('src/engine/gridEngine.ts', code);
