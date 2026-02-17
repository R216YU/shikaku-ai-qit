import { describe, it, expect } from 'vitest'
import { canChat, canGenerateQuestions, getRemainingChatCount } from '../rate-limit'

describe('canChat()', () => {
  it('無料ユーザーが制限内（9回）ならチャット可能', () => {
    expect(canChat('free', 9)).toBe(true)
  })

  it('無料ユーザーがちょうど制限（10回）に達したらチャット不可', () => {
    expect(canChat('free', 10)).toBe(false)
  })

  it('無料ユーザーが制限を超えてもチャット不可', () => {
    expect(canChat('free', 100)).toBe(false)
  })

  it('無料ユーザーが 0 回でもチャット可能', () => {
    expect(canChat('free', 0)).toBe(true)
  })

  it('有料ユーザーは 0 回でもチャット可能', () => {
    expect(canChat('paid', 0)).toBe(true)
  })

  it('有料ユーザーは大量に使用してもチャット可能', () => {
    expect(canChat('paid', 1000000)).toBe(true)
  })
})

describe('canGenerateQuestions()', () => {
  it('無料ユーザーは AI 問題生成不可', () => {
    expect(canGenerateQuestions('free')).toBe(false)
  })

  it('有料ユーザーは AI 問題生成可能', () => {
    expect(canGenerateQuestions('paid')).toBe(true)
  })
})

describe('getRemainingChatCount()', () => {
  it('無料ユーザーの残り回数を正しく計算する', () => {
    expect(getRemainingChatCount('free', 3)).toBe(7)
  })

  it('無料ユーザーが 0 回使用時は 10 回残っている', () => {
    expect(getRemainingChatCount('free', 0)).toBe(10)
  })

  it('無料ユーザーがちょうど制限に達したら 0 を返す', () => {
    expect(getRemainingChatCount('free', 10)).toBe(0)
  })

  it('無料ユーザーが制限を超えていても 0 を返す（負にならない）', () => {
    expect(getRemainingChatCount('free', 15)).toBe(0)
  })

  it('有料ユーザーは null を返す（無制限）', () => {
    expect(getRemainingChatCount('paid', 100)).toBeNull()
  })

  it('有料ユーザーは使用回数によらず null を返す', () => {
    expect(getRemainingChatCount('paid', 0)).toBeNull()
  })
})
