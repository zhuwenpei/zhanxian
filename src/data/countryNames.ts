import * as countries from 'i18n-iso-countries';
import zh from 'i18n-iso-countries/langs/zh.json';
import en from 'i18n-iso-countries/langs/en.json';
import { getSavedCustomCountries, getCustomCountryById } from '../utils/customCountryStore';

countries.registerLocale(zh);
countries.registerLocale(en);

export function getCountryName(isoCode: string, lang: 'zh' | 'en' = 'zh'): string {
  if (isoCode && isoCode.startsWith('CUSTOM_')) {
    const custom = getCustomCountryById(isoCode);
    if (custom) return custom.name;
  }
  return countries.getName(isoCode, lang) || isoCode;
}

export function searchCountries(query: string): { iso2: string; iso3: string; name: string }[] {
  query = query.toLowerCase().trim();
  const results: { iso2: string; iso3: string; name: string }[] = [];

  // Search in saved custom countries first
  const customList = getSavedCustomCountries();
  for (const c of customList) {
    if (!query || c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)) {
      results.push({ iso2: c.id, iso3: c.id, name: `🎨 [自定义] ${c.name}` });
    }
  }

  const allZh = countries.getNames('zh');
  const allEn = countries.getNames('en');

  for (const iso2 in allZh) {
    const nameZh = allZh[iso2];
    const nameEn = allEn[iso2];
    const iso3 = countries.alpha2ToAlpha3(iso2);

    if (
      !query ||
      nameZh.toLowerCase().includes(query) ||
      (nameEn && nameEn.toLowerCase().includes(query)) ||
      iso2.toLowerCase().includes(query) ||
      (iso3 && iso3.toLowerCase().includes(query))
    ) {
      results.push({ iso2, iso3: iso3 || iso2, name: nameZh });
    }
  }

  return results.slice(0, 10);
}
