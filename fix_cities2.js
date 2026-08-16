import fs from 'fs';
import https from 'https';

const req = https.get('https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const allCities = JSON.parse(data);
    const countryToCities = {};
    for (const c of allCities) {
      if (!countryToCities[c.country]) countryToCities[c.country] = [];
      countryToCities[c.country].push(c);
    }
    
    const iso2to3 = {
      "AD": "AND", "AE": "ARE", "AF": "AFG", "AG": "ATG", "AI": "AIA", "AL": "ALB",
      "AM": "ARM", "AO": "AGO", "AQ": "ATA", "AR": "ARG", "AS": "ASM", "AT": "AUT",
      "AU": "AUS", "AW": "ABW", "AX": "ALA", "AZ": "AZE", "BA": "BIH", "BB": "BRB",
      "BD": "BGD", "BE": "BEL", "BF": "BFA", "BG": "BGR", "BH": "BHR", "BI": "BDI",
      "BJ": "BEN", "BL": "BLM", "BM": "BMU", "BN": "BRN", "BO": "BOL", "BQ": "BES",
      "BR": "BRA", "BS": "BHS", "BT": "BTN", "BV": "BVT", "BW": "BWA", "BY": "BLR",
      "BZ": "BLZ", "CA": "CAN", "CC": "CCK", "CD": "COD", "CF": "CAF", "CG": "COG",
      "CH": "CHE", "CI": "CIV", "CK": "COK", "CL": "CHL", "CM": "CMR", "CN": "CHN",
      "CO": "COL", "CR": "CRI", "CU": "CUB", "CV": "CPV", "CW": "CUW", "CX": "CXR",
      "CY": "CYP", "CZ": "CZE", "DE": "DEU", "DJ": "DJI", "DK": "DNK", "DM": "DMA",
      "DO": "DOM", "DZ": "DZA", "EC": "ECU", "EE": "EST", "EG": "EGY", "EH": "ESH",
      "ER": "ERI", "ES": "ESP", "ET": "ETH", "FI": "FIN", "FJ": "FJI", "FK": "FLK",
      "FM": "FSM", "FO": "FRO", "FR": "FRA", "GA": "GAB", "GB": "GBR", "GD": "GRD",
      "GE": "GEO", "GF": "GUF", "GG": "GGY", "GH": "GHA", "GI": "GIB", "GL": "GRL",
      "GM": "GMB", "GN": "GIN", "GP": "GLP", "GQ": "GNQ", "GR": "GRC", "GS": "SGS",
      "GT": "GTM", "GU": "GUM", "GW": "GNB", "GY": "GUY", "HK": "HKG", "HM": "HMD",
      "HN": "HND", "HR": "HRV", "HT": "HTI", "HU": "HUN", "ID": "IDN", "IE": "IRL",
      "IL": "ISR", "IM": "IMN", "IN": "IND", "IO": "IOT", "IQ": "IRQ", "IR": "IRN",
      "IS": "ISL", "IT": "ITA", "JE": "JEY", "JM": "JAM", "JO": "JOR", "JP": "JPN",
      "KE": "KEN", "KG": "KGZ", "KH": "KHM", "KI": "KIR", "KM": "COM", "KN": "KNA",
      "KP": "PRK", "KR": "KOR", "KW": "KWT", "KY": "CYM", "KZ": "KAZ", "LA": "LAO",
      "LB": "LBN", "LC": "LCA", "LI": "LIE", "LK": "LKA", "LR": "LBR", "LS": "LSO",
      "LT": "LTU", "LU": "LUX", "LV": "LVA", "LY": "LBY", "MA": "MAR", "MC": "MCO",
      "MD": "MDA", "ME": "MNE", "MF": "MAF", "MG": "MDG", "MH": "MHL", "MK": "MKD",
      "ML": "MLI", "MM": "MMR", "MN": "MNG", "MO": "MAC", "MP": "MNP", "MQ": "MTQ",
      "MR": "MRT", "MS": "MSR", "MT": "MLT", "MU": "MUS", "MV": "MDV", "MW": "MWI",
      "MX": "MEX", "MY": "MYS", "MZ": "MOZ", "NA": "NAM", "NC": "NCL", "NE": "NER",
      "NF": "NFK", "NG": "NGA", "NI": "NIC", "NL": "NLD", "NO": "NOR", "NP": "NPL",
      "NR": "NRU", "NU": "NIU", "NZ": "NZL", "OM": "OMN", "PA": "PAN", "PE": "PER",
      "PF": "PYF", "PG": "PNG", "PH": "PHL", "PK": "PAK", "PL": "POL", "PM": "SPM",
      "PN": "PCN", "PR": "PRI", "PS": "PSE", "PT": "PRT", "PW": "PLW", "PY": "PRY",
      "QA": "QAT", "RE": "REU", "RO": "ROU", "RS": "SRB", "RU": "RUS", "RW": "RWA",
      "SA": "SAU", "SB": "SLB", "SC": "SYC", "SD": "SDN", "SE": "SWE", "SG": "SGP",
      "SH": "SHN", "SI": "SVN", "SJ": "SJM", "SK": "SVK", "SL": "SLE", "SM": "SMR",
      "SN": "SEN", "SO": "SOM", "SR": "SUR", "SS": "SSD", "ST": "STP", "SV": "SLV",
      "SX": "SXM", "SY": "SYR", "SZ": "SWZ", "TC": "TCA", "TD": "TCD", "TF": "ATF",
      "TG": "TGO", "TH": "THA", "TJ": "TJK", "TK": "TKL", "TL": "TLS", "TM": "TKM",
      "TN": "TUN", "TO": "TON", "TR": "TUR", "TT": "TTO", "TV": "TUV", "TW": "TWN",
      "TZ": "TZA", "UA": "UKR", "UG": "UGA", "UM": "UMI", "US": "USA", "UY": "URY",
      "UZ": "UZB", "VA": "VAT", "VC": "VCT", "VE": "VEN", "VG": "VGB", "VI": "VIR",
      "VN": "VNM", "VU": "VUT", "WF": "WLF", "WS": "WSM", "YE": "YEM", "YT": "MYT",
      "ZA": "ZAF", "ZM": "ZMB", "ZW": "ZWE"
    };

    const finalCities = [];
    
    // Manual capitals list to ensure we have the primary one for each
    const manualCapitals = {
      "CN": "Beijing", "US": "Washington, D.C.", "RU": "Moscow", "GB": "London", "FR": "Paris",
      "JP": "Tokyo", "DE": "Berlin", "IN": "New Delhi", "BR": "Brasília", "AU": "Canberra",
      "CA": "Ottawa", "IT": "Rome", "KR": "Seoul", "KP": "Pyongyang", "TW": "Taipei",
      "UA": "Kyiv", "PL": "Warsaw"
    };

    for (const iso2 of Object.keys(iso2to3)) {
      let citiesForCountry = countryToCities[iso2] || [];
      // sort by some property if available? This dataset doesn't have population.
      // We just pick the first few. But if manual capital exists, find it.
      let capName = manualCapitals[iso2];
      
      let capCity = null;
      if (capName) {
        capCity = citiesForCountry.find(c => c.name.toLowerCase().includes(capName.toLowerCase().split(',')[0]));
      }
      if (!capCity && citiesForCountry.length > 0) {
        // Just guess the capital is the first one or we don't know it. Let's just pick top 3.
        capCity = citiesForCountry[0];
      }
      
      if (capCity) {
        finalCities.push({
          name: capCity.name,
          lat: parseFloat(capCity.lat),
          lng: parseFloat(capCity.lng),
          isCapital: true,
          countryIso3: iso2to3[iso2]
        });
      }

      // Add a couple more cities
      let count = 0;
      for (const c of citiesForCountry) {
        if (capCity && c.name === capCity.name) continue;
        finalCities.push({
          name: c.name,
          lat: parseFloat(c.lat),
          lng: parseFloat(c.lng),
          isCapital: false,
          countryIso3: iso2to3[iso2]
        });
        count++;
        if (count >= 2) break;
      }
    }

    const output = `export interface CityData {
  name: string;
  lat: number;
  lng: number;
  isCapital?: boolean;
  countryIso3: string;
}

export const ISO2_TO_ISO3: Record<string, string> = ${JSON.stringify(iso2to3, null, 2)};

export const BUILTIN_CITIES: CityData[] = ${JSON.stringify(finalCities, null, 2)};

export function getCitiesForIso(isoString: string): CityData[] {
  const isos = isoString.split(',').map(s => {
    const raw = s.trim().toUpperCase();
    return ISO2_TO_ISO3[raw] || raw;
  });
  return BUILTIN_CITIES.filter(c => isos.includes(c.countryIso3));
}
`;
    fs.writeFileSync('src/data/cities.ts', output);
    console.log('Fixed cities coordinates.');
  });
});
