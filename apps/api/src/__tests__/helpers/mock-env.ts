import { vi } from 'vitest'
import type { Bindings } from '../../types'

/**
 * D1Database のモック
 * prepare().bind().first() / .run() / .all() チェーンをサポート
 */
export function createMockD1() {
  const mockFirst = vi.fn().mockResolvedValue(null)
  const mockRun = vi.fn().mockResolvedValue({ success: true, meta: {} })
  const mockAll = vi.fn().mockResolvedValue({ results: [], success: true, meta: {} })
  const mockBind = vi.fn(() => ({ first: mockFirst, run: mockRun, all: mockAll }))
  const mockPrepare = vi.fn(() => ({ bind: mockBind }))

  return {
    db: { prepare: mockPrepare } as unknown as D1Database,
    mockFirst,
    mockRun,
    mockAll,
    mockBind,
    mockPrepare,
  }
}

/**
 * KVNamespace のモック
 */
export function createMockKV() {
  const mockGet = vi.fn().mockResolvedValue(null)
  const mockPut = vi.fn().mockResolvedValue(undefined)
  const mockDelete = vi.fn().mockResolvedValue(undefined)

  return {
    kv: { get: mockGet, put: mockPut, delete: mockDelete } as unknown as KVNamespace,
    mockGet,
    mockPut,
    mockDelete,
  }
}

/**
 * テスト用の Bindings オブジェクトを生成する
 */
export function createMockEnv(overrides?: Partial<Bindings>): Bindings {
  const { db } = createMockD1()
  const { kv } = createMockKV()

  return {
    DB: db,
    RATE_LIMIT: kv,
    GEMINI_API_KEY: 'test-gemini-key',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_WEBHOOK_SECRET: 'whsec_mock',
    STRIPE_PRICE_ID: 'price_mock',
    AUTH_SECRET: 'test-auth-secret-32-characters!!',
    GOOGLE_CLIENT_ID: 'mock-google-client-id',
    GOOGLE_CLIENT_SECRET: 'mock-google-client-secret',
    WEB_BASE_URL: 'http://localhost:3000',
    ...overrides,
  }
}

/**
 * 認証済みユーザーのセッション情報（D1 クエリのモック戻り値）
 */
export const mockSession = {
  free: {
    user_id: 'user-free-001',
    email: 'free@example.com',
    plan: 'free',
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
  paid: {
    user_id: 'user-paid-001',
    email: 'paid@example.com',
    plan: 'paid',
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
}
