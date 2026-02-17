# 開発 TodoList - サービス公開までのロードマップ

ステータス凡例: `[ ]` 未着手 / `[→]` 進行中 / `[x]` 完了

## 開発ルール

- **テストフレームワーク: Vitest**
- 機能を実装したら必ずテストコードを実装し、`vitest run` で通過を確認してから次のタスクに進む
- 各 `packages/*` および `apps/*` に `vitest.config.ts` を配置する

---

## Phase 1: 環境構築・モノレポ初期化

### 1-1. モノレポ基盤セットアップ
- [ ] pnpm のインストール確認・バージョン固定（`.npmrc`）
- [ ] Turborepo 初期化（`turbo.json` 設定）
- [ ] `pnpm-workspace.yaml` の作成（apps/*, packages/* を定義）
- [ ] ルート `package.json` の設定（ワークスペース共通スクリプト定義）
- [ ] TypeScript 共通設定（`tsconfig.base.json`）
- [ ] ESLint / Prettier 共通設定

### 1-2. packages の骨格作成
- [ ] `packages/config` — 資格リスト・難易度・定数定義
- [ ] `packages/schema` — Zod スキーマ（Chat・Question・User の入出力型）
- [ ] `packages/gemini` — Gemini API クライアント（pure TS）
- [ ] `packages/core` — 共通ビジネスロジック・型定義

---

## Phase 2: Cloudflare インフラ設定

### 2-1. Cloudflare アカウント・プロジェクト設定
- [ ] Cloudflare アカウントの用意・Wrangler CLI のインストール
- [ ] D1 データベースの作成（`shikaku-ai-db`）
- [ ] KV namespace の作成（`RATE_LIMIT`）
- [ ] Pages プロジェクトの作成（`shikaku-ai-web`）
- [ ] Workers プロジェクトの作成（`shikaku-ai-api`）

### 2-2. DB スキーマ設計・マイグレーション
- [ ] テーブル設計
  - `users`（id, email, plan, created_at）
  - `sessions`（Auth.js v5 用）
  - `chat_usage`（user_id, count, reset_at）
  - `stripe_subscriptions`（user_id, stripe_customer_id, status）
- [ ] マイグレーションファイルの作成（`apps/api/migrations/`）
- [ ] D1 へのマイグレーション適用（開発・本番）

---

## Phase 3: バックエンド API（apps/api）

### 3-1. Hono アプリ基本セットアップ
- [ ] `apps/api` の初期化（Hono + Cloudflare Workers テンプレート）
- [ ] `wrangler.toml` の設定（D1・KV バインディング）
- [ ] 環境変数の設定（Gemini API Key, Stripe Secret, Auth Secret）
- [ ] CORS ミドルウェアの設定（web・mobile オリジンを許可）
- [ ] エラーハンドリングの共通化

### 3-2. 認証エンドポイント（Auth.js v5）
- [ ] Auth.js v5 を Hono に組み込む設定
- [ ] D1 Adapter の設定（セッション・ユーザー管理）
- [ ] OAuth プロバイダーの設定（Google / GitHub など）
- [ ] メール+パスワード認証の実装（検討）
- [ ] セッション検証ミドルウェアの作成

### 3-3. Chat エンドポイント
- [ ] `POST /api/chat` の実装
  - リクエスト: `{ message, examType, history[] }`
  - レート制限チェック（KV から無料ユーザーの残回数確認）
  - 資格に特化したシステムプロンプトの組み立て
  - Gemini API への streaming レスポンス
- [ ] レート制限ロジックの実装（無料: 1日○回、有料: 無制限）

### 3-4. Question 生成エンドポイント
- [ ] `POST /api/questions/generate` の実装
  - リクエスト: `{ examType, difficulty, count }`
  - 有料プランのみ許可するガード
  - Gemini API で問題・選択肢・解説を JSON 形式で生成
  - レスポンス型を `packages/schema` で定義

### 3-5. Stripe 決済エンドポイント
- [ ] `POST /api/stripe/create-checkout` — チェックアウトセッション作成
- [ ] `POST /api/stripe/webhook` — webhook 受け取り・プラン更新処理
  - `checkout.session.completed` → user を有料プランに更新
  - `customer.subscription.deleted` → user を無料プランに戻す
- [ ] `GET /api/stripe/portal` — カスタマーポータルへのリダイレクト

### 3-6. 資格情報エンドポイント（オプション）
- [ ] `GET /api/certifications` — 対応資格リストを返す

### 3-7. Hono RPC 型のエクスポート
- [ ] `apps/api/src/index.ts` から `AppType` を export
- [ ] `apps/web` / `apps/mobile` で利用できる状態を確認

### 3-8. Cloudflare Workers デプロイ設定
- [ ] 開発環境の動作確認（`wrangler dev`）
- [ ] 本番デプロイの設定・動作確認（`wrangler deploy`）

---

## Phase 4: フロントエンド（apps/web）

### 4-1. Next.js アプリ基本セットアップ
- [ ] `apps/web` の初期化（Next.js + App Router + Cloudflare Pages 対応）
- [ ] `@cloudflare/next-on-pages` の設定
- [ ] `packages/*` への依存を `package.json` に追加
- [ ] Hono RPC クライアントの設定（`src/lib/api.ts`）
- [ ] 環境変数の設定（`NEXT_PUBLIC_API_URL` など）
- [ ] UI ライブラリの選定・導入（shadcn/ui など）

### 4-2. 認証 UI
- [ ] ログインページ（`/login`）
- [ ] サインアップページ（`/signup`）
- [ ] Auth.js v5 のフロントエンド統合
- [ ] 認証状態に応じたナビゲーション切り替え
- [ ] 保護ルートのミドルウェア設定

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
- [ ] 問題表示画面
  - 選択肢のレンダリング
  - 回答後の解説表示
  - 正答率の集計表示
- [ ] 無料ユーザーへのアップグレード誘導

### 4-6. 料金プラン・サブスクリプション UI
- [ ] 料金プランページ（`/pricing`）
- [ ] Stripe チェックアウトへの遷移処理
- [ ] サブスクリプション管理ページ（`/settings/billing`）
  - 現在のプラン表示
  - カスタマーポータルへのリンク

### 4-7. 共通 UI
- [ ] ヘッダー・ナビゲーション
- [ ] トップページ（`/`）— サービス紹介
- [ ] ローディング・エラー状態の UI
- [ ] レスポンシブ対応

---

## Phase 5: AI コンテンツ生成

### 5-1. Gemini API クライアント整備（packages/gemini）
- [ ] Gemini API の初期化・設定
- [ ] Chat 用の関数（システムプロンプト＋会話履歴を受け取る）
- [ ] Question 生成用の関数（JSON スキーマを指定して構造化出力）
- [ ] エラーハンドリング・リトライ処理

### 5-2. 資格別システムプロンプト設計（packages/config）
- [ ] 各資格のシステムプロンプトテンプレート作成
  - 基本情報技術者（FE）
  - 応用情報技術者（AP）
  - AWS SAA

### 5-3. 問題生成プロンプト設計
- [ ] 難易度別プロンプトテンプレートの作成
- [ ] 出力 JSON スキーマの定義（問題文・選択肢A〜D・正解・解説）
- [ ] 生成品質の確認・プロンプト調整

### 5-4. 資格情報コンテンツの生成（静的ページ用）
- [ ] 各資格の情報コンテンツを Gemini で生成
- [ ] 生成コンテンツをファイルとして保存（MDX など）
- [ ] Next.js の SSG で読み込む仕組みの実装

---

## Phase 6: テスト・品質保証

### 6-1. バックエンドテスト
- [ ] Hono エンドポイントの単体テスト（Vitest）
- [ ] レート制限ロジックのテスト
- [ ] Stripe webhook 処理のテスト

### 6-2. フロントエンドテスト
- [ ] コンポーネントの単体テスト（Vitest + Testing Library）
- [ ] Chat / Question フローの結合テスト

### 6-3. E2E テスト
- [ ] Playwright による主要フローのテスト
  - サインアップ → Chat → 上限到達 → アップグレード
  - Question モードの一連のフロー

---

## Phase 7: 本番リリース準備

### 7-1. セキュリティ確認
- [ ] 環境変数・シークレットの本番設定
- [ ] CORS・CSP ヘッダーの設定
- [ ] Stripe webhook の署名検証の確認
- [ ] レート制限の動作確認

### 7-2. カスタムドメイン・DNS 設定
- [ ] ドメインの取得・Cloudflare DNS への設定
- [ ] Pages にカスタムドメインを紐付け
- [ ] Workers のカスタムルートの設定

### 7-3. モニタリング・ログ設定
- [ ] Cloudflare Analytics の確認
- [ ] Workers のエラーログ確認方法の整備
- [ ] Stripe ダッシュボードの確認

### 7-4. 本番リリース
- [ ] 本番 D1 マイグレーション適用
- [ ] Stripe の本番モードへの切り替え
- [ ] 最終動作確認（全機能・全プラン）
- [ ] 公開

---

## 今後の検討事項（リリース後）

- [ ] 無料プランのチャット回数上限の最終決定
- [ ] 有料プランの価格設定
- [ ] AWS 認定の対応試験種別の追加
- [ ] 問題のキャッシュ・保存戦略
- [ ] 学習履歴・正答率の記録機能
- [ ] Phase 2: Expo モバイルアプリ開発

---

## 更新履歴

| 日付       | 内容         |
|-----------|-------------|
| 2026-02-18 | 初版作成     |
