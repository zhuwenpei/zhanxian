const fs = require('fs');
let code = fs.readFileSync('src/components/WarSchematicMap.tsx', 'utf8');

code = code.replace(/timeoutId = setTimeout\(\(\) => \{[\s\S]*?\}, 5000\);/g, `timeoutId = setTimeout(() => {
          map.off('idle', checkIdle);
          console.warn("Export idle timeout reached, proceeding with capture.");
          resolve();
        }, 12000);`);
        
code = code.replace(/await new Promise\(r => setTimeout\(r, 5000\)\);/g, `await new Promise(r => setTimeout(r, 8000));`);

fs.writeFileSync('src/components/WarSchematicMap.tsx', code);
console.log("Updated WarSchematicMap delays");
