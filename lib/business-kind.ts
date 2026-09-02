/**
 * İş tipi tanımları: kayıt, panel ve profilin tek doğru kaynağı.
 *
 * Sahadaki fark gerçek: üretici kapasitesini doldurmaya çalışır,
 * toptancı stok devir hızına bakar, perakendeci küçük parti ve hızlı
 * sevkiyat arar, dış ticaretçi koridora ve evraka bakar, kurumsal alıcı
 * ihaleyle ve vadeyle alır. Aynı paneli beşine birden göstermek,
 * hepsine yabancı gelen bir panel demektir.
 *
 * Saf TypeScript: hem sunucu hem istemci kullanır.
 */

export const BUSINESS_KINDS = [
  'manufacturer',
  'wholesaler',
  'retailer',
  'trader',
  'corporate',
] as const

export type BusinessKind = (typeof BUSINESS_KINDS)[number]

/** profiles.role — hesabın hangi tarafta işlem yapabildiği. */
export type AccountRole = 'buyer' | 'supplier' | 'both'

/** Panelde gösterilecek, tipe özel modüller. */
/*
  Yalnızca GERÇEKTEN var olan modüller listelenir. Menüye koyup sayfası
  olmayan bir modül, kullanıcıya çalışmayan bir söz verir.

  Henüz kurulmayanlar (şema ve sayfa yok): ihracat evrak takibi
  (dış ticaret) ve şube dağıtımı (kurumsal alıcı). TODO.md'de.
*/
export type KindModule =
  | 'catalog'
  | 'capacity'
  | 'clearance'
  | 'templates'
  | 'groupBuy'

export type CompanyField =
  | 'production_capacity'
  | 'annual_output_units'
  | 'production_lines'
  | 'oem_available'
  | 'odm_available'
  | 'export_countries'
  | 'factory_tour_url'
  | 'brands_carried'
  | 'warehouse_count'
  | 'coverage_note'
  | 'min_order_note'
  | 'store_count'
  | 'sales_channels'
  | 'import_countries'
  | 'foreign_trade_certificate'
  | 'branch_count'
  | 'procurement_method'
  | 'standard_payment_days'

export interface KindDefinition {
  kind: BusinessKind
  /** Kayıtta otomatik atanan rol; kullanıcı sonradan değiştirebilir. */
  role: AccountRole
  /** Varsayılan panel; 'both' rolünde geçiş düğmesi görünür. */
  defaultPanel: 'buyer' | 'supplier'
  modules: KindModule[]
  /** Profilde doldurulması istenen, tipe özel alanlar; sıra formdaki sıradır. */
  fields: readonly CompanyField[]
}

export const KINDS: Record<BusinessKind, KindDefinition> = {
  /*
    Üretici hem satar hem hammadde alır; panelde önce satış tarafına
    düşer, çünkü platforma katılma sebebi sipariş almaktır.
  */
  manufacturer: {
    kind: 'manufacturer',
    role: 'both',
    defaultPanel: 'supplier',
    modules: ['catalog', 'capacity', 'clearance', 'groupBuy'],
    fields: [
      'production_capacity',
      'annual_output_units',
      'production_lines',
      'oem_available',
      'odm_available',
      'export_countries',
      'factory_tour_url',
    ],
  },

  /* Toptancı tanımı gereği iki taraflı: üreticiden alır, perakendeciye satar. */
  wholesaler: {
    kind: 'wholesaler',
    role: 'both',
    defaultPanel: 'supplier',
    modules: ['catalog', 'clearance', 'templates', 'groupBuy'],
    fields: ['brands_carried', 'warehouse_count', 'coverage_note', 'min_order_note'],
  },

  /*
    Perakendeci yalnızca alır. En büyük ihtiyacı tekrar eden siparişi
    kolaylaştırmak ve tek başına ulaşamadığı miktara havuzla ulaşmak.
  */
  retailer: {
    kind: 'retailer',
    role: 'buyer',
    defaultPanel: 'buyer',
    modules: ['templates', 'groupBuy'],
    fields: ['store_count', 'sales_channels'],
  },

  /* Aracı: ürünü üretmez, alır ve satar. Ayırt edici ihtiyacı evrak ve koridor. */
  trader: {
    kind: 'trader',
    role: 'both',
    defaultPanel: 'buyer',
    modules: ['catalog', 'templates'],
    fields: [
      'export_countries',
      'import_countries',
      'foreign_trade_certificate',
      'min_order_note',
    ],
  },

  /*
    Zincir market, otel, hastane, kamu: çok şubeli, çoğu zaman ihaleyle
    ve vadeyle alır. Satış tarafı yoktur.
  */
  corporate: {
    kind: 'corporate',
    role: 'buyer',
    defaultPanel: 'buyer',
    modules: ['templates'],
    fields: ['branch_count', 'procurement_method', 'standard_payment_days'],
  },
}

/** Bilinmeyen değerlerde güvenli varsayılan. */
export function kindOf(value: string | null | undefined): BusinessKind | null {
  return BUSINESS_KINDS.includes(value as BusinessKind)
    ? (value as BusinessKind)
    : null
}

export function definitionOf(value: string | null | undefined) {
  const kind = kindOf(value)
  return kind ? KINDS[kind] : null
}

/** Bu iş tipi verilen modülü görüyor mu? */
export function hasModule(value: string | null | undefined, module: KindModule) {
  return definitionOf(value)?.modules.includes(module) ?? false
}

/** Satış kanalı seçenekleri (perakendeci). */
export const SALES_CHANNELS = ['store', 'online', 'marketplace', 'wholesale'] as const

/** Satın alma yöntemi (kurumsal alıcı). */
export const PROCUREMENT_METHODS = ['direct', 'tender', 'framework'] as const

/** Alan tipleri; form bunlara göre girdi çizer. */
export const FIELD_TYPES: Record<CompanyField, 'text' | 'number' | 'bool' | 'list' | 'channels' | 'procurement' | 'url'> = {
  production_capacity: 'text',
  annual_output_units: 'number',
  production_lines: 'number',
  oem_available: 'bool',
  odm_available: 'bool',
  export_countries: 'list',
  factory_tour_url: 'url',
  brands_carried: 'list',
  warehouse_count: 'number',
  coverage_note: 'text',
  min_order_note: 'text',
  store_count: 'number',
  sales_channels: 'channels',
  import_countries: 'list',
  foreign_trade_certificate: 'bool',
  branch_count: 'number',
  procurement_method: 'procurement',
  standard_payment_days: 'number',
}
