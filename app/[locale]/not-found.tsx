import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

import { ButtonLink } from '@/components/ui/button'
import { Logo } from '@/components/layout/logo'

export default async function NotFound() {
  const t = await getTranslations('error')

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-8" />
      <p className="text-[70px] font-black leading-none text-line-strong">404</p>
      <h1 className="mt-3 text-2xl font-extrabold">{t('notFoundTitle')}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {t('notFoundBody')}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/search">{t('browseProducts')}</ButtonLink>
        <ButtonLink href="/" variant="primary">
          {t('backHome')}
        </ButtonLink>
      </div>
      <Link href="/contact" className="mt-6 text-xs text-muted underline hover:text-brand">
        {t('problem')}
      </Link>
    </div>
  )
}
