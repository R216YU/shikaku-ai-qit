import { describe, it, expect } from 'vitest'
import { SYSTEM_PROMPTS, buildQuestionPrompt } from '../prompts'
import { EXAM_TYPES } from '@shikaku-ai/config'

describe('SYSTEM_PROMPTS', () => {
  it('すべての ExamType にシステムプロンプトが存在する', () => {
    for (const examType of EXAM_TYPES) {
      expect(SYSTEM_PROMPTS[examType]).toBeTruthy()
    }
  })

  it('各プロンプトが空でない文字列である', () => {
    for (const prompt of Object.values(SYSTEM_PROMPTS)) {
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(0)
    }
  })
})

describe('buildQuestionPrompt()', () => {
  it('問題数を含むプロンプトを生成する', () => {
    const prompt = buildQuestionPrompt({ examType: 'fe', difficulty: 'standard', count: 5 })
    expect(prompt).toContain('5')
  })

  it('難易度ラベルを含むプロンプトを生成する', () => {
    const prompt = buildQuestionPrompt({ examType: 'fe', difficulty: 'easy', count: 1 })
    expect(prompt).toContain('簡単')
  })

  it('試験本番レベルの難易度ラベルを含む', () => {
    const prompt = buildQuestionPrompt({ examType: 'ap', difficulty: 'standard', count: 1 })
    expect(prompt).toContain('試験本番レベル')
  })

  it('難しい難易度ラベルを含む', () => {
    const prompt = buildQuestionPrompt({ examType: 'aws-saa', difficulty: 'hard', count: 1 })
    expect(prompt).toContain('難しい')
  })

  it('JSON 形式を指定する文言を含む', () => {
    const prompt = buildQuestionPrompt({ examType: 'fe', difficulty: 'standard', count: 3 })
    expect(prompt).toContain('JSON')
    expect(prompt).toContain('questions')
  })
})
