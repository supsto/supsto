import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'

export const metadata: Metadata = {
  title: 'E-postanızı doğrulayın',
  robots: { index: false },
}

export default async function VerifyPage(props: PageProps<'/[locale]/verify'>) {
  const sp = await props.searchParams
  const email = Array.isArray(sp.email) ? sp.email[0] : sp.email
  const t = await getTranslations('auth')

  return (
    <Card>
      <CardBody className="text-center">
        <div
          className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-2xl"
          aria-hidden="true"
        >
          ✉
        </div>
        <h1 className="mt-4 text-xl font-extrabold">{t('verifyTitle')}</h1>
        <p className="mt-2 text-sm text-muted">
          {email
            ? t.rich('verifyBodyWith', {
                email,
                b: (chunks) => <b className="text-ink">{chunks}</b>,
              })
            : t('verifyBody')}
        </p>

        <Notice tone="neutral" className="mt-5 text-left">
          {t('mailpitHint')}{' '}
          <a
            href="http://127.0.0.1:54324"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            127.0.0.1:54324
          </a>
        </Notice>

        <ButtonLink href="/login" variant="primary" className="mt-5 w-full">
          {t('backToSignIn')}
        </ButtonLink>
      </CardBody>
    </Card>
  )
}
