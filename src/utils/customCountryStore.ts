import type { Feature, Polygon, MultiPolygon } from 'geojson';

export interface CustomCity {
  name: string;
  isCapital?: boolean;
  lng: number;
  lat: number;
}

export interface CustomCountry {
  id: string; // e.g. "CUSTOM_1700000000000"
  name: string; // e.g. "自由国"
  feature: Feature<Polygon | MultiPolygon>;
  capital?: CustomCity;
  cities?: CustomCity[];
  nodes?: [number, number][]; // optional raw boundary nodes for easier re-editing
  holes?: [number, number][][]; // optional exclusion zones
  createdAt: number;
}

const STORAGE_KEY = 'custom_drawn_countries_v2';

export function getSavedCustomCountries(): CustomCountry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn('Failed to load custom countries from localStorage', e);
    return [];
  }
}

export function saveCustomCountry(
  name: string,
  feature: Feature<Polygon | MultiPolygon>,
  capital?: CustomCity,
  cities?: CustomCity[],
  nodes?: [number, number][],
  holes?: [number, number][][],
  existingId?: string
): CustomCountry {
  const list = getSavedCustomCountries();
  const id = existingId || `CUSTOM_${Date.now()}`;
  
  // Truncate nodes and holes to 5 decimal places to save massive space
  const truncatedNodes = nodes?.map(n => [
    Math.round(n[0] * 100000) / 100000,
    Math.round(n[1] * 100000) / 100000
  ] as [number, number]);

  const truncatedHoles = holes?.map(h => 
    h.map(n => [
      Math.round(n[0] * 100000) / 100000,
      Math.round(n[1] * 100000) / 100000
    ] as [number, number])
  );

  const countryObj: CustomCountry = {
    id,
    name: name.trim() || '自定义国家',
    feature,
    capital,
    cities,
    nodes: truncatedNodes,
    holes: truncatedHoles,
    createdAt: Date.now()
  };

  const filtered = list.filter(c => c.id !== id);
  const updated = [countryObj, ...filtered];

  try {
    const json = JSON.stringify(updated);
    // Rough estimate of size in KB
    const sizeKB = Math.round(json.length / 1024);
    if (sizeKB > 4500) {
      console.warn(`Warning: Custom country data is very large (${sizeKB}KB), approaching LocalStorage limit.`);
    }
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e: any) {
    console.error('Failed to save custom country to localStorage:', e);
    if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
      // If we failed, try to save WITHOUT nodes and holes as a last resort to at least save the geometry
      try {
        console.warn('Attempting emergency save without raw nodes/holes to save space...');
        const emergencyObj = { ...countryObj, nodes: undefined, holes: undefined };
        const emergencyList = [emergencyObj, ...filtered];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(emergencyList));
        return emergencyObj;
      } catch (e2) {
        throw new Error('浏览器存储空间已满。请尝试在“管理”中删除一些旧的自定义国家，或点击“清空”简化版图再试。');
      }
    }
    throw new Error(`保存失败: ${e.message || '未知错误'}`);
  }
  return countryObj;
}

export function deleteCustomCountry(id: string): void {
  if (!id) return;
  const list = getSavedCustomCountries();
  const target = id.trim().toUpperCase();
  const updated = list.filter(c => c.id.trim().toUpperCase() !== target);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to delete custom country from localStorage', e);
  }
}

export function getCustomCountryById(id: string): CustomCountry | null {
  if (!id) return null;
  const list = getSavedCustomCountries();
  const target = id.trim().toUpperCase();
  return list.find(c => c.id.trim().toUpperCase() === target) || null;
}

export async function downloadCustomCountryAsFile(country: CustomCountry): Promise<void> {
  await shareOrDownloadCustomCountry(country);
}

export async function shareOrDownloadCustomCountry(country: CustomCountry): Promise<{ shared: boolean; downloaded: boolean }> {
  if (!country) return { shared: false, downloaded: false };
  const exportData = {
    type: 'CUSTOM_COUNTRY_EXPORT',
    version: '1.0',
    exportTime: new Date().toISOString(),
    country
  };
  const jsonStr = JSON.stringify(exportData, null, 2);
  const cleanName = country.name.replace(/^🎨\s*\[.*?\]\s*/, '').replace(/^\d+:\s*/, '').replace(/[^\w\u4e00-\u9fa5]/g, '_') || 'custom_country';
  const filename = `自定义国家_${cleanName}.json`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const jsonFile = new File([jsonStr], filename, { type: 'application/json' });
      
      // Attempt to share the JSON file directly
      if (navigator.canShare && navigator.canShare({ files: [jsonFile] })) {
        await navigator.share({
          files: [jsonFile],
          title: `自定义国家: ${country.name}`,
        });
        return { shared: true, downloaded: false };
      } else {
        // Force attempt sharing the file if canShare is not supported or returns false
        await navigator.share({
          files: [jsonFile],
          title: `自定义国家: ${country.name}`,
        });
        return { shared: true, downloaded: false };
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return { shared: true, downloaded: false };
      console.warn('Share API failed for JSON file', e);
    }
  }

  // Fallback to local file download
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { shared: false, downloaded: true };
}

export function importCustomCountryFromJSON(jsonString: string): CustomCountry {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('JSON 解析失败，请确认文件格式为 JSON');
  }

  let countryObj: CustomCountry | undefined;
  if (parsed.type === 'CUSTOM_COUNTRY_EXPORT' && parsed.country) {
    countryObj = parsed.country;
  } else if (parsed.id && parsed.name && parsed.feature) {
    countryObj = parsed;
  }

  if (!countryObj || !countryObj.name || !countryObj.feature) {
    throw new Error('无效的国家领土数据，缺少必要的坐标或名称信息');
  }

  return saveCustomCountry(
    countryObj.name,
    countryObj.feature,
    countryObj.capital,
    countryObj.cities,
    countryObj.nodes,
    countryObj.holes
  );
}

