const fs = require('fs');
let content = fs.readFileSync('src/engine/tickEngine.ts', 'utf8');

const target = `  const moveUnitsToBorder = (sideState: SideState, borderCells: string[]) => {
    if (borderCells.length === 0) {
      sideState.units = [];
      return;
    }

    // Halve unit count (take every 2nd border cell)
    const sampledCells = borderCells.filter((_, idx) => idx % 2 === 0);
    if (sampledCells.length === 0) sampledCells.push(borderCells[0]);

    const count = sampledCells.length;
    const baseStrengthPerUnit = Math.max(100, Math.round(sideState.activeTroops / count));

    sideState.units = sampledCells.map((cellId, index) => {
      const [lat, lng] = getCachedLatLng(cellId);
      const existing = sideState.units[index];
      
      let strength = baseStrengthPerUnit;
      // If land-adjacent and is a landing cell, landing forces operate at half strength/combat effectiveness
      if (isLandAdjacent && cells[cellId]?.isLandingCell) {
        strength = Math.max(100, Math.round(baseStrengthPerUnit * 0.5));
      }

      return {
        id: existing ? existing.id : \`\${sideState.id}-\${index}\`,
        side: sideState.id,
        strength: strength,
        maxStrength: strength,
        cellId,
        latitude: lat,
        longitude: lng,
        status: existing?.status === 'isolated' ? 'isolated' : 'active',
        supplyConnected: existing ? existing.supplyConnected : true,
        daysIsolated: existing ? existing.daysIsolated : 0,
        experience: existing ? existing.experience : 1.0,
      };
    });
  };`;

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

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/engine/tickEngine.ts', content);
  console.log("Success");
} else {
  // try regex with wildcard spaces
  const targetRegex = new RegExp(target.replace(/[ \t\r\n]+/g, '\\s*').replace(/[.*+?^$\{key\}()|[\\]\\\\]/g, '\\$&').replace(/\\s\\\*/g, '\\s*'));
  if (targetRegex.test(content)) {
     console.log("Regex match found!");
     const actualTarget = content.match(targetRegex)[0];
     content = content.replace(actualTarget, replacement);
     fs.writeFileSync('src/engine/tickEngine.ts', content);
  } else {
     console.log("Failed to find target");
  }
}
