import { MobileNav } from '@/components/layout/mobile-nav'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

export default function SiteLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <>
      <SiteHeader />
      {/* pb-20: mobilde alt navigasyonun içeriği örtmemesi için */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <SiteFooter />
      <MobileNav />
    </>
  )
}
