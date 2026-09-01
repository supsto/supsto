import { Logo } from '@/components/layout/logo'

export default function AuthLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-6" />
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
