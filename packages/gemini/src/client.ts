import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ExamType, DifficultyLevel } from '@shikaku-ai/config'
import type { ChatMessage, Question } from '@shikaku-ai/schema'
import { SYSTEM_PROMPTS, buildQuestionPrompt } from './prompts'

export type GeminiClientConfig = {
  apiKey: string
  model?: string
}

export type GeminiClient = {
  chat: (params: {
    message: string
    examType: ExamType
    history: ChatMessage[]
  }) => Promise<string>
  generateQuestions: (params: {
    examType: ExamType
    difficulty: DifficultyLevel
    count: number
  }) => Promise<Question[]>
}

export function createGeminiClient(config: GeminiClientConfig): GeminiClient {
  const genAI = new GoogleGenerativeAI(config.apiKey)
  const modelName = config.model ?? 'gemini-1.5-pro'

  async function chat(params: {
    message: string
    examType: ExamType
    history: ChatMessage[]
  }): Promise<string> {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPTS[params.examType],
    })

    const chatSession = model.startChat({
      history: params.history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    })

    const result = await chatSession.sendMessage(params.message)
    return result.response.text()
  }

  async function generateQuestions(params: {
    examType: ExamType
    difficulty: DifficultyLevel
    count: number
  }): Promise<Question[]> {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    const prompt = buildQuestionPrompt(params)
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    const parsed = JSON.parse(text) as { questions: Question[] }
    return parsed.questions
  }

  return { chat, generateQuestions }
}
