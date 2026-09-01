import type { Database } from './database'

type Tables = Database['public']['Tables']
type Row<T extends keyof Tables> = Tables[T]['Row']

export type Profile = Row<'profiles'>
export type Company = Row<'companies'>
export type Category = Row<'categories'>
export type Product = Row<'products'>
export type PriceTier = Row<'price_tiers'>
export type Rfq = Row<'rfqs'>
export type Quote = Row<'quotes'>
export type Favorite = Row<'favorites'>
export type Conversation = Row<'conversations'>
export type Message = Row<'messages'>
export type Notification = Row<'notifications'>
export type CompanyVerification = Row<'company_verifications'>
export type Order = Row<'orders'>
export type OrderEvent = Row<'order_events'>
export type SampleRequest = Row<'sample_requests'>
export type CompanyCertificate = Row<'company_certificates'>
export type QuoteRevision = Row<'quote_revisions'>
export type GroupBuy = Row<'group_buys'>
export type GroupBuyParticipant = Row<'group_buy_participants'>
export type ProductAlert = Row<'product_alerts'>
export type ImportJob = Row<'import_jobs'>
export type Currency = Row<'currencies'>

export type UserRole = Profile['role']
export type ProductStatus = Product['status']
export type RfqStatus = Rfq['status']
export type QuoteStatus = Quote['status']
export type OrderStatus = Order['status']

/** Sipariş durum makinesindeki sıra — ilerleme çubuğu bu diziye dayanır. */
export const ORDER_FLOW = [
  'pending',
  'confirmed',
  'in_production',
  'shipped',
  'delivered',
  'completed',
] as const

/* ---- Sayfaların tükettiği birleşik görünümler ---- */

/** Firmasıyla birlikte listelenen ürün (kart, arama sonucu). */
export type ProductListItem = Pick<
  Product,
  | 'id' | 'title' | 'slug' | 'price' | 'currency' | 'moq' | 'unit'
  | 'stock_quantity' | 'price_hidden' | 'images' | 'created_at'
> & {
  company: Pick<Company, 'id' | 'name' | 'slug' | 'city' | 'district' | 'verified'> | null
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
}

/** Ürün detay sayfası: firma + kademeli fiyatlar. */
export type ProductDetail = Product & {
  company: Company | null
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
  price_tiers: PriceTier[]
}

/** RFQ listesi satırı: kategori + teklif sayısı. */
export type RfqListItem = Pick<
  Rfq,
  | 'id' | 'title' | 'quantity' | 'unit' | 'city' | 'status'
  | 'deadline' | 'created_at' | 'target_price' | 'quote_count'
> & {
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
}

export type CategoryNode = Category & { children: Category[] }

/** Server Action'ların form durumu için ortak sözleşme. */
export type ActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }
  | { status: 'success'; message?: string }

export const IDLE: ActionState = { status: 'idle' }
