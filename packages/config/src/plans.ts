export const PLAN_TYPES = ['free', 'paid'] as const
export type PlanType = (typeof PLAN_TYPES)[number]

export type PlanLimits = {
  chatPerDay: number
  questionAiGeneration: boolean
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    chatPerDay: 10,
    questionAiGeneration: false,
  },
  paid: {
    chatPerDay: Infinity,
    questionAiGeneration: true,
  },
}
