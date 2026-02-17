import { describe, it, expect } from 'vitest'
import { PLAN_LIMITS, PLAN_TYPES } from '../plans'

describe('PLAN_TYPES', () => {
  it('free と paid が定義されている', () => {
    expect(PLAN_TYPES).toContain('free')
    expect(PLAN_TYPES).toContain('paid')
  })
})

describe('PLAN_LIMITS', () => {
  it('すべてのプランタイプに設定が存在する', () => {
    for (const plan of PLAN_TYPES) {
      expect(PLAN_LIMITS[plan]).toBeDefined()
    }
  })

  it('無料プランは1日10回のチャット制限がある', () => {
    expect(PLAN_LIMITS.free.chatPerDay).toBe(10)
  })

  it('無料プランは AI 問題生成が無効', () => {
    expect(PLAN_LIMITS.free.questionAiGeneration).toBe(false)
  })

  it('有料プランはチャット無制限（Infinity）', () => {
    expect(PLAN_LIMITS.paid.chatPerDay).toBe(Infinity)
  })

  it('有料プランは AI 問題生成が有効', () => {
    expect(PLAN_LIMITS.paid.questionAiGeneration).toBe(true)
  })
})
