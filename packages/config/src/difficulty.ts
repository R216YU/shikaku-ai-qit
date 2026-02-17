export const DIFFICULTY_LEVELS = ['easy', 'standard', 'hard'] as const
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number]

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: '簡単',
  standard: '試験本番レベル',
  hard: '難しい',
}
