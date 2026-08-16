const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const delay = 1000 \/ \(speed \* 2\);/, 'const delay = 1000 / (speed * 5);');

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx delay");
