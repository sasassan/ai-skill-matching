# SkillMatch — AI技能・副業マッチングプラットフォーム

「作りたい」と「できる」をAIでつなぐ技能マッチングプラットフォームです。依頼者が自然言語で投稿した案件をAIが構造化し、技能者のポートフォリオとマッチングして最適なパートナーと出会えるマーケットプレイスのMVP実装です。

## プロジェクト概要

- **依頼者**: 自然言語で「作りたいもの」を投稿し、AIが仕様書に整理。マッチング結果から技能者を選んで相談・発注できます。
- **技能者**: プロフィール・ポートフォリオを登録し、AIおすすめ案件に応募・提案できます。
- **管理者**: ユーザー・案件・取引を一元管理できるダッシュボードを用意。
- **AI機能**: 依頼の構造化、仕様書生成、技能者とのマッチングスコアリングのstubを実装。OpenAI API等に差し替え可能です。

## 技術スタック

| 分野 | 技術 |
|------|------|
| フレームワーク | Next.js 15 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| UIコンポーネント | shadcn/ui (base-nova) |
| 認証・データベース | Supabase (Auth, Database, Storage) |
| 認証ラッパー | @verdent/auth-js |
| 決済（予定） | Stripe Connect |
| AI（予定） | OpenAI API |

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

`supabase/migrations/0001_initial.sql` をSupabase SQL Editorで実行し、テーブル・RLSポリシーを作成してください。必要に応じて `supabase/seed.sql` でデモデータを投入できます。

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

`lib/ai.ts` に以下のstub関数を配置しています。実際のAPIキーがあればOpenAI API等の呼び出しに置き換え可能です。

- `structureRequest(input)` — 自然言語依頼を構造化
- `generateSpecification(input)` — 仕様書テキスト生成
- `scoreMatching(spec, craftsmanIds)` — マッチングスコアリング

## 決済

`lib/stripe.ts` はStripe Connect連携のplaceholderです。本番では環境変数から秘密鍵を読み込み、Connectオンボーディングフローを実装してください。

## デモデータ

`lib/demo-data.ts` に依頼者・技能者・管理者のサンプルデータを用意しています。ヘッダーのユーザーアイコンまたはモバイルメニューから、依頼者 / 技能者 / 管理者のビューを切り替えられます。

## コントリビューション方法

1. このリポジトリをフォークしてください。
2. 機能ブランチを作成してください：`git checkout -b feat/your-feature`
3. 変更をコミットしてください：`git commit -m "feat: add your feature"`
4. ブランチをプッシュしてください：`git push origin feat/your-feature`
5. Pull Requestを作成してください。

バグ報告や機能提案は Issue でお気軽にどうぞ。

## ライセンス

[MIT](LICENSE)

## 作者

- [@sasakiryoichi](https://github.com/sasakiryoichi)
