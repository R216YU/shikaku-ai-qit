import type { PlanType } from '@shikaku-ai/config'

/**
 * Cloudflare Workers のバインディング型定義
 * wrangler.toml の bindings と対応する
 */
export type Bindings = {
  // Cloudflare リソース
  DB: D1Database
  RATE_LIMIT: KVNamespace

  // AI
  GEMINI_API_KEY: string

  // Stripe
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_ID: string

  // Auth
  AUTH_SECRET: string

  // Google OAuth（Auth.js が Next.js 側で使用、Workers 側では参照のみ）
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string

  // Web アプリの URL（Stripe リダイレクト先）
  WEB_BASE_URL: string
}

/**
 * Hono コンテキストに保存する変数の型
 * authMiddleware がセットし、後続のハンドラーで参照する
 */
export type Variables = {
  user: {
    id: string
    email: string
    plan: PlanType
  }
  chatUsageCount: number
}
