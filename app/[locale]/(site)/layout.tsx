import { CompareBar, CompareProvider } from '@/components/domain/compare-store'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

export default function SiteLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <CompareProvider>
      <SiteHeader />
      {/* pb-20: mobilde alt navigasyonun içeriği örtmemesi için */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <SiteFooter />
      <MobileNav />
      <CompareBar />
    </CompareProvider>
  )
}
