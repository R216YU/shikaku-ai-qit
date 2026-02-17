import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createGeminiClient } from '@shikaku-ai/gemini'
import { chatRequestSchema } from '@shikaku-ai/schema'
import { getRemainingChatCount } from '@shikaku-ai/core'
import { authMiddleware } from '../middleware/auth'
import { chatRateLimitMiddleware } from '../middleware/rate-limit'
import type { Bindings, Variables } from '../types'

export const chatRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/**
 * POST /api/chat
 * AI とのチャット。資格選択に応じたシステムプロンプトで Gemini API を呼び出す。
 * 無料プランはレート制限あり（1日10回）。
 */
chatRoutes.post(
  '/',
  authMiddleware,
  chatRateLimitMiddleware,
  zValidator('json', chatRequestSchema),
  async (c) => {
    const { message, examType, history } = c.req.valid('json')
    const user = c.get('user')
    const usageCount = c.get('chatUsageCount')

    const gemini = createGeminiClient({ apiKey: c.env.GEMINI_API_KEY })
    const reply = await gemini.chat({ message, examType, history })

    // 使用後の残り回数を計算（有料プランは null）
    const remainingCount = getRemainingChatCount(user.plan, usageCount + 1)

    return c.json({ reply, remainingCount })
  },
)
