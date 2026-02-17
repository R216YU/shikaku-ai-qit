import { z } from 'zod'

export const userPlanSchema = z.enum(['free', 'paid'])

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email('有効なメールアドレスを入力してください'),
  plan: userPlanSchema,
  createdAt: z.string().datetime(),
})

export type UserPlan = z.infer<typeof userPlanSchema>
export type User = z.infer<typeof userSchema>
