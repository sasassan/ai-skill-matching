# SkillMatch — AI技能・副業マッチングプラットフォーム MVP

「作りたい」と「できる」を、AIでつなぐマーケットプレイスのMVPです。

## 技術スタック

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui (base-nova)
- Supabase (Auth, Database, Storage)
- @verdent/auth-js
- Stripe Connect（placeholder）
- OpenAI API（placeholder: lib/ai.ts）

## ローカル起動

```bash
npm install
npm run dev
```

http://localhost:3000 で確認できます。

## 主要コマンド

```bash
npm run typecheck   # TypeScript 型検査
npm run build       # 本番ビルド
```

## 画面一覧

### 共通
- `/` トップページ/LP
- `/login` ログイン/新規登録
- `/notifications` 通知一覧

### 依頼者側
- `/request/new` 依頼投稿フォーム
- `/request/[id]/spec` AI仕様書プレビュー
- `/request/[id]/matches` マッチング結果一覧
- `/craftsman/[id]` 技能者プロフィール詳細
- `/request/[id]/messages` メッセージ/見積り相談
- `/transactions` 取引管理
- `/mypage` マイページ

### 技能者側
- `/craftsman/profile` プロフィール登録/編集
- `/craftsman/jobs` 案件一覧（おすすめ）
- `/craftsman/jobs/[id]` 案件詳細・応募/提案
- `/craftsman/messages` メッセージ
- `/craftsman/orders` 受注管理
- `/craftsman/portfolio` 実績ポートフォリオ
- `/craftsman/dashboard` ダッシュボード

### 管理者
- `/admin/dashboard` 管理者ダッシュボード
- `/admin/requests/[id]` 案件詳細管理
- `/admin/users` ユーザー管理

## デモデータ

`lib/demo-data.ts` に依頼者・技能者・管理者のサンプルデータを用意しています。  
ヘッダーのユーザーアイコンまたはモバイルメニューから、依頼者/技能者/管理者のビューを切り替えられます。

## Supabase スキーマ

- `supabase/migrations/0001_initial.sql` — テーブル定義・RLSポリシー
- `supabase/seed.sql` — デモデータ投入用SQL

## AI機能

`lib/ai.ts` に以下のstub関数を配置しています。実際のAPIキーがあればOpenAI API呼び出しに置き換え可能です。

- `structureRequest(input)` — 自然言語依頼を構造化
- `generateSpecification(input)` — 仕様書テキスト生成
- `scoreMatching(spec, craftsmanIds)` — マッチングスコアリング

## Stripe Connect

`lib/stripe.ts` は連合用のplaceholderです。本番では環境変数から秘密鍵を読み込み、Connectオンボーディングフローを実装してください。
