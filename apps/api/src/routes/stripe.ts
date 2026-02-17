import { Hono } from 'hono'
import Stripe from 'stripe'
import { authMiddleware } from '../middleware/auth'
import type { Bindings, Variables } from '../types'

export const stripeRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function getStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  })
}

/**
 * POST /api/stripe/create-checkout
 * Stripe チェックアウトセッションを作成してURLを返す
 */
stripeRoutes.post('/create-checkout', authMiddleware, async (c) => {
  const user = c.get('user')
  const stripe = getStripe(c.env.STRIPE_SECRET_KEY)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{ price: c.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${c.env.WEB_BASE_URL}/settings/billing?success=true`,
    cancel_url: `${c.env.WEB_BASE_URL}/pricing`,
    metadata: { userId: user.id },
  })

  return c.json({ url: session.url })
})

/**
 * POST /api/stripe/webhook
 * Stripe からの webhook を受け取りプラン変更を処理する
 * 署名検証で不正なリクエストを拒否する
 */
stripeRoutes.post('/webhook', async (c) => {
  const stripe = getStripe(c.env.STRIPE_SECRET_KEY)
  const body = await c.req.text()
  const sig = c.req.header('stripe-signature')

  if (!sig) {
    return c.json({ error: 'Missing stripe-signature header' }, 400)
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, c.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return c.json({ error: 'Invalid webhook signature' }, 400)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const userId = session.metadata?.userId
      if (!userId) break

      // ユーザーを有料プランに更新
      await c.env.DB.prepare('UPDATE users SET plan = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind('paid', userId)
        .run()

      // サブスクリプション情報を保存
      await c.env.DB.prepare(`
        INSERT INTO stripe_subscriptions
          (user_id, stripe_customer_id, stripe_subscription_id, status, updated_at)
        VALUES (?, ?, ?, 'active', datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          stripe_customer_id     = excluded.stripe_customer_id,
          stripe_subscription_id = excluded.stripe_subscription_id,
          status                 = 'active',
          updated_at             = datetime('now')
      `)
        .bind(userId, session.customer as string, session.subscription as string)
        .run()
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // ユーザーを無料プランに戻す
      await c.env.DB.prepare(`
        UPDATE users SET plan = 'free', updated_at = datetime('now')
        WHERE id = (
          SELECT user_id FROM stripe_subscriptions WHERE stripe_customer_id = ?
        )
      `)
        .bind(customerId)
        .run()

      // サブスクリプションのステータスを更新
      await c.env.DB.prepare(`
        UPDATE stripe_subscriptions
        SET status = 'canceled', updated_at = datetime('now')
        WHERE stripe_customer_id = ?
      `)
        .bind(customerId)
        .run()
      break
    }
  }

  return c.json({ received: true })
})

/**
 * GET /api/stripe/portal
 * Stripe カスタマーポータルへのリダイレクト URL を返す
 */
stripeRoutes.get('/portal', authMiddleware, async (c) => {
  const user = c.get('user')
  const stripe = getStripe(c.env.STRIPE_SECRET_KEY)

  const sub = await c.env.DB.prepare(
    'SELECT stripe_customer_id FROM stripe_subscriptions WHERE user_id = ?',
  )
    .bind(user.id)
    .first<{ stripe_customer_id: string }>()

  if (!sub) {
    return c.json({ error: 'サブスクリプションが見つかりません' }, 404)
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${c.env.WEB_BASE_URL}/settings/billing`,
  })

  return c.json({ url: portalSession.url })
})
