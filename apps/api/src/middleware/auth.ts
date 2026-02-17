import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import type { Bindings, Variables } from '../types'

type SessionRow = {
  user_id: string
  email: string
  plan: string
  expires: string
}

/**
 * セッション検証ミドルウェア
 * Auth.js が D1 に書き込んだセッションを直接クエリして検証する
 *
 * Auth.js のセッショントークン Cookie 名:
 *   - HTTP 環境（開発）: authjs.session-token
 *   - HTTPS 環境（本番）: __Secure-authjs.session-token
 */
export const authMiddleware = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  const sessionToken =
    getCookie(c, '__Secure-authjs.session-token') ?? getCookie(c, 'authjs.session-token')

  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const now = new Date().toISOString()
  const session = await c.env.DB.prepare(
    `SELECT s.user_id, u.email, u.plan, s.expires
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.session_token = ? AND s.expires > ?`,
  )
    .bind(sessionToken, now)
    .first<SessionRow>()

  if (!session) {
    return c.json({ error: 'Session expired or invalid' }, 401)
  }

  c.set('user', {
    id: session.user_id,
    email: session.email,
    plan: session.plan as 'free' | 'paid',
  })

  await next()
})
