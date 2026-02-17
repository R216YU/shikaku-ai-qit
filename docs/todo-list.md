# 開発 TodoList - サービス公開までのロードマップ

ステータス凡例: `[ ]` 未着手 / `[→]` 進行中 / `[x]` 完了

## 開発ルール

- **テストフレームワーク: Vitest**
- 機能を実装したら必ずテストコードを実装し、`vitest run` で通過を確認してから次のタスクに進む
- 各 `packages/*` および `apps/*` に `vitest.config.ts` を配置する

---

## Phase 1: 環境構築・モノレポ初期化 ✅

### 1-1. モノレポ基盤セットアップ
- [x] pnpm のインストール確認・バージョン固定（`.npmrc`）
- [x] Turborepo 初期化（`turbo.json` 設定）
- [x] `pnpm-workspace.yaml` の作成（apps/*, packages/* を定義）
- [x] ルート `package.json` の設定（ワークスペース共通スクリプト定義）
- [x] TypeScript 共通設定（`tsconfig.base.json`）
- [x] ESLint / Prettier 共通設定
- [x] `.gitattributes` 追加（行末 LF 統一）

### 1-2. packages の骨格作成
- [x] `packages/config` — 資格リスト・難易度・プラン制限定数（テスト: 16件）
- [x] `packages/schema` — Zod スキーマ（Chat・Question・User の入出力型）（テスト: 27件）
- [x] `packages/gemini` — Gemini API クライアント・プロンプトテンプレート（テスト: 14件）
- [x] `packages/core` — レート制限ビジネスロジック（テスト: 14件）

---

## Phase 2: Cloudflare インフラ設定 ✅

### 2-1. Cloudflare アカウント・プロジェクト設定
- [x] Cloudflare アカウントの用意・Wrangler CLI のインストール
- [x] D1 データベースの作成（`shikaku-ai-db` / ID: db64cc6f-...）
- [x] KV namespace の作成（`RATE_LIMIT` / ID: eac64a2e-...）
- [ ] Pages プロジェクトの作成（`shikaku-ai-web`）← Phase 4 で実施
- [ ] Workers プロジェクトの作成（`shikaku-ai-api`）← Phase 3-8 で実施

### 2-2. DB スキーマ設計・マイグレーション
- [x] テーブル設計・マイグレーションファイルの作成（`apps/api/migrations/0001_initial.sql`）
  - `users`（id, email, name, plan, created_at, updated_at）
  - `accounts`（Auth.js OAuth アカウント連携）
  - `sessions`（Auth.js セッション管理）
  - `verification_tokens`（Auth.js メール認証）
  - `chat_usage`（無料プランのレート制限用）
  - `stripe_subscriptions`（Stripe サブスクリプション管理）
- [x] ローカル D1 へのマイグレーション適用（開発環境で動作確認済み）
- [ ] 本番 D1 へのマイグレーション適用 ← Phase 7 で実施

---

## Phase 3: バックエンド API（apps/api）✅

### 3-1. Hono アプリ基本セットアップ
- [x] `apps/api` の初期化（Hono + Cloudflare Workers）
- [x] `wrangler.toml` の設定（D1・KV バインディング、実 ID 設定済み）
- [x] 環境変数の定義（`.dev.vars.example` に全キーを記載）
- [x] CORS ミドルウェアの設定（web・mobile オリジンを許可）
- [x] ヘルスチェックエンドポイント（`GET /health`、動作確認済み）
- [x] `AppType` を export（Hono RPC 型安全クライアント用）

### 3-2. 認証ミドルウェア（セッション検証）
- [x] `authMiddleware`: Auth.js が D1 に書き込んだセッションを直接クエリして検証
  - `authjs.session-token`（HTTP）/ `__Secure-authjs.session-token`（HTTPS）に対応
  - セッション有効期限チェック、ユーザー情報をコンテキストにセット
- [x] テスト実装（4件）

> **設計決定**: Auth.js の OAuth フローは Next.js（Phase 4）で実装。Hono は D1 クエリによるセッション検証のみ担当。

### 3-3. Chat エンドポイント
- [x] `POST /api/chat` の実装
  - `authMiddleware` + `chatRateLimitMiddleware` + Zod バリデーション
  - 資格に特化したシステムプロンプトで Gemini API を呼び出し
  - 残りチャット回数をレスポンスに含める
- [x] `chatRateLimitMiddleware`: Cloudflare KV で1日の使用回数を管理
  - 無料: 1日10回まで（日付が変わると自動リセット）
  - 有料: 無制限（KV チェックなし）
- [x] テスト実装（ミドルウェア5件 + ルート5件）

### 3-4. Question 生成エンドポイント
- [x] `POST /api/questions/generate` の実装
  - 有料プランのみ許可（無料は 403）
  - Gemini API で問題・選択肢・解説を JSON 形式で生成
- [x] テスト実装（4件）

### 3-5. Stripe 決済エンドポイント
- [x] `POST /api/stripe/create-checkout` — チェックアウトセッション作成
- [x] `POST /api/stripe/webhook` — webhook 署名検証・プラン更新処理
  - `checkout.session.completed` → ユーザーを有料プランに更新
  - `customer.subscription.deleted` → ユーザーを無料プランに戻す
- [x] `GET /api/stripe/portal` — カスタマーポータル URL を返す
- [x] テスト実装（9件）

### 3-6. 資格情報エンドポイント（オプション）
- [ ] `GET /api/certifications` — 対応資格リストを返す ← 必要に応じて追加

### 3-7. Cloudflare Workers デプロイ設定
- [x] ローカル開発環境の動作確認（`wrangler dev` + ヘルスチェック）
- [ ] 本番デプロイの設定・動作確認（`wrangler deploy`） ← Phase 7 で実施

---

## Phase 4: フロントエンド（apps/web）

### 4-1. Next.js アプリ基本セットアップ
- [ ] `apps/web` の初期化（Next.js + App Router + Cloudflare Pages 対応）
- [ ] `@cloudflare/next-on-pages` の設定
- [ ] `packages/*` への依存を `package.json` に追加
- [ ] Hono RPC クライアントの設定（`src/lib/api.ts`）
- [ ] 環境変数の設定（`NEXT_PUBLIC_API_URL` など）
- [ ] UI ライブラリの導入（shadcn/ui）

### 4-2. 認証（Auth.js v5）
- [ ] Auth.js v5 のセットアップ（Next.js App Router）
- [ ] `@auth/d1-adapter` を使った D1 セッション管理
- [ ] Google OAuth プロバイダーの設定
- [ ] ログイン・サインアップページの実装
- [ ] 認証状態に応じたナビゲーション切り替え
- [ ] 保護ルートのミドルウェア設定（`middleware.ts`）

### 4-3. 資格情報ページ（静的）
- [ ] 資格一覧ページ（`/certifications`）
- [ ] 各資格詳細ページ（`/certifications/[slug]`）
  - 概要・受験方法・出題範囲・対策のポイント
  - コンテンツは Gemini で事前生成して静的に埋め込む
- [ ] SSG でのビルド設定

### 4-4. Chat モード UI
- [ ] 資格選択画面
- [ ] チャット画面（`/chat`）
  - メッセージの送受信 UI
  - Streaming レスポンスの表示
  - 会話履歴の管理（ローカルステート）
- [ ] 無料ユーザーへの残回数表示・上限到達時のアップグレード誘導

### 4-5. Question モード UI
- [ ] 資格・難易度・問題数の選択画面（`/question`）
- [ ] 問題表示・回答・解説の UI
- [ ] 正答率の集計表示
- [ ] 無料ユーザーへのアップグレード誘導

### 4-6. 料金プラン・サブスクリプション UI
- [ ] 料金プランページ（`/pricing`）
- [ ] Stripe チェックアウトへの遷移処理
- [ ] サブスクリプション管理ページ（`/settings/billing`）

### 4-7. 共通 UI
- [ ] ヘッダー・ナビゲーション
- [ ] トップページ（`/`）— サービス紹介
- [ ] ローディング・エラー状態の UI
- [ ] レスポンシブ対応

---

## Phase 5: AI コンテンツ生成

### 5-1. 資格情報コンテンツの生成（静的ページ用）
- [ ] 各資格の情報コンテンツを Gemini で生成
- [ ] 生成コンテンツをファイルとして保存（MDX など）
- [ ] Next.js の SSG で読み込む仕組みの実装

### 5-2. プロンプト品質調整
- [ ] 資格別システムプロンプトの実動作確認・調整
- [ ] 問題生成プロンプトの品質確認（難易度別）
- [ ] エラーハンドリング・リトライ処理の追加

---

## Phase 6: テスト・品質保証

### 6-1. バックエンドテスト ✅（Phase 3 で実施済み）
- [x] Hono エンドポイントの単体テスト（計 27 件）
- [x] レート制限ロジックのテスト
- [x] Stripe webhook 処理のテスト

### 6-2. フロントエンドテスト
- [ ] コンポーネントの単体テスト（Vitest + Testing Library）
- [ ] Chat / Question フローの結合テスト

### 6-3. E2E テスト
- [ ] Playwright による主要フローのテスト
  - ログイン → Chat → 上限到達 → アップグレード
  - Question モードの一連のフロー

---

## Phase 7: 本番リリース準備

### 7-1. デプロイ設定
- [ ] `wrangler deploy` で Workers を本番デプロイ
- [ ] Cloudflare Pages で Next.js をデプロイ
- [ ] 本番 D1 マイグレーション適用

### 7-2. セキュリティ・環境変数
- [ ] 本番シークレットの設定（`wrangler secret put`）
- [ ] CORS・CSP ヘッダーの設定
- [ ] Stripe の本番モードへの切り替え

### 7-3. カスタムドメイン・DNS 設定
- [ ] ドメインの取得・Cloudflare DNS への設定
- [ ] Pages / Workers にカスタムドメインを紐付け

### 7-4. モニタリング・本番確認
- [ ] Cloudflare Analytics / Workers ログの確認
- [ ] 最終動作確認（全機能・全プラン）
- [ ] 公開

---

## 今後の検討事項（リリース後）

- [ ] 無料プランのチャット回数上限の最終決定（現在: 10回/日）
- [ ] 有料プランの価格設定
- [ ] AWS 認定の対応試験種別の追加（SAA 以外）
- [ ] 問題のキャッシュ・保存戦略
- [ ] 学習履歴・正答率の記録機能
- [ ] Phase 2（モバイル）: Expo アプリ開発

---

## テスト実績

| パッケージ / アプリ | テストファイル | テスト件数 | ステータス |
|--------------------|-------------|----------|----------|
| `@shikaku-ai/config` | certifications / difficulty / plans | 16 | ✅ |
| `@shikaku-ai/schema` | chat / question / user | 27 | ✅ |
| `@shikaku-ai/gemini` | client / prompts | 14 | ✅ |
| `@shikaku-ai/core` | rate-limit | 14 | ✅ |
| `@shikaku-ai/api` | middleware / routes | 27 | ✅ |
| **合計** | | **98** | ✅ **全パス** |

---

## 更新履歴

| 日付       | 内容                                          |
|-----------|----------------------------------------------|
| 2026-02-18 | 初版作成                                      |
| 2026-02-18 | アーキテクチャ確定（Cloudflare / Hono / Turborepo 等）|
| 2026-02-18 | Phase 1〜3 完了・ステータス更新                  |
