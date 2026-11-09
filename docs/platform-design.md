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
