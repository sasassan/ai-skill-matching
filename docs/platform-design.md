# スキルマッチングプラットフォーム設計書

- 作成日: 2026-11-09
- ブランチ: `feature/skill-platform-pivot`
- ステータス: ドラフト（Step 1-1 成果物）

## 0. 本書の目的

既存の「職人マッチングアプリ」（sasassan/ai-skill-matching）を、「趣味・技能・経験を仕事に変えるマッチングプラットフォーム」へピボットするための設計書。既存コードの調査結果（Appendix A）を踏まえ、新サービスモデル・DBスキーマ・状態遷移・ページ/権限設計・移行方針を定める。

原則:
- 恋愛・出会い系の利用は対象外とし、規約・通報・運用で排除する
- 架空の実績・口コミを本物として掲載しない（実績数・レビューはDB上の実際の取引記録からのみ算出・表示）
- 「本人確認済み」「資格確認済み」等の信頼バッジは、実際の確認記録（`identity_verifications` / `provider_verifications` の承認レコード）が存在する場合のみ表示する

---

## 1. サービスモデル

### 1.1 コンセプト

「あなたの趣味・技能・経験を、仕事に変える。」

職人・モノづくりに限定せず、ハンドメイド・美容・施術・育児支援・料理など、個人が持つ多様なスキルをカテゴリとして登録可能なマーケットプレイスへ拡張する。

### 1.2 1アカウント・双方向モデル

- 1つのアカウントで「依頼者」と「提供者」の両方を兼用可能とする（旧来の `profiles.role` のような排他的ロールモデルを廃止）
- ロールは「実行できる操作のセット」ではなく「プロフィールの追加」で表現する:
  - 全ユーザー: 検索・依頼・取引・レビュー
  - 提供者プロフィール（`provider_profiles`）を作成したユーザー: 出品・受注・見積提示
- 既存の `craftsman_profiles` を `provider_profiles` にリネーム・拡張し、`profiles.role` は `admin` 判定のみに残す（後述 §6, §8）

### 1.3 取引方式（2方式）

| 方式 | 概要 | 向くカテゴリ |
|---|---|---|
| 予約型（booking） | 提供者の設定した日時・場所で施術・作業を受ける。カレンダー指定 → 承認 → 実施 → 完了 | 美容、施術、ベビーシッター、修理・訪問系 |
| 制作・納品型（order） | 相談 → 見積 → 発注 → 制作 → 納品 → 検収。現行の requests/estimates/transactions フローを継承 | ハンドメイド、食品、木工・家具、デザイン |

カテゴリと方式は直交させる: `categories.supported_fulfillment_types` で「そのカテゴリで利用できる方式」を宣言し、出品時に提供者が選択する。カテゴリ追加時に方式の組み合わせを変えるだけでよく、スキーマ変更不要。

### 1.4 収益モデル（現状維持）

- Stripe決済は現状無効（`lib/stripe.ts` の `stripeConnectEnabled = false`）。プラットフォーム手数料・エスクローの設計（`EscrowPayment` モデル）は models.ts に残存するが、実装は決済導入時に別途行う
- 当面は掲載・マッチング無料、プラットフォーム外決済は規約上禁止事項として明記し、勧誘・送金防止のためのガイドのみ整備

---

## 2. カテゴリ設計

### 2.1 カテゴリマスター

```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,                      -- URL・識別用 (例: 'handmade')
  name TEXT NOT NULL,                             -- 表示名
  description TEXT NOT NULL DEFAULT '',
  icon TEXT,                                      -- lucide アイコン名等
  supported_fulfillment_types TEXT[] NOT NULL,    -- {'booking','order'} の部分集合
  is_public BOOLEAN NOT NULL DEFAULT false,       -- 公開状態（false=新規出品停止・検索非表示）
  requires_verification BOOLEAN NOT NULL DEFAULT false, -- 資格確認が必須か
  verification_notes TEXT NOT NULL DEFAULT '',    -- 必要資格・届出の説明（出品者向けガイド）
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (supported_fulfillment_types <@ ARRAY['booking','order'] AND array_length(supported_fulfillment_types, 1) >= 1)
);
```

- `is_public = false` のカテゴリは新規出品・検索結果から除外（既存出品は閲覧可、取引中のものは継続）。法令変更・事故対応等で即時に公開停止できる運用を可能にする
- カテゴリの追加・変更は管理画面（admin）から行い、一般ユーザーは `SELECT` のみ（RLS: 全員読み取り可、書き込みは admin）

### 2.2 初期カテゴリ案と提供条件（調査結果）

| カテゴリ | 方式 | 資格・届出要件（調査: 2026-11時点の公的表情） | requires_verification |
|---|---|---|---|
| 小物・ハンドメイド（アクセサリー、雑貨、裁縫・編み物等） | order | 国家資格・届出なし。ただし革小物等で販売する場合、個人として報酬を得るなら開業届（税務）。特定商取引法の表示義務は販売形態に応じて発生 | false |
| 木工・家具・修理（既存「職人」系の継承） | order | 原則資格不要。建築物に付帯する工事（収納の取り付け等）で建築士関係法令・宅建業法等に触れる場合は業内容を出品時に制限 | false |
| 美容（ヘア、メイク、まつエク、アイブロウ等） | booking | **美容師免許が必須**（美容師法第2条・第7条）。カット/カラー/パーマ/シャンプー/メイク/まつエク/まつ毛パーマ/眉毛施術はいずれも美容行為。施術場所も保健所の許可を受けた美容所内が原則（訪問美容は特例許可）。まつエクは2017年に経産省・厚労省が美容師法適用を明言。レーザー脱毛・アートメイク等は医行為のため医師のみ | true（美容師免許 + 美容所（又は訪問美容）の確認） |
| ネイル | booking | ネイル施術自体は国家資格不要・美容所登録不要（ただし自治体条例は要確認）。自宅営業は管理規約/賃貸契約・開業届の確認が必要。まつエク等を併設する場合は美容師免許と美容所登録が必要 | false（推奨バッジ: 民間資格・衛生講習） |
| 施術・ボディケア（整体、リラクゼーション） | booking | 「あん摩・マッサージ・指圧・はり・きゅう」はあん摩マツサージ指圧師等に関する法律により**国家資格が必須**（無資格営業は50万円以下の罰金）。「整体」「カイロ」等の民間療法は国家資格制度がないため違法ではないが、「マッサージ」等の名称広告は誤認防止のため制限（あはき・柔整広告ガイドライン）。カテゴリの出品ガイドで「マッサージ・治療を標榜しない」ことを必須とし、違反出品は非公開化 | false（ただし出品文言制限あり。免許保有者は資格バッジ取得可） |
| ベビーシッター・育児支援 | booking | 資格は法律上不要。ただし**認可外居宅訪問型保育事業として事業開始1か月以内の自治体への届出が義務**（怠ると50万円以下の過料、1人でも預かる事業から対象）。指導監督基準上、従事者は保育士/看護師資格又は都道府県等の研修修了が望ましいとされ、賠償責任保険加入が推奨される | true（届出確認 + 賠償保険加入確認。保育士等資格はバッジ表示） |
| 食品（菓子・惣菜・弁当等の販売） | order | 自宅で製造・加工した食品の販売は**食品衛生法に基づく営業許可（32業種、例: 菓子製造業・飲食店営業）が原則必須**。施設基準（専用設備等）を満たし許可を得た上で、食品衛生責任者の設置・HACCPに沿った衛生管理・食品表示義務を遵守。営業許可のない自家製お菓子の通信販売は不可 | true（営業許可証 + 食品衛生責任者） |
| 学習支援・レッスン（楽器、語学、趣味講座） | booking / order | 原則資格不要。ただし受験対策等で学校教育法上の専修学校・無認可校との関係、および外国人講師の在留資格は確認事項 | false |
| 写真・映像・デザイン制作 | order | 原則資格不要。肖像権・著作権のガイド整備が必要 | false |
| 占い・カウンセリング風のサービス | booking | 法規制なし。ただし医療・法律・金融の効果を保証する表現は薬機法・景表法上のリスク。文面ガイドで制限 | false |

※法的要件は変わりうるため、`categories.verification_notes` にキャッシュし、管理者が定期更新する運用とする。本書の記載は設計時点の調査に基づく一次情報（自治体・省庁の公的表情）の要約であり、法的助言ではない。

### 2.3 条件未整備カテゴリの公開停止機能

- `categories.is_public` を管理画面から false にすると、当該カテゴリの新規出品フォーム・検索絞り込みから除外される
- 公開停止時に、出品者向けに「必要条件と再開条件」を通知（`notifications` を利用）
- 出品時・予約時に、`requires_verification = true` のカテゴリでは `provider_verifications` に承認済みの確認記録がない場合、出品をブロックする（アプリレベル + RLS）

---

## 3. DBスキーマ設計（既存からの差分）

### 3.1 既存テーブルの統合・変更方針

| 既存テーブル | 方針 |
|---|---|
| `profiles` | 維持。`role` は `('user','admin')` に縮退（requester/craftsman の排他ロールを廃止）。`verified` は `identity_verifications` の承認状態から派生表示に変更し、トリガーでの保護は維持 |
| `craftsman_profiles` | `provider_profiles` にリネーム（新テーブル作成 + データ移行）。列はほぼ継承（bio, location, prefecture, service_areas, qualifications 等）。`rating/review_count/completed_orders` は保護トリガー維持 |
| `skills` / `craftsman_skills` | `skills` は維持するが `category` 列を `category_id`（FK to categories）に変更し、マスター管理に移行。`craftsman_skills` → `provider_skills` |
| `requests` / `specifications` / `matches` / `applications` / `estimates` / `transactions` / `transaction_events` / `messages` / `reviews` / `notifications` / `admin_notes` / `identity_verifications` / `portfolio_items` | 制作・納品型の基盤として維持（詳細は §3.3 の改名・拡張）。`matches`（AI順位付け）・`applications` は当面維持し、`requests` は `orders`（相談ベースの制作依頼）へ概念統合 |
| `portfolio_items` | 維持。出品画像と兼用ではなく提供者実績掲示として継続 |

### 3.2 新規テーブル

```sql
-- カテゴリマスター（§2.1）

-- 出品（提供者が作成）
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('booking','order')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_basis TEXT NOT NULL CHECK (price_basis IN ('fixed','hourly','consultation')),
  price INTEGER CHECK (price IS NULL OR price BETWEEN 0 AND 1000000000),
  service_areas TEXT[] NOT NULL DEFAULT '{}',
  location TEXT,
  coordinates JSONB,
  availability JSONB NOT NULL DEFAULT '{}'::jsonb,   -- 予約型: 提供可能曜日・時間帯
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','paused','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 予約（予約型の取引）
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id),
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  provider_user_id UUID NOT NULL REFERENCES public.profiles(id),
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  place_type TEXT NOT NULL DEFAULT 'provider' CHECK (place_type IN ('provider','customer','online')),
  place_note TEXT,
  amount INTEGER CHECK (amount IS NULL OR amount >= 0),
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','accepted','cancelled_by_customer','cancelled_by_provider','completed','reviewed')),
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (scheduled_end > scheduled_start)
);

-- 制作・納品型の注文（既存 requests/transactions を統合整理した新エンティティ）
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id),
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  provider_profile_id UUID NOT NULL REFERENCES public.provider_profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  specification JSONB,                 -- AI構造化結果（既存 specifications 相当）
  status TEXT NOT NULL DEFAULT 'consulting'
    CHECK (status IN ('consulting','quoted','ordered','in_progress','delivered','accepted','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 取引メッセージ（方式ごと）
CREATE TABLE public.booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 5000),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 5000),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- レビューは既存 reviews を拡張
-- reviews: transaction_id 参照を (booking_id | order_id) の排他参照に変更
ALTER TABLE public.reviews
  ADD COLUMN booking_id UUID REFERENCES public.bookings(id),
  ADD COLUMN order_id UUID REFERENCES public.orders(id);
-- CHECK: booking_id/order_id のどちらか一方のみ、かつ reviewer は当事者

-- お気に入り
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

-- 通報
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('listing','profile','booking','order','message','review')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('illegal','fraud','harassment','adult','off_platform_payment','other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','actioned','dismissed')),
  handled_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 提供者資格・本人確認記録（カテゴリ単位）
CREATE TABLE public.provider_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  type TEXT NOT NULL CHECK (type IN ('license','permit','insurance','training','other')),
  name TEXT NOT NULL,                 -- 例: '美容師免許' '認可外居宅訪問型保育事業 届出'
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'unsubmitted' CHECK (status IN ('unsubmitted','pending','approved','rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_user_id, category_id, name)
);
```

### 3.3 既存資産の対応詳細

- `requests`/`specifications`/`estimates`/`transactions` フローは `orders` に集約する。移行時は既存 `requests` を `orders(status='consulting'|'quoted'|...)` にマップし、`estimates` は `orders` と 1:N のまま維持（スキーマ再利用、テーブル名は変更しない選択肢もあり、Step 2 で決定）
- `messages` は `order_messages` へ移行（request_id → order_id）。`matches`/`applications` はAI提案・応募の仕組みとして維持し、`order` ベースに参照を張り替え
- `transaction_events` は `booking_events`/`order_events` に相当するイベントログとして継承
- 通知トリガー（`notify_*` 関数群）は新しい当事者解決（listing → provider_user_id）に合わせて更新

---

## 4. 状態遷移

### 4.1 予約型（bookings）

```
requested → accepted → completed → reviewed
   ↓           ↓
cancelled_by_customer / cancelled_by_provider（いずれの状態からもキャンセル可）
```

| 遷移 | 実行者 | 条件 |
|---|---|---|
| → requested | 依頼者 | listing が published、提供可能日時内、本人確認済み（要件カテゴリ時） |
| → accepted | 提供者 | status=requested |
| → cancelled_by_customer | 依頼者 | 実施前。実施直前（例: 24時間以内）はキャンセルポリシー表示 |
| → cancelled_by_provider | 提供者 | 実施前。常時可能だが頻度は実績指標に記録 |
| → completed | 提供者 または 依頼者 | scheduled_end 経過後 |
| → reviewed | 依頼者または提供者 | completed の当事者がレビュー投稿（1回/方向） |

### 4.2 制作・納品型（orders）

```
consulting → quoted → ordered → in_progress → delivered → accepted(completed) → reviewed
     ↓         ↓        ↓          ↓              ↓
  cancelled（当事者合意または管理者）
```

| 遷移 | 実行者 | 条件 |
|---|---|---|
| → consulting | 依頼者 | listing 経由または直接相談 |
| → quoted | 提供者 | 見積（estimates）提示 |
| → ordered | 依頼者 | 見積承認（既存 `accept_estimate` 相当のSecurity Definer関数で排他制御） |
| → in_progress | 提供者 | ordered 後 |
| → delivered | 提供者 | 納品物・報告の記録 |
| → completed | 依頼者 | 検収。実績数（completed_orders）更新は信頼ワークフロー内のみ |
| → reviewed | 当事者 | completed 後 |
| → cancelled | 当事者/管理者 | 未検収時。キャンセル理由記録 |

既行の「状態変更はSecurity Definer関数（`update_transaction_status` 相当）経由のみ許可し、直接UPDATEはトリガーで拒否」の実装パターンをそのまま継承する。

---

## 5. ページ構成

| パス | 主要機能 | 既存資産 |
|---|---|---|
| `/` トップ | カテゴリ一覧、人気出品、AI相談入力 | `app/page.tsx` 改修（craftsman参照→listing参照へ） |
| `/search` 検索一覧 | カテゴリ・地域・方式・価格絞り込み、ソート | `app/craftsmen/page.tsx` + `lib/search.ts` を発展 |
| `/listings/[id]` 出品詳細 | 画像、価格、提供者概要、予約カレンダー / 相談ボタン | `app/craftsman/[id]/page.tsx` 相当を新規 |
| `/providers/[id]` 提供者プロフィール | 出品一覧、実績（実際の取引数のみ）、レビュー、資格バッジ | `app/craftsman/[id]` を改名 |
| `/listings/new` `/listings/[id]/edit` 出品登録・編集 | カテゴリ選択、方式選択、価格、対応地域、画像アップロード | `craftsman/profile` + `portfolio` のフォーム流用 |
| `/listings/[id]/book` 予約申請 | 日時選択、場所、メッセージ | 新規 |
| `/listings/[id]/contact` / `/orders/new` 制作依頼 | 相談開始、仕様入力（AI構造化） | `app/request/new` + `RequestPromptForm` 流用 |
| `/messages` メッセージ一覧 | 取引別スレッド一覧 | `craftsman/messages` を全ユーザー対応へ |
| `/mypage` マイページ | プロフィール、提供者プロフィール管理、本人確認、資格確認 | `app/mypage/page.tsx` 拡張 |
| `/bookings/[id]` `/orders/[id]` 取引詳細 | 状態遷移操作、タイムライン、メッセージ、キャンセル | `app/transactions/[id]` + `transaction-timeline` 流用 |
| /providers/guide` 提供者向け案内 | 出品の流れ、カテゴリ別必要資格・届出ガイド | 新規（categories.verification_notes を表示） |
| `/guide` `/faq` ご利用ガイド・FAQ | 利用の流れ、安全のためのガイド、法令注意 | 新規 |
| `/admin/*` 管理画面 | カテゴリ管理、資格確認キュー、通報対応、ユーザー管理 | `app/admin/*` 拡張 |
| `/terms` `/privacy` 規約等 | 利用規約（勧誘・プラットフォーム外取引禁止を含む） | 新規 |
| `/login` ログイン登録 | メール認証（ロール選択の廃止） | `app/login/page.tsx` 改修 |

既存 `app/request/*`・`app/craftsman/*` の詳細画面は orders 系へ集約し、URL 設計を刷新する。

---

## 6. 権限設計

### 6.1 RLSポリシー方針（新テーブル）

- `categories`: SELECT は全員（未ログイン含む）。書き込みは `is_admin()` のみ
- `listings`/`listing_images`: SELECT は `status='published'` または提供者本人・管理者。INSERT/UPDATE/DELETE は「`provider_profiles.user_id = auth.uid()` を持つユーザー」で、`requires_verification` カテゴリでは承認済み `provider_verifications` の存在を WITH CHECK で検証
- `bookings`: SELECT/UPDATE は当事者（customer_id または provider_user_id が auth.uid()）または管理者。INSERT は依頼者本人
- `orders`/`order_messages`/`booking_messages`: 当事者のみ閲覧・投稿（既存 `messages` ポリシーの当事者解決パターンを継承）
- `reviews`: SELECT 公開。INSERT は完了取引の当事者のみ（既存 `create_review` Security Definer 関数を拡張）
- `favorites`: 自分のもののみ
- `reports`: INSERT はログインユーザー（reporter_id = auth.uid()）。閲覧・処理は管理者のみ
- `provider_verifications`: 自分のものの閲覧・提出、承認は管理者のみ（既存 `identity_verifications` のパターンをそのまま適用）

### 6.2 アプリレベルのロールチェック

- `lib/supabase-server.ts` の `requireServerProfile(["requester"|"craftsman"])` を廃止し、`requireUser()`（ログイン必須）+ 個別の `requireProviderProfile()`（提供者プロフィール保有チェック）に置き換える
- Server Action / ページ側で「出品者のみ編集」「当事者のみ閲覧」を二重チェック（RLS + アプリ、既存の多層防御方針を継続）
- `admin` は `profiles.role='admin'` + トリガー保護（既存の `protect_profile_trusted_fields` 継続）

---

## 7. 既存コード活用方針

### 7.1 再利用（そのまま/軽微な改修）

- UI基盤: `components/ui/*`（shadcn 系、@base-ui/react ベース）、`site-header`、`site-footer`、`theme-provider`、`status-badge`、`review-stars`、`notification-bell`、`transaction-timeline`、`estimate-preview`
- 認証: `lib/supabase.ts`（signUp/signIn/getProfile）、`middleware.ts` のセッションリフレッシュ、`session-provider`
- データアクセスパターン: `lib/supabase-data.ts` の mapper/rows パターン、`lib/supabase-server.ts`
- AI: `lib/ai.ts` の `structureRequest`/`generateSpecification`/`scoreMatching`/`discoverOpportunities`/`reverseMatch` のバリデーション・サニタイズ基盤はそのまま、プロンプトの文言を「職人」→汎用スキル向けに変更し、入力元を requests → listings/orders に切替
- DB保護機構: Security Definer 関数・トリガーによる状態遷移・実績フィールド保護の設計（0002/0003マイグレーション）は全面継承
- 通知: `notifications` テーブル + トリガー通知の仕組み

### 7.2 改修が必要

- `lib/models.ts`: UserRole 廃止、Listing/Booking/Order/Report/Favorite/ProviderVerification 型の追加、CraftsmanProfile → ProviderProfile
- `lib/search.ts`: listing ベース・カテゴリ絞り込み対応
- `app/login`: ロール選択撤去、登録後のリダイレクト先変更
- `components/site-header.tsx`: 「技能者を探す」等のナビ、お気に入り追加
- `app/page.tsx`・検索ページ: listing 表示への差し替え、文言変更
- `lib/ai.ts` プロンプト群（§7.1）
- `craftsman_profiles` → `provider_profiles` 移行マイグレーション（データコピー + 参照張替 + 旧テーブル廃止）

### 7.3 削除・置換

- `app/craftsman/*` 配下の画面構成（jobs/orders/estimates/dashboard は `/mypage`・`/orders`・`/admin` へ集約し、URLごと置換）
- `profiles.role` の requester/craftsman 排他制御に関わるポリシー・関数（`current_user_role()` は `is_admin()` 用に簡素化）
- `lib/stripe.ts` のダミー実装は決済導入時に置換（当面維持）

---

## 8. 仮称・デザイン方針

### 8.1 サービス仮称

- 仮称: **「スキルマーケ」**（変更容易な設計: `site-header.tsx`・メタデータ・`.env` の `NEXT_PUBLIC_APP_NAME` に一元化し、コード内直書きを排除する）
- 候補予備: 「テクモア」「ワザシゴト」等。決定時に一括置換のみで済む構造にする

### 8.2 文言変更方針

- 「職人」「技能者」→「提供者」「プロ」等の中性表現へ全面変更（`app/page.tsx` の「車両内装カスタムから…」等のヒーローコピーも新コンセプトへ）
- ただし木工・家具など旧来カテゴリでは「職人」の語をブランド表現として許容（カテゴリ説明文内のみ）
- 依頼者→「利用者/お客様」、表現はカテゴリ（施術=お客様、制作=発注者）に応じて辞書化

### 8.3 Artisan Warm スタイルの活用・拡張

- 現行の Serif 見出し + Tailwind v4 の `--primary` 系ウォームパレット（app/globals.css の Artisan Warm 系変数）は温かみのある手仕事の印象として維持
- カテゴリ追加に耐えるよう、カテゴリごとのアクセントカラーを `categories` に持たせるのではなく、`icon` + 統一パレットで表現し、ブランドの一貫性を優先する
- 検索・一覧カードは画像主導（`listing_images`）のグリッドへ移行し、職人リスト型の現在のテーブル寄り表示から刷新

---

## Appendix A: 既存コード調査結果（Part A）

### A.1 画面構成（app/）

- トップ `/`、職人一覧 `/craftsmen`、職人詳細 `/craftsman/[id]`、ログイン `/login`、マイページ `/mypage`、通知 `/notifications`
- 依頼: `/request/new`、`/request/[id]/{edit,spec,matches,estimates,messages,payment,review}`
- 職人側: `/craftsman/{dashboard,profile,portfolio,jobs,orders,estimates/new,messages}`
- 取引 `/transactions`, `/transactions/[id]`、管理 `/admin/{dashboard,users,requests/[id]}`
- middleware matcher: `/admin`, `/craftsman`, `/mypage`, `/notifications`, `/request`, `/transactions`（auth セッションリフレッシュのみ。リダイレクト制御は各ページ）

### A.2 技術構成

- Next.js 15.5（App Router, Server Actions `"use server"`）、React 18、TypeScript、Tailwind CSS v4、shadcn 風 UI（`@base-ui/react`）、lucide-react、sonner、Leaflet（地図）、next-themes
- Supabase（`@supabase/ssr`, `@supabase/supabase-js`）、OpenAI SDK
- スクリプト: `dev` / `build` / `start` / `lint`（eslint CLI）/ `typecheck`

### A.3 認証

- Supabase Auth（メール+パスワード）。`lib/supabase.ts` に signUp/signIn/getProfile、`lib/supabase-server.ts` に server client + `requireServerProfile`
- `middleware.ts` は `createServerClient` で `getUser()` を呼びセッションをリフレッシュ（設定未完了時は素通し）
- サインアップ時に `raw_user_meta_data.role`（requester/craftsman）を渡し、DBトリガー `handle_new_auth_user` が `profiles` を作成

### A.4 データベース

- migrations: `0001_initial.sql`（profiles, craftsman_profiles, skills, craftsman_skills, requests, request_images, specifications, matches, applications, messages, transactions, reviews, notifications, admin_notes, identity_verifications, portfolio_items + RLS一式）、`0002_commercial_security.sql`（estimates, transaction_events 追加、Security Definer 関数群 `accept_estimate`/`update_transaction_status`/`create_review`/`create_request_with_spec`、トリガーによる保護、通知トリガー）、`0003_phase_2_2_marketplace.sql`（portfolio ストレージバケット、`update_request_with_spec`/`delete_request`、RLS更新）
- RLS は全面有効。信頼フィールド（role/verified/実績/状態）はトリガーで保護し、状態遷移は set_config ベースの認可フラグ経由のみ

### A.5 決済

- Stripe は**未統合**（`lib/stripe.ts` は `stripeConnectEnabled = false` のスタブ、`.env.example` にキー例のみ）。`/request/[id]/payment` は「準備中」表示。エスクローモデル（`EscrowPayment`）は型のみ存在

### A.6 AI機能（lib/ai.ts）

- OpenAI `gpt-4o-mini`。`OPENAI_API_KEY` 未設定時は機能無効エラー
- 機能: 依頼構造化（structureRequest, JSON）、仕様書生成（generateSpecification, Markdown）、マッチングスコアリング（scoreMatching, 0-100 + 理由、matches に保存・冪等）、機会発見（discoverOpportunities）、逆引き推薦（reverseMatch）
- 厳格な入力バリデーション・サニタイズ・件数制限を実装（そのまま再利用）

### A.7 実装済み vs 未実装

- **DB連携済み**: 全主要画面（`lib/supabase-data.ts` 経由で profiles/craftsman_profiles/requests/specifications/matches/messages/estimates/transactions/transaction_events/reviews/notifications/portfolio_items を読み書き）。ダミーデータ・モックは検出されず。未設定環境では空データにフォールバック（トップページの `.catch(() => [])` 等）
- **未実装/スタブ**: Stripe 決済（無効スタブ）、`EscrowPayment`（モデルのみ、DBテーブルなし）、本人確認のUIフロー（テーブル・ポリシーは整備済みだが申請画面は未確認）、通報・お気に入り機能（テーブルなし）、規約・FAQ ページ、メール通知（DB内 notifications のみ）
