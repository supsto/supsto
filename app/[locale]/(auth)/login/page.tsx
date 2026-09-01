import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Giriş yap', robots: { index: false } }

export default async function LoginPage(props: PageProps<'/[locale]/login'>) {
  const sp = await props.searchParams
  const next = Array.isArray(sp.next) ? sp.next[0] : sp.next
  const t = await getTranslations('auth')

  return (
    <>
      <h1 className="text-2xl font-extrabold">{t('signInTitle')}</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted">{t('signInLead')}</p>
      <LoginForm next={next} />
    </>
  )
}
