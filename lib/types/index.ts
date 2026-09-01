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

export type UserRole = Profile['role']
export type ProductStatus = Product['status']
export type RfqStatus = Rfq['status']
export type QuoteStatus = Quote['status']

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
