const fs = require('fs');
let content = fs.readFileSync('src/engine/tickEngine.ts', 'utf8');

const replacement = `  const moveUnitsToBorder = (sideState: SideState, borderCells: string[]) => {
    if (borderCells.length === 0) {
      sideState.units = [];
      return;
    }

    const targetCount = Math.max(3, Math.ceil(borderCells.length / 3));

    let activeUnits = sideState.units.filter(u => u.status !== 'destroyed');

    if (activeUnits.length < targetCount) {
      const unitsToAdd = targetCount - activeUnits.length;
      for (let i = 0; i < unitsToAdd; i++) {
        const cellId = borderCells[Math.floor(rng() * borderCells.length)];
        const [lat, lng] = getCachedLatLng(cellId);
        activeUnits.push({
          id: \`\${sideState.id}-unit-\${Date.now()}-\${Math.random()}\`,
          side: sideState.id,
          cellId,
          latitude: lat,
          longitude: lng,
          status: 'active',
          strength: 1000,
          maxStrength: 1000,
          supplyConnected: true,
          daysIsolated: 0,
          experience: 1.0
        });
      }
    }

    if (activeUnits.length > targetCount * 1.5) {
      activeUnits = activeUnits.slice(0, Math.floor(targetCount * 1.2));
    }

    const step = Math.max(1, Math.floor(borderCells.length / activeUnits.length));
    const baseStrengthPerUnit = Math.max(100, Math.round(sideState.activeTroops / activeUnits.length));

    activeUnits.forEach((unit, idx) => {
      const targetCellId = borderCells[Math.min(idx * step, borderCells.length - 1)];
      const [lat, lng] = getCachedLatLng(targetCellId);
      
      unit.cellId = targetCellId;
      unit.latitude = lat;
      unit.longitude = lng;
      
      let strength = baseStrengthPerUnit;
      if (isLandAdjacent && cells[targetCellId]?.isLandingCell) {
        strength = Math.max(100, Math.round(baseStrengthPerUnit * 0.5));
      }
      unit.strength = strength;
      unit.maxStrength = strength;
    });

    sideState.units = activeUnits;
  };`;

const startIndex = content.indexOf('  const moveUnitsToBorder = (sideState: SideState, borderCells: string[]) => {');
const endString = `    });
  };`;
const endIndex = content.indexOf(endString, startIndex) + endString.length;

if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('src/engine/tickEngine.ts', content);
  console.log("Success");
} else {
  console.log("Failed to find boundaries.", startIndex, endIndex);
}
