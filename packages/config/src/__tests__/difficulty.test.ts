import { describe, it, expect } from 'vitest'
import { DIFFICULTY_LEVELS, DIFFICULTY_LABELS } from '../difficulty'

describe('DIFFICULTY_LEVELS', () => {
  it('3種類の難易度が定義されている', () => {
    expect(DIFFICULTY_LEVELS).toHaveLength(3)
  })

  it('easy / standard / hard が含まれる', () => {
    expect(DIFFICULTY_LEVELS).toContain('easy')
    expect(DIFFICULTY_LEVELS).toContain('standard')
    expect(DIFFICULTY_LEVELS).toContain('hard')
  })
})

describe('DIFFICULTY_LABELS', () => {
  it('すべての難易度レベルに日本語ラベルが存在する', () => {
    for (const level of DIFFICULTY_LEVELS) {
      expect(DIFFICULTY_LABELS[level]).toBeTruthy()
    }
  })

  it('各ラベルが日本語文字列である', () => {
    expect(DIFFICULTY_LABELS.easy).toBe('簡単')
    expect(DIFFICULTY_LABELS.standard).toBe('試験本番レベル')
    expect(DIFFICULTY_LABELS.hard).toBe('難しい')
  })
})
