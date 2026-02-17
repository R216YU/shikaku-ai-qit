import { z } from 'zod'

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string().min(1),
})

export const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'メッセージを入力してください')
    .max(2000, 'メッセージは2000文字以内で入力してください'),
  examType: z.enum(['fe', 'ap', 'aws-saa']),
  history: z.array(chatMessageSchema).max(50).default([]),
})

export const chatResponseSchema = z.object({
  reply: z.string(),
  remainingCount: z.number().int().nullable(), // null = 無制限（有料プラン）
})

export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ChatResponse = z.infer<typeof chatResponseSchema>
