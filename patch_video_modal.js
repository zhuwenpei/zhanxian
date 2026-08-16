import fs from 'fs';
let content = fs.readFileSync('src/components/VideoExportModal.tsx', 'utf8');

content = content.replace(
  /const mapCanvas = mapInstance.getCanvas\(\);/,
  "const mapCanvas = mapInstance.getCanvas();\n        offscreenCtx.imageSmoothingEnabled = true;\n        offscreenCtx.imageSmoothingQuality = 'high';"
);

fs.writeFileSync('src/components/VideoExportModal.tsx', content);
console.log('Patched video modal.');
