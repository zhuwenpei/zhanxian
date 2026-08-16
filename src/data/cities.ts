export interface CityData {
  name: string;
  lat: number;
  lng: number;
  isCapital?: boolean;
  countryIso3: string;
}

export const ISO2_TO_ISO3: Record<string, string> = {
  "AD": "AND",
  "AE": "ARE",
  "AF": "AFG",
  "AG": "ATG",
  "AI": "AIA",
  "AL": "ALB",
  "AM": "ARM",
  "AO": "AGO",
  "AQ": "ATA",
  "AR": "ARG",
  "AS": "ASM",
  "AT": "AUT",
  "AU": "AUS",
  "AW": "ABW",
  "AX": "ALA",
  "AZ": "AZE",
  "BA": "BIH",
  "BB": "BRB",
  "BD": "BGD",
  "BE": "BEL",
  "BF": "BFA",
  "BG": "BGR",
  "BH": "BHR",
  "BI": "BDI",
  "BJ": "BEN",
  "BL": "BLM",
  "BM": "BMU",
  "BN": "BRN",
  "BO": "BOL",
  "BQ": "BES",
  "BR": "BRA",
  "BS": "BHS",
  "BT": "BTN",
  "BV": "BVT",
  "BW": "BWA",
  "BY": "BLR",
  "BZ": "BLZ",
  "CA": "CAN",
  "CC": "CCK",
  "CD": "COD",
  "CF": "CAF",
  "CG": "COG",
  "CH": "CHE",
  "CI": "CIV",
  "CK": "COK",
  "CL": "CHL",
  "CM": "CMR",
  "CN": "CHN",
  "CO": "COL",
  "CR": "CRI",
  "CU": "CUB",
  "CV": "CPV",
  "CW": "CUW",
  "CX": "CXR",
  "CY": "CYP",
  "CZ": "CZE",
  "DE": "DEU",
  "DJ": "DJI",
  "DK": "DNK",
  "DM": "DMA",
  "DO": "DOM",
  "DZ": "DZA",
  "EC": "ECU",
  "EE": "EST",
  "EG": "EGY",
  "EH": "ESH",
  "ER": "ERI",
  "ES": "ESP",
  "ET": "ETH",
  "FI": "FIN",
  "FJ": "FJI",
  "FK": "FLK",
  "FM": "FSM",
  "FO": "FRO",
  "FR": "FRA",
  "GA": "GAB",
  "GB": "GBR",
  "GD": "GRD",
  "GE": "GEO",
  "GF": "GUF",
  "GG": "GGY",
  "GH": "GHA",
  "GI": "GIB",
  "GL": "GRL",
  "GM": "GMB",
  "GN": "GIN",
  "GP": "GLP",
  "GQ": "GNQ",
  "GR": "GRC",
  "GS": "SGS",
  "GT": "GTM",
  "GU": "GUM",
  "GW": "GNB",
  "GY": "GUY",
  "HK": "HKG",
  "HM": "HMD",
  "HN": "HND",
  "HR": "HRV",
  "HT": "HTI",
  "HU": "HUN",
  "ID": "IDN",
  "IE": "IRL",
  "IL": "ISR",
  "IM": "IMN",
  "IN": "IND",
  "IO": "IOT",
  "IQ": "IRQ",
  "IR": "IRN",
  "IS": "ISL",
  "IT": "ITA",
  "JE": "JEY",
  "JM": "JAM",
  "JO": "JOR",
  "JP": "JPN",
  "KE": "KEN",
  "KG": "KGZ",
  "KH": "KHM",
  "KI": "KIR",
  "KM": "COM",
  "KN": "KNA",
  "KP": "PRK",
  "KR": "KOR",
  "KW": "KWT",
  "KY": "CYM",
  "KZ": "KAZ",
  "LA": "LAO",
  "LB": "LBN",
  "LC": "LCA",
  "LI": "LIE",
  "LK": "LKA",
  "LR": "LBR",
  "LS": "LSO",
  "LT": "LTU",
  "LU": "LUX",
  "LV": "LVA",
  "LY": "LBY",
  "MA": "MAR",
  "MC": "MCO",
  "MD": "MDA",
  "ME": "MNE",
  "MF": "MAF",
  "MG": "MDG",
  "MH": "MHL",
  "MK": "MKD",
  "ML": "MLI",
  "MM": "MMR",
  "MN": "MNG",
  "MO": "MAC",
  "MP": "MNP",
  "MQ": "MTQ",
  "MR": "MRT",
  "MS": "MSR",
  "MT": "MLT",
  "MU": "MUS",
  "MV": "MDV",
  "MW": "MWI",
  "MX": "MEX",
  "MY": "MYS",
  "MZ": "MOZ",
  "NA": "NAM",
  "NC": "NCL",
  "NE": "NER",
  "NF": "NFK",
  "NG": "NGA",
  "NI": "NIC",
  "NL": "NLD",
  "NO": "NOR",
  "NP": "NPL",
  "NR": "NRU",
  "NU": "NIU",
  "NZ": "NZL",
  "OM": "OMN",
  "PA": "PAN",
  "PE": "PER",
  "PF": "PYF",
  "PG": "PNG",
  "PH": "PHL",
  "PK": "PAK",
  "PL": "POL",
  "PM": "SPM",
  "PN": "PCN",
  "PR": "PRI",
  "PS": "PSE",
  "PT": "PRT",
  "PW": "PLW",
  "PY": "PRY",
  "QA": "QAT",
  "RE": "REU",
  "RO": "ROU",
  "RS": "SRB",
  "RU": "RUS",
  "RW": "RWA",
  "SA": "SAU",
  "SB": "SLB",
  "SC": "SYC",
  "SD": "SDN",
  "SE": "SWE",
  "SG": "SGP",
  "SH": "SHN",
  "SI": "SVN",
  "SJ": "SJM",
  "SK": "SVK",
  "SL": "SLE",
  "SM": "SMR",
  "SN": "SEN",
  "SO": "SOM",
  "SR": "SUR",
  "SS": "SSD",
  "ST": "STP",
  "SV": "SLV",
  "SX": "SXM",
  "SY": "SYR",
  "SZ": "SWZ",
  "TC": "TCA",
  "TD": "TCD",
  "TF": "ATF",
  "TG": "TGO",
  "TH": "THA",
  "TJ": "TJK",
  "TK": "TKL",
  "TL": "TLS",
  "TM": "TKM",
  "TN": "TUN",
  "TO": "TON",
  "TR": "TUR",
  "TT": "TTO",
  "TV": "TUV",
  "TW": "TWN",
  "TZ": "TZA",
  "UA": "UKR",
  "UG": "UGA",
  "UM": "UMI",
  "US": "USA",
  "UY": "URY",
  "UZ": "UZB",
  "VA": "VAT",
  "VC": "VCT",
  "VE": "VEN",
  "VG": "VGB",
  "VI": "VIR",
  "VN": "VNM",
  "VU": "VUT",
  "WF": "WLF",
  "WS": "WSM",
  "YE": "YEM",
  "YT": "MYT",
  "ZA": "ZAF",
  "ZM": "ZMB",
  "ZW": "ZWE"
};

export const BUILTIN_CITIES: CityData[] = [
  {
    "name": "Vila",
    "lat": 42.53176,
    "lng": 1.56654,
    "isCapital": true,
    "countryIso3": "AND"
  },
  {
    "name": "El Tarter",
    "lat": 42.57952,
    "lng": 1.65362,
    "isCapital": false,
    "countryIso3": "AND"
  },
  {
    "name": "Sant Julià de Lòria",
    "lat": 42.46372,
    "lng": 1.49129,
    "isCapital": false,
    "countryIso3": "AND"
  },
  {
    "name": "Warīsān",
    "lat": 25.16744,
    "lng": 55.40708,
    "isCapital": true,
    "countryIso3": "ARE"
  },
  {
    "name": "Umm Suqaym",
    "lat": 25.15491,
    "lng": 55.21015,
    "isCapital": false,
    "countryIso3": "ARE"
  },
  {
    "name": "Umm Al Quwain City",
    "lat": 25.56473,
    "lng": 55.55517,
    "isCapital": false,
    "countryIso3": "ARE"
  },
  {
    "name": "Zōr Kōṯ",
    "lat": 33.54149,
    "lng": 69.73446,
    "isCapital": true,
    "countryIso3": "AFG"
  },
  {
    "name": "Wulêswālī Bihsūd",
    "lat": 34.3436,
    "lng": 67.90567,
    "isCapital": false,
    "countryIso3": "AFG"
  },
  {
    "name": "Kuhsān",
    "lat": 34.65389,
    "lng": 61.19778,
    "isCapital": false,
    "countryIso3": "AFG"
  },
  {
    "name": "Willikies",
    "lat": 17.08684,
    "lng": -61.7093,
    "isCapital": true,
    "countryIso3": "ATG"
  },
  {
    "name": "Swetes",
    "lat": 17.05037,
    "lng": -61.80091,
    "isCapital": false,
    "countryIso3": "ATG"
  },
  {
    "name": "Saint John’s",
    "lat": 17.12096,
    "lng": -61.84329,
    "isCapital": false,
    "countryIso3": "ATG"
  },
  {
    "name": "West End Village",
    "lat": 18.17191,
    "lng": -63.14941,
    "isCapital": true,
    "countryIso3": "AIA"
  },
  {
    "name": "The Valley",
    "lat": 18.21704,
    "lng": -63.05783,
    "isCapital": false,
    "countryIso3": "AIA"
  },
  {
    "name": "The Quarter",
    "lat": 18.20799,
    "lng": -63.04178,
    "isCapital": false,
    "countryIso3": "AIA"
  },
  {
    "name": "Xarrë",
    "lat": 39.72833,
    "lng": 20.05444,
    "isCapital": true,
    "countryIso3": "ALB"
  },
  {
    "name": "Sarandë",
    "lat": 39.87534,
    "lng": 20.00477,
    "isCapital": false,
    "countryIso3": "ALB"
  },
  {
    "name": "Mesopotam",
    "lat": 39.91028,
    "lng": 20.09222,
    "isCapital": false,
    "countryIso3": "ALB"
  },
  {
    "name": "Zaritap",
    "lat": 39.63892,
    "lng": 45.51111,
    "isCapital": true,
    "countryIso3": "ARM"
  },
  {
    "name": "Zangakatun",
    "lat": 39.82233,
    "lng": 45.04169,
    "isCapital": false,
    "countryIso3": "ARM"
  },
  {
    "name": "Goravan",
    "lat": 39.90539,
    "lng": 44.73131,
    "isCapital": false,
    "countryIso3": "ARM"
  },
  {
    "name": "Sombo",
    "lat": -8.74482,
    "lng": 20.98344,
    "isCapital": true,
    "countryIso3": "AGO"
  },
  {
    "name": "Saurimo",
    "lat": -9.66078,
    "lng": 20.39155,
    "isCapital": false,
    "countryIso3": "AGO"
  },
  {
    "name": "Muriege",
    "lat": -9.90719,
    "lng": 21.21463,
    "isCapital": false,
    "countryIso3": "AGO"
  },
  {
    "name": "Zárate",
    "lat": -34.09584,
    "lng": -59.02423,
    "isCapital": true,
    "countryIso3": "ARG"
  },
  {
    "name": "Yatayti Calle",
    "lat": -29.02831,
    "lng": -58.9123,
    "isCapital": false,
    "countryIso3": "ARG"
  },
  {
    "name": "Yapeyú",
    "lat": -29.46907,
    "lng": -56.81837,
    "isCapital": false,
    "countryIso3": "ARG"
  },
  {
    "name": "Aūa",
    "lat": -14.27032,
    "lng": -170.66528,
    "isCapital": true,
    "countryIso3": "ASM"
  },
  {
    "name": "Vaitogi",
    "lat": -14.35259,
    "lng": -170.73796,
    "isCapital": false,
    "countryIso3": "ASM"
  },
  {
    "name": "Vailoatai",
    "lat": -14.3534,
    "lng": -170.7808,
    "isCapital": false,
    "countryIso3": "ASM"
  },
  {
    "name": "Döbling",
    "lat": 48.25,
    "lng": 16.33333,
    "isCapital": true,
    "countryIso3": "AUT"
  },
  {
    "name": "Neu-Guntramsdorf",
    "lat": 48.0642,
    "lng": 16.31573,
    "isCapital": false,
    "countryIso3": "AUT"
  },
  {
    "name": "Kleinarl",
    "lat": 47.27725,
    "lng": 13.31955,
    "isCapital": false,
    "countryIso3": "AUT"
  },
  {
    "name": "Canberra",
    "lat": -35.28346,
    "lng": 149.12807,
    "isCapital": true,
    "countryIso3": "AUS"
  },
  {
    "name": "York",
    "lat": -31.88809,
    "lng": 116.7678,
    "isCapital": false,
    "countryIso3": "AUS"
  },
  {
    "name": "Yanchep",
    "lat": -31.54678,
    "lng": 115.63171,
    "isCapital": false,
    "countryIso3": "AUS"
  },
  {
    "name": "Washington",
    "lat": 12.55837,
    "lng": -70.03816,
    "isCapital": true,
    "countryIso3": "ABW"
  },
  {
    "name": "Tanki Leendert",
    "lat": 12.53914,
    "lng": -70.02004,
    "isCapital": false,
    "countryIso3": "ABW"
  },
  {
    "name": "San Nicolas",
    "lat": 12.43624,
    "lng": -69.90713,
    "isCapital": false,
    "countryIso3": "ABW"
  },
  {
    "name": "Ytterby",
    "lat": 60.16667,
    "lng": 20.01667,
    "isCapital": true,
    "countryIso3": "ALA"
  },
  {
    "name": "Vårdö",
    "lat": 60.25,
    "lng": 20.38333,
    "isCapital": false,
    "countryIso3": "ALA"
  },
  {
    "name": "Sund",
    "lat": 60.25,
    "lng": 20.11667,
    "isCapital": false,
    "countryIso3": "ALA"
  },
  {
    "name": "Sharur City",
    "lat": 39.55298,
    "lng": 44.97993,
    "isCapital": true,
    "countryIso3": "AZE"
  },
  {
    "name": "Geytepe",
    "lat": 39.11998,
    "lng": 48.59383,
    "isCapital": false,
    "countryIso3": "AZE"
  },
  {
    "name": "Zangilan",
    "lat": 39.08371,
    "lng": 46.65988,
    "isCapital": false,
    "countryIso3": "AZE"
  },
  {
    "name": "Zvornik",
    "lat": 44.38605,
    "lng": 19.10247,
    "isCapital": true,
    "countryIso3": "BIH"
  },
  {
    "name": "Živinice",
    "lat": 44.54765,
    "lng": 17.37357,
    "isCapital": false,
    "countryIso3": "BIH"
  },
  {
    "name": "Živinice",
    "lat": 44.44929,
    "lng": 18.64978,
    "isCapital": false,
    "countryIso3": "BIH"
  },
  {
    "name": "White Hill",
    "lat": 13.21373,
    "lng": -59.58111,
    "isCapital": true,
    "countryIso3": "BRB"
  },
  {
    "name": "Welchman Hall",
    "lat": 13.18676,
    "lng": -59.57663,
    "isCapital": false,
    "countryIso3": "BRB"
  },
  {
    "name": "Crane",
    "lat": 13.10487,
    "lng": -59.44861,
    "isCapital": false,
    "countryIso3": "BRB"
  },
  {
    "name": "Thākurgaon",
    "lat": 26.03097,
    "lng": 88.46989,
    "isCapital": true,
    "countryIso3": "BGD"
  },
  {
    "name": "Teknāf",
    "lat": 20.85829,
    "lng": 92.29773,
    "isCapital": false,
    "countryIso3": "BGD"
  },
  {
    "name": "Tungi",
    "lat": 23.89154,
    "lng": 90.40232,
    "isCapital": false,
    "countryIso3": "BGD"
  },
  {
    "name": "Zwijndrecht",
    "lat": 51.21979,
    "lng": 4.32664,
    "isCapital": true,
    "countryIso3": "BEL"
  },
  {
    "name": "Zwijnaarde",
    "lat": 51.00077,
    "lng": 3.70746,
    "isCapital": false,
    "countryIso3": "BEL"
  },
  {
    "name": "Zwevezele",
    "lat": 51.03683,
    "lng": 3.21186,
    "isCapital": false,
    "countryIso3": "BEL"
  },
  {
    "name": "Zorgo",
    "lat": 12.24922,
    "lng": -0.61527,
    "isCapital": true,
    "countryIso3": "BFA"
  },
  {
    "name": "Zitenga",
    "lat": 12.74846,
    "lng": -1.30989,
    "isCapital": false,
    "countryIso3": "BFA"
  },
  {
    "name": "Ziniaré",
    "lat": 12.58236,
    "lng": -1.29753,
    "isCapital": false,
    "countryIso3": "BFA"
  },
  {
    "name": "Beloslav",
    "lat": 43.18717,
    "lng": 27.70352,
    "isCapital": true,
    "countryIso3": "BGR"
  },
  {
    "name": "Zlatograd",
    "lat": 41.3795,
    "lng": 25.09605,
    "isCapital": false,
    "countryIso3": "BGR"
  },
  {
    "name": "Zlatitsa",
    "lat": 42.71667,
    "lng": 24.13333,
    "isCapital": false,
    "countryIso3": "BGR"
  },
  {
    "name": "Sitrah",
    "lat": 26.15472,
    "lng": 50.62056,
    "isCapital": true,
    "countryIso3": "BHR"
  },
  {
    "name": "Sanābis",
    "lat": 26.22722,
    "lng": 50.55083,
    "isCapital": false,
    "countryIso3": "BHR"
  },
  {
    "name": "Madīnat ‘Īsá",
    "lat": 26.17361,
    "lng": 50.54778,
    "isCapital": false,
    "countryIso3": "BHR"
  },
  {
    "name": "Mabanda",
    "lat": -4.2743,
    "lng": 29.7749,
    "isCapital": true,
    "countryIso3": "BDI"
  },
  {
    "name": "Vyanda",
    "lat": -4.1024,
    "lng": 29.606,
    "isCapital": false,
    "countryIso3": "BDI"
  },
  {
    "name": "Makamba",
    "lat": -4.1348,
    "lng": 29.804,
    "isCapital": false,
    "countryIso3": "BDI"
  },
  {
    "name": "Zounké",
    "lat": 6.61621,
    "lng": 2.52836,
    "isCapital": true,
    "countryIso3": "BEN"
  },
  {
    "name": "Zinvié",
    "lat": 6.61738,
    "lng": 2.35776,
    "isCapital": false,
    "countryIso3": "BEN"
  },
  {
    "name": "Zé",
    "lat": 6.78333,
    "lng": 2.3,
    "isCapital": false,
    "countryIso3": "BEN"
  },
  {
    "name": "Gustavia",
    "lat": 17.89618,
    "lng": -62.84978,
    "isCapital": true,
    "countryIso3": "BLM"
  },
  {
    "name": "Saint George",
    "lat": 32.38167,
    "lng": -64.67806,
    "isCapital": true,
    "countryIso3": "BMU"
  },
  {
    "name": "Hamilton",
    "lat": 32.2949,
    "lng": -64.78303,
    "isCapital": false,
    "countryIso3": "BMU"
  },
  {
    "name": "Pembroke Parish",
    "lat": 32.30019,
    "lng": -64.79204,
    "isCapital": false,
    "countryIso3": "BMU"
  },
  {
    "name": "Tutong",
    "lat": 4.80278,
    "lng": 114.64917,
    "isCapital": true,
    "countryIso3": "BRN"
  },
  {
    "name": "Seria",
    "lat": 4.60637,
    "lng": 114.32476,
    "isCapital": false,
    "countryIso3": "BRN"
  },
  {
    "name": "Kampung Panaga",
    "lat": 4.6082,
    "lng": 114.29574,
    "isCapital": false,
    "countryIso3": "BRN"
  },
  {
    "name": "San Pedro",
    "lat": -18.28691,
    "lng": -59.81742,
    "isCapital": true,
    "countryIso3": "BOL"
  },
  {
    "name": "San Matías",
    "lat": -16.3597,
    "lng": -58.40039,
    "isCapital": false,
    "countryIso3": "BOL"
  },
  {
    "name": "Roboré",
    "lat": -18.33473,
    "lng": -59.76142,
    "isCapital": false,
    "countryIso3": "BOL"
  },
  {
    "name": "Upper Hell's Gate",
    "lat": 17.643,
    "lng": -63.22649,
    "isCapital": true,
    "countryIso3": "BES"
  },
  {
    "name": "The Bottom",
    "lat": 17.62652,
    "lng": -63.24971,
    "isCapital": false,
    "countryIso3": "BES"
  },
  {
    "name": "Oranjestad",
    "lat": 17.48303,
    "lng": -62.9864,
    "isCapital": false,
    "countryIso3": "BES"
  },
  {
    "name": "Brasília de Minas",
    "lat": -16.20639,
    "lng": -44.43333,
    "isCapital": true,
    "countryIso3": "BRA"
  },
  {
    "name": "Zabelê",
    "lat": -8.07556,
    "lng": -37.09833,
    "isCapital": false,
    "countryIso3": "BRA"
  },
  {
    "name": "Xexéu",
    "lat": -8.80222,
    "lng": -35.62694,
    "isCapital": false,
    "countryIso3": "BRA"
  },
  {
    "name": "West End",
    "lat": 26.68711,
    "lng": -78.97702,
    "isCapital": true,
    "countryIso3": "BHS"
  },
  {
    "name": "Spanish Wells",
    "lat": 25.54717,
    "lng": -76.76405,
    "isCapital": false,
    "countryIso3": "BHS"
  },
  {
    "name": "San Andros",
    "lat": 25.06667,
    "lng": -78.05,
    "isCapital": false,
    "countryIso3": "BHS"
  },
  {
    "name": "Wangdue Phodrang",
    "lat": 27.48615,
    "lng": 89.89915,
    "isCapital": true,
    "countryIso3": "BTN"
  },
  {
    "name": "Ura",
    "lat": 27.41667,
    "lng": 90.91667,
    "isCapital": false,
    "countryIso3": "BTN"
  },
  {
    "name": "Trongsa",
    "lat": 27.5026,
    "lng": 90.50716,
    "isCapital": false,
    "countryIso3": "BTN"
  },
  {
    "name": "Werda",
    "lat": -25.26667,
    "lng": 23.28333,
    "isCapital": true,
    "countryIso3": "BWA"
  },
  {
    "name": "Tshabong",
    "lat": -26.05,
    "lng": 22.45,
    "isCapital": false,
    "countryIso3": "BWA"
  },
  {
    "name": "Tsau",
    "lat": -20.16458,
    "lng": 22.45573,
    "isCapital": false,
    "countryIso3": "BWA"
  },
  {
    "name": "Indura",
    "lat": 53.4605,
    "lng": 23.8823,
    "isCapital": true,
    "countryIso3": "BLR"
  },
  {
    "name": "Skidel’",
    "lat": 53.5904,
    "lng": 24.2478,
    "isCapital": false,
    "countryIso3": "BLR"
  },
  {
    "name": "Znamenka",
    "lat": 51.88168,
    "lng": 23.65545,
    "isCapital": false,
    "countryIso3": "BLR"
  },
  {
    "name": "Yo Creek",
    "lat": 18.09098,
    "lng": -88.64607,
    "isCapital": true,
    "countryIso3": "BLZ"
  },
  {
    "name": "Xaibe",
    "lat": 18.38654,
    "lng": -88.43393,
    "isCapital": false,
    "countryIso3": "BLZ"
  },
  {
    "name": "Unitedville",
    "lat": 17.21031,
    "lng": -88.93385,
    "isCapital": false,
    "countryIso3": "BLZ"
  },
  {
    "name": "Ottawa",
    "lat": 45.41117,
    "lng": -75.69812,
    "isCapital": true,
    "countryIso3": "CAN"
  },
  {
    "name": "100 Mile House",
    "lat": 51.64982,
    "lng": -121.28594,
    "isCapital": false,
    "countryIso3": "CAN"
  },
  {
    "name": "Fort St. James",
    "lat": 54.45597,
    "lng": -124.26275,
    "isCapital": false,
    "countryIso3": "CAN"
  },
  {
    "name": "West Island",
    "lat": -12.15681,
    "lng": 96.82251,
    "isCapital": true,
    "countryIso3": "CCK"
  },
  {
    "name": "Yangambi",
    "lat": 0.76755,
    "lng": 24.43973,
    "isCapital": true,
    "countryIso3": "COD"
  },
  {
    "name": "Watsa",
    "lat": 3.03716,
    "lng": 29.53551,
    "isCapital": false,
    "countryIso3": "COD"
  },
  {
    "name": "Wamba",
    "lat": 2.14838,
    "lng": 27.99466,
    "isCapital": false,
    "countryIso3": "COD"
  },
  {
    "name": "Zemio",
    "lat": 5.03144,
    "lng": 25.13614,
    "isCapital": true,
    "countryIso3": "CAF"
  },
  {
    "name": "Ouango",
    "lat": 4.31325,
    "lng": 22.55524,
    "isCapital": false,
    "countryIso3": "CAF"
  },
  {
    "name": "Ouanda Djallé",
    "lat": 8.90025,
    "lng": 22.80277,
    "isCapital": false,
    "countryIso3": "CAF"
  },
  {
    "name": "Zanaga",
    "lat": -2.85028,
    "lng": 13.82611,
    "isCapital": true,
    "countryIso3": "COG"
  },
  {
    "name": "Tchikapika",
    "lat": -1.26444,
    "lng": 16.18028,
    "isCapital": false,
    "countryIso3": "COG"
  },
  {
    "name": "Souanké",
    "lat": 2.05966,
    "lng": 14.13219,
    "isCapital": false,
    "countryIso3": "COG"
  },
  {
    "name": "Zwingen",
    "lat": 47.43825,
    "lng": 7.53027,
    "isCapital": true,
    "countryIso3": "CHE"
  },
  {
    "name": "Zweisimmen",
    "lat": 46.55539,
    "lng": 7.37302,
    "isCapital": false,
    "countryIso3": "CHE"
  },
  {
    "name": "Zuzwil",
    "lat": 47.47452,
    "lng": 9.11196,
    "isCapital": false,
    "countryIso3": "CHE"
  },
  {
    "name": "Zyogouiné",
    "lat": 7.19246,
    "lng": -7.64056,
    "isCapital": true,
    "countryIso3": "CIV"
  },
  {
    "name": "Zuénoula",
    "lat": 7.43027,
    "lng": -6.05054,
    "isCapital": false,
    "countryIso3": "CIV"
  },
  {
    "name": "Zuenda",
    "lat": 7.69915,
    "lng": -5.59069,
    "isCapital": false,
    "countryIso3": "CIV"
  },
  {
    "name": "Avarua",
    "lat": -21.2075,
    "lng": -159.77546,
    "isCapital": true,
    "countryIso3": "COK"
  },
  {
    "name": "Matavera",
    "lat": -21.22444,
    "lng": -159.73333,
    "isCapital": false,
    "countryIso3": "COK"
  },
  {
    "name": "Yungay",
    "lat": -37.11977,
    "lng": -72.01984,
    "isCapital": true,
    "countryIso3": "CHL"
  },
  {
    "name": "Yumbel",
    "lat": -37.0982,
    "lng": -72.56084,
    "isCapital": false,
    "countryIso3": "CHL"
  },
  {
    "name": "Yerbas Buenas",
    "lat": -35.74816,
    "lng": -71.5853,
    "isCapital": false,
    "countryIso3": "CHL"
  },
  {
    "name": "Yoko",
    "lat": 5.53333,
    "lng": 12.31667,
    "isCapital": true,
    "countryIso3": "CMR"
  },
  {
    "name": "Yokadouma",
    "lat": 3.51667,
    "lng": 15.05,
    "isCapital": false,
    "countryIso3": "CMR"
  },
  {
    "name": "Yaoundé",
    "lat": 3.86667,
    "lng": 11.51667,
    "isCapital": false,
    "countryIso3": "CMR"
  },
  {
    "name": "Beijing",
    "lat": 39.9075,
    "lng": 116.39723,
    "isCapital": true,
    "countryIso3": "CHN"
  },
  {
    "name": "Zongga",
    "lat": 29,
    "lng": 85.25,
    "isCapital": false,
    "countryIso3": "CHN"
  },
  {
    "name": "Zito",
    "lat": 30.73893,
    "lng": 95.83613,
    "isCapital": false,
    "countryIso3": "CHN"
  },
  {
    "name": "Zipaquirá",
    "lat": 5.02208,
    "lng": -74.00481,
    "isCapital": true,
    "countryIso3": "COL"
  },
  {
    "name": "Zipacón",
    "lat": 4.75881,
    "lng": -74.38017,
    "isCapital": false,
    "countryIso3": "COL"
  },
  {
    "name": "Zetaquira",
    "lat": 5.28215,
    "lng": -73.16896,
    "isCapital": false,
    "countryIso3": "COL"
  },
  {
    "name": "Zarcero",
    "lat": 10.18455,
    "lng": -84.39163,
    "isCapital": true,
    "countryIso3": "CRI"
  },
  {
    "name": "Zapotal",
    "lat": 10,
    "lng": -85.3,
    "isCapital": false,
    "countryIso3": "CRI"
  },
  {
    "name": "Uvita",
    "lat": 9.17039,
    "lng": -83.7395,
    "isCapital": false,
    "countryIso3": "CRI"
  },
  {
    "name": "Zaza del Medio",
    "lat": 21.99707,
    "lng": -79.36678,
    "isCapital": true,
    "countryIso3": "CUB"
  },
  {
    "name": "Yara",
    "lat": 20.27417,
    "lng": -76.95227,
    "isCapital": false,
    "countryIso3": "CUB"
  },
  {
    "name": "Yaguajay",
    "lat": 22.32693,
    "lng": -79.23687,
    "isCapital": false,
    "countryIso3": "CUB"
  },
  {
    "name": "Nova Sintra",
    "lat": 14.87139,
    "lng": -24.69556,
    "isCapital": true,
    "countryIso3": "CPV"
  },
  {
    "name": "Vila Nova",
    "lat": 14.9328,
    "lng": -23.51069,
    "isCapital": false,
    "countryIso3": "CPV"
  },
  {
    "name": "Vila do Maio",
    "lat": 15.13823,
    "lng": -23.21158,
    "isCapital": false,
    "countryIso3": "CPV"
  },
  {
    "name": "Willemstad",
    "lat": 12.12246,
    "lng": -68.88641,
    "isCapital": true,
    "countryIso3": "CUW"
  },
  {
    "name": "Sint Michiel Liber",
    "lat": 12.15,
    "lng": -68.98333,
    "isCapital": false,
    "countryIso3": "CUW"
  },
  {
    "name": "Santa Rosa",
    "lat": 12.11667,
    "lng": -68.88333,
    "isCapital": false,
    "countryIso3": "CUW"
  },
  {
    "name": "Flying Fish Cove",
    "lat": -10.42172,
    "lng": 105.67912,
    "isCapital": true,
    "countryIso3": "CXR"
  },
  {
    "name": "Protaras",
    "lat": 35.0125,
    "lng": 34.05833,
    "isCapital": true,
    "countryIso3": "CYP"
  },
  {
    "name": "Ýpsonas",
    "lat": 34.68797,
    "lng": 32.96191,
    "isCapital": false,
    "countryIso3": "CYP"
  },
  {
    "name": "Aigialoúsa",
    "lat": 35.53513,
    "lng": 34.18944,
    "isCapital": false,
    "countryIso3": "CYP"
  },
  {
    "name": "Dvůr Králové nad Labem",
    "lat": 50.43172,
    "lng": 15.81402,
    "isCapital": true,
    "countryIso3": "CZE"
  },
  {
    "name": "Zvole",
    "lat": 49.93466,
    "lng": 14.41769,
    "isCapital": false,
    "countryIso3": "CZE"
  },
  {
    "name": "Žulová",
    "lat": 50.30933,
    "lng": 17.09871,
    "isCapital": false,
    "countryIso3": "CZE"
  },
  {
    "name": "Überlingen",
    "lat": 47.76977,
    "lng": 9.17136,
    "isCapital": true,
    "countryIso3": "DEU"
  },
  {
    "name": "Zwötzen",
    "lat": 50.84858,
    "lng": 12.08635,
    "isCapital": false,
    "countryIso3": "DEU"
  },
  {
    "name": "Zwota",
    "lat": 50.35103,
    "lng": 12.42241,
    "isCapital": false,
    "countryIso3": "DEU"
  },
  {
    "name": "Yoboki",
    "lat": 11.51139,
    "lng": 42.10639,
    "isCapital": true,
    "countryIso3": "DJI"
  },
  {
    "name": "Ouê‘a",
    "lat": 11.50306,
    "lng": 42.85528,
    "isCapital": false,
    "countryIso3": "DJI"
  },
  {
    "name": "Tadjoura",
    "lat": 11.78778,
    "lng": 42.88222,
    "isCapital": false,
    "countryIso3": "DJI"
  },
  {
    "name": "Vrå",
    "lat": 57.3537,
    "lng": 9.94176,
    "isCapital": true,
    "countryIso3": "DNK"
  },
  {
    "name": "Vordingborg",
    "lat": 55.00801,
    "lng": 11.91057,
    "isCapital": false,
    "countryIso3": "DNK"
  },
  {
    "name": "Vorbasse",
    "lat": 55.62992,
    "lng": 9.08239,
    "isCapital": false,
    "countryIso3": "DNK"
  },
  {
    "name": "Woodford Hill",
    "lat": 15.58093,
    "lng": -61.33149,
    "isCapital": true,
    "countryIso3": "DMA"
  },
  {
    "name": "Wesley",
    "lat": 15.56667,
    "lng": -61.31667,
    "isCapital": false,
    "countryIso3": "DMA"
  },
  {
    "name": "Soufrière",
    "lat": 15.23374,
    "lng": -61.35881,
    "isCapital": false,
    "countryIso3": "DMA"
  },
  {
    "name": "Yayas de Viajama",
    "lat": 18.6071,
    "lng": -70.92753,
    "isCapital": true,
    "countryIso3": "DOM"
  },
  {
    "name": "Yamasá",
    "lat": 18.77315,
    "lng": -70.02583,
    "isCapital": false,
    "countryIso3": "DOM"
  },
  {
    "name": "Yaguate",
    "lat": 18.3353,
    "lng": -70.18113,
    "isCapital": false,
    "countryIso3": "DOM"
  },
  {
    "name": "Boumerdas",
    "lat": 36.76639,
    "lng": 3.47717,
    "isCapital": true,
    "countryIso3": "DZA"
  },
  {
    "name": "Zighout Youcef",
    "lat": 36.53307,
    "lng": 6.71237,
    "isCapital": false,
    "countryIso3": "DZA"
  },
  {
    "name": "Ziama Mansouria",
    "lat": 36.67324,
    "lng": 5.48119,
    "isCapital": false,
    "countryIso3": "DZA"
  },
  {
    "name": "Zuña",
    "lat": -2.18781,
    "lng": -78.35907,
    "isCapital": true,
    "countryIso3": "ECU"
  },
  {
    "name": "Zumbahua",
    "lat": -0.96098,
    "lng": -78.89839,
    "isCapital": false,
    "countryIso3": "ECU"
  },
  {
    "name": "Zaruma",
    "lat": -3.69227,
    "lng": -79.61254,
    "isCapital": false,
    "countryIso3": "ECU"
  },
  {
    "name": "Vändra",
    "lat": 58.64806,
    "lng": 25.03611,
    "isCapital": true,
    "countryIso3": "EST"
  },
  {
    "name": "Võru",
    "lat": 57.83389,
    "lng": 27.01944,
    "isCapital": false,
    "countryIso3": "EST"
  },
  {
    "name": "Võhma",
    "lat": 58.62833,
    "lng": 25.54833,
    "isCapital": false,
    "countryIso3": "EST"
  },
  {
    "name": "Zefta",
    "lat": 30.7142,
    "lng": 31.24425,
    "isCapital": true,
    "countryIso3": "EGY"
  },
  {
    "name": "Zāwyat Umm ar Rakham",
    "lat": 31.39596,
    "lng": 27.04526,
    "isCapital": false,
    "countryIso3": "EGY"
  },
  {
    "name": "Zaafarana",
    "lat": 29.11007,
    "lng": 32.66012,
    "isCapital": false,
    "countryIso3": "EGY"
  },
  {
    "name": "Tifariti",
    "lat": 26.1579,
    "lng": -10.55889,
    "isCapital": true,
    "countryIso3": "ESH"
  },
  {
    "name": "Tichla",
    "lat": 21.5837,
    "lng": -14.97222,
    "isCapital": false,
    "countryIso3": "ESH"
  },
  {
    "name": "El Marsa",
    "lat": 27.09611,
    "lng": -13.41583,
    "isCapital": false,
    "countryIso3": "ESH"
  },
  {
    "name": "Teseney",
    "lat": 15.11,
    "lng": 36.6575,
    "isCapital": true,
    "countryIso3": "ERI"
  },
  {
    "name": "Massawa",
    "lat": 15.60811,
    "lng": 39.47455,
    "isCapital": false,
    "countryIso3": "ERI"
  },
  {
    "name": "Keren",
    "lat": 15.77792,
    "lng": 38.45107,
    "isCapital": false,
    "countryIso3": "ERI"
  },
  {
    "name": "Zurgena",
    "lat": 37.34218,
    "lng": -2.03985,
    "isCapital": true,
    "countryIso3": "ESP"
  },
  {
    "name": "Zújar",
    "lat": 37.54285,
    "lng": -2.84197,
    "isCapital": false,
    "countryIso3": "ESP"
  },
  {
    "name": "Zuheros",
    "lat": 37.54332,
    "lng": -4.31531,
    "isCapital": false,
    "countryIso3": "ESP"
  },
  {
    "name": "Waal",
    "lat": 6.88658,
    "lng": 46.21508,
    "isCapital": true,
    "countryIso3": "ETH"
  },
  {
    "name": "Fadhigaradle",
    "lat": 6.17559,
    "lng": 45.29866,
    "isCapital": false,
    "countryIso3": "ETH"
  },
  {
    "name": "Ziway",
    "lat": 7.93333,
    "lng": 38.71667,
    "isCapital": false,
    "countryIso3": "ETH"
  },
  {
    "name": "Herukka",
    "lat": 65.09712,
    "lng": 25.40485,
    "isCapital": true,
    "countryIso3": "FIN"
  },
  {
    "name": "Linnanmaa",
    "lat": 65.05559,
    "lng": 25.46639,
    "isCapital": false,
    "countryIso3": "FIN"
  },
  {
    "name": "Ytteresse",
    "lat": 63.62209,
    "lng": 22.99456,
    "isCapital": false,
    "countryIso3": "FIN"
  },
  {
    "name": "Vatukoula",
    "lat": -17.50136,
    "lng": 177.84983,
    "isCapital": true,
    "countryIso3": "FJI"
  },
  {
    "name": "Vaileka",
    "lat": -17.37894,
    "lng": 178.15329,
    "isCapital": false,
    "countryIso3": "FJI"
  },
  {
    "name": "Tavua",
    "lat": -17.44221,
    "lng": 177.86221,
    "isCapital": false,
    "countryIso3": "FJI"
  },
  {
    "name": "Stanley",
    "lat": -51.69382,
    "lng": -57.85701,
    "isCapital": true,
    "countryIso3": "FLK"
  },
  {
    "name": "Weno",
    "lat": 7.44648,
    "lng": 151.84135,
    "isCapital": true,
    "countryIso3": "FSM"
  },
  {
    "name": "Tofol",
    "lat": 5.32479,
    "lng": 163.00781,
    "isCapital": false,
    "countryIso3": "FSM"
  },
  {
    "name": "Palikir",
    "lat": 6.92477,
    "lng": 158.16109,
    "isCapital": false,
    "countryIso3": "FSM"
  },
  {
    "name": "Við Sjógv",
    "lat": 62.11967,
    "lng": -6.75005,
    "isCapital": true,
    "countryIso3": "FRO"
  },
  {
    "name": "Viðareiði",
    "lat": 62.35999,
    "lng": -6.5313,
    "isCapital": false,
    "countryIso3": "FRO"
  },
  {
    "name": "Vestmanna",
    "lat": 62.15354,
    "lng": -7.17291,
    "isCapital": false,
    "countryIso3": "FRO"
  },
  {
    "name": "Villeparisis",
    "lat": 48.94208,
    "lng": 2.61463,
    "isCapital": true,
    "countryIso3": "FRA"
  },
  {
    "name": "Peyrat-le-Château",
    "lat": 45.81376,
    "lng": 1.7726,
    "isCapital": false,
    "countryIso3": "FRA"
  },
  {
    "name": "Blaye",
    "lat": 45.12764,
    "lng": -0.66225,
    "isCapital": false,
    "countryIso3": "FRA"
  },
  {
    "name": "Tsogni",
    "lat": -2.80365,
    "lng": 10.16058,
    "isCapital": true,
    "countryIso3": "GAB"
  },
  {
    "name": "Tchibanga",
    "lat": -2.93323,
    "lng": 10.98178,
    "isCapital": false,
    "countryIso3": "GAB"
  },
  {
    "name": "Port-Gentil",
    "lat": -0.71933,
    "lng": 8.78151,
    "isCapital": false,
    "countryIso3": "GAB"
  },
  {
    "name": "Londonderry County Borough",
    "lat": 54.99721,
    "lng": -7.30917,
    "isCapital": true,
    "countryIso3": "GBR"
  },
  {
    "name": "Ystrad Mynach",
    "lat": 51.64276,
    "lng": -3.2362,
    "isCapital": false,
    "countryIso3": "GBR"
  },
  {
    "name": "Ystradgynlais",
    "lat": 51.76667,
    "lng": -3.76667,
    "isCapital": false,
    "countryIso3": "GBR"
  },
  {
    "name": "Victoria",
    "lat": 12.19021,
    "lng": -61.70677,
    "isCapital": true,
    "countryIso3": "GRD"
  },
  {
    "name": "Upper La Taste",
    "lat": 12.19302,
    "lng": -61.61813,
    "isCapital": false,
    "countryIso3": "GRD"
  },
  {
    "name": "Sauteurs",
    "lat": 12.21833,
    "lng": -61.63917,
    "isCapital": false,
    "countryIso3": "GRD"
  },
  {
    "name": "Zugdidi",
    "lat": 42.5084,
    "lng": 41.86796,
    "isCapital": true,
    "countryIso3": "GEO"
  },
  {
    "name": "Zovreti",
    "lat": 42.18605,
    "lng": 43.04129,
    "isCapital": false,
    "countryIso3": "GEO"
  },
  {
    "name": "Zhinvali",
    "lat": 42.13181,
    "lng": 44.77264,
    "isCapital": false,
    "countryIso3": "GEO"
  },
  {
    "name": "Sinnamary",
    "lat": 5.37676,
    "lng": -52.95679,
    "isCapital": true,
    "countryIso3": "GUF"
  },
  {
    "name": "Saint-Laurent-du-Maroni",
    "lat": 5.50153,
    "lng": -54.02916,
    "isCapital": false,
    "countryIso3": "GUF"
  },
  {
    "name": "Saint-Georges",
    "lat": 3.88857,
    "lng": -51.80243,
    "isCapital": false,
    "countryIso3": "GUF"
  },
  {
    "name": "Torteval",
    "lat": 49.43333,
    "lng": -2.65,
    "isCapital": true,
    "countryIso3": "GGY"
  },
  {
    "name": "Saint Sampson",
    "lat": 49.48389,
    "lng": -2.52333,
    "isCapital": false,
    "countryIso3": "GGY"
  },
  {
    "name": "Saint Peter Port",
    "lat": 49.45981,
    "lng": -2.53527,
    "isCapital": false,
    "countryIso3": "GGY"
  },
  {
    "name": "Yendi",
    "lat": 9.44272,
    "lng": -0.00991,
    "isCapital": true,
    "countryIso3": "GHA"
  },
  {
    "name": "Yegyi",
    "lat": 8.22542,
    "lng": -0.64889,
    "isCapital": false,
    "countryIso3": "GHA"
  },
  {
    "name": "Winneba",
    "lat": 5.35113,
    "lng": -0.62313,
    "isCapital": false,
    "countryIso3": "GHA"
  },
  {
    "name": "Gibraltar",
    "lat": 36.14474,
    "lng": -5.35257,
    "isCapital": true,
    "countryIso3": "GIB"
  },
  {
    "name": "Reclamation Areas",
    "lat": 36.14399,
    "lng": -5.35689,
    "isCapital": false,
    "countryIso3": "GIB"
  },
  {
    "name": "Town Area",
    "lat": 36.12191,
    "lng": -5.34889,
    "isCapital": false,
    "countryIso3": "GIB"
  },
  {
    "name": "Upernavik",
    "lat": 72.78358,
    "lng": -56.14933,
    "isCapital": true,
    "countryIso3": "GRL"
  },
  {
    "name": "Sisimiut",
    "lat": 66.93946,
    "lng": -53.6735,
    "isCapital": false,
    "countryIso3": "GRL"
  },
  {
    "name": "Qasigiannguit",
    "lat": 68.81926,
    "lng": -51.19221,
    "isCapital": false,
    "countryIso3": "GRL"
  },
  {
    "name": "Old Yundum",
    "lat": 13.3625,
    "lng": -16.68611,
    "isCapital": true,
    "countryIso3": "GMB"
  },
  {
    "name": "Yundum",
    "lat": 13.34556,
    "lng": -16.67278,
    "isCapital": false,
    "countryIso3": "GMB"
  },
  {
    "name": "Wellingara Ba",
    "lat": 13.41667,
    "lng": -15.4,
    "isCapital": false,
    "countryIso3": "GMB"
  },
  {
    "name": "Youkounkoun",
    "lat": 12.5311,
    "lng": -13.1224,
    "isCapital": true,
    "countryIso3": "GIN"
  },
  {
    "name": "Yomou",
    "lat": 7.56748,
    "lng": -9.26283,
    "isCapital": false,
    "countryIso3": "GIN"
  },
  {
    "name": "Yende Millimou",
    "lat": 8.88722,
    "lng": -10.17222,
    "isCapital": false,
    "countryIso3": "GIN"
  },
  {
    "name": "Vieux-Habitants",
    "lat": 16.05866,
    "lng": -61.76667,
    "isCapital": true,
    "countryIso3": "GLP"
  },
  {
    "name": "Trois-Rivières",
    "lat": 15.97595,
    "lng": -61.64492,
    "isCapital": false,
    "countryIso3": "GLP"
  },
  {
    "name": "Petites Anses",
    "lat": 15.84993,
    "lng": -61.64457,
    "isCapital": false,
    "countryIso3": "GLP"
  },
  {
    "name": "Santiago de Baney",
    "lat": 3.6992,
    "lng": 8.9084,
    "isCapital": true,
    "countryIso3": "GNQ"
  },
  {
    "name": "Aual",
    "lat": -1.44556,
    "lng": 5.62722,
    "isCapital": false,
    "countryIso3": "GNQ"
  },
  {
    "name": "San Antonio de Palé",
    "lat": -1.4068,
    "lng": 5.63198,
    "isCapital": false,
    "countryIso3": "GNQ"
  },
  {
    "name": "Zonianá",
    "lat": 35.29502,
    "lng": 24.82944,
    "isCapital": true,
    "countryIso3": "GRC"
  },
  {
    "name": "Zevgolateió",
    "lat": 37.93333,
    "lng": 22.8,
    "isCapital": false,
    "countryIso3": "GRC"
  },
  {
    "name": "Zarós",
    "lat": 35.1303,
    "lng": 24.90412,
    "isCapital": false,
    "countryIso3": "GRC"
  },
  {
    "name": "Grytviken",
    "lat": -54.28111,
    "lng": -36.5092,
    "isCapital": true,
    "countryIso3": "SGS"
  },
  {
    "name": "Zunilito",
    "lat": 14.61264,
    "lng": -91.5098,
    "isCapital": true,
    "countryIso3": "GTM"
  },
  {
    "name": "Zunil",
    "lat": 14.78463,
    "lng": -91.48345,
    "isCapital": false,
    "countryIso3": "GTM"
  },
  {
    "name": "Zaragoza",
    "lat": 14.64968,
    "lng": -90.89034,
    "isCapital": false,
    "countryIso3": "GTM"
  },
  {
    "name": "Piti Village",
    "lat": 13.46256,
    "lng": 144.69331,
    "isCapital": true,
    "countryIso3": "GUM"
  },
  {
    "name": "Santa Rita Village",
    "lat": 13.38608,
    "lng": 144.67226,
    "isCapital": false,
    "countryIso3": "GUM"
  },
  {
    "name": "Sinajana Village",
    "lat": 13.46334,
    "lng": 144.75406,
    "isCapital": false,
    "countryIso3": "GUM"
  },
  {
    "name": "Xitole",
    "lat": 11.73333,
    "lng": -14.81667,
    "isCapital": true,
    "countryIso3": "GNB"
  },
  {
    "name": "Tite",
    "lat": 11.78333,
    "lng": -15.4,
    "isCapital": false,
    "countryIso3": "GNB"
  },
  {
    "name": "Sonaco",
    "lat": 12.4,
    "lng": -14.48333,
    "isCapital": false,
    "countryIso3": "GNB"
  },
  {
    "name": "Windsor Forest",
    "lat": 6.84568,
    "lng": -58.23521,
    "isCapital": true,
    "countryIso3": "GUY"
  },
  {
    "name": "Vreed-en-Hoop",
    "lat": 6.8109,
    "lng": -58.19375,
    "isCapital": false,
    "countryIso3": "GUY"
  },
  {
    "name": "Tuschen",
    "lat": 6.8766,
    "lng": -58.34259,
    "isCapital": false,
    "countryIso3": "GUY"
  },
  {
    "name": "Tsuen Wan",
    "lat": 22.37137,
    "lng": 114.11329,
    "isCapital": true,
    "countryIso3": "HKG"
  },
  {
    "name": "Yung Shue Wan",
    "lat": 22.22623,
    "lng": 114.11241,
    "isCapital": false,
    "countryIso3": "HKG"
  },
  {
    "name": "Yuen Long San Hui",
    "lat": 22.43333,
    "lng": 114.03333,
    "isCapital": false,
    "countryIso3": "HKG"
  },
  {
    "name": "Puerto Cortez",
    "lat": 15.82562,
    "lng": -87.92968,
    "isCapital": true,
    "countryIso3": "HND"
  },
  {
    "name": "Zopilotepe",
    "lat": 14.6,
    "lng": -86.26667,
    "isCapital": false,
    "countryIso3": "HND"
  },
  {
    "name": "Zamora",
    "lat": 15.63333,
    "lng": -86.06667,
    "isCapital": false,
    "countryIso3": "HND"
  },
  {
    "name": "Vranjic",
    "lat": 43.53333,
    "lng": 16.46667,
    "isCapital": true,
    "countryIso3": "HRV"
  },
  {
    "name": "Županja",
    "lat": 45.0775,
    "lng": 18.6975,
    "isCapital": false,
    "countryIso3": "HRV"
  },
  {
    "name": "Žumberak",
    "lat": 45.76711,
    "lng": 15.41483,
    "isCapital": false,
    "countryIso3": "HRV"
  },
  {
    "name": "Verrettes",
    "lat": 19.0505,
    "lng": -72.46585,
    "isCapital": true,
    "countryIso3": "HTI"
  },
  {
    "name": "Trou du Nord",
    "lat": 19.61668,
    "lng": -72.02442,
    "isCapital": false,
    "countryIso3": "HTI"
  },
  {
    "name": "Torbeck",
    "lat": 18.16338,
    "lng": -73.80949,
    "isCapital": false,
    "countryIso3": "HTI"
  },
  {
    "name": "Záhony",
    "lat": 48.40906,
    "lng": 22.17614,
    "isCapital": true,
    "countryIso3": "HUN"
  },
  {
    "name": "Zagyvarékas",
    "lat": 47.26667,
    "lng": 20.13333,
    "isCapital": false,
    "countryIso3": "HUN"
  },
  {
    "name": "Vésztő",
    "lat": 46.91667,
    "lng": 21.26667,
    "isCapital": false,
    "countryIso3": "HUN"
  },
  {
    "name": "Ujung Gading",
    "lat": 0.27293,
    "lng": 99.55762,
    "isCapital": true,
    "countryIso3": "IDN"
  },
  {
    "name": "Ujungbatu",
    "lat": 1.04239,
    "lng": 99.93461,
    "isCapital": false,
    "countryIso3": "IDN"
  },
  {
    "name": "Tualangcut",
    "lat": 4.4018,
    "lng": 98.0722,
    "isCapital": false,
    "countryIso3": "IDN"
  },
  {
    "name": "Buncrana",
    "lat": 55.13333,
    "lng": -7.45,
    "isCapital": true,
    "countryIso3": "IRL"
  },
  {
    "name": "Youghal",
    "lat": 51.95,
    "lng": -7.85056,
    "isCapital": false,
    "countryIso3": "IRL"
  },
  {
    "name": "Wicklow",
    "lat": 52.975,
    "lng": -6.04944,
    "isCapital": false,
    "countryIso3": "IRL"
  },
  {
    "name": "Tel Qatsir",
    "lat": 32.70549,
    "lng": 35.61793,
    "isCapital": true,
    "countryIso3": "ISR"
  },
  {
    "name": "Fīq",
    "lat": 32.77935,
    "lng": 35.70032,
    "isCapital": false,
    "countryIso3": "ISR"
  },
  {
    "name": "‘Ein Qunīya",
    "lat": 33.2378,
    "lng": 35.73114,
    "isCapital": false,
    "countryIso3": "ISR"
  },
  {
    "name": "Santon",
    "lat": 54.11667,
    "lng": -4.58333,
    "isCapital": true,
    "countryIso3": "IMN"
  },
  {
    "name": "Ramsey",
    "lat": 54.32273,
    "lng": -4.38526,
    "isCapital": false,
    "countryIso3": "IMN"
  },
  {
    "name": "Port Saint Mary",
    "lat": 54.07405,
    "lng": -4.73858,
    "isCapital": false,
    "countryIso3": "IMN"
  },
  {
    "name": "New Delhi",
    "lat": 28.62137,
    "lng": 77.2148,
    "isCapital": true,
    "countryIso3": "IND"
  },
  {
    "name": "Thang",
    "lat": 34.9274,
    "lng": 76.79336,
    "isCapital": false,
    "countryIso3": "IND"
  },
  {
    "name": "Pūnch",
    "lat": 33.77033,
    "lng": 74.09254,
    "isCapital": false,
    "countryIso3": "IND"
  },
  {
    "name": "Downtown",
    "lat": -7.26229,
    "lng": 72.37676,
    "isCapital": true,
    "countryIso3": "IOT"
  },
  {
    "name": "Zāwītah",
    "lat": 36.90547,
    "lng": 43.14478,
    "isCapital": true,
    "countryIso3": "IRQ"
  },
  {
    "name": "Zaxo",
    "lat": 37.14871,
    "lng": 42.68591,
    "isCapital": false,
    "countryIso3": "IRQ"
  },
  {
    "name": "Umm Qaşr",
    "lat": 30.0362,
    "lng": 47.91951,
    "isCapital": false,
    "countryIso3": "IRQ"
  },
  {
    "name": "Takht-e Qeyşar",
    "lat": 32.05908,
    "lng": 48.86752,
    "isCapital": true,
    "countryIso3": "IRN"
  },
  {
    "name": "Seyyed Nūr",
    "lat": 32.13928,
    "lng": 48.49952,
    "isCapital": false,
    "countryIso3": "IRN"
  },
  {
    "name": "Boneh-ye ‘Alvān",
    "lat": 32.11171,
    "lng": 48.45877,
    "isCapital": false,
    "countryIso3": "IRN"
  },
  {
    "name": "Siglufjörður",
    "lat": 66.15198,
    "lng": -18.90815,
    "isCapital": true,
    "countryIso3": "ISL"
  },
  {
    "name": "Sauðárkrókur",
    "lat": 65.74611,
    "lng": -19.63944,
    "isCapital": false,
    "countryIso3": "ISL"
  },
  {
    "name": "Neskaupstaður",
    "lat": 65.14819,
    "lng": -13.68368,
    "isCapital": false,
    "countryIso3": "ISL"
  },
  {
    "name": "Tromello",
    "lat": 45.2089,
    "lng": 8.87054,
    "isCapital": true,
    "countryIso3": "ITA"
  },
  {
    "name": "Zumpano",
    "lat": 39.31053,
    "lng": 16.29269,
    "isCapital": false,
    "countryIso3": "ITA"
  },
  {
    "name": "Zerfaliu",
    "lat": 39.96088,
    "lng": 8.70971,
    "isCapital": false,
    "countryIso3": "ITA"
  },
  {
    "name": "Saint John",
    "lat": 49.24556,
    "lng": -2.13861,
    "isCapital": true,
    "countryIso3": "JEY"
  },
  {
    "name": "Saint Helier",
    "lat": 49.18804,
    "lng": -2.10491,
    "isCapital": false,
    "countryIso3": "JEY"
  },
  {
    "name": "Trinity",
    "lat": 49.23408,
    "lng": -2.09272,
    "isCapital": false,
    "countryIso3": "JEY"
  },
  {
    "name": "Sherwood Content",
    "lat": 18.39116,
    "lng": -77.62834,
    "isCapital": true,
    "countryIso3": "JAM"
  },
  {
    "name": "Yallahs",
    "lat": 17.8748,
    "lng": -76.56245,
    "isCapital": false,
    "countryIso3": "JAM"
  },
  {
    "name": "Williamsfield",
    "lat": 18.06667,
    "lng": -77.46667,
    "isCapital": false,
    "countryIso3": "JAM"
  },
  {
    "name": "Zaḩar",
    "lat": 32.5667,
    "lng": 35.77811,
    "isCapital": true,
    "countryIso3": "JOR"
  },
  {
    "name": "Yarqā",
    "lat": 31.97583,
    "lng": 35.69638,
    "isCapital": false,
    "countryIso3": "JOR"
  },
  {
    "name": "Waqqāş",
    "lat": 32.54214,
    "lng": 35.60508,
    "isCapital": false,
    "countryIso3": "JOR"
  },
  {
    "name": "Tokyo",
    "lat": 35.6895,
    "lng": 139.69171,
    "isCapital": true,
    "countryIso3": "JPN"
  },
  {
    "name": "Shingū",
    "lat": 33.73333,
    "lng": 135.98333,
    "isCapital": false,
    "countryIso3": "JPN"
  },
  {
    "name": "Atsugi",
    "lat": 35.44272,
    "lng": 139.36931,
    "isCapital": false,
    "countryIso3": "JPN"
  },
  {
    "name": "Yala",
    "lat": 0.09438,
    "lng": 34.53602,
    "isCapital": true,
    "countryIso3": "KEN"
  },
  {
    "name": "Wundanyi",
    "lat": -3.39642,
    "lng": 38.35729,
    "isCapital": false,
    "countryIso3": "KEN"
  },
  {
    "name": "Wote",
    "lat": -1.78079,
    "lng": 37.62882,
    "isCapital": false,
    "countryIso3": "KEN"
  },
  {
    "name": "Tayan",
    "lat": 39.9026,
    "lng": 71.10826,
    "isCapital": true,
    "countryIso3": "KGZ"
  },
  {
    "name": "Suluktu",
    "lat": 39.93652,
    "lng": 69.56779,
    "isCapital": false,
    "countryIso3": "KGZ"
  },
  {
    "name": "Kyzyl-Eshme",
    "lat": 39.56559,
    "lng": 72.27153,
    "isCapital": false,
    "countryIso3": "KGZ"
  },
  {
    "name": "Phnom Penh",
    "lat": 11.56245,
    "lng": 104.91601,
    "isCapital": true,
    "countryIso3": "KHM"
  },
  {
    "name": "Veun Sai",
    "lat": 13.97598,
    "lng": 106.81144,
    "isCapital": false,
    "countryIso3": "KHM"
  },
  {
    "name": "Varin",
    "lat": 13.86886,
    "lng": 103.82987,
    "isCapital": false,
    "countryIso3": "KHM"
  },
  {
    "name": "Teaoraereke Village",
    "lat": 1.33309,
    "lng": 173.01162,
    "isCapital": true,
    "countryIso3": "KIR"
  },
  {
    "name": "Rawannawi Village",
    "lat": 2.05379,
    "lng": 173.26354,
    "isCapital": false,
    "countryIso3": "KIR"
  },
  {
    "name": "Buota Village",
    "lat": 1.39078,
    "lng": 173.13082,
    "isCapital": false,
    "countryIso3": "KIR"
  },
  {
    "name": "Ouanani",
    "lat": -12.3375,
    "lng": 43.7975,
    "isCapital": true,
    "countryIso3": "COM"
  },
  {
    "name": "Vouani",
    "lat": -12.24417,
    "lng": 44.37444,
    "isCapital": false,
    "countryIso3": "COM"
  },
  {
    "name": "Vanambouani",
    "lat": -11.61139,
    "lng": 43.25306,
    "isCapital": false,
    "countryIso3": "COM"
  },
  {
    "name": "Trinity",
    "lat": 17.30037,
    "lng": -62.77584,
    "isCapital": true,
    "countryIso3": "KNA"
  },
  {
    "name": "Sandy Point Town",
    "lat": 17.35908,
    "lng": -62.84858,
    "isCapital": false,
    "countryIso3": "KNA"
  },
  {
    "name": "Saint Paul’s",
    "lat": 17.40605,
    "lng": -62.83562,
    "isCapital": false,
    "countryIso3": "KNA"
  },
  {
    "name": "Pyongyang",
    "lat": 39.03385,
    "lng": 125.75432,
    "isCapital": true,
    "countryIso3": "PRK"
  },
  {
    "name": "Ryonggang-ŭp",
    "lat": 38.85611,
    "lng": 125.42444,
    "isCapital": false,
    "countryIso3": "PRK"
  },
  {
    "name": "Yŏngbyŏn",
    "lat": 39.81333,
    "lng": 125.80417,
    "isCapital": false,
    "countryIso3": "PRK"
  },
  {
    "name": "Seoul",
    "lat": 37.566,
    "lng": 126.9784,
    "isCapital": true,
    "countryIso3": "KOR"
  },
  {
    "name": "Heunghae",
    "lat": 36.10945,
    "lng": 129.34517,
    "isCapital": false,
    "countryIso3": "KOR"
  },
  {
    "name": "Yuseong",
    "lat": 36.35389,
    "lng": 127.33667,
    "isCapital": false,
    "countryIso3": "KOR"
  },
  {
    "name": "Janūb as Surrah",
    "lat": 29.26917,
    "lng": 47.97806,
    "isCapital": true,
    "countryIso3": "KWT"
  },
  {
    "name": "Ḩawallī",
    "lat": 29.33278,
    "lng": 48.02861,
    "isCapital": false,
    "countryIso3": "KWT"
  },
  {
    "name": "Bayān",
    "lat": 29.3032,
    "lng": 48.04881,
    "isCapital": false,
    "countryIso3": "KWT"
  },
  {
    "name": "Whitehall Estates",
    "lat": 19.31313,
    "lng": -81.38208,
    "isCapital": true,
    "countryIso3": "CYM"
  },
  {
    "name": "West Bay",
    "lat": 19.38197,
    "lng": -81.39281,
    "isCapital": false,
    "countryIso3": "CYM"
  },
  {
    "name": "Watering Place",
    "lat": 19.73692,
    "lng": -79.77805,
    "isCapital": false,
    "countryIso3": "CYM"
  },
  {
    "name": "Zhumysker",
    "lat": 49.33333,
    "lng": 49.4,
    "isCapital": true,
    "countryIso3": "KAZ"
  },
  {
    "name": "Zhetybay",
    "lat": 43.58928,
    "lng": 52.10313,
    "isCapital": false,
    "countryIso3": "KAZ"
  },
  {
    "name": "Zhanaozen",
    "lat": 43.34116,
    "lng": 52.86192,
    "isCapital": false,
    "countryIso3": "KAZ"
  },
  {
    "name": "Vientiane",
    "lat": 17.96667,
    "lng": 102.6,
    "isCapital": true,
    "countryIso3": "LAO"
  },
  {
    "name": "Ban Xamtai",
    "lat": 19.99,
    "lng": 104.6347,
    "isCapital": false,
    "countryIso3": "LAO"
  },
  {
    "name": "Xam Nua",
    "lat": 20.4164,
    "lng": 104.045,
    "isCapital": false,
    "countryIso3": "LAO"
  },
  {
    "name": "Zghartā",
    "lat": 34.39739,
    "lng": 35.89493,
    "isCapital": true,
    "countryIso3": "LBN"
  },
  {
    "name": "Zahlé",
    "lat": 33.84675,
    "lng": 35.90203,
    "isCapital": false,
    "countryIso3": "LBN"
  },
  {
    "name": "Tripoli",
    "lat": 34.43352,
    "lng": 35.84415,
    "isCapital": false,
    "countryIso3": "LBN"
  },
  {
    "name": "Vieux Fort",
    "lat": 13.71667,
    "lng": -60.95,
    "isCapital": true,
    "countryIso3": "LCA"
  },
  {
    "name": "Soufrière",
    "lat": 13.85616,
    "lng": -61.0566,
    "isCapital": false,
    "countryIso3": "LCA"
  },
  {
    "name": "Praslin",
    "lat": 13.87545,
    "lng": -60.89717,
    "isCapital": false,
    "countryIso3": "LCA"
  },
  {
    "name": "Vaduz",
    "lat": 47.14151,
    "lng": 9.52154,
    "isCapital": true,
    "countryIso3": "LIE"
  },
  {
    "name": "Triesenberg",
    "lat": 47.11815,
    "lng": 9.54197,
    "isCapital": false,
    "countryIso3": "LIE"
  },
  {
    "name": "Triesen",
    "lat": 47.10752,
    "lng": 9.52815,
    "isCapital": false,
    "countryIso3": "LIE"
  },
  {
    "name": "Welisara",
    "lat": 7.0281,
    "lng": 79.9014,
    "isCapital": true,
    "countryIso3": "LKA"
  },
  {
    "name": "Weligama",
    "lat": 5.97501,
    "lng": 80.42968,
    "isCapital": false,
    "countryIso3": "LKA"
  },
  {
    "name": "Wattegama",
    "lat": 6.7989,
    "lng": 81.4808,
    "isCapital": false,
    "countryIso3": "LKA"
  },
  {
    "name": "Zwedru",
    "lat": 6.06846,
    "lng": -8.13559,
    "isCapital": true,
    "countryIso3": "LBR"
  },
  {
    "name": "Zorzor",
    "lat": 7.77944,
    "lng": -9.43028,
    "isCapital": false,
    "countryIso3": "LBR"
  },
  {
    "name": "New Yekepa",
    "lat": 7.57944,
    "lng": -8.53778,
    "isCapital": false,
    "countryIso3": "LBR"
  },
  {
    "name": "Tsa Kholo",
    "lat": -29.66918,
    "lng": 27.15164,
    "isCapital": true,
    "countryIso3": "LSO"
  },
  {
    "name": "Thabana Morena",
    "lat": -29.96008,
    "lng": 27.42044,
    "isCapital": false,
    "countryIso3": "LSO"
  },
  {
    "name": "Teyateyaneng",
    "lat": -29.14719,
    "lng": 27.74895,
    "isCapital": false,
    "countryIso3": "LSO"
  },
  {
    "name": "Žiežmariai",
    "lat": 54.80725,
    "lng": 24.44073,
    "isCapital": true,
    "countryIso3": "LTU"
  },
  {
    "name": "Žemaičių Naumiestis",
    "lat": 55.35941,
    "lng": 21.70364,
    "isCapital": false,
    "countryIso3": "LTU"
  },
  {
    "name": "Zarasai",
    "lat": 55.73225,
    "lng": 26.25115,
    "isCapital": false,
    "countryIso3": "LTU"
  },
  {
    "name": "Wormeldange",
    "lat": 49.61114,
    "lng": 6.40546,
    "isCapital": true,
    "countryIso3": "LUX"
  },
  {
    "name": "Winseler",
    "lat": 49.96778,
    "lng": 5.89028,
    "isCapital": false,
    "countryIso3": "LUX"
  },
  {
    "name": "Wincrange",
    "lat": 50.05333,
    "lng": 5.91917,
    "isCapital": false,
    "countryIso3": "LUX"
  },
  {
    "name": "Valmiera",
    "lat": 57.54108,
    "lng": 25.42751,
    "isCapital": true,
    "countryIso3": "LVA"
  },
  {
    "name": "Zilupe",
    "lat": 56.38616,
    "lng": 28.12165,
    "isCapital": false,
    "countryIso3": "LVA"
  },
  {
    "name": "Zelmeņi",
    "lat": 56.45167,
    "lng": 23.35194,
    "isCapital": false,
    "countryIso3": "LVA"
  },
  {
    "name": "Al Bardīyah",
    "lat": 31.75601,
    "lng": 25.0853,
    "isCapital": true,
    "countryIso3": "LBY"
  },
  {
    "name": "Mukhaylá",
    "lat": 32.16005,
    "lng": 22.27845,
    "isCapital": false,
    "countryIso3": "LBY"
  },
  {
    "name": "Umm ar Rizam",
    "lat": 32.53332,
    "lng": 23.00904,
    "isCapital": false,
    "countryIso3": "LBY"
  },
  {
    "name": "Smara",
    "lat": 26.73841,
    "lng": -11.67194,
    "isCapital": true,
    "countryIso3": "MAR"
  },
  {
    "name": "Aousserd",
    "lat": 22.554,
    "lng": -14.33,
    "isCapital": false,
    "countryIso3": "MAR"
  },
  {
    "name": "Zoumi",
    "lat": 34.80321,
    "lng": -5.34458,
    "isCapital": false,
    "countryIso3": "MAR"
  },
  {
    "name": "Monte-Carlo",
    "lat": 43.73976,
    "lng": 7.42732,
    "isCapital": true,
    "countryIso3": "MCO"
  },
  {
    "name": "Monaco",
    "lat": 43.73718,
    "lng": 7.42145,
    "isCapital": false,
    "countryIso3": "MCO"
  },
  {
    "name": "La Condamine",
    "lat": 43.73439,
    "lng": 7.42024,
    "isCapital": false,
    "countryIso3": "MCO"
  },
  {
    "name": "Tiraspolul Nou",
    "lat": 46.83,
    "lng": 29.564,
    "isCapital": true,
    "countryIso3": "MDA"
  },
  {
    "name": "Edineţ",
    "lat": 48.17319,
    "lng": 27.30075,
    "isCapital": false,
    "countryIso3": "MDA"
  },
  {
    "name": "Iargara",
    "lat": 46.4252,
    "lng": 28.42676,
    "isCapital": false,
    "countryIso3": "MDA"
  },
  {
    "name": "Rožaje",
    "lat": 42.83299,
    "lng": 20.16652,
    "isCapital": true,
    "countryIso3": "MNE"
  },
  {
    "name": "Ibarac",
    "lat": 42.83611,
    "lng": 20.16194,
    "isCapital": false,
    "countryIso3": "MNE"
  },
  {
    "name": "Žabljak",
    "lat": 43.15423,
    "lng": 19.12325,
    "isCapital": false,
    "countryIso3": "MNE"
  },
  {
    "name": "Saint-James",
    "lat": 18.06454,
    "lng": -63.08554,
    "isCapital": true,
    "countryIso3": "MAF"
  },
  {
    "name": "Colombier",
    "lat": 18.07193,
    "lng": -63.0601,
    "isCapital": false,
    "countryIso3": "MAF"
  },
  {
    "name": "Quartier d’Orléans",
    "lat": 18.06912,
    "lng": -63.03542,
    "isCapital": false,
    "countryIso3": "MAF"
  },
  {
    "name": "Toamasina",
    "lat": -18.1492,
    "lng": 49.40234,
    "isCapital": true,
    "countryIso3": "MDG"
  },
  {
    "name": "Vondrozo",
    "lat": -22.81667,
    "lng": 47.28333,
    "isCapital": false,
    "countryIso3": "MDG"
  },
  {
    "name": "Vohipeno",
    "lat": -22.35,
    "lng": 47.83333,
    "isCapital": false,
    "countryIso3": "MDG"
  },
  {
    "name": "Likiep",
    "lat": 9.82511,
    "lng": 169.31065,
    "isCapital": true,
    "countryIso3": "MHL"
  },
  {
    "name": "Jabor",
    "lat": 5.92098,
    "lng": 169.64335,
    "isCapital": false,
    "countryIso3": "MHL"
  },
  {
    "name": "Ailuk",
    "lat": 10.21972,
    "lng": 169.97967,
    "isCapital": false,
    "countryIso3": "MHL"
  },
  {
    "name": "Zrnovci",
    "lat": 41.85545,
    "lng": 22.44451,
    "isCapital": true,
    "countryIso3": "MKD"
  },
  {
    "name": "Zletovo",
    "lat": 41.98861,
    "lng": 22.23611,
    "isCapital": false,
    "countryIso3": "MKD"
  },
  {
    "name": "Žitoše",
    "lat": 41.41991,
    "lng": 21.29078,
    "isCapital": false,
    "countryIso3": "MKD"
  },
  {
    "name": "Zégoua",
    "lat": 10.48804,
    "lng": -5.64943,
    "isCapital": true,
    "countryIso3": "MLI"
  },
  {
    "name": "Youwarou",
    "lat": 15.3684,
    "lng": -4.2628,
    "isCapital": false,
    "countryIso3": "MLI"
  },
  {
    "name": "Yorosso",
    "lat": 12.35811,
    "lng": -4.77688,
    "isCapital": false,
    "countryIso3": "MLI"
  },
  {
    "name": "Zwe Bar Kone Tan",
    "lat": 16.53163,
    "lng": 96.3576,
    "isCapital": true,
    "countryIso3": "MMR"
  },
  {
    "name": "Zigon",
    "lat": 18.33559,
    "lng": 95.6215,
    "isCapital": false,
    "countryIso3": "MMR"
  },
  {
    "name": "Zi Byu Gon",
    "lat": 16.73718,
    "lng": 95.91683,
    "isCapital": false,
    "countryIso3": "MMR"
  },
  {
    "name": "Üyönch",
    "lat": 46.05,
    "lng": 92.01667,
    "isCapital": true,
    "countryIso3": "MNG"
  },
  {
    "name": "Uujim",
    "lat": 48.9,
    "lng": 89.61667,
    "isCapital": false,
    "countryIso3": "MNG"
  },
  {
    "name": "Urdgol",
    "lat": 47.83333,
    "lng": 92.65,
    "isCapital": false,
    "countryIso3": "MNG"
  },
  {
    "name": "Taipa",
    "lat": 22.15583,
    "lng": 113.55694,
    "isCapital": true,
    "countryIso3": "MAC"
  },
  {
    "name": "Macau",
    "lat": 22.20056,
    "lng": 113.54611,
    "isCapital": false,
    "countryIso3": "MAC"
  },
  {
    "name": "Lai Chi Van",
    "lat": 22.11972,
    "lng": 113.55111,
    "isCapital": false,
    "countryIso3": "MAC"
  },
  {
    "name": "San Jose Village",
    "lat": 14.96823,
    "lng": 145.61998,
    "isCapital": true,
    "countryIso3": "MNP"
  },
  {
    "name": "Saipan",
    "lat": 15.21233,
    "lng": 145.7545,
    "isCapital": false,
    "countryIso3": "MNP"
  },
  {
    "name": "Garapan",
    "lat": 15.21107,
    "lng": 145.72038,
    "isCapital": false,
    "countryIso3": "MNP"
  },
  {
    "name": "Saint-Pierre",
    "lat": 14.74309,
    "lng": -61.17541,
    "isCapital": true,
    "countryIso3": "MTQ"
  },
  {
    "name": "Saint-Joseph",
    "lat": 14.67099,
    "lng": -61.03905,
    "isCapital": false,
    "countryIso3": "MTQ"
  },
  {
    "name": "Sainte-Marie",
    "lat": 14.78352,
    "lng": -60.99227,
    "isCapital": false,
    "countryIso3": "MTQ"
  },
  {
    "name": "Zouérat",
    "lat": 22.73542,
    "lng": -12.47134,
    "isCapital": true,
    "countryIso3": "MRT"
  },
  {
    "name": "Woumpou",
    "lat": 15.1308,
    "lng": -12.7253,
    "isCapital": false,
    "countryIso3": "MRT"
  },
  {
    "name": "Tembedgha",
    "lat": 16.24137,
    "lng": -8.17321,
    "isCapital": false,
    "countryIso3": "MRT"
  },
  {
    "name": "Saint Peters",
    "lat": 16.7727,
    "lng": -62.21729,
    "isCapital": true,
    "countryIso3": "MSR"
  },
  {
    "name": "Plymouth",
    "lat": 16.70555,
    "lng": -62.21292,
    "isCapital": false,
    "countryIso3": "MSR"
  },
  {
    "name": "Brades",
    "lat": 16.79183,
    "lng": -62.21058,
    "isCapital": false,
    "countryIso3": "MSR"
  },
  {
    "name": "Marsaxlokk",
    "lat": 35.84214,
    "lng": 14.54296,
    "isCapital": true,
    "countryIso3": "MLT"
  },
  {
    "name": "Żurrieq",
    "lat": 35.8296,
    "lng": 14.47588,
    "isCapital": false,
    "countryIso3": "MLT"
  },
  {
    "name": "Żejtun",
    "lat": 35.85547,
    "lng": 14.53341,
    "isCapital": false,
    "countryIso3": "MLT"
  },
  {
    "name": "Verdun",
    "lat": -20.23417,
    "lng": 57.55476,
    "isCapital": true,
    "countryIso3": "MUS"
  },
  {
    "name": "Vacoas",
    "lat": -20.29806,
    "lng": 57.47833,
    "isCapital": false,
    "countryIso3": "MUS"
  },
  {
    "name": "Trou aux Biches",
    "lat": -20.03301,
    "lng": 57.55033,
    "isCapital": false,
    "countryIso3": "MUS"
  },
  {
    "name": "Meedhoo",
    "lat": -0.58333,
    "lng": 73.23333,
    "isCapital": true,
    "countryIso3": "MDV"
  },
  {
    "name": "Male",
    "lat": 4.17521,
    "lng": 73.50916,
    "isCapital": false,
    "countryIso3": "MDV"
  },
  {
    "name": "Hithadhoo",
    "lat": -0.6,
    "lng": 73.08333,
    "isCapital": false,
    "countryIso3": "MDV"
  },
  {
    "name": "Karonga",
    "lat": -9.93333,
    "lng": 33.93333,
    "isCapital": true,
    "countryIso3": "MWI"
  },
  {
    "name": "Chitipa",
    "lat": -9.70237,
    "lng": 33.26969,
    "isCapital": false,
    "countryIso3": "MWI"
  },
  {
    "name": "Zomba",
    "lat": -15.38596,
    "lng": 35.3188,
    "isCapital": false,
    "countryIso3": "MWI"
  },
  {
    "name": "Maclovio Herrera",
    "lat": 22.50103,
    "lng": -98.08582,
    "isCapital": true,
    "countryIso3": "MEX"
  },
  {
    "name": "La Colonia",
    "lat": 22.43825,
    "lng": -98.01711,
    "isCapital": false,
    "countryIso3": "MEX"
  },
  {
    "name": "Esteros",
    "lat": 22.5201,
    "lng": -98.12637,
    "isCapital": false,
    "countryIso3": "MEX"
  },
  {
    "name": "Padang Mat Sirat",
    "lat": 6.35423,
    "lng": 99.73404,
    "isCapital": true,
    "countryIso3": "MYS"
  },
  {
    "name": "Ayer Hangat",
    "lat": 6.42062,
    "lng": 99.82199,
    "isCapital": false,
    "countryIso3": "MYS"
  },
  {
    "name": "Kuah",
    "lat": 6.32649,
    "lng": 99.8432,
    "isCapital": false,
    "countryIso3": "MYS"
  },
  {
    "name": "Xai-Xai",
    "lat": -25.05194,
    "lng": 33.64417,
    "isCapital": true,
    "countryIso3": "MOZ"
  },
  {
    "name": "Gorongosa",
    "lat": -18.67556,
    "lng": 34.07278,
    "isCapital": false,
    "countryIso3": "MOZ"
  },
  {
    "name": "Vilankulo",
    "lat": -22,
    "lng": 35.31667,
    "isCapital": false,
    "countryIso3": "MOZ"
  },
  {
    "name": "Tsumkwe",
    "lat": -19.59363,
    "lng": 20.50203,
    "isCapital": true,
    "countryIso3": "NAM"
  },
  {
    "name": "Ndiyona",
    "lat": -18.03892,
    "lng": 20.70058,
    "isCapital": false,
    "countryIso3": "NAM"
  },
  {
    "name": "Linyanti",
    "lat": -18.07229,
    "lng": 24.01566,
    "isCapital": false,
    "countryIso3": "NAM"
  },
  {
    "name": "Yaté-Barrage",
    "lat": -22.15,
    "lng": 166.88333,
    "isCapital": true,
    "countryIso3": "NCL"
  },
  {
    "name": "Wé",
    "lat": -20.91687,
    "lng": 167.26461,
    "isCapital": false,
    "countryIso3": "NCL"
  },
  {
    "name": "Wala",
    "lat": -19.71161,
    "lng": 163.64702,
    "isCapital": false,
    "countryIso3": "NCL"
  },
  {
    "name": "Birnin Gaouré",
    "lat": 13.08173,
    "lng": 2.91099,
    "isCapital": true,
    "countryIso3": "NER"
  },
  {
    "name": "Birni N Konni",
    "lat": 13.79599,
    "lng": 5.25026,
    "isCapital": false,
    "countryIso3": "NER"
  },
  {
    "name": "Zinder",
    "lat": 13.80716,
    "lng": 8.9881,
    "isCapital": false,
    "countryIso3": "NER"
  },
  {
    "name": "Kingston",
    "lat": -29.05459,
    "lng": 167.96628,
    "isCapital": true,
    "countryIso3": "NFK"
  },
  {
    "name": "Zuru",
    "lat": 11.43522,
    "lng": 5.23494,
    "isCapital": true,
    "countryIso3": "NGA"
  },
  {
    "name": "Zurmi",
    "lat": 12.77675,
    "lng": 6.78404,
    "isCapital": false,
    "countryIso3": "NGA"
  },
  {
    "name": "Zungeru",
    "lat": 9.80726,
    "lng": 6.15238,
    "isCapital": false,
    "countryIso3": "NGA"
  },
  {
    "name": "Yalagüina",
    "lat": 13.48383,
    "lng": -86.49305,
    "isCapital": true,
    "countryIso3": "NIC"
  },
  {
    "name": "Wiwilí",
    "lat": 13.62679,
    "lng": -85.8254,
    "isCapital": false,
    "countryIso3": "NIC"
  },
  {
    "name": "Waspán",
    "lat": 14.74189,
    "lng": -83.9717,
    "isCapital": false,
    "countryIso3": "NIC"
  },
  {
    "name": "Zwolle",
    "lat": 52.5125,
    "lng": 6.09444,
    "isCapital": true,
    "countryIso3": "NLD"
  },
  {
    "name": "Zwijndrecht",
    "lat": 51.8175,
    "lng": 4.63333,
    "isCapital": false,
    "countryIso3": "NLD"
  },
  {
    "name": "Zwartsluis",
    "lat": 52.64083,
    "lng": 6.06944,
    "isCapital": false,
    "countryIso3": "NLD"
  },
  {
    "name": "Vardø",
    "lat": 70.37048,
    "lng": 31.11066,
    "isCapital": true,
    "countryIso3": "NOR"
  },
  {
    "name": "Vuonnabahta",
    "lat": 70.17278,
    "lng": 28.55598,
    "isCapital": false,
    "countryIso3": "NOR"
  },
  {
    "name": "Vadsø",
    "lat": 70.07348,
    "lng": 29.74943,
    "isCapital": false,
    "countryIso3": "NOR"
  },
  {
    "name": "Wāliṅ",
    "lat": 27.9837,
    "lng": 83.75925,
    "isCapital": true,
    "countryIso3": "NPL"
  },
  {
    "name": "Tulsi̇̄pur",
    "lat": 28.13328,
    "lng": 82.29803,
    "isCapital": false,
    "countryIso3": "NPL"
  },
  {
    "name": "Ṭikāpur",
    "lat": 28.52819,
    "lng": 81.11828,
    "isCapital": false,
    "countryIso3": "NPL"
  },
  {
    "name": "Yangor",
    "lat": -0.53536,
    "lng": 166.91048,
    "isCapital": true,
    "countryIso3": "NRU"
  },
  {
    "name": "Uaboe",
    "lat": -0.51393,
    "lng": 166.92384,
    "isCapital": false,
    "countryIso3": "NRU"
  },
  {
    "name": "Baiti",
    "lat": -0.50803,
    "lng": 166.92945,
    "isCapital": false,
    "countryIso3": "NRU"
  },
  {
    "name": "Alofi",
    "lat": -19.05294,
    "lng": -169.91957,
    "isCapital": true,
    "countryIso3": "NIU"
  },
  {
    "name": "Yaldhurst",
    "lat": -43.51667,
    "lng": 172.51667,
    "isCapital": true,
    "countryIso3": "NZL"
  },
  {
    "name": "Woodend",
    "lat": -43.31667,
    "lng": 172.66667,
    "isCapital": false,
    "countryIso3": "NZL"
  },
  {
    "name": "Wingatui",
    "lat": -45.88333,
    "lng": 170.38333,
    "isCapital": false,
    "countryIso3": "NZL"
  },
  {
    "name": "Thamarīt",
    "lat": 17.67,
    "lng": 54.03333,
    "isCapital": true,
    "countryIso3": "OMN"
  },
  {
    "name": "Sur",
    "lat": 22.56667,
    "lng": 59.52889,
    "isCapital": false,
    "countryIso3": "OMN"
  },
  {
    "name": "Sohar",
    "lat": 24.34745,
    "lng": 56.70937,
    "isCapital": false,
    "countryIso3": "OMN"
  },
  {
    "name": "Zapotillo",
    "lat": 8.00719,
    "lng": -81.50917,
    "isCapital": true,
    "countryIso3": "PAN"
  },
  {
    "name": "Las Zangüengas",
    "lat": 8.95811,
    "lng": -79.86979,
    "isCapital": false,
    "countryIso3": "PAN"
  },
  {
    "name": "Yaviza",
    "lat": 8.15835,
    "lng": -77.69276,
    "isCapital": false,
    "countryIso3": "PAN"
  },
  {
    "name": "Zorritos",
    "lat": -3.68046,
    "lng": -80.67819,
    "isCapital": true,
    "countryIso3": "PER"
  },
  {
    "name": "Yurimaguas",
    "lat": -5.90181,
    "lng": -76.12234,
    "isCapital": false,
    "countryIso3": "PER"
  },
  {
    "name": "Yuracmarca",
    "lat": -8.73761,
    "lng": -77.9036,
    "isCapital": false,
    "countryIso3": "PER"
  },
  {
    "name": "Atuona",
    "lat": -9.80342,
    "lng": -139.04202,
    "isCapital": true,
    "countryIso3": "PYF"
  },
  {
    "name": "Rikitea",
    "lat": -23.12322,
    "lng": -134.96858,
    "isCapital": false,
    "countryIso3": "PYF"
  },
  {
    "name": "Vaitoare",
    "lat": -16.67618,
    "lng": -151.45743,
    "isCapital": false,
    "countryIso3": "PYF"
  },
  {
    "name": "Wewak",
    "lat": -3.54964,
    "lng": 143.63229,
    "isCapital": true,
    "countryIso3": "PNG"
  },
  {
    "name": "Wau",
    "lat": -7.342,
    "lng": 146.724,
    "isCapital": false,
    "countryIso3": "PNG"
  },
  {
    "name": "Wabag",
    "lat": -5.49119,
    "lng": 143.72151,
    "isCapital": false,
    "countryIso3": "PNG"
  },
  {
    "name": "Zumarraga",
    "lat": 11.6388,
    "lng": 124.8417,
    "isCapital": true,
    "countryIso3": "PHL"
  },
  {
    "name": "Zarraga",
    "lat": 10.81972,
    "lng": 122.60806,
    "isCapital": false,
    "countryIso3": "PHL"
  },
  {
    "name": "Zaragoza",
    "lat": 16.3871,
    "lng": 119.9443,
    "isCapital": false,
    "countryIso3": "PHL"
  },
  {
    "name": "Sharifabad",
    "lat": 33.4341,
    "lng": 73.36276,
    "isCapital": true,
    "countryIso3": "PAK"
  },
  {
    "name": "Inzari",
    "lat": 34.66879,
    "lng": 71.3888,
    "isCapital": false,
    "countryIso3": "PAK"
  },
  {
    "name": "Chuhar Jamali",
    "lat": 24.3944,
    "lng": 67.99298,
    "isCapital": false,
    "countryIso3": "PAK"
  },
  {
    "name": "Warsaw",
    "lat": 52.22977,
    "lng": 21.01178,
    "isCapital": true,
    "countryIso3": "POL"
  },
  {
    "name": "Żyrzyn",
    "lat": 51.49918,
    "lng": 22.0917,
    "isCapital": false,
    "countryIso3": "POL"
  },
  {
    "name": "Żyrardów",
    "lat": 52.0488,
    "lng": 20.44599,
    "isCapital": false,
    "countryIso3": "POL"
  },
  {
    "name": "Saint-Pierre",
    "lat": 46.77914,
    "lng": -56.1773,
    "isCapital": true,
    "countryIso3": "SPM"
  },
  {
    "name": "Miquelon",
    "lat": 47.0975,
    "lng": -56.38139,
    "isCapital": false,
    "countryIso3": "SPM"
  },
  {
    "name": "Adamstown",
    "lat": -25.06597,
    "lng": -130.10147,
    "isCapital": true,
    "countryIso3": "PCN"
  },
  {
    "name": "Aceitunas",
    "lat": 18.44328,
    "lng": -67.0649,
    "isCapital": true,
    "countryIso3": "PRI"
  },
  {
    "name": "Adjuntas",
    "lat": 18.16274,
    "lng": -66.72212,
    "isCapital": false,
    "countryIso3": "PRI"
  },
  {
    "name": "Aguada",
    "lat": 18.37939,
    "lng": -67.18824,
    "isCapital": false,
    "countryIso3": "PRI"
  },
  {
    "name": "Shūkat aş Şūfī",
    "lat": 31.25997,
    "lng": 34.2826,
    "isCapital": true,
    "countryIso3": "PSE"
  },
  {
    "name": "Rafaḩ",
    "lat": 31.29722,
    "lng": 34.24357,
    "isCapital": false,
    "countryIso3": "PSE"
  },
  {
    "name": "An Nuşayrāt",
    "lat": 31.44861,
    "lng": 34.3925,
    "isCapital": false,
    "countryIso3": "PSE"
  },
  {
    "name": "Zibreira",
    "lat": 39.48257,
    "lng": -8.60994,
    "isCapital": true,
    "countryIso3": "PRT"
  },
  {
    "name": "Zambujeira do Mar",
    "lat": 37.52799,
    "lng": -8.78483,
    "isCapital": false,
    "countryIso3": "PRT"
  },
  {
    "name": "Vimeiro",
    "lat": 39.17768,
    "lng": -9.31702,
    "isCapital": false,
    "countryIso3": "PRT"
  },
  {
    "name": "Ngermid Hamlet",
    "lat": 7.33983,
    "lng": 134.50163,
    "isCapital": true,
    "countryIso3": "PLW"
  },
  {
    "name": "Ngerbeched Hamlet",
    "lat": 7.33249,
    "lng": 134.47623,
    "isCapital": false,
    "countryIso3": "PLW"
  },
  {
    "name": "Koror",
    "lat": 7.33978,
    "lng": 134.47326,
    "isCapital": false,
    "countryIso3": "PLW"
  },
  {
    "name": "Yuty",
    "lat": -26.61415,
    "lng": -56.24727,
    "isCapital": true,
    "countryIso3": "PRY"
  },
  {
    "name": "Ypacarai",
    "lat": -25.40777,
    "lng": -57.28889,
    "isCapital": false,
    "countryIso3": "PRY"
  },
  {
    "name": "Yhú",
    "lat": -25.05784,
    "lng": -55.92267,
    "isCapital": false,
    "countryIso3": "PRY"
  },
  {
    "name": "Al ‘Unayzah",
    "lat": 25.33759,
    "lng": 51.50953,
    "isCapital": true,
    "countryIso3": "QAT"
  },
  {
    "name": "Umm Şalāl Muḩammad",
    "lat": 25.41524,
    "lng": 51.40647,
    "isCapital": false,
    "countryIso3": "QAT"
  },
  {
    "name": "Umm Şalāl ‘Alī",
    "lat": 25.46972,
    "lng": 51.3975,
    "isCapital": false,
    "countryIso3": "QAT"
  },
  {
    "name": "Vincendo",
    "lat": -21.37104,
    "lng": 55.67013,
    "isCapital": true,
    "countryIso3": "REU"
  },
  {
    "name": "Les Trois-Bassins",
    "lat": -21.1,
    "lng": 55.3,
    "isCapital": false,
    "countryIso3": "REU"
  },
  {
    "name": "Salazie",
    "lat": -21.0271,
    "lng": 55.5395,
    "isCapital": false,
    "countryIso3": "REU"
  },
  {
    "name": "Ghioca",
    "lat": 44.31667,
    "lng": 24.73333,
    "isCapital": true,
    "countryIso3": "ROU"
  },
  {
    "name": "Zvoriştea",
    "lat": 47.83333,
    "lng": 26.28333,
    "isCapital": false,
    "countryIso3": "ROU"
  },
  {
    "name": "Zorlenţu Mare",
    "lat": 45.45056,
    "lng": 21.95611,
    "isCapital": false,
    "countryIso3": "ROU"
  },
  {
    "name": "Zvečka",
    "lat": 44.64025,
    "lng": 20.16432,
    "isCapital": true,
    "countryIso3": "SRB"
  },
  {
    "name": "Žujince",
    "lat": 42.31568,
    "lng": 21.70212,
    "isCapital": false,
    "countryIso3": "SRB"
  },
  {
    "name": "Zuce",
    "lat": 44.69806,
    "lng": 20.55524,
    "isCapital": false,
    "countryIso3": "SRB"
  },
  {
    "name": "Moscow",
    "lat": 55.75204,
    "lng": 37.61781,
    "isCapital": true,
    "countryIso3": "RUS"
  },
  {
    "name": "Udomlya",
    "lat": 57.87597,
    "lng": 35.00702,
    "isCapital": false,
    "countryIso3": "RUS"
  },
  {
    "name": "Sosnovka",
    "lat": 60.01667,
    "lng": 30.35,
    "isCapital": false,
    "countryIso3": "RUS"
  },
  {
    "name": "Rwamagana",
    "lat": -1.9487,
    "lng": 30.4347,
    "isCapital": true,
    "countryIso3": "RWA"
  },
  {
    "name": "Musanze",
    "lat": -1.49984,
    "lng": 29.63497,
    "isCapital": false,
    "countryIso3": "RWA"
  },
  {
    "name": "Ruhango",
    "lat": -2.2246,
    "lng": 29.79088,
    "isCapital": false,
    "countryIso3": "RWA"
  },
  {
    "name": "Az̧ Z̧abyah",
    "lat": 17.11788,
    "lng": 42.66694,
    "isCapital": true,
    "countryIso3": "SAU"
  },
  {
    "name": "Yanbu",
    "lat": 24.08954,
    "lng": 38.0618,
    "isCapital": false,
    "countryIso3": "SAU"
  },
  {
    "name": "‘Uqlat aş Şuqūr",
    "lat": 25.82916,
    "lng": 42.20119,
    "isCapital": false,
    "countryIso3": "SAU"
  },
  {
    "name": "Vavaea",
    "lat": -9.43611,
    "lng": 159.95702,
    "isCapital": true,
    "countryIso3": "SLB"
  },
  {
    "name": "Tulagi",
    "lat": -9.10306,
    "lng": 160.15056,
    "isCapital": false,
    "countryIso3": "SLB"
  },
  {
    "name": "Panatina",
    "lat": -9.43215,
    "lng": 160.00607,
    "isCapital": false,
    "countryIso3": "SLB"
  },
  {
    "name": "Victoria",
    "lat": -4.62001,
    "lng": 55.45501,
    "isCapital": true,
    "countryIso3": "SYC"
  },
  {
    "name": "Takamaka",
    "lat": -4.76667,
    "lng": 55.5,
    "isCapital": false,
    "countryIso3": "SYC"
  },
  {
    "name": "Port Glaud",
    "lat": -4.66256,
    "lng": 55.41841,
    "isCapital": false,
    "countryIso3": "SYC"
  },
  {
    "name": "Dongola",
    "lat": 19.18163,
    "lng": 30.47689,
    "isCapital": true,
    "countryIso3": "SDN"
  },
  {
    "name": "Zalinjay",
    "lat": 12.90918,
    "lng": 23.47058,
    "isCapital": false,
    "countryIso3": "SDN"
  },
  {
    "name": "Wagar",
    "lat": 16.1525,
    "lng": 36.2032,
    "isCapital": false,
    "countryIso3": "SDN"
  },
  {
    "name": "Viken",
    "lat": 64.72587,
    "lng": 20.91548,
    "isCapital": true,
    "countryIso3": "SWE"
  },
  {
    "name": "Ursviken",
    "lat": 64.71261,
    "lng": 21.1658,
    "isCapital": false,
    "countryIso3": "SWE"
  },
  {
    "name": "Umeå",
    "lat": 63.82842,
    "lng": 20.25972,
    "isCapital": false,
    "countryIso3": "SWE"
  },
  {
    "name": "Yio Chu Kang",
    "lat": 1.39111,
    "lng": 103.85139,
    "isCapital": true,
    "countryIso3": "SGP"
  },
  {
    "name": "Yew Tee",
    "lat": 1.39665,
    "lng": 103.74738,
    "isCapital": false,
    "countryIso3": "SGP"
  },
  {
    "name": "West Coast Village",
    "lat": 1.31667,
    "lng": 103.75,
    "isCapital": false,
    "countryIso3": "SGP"
  },
  {
    "name": "Georgetown",
    "lat": -7.92861,
    "lng": -14.41194,
    "isCapital": true,
    "countryIso3": "SHN"
  },
  {
    "name": "Edinburgh of the Seven Seas",
    "lat": -37.06757,
    "lng": -12.31155,
    "isCapital": false,
    "countryIso3": "SHN"
  },
  {
    "name": "Jamestown",
    "lat": -15.92488,
    "lng": -5.71816,
    "isCapital": false,
    "countryIso3": "SHN"
  },
  {
    "name": "Žužemberk",
    "lat": 45.83376,
    "lng": 14.92804,
    "isCapital": true,
    "countryIso3": "SVN"
  },
  {
    "name": "Žiri",
    "lat": 46.04405,
    "lng": 14.10736,
    "isCapital": false,
    "countryIso3": "SVN"
  },
  {
    "name": "Zgornji Duplek",
    "lat": 46.51361,
    "lng": 15.72083,
    "isCapital": false,
    "countryIso3": "SVN"
  },
  {
    "name": "Longyearbyen",
    "lat": 78.22334,
    "lng": 15.64689,
    "isCapital": true,
    "countryIso3": "SJM"
  },
  {
    "name": "Olonkinbyen",
    "lat": 70.9221,
    "lng": -8.7187,
    "isCapital": false,
    "countryIso3": "SJM"
  },
  {
    "name": "Župčany",
    "lat": 49.01205,
    "lng": 21.15874,
    "isCapital": true,
    "countryIso3": "SVK"
  },
  {
    "name": "Žehra",
    "lat": 48.9796,
    "lng": 20.7917,
    "isCapital": false,
    "countryIso3": "SVK"
  },
  {
    "name": "Ždiar",
    "lat": 49.271,
    "lng": 20.26239,
    "isCapital": false,
    "countryIso3": "SVK"
  },
  {
    "name": "Zimmi",
    "lat": 7.31356,
    "lng": -11.30818,
    "isCapital": true,
    "countryIso3": "SLE"
  },
  {
    "name": "Yonibana",
    "lat": 8.44347,
    "lng": -12.23929,
    "isCapital": false,
    "countryIso3": "SLE"
  },
  {
    "name": "Yengema",
    "lat": 8.71441,
    "lng": -11.17057,
    "isCapital": false,
    "countryIso3": "SLE"
  },
  {
    "name": "Serravalle",
    "lat": 43.96897,
    "lng": 12.48167,
    "isCapital": true,
    "countryIso3": "SMR"
  },
  {
    "name": "San Marino",
    "lat": 43.93667,
    "lng": 12.44639,
    "isCapital": false,
    "countryIso3": "SMR"
  },
  {
    "name": "Poggio di Chiesanuova",
    "lat": 43.90451,
    "lng": 12.42142,
    "isCapital": false,
    "countryIso3": "SMR"
  },
  {
    "name": "Ziguinchor",
    "lat": 12.56801,
    "lng": -16.27326,
    "isCapital": true,
    "countryIso3": "SEN"
  },
  {
    "name": "Vélingara",
    "lat": 13.15,
    "lng": -14.11667,
    "isCapital": false,
    "countryIso3": "SEN"
  },
  {
    "name": "Touba",
    "lat": 14.86229,
    "lng": -15.87532,
    "isCapital": false,
    "countryIso3": "SEN"
  },
  {
    "name": "Yeed",
    "lat": 4.55,
    "lng": 43.03333,
    "isCapital": true,
    "countryIso3": "SOM"
  },
  {
    "name": "Yagoori",
    "lat": 8.75167,
    "lng": 46.96361,
    "isCapital": false,
    "countryIso3": "SOM"
  },
  {
    "name": "Xuddur",
    "lat": 4.12129,
    "lng": 43.88945,
    "isCapital": false,
    "countryIso3": "SOM"
  },
  {
    "name": "Wageningen",
    "lat": 5.7601,
    "lng": -56.66523,
    "isCapital": true,
    "countryIso3": "SUR"
  },
  {
    "name": "Totness",
    "lat": 5.87618,
    "lng": -56.32572,
    "isCapital": false,
    "countryIso3": "SUR"
  },
  {
    "name": "Tamanredjo",
    "lat": 5.78621,
    "lng": -55.02482,
    "isCapital": false,
    "countryIso3": "SUR"
  },
  {
    "name": "Yirol",
    "lat": 6.5525,
    "lng": 30.49806,
    "isCapital": true,
    "countryIso3": "SSD"
  },
  {
    "name": "Yei",
    "lat": 4.09444,
    "lng": 30.67639,
    "isCapital": false,
    "countryIso3": "SSD"
  },
  {
    "name": "Yambio",
    "lat": 4.57083,
    "lng": 28.39417,
    "isCapital": false,
    "countryIso3": "SSD"
  },
  {
    "name": "Trindade",
    "lat": 0.29667,
    "lng": 6.68139,
    "isCapital": true,
    "countryIso3": "STP"
  },
  {
    "name": "São Tomé",
    "lat": 0.33756,
    "lng": 6.7299,
    "isCapital": false,
    "countryIso3": "STP"
  },
  {
    "name": "São João dos Angolares",
    "lat": 0.13417,
    "lng": 6.64944,
    "isCapital": false,
    "countryIso3": "STP"
  },
  {
    "name": "Zaragoza",
    "lat": 13.58944,
    "lng": -89.28889,
    "isCapital": true,
    "countryIso3": "SLV"
  },
  {
    "name": "Zacatecoluca",
    "lat": 13.50872,
    "lng": -88.87017,
    "isCapital": false,
    "countryIso3": "SLV"
  },
  {
    "name": "Victoria",
    "lat": 13.95,
    "lng": -88.63333,
    "isCapital": false,
    "countryIso3": "SLV"
  },
  {
    "name": "Upper Prince’s Quarter",
    "lat": 18.03277,
    "lng": -63.03075,
    "isCapital": true,
    "countryIso3": "SXM"
  },
  {
    "name": "Philipsburg",
    "lat": 18.026,
    "lng": -63.04582,
    "isCapital": false,
    "countryIso3": "SXM"
  },
  {
    "name": "Lower Prince’s Quarter",
    "lat": 18.04987,
    "lng": -63.03789,
    "isCapital": false,
    "countryIso3": "SXM"
  },
  {
    "name": "Ayn Halaqim",
    "lat": 34.93998,
    "lng": 36.32212,
    "isCapital": true,
    "countryIso3": "SYR"
  },
  {
    "name": "Al Karāmah",
    "lat": 35.86865,
    "lng": 39.27803,
    "isCapital": false,
    "countryIso3": "SYR"
  },
  {
    "name": "‘Arīqah",
    "lat": 32.88994,
    "lng": 36.48342,
    "isCapital": false,
    "countryIso3": "SYR"
  },
  {
    "name": "Thunzini",
    "lat": -25.95764,
    "lng": 31.7274,
    "isCapital": true,
    "countryIso3": "SWZ"
  },
  {
    "name": "Siteki",
    "lat": -26.4525,
    "lng": 31.94722,
    "isCapital": false,
    "countryIso3": "SWZ"
  },
  {
    "name": "Sidvokodvo",
    "lat": -26.6282,
    "lng": 31.42021,
    "isCapital": false,
    "countryIso3": "SWZ"
  },
  {
    "name": "The Bight Settlements",
    "lat": 21.7796,
    "lng": -72.20421,
    "isCapital": true,
    "countryIso3": "TCA"
  },
  {
    "name": "Kew",
    "lat": 21.9134,
    "lng": -71.99265,
    "isCapital": false,
    "countryIso3": "TCA"
  },
  {
    "name": "Cockburn Town",
    "lat": 21.46122,
    "lng": -71.14188,
    "isCapital": false,
    "countryIso3": "TCA"
  },
  {
    "name": "Ounianga Kébir",
    "lat": 19.05263,
    "lng": 20.48887,
    "isCapital": true,
    "countryIso3": "TCD"
  },
  {
    "name": "Iriba",
    "lat": 15.11667,
    "lng": 22.25,
    "isCapital": false,
    "countryIso3": "TCD"
  },
  {
    "name": "Guéréda",
    "lat": 14.51667,
    "lng": 22.08333,
    "isCapital": false,
    "countryIso3": "TCD"
  },
  {
    "name": "Port-aux-Français",
    "lat": -49.34916,
    "lng": 70.21937,
    "isCapital": true,
    "countryIso3": "ATF"
  },
  {
    "name": "Vogan",
    "lat": 6.33333,
    "lng": 1.53333,
    "isCapital": true,
    "countryIso3": "TGO"
  },
  {
    "name": "Tsévié",
    "lat": 6.42611,
    "lng": 1.21333,
    "isCapital": false,
    "countryIso3": "TGO"
  },
  {
    "name": "Tohoun",
    "lat": 7.03333,
    "lng": 1.61667,
    "isCapital": false,
    "countryIso3": "TGO"
  },
  {
    "name": "Don Sak",
    "lat": 9.31676,
    "lng": 99.69184,
    "isCapital": true,
    "countryIso3": "THA"
  },
  {
    "name": "Thung Sai",
    "lat": 16.31489,
    "lng": 99.83267,
    "isCapital": false,
    "countryIso3": "THA"
  },
  {
    "name": "Tham Phannara",
    "lat": 8.42045,
    "lng": 99.39517,
    "isCapital": false,
    "countryIso3": "THA"
  },
  {
    "name": "Yovon",
    "lat": 38.31408,
    "lng": 69.03784,
    "isCapital": true,
    "countryIso3": "TJK"
  },
  {
    "name": "Hulbuk",
    "lat": 37.80542,
    "lng": 69.64516,
    "isCapital": false,
    "countryIso3": "TJK"
  },
  {
    "name": "Vorukh",
    "lat": 39.85125,
    "lng": 70.58012,
    "isCapital": false,
    "countryIso3": "TJK"
  },
  {
    "name": "Fale old settlement",
    "lat": -9.38516,
    "lng": -171.24675,
    "isCapital": true,
    "countryIso3": "TKL"
  },
  {
    "name": "Nukunonu",
    "lat": -9.20045,
    "lng": -171.84804,
    "isCapital": false,
    "countryIso3": "TKL"
  },
  {
    "name": "Atafu Village",
    "lat": -8.54212,
    "lng": -172.51591,
    "isCapital": false,
    "countryIso3": "TKL"
  },
  {
    "name": "Viqueque",
    "lat": -8.8575,
    "lng": 126.36472,
    "isCapital": true,
    "countryIso3": "TLS"
  },
  {
    "name": "Tilomar",
    "lat": -9.34001,
    "lng": 125.11278,
    "isCapital": false,
    "countryIso3": "TLS"
  },
  {
    "name": "Suai",
    "lat": -9.31286,
    "lng": 125.25648,
    "isCapital": false,
    "countryIso3": "TLS"
  },
  {
    "name": "Etrek",
    "lat": 37.66114,
    "lng": 54.76645,
    "isCapital": true,
    "countryIso3": "TKM"
  },
  {
    "name": "Esenguly",
    "lat": 37.4678,
    "lng": 53.97767,
    "isCapital": false,
    "countryIso3": "TKM"
  },
  {
    "name": "Ýaşlyk",
    "lat": 37.78014,
    "lng": 58.88904,
    "isCapital": false,
    "countryIso3": "TKM"
  },
  {
    "name": "Matmata",
    "lat": 33.54445,
    "lng": 9.97157,
    "isCapital": true,
    "countryIso3": "TUN"
  },
  {
    "name": "Zaouiet Sousse",
    "lat": 35.78553,
    "lng": 10.62725,
    "isCapital": false,
    "countryIso3": "TUN"
  },
  {
    "name": "Zaouiet Kountech",
    "lat": 35.63333,
    "lng": 10.76667,
    "isCapital": false,
    "countryIso3": "TUN"
  },
  {
    "name": "Veitongo",
    "lat": -21.18478,
    "lng": -175.21251,
    "isCapital": true,
    "countryIso3": "TON"
  },
  {
    "name": "Vainī",
    "lat": -21.19292,
    "lng": -175.17678,
    "isCapital": false,
    "countryIso3": "TON"
  },
  {
    "name": "Tokomololo",
    "lat": -21.17656,
    "lng": -175.24512,
    "isCapital": false,
    "countryIso3": "TON"
  },
  {
    "name": "Çey",
    "lat": 37.2621,
    "lng": 44.04086,
    "isCapital": true,
    "countryIso3": "TUR"
  },
  {
    "name": "Demre",
    "lat": 36.24444,
    "lng": 29.985,
    "isCapital": false,
    "countryIso3": "TUR"
  },
  {
    "name": "Yavrudoğan",
    "lat": 36.87896,
    "lng": 31.3107,
    "isCapital": false,
    "countryIso3": "TUR"
  },
  {
    "name": "Tunapuna",
    "lat": 10.65245,
    "lng": -61.38878,
    "isCapital": true,
    "countryIso3": "TTO"
  },
  {
    "name": "Talparo",
    "lat": 10.5,
    "lng": -61.26667,
    "isCapital": false,
    "countryIso3": "TTO"
  },
  {
    "name": "Tabaquite",
    "lat": 10.38824,
    "lng": -61.29704,
    "isCapital": false,
    "countryIso3": "TTO"
  },
  {
    "name": "Toga Village",
    "lat": -6.28764,
    "lng": 176.31472,
    "isCapital": true,
    "countryIso3": "TUV"
  },
  {
    "name": "Tanrake Village",
    "lat": -7.24562,
    "lng": 177.14511,
    "isCapital": false,
    "countryIso3": "TUV"
  },
  {
    "name": "Kulia Village",
    "lat": -6.10819,
    "lng": 177.33393,
    "isCapital": false,
    "countryIso3": "TUV"
  },
  {
    "name": "Taipei",
    "lat": 25.05306,
    "lng": 121.52639,
    "isCapital": true,
    "countryIso3": "TWN"
  },
  {
    "name": "Douliu",
    "lat": 23.70944,
    "lng": 120.54333,
    "isCapital": false,
    "countryIso3": "TWN"
  },
  {
    "name": "Yongkang",
    "lat": 23.02444,
    "lng": 120.25556,
    "isCapital": false,
    "countryIso3": "TWN"
  },
  {
    "name": "Zanzibar",
    "lat": -6.16394,
    "lng": 39.19793,
    "isCapital": true,
    "countryIso3": "TZA"
  },
  {
    "name": "Wete",
    "lat": -5.05589,
    "lng": 39.72938,
    "isCapital": false,
    "countryIso3": "TZA"
  },
  {
    "name": "Vwawa",
    "lat": -9.10806,
    "lng": 32.93472,
    "isCapital": false,
    "countryIso3": "TZA"
  },
  {
    "name": "Novokyivka",
    "lat": 46.35918,
    "lng": 33.23533,
    "isCapital": true,
    "countryIso3": "UKR"
  },
  {
    "name": "Olenevka",
    "lat": 45.38333,
    "lng": 32.53333,
    "isCapital": false,
    "countryIso3": "UKR"
  },
  {
    "name": "Urzuf",
    "lat": 46.91495,
    "lng": 37.10426,
    "isCapital": false,
    "countryIso3": "UKR"
  },
  {
    "name": "Zombo",
    "lat": 2.51355,
    "lng": 30.90909,
    "isCapital": true,
    "countryIso3": "UGA"
  },
  {
    "name": "Yumbe",
    "lat": 3.46506,
    "lng": 31.24689,
    "isCapital": false,
    "countryIso3": "UGA"
  },
  {
    "name": "Wobulenzi",
    "lat": 0.72833,
    "lng": 32.51222,
    "isCapital": false,
    "countryIso3": "UGA"
  },
  {
    "name": "Washington",
    "lat": 38.89511,
    "lng": -77.03637,
    "isCapital": true,
    "countryIso3": "USA"
  },
  {
    "name": "Bay Minette",
    "lat": 30.88296,
    "lng": -87.77305,
    "isCapital": false,
    "countryIso3": "USA"
  },
  {
    "name": "Edna",
    "lat": 28.97859,
    "lng": -96.64609,
    "isCapital": false,
    "countryIso3": "USA"
  },
  {
    "name": "Young",
    "lat": -32.69844,
    "lng": -57.62693,
    "isCapital": true,
    "countryIso3": "URY"
  },
  {
    "name": "Villa Sara",
    "lat": -33.2534,
    "lng": -54.41947,
    "isCapital": false,
    "countryIso3": "URY"
  },
  {
    "name": "Villa del Carmen",
    "lat": -33.23943,
    "lng": -56.00936,
    "isCapital": false,
    "countryIso3": "URY"
  },
  {
    "name": "Shumanay",
    "lat": 42.64281,
    "lng": 58.91345,
    "isCapital": true,
    "countryIso3": "UZB"
  },
  {
    "name": "Nukus",
    "lat": 42.45861,
    "lng": 59.60576,
    "isCapital": false,
    "countryIso3": "UZB"
  },
  {
    "name": "Mŭynoq",
    "lat": 43.76833,
    "lng": 59.02139,
    "isCapital": false,
    "countryIso3": "UZB"
  },
  {
    "name": "Vatican City",
    "lat": 41.90268,
    "lng": 12.45414,
    "isCapital": true,
    "countryIso3": "VAT"
  },
  {
    "name": "Questelles",
    "lat": 13.17619,
    "lng": -61.24893,
    "isCapital": true,
    "countryIso3": "VCT"
  },
  {
    "name": "Port Elizabeth",
    "lat": 13.01102,
    "lng": -61.23548,
    "isCapital": false,
    "countryIso3": "VCT"
  },
  {
    "name": "Peruvian Vale",
    "lat": 13.17711,
    "lng": -61.14356,
    "isCapital": false,
    "countryIso3": "VCT"
  },
  {
    "name": "La Guardia",
    "lat": 10.99742,
    "lng": -64.0181,
    "isCapital": true,
    "countryIso3": "VEN"
  },
  {
    "name": "La Asunción",
    "lat": 11.03333,
    "lng": -63.86278,
    "isCapital": false,
    "countryIso3": "VEN"
  },
  {
    "name": "Caricuao",
    "lat": 10.43337,
    "lng": -66.98313,
    "isCapital": false,
    "countryIso3": "VEN"
  },
  {
    "name": "Spanish Town",
    "lat": 18.4481,
    "lng": -64.43474,
    "isCapital": true,
    "countryIso3": "VGB"
  },
  {
    "name": "Road Town",
    "lat": 18.42693,
    "lng": -64.62079,
    "isCapital": false,
    "countryIso3": "VGB"
  },
  {
    "name": "Altona",
    "lat": 18.33885,
    "lng": -64.94876,
    "isCapital": true,
    "countryIso3": "VIR"
  },
  {
    "name": "Charlotte Amalie",
    "lat": 18.3419,
    "lng": -64.9307,
    "isCapital": false,
    "countryIso3": "VIR"
  },
  {
    "name": "Christiansted",
    "lat": 17.74681,
    "lng": -64.70557,
    "isCapital": false,
    "countryIso3": "VIR"
  },
  {
    "name": "Yên Vinh",
    "lat": 18.66667,
    "lng": 105.66667,
    "isCapital": true,
    "countryIso3": "VNM"
  },
  {
    "name": "Khánh Vĩnh Yên",
    "lat": 18.46312,
    "lng": 105.7131,
    "isCapital": false,
    "countryIso3": "VNM"
  },
  {
    "name": "Yên Viên",
    "lat": 21.08333,
    "lng": 105.91667,
    "isCapital": false,
    "countryIso3": "VNM"
  },
  {
    "name": "Sola",
    "lat": -13.87611,
    "lng": 167.55167,
    "isCapital": true,
    "countryIso3": "VUT"
  },
  {
    "name": "Port-Vila",
    "lat": -17.73648,
    "lng": 168.31366,
    "isCapital": false,
    "countryIso3": "VUT"
  },
  {
    "name": "Port-Olry",
    "lat": -15.04175,
    "lng": 167.07265,
    "isCapital": false,
    "countryIso3": "VUT"
  },
  {
    "name": "Leava",
    "lat": -14.29333,
    "lng": -178.15833,
    "isCapital": true,
    "countryIso3": "WLF"
  },
  {
    "name": "Mata-Utu",
    "lat": -13.28163,
    "lng": -176.17453,
    "isCapital": false,
    "countryIso3": "WLF"
  },
  {
    "name": "Alo",
    "lat": -14.31096,
    "lng": -178.11094,
    "isCapital": false,
    "countryIso3": "WLF"
  },
  {
    "name": "Vaiusu",
    "lat": -13.82678,
    "lng": -171.79333,
    "isCapital": true,
    "countryIso3": "WSM"
  },
  {
    "name": "Vaitele",
    "lat": -13.82933,
    "lng": -171.80604,
    "isCapital": false,
    "countryIso3": "WSM"
  },
  {
    "name": "Vaimoso",
    "lat": -13.83655,
    "lng": -171.77713,
    "isCapital": false,
    "countryIso3": "WSM"
  },
  {
    "name": "Daḩasuways",
    "lat": 15.72389,
    "lng": 50.72944,
    "isCapital": true,
    "countryIso3": "YEM"
  },
  {
    "name": "Ash Shiḩr",
    "lat": 14.76026,
    "lng": 49.60537,
    "isCapital": false,
    "countryIso3": "YEM"
  },
  {
    "name": "Al Ghaylah",
    "lat": 14.59583,
    "lng": 45.58333,
    "isCapital": false,
    "countryIso3": "YEM"
  },
  {
    "name": "Passamainty",
    "lat": -12.80201,
    "lng": 45.20818,
    "isCapital": true,
    "countryIso3": "MYT"
  },
  {
    "name": "Pamandzi",
    "lat": -12.79674,
    "lng": 45.27938,
    "isCapital": false,
    "countryIso3": "MYT"
  },
  {
    "name": "Mamoudzou",
    "lat": -12.78234,
    "lng": 45.22878,
    "isCapital": false,
    "countryIso3": "MYT"
  },
  {
    "name": "Roodepoort",
    "lat": -26.1625,
    "lng": 27.8725,
    "isCapital": true,
    "countryIso3": "ZAF"
  },
  {
    "name": "Zoar",
    "lat": -33.4956,
    "lng": 21.44373,
    "isCapital": false,
    "countryIso3": "ZAF"
  },
  {
    "name": "Zeerust",
    "lat": -25.53695,
    "lng": 26.07512,
    "isCapital": false,
    "countryIso3": "ZAF"
  },
  {
    "name": "Nchelenge",
    "lat": -9.34506,
    "lng": 28.73396,
    "isCapital": true,
    "countryIso3": "ZMB"
  },
  {
    "name": "Nakonde",
    "lat": -9.34213,
    "lng": 32.745,
    "isCapital": false,
    "countryIso3": "ZMB"
  },
  {
    "name": "Mununga",
    "lat": -9.04865,
    "lng": 29.04265,
    "isCapital": false,
    "countryIso3": "ZMB"
  },
  {
    "name": "Zvishavane",
    "lat": -20.32674,
    "lng": 30.06648,
    "isCapital": true,
    "countryIso3": "ZWE"
  },
  {
    "name": "Victoria Falls",
    "lat": -17.93285,
    "lng": 25.83066,
    "isCapital": false,
    "countryIso3": "ZWE"
  },
  {
    "name": "Shurugwi",
    "lat": -19.67016,
    "lng": 30.00589,
    "isCapital": false,
    "countryIso3": "ZWE"
  }
];

export const OFFICIAL_CAPITALS: Record<string, { name: string; lat: number; lng: number }> = {
  "CHN": { name: "北京", lat: 39.9042, lng: 116.4074 },
  "USA": { name: "华盛顿", lat: 38.9072, lng: -77.0369 },
  "RUS": { name: "莫斯科", lat: 55.7558, lng: 37.6173 },
  "UKR": { name: "基辅", lat: 50.4501, lng: 30.5234 },
  "USSR": { name: "莫斯科", lat: 55.7558, lng: 37.6173 },
  "ROC": { name: "南京", lat: 32.0603, lng: 118.7969 },
  "AUT_HUN": { name: "维也纳", lat: 48.2082, lng: 16.3738 },
  "OTT": { name: "伊斯坦布尔", lat: 41.0082, lng: 28.9784 },
  "YUG": { name: "贝尔格莱德", lat: 44.7866, lng: 20.4489 },
  "PRT": { name: "里斯本", lat: 38.7223, lng: -9.1393 },
  "JPN": { name: "东京", lat: 35.6762, lng: 139.6503 },
  "KOR": { name: "首尔", lat: 37.5665, lng: 126.9780 },
  "PRK": { name: "平壤", lat: 39.0392, lng: 125.7625 },
  "TWN": { name: "台北", lat: 25.0330, lng: 121.5654 },
  "GBR": { name: "伦敦", lat: 51.5074, lng: -0.1278 },
  "FRA": { name: "巴黎", lat: 48.8566, lng: 2.3522 },
  "DEU": { name: "柏林", lat: 52.5200, lng: 13.4050 },
  "ITA": { name: "罗马", lat: 41.9028, lng: 12.4964 },
  "ESP": { name: "马德里", lat: 40.4168, lng: -3.7038 },
  "IND": { name: "新德里", lat: 28.6139, lng: 77.2090 },
  "PAK": { name: "伊斯兰堡", lat: 33.6844, lng: 73.0479 },
  "CAN": { name: "渥太华", lat: 45.4215, lng: -75.6972 },
  "AUS": { name: "堪培拉", lat: -35.2809, lng: 149.1300 },
  "BRA": { name: "巴西利亚", lat: -15.7975, lng: -47.8919 },
  "ARG": { name: "布宜诺斯艾利斯", lat: -34.6037, lng: -58.3816 },
  "MEX": { name: "墨西哥城", lat: 19.4326, lng: -99.1332 },
  "EGY": { name: "开罗", lat: 30.0444, lng: 31.2357 },
  "ZAF": { name: "比勒陀利亚", lat: -25.7479, lng: 28.2293 },
  "NGA": { name: "阿布贾", lat: 9.0765, lng: 7.3986 },
  "ETH": { name: "亚的斯亚贝巴", lat: 9.0300, lng: 38.7400 },
  "TUR": { name: "安卡拉", lat: 39.9334, lng: 32.8597 },
  "IRN": { name: "德黑兰", lat: 35.6892, lng: 51.3890 },
  "IRQ": { name: "巴格达", lat: 33.3152, lng: 44.3661 },
  "SAU": { name: "利雅得", lat: 24.7136, lng: 46.6753 },
  "SYR": { name: "大马士革", lat: 33.5138, lng: 36.2765 },
  "ISR": { name: "耶路撒冷", lat: 31.7683, lng: 35.2137 },
  "PSE": { name: "拉姆安拉", lat: 31.9038, lng: 35.2034 },
  "POL": { name: "华沙", lat: 52.2297, lng: 21.0122 },
  "BLR": { name: "明斯克", lat: 53.9006, lng: 27.5590 },
  "ROU": { name: "布加勒斯特", lat: 44.4323, lng: 26.1063 },
  "HUN": { name: "布达佩斯", lat: 47.4979, lng: 19.0402 },
  "AUT": { name: "维也纳", lat: 48.2082, lng: 16.3738 },
  "CHE": { name: "伯尔尼", lat: 46.9480, lng: 7.4474 },
  "SWE": { name: "斯德哥尔摩", lat: 59.3293, lng: 18.0686 },
  "NOR": { name: "奥斯陆", lat: 59.9139, lng: 10.7522 },
  "FIN": { name: "赫尔辛基", lat: 60.1699, lng: 24.9384 },
  "DNK": { name: "哥本哈根", lat: 55.6761, lng: 12.5683 },
  "GRC": { name: "雅典", lat: 37.9838, lng: 23.7275 },
  "NLD": { name: "阿姆斯特丹", lat: 52.3676, lng: 4.9041 },
  "BEL": { name: "布鲁塞尔", lat: 50.8503, lng: 4.3517 },
  "CZE": { name: "布拉格", lat: 50.0755, lng: 14.4378 },
  "SVK": { name: "布拉迪斯拉发", lat: 48.1486, lng: 17.1077 },
  "KAZ": { name: "阿斯塔纳", lat: 51.1694, lng: 71.4491 },
  "UZB": { name: "塔什干", lat: 41.2995, lng: 69.2401 },
  "MNG": { name: "乌兰巴托", lat: 47.8864, lng: 106.9057 },
  "VNM": { name: "河内", lat: 21.0285, lng: 105.8542 },
  "THA": { name: "曼谷", lat: 13.7563, lng: 100.5018 },
  "IDN": { name: "雅加达", lat: -6.2088, lng: 106.8456 },
  "PHL": { name: "马尼拉", lat: 14.5995, lng: 120.9842 },
  "MYS": { name: "吉隆坡", lat: 3.1390, lng: 101.6869 },
  "SGP": { name: "新加坡", lat: 1.3521, lng: 103.8198 },
  "NZL": { name: "惠灵顿", lat: -41.2865, lng: 174.7762 },
  "ZMB": { name: "卢萨卡", lat: -15.3875, lng: 28.3228 },
  "ZWE": { name: "哈拉雷", lat: -17.8252, lng: 31.0335 },
  "CUB": { name: "哈瓦那", lat: 23.1136, lng: -82.3666 },
  "PRY": { name: "亚松森", lat: -25.2637, lng: -57.5759 },
  "URY": { name: "蒙得维的亚", lat: -34.9011, lng: -56.1645 },
  "PER": { name: "利马", lat: -12.0464, lng: -77.0428 },
  "COL": { name: "波哥大", lat: 4.7110, lng: -74.0721 },
  "ECU": { name: "基多", lat: -0.1807, lng: -78.4678 },
  "VEN": { name: "加拉加斯", lat: 10.4806, lng: -66.9036 },
  "MAR": { name: "拉巴特", lat: 34.0209, lng: -6.8416 },
  "DZA": { name: "阿尔及尔", lat: 36.7538, lng: 3.0588 },
  "TUN": { name: "突尼斯", lat: 36.8065, lng: 10.1815 },
  "LBY": { name: "的黎波里", lat: 32.8872, lng: 13.1913 },
  "SDN": { name: "喀土穆", lat: 15.5007, lng: 32.5599 },
  "KEN": { name: "内罗毕", lat: -1.2921, lng: 36.8219 },
  "TZA": { name: "多多马", lat: -6.1630, lng: 35.7516 },
  "RWA": { name: "基加利", lat: -1.9441, lng: 30.0619 },
  "BDI": { name: "基特加", lat: -3.4264, lng: 29.9246 },
  "SEN": { name: "达喀尔", lat: 14.7167, lng: -17.4677 },
  "GHA": { name: "阿克拉", lat: 5.6037, lng: -0.1870 },
  "CIV": { name: "亚穆苏克罗", lat: 6.8276, lng: -5.2893 },
  "CMR": { name: "雅温得", lat: 3.8480, lng: 11.5021 },
  "COD": { name: "金沙萨", lat: -4.4419, lng: 15.2663 },
  "COG": { name: "布拉柴维尔", lat: -4.2634, lng: 15.2429 },
  "AGO": { name: "罗安达", lat: -8.8390, lng: 13.2894 },
  "MOZ": { name: "马普托", lat: -25.9692, lng: 32.5732 },
  "BGD": { name: "达卡", lat: 23.8103, lng: 90.4125 },
  "LKA": { name: "斯里贾亚瓦德纳普拉科特", lat: 6.8941, lng: 79.9025 },
  "NPL": { name: "加德满都", lat: 27.7172, lng: 85.3240 },
  "AFG": { name: "喀布尔", lat: 34.5553, lng: 69.2075 },
  "MMR": { name: "内比都", lat: 19.7633, lng: 96.0785 },
  "KHM": { name: "金边", lat: 11.5564, lng: 104.9282 },
  "LAO": { name: "万象", lat: 17.9757, lng: 102.6331 },
  "AZE": { name: "巴库", lat: 40.4093, lng: 49.8671 },
  "ARM": { name: "埃里温", lat: 40.1792, lng: 44.4991 },
  "GEO": { name: "第比利斯", lat: 41.7151, lng: 44.8271 },
  "HRV": { name: "萨格勒布", lat: 45.8150, lng: 15.9819 },
  "BIH": { name: "萨拉热窝", lat: 43.8563, lng: 18.4131 },
  "SRB": { name: "贝尔格莱德", lat: 44.7866, lng: 20.4489 },
  "BGR": { name: "索非亚", lat: 42.6977, lng: 23.3219 },
  "ALB": { name: "地拉那", lat: 41.3275, lng: 19.8187 },
  "EST": { name: "塔林", lat: 59.4370, lng: 24.7536 },
  "LVA": { name: "里加", lat: 56.9496, lng: 24.1052 },
  "LTU": { name: "维尔纽斯", lat: 54.6872, lng: 25.2797 },
  "ISL": { name: "雷克雅未克", lat: 64.1466, lng: -21.9426 },
  "IRL": { name: "都柏林", lat: 53.3498, lng: -6.2603 },
  "LUX": { name: "卢森堡城", lat: 49.6116, lng: 6.1319 },
  "MNE": { name: "波德戈里察", lat: 42.4304, lng: 19.2594 },
  "MKD": { name: "斯科普里", lat: 41.9981, lng: 21.4254 },
  "MDA": { name: "基希讷乌", lat: 47.0105, lng: 28.8638 },
  "JOR": { name: "安曼", lat: 31.9454, lng: 35.9284 },
  "KWT": { name: "科威特城", lat: 29.3759, lng: 47.9774 },
  "QAT": { name: "多哈", lat: 25.2854, lng: 51.5310 },
  "ARE": { name: "阿布扎比", lat: 24.4539, lng: 54.3773 },
  "OMN": { name: "马斯喀特", lat: 23.5880, lng: 58.3829 },
  "YEM": { name: "萨那", lat: 15.3694, lng: 44.1910 },
  "TKM": { name: "阿什哈巴德", lat: 37.9601, lng: 58.3261 },
  "KGZ": { name: "比什凯克", lat: 42.8746, lng: 74.5698 },
  "TJK": { name: "杜尚别", lat: 38.5598, lng: 68.7870 }
};

import { getCustomCountryById } from '../utils/customCountryStore';

export function getCitiesForIso(isoString: string): CityData[] {
  const isos = isoString.split(',').map(s => {
    const raw = s.trim().toUpperCase();
    return ISO2_TO_ISO3[raw] || raw;
  });

  const cityList: CityData[] = [];

  for (const iso of isos) {
    if (iso.startsWith('CUSTOM_')) {
      const custom = getCustomCountryById(iso);
      if (custom) {
        if (custom.capital) {
          cityList.unshift({
            name: custom.capital.name,
            lat: custom.capital.lat,
            lng: custom.capital.lng,
            isCapital: true,
            countryIso3: iso
          });
        }
        if (custom.cities && custom.cities.length > 0) {
          for (const c of custom.cities) {
            cityList.push({
              name: c.name,
              lat: c.lat,
              lng: c.lng,
              isCapital: false,
              countryIso3: iso
            });
          }
        }
      }
    }
  }

  const builtinList: CityData[] = BUILTIN_CITIES.filter(c => isos.includes(c.countryIso3)).map(c => ({
    ...c,
    isCapital: false // clear inaccurate default flags
  }));

  for (let i = 0; i < builtinList.length; i++) {
    cityList.push(builtinList[i]);
  }

  // Enforce official capitals
  for (const iso of isos) {
    const officialCap = OFFICIAL_CAPITALS[iso];
    if (officialCap) {
      const existingIdx = cityList.findIndex(c => c.name === officialCap.name || Math.abs(c.lat - officialCap.lat) < 0.2);
      if (existingIdx >= 0) {
        cityList[existingIdx] = {
          ...cityList[existingIdx],
          name: officialCap.name,
          lat: officialCap.lat,
          lng: officialCap.lng,
          isCapital: true
        };
      } else {
        cityList.unshift({
          name: officialCap.name,
          lat: officialCap.lat,
          lng: officialCap.lng,
          isCapital: true,
          countryIso3: iso
        });
      }
    }
  }

  return cityList;
}
