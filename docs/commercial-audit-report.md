# 職人マッチングアプリ 商用化監査レポート

- 監査日: 2026-10-21
- 対象リポジトリ: `sasassan/ai-skill-matching`
- 監査コミット: `4e301a9` (`origin/main`)
- 結論: **デモ用プロトタイプとしては動作するが、商用運用には未対応。現状のまま決済・個人情報を扱って公開してはならない。**
- 商用化完成度: **12 / 100**

## 監査方法・制約

指定された `git fetch origin && git reset --hard origin/main && npm install` を実行し、最新 `origin/main`（`4e301a9`）に同期した。TypeScript、ESLint、本番ビルド、動的ルートを含む28 URLのHTTP応答を確認し、モバイルプリセットでホーム、依頼作成、技能者検索、管理者ユーザー一覧、ログイン画面を表示確認した。コード、DB migration/seed、環境変数名、ルート構成を静的調査した。

Supabase・OpenAI・Stripeの環境変数はすべて未設定で、Supabaseプロジェクトへの実アクセス権もない。そのため、実DBへの接続、CRUD、Auth、外部APIの実応答は確認できていない。「接続済み」「本番動作」とは評価せず、コード上の設定と実行可能なデモ動作を分けて記述する。モバイルはブラウザの固定モバイルプリセットで表示確認したが、幅360/375/412pxを個別指定した測定はできていない。

---

## 1. ディレクトリ構造と技術スタック

**現状**

- Next.js 15.5.27 App Router、React 18.3.1、TypeScript 5.9.3。
- Tailwind CSS 4.3.3、Base UI、shadcn/ui風の独自コンポーネント、class-variance-authority、Lucide icons。
- Supabase JS 2.117.2と `@verdent/auth-js`、OpenAI SDK 7.28.0、Leaflet 1.9.4、`next-themes`、Sonner。
- `app/` が28ページ、`components/` が共通UI、`lib/` がdemo data/外部連携、`supabase/` がmigration/seed、`docs/` が既存文書という構造。App Routerへの配置は概ね明快で、再利用UIも一定程度分離されている。

**問題点**

- Supabaseや業務データのrepository/service層がなく、画面から `lib/demo-data.ts` を直接参照する設計。`lib/supabase.ts` は初期化だけで、画面のDB CRUDはゼロ。
- `lib/stripe.ts` は固定falseのstub。Stripe SDKも依存に含まれない。
- `lib/ai.ts` はAI、デモfallback、マッチング処理を一か所に含み、データ供給元がデモ配列に結合している。
- Next.js配下に独自API route handler、middleware、`loading.tsx`、`error.tsx`、テスト構成が見当たらない。`npm test`相当のscriptもない。

**深刻度: Medium**

**改善提案**

- Server Component/Server Actionから使うDBサービス層と、画面用の型/DTOを分け、`demo-data`を本番ビルド・実データ経路から切り離す。
- 依頼、見積、メッセージ、取引、決済、レビューの各ユースケースを小さな業務サービスとして分離し、認可と入力検証をUIではなくサーバー側に置く。
- 環境変数の起動時検証、共通エラー表示、構造化ログ、監視を導入する。

## 2. 既存ページと実装済み機能

**現状**

28ページが定義されており、代表的な動的IDを含む28 URLがHTTP 200で応答した。画面概要:

| ルート | 画面・機能概要 |
|---|---|
| `/` | サービス紹介、依頼/技能者検索への導線、候補職人表示 |
| `/craftsmen` | 技能者検索、フリーテキスト・地域・技能・素材・評価等の絞り込み、地図 |
| `/craftsman/[id]` | 技能者プロフィール、技能・設備・実績・レビュー |
| `/login` | ログインボタンと、依頼者/技能者/管理者プレビュー切替 |
| `/request/new` | テンプレート付き複数ステップ依頼入力、AI仕様整理導線 |
| `/request/[id]/spec` | 案件仕様の表示とマッチング導線 |
| `/request/[id]/matches` | 推薦技能者一覧、スコア/プロフィール導線 |
| `/request/[id]/messages` | チャット、見積へのリンク、ファイル添付UI |
| `/request/[id]/estimates` | 見積比較画面 |
| `/request/[id]/estimates/[estimateId]` | 個別見積詳細・承認/却下UI |
| `/request/[id]/payment` | 支払い入力・確認・完了表示の画面 |
| `/request/[id]/review` | 総合/項目別評価、コメント、写真UI |
| `/craftsman/dashboard` | 技能者向け売上/案件/AI推薦ダッシュボード |
| `/craftsman/jobs` | 案件一覧・検索 |
| `/craftsman/jobs/[id]` | 案件詳細、応募・見積入力UI |
| `/craftsman/estimates/new` | 明細付き見積作成フォーム |
| `/craftsman/messages` | 技能者向けメッセージ一覧 |
| `/craftsman/orders` | 受注一覧 |
| `/craftsman/orders/[id]` | 受注詳細、製作中/納品アクションUI |
| `/craftsman/portfolio` | 実績一覧・追加UI |
| `/craftsman/profile` | プロフィール、設備、スキル、資格、写真編集UI |
| `/transactions` | 取引一覧 |
| `/transactions/[id]` | 取引詳細、タイムライン、検収/支払い導線 |
| `/mypage` | 依頼・お気に入り・アカウント概要 |
| `/notifications` | 通知一覧、既読、通知設定、AI逆マッチング表示 |
| `/admin/dashboard` | 管理用統計・案件・ユーザー概要 |
| `/admin/requests/[id]` | 案件詳細、候補割当/状態変更UI |
| `/admin/users` | ユーザー・認証状態の管理表 |

**問題点**

- HTTP 200は画面が描画できることだけを示し、業務処理・認証・DB永続化が成立する証拠ではない。全ページがdemo dataを表示する。
- 管理者、依頼者、技能者ページへのルート制限がない。管理者画面も直接表示でき、役割に応じたメニュー切替は表示制御にすぎない。
- 動的ページはデモID依存。実在する利用者/DB案件への接続や、ユーザー間でのデータ分離は未実装。

**深刻度: High**

**改善提案**

- 画面一覧を本番要件として残しつつ、画面ごとに「実DB読込」「サーバー側認可」「入力」「状態遷移」「監査ログ」の完了条件を定義する。
- 認証がない状態での保護ページへのアクセスはサーバーで拒否し、HTTP応答とユーザー体験の両方を試験する。

## 3. 未実装機能とダミー機能

**現状**

`lib/demo-data.ts` は利用者7人、技能者6人、案件3件、見積2件、メッセージ、取引、評価、通知等をモジュール内配列として保持する。多くの一覧/詳細ページ、検索、通知、プロフィール、レビュー、取引がこの値に依存する。

| 対象 | 現在動く範囲 | 本番で使えるか |
|---|---|---|
| 技能者検索・地図/絞り込み | デモプロフィールを対象にブラウザ内で検索 | **不可**。DB検索ではなくサンプル6名のみ |
| 通知既読 | React stateを変更し `localStorage` に保存 | **不可**。ブラウザ/端末単位でサーバー通知と同期しない |
| AI依頼整理 | `OPENAI_API_KEY` がある場合、OpenAIへ依頼内容を送り構造化。未設定時は固定デモ結果 | **条件付き**。AI呼出はあるが、依頼・AI出力をDB保存しない。APIキー未設定の現在環境では実AI未検証 |
| AI逆マッチング | 通知画面からサーバー側 `reverseMatch` を呼ぶ。未設定時はローカルの案件/技能者で代替 | **不可**。ソースデータがデモ、推薦結果も永続化されない |
| AI仕様書/候補推薦/機会発掘 | `lib/ai.ts` に `generateSpecification`、`scoreMatching`、`discoverOpportunities` 等の関数実装あり | **本番一連の機能ではない**。少なくともDB保存/適切な実データ供給がなく、画面からの利用も限定的 |
| 新規依頼 | フォーム入力とAI呼出後、画面に「保存機能は準備中。入力は送信されていません」と表示 | **不可**。保存・公開・候補生成なし |
| 応募・見積 | UIで入力、配列へ追加またはalert/toastを表示する実装 | **不可**。他ユーザーには伝わらず、リロードで消失 |
| チャット/添付 | メッセージを画面stateに追加。添付は `URL.createObjectURL` の一時URL | **不可**。DB/Storage送信なし。5秒ポーリング表示もDB通信ではない |
| プロフィール/ポートフォリオ | フォーム、画像プレビュー、完了度表示 | **不可**。保存操作は「保存しました（デモ）」alertのみ。画像はblob URL |
| レビュー | 入力後、クライアント配列に追加して完了表示 | **不可**。評価先は固定ユーザーID、DB保存なし |
| 決済/エスクロー | ダミーカード欄、待機後にメモリ配列へ決済済み状態を追加 | **不可・実決済なし**。Stripe未接続なのに成功/保留メッセージを出す |
| 管理者割当/認証/状態変更 | 画面上の操作UI | **不可**。DB更新/API実行の経路なし |
| メール/プッシュ通知 | 設定スイッチ、ブラウザ通知許可を要求 | **不可**。メール送信/Push配信サービスなし。画面にもstub表示あり |

**問題点**

- 表示stateの変更が保存・通知・決済の成功と誤認される箇所が複数ある。特に決済完了とエスクロー保留の表示は金銭実績を偽って見せる。
- 同一ページ間の配列更新はプロセス内状態に過ぎず、サーバー再起動、別セッション、別利用者へ反映されない。
- 依頼フォームはAI出力を受け取っても保存せず、仕様書作成UIの完了と案件公開がつながっていない。

**深刻度: Critical**

**改善提案**

- 本番機能が未実装の画面は「デモ」と明示するか、デモ環境に隔離し、成功通知/決済完了を出さない。
- 依頼→AI草案→利用者確認→案件保存→候補作成→見積承認→決済webhook→納品/検収→精算の状態遷移をサーバー側トランザクションとして実装する。
- 全DB書込みが成功してから画面成功状態へ進み、再読み込み後/別ユーザーからも確認できる受入試験を作る。

## 4. データベース構造とデータ永続化

**現状**

`supabase/migrations/0001_initial.sql` に16テーブル（profiles、craftsman_profiles、skills、craftsman_skills、requests、request_images、specifications、matches、applications、messages、transactions、reviews、notifications、admin_notes、identity_verifications、portfolio_items）とRLS有効化、いくつかのポリシー/updated_atトリガーがある。`supabase/seed.sql` は技能、プロフィール、案件、仕様、メッセージ、取引等のサンプル挿入を意図している。

**問題点**

- アプリコード中、`createClient` を呼ぶのは `lib/supabase.ts` の初期化のみ。`supabase.from(...)` 等のテーブルCRUD呼び出しはゼロ。Authコンポーネント以外でSupabaseを使った業務フローもない。実環境キーが未設定のため実接続試験は不能であり、現在の商用UIがDBを使っていないことはコード上確認できる。
- demo modelとDB schemaの差が大きい。DBに見積テーブル、決済/escrow、取引イベント/履歴、通知種別、メッセージ添付/既読情報がない。`craftsman_profiles` に住所都道府県、座標、対応エリア、素材、資格、経験年数が不足。`reviews` は総合rating/commentだけで、画面の項目別評価/写真を保存できない。`transactions` に依頼者ID/見積IDもなく、アプリの取引モデルと一致しない。
- seedは `profiles.id` が `auth.users(id)` を参照するのに、仮UUIDのAuthユーザー作成を行わないため、そのままではプロフィールINSERTが外部キー違反になる。さらに `identity_verifications` には `user_id` のUNIQUE制約がないのに `ON CONFLICT (user_id)` を使うため、該当seed句も制約がなければエラーとなる。
- `identity_verifications.user_id`、`craftsman_profiles.user_id` 等の一意性制約不足により、再投入時の重複を防げないseed箇所がある。
- DB migrationは単一の初期SQLだけで、アプリが要求する全業務モデル/制約/索引/状態遷移を表現できていない。

**深刻度: Critical**

**改善提案**

- Authユーザー作成→profile作成をトリガーまたは信頼できるサーバー処理で行い、Auth IDの紐付け、重複制約、seed用テストユーザー方式を修正する。
- migrationを追加し、見積明細、添付、決済ID/精算状態、取引イベント、レビュー内訳、通知設定など、実際の業務フローに必要なテーブルと制約をモデル化する。
- staging Supabaseでmigration/seedのクリーン適用、Auth、各ロールのCRUD/RLSテストを行う。第三者のデータアクセス拒否も検証する。

## 5. 認証・認可・ユーザー権限

**現状**

`lib/auth.ts` は `@verdent/auth-js` にSupabase clientとOAuth URLを渡し、ログインボタンはサインインモーダルを開く。Supabase clientは `persistSession`、token refresh、URL session検出を有効化している。しかし `SessionProvider` はデモ配列の固定利用者とローカルReact stateだけでロールを決め、ログイン結果/session/user IDを読まない。ログアウトもロールを依頼者に戻すだけ。

**問題点**

- ログイン成功後の利用者同期、ログアウト処理、セッション切れ/refresh反映、未認証時の画面保護が未実装。誰でも管理者プレビューを選択でき、管理画面も直接アクセス可能。
- `profiles_select_own_or_public` の `USING (auth.uid() = id OR true)` は全プロフィールを無条件公開する。
- `profiles_update_own` は行の本人性しか検証せずrole更新を禁止していない。適用後のSupabase APIでユーザー自身が `role='admin'` に更新できる権限昇格リスクがある。`verified`等の信頼フィールドも同様に保護されていない。
- 案件INSERTポリシーはログイン者がrequesterであることだけ確認し、`requester_id = auth.uid()` を検証しない。自分以外の依頼者IDを指定できる。
- メッセージINSERTはsender_id一致だけを確認し、案件参加者かを確認しない。本人確認INSERTもuser_idのみ確認し、statusをpending/approvedに限定しない。本人がapprovedを指定できる。
- craftsman profileのupdateは所有者がrating/review_count/completed_ordersなどの信頼値まで更新できる。review insertはreviewer_idのみを確認し、取引参加者/完了状態/重複レビューを検証しない。
- `applications`、`messages`、`transactions`、`reviews`、`notifications`、`identity_verifications`等の一部操作ポリシーが不足し、デフォルト拒否される操作と、逆に不十分な挿入条件が混在する。

**深刻度: Critical**

**改善提案**

- Authユーザーからsessionを検証し、server-side guard/middlewareとすべてのサーバー処理で利用者ID/role/対象レコードを認可する。UIメニュー非表示は認可として扱わない。
- role、verified、rating、review_count、completed_orders等は管理者/信頼済みserver-only処理だけが変更可能にし、自己昇格不能なDB制約・トリガー・カラム単位制御を追加する。
- RLSを「本人」「案件参加者」「承認済み管理者」「公開情報」に分解し、`USING`と`WITH CHECK`の両方で操作後の行所有者/対象関係を検証する。全ロール×全テーブルの否定テストを追加する。
- ログイン/ログアウト/期限切れ/session refresh/OAuth callbackを実Authアカウントで検証する。

## 6. API、外部サービスとの連携

**現状**

- OpenAI: `lib/ai.ts` はサーバー専用モジュール（`"use server"`）で `OPENAI_API_KEY` を読む。`gpt-4o-mini`、JSON mode、出力の型寄せ/スコアclamp、JSON parse fallbackがある。依頼フォームの `structureRequest` と通知画面の `reverseMatch` から呼ばれる経路がある。キーがない場合はデモ関数へフォールバックする。
- Supabase: client/Authの初期化コードはあるが、アプリのデータCRUD呼び出しはない。
- Stripe Connect: `stripeConnectEnabled = false` 固定、オンボーディングURLは `/mypage` を返すだけ。SDK、checkout、Connect account、webhook、精算実装がない。
- 独自 `app/api/**/route.ts` はない。AIはNext Server Action経由。

**問題点**

- AI出力はJSON shapeを最低限整えるだけで、入力/出力サイズ制限、厳密schema検証、rate limit、timeout/retry、監査ログ、費用上限、ユーザー単位認可が見当たらない。依頼自由記述を外部LLMに送る際の個人情報/秘密情報の扱い、保存・同意表示も不十分。
- 予算/納期/技能/素材の推定はモデルの推測で、根拠/確度/人による確定がない。仕様書や適合スコアを確定情報として提示すると、誤見積もり/安全上の誤解につながる。
- Stripeは機能未実装であり、カードフォームはStripe Elements等でなくカード情報を処理していない。金銭処理/エスクロー/本人確認/出金は一切実行されない。
- Supabase/Auth/OpenAIとも現在の環境にはcredentialがなく、実API応答を確認できていない。

**深刻度: Critical**

**改善提案**

- AI server actionで認証、入力サイズ制限、Zod等のschema検証、rate limit、明確なtimeout/エラー分類、秘密情報/PIIの最小化を行う。数値や安全関連の生成結果は未確認の草案として表示し、人の承認後に保存する。
- 決済はマーケットプレイス対応PSPの正式審査を通し、hosted checkout/Elements、Connect onboarding、署名検証付きwebhook、idempotency key、返金/紛争/精算台帳を実装。カード番号/CVCを自社state/サーバーで扱わない。
- DB書込みと支払い状態変更はブラウザから直接信頼せず、認可されたサーバー処理と検証済みPSPイベントでのみ確定する。

## 7. セキュリティ上の脆弱性

**現状**

- `.env.example` はSupabase publishable key、OpenAI secret key、Stripe secret key等の設定名を分けて記載。OpenAI keyはサーバー側 `process.env` から読む。ソース中に実際の秘密値は見つからず、`dangerouslySetInnerHTML`も見つからない。
- Reactの通常のテキスト描画が主体で、主要なXSSリスクを下げる設計。ただし入力検証と権限制御は不十分。

**問題点**

- 5・4項のRLSが重大な情報漏えい/権限昇格リスク。Supabase publishable keyは公開前提なので、RLSを強固にしなければならない。
- 環境変数がなくてもSupabase URL/keyをプレースホルダーに置き換えてアプリ初期化を通す。未設定を起動時に検知して停止しないため、本番で接続先誤りが分かりにくい。
- 依頼/見積/レビュー/AI入力にサーバー側の厳密なvalidation/authorizationなし。ファイル添付はブラウザの `accept` だけで、サイズ・MIME/内容・枚数・権限検査なし。object URLを使い、永続アップロードは未実装。
- カード風フォームはデータを送らずStripeも無効だが、支払い完了と表示する。利用者の誤認を誘う重大な金融・信頼上の問題。
- `Content-Security-Policy`、セキュリティヘッダー、API abuse対策/rate limiting、監査ログの設定が確認できない。
- XSSについては現時点で危険なHTML挿入APIの利用を確認しなかったが、将来Markdown/HTML表示を入れる場合はsanitizationが必要。CSRFはNext Server Actionsの標準検証があるとしても、権限/認証の代替にはならず、独自API/Webhookの保護は別途必要。

**深刻度: Critical**

**改善提案**

- RLS修正をリリース前のブロッカーとし、匿名/認証済み全ロールの越権テストを実行する。service-role keyはクライアントへ絶対に渡さない。
- server-side schema validation、ユーザー単位rate limit、ファイル許可リスト/サイズ上限/ウイルス検査、Storage private bucketと署名URL、CSP/セキュリティヘッダー、secret scanningを設定する。
- 実際の決済完了をPSP検証イベント以外から生成できない状態遷移にし、デモ表示と本番支払い導線を明確に分離する。

## 8. レスポンシブデザインと操作性

**現状**

- モバイルプリセットでホーム、依頼作成、技能者検索、ログイン、管理ユーザー一覧を表示し、主要領域は縦一列、カードは画面内に収まる。ヘッダーはモバイルメニューへ切り替わる。
- 多くのフォーム/カードにTailwindの`sm:`/`md:`ブレークポイントがあり、タッチ向け `touch-action: manipulation` が共通CSSにある。

**問題点**

- 依頼作成、検索条件等は狭幅で縦長。管理者表は `min-width:640px` と横スクロールで列を表示するため、360〜412pxでは横方向操作が必要。幅360/375/412pxそれぞれでレイアウト・横スクロール・フォーム入力を個別測定していない。
- 入力欄のタップ領域は一定だが、共通 `.min-touch-target` は定義だけで全操作への適用は確認できない。星評価、削除、アイコンだけの操作等は説明/ラベルが不十分。
- 依頼画像・プロフィール/実績画像・チャット添付などのUIはあるが、実アップロードも、失敗時の再試行もない。

**深刻度: Medium**

**改善提案**

- 360/375/412pxを含む実機相当のブラウザ試験を自動化し、横溢れ、テーブル操作、モーダル、ソフトキーボード表示、長文折返しを検査する。
- 重要操作のタップ領域を44×44px以上に統一し、アイコンボタンにaccessible name、評価ボタンに「星1」等の読み上げラベルを付ける。
- 表形式情報は狭幅でカード化または必要列のみ表示し、横スクロール依存を減らす。

## 9. SEO、表示速度、アクセシビリティ

**現状**

- `app/layout.tsx` に共通title/description/keywords、metadataBase、OGP画像、Twitter large-image、`lang="ja"` を設定。`public/ogp.png` とfaviconがある。
- `next/image` のremote patternはUnsplash/Dicebear/OpenStreetMap向けに設定。主要なフォームラベル、ページ見出し、通知ボタンラベルなどはある。
- 本番ビルドの共通First Load JSは103kB。ページは静的/動的レンダリングとして正常に生成された。

**問題点**

- OGP画像が約1.2MB。`<img>`の直接使用が4箇所あり、ESLintも4警告（技能者詳細2、ポートフォリオ1、レビュー写真1）。`next/image`最適化/サイズ指定は一部未使用。
- 個別ページのdescription/OGP/canonical、robots.txt、sitemap.xml、構造化データは確認できない。検索結果にデモプロフィール/デモ取引が露出するのも避ける必要がある。
- First Load JSは最大約210kB（login）、/craftsmenが約186kB。直ちに巨大ではないが、クライアントコンポーネントが多く、Leaflet等を含む画面単位の分割/実データでのCore Web Vitals計測は未確認。
- 見出し/ラベルは一部ある一方、icon-only buttons、星評価、画像入力、プロフィールのクリック可能な`div`、表の横スクロールなどにキーボード/スクリーンリーダー上の課題が残る。コントラストやフォーカス順の監査も未実施。

**深刻度: Medium**

**改善提案**

- OGP画像を圧縮・適正寸法にし、主要画像を`next/image`に移行して寸法/priority/loadingを適切に指定する。
- 公開対象ページの固有metadata、canonical、robots/sitemap、実データのみの構造化情報を整備する。
- WCAG 2.2 AAを目標にキーボード全操作、フォーカス可視化、読み上げ名、色コントラスト、エラーの関連付けをチェックし、Lighthouse/Web Vitalsを実運用想定で測る。

## 10. エラーハンドリング、テスト、保守性

**現状**

- TypeScript strictが有効。`npm run typecheck`、`npm run lint`、`npm run build` scriptがある。
- 依頼フォームのAI呼出にはtry/catchがあり、JSON parse helperも例外を捕捉する。通知画面の推薦呼出にもcatchがある。Not Foundページと一部`notFound()`処理がある。
- build/typecheckは成功。lintは0 errorだが、`<img>`使用に関するwarningが4件。既存テストコードとtest scriptは見つからない。

**問題点**

- アプリ共通のerror boundary (`error.tsx`)、loading状態、監視/ログ、外部APIのtimeout/retry/分類、DB失敗時の復旧/重複送信防止がない。
- 多くのボタンはデモ状態変更のみで、失敗経路/永続化がないため、現状では業務エラー処理も検証できない。入力制約は一部HTML required/min程度で、サーバー検証テストがない。
- `demo-data.ts`と各ページを密結合し、画面stateの直接変更や固定IDを多用。変更時にフロー横断で一貫性を保ちにくい。
- 自動テストなし。buildのroute generationはページ生成確認であって、権限・CRUD・支払い・ユーザーフローの試験ではない。
- 初回にtypecheckとbuildを並列実行した際、buildが`.next/types`を書き換えるタイミングと競合してTS6053が発生した。build完了後の単独再実行は成功。独立並列で同一 `.next` を触るCI/開発実行は避ける必要がある。

**深刻度: High**

**改善提案**

- Unit/integration/e2eを追加し、認証、各ロールのRLS拒否、依頼保存、見積承認、状態遷移、二重webhook、返金、再読み込み後の永続化を最低限カバーする。
- `error.tsx`/`loading.tsx`と利用者向け再試行UI、サーバーログ/例外監視を整備する。失敗時に成功トースト/完了状態にならないことを確認する。
- フォームを共有schemaでサーバー検証し、demo dataへの直接書込みをDBサービスへ段階的に置換する。

---

## 商用化完成度スコア: 12 / 100

| 評価領域 | 点数 | 根拠 |
|---|---:|---|
| UI/情報設計・操作可能な画面 | 6/20 | 28画面、検索/フォーム/一覧UIがあり、mobile presetと全ルートの表示は確認できる |
| 実データ永続化・業務状態 | 0/25 | DB CRUDなし。依頼/メッセージ/見積/プロフィール/評価が永続化されない |
| 認証・認可・データ保護 | 0/20 | Auth sessionが画面stateに反映されず、ロール切替自由。RLSに権限昇格/不正アクセス条件 |
| 決済・外部サービス | 1/20 | 条件付きOpenAI呼出コードはあるが未設定。Stripeはstub、実決済なし |
| 品質・運用準備 | 5/15 | TypeScript/build/lintは概ね通るが、テスト・監視・障害対応がない |
| **合計** | **12/100** | **画面プロトタイプとしての完成度と、商用サービスの準備度は別評価** |

## Critical / Highの問題一覧

### Critical

1. ログイン/sessionとユーザー状態を連携せず、誰でも依頼者/技能者/管理者になりすませる。管理画面を含むルート保護もない。
2. RLSのプロフィール全公開条件、自己role変更可能なupdate policy、requester ID偽装、参加関係を検証しないmessage insert、本人確認status偽装などにより、DBを有効化した場合に情報漏えい/権限昇格/偽装データ作成が可能。
3. Supabase業務CRUDがゼロで、業務データ全体がdemo配列。複数ユーザー間の実取引を成立させられない。
4. Stripe Connect/実決済がなく、支払いが完了したかのようにUI表示する。資金の受領・保留・精算・返金は実行されない。
5. DB schema/seedの前提が噛み合わず、seedはAuth user外部キーとuser_id conflict constraintの問題でそのままでは適用できない。

### High

1. 新規依頼はAI整理後に保存しない。他の応募、見積、取引、レビュー、管理操作も本番データを更新しない。
2. AI入力/ファイルに十分なサーバー側制限・認可・サイズ検証がなく、AI推定値の人間確認/安全審査が不十分。
3. 各ページが固定デモIDと `demo-data.ts` に依存し、利用者データの混在や誤操作時の根拠のない成功表示が起きる。
4. エラー境界/運用ログ/テストがなく、主要な業務・セキュリティ不具合を検知・再現できない。

## 改善の優先順位

1. **公開/決済を止める**: Stripe未接続中の「支払い完了」「エスクロー」表現を撤去し、全デモデータを明示的なデモ環境に閉じ込める。
2. **認証と権限を作り直す**: 実Auth session、サーバー側route/action guard、roleの自己変更禁止、RLSを修正。匿名/依頼者/技能者/管理者のアクセス拒否テストを通す。
3. **DB設計とmigration/seedを直す**: アプリ業務モデルとのギャップを埋め、Auth user/profile作成方式と一意制約を確定。stagingで空状態から再現可能に適用する。
4. **業務フローを永続化する**: 依頼投稿/AI仕様確認/保存/応募/見積/メッセージ/取引/検収/レビューをサーバー検証付きで実装。成功表示はDB commit後に限る。
5. **決済を適法・安全に実装する**: マーケットプレイスPSPの審査、本人確認、決済/返金/精算/webhook/二重処理対策を整備し、法務・資金フローをレビューする。
6. **セキュリティと品質ゲートを追加する**: validation、rate limiting、アップロード安全策、監査ログ、エラー監視、E2E/RLSテストを追加し、CIでbuild/lint/typecheck/testsを実行する。
7. **商用UIの最終検証**: 360/375/412px実測、アクセシビリティ、metadata/SEO、OGP圧縮、画像最適化、Core Web Vitalsを確認する。

## 検証結果

- `git fetch origin && git reset --hard origin/main`: 成功。`origin/main` の `4e301a9` に同期。開始時点でローカル固有コミットがあったため、指示どおりリセットして最新mainを優先した。
- `npm install`: 成功（up to date）。`.npmrc` の未知の `store-dir` 警告、およびinstall script未承認の `unrs-resolver` 警告あり。
- `npm run build`: 成功。28ページを含む本番build完了。`<img>`最適化警告4件。
- `npm run lint`: 成功、0 errors / 4 warnings（未最適化`<img>`）。
- `npm run typecheck`: build完了後に単独再実行して成功。buildと並列に実行した初回は`.next/types`生成と競合してTS6053が出た。
- HTTP smoke check: 代表的な動的IDを用いた28 URL中28 URLが200。
- モバイル: 固定mobile presetで主要5画面を視認。個別幅360/375/412pxは未計測。管理者表は横スクロール領域を使用。
- Supabase CRUD/Auth、OpenAI実応答、Stripe決済/webhook: credential/外部環境がないため未検証。ソース上もSupabaseの業務CRUDとStripe決済処理は存在しない。
