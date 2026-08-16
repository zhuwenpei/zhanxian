import fs from 'fs';
const content = fs.readFileSync('src/utils/landGeoJSON.ts', 'utf8');
const newContent = content.replace(/export function findSeaStartingPoint[\s\S]*$/, `export function findSeaStartingPoint(
  landingLng: number,
  landingLat: number,
  targetLng: number,
  targetLat: number,
  distanceDegrees: number = 0.25
): { startLng: number; startLat: number } {
  const dx = landingLng - targetLng;
  const dy = landingLat - targetLat;
  const len = Math.hypot(dx, dy);
  
  // Base angle points away from target (towards attacker mainland, or at least outward)
  const baseAngle = len > 0.001 ? Math.atan2(dy, dx) : 0;
  
  // We want to find the closest sea direction. We check 360 degrees.
  const anglesToTry: number[] = [0];
  for (let i = 1; i <= 16; i++) {
    const delta = (i * Math.PI) / 16; // 11.25 degree increments
    anglesToTry.push(delta);
    anglesToTry.push(-delta);
  }

  // Check small radius first to find the true coastline normal without jumping across islands
  const testRadius = 0.05; 
  let bestAngle = baseAngle;
  let foundSea = false;

  for (const delta of anglesToTry) {
    const angle = baseAngle + delta;
    const testLng = landingLng + testRadius * Math.cos(angle);
    const testLat = landingLat + testRadius * Math.sin(angle);
    if (isPointInSea(testLng, testLat)) {
      bestAngle = angle;
      foundSea = true;
      break;
    }
  }

  // If no sea found at small radius, just fallback to baseAngle
  if (!foundSea) {
    bestAngle = baseAngle;
  }

  return {
    startLng: landingLng + distanceDegrees * Math.cos(bestAngle),
    startLat: landingLat + distanceDegrees * Math.sin(bestAngle)
  };
}
`);
fs.writeFileSync('src/utils/landGeoJSON.ts', newContent);
