import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

/**
 * Ticaret terimini bulunduğu yerde açıklar.
 *
 * B2B sözlüğü (MOQ, Incoterm, GTİP) hedef kitlenin yarısı için günlük
 * dil, diğer yarısı için anlaşılmaz. Terimi silmek profesyonel alıcıyla
 * ortak dili koparıyor; olduğu gibi bırakmak yeni alıcıyı kapıda
 * kaybettiriyor. Bu yüzden terim KALIR ama yanında ne olduğu yazar.
 *
 * `abbr` + `title` klavye ve ekran okuyucuyla çalışır; ayrıca noktalı
 * alt çizgi görsel olarak "buna tıklanabilir/üzerine gelinebilir"
 * sinyali verir.
 */
export async function Term({ id, label }: { id: string; label?: string }) {
  const t = await getTranslations('glossary')
  // Çağıran kendi bağlamına uygun bir etiket verebilir; açıklama daima
  // sözlükten gelir ki tanım tek yerde tutulsun.
  const text = label ?? t(`${id}_label`)
  const definition = t(`${id}_def`)

  return (
    <abbr
      title={definition}
      className="cursor-help decoration-dotted underline-offset-2 [text-decoration-line:underline]"
    >
      {text}
    </abbr>
  )
}

/**
 * Sözlük girdisinin tam hali: etiket + açıklama.
 * Sözlük sayfası ve form ipuçları için.
 */
export async function TermDefinition({ id }: { id: string }) {
  const t = await getTranslations('glossary')
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <dt className="text-[13px] font-bold">{t(`${id}_label`)}</dt>
      <dd className="mt-0.5 text-[13px] leading-relaxed text-muted">
        {t(`${id}_def`)}
      </dd>
    </div>
  )
}

/** Sözlük sayfasına gönderen küçük bağlantı; form altlarında kullanılır. */
export async function GlossaryLink() {
  const t = await getTranslations('glossary')
  return (
    <Link href="/glossary" className="text-[11px] font-semibold text-brand hover:underline">
      {t('linkLabel')} →
    </Link>
  )
}
