import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import countriesData from 'world-atlas/countries-50m.json';
import { alpha3ToNumeric } from 'i18n-iso-countries';
import { getCustomCountryById } from '../utils/customCountryStore';

export function loadCountryGeoJSON(iso3: string): Feature<Polygon | MultiPolygon> | null {
  if (iso3 && iso3.startsWith('CUSTOM_')) {
    const custom = getCustomCountryById(iso3);
    if (custom) return custom.feature;
  }

  const geojson = feature(countriesData as any, (countriesData as any).objects.countries) as unknown as FeatureCollection<Polygon | MultiPolygon>;
  
  const numericCode = alpha3ToNumeric(iso3);
  if (!numericCode) return null;

  // `id` in world-atlas can be string or number. Let's compare as string without leading zeros if possible, or just parse int.
  const targetId = parseInt(numericCode, 10);
  
  const countryFeature = geojson.features.find(f => {
    if (f.id === undefined) return false;
    return parseInt(f.id as string, 10) === targetId;
  });

  return countryFeature || null;
}

