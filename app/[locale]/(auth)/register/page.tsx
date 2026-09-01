import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'Kayıt ol', robots: { index: false } }

export default async function RegisterPage() {
  const t = await getTranslations('auth')

  return (
    <>
      <h1 className="text-2xl font-extrabold">{t('registerTitle')}</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted">{t('registerLead')}</p>
      <RegisterForm />
    </>
  )
}
