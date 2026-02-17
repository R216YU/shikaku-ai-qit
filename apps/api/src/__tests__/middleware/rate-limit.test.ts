import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { chatRateLimitMiddleware } from '../../middleware/rate-limit'
import { createMockKV, createMockEnv } from '../helpers/mock-env'
import type { Bindings, Variables } from '../../types'

function buildApp(plan: 'free' | 'paid', kvGetValue: string | null = null) {
  const { kv, mockGet, mockPut } = createMockKV()
  mockGet.mockResolvedValue(kvGetValue)

  const env = createMockEnv({ RATE_LIMIT: kv })

  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

  // ユーザーをコンテキストに注入（authMiddleware の代わり）
  app.use('*', async (c, next) => {
    c.set('user', { id: 'user-001', email: 'test@example.com', plan })
    await next()
  })
  app.use('*', chatRateLimitMiddleware)
  app.post('/test', (c) => c.json({ count: c.get('chatUsageCount') }))

  return { app, env, mockGet, mockPut }
}

describe('chatRateLimitMiddleware', () => {
  it('有料ユーザーはレート制限なし（KV を参照しない）', async () => {
    const { app, env, mockGet } = buildApp('paid')

    const res = await app.request('/test', { method: 'POST' }, env)
    expect(res.status).toBe(200)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('無料ユーザーが初回（count=0）の場合は通過する', async () => {
    const { app, env } = buildApp('free', null) // KV に値なし = 0回

    const res = await app.request('/test', { method: 'POST' }, env)
    expect(res.status).toBe(200)
    const data = await res.json() as { count: number }
    expect(data.count).toBe(0)
  })

  it('無料ユーザーが制限内（9回）の場合は通過する', async () => {
    const { app, env } = buildApp('free', '9') // 9回使用済み

    const res = await app.request('/test', { method: 'POST' }, env)
    expect(res.status).toBe(200)
  })

  it('無料ユーザーが上限（10回）に達した場合は 429 を返す', async () => {
    const { app, env } = buildApp('free', '10') // 10回使用済み（上限）

    const res = await app.request('/test', { method: 'POST' }, env)
    expect(res.status).toBe(429)
    const data = await res.json() as { remainingCount: number }
    expect(data.remainingCount).toBe(0)
  })

  it('通過時に KV のカウントをインクリメントする', async () => {
    const { app, env, mockPut } = buildApp('free', '3')

    await app.request('/test', { method: 'POST' }, env)
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringContaining('chat:user-001:'),
      '4',
      expect.objectContaining({ expirationTtl: expect.any(Number) }),
    )
  })
})
