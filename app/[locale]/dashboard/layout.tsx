import { redirect } from 'next/navigation'

import { Container } from '@/components/layout/section'
import { MobileNav } from '@/components/layout/mobile-nav'
import { PanelNav } from '@/components/layout/panel-nav'
import { SiteHeader } from '@/components/layout/site-header'
import { getPanelContext } from '@/lib/auth/panel'

export default async function DashboardLayout({ children }: LayoutProps<'/[locale]/dashboard'>) {
  const ctx = await getPanelContext()
  if (!ctx) redirect('/')

  return (
    <>
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-0">
        <Container className="py-6">
          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <PanelNav
                isSupplier={ctx.isSupplier}
                isAdmin={ctx.isAdmin}
                unreadMessages={ctx.unreadMessages}
                unreadNotifications={ctx.unreadNotifications}
              />
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        </Container>
      </main>
      <MobileNav />
    </>
  )
}
