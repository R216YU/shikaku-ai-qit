import { describe, it, expect } from 'vitest'
import { userSchema } from '../user'

describe('userSchema', () => {
  const validUser = {
    id: 'user-123',
    email: 'test@example.com',
    plan: 'free' as const,
    createdAt: new Date().toISOString(),
  }

  it('有効なユーザーをパースできる', () => {
    const result = userSchema.safeParse(validUser)
    expect(result.success).toBe(true)
  })

  it('paid プランも有効', () => {
    const result = userSchema.safeParse({ ...validUser, plan: 'paid' })
    expect(result.success).toBe(true)
  })

  it('不正なメールアドレスはエラー', () => {
    const result = userSchema.safeParse({ ...validUser, email: 'invalid-email' })
    expect(result.success).toBe(false)
  })

  it('不正なプランはエラー', () => {
    const result = userSchema.safeParse({ ...validUser, plan: 'premium' })
    expect(result.success).toBe(false)
  })

  it('不正な日時形式はエラー', () => {
    const result = userSchema.safeParse({ ...validUser, createdAt: '2024/01/01' })
    expect(result.success).toBe(false)
  })
})
