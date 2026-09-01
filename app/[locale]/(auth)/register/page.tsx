import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'


import { Card, CardBody } from '@/components/ui/card'
import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'Kayıt ol',
  robots: { index: false },
}

export default async function RegisterPage() {
  const t = await getTranslations('auth')

  return (
    <Card>
      <CardBody>
        <h1 className="text-xl font-extrabold">{t('registerTitle')}</h1>
        <p className="mb-5 mt-1 text-sm text-muted">
          {t('registerLead')}
        </p>
        <RegisterForm />
      </CardBody>
    </Card>
  )
}
