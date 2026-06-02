import { PrismaClient } from '@prisma/client'

// Singleton Prisma-клиента: в dev Next.js перезагружает модули (hot-reload),
// без кэша на globalThis создаётся куча коннектов к БД.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
