const fs = require('fs');
let code = fs.readFileSync('src/components/VideoExportModal.tsx', 'utf8');

const regex = /return expanded;\s*\};\s*const handleExport = async \(\) => \{/;
const replacement = `
    const finalExpanded = [];
    let frameCount = 0;
    const REST_INTERVAL = 75; // 2.5 seconds at 30 FPS
    const REST_DURATION = 30; // 1 second rest

    for (let j = 0; j < expanded.length; j++) {
      finalExpanded.push(expanded[j]);
      frameCount++;
      
      // Don't add rest at the very end or very beginning
      if (frameCount % REST_INTERVAL === 0 && j < expanded.length - 30) {
        const lastFrame = expanded[j];
        for (let r = 1; r <= REST_DURATION; r++) {
          let fadedHighlights = [];
          if (lastFrame.lastTickCapturedCells) {
            for (const hl of lastFrame.lastTickCapturedCells) {
              const parts = hl.split(':');
              if (parts.length === 2) {
                const cid = parts[0];
                let op = parseFloat(parts[1]);
                op = op - (1.0 / (REST_DURATION / 2)); // fade out in half the rest time
                if (op > 0.05) {
                  fadedHighlights.push(cid + ':' + op.toFixed(2));
                }
              } else {
                fadedHighlights.push(hl);
              }
            }
          }
          finalExpanded.push({
            ...lastFrame,
            lastTickCapturedCells: fadedHighlights
          });
        }
      }
    }

    return finalExpanded;
  };

  const handleExport = async () => {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/VideoExportModal.tsx', code);
console.log("Patched VideoExportModal rest mechanism");
