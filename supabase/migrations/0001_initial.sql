-- 拡張機能
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- プロフィール（依頼者・技能者・管理者共通）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('requester', 'craftsman', 'admin')),
  name TEXT NOT NULL,
  avatar_url TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 技能者詳細プロフィール
CREATE TABLE IF NOT EXISTS public.craftsman_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio TEXT,
  location TEXT,
  equipment TEXT[] DEFAULT '{}',
  special_skills TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  hourly_rate INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 技能マスタ
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL
);

-- 技能者が持つ技能
CREATE TABLE IF NOT EXISTS public.craftsman_skills (
  craftsman_id UUID REFERENCES public.craftsman_profiles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (craftsman_id, skill_id)
);

-- 依頼案件
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','structured','matching','quoted','contracted','in_progress','delivered','completed')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 依頼添付画像
CREATE TABLE IF NOT EXISTS public.request_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI生成仕様書
CREATE TABLE IF NOT EXISTS public.specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  materials TEXT[] DEFAULT '{}',
  budget TEXT,
  deadline TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- マッチング候補
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  craftsman_id UUID NOT NULL REFERENCES public.craftsman_profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 応募・提案
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  craftsman_id UUID NOT NULL REFERENCES public.craftsman_profiles(id) ON DELETE CASCADE,
  message TEXT,
  estimated_amount INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- メッセージ
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 取引（成約後）
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  craftsman_id UUID NOT NULL REFERENCES public.craftsman_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'contracted' CHECK (status IN ('contracted','in_progress','delivered','completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- レビュー
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 通知
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 管理者メモ
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 本人確認状態
CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unsubmitted' CHECK (status IN ('unsubmitted','pending','approved','rejected')),
  document_url TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ポートフォリオ
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  craftsman_id UUID NOT NULL REFERENCES public.craftsman_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftsman_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.craftsman_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- プロフィール: 自分のものは全て、技能者/依頼者は他者の公開情報も読める
CREATE POLICY "profiles_select_own_or_public" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 技能者詳細: 公開
CREATE POLICY "craftsman_profiles_select_public" ON public.craftsman_profiles
  FOR SELECT USING (true);

CREATE POLICY "craftsman_profiles_update_own" ON public.craftsman_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "craftsman_profiles_insert_own" ON public.craftsman_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 技能マスタ: 読み取り公開
CREATE POLICY "skills_select_public" ON public.skills FOR SELECT USING (true);

-- 技能者技能: 読み取り公開、自身のものを更新
CREATE POLICY "craftsman_skills_select_public" ON public.craftsman_skills FOR SELECT USING (true);
CREATE POLICY "craftsman_skills_insert_own" ON public.craftsman_skills
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id AND cp.user_id = auth.uid())
  );
CREATE POLICY "craftsman_skills_delete_own" ON public.craftsman_skills
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id AND cp.user_id = auth.uid())
  );

-- 案件: 依頼者は自分の、技能者/管理者は全て
CREATE POLICY "requests_select" ON public.requests
  FOR SELECT USING (
    auth.uid() = requester_id OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('craftsman','admin'))
  );

CREATE POLICY "requests_insert_requester" ON public.requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'requester')
  );

CREATE POLICY "requests_update_requester" ON public.requests
  FOR UPDATE USING (auth.uid() = requester_id);

-- 仕様書: 関連案件の関係者のみ
CREATE POLICY "specifications_select" ON public.specifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') OR
        EXISTS (SELECT 1 FROM public.matches m JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id
                WHERE m.request_id = r.id AND cp.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "specifications_insert_requester" ON public.specifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.requester_id = auth.uid())
  );

-- マッチング: 関係者のみ
CREATE POLICY "matches_select" ON public.matches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.requester_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id AND cp.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 応募: 技能者が自分のを管理、依頼者が案件のを閲覧
CREATE POLICY "applications_select" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.requester_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id AND cp.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "applications_insert_craftsman" ON public.applications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id AND cp.user_id = auth.uid())
  );

-- メッセージ: 関係者
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.requester_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id
      WHERE m.request_id = messages.request_id AND cp.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 取引: 関係者
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.requester_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id AND cp.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- レビュー
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_participant" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- 通知: 自分のもののみ
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 管理者メモ: 管理者のみ
CREATE POLICY "admin_notes_admin" ON public.admin_notes
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 本人確認: 自分のものを読み書き、管理者が更新
CREATE POLICY "identity_verifications_select_own" ON public.identity_verifications
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "identity_verifications_insert_own" ON public.identity_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "identity_verifications_update_admin" ON public.identity_verifications
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ポートフォリオ: 読み取り公開、自身のものを更新
CREATE POLICY "portfolio_items_select_public" ON public.portfolio_items FOR SELECT USING (true);
CREATE POLICY "portfolio_items_insert_own" ON public.portfolio_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id AND cp.user_id = auth.uid())
  );
CREATE POLICY "portfolio_items_update_own" ON public.portfolio_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id AND cp.user_id = auth.uid())
  );
CREATE POLICY "portfolio_items_delete_own" ON public.portfolio_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id AND cp.user_id = auth.uid())
  );

-- 更新日時自動更新用関数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー（CREATE OR REPLACE TRIGGER で冪等に）
CREATE OR REPLACE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER craftsman_profiles_updated_at BEFORE UPDATE ON public.craftsman_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER requests_updated_at BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER specifications_updated_at BEFORE UPDATE ON public.specifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
