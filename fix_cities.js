import fs from 'fs';
import https from 'https';

https.get('https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const countries = JSON.parse(data);
    const cities = [];
    for (const c of countries) {
      if (c.capital && c.capital.length > 0 && c.latlng && c.latlng.length === 2) {
        let lat = c.latlng[0];
        let lng = c.latlng[1];
        if (c.capitalInfo && c.capitalInfo.latlng) {
          lat = c.capitalInfo.latlng[0];
          lng = c.capitalInfo.latlng[1];
        }
        cities.push({
          name: c.capital[0],
          lat: lat,
          lng: lng,
          isCapital: true,
          countryIso3: c.cca3
        });
      }
    }
    const output = `export interface CityData {
  name: string;
  lat: number;
  lng: number;
  isCapital?: boolean;
  countryIso3: string;
}

const ISO2_TO_ISO3: Record<string, string> = {
  CN: 'CHN', US: 'USA', RU: 'RUS', GB: 'GBR', FR: 'FRA', JP: 'JPN', 
  DE: 'DEU', IN: 'IND', BR: 'BRA', AU: 'AUS', CA: 'CAN', IT: 'ITA', 
  KR: 'KOR', ES: 'ESP', ID: 'IDN', MX: 'MEX', SA: 'SAU', TR: 'TUR',
  IR: 'IRN', ZA: 'ZAF', EG: 'EGY', NG: 'NGA', PK: 'PAK', VN: 'VNM',
  TH: 'THA', IL: 'ISR', KP: 'PRK', TW: 'TWN', UA: 'UKR', PL: 'POL'
};

export const BUILTIN_CITIES: CityData[] = ${JSON.stringify(cities, null, 2)};

export function getCitiesForIso(isoString: string): CityData[] {
  const isos = isoString.split(',').map(s => {
    const raw = s.trim().toUpperCase();
    return ISO2_TO_ISO3[raw] || raw;
  });
  return BUILTIN_CITIES.filter(c => isos.includes(c.countryIso3));
}
`;
    fs.writeFileSync('src/data/cities.ts', output);
    console.log('Fixed cities to English.');
  });
});
