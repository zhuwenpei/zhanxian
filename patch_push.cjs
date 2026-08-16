const fs = require('fs');
let code = fs.readFileSync('src/engine/gridEngine.ts', 'utf8');

code = code.replace(/cells\.push\(\.\.\.polygonToCells\(converted, res, false\)\);/g, 
`const newCells = polygonToCells(converted, res, false);
      for (let i = 0; i < newCells.length; i++) {
        cells.push(newCells[i]);
      }`);

fs.writeFileSync('src/engine/gridEngine.ts', code);
console.log("Patched push spread in gridEngine");
