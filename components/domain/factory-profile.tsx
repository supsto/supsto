import { getTranslations } from 'next-intl/server'

import type { Company } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

/**
 * Fabrika şeffaflık bloğu.
 *
 * Alıcının "bu üretici benim hacmimi kaldırır mı" sorusuna yanıt verir.
 * Yalnızca üreticinin gerçekten doldurduğu alanlar çizilir: boş alanı
 * "—" ile göstermek profili eksik değil, güvenilmez gösterir. Hiçbiri
 * dolu değilse blok hiç render edilmez.
 */
export async function FactoryProfile({ company }: { company: Company }) {
  const t = await getTranslations('factory')

  const facts: { label: string; value: string }[] = []

  if (company.annual_output_units) {
    facts.push({
      label: t('annualOutput'),
      value: formatNumber(company.annual_output_units),
    })
  }
  if (company.production_capacity) {
    facts.push({ label: t('capacity'), value: company.production_capacity })
  }
  if (company.employee_count) {
    facts.push({ label: t('employees'), value: company.employee_count })
  }
  if (company.founded_year) {
    facts.push({ label: t('founded'), value: String(company.founded_year) })
  }
  if (company.export_countries?.length) {
    facts.push({
      label: t('exportCountries'),
      value: company.export_countries.join(', '),
    })
  }
  if (company.min_order_note) {
    facts.push({ label: t('minOrderNote'), value: company.min_order_note })
  }

  if (facts.length === 0) return null

  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <h2 className="text-sm font-bold">{t('title')}</h2>
      <p className="mt-0.5 text-[11px] text-muted">{t('lead')}</p>

      <dl className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="border-b border-line pb-1.5">
            <dt className="text-[10px] uppercase tracking-wide text-muted">
              {fact.label}
            </dt>
            <dd className="text-xs font-semibold">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {/*
        Tur bağlantısı üreticinin kendi verdiği adrestir; platform
        doğrulamaz. "Denetlendi" izlenimi vermemek için nötr adlandırılır.
      */}
      {company.factory_tour_url ? (
        <a
          href={company.factory_tour_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 inline-block text-[11px] font-bold text-brand hover:underline"
        >
          {t('tourLink')} →
        </a>
      ) : null}
    </section>
  )
}
