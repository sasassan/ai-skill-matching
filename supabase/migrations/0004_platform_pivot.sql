ALTER TABLE public.profiles DISABLE TRIGGER profiles_protect_trusted_fields;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.profiles SET role = 'user' WHERE role IN ('requester', 'craftsman');
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
ALTER TABLE public.profiles ENABLE TRIGGER profiles_protect_trusted_fields;

CREATE OR REPLACE FUNCTION public.protect_profile_trusted_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF (NEW.role <> 'user' OR COALESCE(NEW.verified, false)) AND NOT public.is_admin() AND COALESCE(auth.role(), '') <> 'service_role' THEN
      RAISE EXCEPTION 'Trusted profile fields can only be assigned by an administrator';
    END IF;
  ELSIF (NEW.role IS DISTINCT FROM OLD.role OR NEW.verified IS DISTINCT FROM OLD.verified)
    AND NOT public.is_admin() AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Trusted profile fields can only be changed by an administrator';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (NEW.id, 'user', COALESCE(NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data ->> 'name', '')), 120), ''), 'ユーザー'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() AND role = 'user' AND NOT COALESCE(verified, false));

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', icon TEXT,
  supported_fulfillment_types TEXT[] NOT NULL CHECK (cardinality(supported_fulfillment_types) >= 1 AND supported_fulfillment_types <@ ARRAY['booking','order']::TEXT[]),
  is_public BOOLEAN NOT NULL DEFAULT false, requires_verification BOOLEAN NOT NULL DEFAULT false,
  verification_notes TEXT NOT NULL DEFAULT '', display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.categories (slug, name, supported_fulfillment_types, is_public, requires_verification, verification_notes, display_order) VALUES
('handmade','小物・ハンドメイド',ARRAY['order'],true,false,'',1),
('woodwork','木工・家具・修理',ARRAY['order'],true,false,'建築工事に該当する業務は法令を確認してください。',2),
('beauty','美容',ARRAY['booking'],false,true,'美容師免許と美容所または訪問美容の確認が必要です。',3),
('nail','ネイル',ARRAY['booking'],true,false,'自治体条例や営業場所の規約を確認してください。',4),
('bodywork','施術・ボディケア',ARRAY['booking'],true,false,'無資格でマッサージ・治療を標榜しないでください。',5),
('babysitting','ベビーシッター・育児支援',ARRAY['booking'],false,true,'自治体への届出と賠償責任保険の確認が必要です。',6),
('food','食品',ARRAY['order'],false,true,'営業許可と食品衛生責任者の確認が必要です。',7),
('lessons','学習支援・レッスン',ARRAY['booking','order'],true,false,'',8),
('photo-design','写真・映像・デザイン',ARRAY['order'],true,false,'肖像権・著作権を確認してください。',9),
('fortune','占い・カウンセリング',ARRAY['booking'],true,false,'医療・法律・金融の効果を保証しないでください。',10);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_read ON public.categories FOR SELECT USING (true);
CREATE POLICY categories_admin ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.provider_profiles (LIKE public.craftsman_profiles INCLUDING ALL);
ALTER TABLE public.provider_profiles ADD CONSTRAINT provider_profiles_user_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
INSERT INTO public.provider_profiles SELECT * FROM public.craftsman_profiles;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY provider_profiles_read ON public.provider_profiles FOR SELECT USING (true);
CREATE POLICY provider_profiles_insert ON public.provider_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY provider_profiles_update ON public.provider_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE OR REPLACE FUNCTION public.protect_craftsman_profile_metrics() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT public.is_admin() AND COALESCE(auth.role(), '') <> 'service_role' THEN
    NEW.rating := 0; NEW.review_count := 0; NEW.completed_orders := 0;
  ELSIF TG_OP = 'UPDATE' AND (NEW.rating IS DISTINCT FROM OLD.rating OR NEW.review_count IS DISTINCT FROM OLD.review_count OR NEW.completed_orders IS DISTINCT FROM OLD.completed_orders)
    AND NOT public.is_admin() AND COALESCE(auth.role(), '') <> 'service_role'
    AND (COALESCE(current_setting('app.reputation_update', true), '') <> 'on' OR current_user <> pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = TG_RELID))) THEN
    RAISE EXCEPTION 'Provider reputation fields can only be changed by trusted workflows';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER provider_profiles_updated_at BEFORE UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER provider_profiles_protect_metrics BEFORE INSERT OR UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION public.protect_craftsman_profile_metrics();

DO $migration$
DECLARE item RECORD; definition TEXT; policy_roles TEXT; policy_using TEXT; policy_check TEXT;
BEGIN
  FOR item IN SELECT conrelid::regclass AS relation, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE contype = 'f' AND confrelid = 'public.craftsman_profiles'::regclass LOOP
    definition := replace(item.definition, 'craftsman_profiles', 'provider_profiles');
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', item.relation, item.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', item.relation, item.conname, definition);
  END LOOP;
  FOR item IN SELECT * FROM pg_policies WHERE schemaname IN ('public','storage') AND tablename <> 'craftsman_profiles' AND (qual LIKE '%craftsman_profiles%' OR with_check LIKE '%craftsman_profiles%') LOOP
    SELECT string_agg(quote_ident(role_name), ', ') INTO policy_roles FROM unnest(item.roles) AS role_name;
    policy_using := replace(item.qual, 'craftsman_profiles', 'provider_profiles');
    policy_check := replace(item.with_check, 'craftsman_profiles', 'provider_profiles');
    EXECUTE format('DROP POLICY %I ON %I.%I', item.policyname, item.schemaname, item.tablename);
    definition := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s', item.policyname, item.schemaname, item.tablename, item.permissive, item.cmd, policy_roles);
    IF policy_using IS NOT NULL THEN definition := definition || ' USING (' || policy_using || ')'; END IF;
    IF policy_check IS NOT NULL THEN definition := definition || ' WITH CHECK (' || policy_check || ')'; END IF;
    EXECUTE definition;
  END LOOP;
END $migration$;
DROP TABLE public.craftsman_profiles;
ALTER TABLE public.craftsman_skills RENAME TO provider_skills;
ALTER TABLE public.provider_skills RENAME COLUMN craftsman_id TO provider_id;
ALTER TABLE public.skills ADD COLUMN category_id UUID REFERENCES public.categories(id);
UPDATE public.skills SET category_id = (SELECT id FROM public.categories WHERE slug = CASE WHEN public.skills.category = '木工' THEN 'woodwork' WHEN public.skills.category = '縫製' THEN 'handmade' WHEN public.skills.category = '設計' THEN 'photo-design' END) WHERE category IN ('木工', '縫製', '設計');

DO $functions$
DECLARE item RECORD; definition TEXT;
BEGIN
  FOR item IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proname IN ('craftsman_can_access_request','create_review','notify_message_participants','notify_transaction_participant','update_transaction_status','create_request_with_spec','update_request_with_spec','delete_request','accept_estimate','reject_estimate') LOOP
    definition := replace(pg_get_functiondef(item.oid), 'public.craftsman_profiles', 'public.provider_profiles');
    definition := replace(definition, 'public.current_user_role() = ''craftsman''', 'EXISTS (SELECT 1 FROM public.provider_profiles WHERE user_id = auth.uid())');
    definition := replace(definition, 'public.current_user_role() = ''requester''', 'public.current_user_role() = ''user''');
    definition := replace(definition, 'public.current_user_role() <> ''requester''', 'public.current_user_role() NOT IN (''user'', ''admin'')');
    definition := replace(definition, 'public.current_user_role() NOT IN (''requester'', ''craftsman'')', 'public.current_user_role() NOT IN (''user'', ''admin'')');
    EXECUTE definition;
  END LOOP;
END $functions$;

DROP POLICY requests_insert_requester ON public.requests;
CREATE POLICY requests_insert_requester ON public.requests FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid() AND status = 'draft');
DROP POLICY matches_insert_requester ON public.matches;
CREATE POLICY matches_insert_requester ON public.matches FOR INSERT TO authenticated WITH CHECK (status = 'pending' AND EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.requester_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = craftsman_id));
DROP POLICY applications_insert_craftsman ON public.applications;
CREATE POLICY applications_insert_craftsman ON public.applications FOR INSERT TO authenticated WITH CHECK (status = 'pending' AND EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = craftsman_id AND p.user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.status IN ('structured','matching','quoted')));
DROP POLICY estimates_insert_craftsman ON public.estimates;
CREATE POLICY estimates_insert_craftsman ON public.estimates FOR INSERT TO authenticated WITH CHECK (status = 'pending' AND EXISTS (SELECT 1 FROM public.provider_profiles p WHERE p.id = craftsman_id AND p.user_id = auth.uid()) AND EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.status IN ('structured','matching','quoted')));
DROP POLICY portfolio_storage_craftsman_insert ON storage.objects;
CREATE POLICY portfolio_storage_craftsman_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text AND EXISTS (SELECT 1 FROM public.provider_profiles WHERE user_id = auth.uid()));
DROP POLICY portfolio_storage_craftsman_delete ON storage.objects;
CREATE POLICY portfolio_storage_craftsman_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE TABLE public.provider_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id), type TEXT NOT NULL CHECK (type IN ('license','permit','insurance','training','other')),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 200), document_url TEXT,
  status TEXT NOT NULL DEFAULT 'unsubmitted' CHECK (status IN ('unsubmitted','pending','approved','rejected')),
  reviewed_by UUID REFERENCES public.profiles(id), reviewed_at TIMESTAMPTZ, note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (provider_user_id, category_id, name)
);
ALTER TABLE public.provider_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY provider_verifications_read ON public.provider_verifications FOR SELECT TO authenticated USING (provider_user_id = auth.uid() OR public.is_admin());
CREATE POLICY provider_verifications_insert ON public.provider_verifications FOR INSERT TO authenticated WITH CHECK (provider_user_id = auth.uid() AND status IN ('unsubmitted','pending') AND reviewed_by IS NULL AND reviewed_at IS NULL AND note IS NULL AND (document_url IS NULL OR (document_url LIKE auth.uid()::text || '/%' AND document_url !~ '(^|/)\.\.?(/|$)')));
CREATE POLICY provider_verifications_resubmit ON public.provider_verifications FOR UPDATE TO authenticated USING (provider_user_id = auth.uid() AND status IN ('unsubmitted','rejected')) WITH CHECK (provider_user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND note IS NULL AND (document_url IS NULL OR (document_url LIKE auth.uid()::text || '/%' AND document_url !~ '(^|/)\.\.?(/|$)')));
CREATE POLICY provider_verifications_admin_update ON public.provider_verifications FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE FUNCTION public.protect_verification_identity() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.provider_user_id IS DISTINCT FROM OLD.provider_user_id OR NEW.category_id IS DISTINCT FROM OLD.category_id OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Verification identity cannot be changed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER provider_verifications_protect BEFORE UPDATE ON public.provider_verifications FOR EACH ROW EXECUTE FUNCTION public.protect_verification_identity();

CREATE TABLE public.category_verification_requirements (
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('license','permit','insurance','training','other')),
  PRIMARY KEY (category_id, type)
);
INSERT INTO public.category_verification_requirements(category_id,type)
SELECT id, requirement FROM public.categories CROSS JOIN LATERAL unnest(CASE slug WHEN 'beauty' THEN ARRAY['license','permit'] WHEN 'babysitting' THEN ARRAY['permit','insurance'] WHEN 'food' THEN ARRAY['permit','training'] ELSE ARRAY[]::TEXT[] END) requirement;
ALTER TABLE public.category_verification_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY category_requirements_read ON public.category_verification_requirements FOR SELECT USING (true);
CREATE POLICY category_requirements_admin ON public.category_verification_requirements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT ON public.category_verification_requirements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.category_verification_requirements TO authenticated;

CREATE FUNCTION public.provider_verified_categories(target_user_id UUID)
RETURNS TABLE(category_id UUID) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id FROM public.categories c WHERE EXISTS (SELECT 1 FROM public.provider_verifications pv WHERE pv.provider_user_id = target_user_id AND pv.category_id = c.id AND pv.status = 'approved')
    AND NOT EXISTS (SELECT 1 FROM public.category_verification_requirements req WHERE req.category_id = c.id AND NOT EXISTS (SELECT 1 FROM public.provider_verifications pv WHERE pv.provider_user_id = target_user_id AND pv.category_id = c.id AND pv.type = req.type AND pv.status = 'approved'))
$$;
REVOKE ALL ON FUNCTION public.provider_verified_categories(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_verified_categories(UUID) TO anon, authenticated;

CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id), fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('booking','order')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200), description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 5000),
  price_basis TEXT NOT NULL CHECK (price_basis IN ('fixed','hourly','consultation')), price INTEGER CHECK (price BETWEEN 0 AND 1000000000),
  service_areas TEXT[] NOT NULL DEFAULT '{}', location TEXT, coordinates JSONB, availability JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','paused','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.listing_owner(target_provider UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.provider_profiles WHERE id = target_provider AND user_id = auth.uid())
$$;
CREATE FUNCTION public.listing_allowed(target_provider UUID, target_category UUID, target_type TEXT) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.categories c JOIN public.provider_profiles p ON p.id = target_provider
    WHERE c.id = target_category AND c.is_public AND target_type = ANY(c.supported_fulfillment_types)
    AND (NOT c.requires_verification OR EXISTS (SELECT 1 FROM public.provider_verified_categories(p.user_id) verified WHERE verified.category_id = c.id)))
$$;
REVOKE ALL ON FUNCTION public.listing_owner(UUID), public.listing_allowed(UUID,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listing_owner(UUID), public.listing_allowed(UUID,UUID,TEXT) TO anon, authenticated;
CREATE POLICY listings_read ON public.listings FOR SELECT USING ((status = 'published' AND public.listing_allowed(provider_id, category_id, fulfillment_type)) OR public.listing_owner(provider_id) OR public.is_admin());
CREATE POLICY listings_insert ON public.listings FOR INSERT TO authenticated WITH CHECK (public.listing_owner(provider_id) AND public.listing_allowed(provider_id, category_id, fulfillment_type));
CREATE POLICY listings_update ON public.listings FOR UPDATE TO authenticated USING (public.listing_owner(provider_id) OR public.is_admin()) WITH CHECK (public.is_admin() OR (public.listing_owner(provider_id) AND (status <> 'published' OR public.listing_allowed(provider_id, category_id, fulfillment_type))));
CREATE POLICY listings_delete ON public.listings FOR DELETE TO authenticated USING (public.listing_owner(provider_id) OR public.is_admin());
CREATE POLICY listing_images_read ON public.listing_images FOR SELECT USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id));
CREATE POLICY listing_images_write ON public.listing_images FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (public.listing_owner(l.provider_id) OR public.is_admin()))) WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (public.listing_owner(l.provider_id) OR public.is_admin())));
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), listing_id UUID NOT NULL REFERENCES public.listings(id),
  customer_id UUID NOT NULL REFERENCES public.profiles(id), provider_user_id UUID NOT NULL REFERENCES public.profiles(id),
  scheduled_start TIMESTAMPTZ NOT NULL, scheduled_end TIMESTAMPTZ NOT NULL CHECK (scheduled_end > scheduled_start),
  place_type TEXT NOT NULL DEFAULT 'provider' CHECK (place_type IN ('provider','customer','online')), place_note TEXT,
  amount INTEGER CHECK (amount BETWEEN 0 AND 1000000000), status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','accepted','cancelled_by_customer','cancelled_by_provider','completed','reviewed')),
  cancel_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CHECK (customer_id <> provider_user_id)
);
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), listing_id UUID REFERENCES public.listings(id), customer_id UUID NOT NULL REFERENCES public.profiles(id),
  provider_profile_id UUID REFERENCES public.provider_profiles(id), title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 5000), specification JSONB,
  status TEXT NOT NULL DEFAULT 'consulting' CHECK (status IN ('consulting','quoted','ordered','in_progress','delivered','accepted','completed','cancelled')),
  cancel_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.booking_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id), text TEXT NOT NULL CHECK (char_length(trim(text)) BETWEEN 1 AND 5000),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(attachments) = 'array' AND jsonb_array_length(attachments) <= 10),
  read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id), text TEXT NOT NULL CHECK (char_length(trim(text)) BETWEEN 1 AND 5000),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(attachments) = 'array' AND jsonb_array_length(attachments) <= 10),
  read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.validate_booking_slot() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.provider_user_id::text, 1));
  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.provider_user_id = NEW.provider_user_id AND b.status IN ('requested','accepted') AND b.scheduled_start < NEW.scheduled_end AND b.scheduled_end > NEW.scheduled_start) THEN
    RAISE EXCEPTION 'The selected time is unavailable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_validate_slot BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.validate_booking_slot();
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.order_participant(target_order UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders o LEFT JOIN public.provider_profiles p ON p.id = o.provider_profile_id WHERE o.id = target_order AND (o.customer_id = auth.uid() OR p.user_id = auth.uid()))
$$;
REVOKE ALL ON FUNCTION public.order_participant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_participant(UUID) TO authenticated;
CREATE POLICY bookings_read ON public.bookings FOR SELECT TO authenticated USING (customer_id = auth.uid() OR provider_user_id = auth.uid() OR public.is_admin());
CREATE POLICY bookings_insert ON public.bookings FOR INSERT TO authenticated WITH CHECK (
  customer_id = auth.uid() AND status = 'requested' AND cancel_reason IS NULL AND scheduled_start > now() AND EXISTS (
    SELECT 1 FROM public.listings l JOIN public.provider_profiles p ON p.id = l.provider_id JOIN public.categories c ON c.id = l.category_id
    WHERE l.id = listing_id AND l.status = 'published' AND l.fulfillment_type = 'booking' AND p.user_id = provider_user_id
      AND p.user_id <> auth.uid() AND amount IS NOT DISTINCT FROM l.price AND c.is_public
      AND public.listing_allowed(l.provider_id, l.category_id, l.fulfillment_type)
  ));
CREATE POLICY bookings_update ON public.bookings FOR UPDATE TO authenticated USING (customer_id = auth.uid() OR provider_user_id = auth.uid() OR public.is_admin()) WITH CHECK (customer_id = auth.uid() OR provider_user_id = auth.uid() OR public.is_admin());
CREATE POLICY orders_read ON public.orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR public.listing_owner(provider_profile_id) OR public.is_admin());
CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated WITH CHECK (
  customer_id = auth.uid() AND status = 'consulting' AND cancel_reason IS NULL AND
  (provider_profile_id IS NULL OR NOT public.listing_owner(provider_profile_id)) AND
  (listing_id IS NULL OR EXISTS (SELECT 1 FROM public.listings l JOIN public.categories c ON c.id = l.category_id WHERE l.id = listing_id AND l.provider_id = provider_profile_id AND l.status = 'published' AND l.fulfillment_type = 'order' AND c.is_public AND public.listing_allowed(l.provider_id,l.category_id,l.fulfillment_type)))
);
CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated USING (customer_id = auth.uid() OR public.listing_owner(provider_profile_id) OR public.is_admin()) WITH CHECK (customer_id = auth.uid() OR public.listing_owner(provider_profile_id) OR public.is_admin());
CREATE POLICY booking_messages_read ON public.booking_messages FOR SELECT TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND auth.uid() IN (b.customer_id,b.provider_user_id)));
CREATE POLICY booking_messages_insert ON public.booking_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND read_at IS NULL AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND auth.uid() IN (b.customer_id,b.provider_user_id)));
CREATE POLICY booking_messages_update ON public.booking_messages FOR UPDATE TO authenticated USING (sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND auth.uid() IN (b.customer_id,b.provider_user_id))) WITH CHECK (sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND auth.uid() IN (b.customer_id,b.provider_user_id)));
CREATE POLICY order_messages_read ON public.order_messages FOR SELECT TO authenticated USING (public.is_admin() OR public.order_participant(order_id));
CREATE POLICY order_messages_insert ON public.order_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND read_at IS NULL AND public.order_participant(order_id));
CREATE POLICY order_messages_update ON public.order_messages FOR UPDATE TO authenticated USING (sender_id <> auth.uid() AND public.order_participant(order_id)) WITH CHECK (sender_id <> auth.uid() AND public.order_participant(order_id));

CREATE FUNCTION public.protect_trade_fields() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'bookings' THEN
    IF (to_jsonb(NEW) - ARRAY['status','cancel_reason','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','cancel_reason','updated_at']) THEN
      RAISE EXCEPTION 'Booking fields cannot be changed';
    END IF;
  ELSE
    IF (to_jsonb(NEW) - ARRAY['status','cancel_reason','updated_at','provider_profile_id']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','cancel_reason','updated_at','provider_profile_id']) THEN
      RAISE EXCEPTION 'Order fields cannot be changed';
    END IF;
    IF NEW.provider_profile_id IS DISTINCT FROM OLD.provider_profile_id AND (COALESCE(current_setting('app.assign_order_provider', true), '') <> 'on' OR current_user <> pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = TG_RELID))) THEN
      RAISE EXCEPTION 'Provider assignment requires an authorized workflow';
    END IF;
  END IF;
  IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason)
    AND (COALESCE(current_setting('app.trade_status', true), '') <> 'on' OR current_user <> pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid = TG_RELID))) THEN
    RAISE EXCEPTION 'Trade status changes require an authorized workflow';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_protect BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.protect_trade_fields();
CREATE TRIGGER orders_protect BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.protect_trade_fields();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE FUNCTION public.protect_trade_message() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (to_jsonb(NEW) - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'read_at') THEN RAISE EXCEPTION 'Only read state can be changed'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER booking_messages_protect BEFORE UPDATE ON public.booking_messages FOR EACH ROW EXECUTE FUNCTION public.protect_trade_message();
CREATE TRIGGER order_messages_protect BEFORE UPDATE ON public.order_messages FOR EACH ROW EXECUTE FUNCTION public.protect_trade_message();

CREATE FUNCTION public.update_booking_status(target_booking_id UUID, next_status TEXT, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trade public.bookings%ROWTYPE; allowed BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO trade FROM public.bookings WHERE id = target_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF next_status = 'accepted' THEN allowed := trade.status = 'requested' AND trade.provider_user_id = auth.uid();
  ELSIF next_status = 'completed' THEN allowed := trade.status = 'accepted' AND auth.uid() IN (trade.customer_id,trade.provider_user_id) AND trade.scheduled_end <= now();
  ELSIF next_status = 'cancelled_by_customer' THEN allowed := trade.status IN ('requested','accepted') AND trade.customer_id = auth.uid() AND trade.scheduled_start > now();
  ELSIF next_status = 'cancelled_by_provider' THEN allowed := trade.status IN ('requested','accepted') AND trade.provider_user_id = auth.uid() AND trade.scheduled_start > now();
  END IF;
  IF NOT COALESCE(allowed,false) THEN RAISE EXCEPTION 'Invalid booking transition'; END IF;
  PERFORM set_config('app.trade_status','on',true);
  UPDATE public.bookings SET status = next_status, cancel_reason = CASE WHEN next_status LIKE 'cancelled%' THEN left(reason,1000) ELSE NULL END WHERE id = target_booking_id;
  PERFORM set_config('app.trade_status','off',true);
  IF next_status = 'completed' THEN
    PERFORM set_config('app.reputation_update','on',true);
    UPDATE public.provider_profiles SET completed_orders = COALESCE(completed_orders,0) + 1 WHERE user_id = trade.provider_user_id;
    PERFORM set_config('app.reputation_update','off',true);
  END IF;
  RETURN true;
END $$;

CREATE TABLE public.order_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id),
  provider_user_id UUID NOT NULL REFERENCES public.profiles(id), amount INTEGER NOT NULL CHECK (amount BETWEEN 0 AND 1000000000),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 5000), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_quotes_read ON public.order_quotes FOR SELECT TO authenticated USING (public.order_participant(order_id) OR public.is_admin());
CREATE FUNCTION public.validate_order_quote() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trade public.orders%ROWTYPE; owner UUID;
BEGIN
  SELECT * INTO trade FROM public.orders WHERE id = NEW.order_id FOR UPDATE;
  SELECT user_id INTO owner FROM public.provider_profiles WHERE id = trade.provider_profile_id;
  IF trade.status IS DISTINCT FROM 'consulting' OR owner IS DISTINCT FROM auth.uid() OR NEW.provider_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned provider can quote a consulting order';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_quotes_validate BEFORE INSERT ON public.order_quotes FOR EACH ROW EXECUTE FUNCTION public.validate_order_quote();
CREATE POLICY order_quotes_insert ON public.order_quotes FOR INSERT TO authenticated WITH CHECK (provider_user_id = auth.uid() AND public.order_participant(order_id));
GRANT SELECT, INSERT ON public.order_quotes TO authenticated;

CREATE FUNCTION public.update_order_status(target_order_id UUID, next_status TEXT, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trade public.orders%ROWTYPE; provider_user UUID; allowed BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO trade FROM public.orders WHERE id = target_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT user_id INTO provider_user FROM public.provider_profiles WHERE id = trade.provider_profile_id;
  IF next_status = 'quoted' THEN allowed := trade.status = 'consulting' AND provider_user = auth.uid() AND EXISTS (SELECT 1 FROM public.order_quotes q WHERE q.order_id = trade.id AND q.provider_user_id = provider_user);
  ELSIF next_status = 'ordered' THEN allowed := trade.status = 'quoted' AND trade.customer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.order_quotes q WHERE q.order_id = trade.id AND q.provider_user_id = provider_user);
  ELSIF next_status = 'in_progress' THEN allowed := trade.status = 'ordered' AND provider_user = auth.uid();
  ELSIF next_status = 'delivered' THEN allowed := trade.status = 'in_progress' AND provider_user = auth.uid();
  ELSIF next_status IN ('accepted','completed') THEN allowed := trade.status = 'delivered' AND trade.customer_id = auth.uid();
  ELSIF next_status = 'cancelled' THEN allowed := trade.status IN ('consulting','quoted','ordered','in_progress','delivered') AND (auth.uid() IN (trade.customer_id,provider_user) OR public.is_admin());
  END IF;
  IF NOT COALESCE(allowed,false) THEN RAISE EXCEPTION 'Invalid order transition'; END IF;
  IF next_status = 'accepted' THEN next_status := 'completed'; END IF;
  PERFORM set_config('app.trade_status','on',true);
  UPDATE public.orders SET status = next_status, cancel_reason = CASE WHEN next_status = 'cancelled' THEN left(reason,1000) ELSE NULL END WHERE id = target_order_id;
  PERFORM set_config('app.trade_status','off',true);
  IF next_status = 'completed' THEN
    PERFORM set_config('app.reputation_update','on',true);
    UPDATE public.provider_profiles SET completed_orders = COALESCE(completed_orders,0) + 1 WHERE id = trade.provider_profile_id;
    PERFORM set_config('app.reputation_update','off',true);
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.update_booking_status(UUID,TEXT,TEXT), public.update_order_status(UUID,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_booking_status(UUID,TEXT,TEXT), public.update_order_status(UUID,TEXT,TEXT) TO authenticated;

ALTER TABLE public.reviews ALTER COLUMN transaction_id DROP NOT NULL;
ALTER TABLE public.reviews ADD COLUMN booking_id UUID REFERENCES public.bookings(id), ADD COLUMN order_id UUID REFERENCES public.orders(id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_one_trade CHECK (num_nonnulls(transaction_id, booking_id, order_id) = 1);
CREATE UNIQUE INDEX reviews_booking_reviewer_key ON public.reviews(booking_id,reviewer_id) WHERE booking_id IS NOT NULL;
CREATE UNIQUE INDEX reviews_order_reviewer_key ON public.reviews(order_id,reviewer_id) WHERE order_id IS NOT NULL;
CREATE FUNCTION public.create_trade_review(trade_type TEXT, trade_id UUID, review_rating INTEGER, review_comment TEXT DEFAULT '', review_categories JSONB DEFAULT '{}'::jsonb)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE customer UUID; provider UUID; provider_id UUID; recipient UUID; result UUID; trade_status TEXT;
BEGIN
  IF auth.uid() IS NULL OR review_rating NOT BETWEEN 1 AND 5 OR length(COALESCE(review_comment,'')) > 5000 OR jsonb_typeof(review_categories) <> 'object' THEN RAISE EXCEPTION 'Invalid review'; END IF;
  IF trade_type = 'booking' THEN
    SELECT b.customer_id,b.provider_user_id,b.status,p.id INTO customer,provider,trade_status,provider_id FROM public.bookings b JOIN public.provider_profiles p ON p.user_id = b.provider_user_id WHERE b.id = trade_id FOR UPDATE OF b;
  ELSIF trade_type = 'order' THEN
    SELECT o.customer_id,p.user_id,o.status,p.id INTO customer,provider,trade_status,provider_id FROM public.orders o JOIN public.provider_profiles p ON p.id = o.provider_profile_id WHERE o.id = trade_id FOR UPDATE OF o;
  ELSE RAISE EXCEPTION 'Invalid trade type'; END IF;
  IF customer IS NULL OR provider IS NULL OR trade_status NOT IN ('completed','reviewed') OR auth.uid() NOT IN (customer,provider) THEN RAISE EXCEPTION 'Review is restricted to completed trade participants'; END IF;
  recipient := CASE WHEN auth.uid() = customer THEN provider ELSE customer END;
  INSERT INTO public.reviews (booking_id,order_id,reviewer_id,reviewee_id,rating,comment,categories)
  VALUES (CASE WHEN trade_type = 'booking' THEN trade_id END, CASE WHEN trade_type = 'order' THEN trade_id END, auth.uid(),recipient,review_rating,left(COALESCE(review_comment,''),5000),review_categories) RETURNING id INTO result;
  IF recipient = provider THEN
    PERFORM set_config('app.reputation_update','on',true);
    UPDATE public.provider_profiles SET review_count = (SELECT count(*) FROM public.reviews WHERE reviewee_id = provider), rating = (SELECT round(avg(rating)::numeric,1) FROM public.reviews WHERE reviewee_id = provider) WHERE id = provider_id;
    PERFORM set_config('app.reputation_update','off',true);
  END IF;
  IF trade_type = 'booking' AND trade_status = 'completed' THEN
    PERFORM set_config('app.trade_status','on',true);
    UPDATE public.bookings SET status = 'reviewed' WHERE id = trade_id;
    PERFORM set_config('app.trade_status','off',true);
  END IF;
  INSERT INTO public.notifications(user_id,type,title,body) VALUES (recipient,'review','新しいレビュー','取引完了後のレビューが届きました。');
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_trade_review(TEXT,UUID,INTEGER,TEXT,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_trade_review(TEXT,UUID,INTEGER,TEXT,JSONB) TO authenticated;

CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id,listing_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY favorites_own ON public.favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status = 'published'));
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('listing','profile','booking','order','message','review')), target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('illegal','fraud','harassment','adult','off_platform_payment','other')),
  details TEXT CHECK (char_length(details) <= 5000), status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','actioned','dismissed')),
  handled_by UUID REFERENCES public.profiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status = 'open' AND handled_by IS NULL);
CREATE POLICY reports_admin ON public.reports FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY reports_admin_update ON public.reports FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES
  ('listing-images','listing-images',true,8388608,ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('verifications','verifications',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
CREATE POLICY listing_storage_read ON storage.objects FOR SELECT USING (bucket_id = 'listing-images');
CREATE POLICY listing_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text AND EXISTS (SELECT 1 FROM public.provider_profiles WHERE user_id = auth.uid()));
CREATE POLICY listing_storage_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'listing-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY verification_storage_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'verifications' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
CREATE POLICY verification_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'verifications' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY verification_storage_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'verifications' AND (storage.foldername(name))[1] = auth.uid()::text);

GRANT SELECT ON public.categories, public.provider_profiles, public.provider_skills, public.listings, public.listing_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories, public.provider_profiles, public.provider_skills, public.listings, public.listing_images TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bookings, public.orders, public.booking_messages, public.order_messages, public.provider_verifications, public.reports TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT EXECUTE ON FUNCTION public.listing_owner(UUID) TO anon;
CREATE INDEX listings_category_status_idx ON public.listings(category_id,status,created_at DESC);
CREATE INDEX bookings_customer_idx ON public.bookings(customer_id,created_at DESC);
CREATE INDEX bookings_provider_idx ON public.bookings(provider_user_id,created_at DESC);
CREATE INDEX orders_customer_idx ON public.orders(customer_id,created_at DESC);
CREATE INDEX orders_provider_idx ON public.orders(provider_profile_id,created_at DESC);
CREATE INDEX booking_messages_thread_idx ON public.booking_messages(booking_id,created_at);
CREATE INDEX order_messages_thread_idx ON public.order_messages(order_id,created_at);

CREATE FUNCTION public.submit_order_quote(target_order_id UUID, quote_amount INTEGER, quote_description TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.order_quotes(order_id,provider_user_id,amount,description)
  VALUES (target_order_id,auth.uid(),quote_amount,quote_description) RETURNING id INTO result;
  PERFORM public.update_order_status(target_order_id,'quoted',NULL);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.submit_order_quote(UUID,INTEGER,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_order_quote(UUID,INTEGER,TEXT) TO authenticated;

CREATE FUNCTION public.toggle_listing_favorite(target_listing_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || target_listing_id::text,0));
  DELETE FROM public.favorites WHERE user_id = auth.uid() AND listing_id = target_listing_id;
  IF FOUND THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.listings l JOIN public.categories c ON c.id = l.category_id WHERE l.id = target_listing_id AND l.status = 'published' AND c.is_public) THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
  INSERT INTO public.favorites(user_id,listing_id) VALUES (auth.uid(),target_listing_id);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.toggle_listing_favorite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_listing_favorite(UUID) TO authenticated;

CREATE FUNCTION public.assign_order_provider(target_order_id UUID, target_provider_profile_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trade public.orders%ROWTYPE; provider_user UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO trade FROM public.orders WHERE id = target_order_id FOR UPDATE;
  SELECT user_id INTO provider_user FROM public.provider_profiles WHERE id = target_provider_profile_id;
  IF trade.customer_id IS DISTINCT FROM auth.uid() OR trade.status IS DISTINCT FROM 'consulting' OR trade.listing_id IS NOT NULL OR trade.provider_profile_id IS NOT NULL OR provider_user IS NULL OR provider_user = auth.uid() THEN
    RAISE EXCEPTION 'Invalid provider assignment';
  END IF;
  PERFORM set_config('app.assign_order_provider','on',true);
  UPDATE public.orders SET provider_profile_id = target_provider_profile_id WHERE id = target_order_id;
  PERFORM set_config('app.assign_order_provider','off',true);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.assign_order_provider(UUID,UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_order_provider(UUID,UUID) TO authenticated;
