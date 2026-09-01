import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


import { Card, CardBody } from '@/components/ui/card'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Giriş yap',
  robots: { index: false },
}

export default async function LoginPage(props: PageProps<'/[locale]/login'>) {
  const sp = await props.searchParams
  const next = Array.isArray(sp.next) ? sp.next[0] : sp.next
  const t = await getTranslations('auth')

  return (
    <Card>
      <CardBody>
        <h1 className="text-xl font-extrabold">{t('signInTitle')}</h1>
        <p className="mb-5 mt-1 text-sm text-muted">
          {t('signInLead')}
        </p>
        <LoginForm next={next} />
      </CardBody>
    </Card>
  )
}
