# 資格勉強サポートアプリ - プロジェクト概要

## サービスコンセプト

Gemini API を活用した資格学習支援 Web アプリ。
AI との対話・AI 生成問題を通じて、効率的な資格試験対策を提供する。
まず Web 版を開発・リリースし、その後モバイルアプリへ展開する。

---

## 技術スタック（確定）

| レイヤー           | 技術                  | 備考                                          |
|-------------------|-----------------------|-----------------------------------------------|
| フロントエンド      | Next.js               | App Router、Cloudflare Pages にデプロイ         |
| バックエンド API    | Hono                  | Cloudflare Workers で動作、Next.js とは独立      |
| モバイル（Phase 2）| Expo（React Native）  | Web 版リリース後に開発開始                       |
| AI                | Gemini API            | コンテンツ生成・チャット・問題生成               |
| 認証              | Auth.js v5            | OAuth フローは Next.js で実装、セッション検証は Hono が D1 を直接クエリ |
| 決済              | Stripe                | サブスクリプション管理、webhook は Hono で受け取る |
| DB                | Cloudflare D1         | SQLite at Edge（ユーザー・プラン・利用回数管理）  |
| キャッシュ・制限   | Cloudflare KV         | レート制限カウンター（KV key: `chat:{userId}:{YYYY-MM-DD}`）|
| バリデーション     | Zod                   | packages/schema で定義、API・クライアント共用     |
| モノレポ管理       | Turborepo + pnpm      | ワークスペースによるパッケージ管理               |

---

## インフラ構成

```
Cloudflare
├── Pages   → apps/web    （Next.js）
└── Workers → apps/api    （Hono）
              ├── D1      （DB：ユーザー・プラン・利用回数・セッション）
              │             database_id: db64cc6f-4e69-491a-a7fc-e5aae2014823
              └── KV      （レート制限カウンター）
                            id: eac64a2e955946a99856e8f33515d224

外部サービス
├── Gemini API  ← apps/api から呼び出す
└── Stripe      ← apps/api の webhook エンドポイントで受け取る
```

---

## モノレポ構成

```
shikaku-ai/                          ← モノレポルート
├── apps/
│   ├── api/                         ← Hono（Cloudflare Workers）✅ Phase 3 完了
│   │   ├── migrations/
│   │   │   └── 0001_initial.sql    ← 6テーブル定義
│   │   └── src/
│   │       ├── middleware/
│   │       │   ├── auth.ts          ← セッション検証（D1 直接クエリ）
│   │       │   └── rate-limit.ts    ← KV ベースのレート制限
│   │       ├── routes/
│   │       │   ├── chat.ts          ← POST /api/chat
│   │       │   ├── questions.ts     ← POST /api/questions/generate
│   │       │   └── stripe.ts        ← POST/GET /api/stripe/*
│   │       ├── types.ts             ← Bindings / Variables 型定義
│   │       └── index.ts             ← AppType を export（Hono RPC 用）
│   ├── web/                         ← Next.js（Cloudflare Pages）← Phase 4
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (public)/        ← 資格情報ページ（認証不要・SSG）
│   │       │   ├── chat/            ← Chat モード
│   │       │   └── question/        ← Question モード
│   │       ├── components/
│   │       └── lib/
│   │           └── api.ts           ← hc<AppType> による型安全クライアント
│   └── mobile/                      ← Expo（Phase 2）
├── packages/
│   ├── core/                        ← 共通ビジネスロジック（レート制限判定など）✅
│   ├── gemini/                      ← Gemini API クライアント（pure TS）✅
│   ├── schema/                      ← Zod スキーマ（API・バリデーション共用）✅
│   └── config/                      ← 資格リスト・難易度・定数定義 ✅
├── docs/                            ← プロジェクトドキュメント
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 認証アーキテクチャ

**Auth.js OAuth フロー（Phase 4 で実装）と Hono セッション検証の分離。**

```
[ブラウザ]
   │  1. Google OAuth ログイン
   ▼
[Next.js（apps/web）]
   │  Auth.js v5 が OAuth を処理し、
   │  セッションを D1 の sessions テーブルに書き込む
   │  → Cookie: authjs.session-token（HTTP）
   │          __Secure-authjs.session-token（HTTPS）
   ▼
[Hono API（apps/api）]
   │  authMiddleware が Cookie からトークンを取り出し、
   │  D1 の sessions テーブルを直接クエリして検証
   │  → コンテキストに user { id, email, plan } をセット
```

> **設計決定**: Hono に `@auth/core` は不要。Auth.js が D1 に書き込んだセッションを SQL で検証するだけ。

---

## API 型安全化（Hono RPC）

`apps/api` で定義したルートの型を `apps/web` / `apps/mobile` が直接 import して使う。
Zod スキーマは `packages/schema` で一元管理し、API とクライアント双方で共用する。

```
packages/schema  ──→  apps/api（Hono + zValidator で受け取る）
                         └─ AppType を export
                               └─→  apps/web（hc<AppType> で型安全に呼び出す）
                               └─→  apps/mobile（同上）
```

---

## 実装済み API エンドポイント（Phase 3 完了）

| メソッド | パス                          | 認証 | プラン | 説明                          |
|---------|------------------------------|------|-------|------------------------------|
| GET     | /health                      | 不要 | -     | ヘルスチェック                 |
| POST    | /api/chat                    | 必要 | 両方  | Gemini AI チャット             |
| POST    | /api/questions/generate      | 必要 | 有料のみ | AI 問題生成                |
| POST    | /api/stripe/create-checkout  | 必要 | -     | Stripe チェックアウト作成      |
| POST    | /api/stripe/webhook          | 不要（署名検証）| - | Stripe webhook 受け取り |
| GET     | /api/stripe/portal           | 必要 | -     | カスタマーポータル URL 取得    |

---

## DB テーブル設計（migrations/0001_initial.sql）

| テーブル               | 用途                                    |
|-----------------------|----------------------------------------|
| `users`               | ユーザー情報（email, plan, etc.）        |
| `accounts`            | OAuth アカウント連携（Auth.js）          |
| `sessions`            | セッション管理（Auth.js）               |
| `verification_tokens` | メール認証トークン（Auth.js）           |
| `chat_usage`          | レート制限用使用回数（※現在は KV 管理）  |
| `stripe_subscriptions`| Stripe サブスクリプション情報           |

---

## 対応資格（初期リリース）

- 基本情報技術者試験（FE）
- 応用情報技術者試験（AP）
- AWS 認定試験
  - Solutions Architect - Associate（SAA）
  - その他の試験種別は追加検討

> 後から資格を追加できる拡張可能な設計にする（`packages/config` で一元管理）

---

## 主要機能

### 1. 資格情報ページ（静的ページ）

- 各資格試験の概要・受験方法・出題範囲などを掲載
- コンテンツは Gemini API で事前生成したものを静的に配信
- 認証不要・SEO 対応（SSG）

### 2. Chat モード

- AI とのチャット形式で学習を進める
- 受験する資格試験を選択 → その資格に特化したシステムプロンプトで応答
- 用途例：知らない概念の解説、自分の理解の壁打ち

### 3. Question モード

- AI が生成した模擬問題を解く
- 選択項目：対象資格 / 難易度（簡単・本番レベル・難しい）/ 問題数
- 問題・選択肢・解説をすべて Gemini API が生成

---

## 料金プラン

| 機能                         | 無料プラン          | 有料プラン         |
|-----------------------------|--------------------|--------------------|
| 資格情報ページ閲覧           | ○                  | ○                  |
| Chat モード                  | ○（10回/日まで）    | ○（無制限）         |
| Question モード（AI 生成）   | ✕                  | ○（毎回 AI 生成）   |
| Question モード（固定問題）  | 検討中             | ○                  |

---

## テスト実績（Phase 1〜3）

| パッケージ / アプリ   | テスト件数 | ステータス |
|--------------------|----------|----------|
| `@shikaku-ai/config` | 16 | ✅ |
| `@shikaku-ai/schema` | 27 | ✅ |
| `@shikaku-ai/gemini` | 14 | ✅ |
| `@shikaku-ai/core`   | 14 | ✅ |
| `@shikaku-ai/api`    | 27 | ✅ |
| **合計**             | **98** | ✅ **全パス** |

---

## 開発フェーズ

| フェーズ | 内容                              | ステータス |
|---------|----------------------------------|----------|
| Phase 1 | 環境構築・モノレポ初期化・共通パッケージ | ✅ 完了 |
| Phase 2 | Cloudflare インフラ設定・D1・KV セットアップ | ✅ 完了 |
| Phase 3 | バックエンド API（apps/api）実装 | ✅ 完了 |
| Phase 4 | フロントエンド（apps/web）実装 | 未着手 |
| Phase 5 | AI コンテンツ生成（静的ページ用） | 未着手 |
| Phase 6 | テスト・品質保証 | 未着手 |
| Phase 7 | 本番リリース準備 | 未着手 |

---

## 未決定事項・今後の検討項目

- [ ] 無料プランのチャット回数制限値（現在: 10回/日）
- [ ] 無料ユーザーの Question モードの扱い（固定問題プールを用意するか等）
- [ ] 有料プランの価格設定
- [ ] AWS 認定の対応試験種別（SAA 以外）
- [ ] 問題のキャッシュ・保存戦略（同じ問題を再利用するか、毎回生成か）
- [ ] ユーザーの学習履歴・正答率の記録機能（将来機能）

---

## 更新履歴

| 日付       | 内容                                                              |
|-----------|------------------------------------------------------------------|
| 2026-02-18 | 初版作成（プロジェクト概要策定）                                   |
| 2026-02-18 | アーキテクチャ確定（Cloudflare / Hono / Auth.js / Turborepo 等）  |
| 2026-02-18 | Phase 1〜3 完了・認証アーキテクチャ・API エンドポイント・テスト実績を追記 |
