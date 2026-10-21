import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ quiet: true })

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  DATABASE_URL: z.string().startsWith('file:', 'must be a SQLite file URL, e.g. file:./orders.db'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`)
  process.exit(1)
}

export const config = parsed.data
