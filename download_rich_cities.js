import fs from 'fs';
import https from 'https';

const ISO2_TO_ISO3 = {
  CN: 'CHN', US: 'USA', RU: 'RUS', GB: 'GBR', FR: 'FRA', JP: 'JPN', 
  DE: 'DEU', IN: 'IND', BR: 'BRA', AU: 'AUS', CA: 'CAN', IT: 'ITA', 
  KR: 'KOR', ES: 'ESP', ID: 'IDN', MX: 'MEX', SA: 'SAU', TR: 'TUR',
  IR: 'IRN', ZA: 'ZAF', EG: 'EGY', NG: 'NGA', PK: 'PAK', VN: 'VNM',
  TH: 'THA', IL: 'ISR', KP: 'PRK', TW: 'TWN', UA: 'UKR', PL: 'POL'
};

const req = https.get('https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const allCities = JSON.parse(data);
    const countriesMap = {}; // cca2 -> list of cities
    for (const c of allCities) {
      if (!countriesMap[c.country]) countriesMap[c.country] = [];
      countriesMap[c.country].push(c);
    }
    console.log("Cities downloaded.");
    
    // Also get the old capitals to preserve them
    const oldContent = fs.readFileSync('src/data/cities.ts', 'utf8');
    const oldCitiesMatch = oldContent.match(/export const BUILTIN_CITIES.*?=\s*(\[[\s\S]*?\]);/);
    let finalCities = [];
    if (oldCitiesMatch && oldCitiesMatch[1]) {
       const oldCities = eval(oldCitiesMatch[1]);
       finalCities.push(...oldCities);
    }
    
    fs.writeFileSync('cities_debug.json', JSON.stringify(finalCities));
    console.log("Done.");
  });
});
req.on('error', (e) => console.error(e));
