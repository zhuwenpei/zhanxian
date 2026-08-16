const fs = require('fs');
let code = fs.readFileSync('src/components/ThreeDSituationMapModal.tsx', 'utf8');

// Replace component name
code = code.replace(/TacticalSituationMapModal/g, 'ThreeDSituationMapModal');

// Increase canvas size to 50M pixels (8000x6250)
code = code.replace(/const exportWidth = 2400;/g, 'const exportWidth = 8000;');
code = code.replace(/const exportHeight = 3324;/g, 'const exportHeight = 6250;');
code = code.replace(/mapContainer.current.style.width = '2400px';/g, "mapContainer.current.style.width = '8000px';");
code = code.replace(/mapContainer.current.style.height = '3324px';/g, "mapContainer.current.style.height = '6250px';");

// Modify title and description
code = code.replace(/战区国家国旗填色时局图/g, '3D立体景深时局图');
code = code.replace(/分享高清时局图 \(可微信保存\)/g, '分享5000万像素3D时局图');

// Inject map 3d pitch and bearing right after map initialization
code = code.replace(/map.fitBounds\(\[/, `
      map.setPitch(60);
      map.setBearing(-15);
      map.fitBounds([`);
      
// Add depth of field effect after drawing map
const blurEffectCode = `
      // --- Depth of Field (Tilt-Shift) Effect ---
      const blurCanvas = document.createElement('canvas');
      blurCanvas.width = exportWidth;
      blurCanvas.height = exportHeight;
      const blurCtx = blurCanvas.getContext('2d');
      if (blurCtx) {
        blurCtx.filter = 'blur(40px)'; // Stronger blur for large canvas
        blurCtx.drawImage(exportCanvas, 0, 0);
        
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = exportWidth;
        maskCanvas.height = exportHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          const gradient = maskCtx.createLinearGradient(0, 0, 0, exportHeight);
          gradient.addColorStop(0, 'rgba(255,255,255,1)');    // blur top
          gradient.addColorStop(0.3, 'rgba(255,255,255,0)');  // clear center
          gradient.addColorStop(0.7, 'rgba(255,255,255,0)');  // clear center
          gradient.addColorStop(1, 'rgba(255,255,255,0.8)');  // slight blur bottom
          
          maskCtx.fillStyle = gradient;
          maskCtx.fillRect(0, 0, exportWidth, exportHeight);
          
          blurCtx.globalCompositeOperation = 'destination-in';
          blurCtx.drawImage(maskCanvas, 0, 0);
          
          ctx.drawImage(blurCanvas, 0, 0);
        }
      }
      // ------------------------------------------
`;
code = code.replace(/\/\/ 3\. Generate Legend/g, blurEffectCode + '\n      // 3. Generate Legend');

fs.writeFileSync('src/components/ThreeDSituationMapModal.tsx', code);
console.log("Replaced!");
