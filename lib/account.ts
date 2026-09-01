import type { Profile } from '@/lib/types'

/**
 * Hesap tipleri.
 *
 * Türkçe karşılıklar arayüzde kullanılan kelimelerdir:
 *   supplier = toptancı (satar)   ·   buyer = perakendeci (alır)
 *   both     = ikisi              ·   admin = yönetici
 */
export const ACCOUNT_TYPES = ['buyer', 'supplier', 'both'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

/** Kullanıcının hangi paneli göreceği. 'both' ise tercihini kullanır. */
export type PanelMode = 'buyer' | 'supplier'

export function panelMode(profile: Pick<Profile, 'role' | 'preferred_panel'> | null): PanelMode {
  if (!profile) return 'buyer'
  if (profile.role === 'supplier') return 'supplier'
  if (profile.role === 'buyer') return 'buyer'
  // 'both' ve 'admin': kullanıcının tercihi, yoksa satış tarafı.
  return (profile.preferred_panel as PanelMode | null) ?? 'supplier'
}

export function canSell(profile: Pick<Profile, 'role'> | null) {
  return profile?.role === 'supplier' || profile?.role === 'both' || profile?.role === 'admin'
}

export function canSwitchPanel(profile: Pick<Profile, 'role'> | null) {
  return profile?.role === 'both' || profile?.role === 'admin'
}

/**
 * Profil eksiksizliği. B2B'de eksik profil = düşük güven; kullanıcıya
 * ne kaldığını göstermek tamamlanma oranını belirgin şekilde artırır.
 */
export interface CompletenessItem {
  key: string
  done: boolean
  /** Bu adım yalnızca satış yapan hesaplar için gerekli. */
  sellerOnly?: boolean
}

export function profileCompleteness(input: {
  profile: Profile | null
  emailVerified: boolean
  hasCompany: boolean
  companyVerified: boolean
  hasProducts: boolean
  hasLogo: boolean
  seller: boolean
}): { items: CompletenessItem[]; percent: number } {
  const { profile, emailVerified, hasCompany, companyVerified, hasProducts, hasLogo, seller } =
    input

  const all: CompletenessItem[] = [
    { key: 'name', done: Boolean(profile?.full_name) },
    { key: 'email', done: emailVerified },
    { key: 'phone', done: Boolean(profile?.phone) },
    { key: 'company', done: hasCompany, sellerOnly: false },
    { key: 'logo', done: hasLogo, sellerOnly: true },
    { key: 'products', done: hasProducts, sellerOnly: true },
    { key: 'verification', done: companyVerified, sellerOnly: true },
  ]

  const items = all.filter((item) => seller || !item.sellerOnly)
  const done = items.filter((i) => i.done).length
  return { items, percent: Math.round((done / items.length) * 100) }
}
