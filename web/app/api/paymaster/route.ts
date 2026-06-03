import { NextResponse, type NextRequest } from 'next/server'

// Прокси к CDP Paymaster (Sprint 05, gasless claim).
// Назначение: прятать секрет CDP_PAYMASTER_URL от браузера + пускать только
// paymaster-методы. Authoritative allowlist (наш контракт + claim + лимиты)
// настраивается в CDP-дашборде — здесь userOp.callData не декодим (хрупко,
// зависит от smart-account кошелька).

// Только эти JSON-RPC методы спонсирования пропускаем дальше.
const ALLOWED_METHODS = new Set([
  'pm_getPaymasterStubData',
  'pm_getPaymasterData',
])

const OUTBOUND_TIMEOUT_MS = 10_000

export async function POST(request: NextRequest) {
  const cdpUrl = process.env.CDP_PAYMASTER_URL
  if (!cdpUrl) {
    return NextResponse.json(
      { error: 'paymaster not configured' },
      { status: 500 }
    )
  }

  let body: { method?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  if (!body.method || !ALLOWED_METHODS.has(body.method)) {
    return NextResponse.json(
      { error: `method not allowed: ${body.method ?? '(none)'}` },
      { status: 403 }
    )
  }

  // Форвард в CDP с таймаутом — внешний вызов не должен висеть вечно.
  try {
    const res = await fetch(cdpUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: 'paymaster upstream error' },
      { status: 502 }
    )
  }
}
