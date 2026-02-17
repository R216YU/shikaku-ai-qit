import { describe, it, expect } from 'vitest'
import { chatRequestSchema, chatResponseSchema, chatMessageSchema } from '../chat'

describe('chatMessageSchema', () => {
  it('有効なメッセージをパースできる', () => {
    const result = chatMessageSchema.safeParse({ role: 'user', content: 'テスト' })
    expect(result.success).toBe(true)
  })

  it('不正な role はエラー', () => {
    const result = chatMessageSchema.safeParse({ role: 'assistant', content: 'テスト' })
    expect(result.success).toBe(false)
  })

  it('空の content はエラー', () => {
    const result = chatMessageSchema.safeParse({ role: 'user', content: '' })
    expect(result.success).toBe(false)
  })
})

describe('chatRequestSchema', () => {
  it('有効なリクエストをパースできる', () => {
    const result = chatRequestSchema.safeParse({
      message: 'OSI 参照モデルとは何ですか？',
      examType: 'fe',
      history: [],
    })
    expect(result.success).toBe(true)
  })

  it('history を省略した場合にデフォルト値（空配列）が設定される', () => {
    const result = chatRequestSchema.safeParse({
      message: 'テスト',
      examType: 'ap',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.history).toEqual([])
    }
  })

  it('空のメッセージはエラー', () => {
    const result = chatRequestSchema.safeParse({ message: '', examType: 'fe' })
    expect(result.success).toBe(false)
  })

  it('2001文字のメッセージはエラー', () => {
    const result = chatRequestSchema.safeParse({
      message: 'a'.repeat(2001),
      examType: 'fe',
    })
    expect(result.success).toBe(false)
  })

  it('2000文字のメッセージは有効', () => {
    const result = chatRequestSchema.safeParse({
      message: 'a'.repeat(2000),
      examType: 'fe',
    })
    expect(result.success).toBe(true)
  })

  it('不正な examType はエラー', () => {
    const result = chatRequestSchema.safeParse({
      message: 'テスト',
      examType: 'invalid-exam',
    })
    expect(result.success).toBe(false)
  })

  it('history が51件を超えるとエラー', () => {
    const history = Array.from({ length: 51 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('model' as const),
      content: 'テスト',
    }))
    const result = chatRequestSchema.safeParse({
      message: 'テスト',
      examType: 'fe',
      history,
    })
    expect(result.success).toBe(false)
  })

  it('すべての examType（fe / ap / aws-saa）が有効', () => {
    for (const examType of ['fe', 'ap', 'aws-saa'] as const) {
      const result = chatRequestSchema.safeParse({ message: 'テスト', examType })
      expect(result.success).toBe(true)
    }
  })
})

describe('chatResponseSchema', () => {
  it('有効なレスポンスをパースできる', () => {
    const result = chatResponseSchema.safeParse({
      reply: 'OSI 参照モデルは...',
      remainingCount: 9,
    })
    expect(result.success).toBe(true)
  })

  it('remainingCount が null（有料プラン）もパースできる', () => {
    const result = chatResponseSchema.safeParse({
      reply: '回答です',
      remainingCount: null,
    })
    expect(result.success).toBe(true)
  })
})
