import { describe, it, expect, vi, beforeEach } from 'vitest'

// Gemini クライアントをモック
const mockGenerateQuestions = vi.fn()
vi.mock('@shikaku-ai/gemini', () => ({
  createGeminiClient: vi.fn(() => ({
    chat: vi.fn(),
    generateQuestions: mockGenerateQuestions,
  })),
}))

import app from '../../index'
import { createMockD1, createMockKV, createMockEnv, mockSession } from '../helpers/mock-env'

const mockQuestions = [
  {
    id: 'q-1',
    text: 'テスト問題',
    options: { a: 'A', b: 'B', c: 'C', d: 'D' },
    correctAnswer: 'a',
    explanation: '解説',
  },
]

function buildEnv(plan: 'free' | 'paid') {
  const { db, mockFirst } = createMockD1()
  mockFirst.mockResolvedValue(plan === 'free' ? mockSession.free : mockSession.paid)
  const { kv } = createMockKV()
  return createMockEnv({ DB: db, RATE_LIMIT: kv })
}

const validBody = JSON.stringify({ examType: 'fe', difficulty: 'standard', count: 3 })

describe('POST /api/questions/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateQuestions.mockResolvedValue(mockQuestions)
  })

  it('認証なしで 401 を返す', async () => {
    const env = buildEnv('paid')
    const res = await app.request('/api/questions/generate', { method: 'POST', body: validBody }, env)
    expect(res.status).toBe(401)
  })

  it('無料ユーザーは 403 を返す', async () => {
    const env = buildEnv('free')

    const res = await app.request(
      '/api/questions/generate',
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
    expect(res.status).toBe(403)
  })

  it('有料ユーザーが問題を生成できる', async () => {
    const env = buildEnv('paid')

    const res = await app.request(
      '/api/questions/generate',
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
    const data = await res.json() as { questions: typeof mockQuestions }
    expect(data.questions).toHaveLength(1)
    expect(data.questions[0]?.text).toBe('テスト問題')
  })

  it('不正なリクエストボディで 400 を返す', async () => {
    const env = buildEnv('paid')

    const res = await app.request(
      '/api/questions/generate',
      {
        method: 'POST',
        headers: {
          Cookie: 'authjs.session-token=valid',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ examType: 'fe', difficulty: 'standard', count: 999 }), // count > 20
      },
      env,
    )
    expect(res.status).toBe(400)
  })
})
