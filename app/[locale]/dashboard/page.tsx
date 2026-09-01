import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getPanelContext } from '@/lib/auth/panel'
import { BuyerOverview } from './_overviews/buyer-overview'
import { SellerOverview } from './_overviews/seller-overview'

export const metadata: Metadata = { title: 'Panel', robots: { index: false } }

/**
 * Panel girişi. Hangi özetin gösterileceğini hesap tipi belirler:
 * toptancı satış tarafını, perakendeci alım tarafını görür. 'both'
 * hesaplar tercihine göre gelir ve kenar çubuğundan geçiş yapabilir.
 */
export default async function DashboardPage() {
  const ctx = await getPanelContext()
  if (!ctx) redirect('/')

  return ctx.mode === 'supplier' ? <SellerOverview ctx={ctx} /> : <BuyerOverview ctx={ctx} />
}
