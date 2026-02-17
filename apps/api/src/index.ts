import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// ミドルウェア
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:3000', // Next.js 開発環境
      'https://shikaku-ai.pages.dev', // Cloudflare Pages（本番）
    ],
    credentials: true,
  }),
)

// ヘルスチェック
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// TODO: Phase 3 でルートを追加
// app.route('/api/chat', chatRoutes)
// app.route('/api/questions', questionRoutes)
// app.route('/api/auth', authRoutes)
// app.route('/api/stripe', stripeRoutes)

/**
 * AppType を export することで Hono RPC による型安全な API クライアントが生成される
 * apps/web および apps/mobile から import して使用する
 */
export type AppType = typeof app

export default app
