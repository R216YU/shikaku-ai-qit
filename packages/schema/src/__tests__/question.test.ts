import { describe, it, expect } from 'vitest'
import { questionGenerateRequestSchema, questionSchema } from '../question'

describe('questionGenerateRequestSchema', () => {
  it('有効なリクエストをパースできる', () => {
    const result = questionGenerateRequestSchema.safeParse({
      examType: 'ap',
      difficulty: 'standard',
      count: 5,
    })
    expect(result.success).toBe(true)
  })

  it('count が 0 以下はエラー', () => {
    const result = questionGenerateRequestSchema.safeParse({
      examType: 'ap',
      difficulty: 'easy',
      count: 0,
    })
    expect(result.success).toBe(false)
  })

  it('count が 20 を超えるとエラー', () => {
    const result = questionGenerateRequestSchema.safeParse({
      examType: 'ap',
      difficulty: 'hard',
      count: 21,
    })
    expect(result.success).toBe(false)
  })

  it('count が 1 と 20 は有効', () => {
    for (const count of [1, 20]) {
      const result = questionGenerateRequestSchema.safeParse({
        examType: 'fe',
        difficulty: 'standard',
        count,
      })
      expect(result.success).toBe(true)
    }
  })

  it('不正な difficulty はエラー', () => {
    const result = questionGenerateRequestSchema.safeParse({
      examType: 'fe',
      difficulty: 'very-hard',
      count: 5,
    })
    expect(result.success).toBe(false)
  })

  it('すべての difficulty（easy / standard / hard）が有効', () => {
    for (const difficulty of ['easy', 'standard', 'hard'] as const) {
      const result = questionGenerateRequestSchema.safeParse({
        examType: 'fe',
        difficulty,
        count: 5,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('questionSchema', () => {
  const validQuestion = {
    id: 'q-001',
    text: 'TCP/IP の説明として正しいものはどれか？',
    options: {
      a: 'インターネットの通信プロトコル群',
      b: 'データベース管理システム',
      c: 'プログラミング言語',
      d: 'オペレーティングシステム',
    },
    correctAnswer: 'a' as const,
    explanation: 'TCP/IP はインターネットで使われる通信プロトコルの集合です。',
  }

  it('有効な問題をパースできる', () => {
    const result = questionSchema.safeParse(validQuestion)
    expect(result.success).toBe(true)
  })

  it('不正な correctAnswer はエラー', () => {
    const result = questionSchema.safeParse({ ...validQuestion, correctAnswer: 'e' })
    expect(result.success).toBe(false)
  })

  it('すべての correctAnswer（a / b / c / d）が有効', () => {
    for (const correctAnswer of ['a', 'b', 'c', 'd'] as const) {
      const result = questionSchema.safeParse({ ...validQuestion, correctAnswer })
      expect(result.success).toBe(true)
    }
  })
})
