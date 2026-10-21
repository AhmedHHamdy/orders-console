import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config.js'

const ALGORITHM = 'HS256'
export const TOKEN_TTL_SECONDS = 8 * 60 * 60 // one agent shift

const payloadSchema = z.object({ sub: z.coerce.number().int().positive() })

export function signToken(userId: number): string {
  return jwt.sign({}, config.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: String(userId),
    expiresIn: TOKEN_TTL_SECONDS,
  })
}

// Returns the user id, or null if the token is forged, expired or malformed
export function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: [ALGORITHM] })
    return payloadSchema.parse(payload).sub
  } catch {
    return null
  }
}
