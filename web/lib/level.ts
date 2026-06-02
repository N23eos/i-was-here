// Off-chain уровень гостя по числу собранных бейджей (ARCHITECTURE §уровни).
// MVP: простые пороги. On-chain уровни — post-MVP (ROADMAP).
export type Level = {
  level: number // 0..4
  name: string
  badges: number // текущее число бейджей
  next: number | null // сколько до следующего уровня (null = максимум)
}

const TIERS = [
  { level: 1, name: 'Bronze', min: 1 },
  { level: 2, name: 'Silver', min: 3 },
  { level: 3, name: 'Gold', min: 5 },
  { level: 4, name: 'Platinum', min: 10 },
] as const

export function calcLevel(badges: number): Level {
  let current = { level: 0, name: 'None', min: 0 }
  let next: number | null = TIERS[0].min

  for (const tier of TIERS) {
    if (badges >= tier.min) {
      current = tier
      next = null
    } else {
      next = tier.min - badges
      break
    }
  }

  return { level: current.level, name: current.name, badges, next }
}
