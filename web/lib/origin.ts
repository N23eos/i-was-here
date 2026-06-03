// Базовый origin для ссылок в QR/метаданных.
// Берём из Host-заголовка запроса: какой адрес открыл клиент (localhost / LAN-IP /
// домен) — тот и попадёт в QR. Авто-адаптация при смене сети, без хардкода IP.
// Dev на 0.0.0.0: request.url даёт host "0.0.0.0", поэтому Host-заголовок приоритетнее.
// NEXT_PUBLIC_APP_ORIGIN — явный override (напр. публичный домен/туннель).
export function appOrigin(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_ORIGIN
  if (env) return env.replace(/\/$/, '')

  const host = request.headers.get('host')
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'http'
    return `${proto}://${host}`
  }

  return new URL(request.url).origin
}
