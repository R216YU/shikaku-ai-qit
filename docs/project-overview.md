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
| 認証              | Auth.js v5            | Edge Runtime 対応、セッション管理は Cloudflare D1 |
| 決済              | Stripe                | サブスクリプション管理、webhook は Hono で受け取る |
| DB                | Cloudflare D1         | SQLite at Edge（ユーザー・プラン・利用回数管理）  |
| キャッシュ・制限   | Cloudflare KV         | レート制限カウンター                             |
| バリデーション     | Zod                   | packages/schema で定義、API・クライアント共用     |
| モノレポ管理       | Turborepo + pnpm      | ワークスペースによるパッケージ管理               |

---

## インフラ構成

```
Cloudflare
├── Pages   → apps/web    （Next.js）
└── Workers → apps/api    （Hono）
              ├── D1      （DB：ユーザー・プラン・利用回数・セッション）
              └── KV      （レート制限カウンター）

外部サービス
├── Gemini API  ← apps/api から呼び出す
└── Stripe      ← apps/api の webhook エンドポイントで受け取る
```

---

## モノレポ構成

```
shikaku-ai/                          ← モノレポルート
├── apps/
│   ├── api/                         ← Hono（Cloudflare Workers）
│   │   └── src/
│   │       ├── routes/              ← chat / questions / auth / stripe-webhook
│   │       └── index.ts             ← AppType を export（Hono RPC 用）
│   ├── web/                         ← Next.js（Cloudflare Pages）
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
│   ├── core/                        ← 共通ビジネスロジック・型定義
│   ├── gemini/                      ← Gemini API クライアント（pure TS）
│   ├── schema/                      ← Zod スキーマ（API・バリデーション共用）
│   └── config/                      ← 資格リスト・難易度・定数定義
├── docs/                            ← プロジェクトドキュメント
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

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
| Chat モード                  | ○（回数制限あり）   | ○（無制限）         |
| Question モード（AI 生成）   | ✕                  | ○（毎回 AI 生成）   |
| Question モード（固定問題）  | 検討中             | ○                  |

---

## 開発フェーズ

| フェーズ | 内容                              |
|---------|----------------------------------|
| Phase 1 | Web 版の開発・リリース            |
| Phase 2 | モバイルアプリ（Expo）の開発       |

---

## 未決定事項・今後の検討項目

- [ ] 無料プランのチャット回数制限値
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
