import maplibregl from 'maplibre-gl';

function tileToQuadKey(x: number, y: number, z: number): string {
  let quadKey = '';
  for (let i = z; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i - 1);
    if ((x & mask) !== 0) digit++;
    if ((y & mask) !== 0) digit += 2;
    quadKey += digit.toString();
  }
  return quadKey;
}

let protocolsRegistered = false;

export function registerTileProtocols() {
  if (protocolsRegistered) return;
  protocolsRegistered = true;

  // Bing Satellite Protocol
  try {
    maplibregl.addProtocol('bing', async (params, abortController) => {
      const match = params.url.match(/bing:\/\/(\d+)\/(\d+)\/(\d+)/);
      if (!match) throw new Error('Invalid bing URL');
      const z = parseInt(match[1], 10);
      const x = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      const quadKey = tileToQuadKey(x, y, z);
      const serverNum = Math.abs(x + y) % 4;
      const tileUrl = `https://ecn.t${serverNum}.tiles.virtualearth.net/tiles/a${quadKey}.jpeg?g=587&mkt=zh-CN`;
      const res = await fetch(tileUrl, { signal: abortController?.signal });
      if (!res.ok) throw new Error('Bing tile error');
      return { data: await res.arrayBuffer() };
    });
  } catch (e) {}
}

