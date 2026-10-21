import { createApp } from './app.js'
import { config } from './config.js'
import { createPrismaClient } from './db/client.js'

const prisma = createPrismaClient(config.DATABASE_URL)

createApp(prisma).listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`)
})
