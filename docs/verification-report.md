# AI技能・副業マッチングプラットフォーム MVP 検証レポート

- 検証日: 2026-10-04
- プロジェクト: `/Users/sasakiryoichi/.verdent/verdent-projects/ai-skill-matching/`
- 技術スタック: Next.js 15.5.27 / TypeScript 5 / Tailwind CSS v4 / shadcn/ui (base-nova) / Supabase (placeholder) / @verdent/auth-js

## 1. ビルド・起動確認

| 項目 | 結果 |
| --- | --- |
| `npm run typecheck` | 成功（0 エラー） |
| `npm run build` | 成功（18/18 ページ生成） |
| `npm run dev` | 成功（localhost:3000 で起動、全ルート 200） |

## 2. 全画面遷移テスト

以下の 20 ルートすべてが HTTP 200 で表示され、エラー画面・「見つかりません」表示がないことを確認した。

| ルート | 種別 | 結果 |
| --- | --- | --- |
| `/` (LP) | static | 200 |
| `/login` | static | 200 |
| `/request/new` | static | 200 |
| `/request/[id]/spec` | dynamic | 200 |
| `/request/[id]/matches` | dynamic | 200 |
| `/request/[id]/messages` | dynamic | 200 |
| `/craftsman/[id]` | dynamic | 200 |
| `/craftsman/dashboard` | static | 200 |
| `/craftsman/jobs` | static | 200 |
| `/craftsman/jobs/[id]` | dynamic | 200 |
| `/craftsman/messages` | static | 200 |
| `/craftsman/orders` | static | 200 |
| `/craftsman/portfolio` | static | 200 |
| `/craftsman/profile` | static | 200 |
| `/mypage` | static | 200 |
| `/notifications` | static | 200 |
| `/transactions` | static | 200 |
| `/admin/dashboard` | static | 200 |
| `/admin/requests/[id]` | dynamic | 200 |
| `/admin/users` | static | 200 |

デモデータの ID は `r1`/`r2`（依頼）、`cp1`/`cp2`（技能者）であるため、動的ルートの検証には正しい ID を使用した。

## 3. 主要フロー確認

### 依頼者フロー
- 依頼投稿 (`/request/new`) → `structureRequest` stub 呼び出し後 `/request/r1/spec` へ遷移
- AI仕様書 (`/request/r1/spec`) → 編集可能なフォーム + 「マッチング候補を見る」導線
- マッチング (`/request/r1/matches`) → スコア順の候補一覧 + プロフィール/相談導線
- メッセージ (`/request/r2/messages`) → 見積もり表示 + チャット送信（デモ）
- 取引管理 (`/transactions`) → ステータス別アクション

### 技能者フロー
- ダッシュボード (`/craftsman/dashboard`) → 売上/評価/おすすめ案件
- 案件一覧 (`/craftsman/jobs`) → 応募可能な案件
- 案件詳細 (`/craftsman/jobs/r1`) → AI仕様書 + 応募・見積もりフォーム
- 受注管理 (`/craftsman/orders`) → 受注〜納品の進捗ステッパー
- ポートフォリオ / プロフィール → 実績・設備表示

### 管理者フロー
- ダッシュボード (`/admin/dashboard`) → 統計カード + 依頼/ユーザー/マッチング一覧
- 案件管理 (`/admin/requests/r1`) → 依頼内容 + 候補一覧 + 手動アサイン
- ユーザー管理 (`/admin/users`) → ロール/認証状態の管理 UI

すべての主要導線が正しい ID でリンクされており、デモ操作が成立する。

## 4. コード品質

- TypeScript: `tsc --noEmit` 0 エラー
- ESLint: 0 エラー（2 警告のみ、下記参照）
- デモデータ (`lib/demo-data.ts`): 氏名・技能・案件・メッセージすべて日本語化済み
- UI テキスト: 全ページ日本語（TODO / FIXME / Lorem ipsum / 英文プレースホルダーなし）

## 5. 発見・修正した問題

### 5-1. ESLint 設定の不具合（重大）
`eslint.config.mjs` が `...nextVitals` / `...nextTs` とスプレッドしていたが、`eslint-config-next` 15.5.27 の `core-web-vitals.js` / `typescript.js` は配列ではなくオブジェクト（`{ extends: [...] }`）を export するため、`next build` 時に `ESLint: nextVitals is not iterable` が発生していた。

**修正**: `FlatCompat` ベースの正しいフラット設定へ書き換え。

### 5-2. クライアントページの SSR フラッシュ（中程度）
Next.js 15 では `params` が Promise で渡される。以下の 3 ページは React 18.3（`use` フック非対応）のため `useEffect` で Promise を解決しており、SSR 時に `id = null` となって「案件が見つかりません」等が一瞬表示され、その後 hydration で内容が差し替わる問題があった。

- `app/craftsman/jobs/[id]/page.tsx`
- `app/request/[id]/messages/page.tsx`
- `app/admin/requests/[id]/page.tsx`

**修正**: サーバーコンポーネント（`await params`）で `id` を解決し、クライアントコンポーネントに `id` prop として渡す構成に分離。さらにメッセージ一覧は `useState` の初期値でデータを読み込むよう変更し、SSR から正しい内容を描画するようにした。

### 5-3. `<img>` 使用警告（軽微・対応見送り）
`app/craftsman/[id]/page.tsx` と `app/craftsman/portfolio/page.tsx` で `next/image` ではなく `<img>` を使用しており ESLint 警告が出る。外部（Unsplash）画像のため、リモート画像最適化設定が必要になることから今回の MVP では見送り。

## 6. 総評

ビルド・起動・全 20 ルートの表示・主要 3 フローをすべて確認し、重大な不具合（ESLint 設定）と SSR フラッシュ問題を修正した。修正後は `typecheck`・`build`・全ルート 200 を再確認済み。MVP として問題なく動作する状態である。
