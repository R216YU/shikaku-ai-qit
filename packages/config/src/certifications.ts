export const EXAM_TYPES = ['fe', 'ap', 'aws-saa'] as const
export type ExamType = (typeof EXAM_TYPES)[number]

export type CertificationInfo = {
  id: ExamType
  name: string
  shortName: string
  description: string
  provider: string
  url: string
}

export const CERTIFICATIONS: Record<ExamType, CertificationInfo> = {
  fe: {
    id: 'fe',
    name: '基本情報技術者試験',
    shortName: 'FE',
    description: 'IT エンジニアの入門資格。情報処理の基礎知識・技能を問う国家試験。',
    provider: 'IPA（情報処理推進機構）',
    url: 'https://www.ipa.go.jp/shiken/kubun/fe.html',
  },
  ap: {
    id: 'ap',
    name: '応用情報技術者試験',
    shortName: 'AP',
    description: '情報処理の応用的な知識・技能を問う国家試験。FE の上位資格。',
    provider: 'IPA（情報処理推進機構）',
    url: 'https://www.ipa.go.jp/shiken/kubun/ap.html',
  },
  'aws-saa': {
    id: 'aws-saa',
    name: 'AWS Certified Solutions Architect - Associate',
    shortName: 'AWS SAA',
    description: 'AWS クラウドアーキテクチャの設計・構築知識を問うベンダー資格。',
    provider: 'Amazon Web Services',
    url: 'https://aws.amazon.com/jp/certification/certified-solutions-architect-associate/',
  },
}
