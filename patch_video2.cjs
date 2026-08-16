const fs = require('fs');
let code = fs.readFileSync('src/components/VideoExportModal.tsx', 'utf8');

code = code.replace(/op = op - \(1\.0 \/ \(REST_DURATION \/ 2\)\); \/\/ fade out in half the rest time/, 'op = op - (r / (REST_DURATION / 2)); // fade out in half the rest time');

fs.writeFileSync('src/components/VideoExportModal.tsx', code);
console.log("Fixed VideoExportModal fading logic");
