import { PLAN_LIMITS, type PlanType } from '@shikaku-ai/config'

/**
 * 指定プラン・使用回数でチャットが可能かどうかを返す
 */
export function canChat(plan: PlanType, usedCount: number): boolean {
  const limit = PLAN_LIMITS[plan].chatPerDay
  return limit === Infinity || usedCount < limit
}

/**
 * 指定プランで AI 問題生成が可能かどうかを返す
 */
export function canGenerateQuestions(plan: PlanType): boolean {
  return PLAN_LIMITS[plan].questionAiGeneration
}

/**
 * 残りチャット回数を返す。有料プラン（無制限）の場合は null を返す
 */
export function getRemainingChatCount(plan: PlanType, usedCount: number): number | null {
  const limit = PLAN_LIMITS[plan].chatPerDay
  if (limit === Infinity) return null
  return Math.max(0, limit - usedCount)
}
