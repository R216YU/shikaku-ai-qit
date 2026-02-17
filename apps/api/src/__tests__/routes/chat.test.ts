import { describe, it, expect, vi, beforeEach } from 'vitest'

// Gemini クライアントをモック
const mockChat = vi.fn()
vi.mock('@shikaku-ai/gemini', () => ({
  createGeminiClient: vi.fn(() => ({ chat: mockChat, generateQuestions: vi.fn() })),
}))

import app from '../../index'
import { createMockD1, createMockKV, createMockEnv, mockSession } from '../helpers/mock-env'

function buildEnv(plan: 'free' | 'paid', kvCount: string | null = null) {
  const { db, mockPrepare, mockFirst, mockBind } = createMockD1()
  mockFirst.mockResolvedValue(plan === 'free' ? mockSession.free : mockSession.paid)

  const { kv, mockGet, mockPut } = createMockKV()
  mockGet.mockResolvedValue(kvCount)

  return {
    env: createMockEnv({ DB: db, RATE_LIMIT: kv }),
    mockFirst,
    mockGet,
    mockPut,
  }
}

const validBody = JSON.stringify({
  message: 'OSI 参照モデルとは？',
  examType: 'fe',
  history: [],
})

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChat.mockResolvedValue('OSI 参照モデルは7層構造の通信規格です。')
  })

  it('認証なしで 401 を返す', async () => {
    const { env } = buildEnv('free')
    const res = await app.request('/api/chat', { method: 'POST', body: validBody }, env)
    expect(res.status).toBe(401)
  })

  it('有料ユーザーが正常に返答を受け取れる', async () => {
    const { env } = buildEnv('paid')

    const res = await app.request(
      '/api/chat',
      {
        method: 'POST',
        headers: {
          Cookie: 'authjs.session-token=valid',
          'Content-Type': 'application/json',
        },
        body: validBody,
      },
      env,
    )
    expect(res.status).toBe(200)
    const data = await res.json() as { reply: string; remainingCount: number | null }
    expect(data.reply).toBe('OSI 参照モデルは7層構造の通信規格です。')
    expect(data.remainingCount).toBeNull() // 有料プランは null
  })

  it('無料ユーザーが制限内で返答を受け取れる', async () => {
    const { env } = buildEnv('free', '5') // 5回使用済み

    const res = await app.request(
      '/api/chat',
      {
        method: 'POST',
        headers: {
          Cookie: 'authjs.session-token=valid',
          'Content-Type': 'application/json',
        },
        body: validBody,
      },
      env,
    )
    expect(res.status).toBe(200)
    const data = await res.json() as { remainingCount: number }
    expect(data.remainingCount).toBe(4) // 10 - (5+1) = 4
  })

  it('無料ユーザーが上限に達した場合 429 を返す', async () => {
    const { env } = buildEnv('free', '10') // 10回使用済み（上限）

    const res = await app.request(
      '/api/chat',
      {
        method: 'POST',
        headers: {
          Cookie: 'authjs.session-token=valid',
          'Content-Type': 'application/json',
        },
        body: validBody,
      },
      env,
    )
    expect(res.status).toBe(429)
  })

  it('不正なリクエストボディで 400 を返す', async () => {
    const { env } = buildEnv('paid')

    const res = await app.request(
      '/api/chat',
      {
        method: 'POST',
        headers: {
          Cookie: 'authjs.session-token=valid',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: '', examType: 'invalid' }),
      },
      env,
    )
    expect(res.status).toBe(400)
  })
})
