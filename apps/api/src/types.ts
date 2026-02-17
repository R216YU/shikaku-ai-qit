/**
 * Cloudflare Workers のバインディング型定義
 * wrangler.toml の bindings と対応する
 */
export type Bindings = {
  DB: D1Database
  RATE_LIMIT: KVNamespace
  GEMINI_API_KEY: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  AUTH_SECRET: string
}
