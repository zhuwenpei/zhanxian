
export interface HistoricalCountry {
  iso3: string;
  name: string;
  era: 'ww2' | 'ww1';
}

export const WWII_COUNTRIES: HistoricalCountry[] = [
  { iso3: 'DEU', name: '纳粹德国', era: 'ww2' },
  { iso3: 'JPN', name: '大日本帝国', era: 'ww2' },
  { iso3: 'ITA', name: '意大利王国', era: 'ww2' },
  { iso3: 'USA', name: '美国', era: 'ww2' },
  { iso3: 'GBR', name: '英国', era: 'ww2' },
  { iso3: 'FRA', name: '法国', era: 'ww2' },
  { iso3: 'USSR', name: '苏联', era: 'ww2' },
  { iso3: 'CHN', name: '中国', era: 'ww2' },
  { iso3: 'CAN', name: '加拿大', era: 'ww2' },
  { iso3: 'AUS', name: '澳大利亚', era: 'ww2' },
  { iso3: 'POL', name: '波兰', era: 'ww2' },
  { iso3: 'FIN', name: '芬兰', era: 'ww2' },
  { iso3: 'ROU', name: '罗马尼亚', era: 'ww2' },
  { iso3: 'HUN', name: '匈牙利', era: 'ww2' },
  { iso3: 'BGR', name: '保加利亚', era: 'ww2' },
  { iso3: 'ESP', name: '西班牙', era: 'ww2' },
  { iso3: 'SWE', name: '瑞典', era: 'ww2' },
  { iso3: 'CHE', name: '瑞士', era: 'ww2' },
  { iso3: 'TUR', name: '土耳其', era: 'ww2' },
  { iso3: 'BRA', name: '巴西', era: 'ww2' },
  { iso3: 'MEX', name: '墨西哥', era: 'ww2' },
  { iso3: 'ZAF', name: '南非', era: 'ww2' },
  { iso3: 'IND', name: '印度 (英属)', era: 'ww2' },
  { iso3: 'IDN', name: '印度尼西亚 (荷属)', era: 'ww2' },
  { iso3: 'PHL', name: '菲律宾', era: 'ww2' },
  { iso3: 'GRC', name: '希腊', era: 'ww2' },
  { iso3: 'YUG', name: '南斯拉夫', era: 'ww2' },
  { iso3: 'BEL', name: '比利时', era: 'ww2' },
  { iso3: 'NLD', name: '荷兰', era: 'ww2' },
  { iso3: 'NOR', name: '挪威', era: 'ww2' },
  { iso3: 'DNK', name: '丹麦', era: 'ww2' },
];

export const WWI_COUNTRIES: HistoricalCountry[] = [
  { iso3: 'DEU', name: '德意志帝国', era: 'ww1' },
  { iso3: 'AUT_HUN', name: '奥匈帝国', era: 'ww1' },
  { iso3: 'TUR', name: '奥斯曼土耳其帝国', era: 'ww1' },
  { iso3: 'BGR', name: '保加利亚王国', era: 'ww1' },
  { iso3: 'GBR', name: '大英帝国', era: 'ww1' },
  { iso3: 'FRA', name: '法兰西第三共和国', era: 'ww1' },
  { iso3: 'USSR', name: '俄罗斯帝国 (后期苏联)', era: 'ww1' },
  { iso3: 'ITA', name: '意大利王国', era: 'ww1' },
  { iso3: 'USA', name: '美国', era: 'ww1' },
  { iso3: 'SRB', name: '塞尔维亚王国', era: 'ww1' },
  { iso3: 'BEL', name: '比利时王国', era: 'ww1' },
  { iso3: 'JPN', name: '大日本帝国', era: 'ww1' },
  { iso3: 'ROU', name: '罗马尼亚王国', era: 'ww1' },
  { iso3: 'GRC', name: '希腊王国', era: 'ww1' },
  { iso3: 'MNE', name: '黑山王国', era: 'ww1' },
  { iso3: 'ROC', name: '中华民国', era: 'ww1' },
  { iso3: 'PRT', name: '葡萄牙', era: 'ww1' },
  { iso3: 'BRA', name: '巴西', era: 'ww1' },
];

export function searchHistoricalCountries(query: string, era: 'ww2' | 'ww1'): HistoricalCountry[] {
  const list = era === 'ww2' ? WWII_COUNTRIES : WWI_COUNTRIES;
  if (!query) return list.slice(0, 10);
  query = query.toLowerCase();
  return list.filter(c => 
    c.name.toLowerCase().includes(query) || 
    c.iso3.toLowerCase().includes(query)
  ).slice(0, 10);
}
