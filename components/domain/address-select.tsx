'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Field, Input, Select } from '@/components/ui/field'
import type { CountryOption, RegionOption } from '@/lib/queries/geo'

/**
 * Kademeli adres seçimi: ülke → il → ilçe.
 *
 * Serbest metin yerine seçim yapılması, "İstanbul / istanbul / Istanbul"
 * gibi varyantların ayrı şehir sayılmasını bitiriyor; şehir filtresi
 * ancak böyle güvenilir çalışıyor.
 *
 * Bölge verisi girilmemiş ülkelerde (şu an Türkiye dışındakiler) serbest
 * metin alanına düşülür. Boş bir açılır liste göstermek, kullanıcıya
 * adresini hiç giremeyeceğini söylerdi.
 */
export function AddressSelect({
  countries,
  provinces: initialProvinces,
  districts: initialDistricts = [],
  defaultCountry = 'TR',
  defaultProvinceId,
  defaultDistrictId,
  defaultCity,
  showDistrict = true,
  required,
}: {
  countries: CountryOption[]
  /** İlk render'da seçili ülkenin illeri; sunucudan gelir. */
  provinces: RegionOption[]
  /**
   * Kayıtlı ilin ilçeleri. Sunucudan gelmesi, düzenleme formunun
   * açılışta istek atmasını ve listenin bir an boş görünmesini önler.
   */
  districts?: RegionOption[]
  defaultCountry?: string
  defaultProvinceId?: string | null
  defaultDistrictId?: string | null
  /** Bölge verisi olmayan ülkeler için mevcut serbest metin. */
  defaultCity?: string | null
  showDistrict?: boolean
  required?: boolean
}) {
  const t = useTranslations('address')

  const [country, setCountry] = useState(defaultCountry)
  const [provinces, setProvinces] = useState<RegionOption[]>(initialProvinces)
  const [provinceId, setProvinceId] = useState(defaultProvinceId ?? '')
  const [districts, setDistricts] = useState<RegionOption[]>(initialDistricts)
  const [districtId, setDistrictId] = useState(defaultDistrictId ?? '')
  const [loading, setLoading] = useState(false)

  function loadDistricts(province: string) {
    setLoading(true)
    fetch(`/api/regions?parent=${province}`)
      .then((r) => r.json())
      .then((d) => setDistricts(d.items ?? []))
      .catch(() => setDistricts([]))
      .finally(() => setLoading(false))
  }

  function onCountryChange(code: string) {
    setCountry(code)
    setProvinceId('')
    setDistrictId('')
    setDistricts([])

    if (code === defaultCountry) {
      setProvinces(initialProvinces)
      return
    }
    setLoading(true)
    fetch(`/api/regions?country=${code}`)
      .then((r) => r.json())
      .then((d) => setProvinces(d.items ?? []))
      .catch(() => setProvinces([]))
      .finally(() => setLoading(false))
  }

  function onProvinceChange(id: string) {
    setProvinceId(id)
    setDistrictId('')
    if (!showDistrict) return
    if (id) loadDistricts(id)
    else setDistricts([])
  }

  const hasRegions = provinces.length > 0

  return (
    <>
      <Field label={t('country')} htmlFor="addr_country">
        <Select
          id="addr_country"
          name="country_code"
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      {hasRegions ? (
        <Field label={t('province')} htmlFor="addr_province" required={required}>
          <Select
            id="addr_province"
            name="province_id"
            value={provinceId}
            required={required}
            onChange={(e) => onProvinceChange(e.target.value)}
          >
            <option value="">{t('choose')}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        /*
          Bölge verisi olmayan ülke: kullanıcı adresini yine de girebilmeli.
          Sunucu bu durumda city metnini olduğu gibi kaydeder.
        */
        <Field label={t('city')} htmlFor="addr_city" hint={t('cityFallbackHint')}>
          <Input
            id="addr_city"
            name="city"
            defaultValue={defaultCity ?? ''}
            maxLength={80}
          />
        </Field>
      )}

      {hasRegions && showDistrict ? (
        <Field label={t('district')} htmlFor="addr_district">
          <Select
            id="addr_district"
            name="district_id"
            value={districtId}
            disabled={!provinceId || loading}
            onChange={(e) => setDistrictId(e.target.value)}
          >
            <option value="">
              {!provinceId ? t('chooseProvinceFirst') : loading ? t('loading') : t('choose')}
            </option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
    </>
  )
}
