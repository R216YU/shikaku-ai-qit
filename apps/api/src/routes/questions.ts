import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createGeminiClient } from '@shikaku-ai/gemini'
import { questionGenerateRequestSchema } from '@shikaku-ai/schema'
import { canGenerateQuestions } from '@shikaku-ai/core'
import { authMiddleware } from '../middleware/auth'
import type { Bindings, Variables } from '../types'

export const questionRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/**
 * POST /api/questions/generate
 * AI による模擬問題の生成。有料プランのみ利用可能。
 */
questionRoutes.post(
  '/generate',
  authMiddleware,
  zValidator('json', questionGenerateRequestSchema),
  async (c) => {
    const user = c.get('user')

    if (!canGenerateQuestions(user.plan)) {
      return c.json(
        {
          error:
            'AI 問題生成は有料プランでのみご利用いただけます。プランをアップグレードしてください。',
        },
        403,
      )
    }

    const { examType, difficulty, count } = c.req.valid('json')
    const gemini = createGeminiClient({ apiKey: c.env.GEMINI_API_KEY })
    const questions = await gemini.generateQuestions({ examType, difficulty, count })

    return c.json({ questions })
  },
)
