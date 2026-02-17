import { z } from 'zod'

export const questionOptionsSchema = z.object({
  a: z.string(),
  b: z.string(),
  c: z.string(),
  d: z.string(),
})

export const questionSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: questionOptionsSchema,
  correctAnswer: z.enum(['a', 'b', 'c', 'd']),
  explanation: z.string(),
})

export const questionGenerateRequestSchema = z.object({
  examType: z.enum(['fe', 'ap', 'aws-saa']),
  difficulty: z.enum(['easy', 'standard', 'hard']),
  count: z.number().int().min(1, '問題数は1以上を指定してください').max(20, '問題数は20以下を指定してください'),
})

export const questionGenerateResponseSchema = z.object({
  questions: z.array(questionSchema),
})

export type QuestionOptions = z.infer<typeof questionOptionsSchema>
export type Question = z.infer<typeof questionSchema>
export type QuestionGenerateRequest = z.infer<typeof questionGenerateRequestSchema>
export type QuestionGenerateResponse = z.infer<typeof questionGenerateResponseSchema>
