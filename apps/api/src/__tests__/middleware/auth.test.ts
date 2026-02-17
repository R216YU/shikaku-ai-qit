import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
import { createMockD1, createMockKV, mockSession } from '../helpers/mock-env'
import type { Bindings, Variables } from '../../types'

function buildApp(mockFirst: ReturnType<typeof vi.fn>) {
  const { db, mockPrepare } = createMockD1()
  // first の戻り値を差し替え
  const mockBind = vi.fn(() => ({ first: mockFirst, run: vi.fn(), all: vi.fn() }))
  mockPrepare.mockReturnValue({ bind: mockBind })

  const { kv } = createMockKV()
  const env = { DB: db, RATE_LIMIT: kv } as unknown as Bindings

  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  app.use('*', authMiddleware)
  app.get('/test', (c) => c.json({ userId: c.get('user').id }))

  return { app, env }
}

describe('authMiddleware', () => {
  it('Cookie がない場合 401 を返す', async () => {
    const mockFirst = vi.fn().mockResolvedValue(null)
    const { app, env } = buildApp(mockFirst)

    const res = await app.request('/test', {}, env)
    expect(res.status).toBe(401)
    const data = await res.json() as { error: string }
    expect(data.error).toBe('Unauthorized')
  })

  it('無効なセッショントークンで 401 を返す', async () => {
    const mockFirst = vi.fn().mockResolvedValue(null) // セッションなし
    const { app, env } = buildApp(mockFirst)

    const res = await app.request(
      '/test',
      { headers: { Cookie: 'authjs.session-token=invalid-token' } },
      env,
    )
    expect(res.status).toBe(401)
    const data = await res.json() as { error: string }
    expect(data.error).toBe('Session expired or invalid')
  })

  it('有効なセッションで user がコンテキストにセットされる', async () => {
    const mockFirst = vi.fn().mockResolvedValue(mockSession.free)
    const { app, env } = buildApp(mockFirst)

    const res = await app.request(
      '/test',
      { headers: { Cookie: 'authjs.session-token=valid-token' } },
      env,
    )
    expect(res.status).toBe(200)
    const data = await res.json() as { userId: string }
    expect(data.userId).toBe('user-free-001')
  })

  it('__Secure-authjs.session-token Cookie も認識する', async () => {
    const mockFirst = vi.fn().mockResolvedValue(mockSession.paid)
    const { app, env } = buildApp(mockFirst)

    const res = await app.request(
      '/test',
      { headers: { Cookie: '__Secure-authjs.session-token=secure-token' } },
      env,
    )
    expect(res.status).toBe(200)
  })
})
