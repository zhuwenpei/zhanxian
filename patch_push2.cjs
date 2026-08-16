const fs = require('fs');

function patchFile(file, regex, replacement) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
  }
}

patchFile('src/engine/simulator.ts', 
  /allPolygons\.push\(\.\.\.f\.geometry\.coordinates\);/g, 
  `for (let i = 0; i < f.geometry.coordinates.length; i++) {
        allPolygons.push(f.geometry.coordinates[i]);
      }`);

patchFile('src/utils/landGeoJSON.ts', 
  /allCoords\.push\(\.\.\.f\.geometry\.coordinates\);/g, 
  `for (let i = 0; i < f.geometry.coordinates.length; i++) {
        allCoords.push(f.geometry.coordinates[i]);
      }`);

patchFile('src/data/historicalBorders.ts', 
  /allPolygons\.push\(\.\.\.f\.geometry\.coordinates\);/g, 
  `for (let i = 0; i < f.geometry.coordinates.length; i++) {
        allPolygons.push(f.geometry.coordinates[i]);
      }`);

patchFile('src/components/DrawCountryOverlay.tsx', 
  /rings\.push\(\.\.\.geom\.coordinates\);/g, 
  `for (let i = 0; i < geom.coordinates.length; i++) {
            rings.push(geom.coordinates[i]);
          }`);

patchFile('src/data/cities.ts', 
  /cityList\.push\(\.\.\.builtinList\);/g, 
  `for (let i = 0; i < builtinList.length; i++) {
    cityList.push(builtinList[i]);
  }`);

console.log("Patched other push spreads");
