-- デモデータ投入
-- 実行時に auth.users が存在しないため、profiles は実際の認証後に紐付ける想定。
-- ここではスキルマスタとサンプル技能者・案件を作成します。

-- 技能マスタ
INSERT INTO public.skills (name, category) VALUES
  ('内装張り替え', '内装'),
  ('シートカバー縫製', '縫製'),
  ('木製パネル加工', '木工'),
  ('樹脂成型', '成型'),
  ('CAD設計', '設計'),
  ('電装配線', '電装')
ON CONFLICT (name) DO NOTHING;

-- サンプル依頼者（仮UUID: 11111111-1111-1111-1111-111111111111）
INSERT INTO public.profiles (id, role, name, avatar_url, verified) VALUES
  ('11111111-1111-1111-1111-111111111111', 'requester', '山田 太郎', 'https://api.dicebear.com/7.x/avataaars/svg?seed=yamada', true)
ON CONFLICT (id) DO NOTHING;

-- サンプル技能者1（佐藤 匠）
INSERT INTO public.profiles (id, role, name, avatar_url, verified) VALUES
  ('22222222-2222-2222-2222-222222222222', 'craftsman', '佐藤 匠', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sato', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.craftsman_profiles (user_id, bio, location, equipment, special_skills, rating, review_count, completed_orders, hourly_rate) VALUES
  ('22222222-2222-2222-2222-222222222222',
   '30年以上の車両内装職人。レザー・ファブリック・木目調パネルまで、オーダーメイドで対応します。',
   '東京都世田谷区',
   ARRAY['工業用ミシン','レザークラフト工具','CNCルーター'],
   ARRAY['オーダーシート縫製','ステッチカラー自由','抗菌加工生地対応'],
   4.8, 23, 156, 8000)
ON CONFLICT DO NOTHING;

-- サンプル技能者2（田中 工房）
INSERT INTO public.profiles (id, role, name, avatar_url, verified) VALUES
  ('33333333-3333-3333-3333-333333333333', 'craftsman', '田中 工房', 'https://api.dicebear.com/7.x/avataaars/svg?seed=tanaka', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.craftsman_profiles (user_id, bio, location, equipment, special_skills, rating, review_count, completed_orders, hourly_rate) VALUES
  ('33333333-3333-3333-3333-333333333333',
   '車載収納と内装カスタムを得意とする工房。着脱式収納ボックスや釣り具ラックの実績多数。',
   '神奈川県横浜市',
   ARRAY['3Dプリンター','レーザーカッター','丸ノコ盤'],
   ARRAY['着脱式収納設計','3Dデータ作成','軽量化設計'],
   4.6, 17, 89, 7000)
ON CONFLICT DO NOTHING;

-- サンプル管理者
INSERT INTO public.profiles (id, role, name, avatar_url, verified) VALUES
  ('44444444-4444-4444-4444-444444444444', 'admin', '管理 花子', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', true)
ON CONFLICT (id) DO NOTHING;

-- 技能者と技能の紐付け
INSERT INTO public.craftsman_skills (craftsman_id, skill_id)
SELECT cp.id, s.id
FROM public.craftsman_profiles cp
JOIN public.skills s ON s.name IN ('内装張り替え','シートカバー縫製','木製パネル加工')
WHERE cp.user_id = '22222222-2222-2222-2222-222222222222'
ON CONFLICT DO NOTHING;

INSERT INTO public.craftsman_skills (craftsman_id, skill_id)
SELECT cp.id, s.id
FROM public.craftsman_profiles cp
JOIN public.skills s ON s.name IN ('木製パネル加工','樹脂成型','CAD設計')
WHERE cp.user_id = '33333333-3333-3333-3333-333333333333'
ON CONFLICT DO NOTHING;

-- サンプル案件
INSERT INTO public.requests (id, requester_id, title, description, status, image_url, created_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'アルファード 着脱式収納ボックス製作',
   '3列目シート下のデッドスペースを活用し、子供用品とキャンプ道具を分けられる着脱式の収納ボックスが欲しい。軽量で、工具なしで取り外せる仕様。',
   'matching',
   'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80',
   now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.requests (id, requester_id, title, description, status, created_at) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '11111111-1111-1111-1111-111111111111',
   'ハイエース 内壁ウッドパネル貼り',
   'キャンピング仕様にするため、内壁と床に耐水ウッドパネルを貼りたい。',
   'quoted',
   now() - interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- 仕様書
INSERT INTO public.specifications (request_id, title, summary, category, required_skills, materials, budget, deadline, notes) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'アルファード 着脱式収納ボックス',
   '3列目収納に入る、荷物を仕切りできる着脱式ボックス。軽量で工具不要で取り外せる設計。',
   '車両内装カスタム（収納）',
   ARRAY['木工','CAD設計','樹脂成型'],
   ARRAY['合板','滑り止めフェルト','取っ手金具'],
   '15万円〜25万円',
   '2026年12月中旬',
   '子供用品とキャンプ道具を分けたい。防水加工希望。')
ON CONFLICT DO NOTHING;

-- マッチング候補
INSERT INTO public.matches (request_id, craftsman_id, score, status)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  cp.id,
  CASE WHEN cp.user_id = '33333333-3333-3333-3333-333333333333' THEN 96 ELSE 82 END,
  'pending'
FROM public.craftsman_profiles cp
ON CONFLICT DO NOTHING;

-- 応募・見積り
INSERT INTO public.applications (request_id, craftsman_id, message, estimated_amount, status)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  cp.id,
  '材料費・施工費込みの見積りです。納期は2週間を予定しています。',
  220000,
  'pending'
FROM public.craftsman_profiles cp
WHERE cp.user_id = '22222222-2222-2222-2222-222222222222'
ON CONFLICT DO NOTHING;

-- メッセージ
INSERT INTO public.messages (request_id, sender_id, text, created_at) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'ご依頼ありがとうございます。木材の種類はお任せでよろしいでしょうか？', now() - interval '13 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '予算内であればオーク調でお願いします。', now() - interval '12 days')
ON CONFLICT DO NOTHING;

-- 取引
INSERT INTO public.transactions (request_id, craftsman_id, amount, status)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  cp.id,
  220000,
  'contracted'
FROM public.craftsman_profiles cp
WHERE cp.user_id = '22222222-2222-2222-2222-222222222222'
ON CONFLICT DO NOTHING;

-- 通知
INSERT INTO public.notifications (user_id, title, body, read, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'AI仕様書が完成しました', '「アルファード 着脱式収納ボックス」の仕様書を確認してください。', false, now() - interval '2 days'),
  ('11111111-1111-1111-1111-111111111111', 'マッチング候補が2件見つかりました', '対応可能な技能者が見つかりました。プロフィールを確認しましょう。', false, now() - interval '1 day')
ON CONFLICT DO NOTHING;

-- 本人確認
INSERT INTO public.identity_verifications (user_id, status) VALUES
  ('22222222-2222-2222-2222-222222222222', 'approved'),
  ('33333333-3333-3333-3333-333333333333', 'pending')
ON CONFLICT (user_id) DO NOTHING;

-- ポートフォリオ
INSERT INTO public.portfolio_items (craftsman_id, title, description, image_url, tags) VALUES
  ((SELECT id FROM public.craftsman_profiles WHERE user_id = '22222222-2222-2222-2222-222222222222'), 'アルファード 本革シート張替え', 'ブラウンレザーで高級感のあるシートへ張り替え。', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80', ARRAY['レザー','シート','ミニバン']),
  ((SELECT id FROM public.craftsman_profiles WHERE user_id = '22222222-2222-2222-2222-222222222222'), 'ハイエース ウッドパネル内装', '床・壁面に木目調パネルを施工し、キャンピング仕様に。', 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&q=80', ARRAY['木目調','パネル','キャンピング']),
  ((SELECT id FROM public.craftsman_profiles WHERE user_id = '33333333-3333-3333-3333-333333333333'), '軽トラ 着脱式工具箱', '現場で使う工具を整理できる着脱式収納を設計・製作。', 'https://images.unsplash.com/photo-1605218427306-022ba6c554e6?w=800&q=80', ARRAY['収納','工具箱','軽トラ']),
  ((SELECT id FROM public.craftsman_profiles WHERE user_id = '33333333-3333-3333-3333-333333333333'), 'ステップワゴン 釣り具ラック', 'ロッドホルダー付きの車内ラック。釣り後も車内を快適に。', 'https://images.unsplash.com/photo-1516939884455-1445c8652f83?w=800&q=80', ARRAY['ラック','釣り','アウトドア'])
ON CONFLICT DO NOTHING;
