import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stripe SDK をモック
const mockCreateCheckout = vi.fn()
const mockCreatePortal = vi.fn()
const mockConstructEvent = vi.fn()
vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCreateCheckout } },
    billingPortal: { sessions: { create: mockCreatePortal } },
    webhooks: { constructEvent: mockConstructEvent },
  }))
  // 静的メソッドも定義する（getStripe() 内で使用）
  ;(MockStripe as unknown as Record<string, unknown>).createFetchHttpClient = vi
    .fn()
    .mockReturnValue({})
  return { default: MockStripe }
})

import app from '../../index'
import { createMockD1, createMockKV, createMockEnv, mockSession } from '../helpers/mock-env'

function buildEnv(plan: 'free' | 'paid', subRow: object | null = null) {
  const { db, mockFirst, mockPrepare, mockBind, mockRun } = createMockD1()
  // セッション検証用
  mockFirst.mockResolvedValueOnce(plan === 'paid' ? mockSession.paid : mockSession.free)
  // portal 用: stripe_subscriptions クエリ
  if (subRow !== null) {
    mockFirst.mockResolvedValueOnce(subRow)
  }
  const { kv } = createMockKV()
  return { env: createMockEnv({ DB: db, RATE_LIMIT: kv }), mockRun }
}

describe('POST /api/stripe/create-checkout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('認証なしで 401 を返す', async () => {
    const { env } = buildEnv('free')
    const res = await app.request('/api/stripe/create-checkout', { method: 'POST' }, env)
    expect(res.status).toBe(401)
  })

  it('有料ユーザーがチェックアウト URL を取得できる', async () => {
    mockCreateCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })
    const { env } = buildEnv('paid')

    const res = await app.request(
      '/api/stripe/create-checkout',
      {
        method: 'POST',
        headers: { Cookie: 'authjs.session-token=valid' },
      },
      env,
    )
    expect(res.status).toBe(200)
    const data = await res.json() as { url: string }
    expect(data.url).toBe('https://checkout.stripe.com/test')
  })
})

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stripe-signature がない場合 400 を返す', async () => {
    const { env } = buildEnv('free')
    const res = await app.request('/api/stripe/webhook', { method: 'POST', body: '{}' }, env)
    expect(res.status).toBe(400)
  })

  it('無効な署名で 400 を返す', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Invalid signature') })
    const { env } = buildEnv('free')

    const res = await app.request(
      '/api/stripe/webhook',
      {
        method: 'POST',
        headers: { 'stripe-signature': 'invalid' },
        body: '{}',
      },
      env,
    )
    expect(res.status).toBe(400)
  })

  it('checkout.session.completed でユーザーを有料プランに更新する', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: 'user-001' },
          customer: 'cus_test',
          subscription: 'sub_test',
        },
      },
    })

    const { env, mockRun } = buildEnv('free')
    const res = await app.request(
      '/api/stripe/webhook',
      {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      },
      env,
    )
    expect(res.status).toBe(200)
    expect(mockRun).toHaveBeenCalledTimes(2) // users 更新 + stripe_subscriptions upsert
  })

  it('customer.subscription.deleted でユーザーを無料プランに戻す', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_test' } },
    })

    const { env, mockRun } = buildEnv('free')
    const res = await app.request(
      '/api/stripe/webhook',
      {
        method: 'POST',
        headers: { 'stripe-signature': 'valid-sig' },
        body: JSON.stringify({ type: 'customer.subscription.deleted' }),
      },
      env,
    )
    expect(res.status).toBe(200)
    expect(mockRun).toHaveBeenCalledTimes(2) // users 更新 + stripe_subscriptions 更新
  })
})

describe('GET /api/stripe/portal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('認証なしで 401 を返す', async () => {
    const { env } = buildEnv('paid')
    const res = await app.request('/api/stripe/portal', {}, env)
    expect(res.status).toBe(401)
  })

  it('サブスクリプションが存在する場合ポータル URL を返す', async () => {
    mockCreatePortal.mockResolvedValue({ url: 'https://billing.stripe.com/test' })
    const { env } = buildEnv('paid', { stripe_customer_id: 'cus_test' })

    const res = await app.request(
      '/api/stripe/portal',
      { headers: { Cookie: 'authjs.session-token=valid' } },
      env,
    )
    expect(res.status).toBe(200)
    const data = await res.json() as { url: string }
    expect(data.url).toBe('https://billing.stripe.com/test')
  })

  it('サブスクリプションが存在しない場合 404 を返す', async () => {
    const { env } = buildEnv('paid', null)

    const res = await app.request(
      '/api/stripe/portal',
      { headers: { Cookie: 'authjs.session-token=valid' } },
      env,
    )
    expect(res.status).toBe(404)
  })
})
