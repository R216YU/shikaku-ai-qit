import { createMiddleware } from 'hono/factory'
import { canChat } from '@shikaku-ai/core'
import type { Bindings, Variables } from '../types'

/**
 * Chat レート制限ミドルウェア（無料プランのみ）
 * Cloudflare KV を使って1日あたりの使用回数を管理する
 *
 * KV キー形式: chat:{userId}:{YYYY-MM-DD}
 * TTL: 86400秒（24時間）
 */
export const chatRateLimitMiddleware = createMiddleware<{
  Bindings: Bindings
  Variables: Variables
}>(async (c, next) => {
  const user = c.get('user')

  // 有料プランはレート制限なし
  if (user.plan === 'paid') {
    c.set('chatUsageCount', 0)
    await next()
    return
  }

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const kvKey = `chat:${user.id}:${today}`

  const countStr = await c.env.RATE_LIMIT.get(kvKey)
  const count = countStr !== null ? parseInt(countStr, 10) : 0

  if (!canChat(user.plan, count)) {
    return c.json(
      {
        error: '本日のチャット上限に達しました。有料プランにアップグレードすると無制限でご利用いただけます。',
        remainingCount: 0,
      },
      429,
    )
  }

  // 使用回数をインクリメント（翌日0時に自動削除）
  const secondsUntilMidnight = getSecondsUntilMidnight()
  await c.env.RATE_LIMIT.put(kvKey, String(count + 1), {
    expirationTtl: secondsUntilMidnight,
  })

  c.set('chatUsageCount', count)
  await next()
})

function getSecondsUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCHours(24, 0, 0, 0)
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000)
}
