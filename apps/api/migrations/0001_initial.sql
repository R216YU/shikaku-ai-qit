-- ============================================================
-- 0001_initial.sql
-- 初期テーブル定義
-- ============================================================

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  image       TEXT,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'paid')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auth.js v5 用: アカウント連携（OAuth プロバイダー情報）
CREATE TABLE IF NOT EXISTS accounts (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL,
  type                 TEXT NOT NULL,
  provider             TEXT NOT NULL,
  provider_account_id  TEXT NOT NULL,
  refresh_token        TEXT,
  access_token         TEXT,
  expires_at           INTEGER,
  token_type           TEXT,
  scope                TEXT,
  id_token             TEXT,
  session_state        TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (provider, provider_account_id)
);

-- Auth.js v5 用: セッション管理
CREATE TABLE IF NOT EXISTS sessions (
  id             TEXT PRIMARY KEY,
  session_token  TEXT NOT NULL UNIQUE,
  user_id        TEXT NOT NULL,
  expires        TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Auth.js v5 用: メール認証トークン
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier  TEXT NOT NULL,
  token       TEXT NOT NULL,
  expires     TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- チャット利用回数（無料プランのレート制限用）
CREATE TABLE IF NOT EXISTS chat_usage (
  user_id   TEXT PRIMARY KEY,
  count     INTEGER NOT NULL DEFAULT 0,
  reset_at  TEXT NOT NULL,  -- 次のリセット日時（UTC ISO8601）
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Stripe サブスクリプション管理
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  user_id                TEXT PRIMARY KEY,
  stripe_customer_id     TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'inactive',
  current_period_end     TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sessions_token   ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user    ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider, provider_account_id);
