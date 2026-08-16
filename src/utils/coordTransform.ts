const PI = Math.PI;
const AXIS = 6378245.0; // WGS-84 semi-major axis
const OFFSET = 0.00669342162296594323; // eccentricity squared

export function outOfChina(lng: number, lat: number): boolean {
  if (lng < 72.004 || lng > 137.8347) return true;
  if (lat < 0.8293 || lat > 55.8271) return true;
  return false;
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

// Convert WGS-84 to GCJ-02 (Mars coordinates)
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - OFFSET * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((AXIS * (1 - OFFSET)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((AXIS / sqrtMagic) * Math.cos(radLat) * PI);
  return [lng + dLng, lat + dLat];
}

// Convert GCJ-02 to BD-09 (Baidu coordinates)
export function gcj02ToBd09(lng: number, lat: number): [number, number] {
  const x = lng, y = lat;
  const z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin((y * PI * 3000.0) / 180.0);
  const theta = Math.atan2(y, x) + 0.000003 * Math.cos((x * PI * 3000.0) / 180.0);
  const bdLng = z * Math.cos(theta) + 0.0065;
  const bdLat = z * Math.sin(theta) + 0.006;
  return [bdLng, bdLat];
}

// Convert WGS-84 to BD-09
export function wgs84ToBd09(lng: number, lat: number): [number, number] {
  const gcj = wgs84ToGcj02(lng, lat);
  return gcj02ToBd09(gcj[0], gcj[1]);
}

// Calculate WGS-84 lat/lng center of tile (x, y, z)
export function tileToWgs84Center(x: number, y: number, z: number): [number, number] {
  const n = Math.pow(2, z);
  const lngDeg = ((x + 0.5) / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / n)));
  const latDeg = (latRad * 180) / Math.PI;
  return [lngDeg, latDeg];
}

// Convert lat/lng to tile index at zoom z
export function lngLatToTile(lng: number, lat: number, z: number): [number, number] {
  const n = Math.pow(2, z);
  const tileX = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const tileY = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  const clampedX = Math.max(0, Math.min(n - 1, tileX));
  const clampedY = Math.max(0, Math.min(n - 1, tileY));
  return [clampedX, clampedY];
}
