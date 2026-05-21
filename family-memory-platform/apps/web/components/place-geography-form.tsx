'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { FormField, Input, Select } from '@/components/ui';
import {
  apiClient,
  formatApiError,
  type GeoCityRecord,
  type GeoCountryRecord,
  type GeoRegionRecord,
} from '@/lib/api-client';
import { useLocale, useTranslations } from 'next-intl';
import type { AppLocale } from '@family/shared';
import { CENTURY_OPTIONS, centuryToApiParam } from '@/lib/place-helpers';

export type PlaceGeographyValue = {
  century: string;
  countryId: string;
  regionId: string;
  cityId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  region?: string;
  city?: string;
  historicalLabel?: string;
};

type PlaceGeographyFormProps = {
  value: PlaceGeographyValue;
  onChange: (next: PlaceGeographyValue) => void;
  disabled?: boolean;
};

export function PlaceGeographyForm({ value, onChange, disabled }: PlaceGeographyFormProps) {
  const { session } = useAuth();
  const locale = useLocale() as AppLocale;
  const t = useTranslations('placePicker');
  const [countries, setCountries] = useState<GeoCountryRecord[]>([]);
  const [regions, setRegions] = useState<GeoRegionRecord[]>([]);
  const [cities, setCities] = useState<GeoCityRecord[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [searchHits, setSearchHits] = useState<GeoCityRecord[]>([]);
  const [loadError, setLoadError] = useState('');

  const centuryApi = centuryToApiParam(value.century);

  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      if (!value.century) {
        setCountries([]);
        return;
      }
      try {
        const list = await apiClient.places.countries(centuryApi, session?.accessToken, locale);
        if (!cancelled) {
          setCountries(list);
          setLoadError('');
        }
      } catch (error) {
        if (!cancelled) setLoadError(formatApiError(error));
      }
    }

    void loadCountries();
    return () => {
      cancelled = true;
    };
  }, [value.century, centuryApi, session?.accessToken, locale]);

  useEffect(() => {
    let cancelled = false;

    async function loadRegions() {
      if (!value.countryId) {
        setRegions([]);
        return;
      }
      try {
        const list = await apiClient.places.regions(value.countryId, centuryApi, session?.accessToken, locale);
        if (!cancelled) setRegions(list);
      } catch (error) {
        if (!cancelled) setLoadError(formatApiError(error));
      }
    }

    void loadRegions();
    return () => {
      cancelled = true;
    };
  }, [value.countryId, centuryApi, session?.accessToken, locale]);

  useEffect(() => {
    let cancelled = false;

    async function loadCities() {
      if (!value.countryId) {
        setCities([]);
        return;
      }
      try {
        const list = await apiClient.places.cities(
          value.countryId,
          value.regionId || undefined,
          centuryApi,
          session?.accessToken,
          locale,
        );
        if (!cancelled) setCities(list);
      } catch (error) {
        if (!cancelled) setLoadError(formatApiError(error));
      }
    }

    void loadCities();
    return () => {
      cancelled = true;
    };
  }, [value.countryId, value.regionId, centuryApi, session?.accessToken, locale]);

  useEffect(() => {
    const query = citySearch.trim();
    if (query.length < 2 || !value.countryId) {
      setSearchHits([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await apiClient.places.search(query, centuryApi, session?.accessToken, locale);
        if (!cancelled) setSearchHits(result.cities);
      } catch {
        if (!cancelled) setSearchHits([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [citySearch, value.countryId, centuryApi, session?.accessToken, locale]);

  const cityOptions = citySearch.trim().length >= 2 ? searchHits : cities;

  function onCenturyChange(century: string) {
    onChange({
      ...value,
      century,
      countryId: '',
      regionId: '',
      cityId: '',
      name: '',
      latitude: undefined,
      longitude: undefined,
      country: undefined,
      region: undefined,
      city: undefined,
      historicalLabel: undefined,
    });
  }

  function onCountryChange(countryId: string) {
    const country = countries.find((item) => item.id === countryId);
    onChange({
      ...value,
      countryId,
      regionId: '',
      cityId: '',
      name: '',
      country: country ? formatCountryLabel(country) : undefined,
      region: undefined,
      city: undefined,
      historicalLabel: country?.historicalName ?? undefined,
      latitude: country?.latitude ?? undefined,
      longitude: country?.longitude ?? undefined,
    });
  }

  function onRegionChange(regionId: string) {
    const region = regions.find((item) => item.id === regionId);
    onChange({
      ...value,
      regionId,
      cityId: '',
      name: '',
      city: undefined,
      region: region?.name,
    });
  }

  function onCityChange(cityId: string) {
    const city = cities.find((item) => item.id === cityId);
    if (!city) {
      onChange({ ...value, cityId: '', name: '' });
      return;
    }

    const aliasText = city.aliases?.map((a) => a.oldName).filter(Boolean).join(', ');
    const countryLabel = city.country ? formatCountryLabel(city.country) : value.country;

    onChange({
      ...value,
      cityId,
      name: city.name,
      city: city.name,
      country: countryLabel,
      region: city.region?.name ?? value.region,
      latitude: city.latitude ?? value.latitude,
      longitude: city.longitude ?? value.longitude,
      historicalLabel: [city.historicalName, aliasText].filter(Boolean).join(' · ') || undefined,
    });
  }

  const selectedCountry = countries.find((c) => c.id === value.countryId);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField label={t('century')}>
        <Select value={value.century} onChange={(event) => onCenturyChange(event.target.value)} disabled={disabled}>
          {CENTURY_OPTIONS.map((option) => (
            <option key={option.value || 'none'} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t('countryHistorical')}>
        <Select
          value={value.countryId}
          onChange={(event) => onCountryChange(event.target.value)}
          disabled={disabled || !value.century || countries.length === 0}
        >
          <option value="">
            {value.century ? t('notSelected') : t('selectCenturyFirst')}
          </option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {formatCountryLabel(country)}
              {country.periodFrom || country.periodTo
                ? ` (${country.periodFrom ?? '…'}–${country.periodTo ?? '…'})`
                : ''}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t('region')}>
        <Select
          value={value.regionId}
          onChange={(event) => onRegionChange(event.target.value)}
          disabled={disabled || !value.countryId}
        >
          <option value="">
            {value.countryId ? t('notSelectedOptional') : t('selectCountryFirst')}
          </option>
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{t('historicalHint')}</p>
      </FormField>

      <FormField label={t('city')} className="md:col-span-2">
        <Input
          value={citySearch}
          onChange={(event) => setCitySearch(event.target.value)}
          placeholder={t('citySearchPlaceholder')}
          disabled={disabled || !value.countryId}
        />
        <Select
          className="mt-2"
          value={value.cityId}
          onChange={(event) => onCityChange(event.target.value)}
          disabled={disabled || !value.countryId}
        >
          <option value="">
            {value.countryId ? t('notSelected') : t('selectCountryFirst')}
          </option>
          {cityOptions.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
              {city.historicalName && city.historicalName !== city.name ? ` (${city.historicalName})` : ''}
              {city.region?.name ? ` · ${city.region.name}` : ''}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
          {value.countryId
            ? t('cityListHint', { count: cities.length })
            : t('selectCountryAndCentury')}
        </p>
      </FormField>

      <FormField label={t('placeName')} className="md:col-span-2">
        <Input
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder={t('placeNamePlaceholder')}
          required
          disabled={disabled}
        />
      </FormField>

      {value.cityId ? (
        <div className="md:col-span-2 rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">
          <p className="font-semibold text-stone-700 dark:text-slate-200">{t('autofillTitle')}</p>
          <dl className="mt-2 grid gap-1 text-stone-600 dark:text-slate-300">
            {value.country ? (
              <div>
                <dt className="inline font-medium">{t('countryLabel')} </dt>
                <dd className="inline">{value.country}</dd>
              </div>
            ) : null}
            {value.region ? (
              <div>
                <dt className="inline font-medium">{t('regionLabel')} </dt>
                <dd className="inline">{value.region}</dd>
              </div>
            ) : null}
            {value.city ? (
              <div>
                <dt className="inline font-medium">{t('cityLabel')} </dt>
                <dd className="inline">{value.city}</dd>
              </div>
            ) : null}
            {value.historicalLabel ? (
              <div>
                <dt className="inline font-medium">{t('historicalNamesLabel')} </dt>
                <dd className="inline">{value.historicalLabel}</dd>
              </div>
            ) : null}
            {value.latitude != null && value.longitude != null ? (
              <div>
                <dt className="inline font-medium">{t('coordinatesLabel')} </dt>
                <dd className="inline">
                  {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
                </dd>
              </div>
            ) : null}
            {selectedCountry?.wikidataId ? (
              <div>
                <dt className="inline font-medium">Wikidata: </dt>
                <dd className="inline">{selectedCountry.wikidataId}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {loadError ? <p className="md:col-span-2 text-sm text-rose-600">{loadError}</p> : null}
    </div>
  );
}

function formatCountryLabel(country: { name: string; historicalName?: string | null }) {
  if (country.historicalName && country.historicalName !== country.name) {
    return `${country.name} (${country.historicalName})`;
  }
  return country.name;
}
