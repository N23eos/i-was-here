'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletButton } from './WalletButton'

const links = [
  { href: '/organizer', label: 'Organizer' },
  { href: '/collection', label: 'Collection' },
]

export function NavBar() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0052FF] text-sm font-black text-white">
            ✓
          </span>
          <span className="font-bold tracking-tight text-gray-900 dark:text-white">
            I Was Here
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'bg-[#0052FF]/10 text-[#0052FF]'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
          <div className="ml-2">
            <WalletButton />
          </div>
        </nav>
      </div>
    </header>
  )
}
