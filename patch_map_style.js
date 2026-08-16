import fs from 'fs';
let content = fs.readFileSync('src/components/MapView.tsx', 'utf8');

content = content.replace(
  /'raster-opacity': 0.75/,
  "'raster-opacity': 0.85,\n        'raster-contrast': 0.2,\n        'raster-saturation': -0.1,\n        'raster-brightness-max': 0.8"
);

fs.writeFileSync('src/components/MapView.tsx', content);
console.log('Patched map style.');
