// Лёгкие переиспользуемые UI-примитивы (Tailwind). Единый стиль дашборда.
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'

export function PageShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}
          </div>
          {action}
        </header>
        {children}
      </div>
    </main>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {children}
    </div>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  const styles = {
    primary:
      'bg-[#0052FF] text-white hover:bg-[#0042cc] disabled:opacity-50',
    secondary:
      'border border-gray-300 text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800',
    ghost: 'text-[#0052FF] hover:underline',
  }[variant]
  return (
    <button
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    />
  )
}

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <input
        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        {...props}
      />
    </label>
  )
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#0052FF]/10 px-2.5 py-0.5 text-xs font-medium text-[#0052FF]">
      {children}
    </span>
  )
}
