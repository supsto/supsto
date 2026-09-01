import Image from 'next/image'

import { cn } from '@/lib/utils'

const PLACEHOLDER = '/assets/placeholder.svg'

/**
 * Ürün görseli. Görsel yoksa nötr bir yer tutucu gösterir — kırık resim
 * ikonu yerine tasarımın parçası gibi duran bir yüzey.
 */
export function ProductImage({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src?: string | null
  alt: string
  sizes: string
  className?: string
  priority?: boolean
}) {
  return (
    <div className={cn('relative overflow-hidden bg-surface-2', className)}>
      <Image
        src={src || PLACEHOLDER}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  )
}
