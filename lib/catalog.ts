/**
 * Katalog filtrelerinin ortak sözlüğü.
 *
 * Değerler veritabanındaki CHECK kısıtlarıyla birebir aynıdır; sunucu
 * ve istemci aynı listeyi kullansın diye burada, saf TypeScript olarak
 * durur (server-only bağımlılığı yok).
 */

/** Incoterms 2020 — products.incoterm kısıtıyla aynı sıra ve küme. */
export const INCOTERMS = [
  'EXW',
  'FCA',
  'FAS',
  'FOB',
  'CFR',
  'CIF',
  'CPT',
  'CIP',
  'DAP',
  'DPU',
  'DDP',
] as const
export type Incoterm = (typeof INCOTERMS)[number]

/** Sol panelde gösterilenler: alıcının %90'ı bu dördünü kullanır. */
export const COMMON_INCOTERMS: readonly Incoterm[] = ['EXW', 'FOB', 'CIF', 'DDP']

export const PRODUCTION_TYPES = ['oem', 'odm', 'stock'] as const
export type ProductionType = (typeof PRODUCTION_TYPES)[number]

/** company_certificates.kind kısıtıyla aynı küme. */
export const CERTIFICATE_KINDS = [
  'iso',
  'ce',
  'tse',
  'oeko_tex',
  'gots',
  'bsci',
  'organic',
  'halal',
  'fda',
  'gmp',
  'brc',
  'sedex',
  'fsc',
  'reach',
  'other',
] as const
export type CertificateKind = (typeof CERTIFICATE_KINDS)[number]

/** Sol panelde öne çıkanlar; gerisi "tümünü göster" ardında. */
export const FEATURED_CERTIFICATES: readonly CertificateKind[] = [
  'iso',
  'ce',
  'oeko_tex',
  'gots',
  'bsci',
  'organic',
]

/**
 * Virgülle ayrılmış URL parametresini bilinen değerlere indirger.
 *
 * Adres çubuğu kullanıcı girdisidir: tanınmayan değer sorguya hiç
 * ulaşmamalı, yoksa PostgREST'e beklenmedik girdi gider.
 */
export function parseMulti<T extends string>(
  raw: string | undefined,
  allowed: readonly T[]
): T[] | undefined {
  if (!raw) return undefined
  const set = new Set<string>(allowed)
  const picked = raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => set.has(v)) as T[]
  return picked.length ? picked : undefined
}

/** Pozitif sayı bekleyen filtreler için; geçersiz girdi filtreyi düşürür. */
export function parsePositive(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Sipariş adedi için koli ve hacim hesabı.
 *
 * Konteyner planı bu üç sayıya bakar; navlun fiyatı DEĞİL — onun için
 * taşıyıcı tarifesi gerekir ve platformda böyle bir veri yok.
 */
export function packingFor(
  quantity: number,
  opts: {
    unitsPerCase?: number | null
    caseVolumeM3?: number | null
    caseWeightKg?: number | null
    casesPerPallet?: number | null
  }
) {
  const perCase = opts.unitsPerCase ?? 0
  if (!quantity || perCase <= 0) return null

  const cases = Math.ceil(quantity / perCase)
  return {
    cases,
    pallets: opts.casesPerPallet
      ? Math.ceil(cases / opts.casesPerPallet)
      : null,
    volumeM3: opts.caseVolumeM3 ? cases * Number(opts.caseVolumeM3) : null,
    weightKg: opts.caseWeightKg ? cases * Number(opts.caseWeightKg) : null,
  }
}

/**
 * Standart konteyner iç hacimleri (m³).
 *
 * Yükleme verimi hiçbir zaman %100 olmaz; sektörde kabul gören ~%85
 * doluluk üzerinden kullanılabilir hacim veriyoruz ki alıcı gerçekte
 * sığmayacak bir planla yola çıkmasın.
 */
export const CONTAINERS = [
  { code: '20ft', usableM3: 28 },
  { code: '40ft', usableM3: 58 },
  { code: '40hc', usableM3: 66 },
] as const
