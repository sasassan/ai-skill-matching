# SkillMatch — AI技能・副業マッチングプラットフォーム

「作りたい」と「できる」をAIでつなぐ技能マッチングプラットフォームです。依頼者が自然言語で投稿した案件をAIが構造化し、技能者のポートフォリオとマッチングして最適なパートナーと出会えるマーケットプレイスのMVP実装です。

## プロジェクト概要

- **依頼者**: 自然言語で「作りたいもの」を投稿し、AIが仕様書に整理。マッチング結果から技能者を選んで相談・発注できます。
- **技能者**: プロフィール・ポートフォリオを登録し、AIおすすめ案件に応募・提案できます。
- **管理者**: ユーザー・案件・取引を一元管理できるダッシュボードを用意。
- **AI機能**: OpenAI APIによる依頼構造化、仕様書生成、技能者マッチング（`OPENAI_API_KEY` とSupabase認証が必要）。

## 技術スタック

| 分野 | 技術 |
|------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| UIコンポーネント | shadcn/ui (base-nova) |
| 認証・データベース | Supabase Auth / Database / RLS |
| 決済（未接続） | Stripe Connect |
| AI | OpenAI API（`OPENAI_API_KEY` 設定時） |

## セットアップ手順

### 1. リポジトリをクローン

```bash
git clone https://github.com/sasakiryoichi/ai-skill-matching.git
cd ai-skill-matching
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 環境変数を設定

`.env.example` をコピーして `.env.local` を作成し、値を埋めます。

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Supabaseプロジェクトの作成方法や匿名キーの取得については、[Supabase公式ドキュメント](https://supabase.com/docs)を参照してください。

### 4. Supabaseスキーマを適用

`supabase/migrations/0001_initial.sql` と `supabase/migrations/0002_commercial_security.sql` を順番にSupabase SQL Editorで実行し、その後で `supabase/seed.sql` を適用してください。seedには公開用の技能マスターのみが含まれ、Authユーザーや管理者を作成しません。Authユーザー作成時にプロフィールが自動作成されます。

### 5. 開発サーバーを起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが確認できます。

## 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | SupabaseプロジェクトのURL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabaseの匿名（publishable）キー |
| `STRIPE_SECRET_KEY` | ❌ | Stripe Connect 秘密鍵 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ❌ | Stripe 公開可能キー |
| `OPENAI_API_KEY` | ❌ | OpenAI API キー |

## 主要コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run start        # 本番サーバー起動
npm run lint         # ESLint
npm run typecheck    # TypeScript 型検査
```

## 画面構成

### 共通
- `/` トップページ / LP
- `/login` ログイン / 新規登録
- `/notifications` 通知一覧

### 依頼者側
- `/request/new` 依頼投稿フォーム
- `/request/[id]/spec` AI仕様書プレビュー
- `/request/[id]/matches` マッチング結果一覧
- `/craftsman/[id]` 技能者プロフィール詳細
- `/request/[id]/messages` メッセージ / 見積り相談
- `/transactions` 取引管理
- `/mypage` マイページ

### 技能者側
- `/craftsman/profile` プロフィール登録 / 編集
- `/craftsman/jobs` 案件一覧（おすすめ）
- `/craftsman/jobs/[id]` 案件詳細・応募 / 提案
- `/craftsman/messages` メッセージ
- `/craftsman/orders` 受注管理
- `/craftsman/portfolio` 実績ポートフォリオ
- `/craftsman/dashboard` ダッシュボード

### 管理者
- `/admin/dashboard` 管理者ダッシュボード
- `/admin/requests/[id]` 案件詳細管理
- `/admin/users` ユーザー管理

## AI機能

`lib/ai.ts` のAI機能は `OPENAI_API_KEY` が設定され、Supabase Authセッションが有効な場合に利用できます。キー未設定時は固定デモ結果を返さず、設定不足として扱います。

## 決済

`lib/stripe.ts` はStripe Connect未接続の状態です。カード情報や支払い処理は受け付けず、画面に決済準備中と表示します。

## 認証・データ

ログインと新規登録はSupabase Authのメールアドレス＋パスワードを使用します。登録時のアカウント種別は依頼者・技能者に限られ、管理者権限はDB側で管理します。画面データはSupabaseから取得し、アクセス制御はRLSでも強制されます。

## コントリビューション方法

1. このリポジトリをフォークしてください。
2. 機能ブランチを作成してください：`git checkout -b feat/your-feature`
3. 変更をコミットしてください：`git commit -m "feat: add your feature"`
4. ブランチをプッシュしてください：`git push origin feat/your-feature`
5. Pull Requestを作成してください。

バグ報告や機能提案は Issue でお気軽にどうぞ。

## Vercel へのデプロイ

### 1. Vercel プロジェクトを作成

```bash
npm i -g vercel
vercel login
vercel
```

初回は対話形式でプロジェクトを作成します。以降は同じディレクトリで `vercel --prod` で本番デプロイできます。

### 2. 環境変数を設定

Vercel Dashboard の **Settings > Environment Variables** から以下を登録してください。

| 変数名 | 値 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 匿名キー |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` |
| `OPENAI_API_KEY` | OpenAI API キー（AI機能を有効化する場合） |
| `STRIPE_SECRET_KEY` | Stripe 秘密鍵（決済を有効化する場合） |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公開可能キー |

`vercel.json` にビルド設定が含まれているため、フレームワークは自動的に Next.js として認識されます。

### 3. 本番デプロイ

```bash
vercel --prod
```

デプロイが完了すると、Vercel Dashboard またはターミナル出力からライブ URL を確認できます。

## ライセンス

[MIT](LICENSE)

## 作者

- [@sasakiryoichi](https://github.com/sasakiryoichi)
