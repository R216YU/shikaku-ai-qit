import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { chatRoutes } from './routes/chat'
import { questionRoutes } from './routes/questions'
import { stripeRoutes } from './routes/stripe'
import type { Bindings, Variables } from './types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ミドルウェア
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = [
        'http://localhost:3000',
        'https://shikaku-ai.pages.dev',
      ]
      return allowed.includes(origin) ? origin : allowed[0]!
    },
    credentials: true,
  }),
)

// ヘルスチェック
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ルート
app.route('/api/chat', chatRoutes)
app.route('/api/questions', questionRoutes)
app.route('/api/stripe', stripeRoutes)

/**
 * AppType を export することで Hono RPC による型安全な API クライアントが生成される
 * apps/web および apps/mobile から import して使用する
 */
export type AppType = typeof app

export default app
