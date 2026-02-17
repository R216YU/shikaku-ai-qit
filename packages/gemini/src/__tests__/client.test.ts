import { vi, describe, it, expect, beforeEach } from 'vitest'

// @google/generative-ai のモック
const mockSendMessage = vi.fn()
const mockStartChat = vi.fn(() => ({ sendMessage: mockSendMessage }))
const mockGenerateContent = vi.fn()
const mockGetGenerativeModel = vi.fn(() => ({
  startChat: mockStartChat,
  generateContent: mockGenerateContent,
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}))

import { createGeminiClient } from '../client'

describe('createGeminiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('chat()', () => {
    it('Gemini API にメッセージを送り返答を返す', async () => {
      mockSendMessage.mockResolvedValue({
        response: { text: () => 'OSI 参照モデルとは7層構造の通信規格です。' },
      })

      const client = createGeminiClient({ apiKey: 'test-key' })
      const result = await client.chat({
        message: 'OSI 参照モデルとは？',
        examType: 'fe',
        history: [],
      })

      expect(result).toBe('OSI 参照モデルとは7層構造の通信規格です。')
      expect(mockStartChat).toHaveBeenCalledOnce()
      expect(mockSendMessage).toHaveBeenCalledWith('OSI 参照モデルとは？')
    })

    it('会話履歴を正しい形式で API に渡す', async () => {
      mockSendMessage.mockResolvedValue({
        response: { text: () => '続きの回答' },
      })

      const client = createGeminiClient({ apiKey: 'test-key' })
      await client.chat({
        message: '続きを教えてください',
        examType: 'ap',
        history: [
          { role: 'user', content: '最初の質問' },
          { role: 'model', content: '最初の回答' },
        ],
      })

      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: '最初の質問' }] },
          { role: 'model', parts: [{ text: '最初の回答' }] },
        ],
      })
    })

    it('aws-saa の examType でも動作する', async () => {
      mockSendMessage.mockResolvedValue({
        response: { text: () => 'S3 はオブジェクトストレージサービスです。' },
      })

      const client = createGeminiClient({ apiKey: 'test-key' })
      const result = await client.chat({
        message: 'S3 とは？',
        examType: 'aws-saa',
        history: [],
      })

      expect(result).toBe('S3 はオブジェクトストレージサービスです。')
    })

    it('API エラー時に例外をスローする', async () => {
      mockSendMessage.mockRejectedValue(new Error('API エラー'))

      const client = createGeminiClient({ apiKey: 'test-key' })
      await expect(
        client.chat({ message: 'テスト', examType: 'fe', history: [] }),
      ).rejects.toThrow('API エラー')
    })
  })

  describe('generateQuestions()', () => {
    it('問題を生成してパース済みの配列を返す', async () => {
      const mockQuestions = [
        {
          id: 'q-1',
          text: 'テスト問題',
          options: { a: '選択肢A', b: '選択肢B', c: '選択肢C', d: '選択肢D' },
          correctAnswer: 'a',
          explanation: '解説テキスト',
        },
      ]
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify({ questions: mockQuestions }) },
      })

      const client = createGeminiClient({ apiKey: 'test-key' })
      const result = await client.generateQuestions({
        examType: 'fe',
        difficulty: 'standard',
        count: 1,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.text).toBe('テスト問題')
      expect(result[0]?.correctAnswer).toBe('a')
    })

    it('指定した問題数を生成する', async () => {
      const mockQuestions = Array.from({ length: 5 }, (_, i) => ({
        id: `q-${i + 1}`,
        text: `問題${i + 1}`,
        options: { a: 'A', b: 'B', c: 'C', d: 'D' },
        correctAnswer: 'a',
        explanation: '解説',
      }))
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify({ questions: mockQuestions }) },
      })

      const client = createGeminiClient({ apiKey: 'test-key' })
      const result = await client.generateQuestions({
        examType: 'ap',
        difficulty: 'hard',
        count: 5,
      })

      expect(result).toHaveLength(5)
    })

    it('JSON パースに失敗した場合は例外をスローする', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'invalid json' },
      })

      const client = createGeminiClient({ apiKey: 'test-key' })
      await expect(
        client.generateQuestions({ examType: 'fe', difficulty: 'easy', count: 1 }),
      ).rejects.toThrow()
    })
  })
})
