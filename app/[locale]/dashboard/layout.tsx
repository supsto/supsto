import { MobileNav } from '@/components/layout/mobile-nav'
import { SiteHeader } from '@/components/layout/site-header'

export default function PanelLayout({ children }: LayoutProps<'/[locale]/dashboard'>) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileNav />
    </>
  )
}
