import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import type { Prisma } from '../generated/prisma/client.js'
import { OrderStatus, Role } from '../generated/prisma/enums.js'
import { createPrismaClient } from './client.js'

const ORDER_COUNT = 50_000
const BATCH_SIZE = 1_000
const DAY_MS = 24 * 60 * 60 * 1000

const SEED_USERS = [
  { email: 'admin@sarh.test', password: 'Admin123!', role: Role.admin },
  { email: 'agent@sarh.test', password: 'Agent123!', role: Role.agent },
]

const FIRST_NAMES = ['Ahmed', 'Sara', 'Omar', 'Layla', 'Khalid', 'Noura', 'Faisal', 'Huda', 'Yousef', 'Reem', 'John', 'Maria']
const LAST_NAMES = ['Al-Harbi', 'Al-Otaibi', 'Al-Qahtani', 'Hassan', 'Ibrahim', 'Saleh', 'Nasser', 'Khan', 'Smith', 'Garcia']
const PRODUCTS = [
  { name: 'USB-C Cable', priceCents: 2_500 },
  { name: 'Wireless Mouse', priceCents: 8_900 },
  { name: 'Desk Lamp', priceCents: 12_500 },
  { name: 'Laptop Stand', priceCents: 15_000 },
  { name: 'Webcam', priceCents: 22_000 },
  { name: 'Mechanical Keyboard', priceCents: 34_900 },
  { name: 'Headphones', priceCents: 89_900 },
  { name: '27" Monitor', priceCents: 129_900 },
] as const
const STATUSES = Object.values(OrderStatus)

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
const pick = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)]!

const prisma = createPrismaClient(config.DATABASE_URL)

async function seed() {
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.user.deleteMany()

  await prisma.user.createMany({
    data: await Promise.all(
      SEED_USERS.map(async ({ email, password, role }) => ({
        email,
        role,
        passwordHash: await bcrypt.hash(password, 10),
      })),
    ),
  })

  // createMany can't nest items, so order ids are assigned here and items reference them
  const now = Date.now()
  for (let start = 1; start <= ORDER_COUNT; start += BATCH_SIZE) {
    const orders: Prisma.OrderCreateManyInput[] = []
    const items: Prisma.OrderItemCreateManyInput[] = []

    for (let id = start; id < start + BATCH_SIZE && id <= ORDER_COUNT; id++) {
      const first = pick(FIRST_NAMES)
      const last = pick(LAST_NAMES)
      let totalCents = 0

      for (let n = randomInt(1, 5); n > 0; n--) {
        const product = pick(PRODUCTS)
        const quantity = randomInt(1, 4)
        totalCents += quantity * product.priceCents
        items.push({ orderId: id, product: product.name, quantity, unitPriceCents: product.priceCents })
      }

      orders.push({
        id,
        customerName: `${first} ${last}`,
        customerEmail: `${first}.${last}${randomInt(1, 999)}@example.com`.toLowerCase(),
        status: pick(STATUSES),
        totalCents,
        createdAt: new Date(now - Math.floor(Math.random() * 365 * DAY_MS)),
      })
    }

    await prisma.$transaction([
      prisma.order.createMany({ data: orders }),
      prisma.orderItem.createMany({ data: items }),
    ])
  }

  await prisma.$executeRaw`ANALYZE`
}

const started = performance.now()
try {
  await seed()
  console.log(`Seeded ${SEED_USERS.length} users and ${ORDER_COUNT} orders in ${Math.round(performance.now() - started)} ms`)
} finally {
  await prisma.$disconnect()
}
