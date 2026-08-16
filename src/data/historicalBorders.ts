import { loadCountryGeoJSON } from '../engine/countryLoader';
import * as turf from '@turf/turf';

import { SimulationState } from '../types/simulation';

function loadCombinedHistorical(isoString: string) {
  const isos = isoString.split(',').map(s => s.trim().toUpperCase());
  if (isos.length === 1) {
    return loadCountryGeoJSON(isos[0]);
  }
  const features = isos.map(iso => loadCountryGeoJSON(iso)).filter(Boolean) as any[];
  if (features.length === 0) return null;
  
  const allPolygons: any[] = [];
  features.forEach(f => {
    if (f.geometry.type === 'Polygon') {
      allPolygons.push(f.geometry.coordinates);
    } else if (f.geometry.type === 'MultiPolygon') {
      for (let i = 0; i < f.geometry.coordinates.length; i++) {
        allPolygons.push(f.geometry.coordinates[i]);
      }
    }
  });
  
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'MultiPolygon' as const,
      coordinates: allPolygons
    }
  };
}

export function getHistoricalFeature(iso3: string, era: SimulationState['era']) {
  if (iso3 && iso3.includes(',')) {
    return loadCombinedHistorical(iso3);
  }

  if (iso3 && iso3.startsWith('CUSTOM_')) {
    return loadCountryGeoJSON(iso3);
  }

  if (era === 'modern') return loadCombinedHistorical(iso3);
  
  const modern = loadCombinedHistorical(iso3);

  // WW2 Era Accurate Open Database Historical Territorial Mappings (1939-1945)
  if (era === 'ww2') {
    if (iso3 === 'DEU') {
      // 1939 Greater German Reich (Germany + Austria + Czechia/Bohemia + parts of Poland)
      return loadCombinedHistorical('DEU,AUT,CZE,POL');
    }
    if (iso3 === 'JPN') {
      // 1941 Empire of Japan (Japan + Korea + Taiwan)
      return loadCombinedHistorical('JPN,KOR,PRK,TWN');
    }
    if (iso3 === 'USSR' || iso3 === 'RUS') {
      // 1939 USSR
      return loadCombinedHistorical('RUS,UKR,BLR,KAZ,UZB,TKM,KGZ,TJK,AZE,ARM,GEO,EST,LVA,LTU,MDA');
    }
    if (iso3 === 'ROC' || iso3 === 'CHN') {
      // 1939 Republic of China / Mainland
      return loadCombinedHistorical('CHN,TWN,MNG');
    }
    if (iso3 === 'ITA') {
      // 1939 Kingdom of Italy + Albania + Libya
      return loadCombinedHistorical('ITA,ALB');
    }
    if (iso3 === 'GBR') {
      // 1939 British Empire Core (UK + Ireland + Malta + Gibraltar)
      return loadCombinedHistorical('GBR,IRL');
    }
  }

  // WW1 Era Accurate Open Database Historical Territorial Mappings (1914-1918)
  if (era === 'ww1') {
    if (iso3 === 'DEU') {
      // 1914 German Empire (Modern DEU + parts of POL + Alsace-Lorraine)
      return loadCombinedHistorical('DEU,POL');
    }
    if (iso3 === 'AUT_HUN' || iso3 === 'AUT') {
      // 1914 Austro-Hungarian Empire (Austria, Hungary, Czechia, Slovakia, Croatia, Slovenia, Bosnia)
      return loadCombinedHistorical('AUT,HUN,CZE,SVK,HRV,SVN,BIH');
    }
    if (iso3 === 'OTT' || iso3 === 'TUR') {
      // 1914 Ottoman Empire (Turkey, Syria, Lebanon, Israel, Palestine, Jordan, Iraq)
      return loadCombinedHistorical('TUR,SYR,LBN,ISR,PSE,JOR,IRQ');
    }
    if (iso3 === 'RUS' || iso3 === 'USSR') {
      // 1914 Russian Empire (Russia, Ukraine, Belarus, Baltics, Finland, Poland)
      return loadCombinedHistorical('RUS,UKR,BLR,EST,LVA,LTU,FIN,POL,KAZ,UZB,TKM,KGZ,TJK,AZE,ARM,GEO,MDA');
    }
    if (iso3 === 'ROC' || iso3 === 'CHN') {
      return loadCombinedHistorical('CHN,MNG,TWN');
    }
  }

  // Empires & Historical Entities Fallbacks
  if (iso3 === 'AUT_HUN') {
    return loadCombinedHistorical('AUT,HUN,CZE,SVK,HRV,SVN,BIH');
  }

  if (iso3 === 'USSR') {
    return loadCombinedHistorical('RUS,UKR,BLR,KAZ,UZB,TKM,KGZ,TJK,AZE,ARM,GEO,EST,LVA,LTU,MDA');
  }

  if (iso3 === 'ROC') {
    return loadCombinedHistorical('CHN,MNG,TWN');
  }

  if (iso3 === 'OTT') {
    return loadCombinedHistorical('TUR,SYR,LBN,ISR,PSE,JOR,IRQ');
  }

  return modern;
}

