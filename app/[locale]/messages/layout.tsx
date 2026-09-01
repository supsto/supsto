import { redirect } from 'next/navigation'

import { Container } from '@/components/layout/section'
import { MobileNav } from '@/components/layout/mobile-nav'
import { SiteHeader } from '@/components/layout/site-header'
import { getPanelContext } from '@/lib/auth/panel'

export default async function MessagesLayout({ children }: LayoutProps<'/[locale]/messages'>) {
  if (!(await getPanelContext())) redirect('/')

  return (
    <>
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-0">
        <Container className="py-6">{children}</Container>
      </main>
      <MobileNav />
    </>
  )
}
