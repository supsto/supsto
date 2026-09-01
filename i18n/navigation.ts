import type { ComponentProps } from 'react'
import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/**
 * Uygulama genelinde `next/link` yerine BUNLAR kullanılır.
 * Kanonik yolu verirsiniz (`/contact`), aktif dile göre doğru URL'i
 * (`/tr/iletisim`) üretir. Anahtarlar pathnames tablosuna karşı tip denetimli.
 */
const navigation = createNavigation(routing)

export const { Link, usePathname, useRouter, getPathname } = navigation

/**
 * Açık tip ek açıklaması şart: destructure edilmiş bir property'de TypeScript
 * `never` dönüşünü tanımadığı için, çağıran fonksiyonlar "eksik return"
 * hatası alırdı.
 */
export const redirect: typeof navigation.redirect = navigation.redirect

/**
 * Uygulama içi bağlantı hedefi. Kanonik yol anahtarına ya da dinamik
 * rotalar için `{ pathname, params }` biçimine karşı tip denetimlidir.
 */
export type AppHref = ComponentProps<typeof Link>['href']

/** Yalnızca statik rota anahtarları — React key'i ve önek karşılaştırması için. */
export type AppPathname = Extract<AppHref, string>
