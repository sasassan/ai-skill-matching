ALTER TABLE public.craftsman_profiles
  ADD COLUMN IF NOT EXISTS prefecture TEXT,
  ADD COLUMN IF NOT EXISTS service_areas TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coordinates JSONB,
  ADD COLUMN IF NOT EXISTS materials TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS qualifications TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_years TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS special_skills_note TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS craftsman_profiles_user_id_key
  ON public.craftsman_profiles(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS identity_verifications_user_id_key
  ON public.identity_verifications(user_id);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS matches_request_craftsman_key
  ON public.matches(request_id, craftsman_id);
CREATE UNIQUE INDEX IF NOT EXISTS specifications_request_id_key
  ON public.specifications(request_id);
CREATE UNIQUE INDEX IF NOT EXISTS applications_request_craftsman_key
  ON public.applications(request_id, craftsman_id);

CREATE TABLE IF NOT EXISTS public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  craftsman_id UUID NOT NULL REFERENCES public.craftsman_profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  tax INTEGER NOT NULL CHECK (tax >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  description TEXT NOT NULL,
  notes TEXT,
  valid_until TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_score_range;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_score_range CHECK (score BETWEEN 0 AND 100);
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_estimated_amount_nonnegative;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_estimated_amount_nonnegative CHECK (estimated_amount IS NULL OR estimated_amount BETWEEN 0 AND 1000000000);
ALTER TABLE public.estimates DROP CONSTRAINT IF EXISTS estimates_amounts_consistent;
ALTER TABLE public.estimates
  ADD CONSTRAINT estimates_amounts_consistent CHECK (subtotal BETWEEN 0 AND 1000000000 AND tax BETWEEN 0 AND 1000000000 AND total BETWEEN 0 AND 1000000000 AND total = subtotal + tax AND jsonb_typeof(items) = 'array');
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_text_length;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_text_length CHECK (char_length(text) BETWEEN 1 AND 5000);
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_attachments_limit;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_attachments_limit CHECK (jsonb_typeof(attachments) = 'array' AND jsonb_array_length(attachments) <= 10);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('contracted', 'in_progress', 'delivered', 'completed')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.estimates TO authenticated;
GRANT SELECT ON public.transaction_events TO authenticated;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS categories JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS reviews_transaction_reviewer_key
  ON public.reviews(transaction_id, reviewer_id);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'system'
  CHECK (type IN ('request', 'estimate', 'message', 'review', 'ai', 'system'));

ALTER TABLE public.identity_verifications
  ALTER COLUMN user_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = 'admin', false)
$$;

CREATE OR REPLACE FUNCTION public.craftsman_can_access_request(target_request_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $access$
  SELECT COALESCE(
    public.current_user_role() = 'craftsman' AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = target_request_id AND (
        r.status IN ('structured', 'matching') OR
        EXISTS (SELECT 1 FROM public.matches m JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id WHERE m.request_id = r.id AND cp.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.applications a JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id WHERE a.request_id = r.id AND cp.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.transactions t JOIN public.craftsman_profiles cp ON cp.id = t.craftsman_id WHERE t.request_id = r.id AND cp.user_id = auth.uid())
      )
    ), false
  )
$access$;
REVOKE ALL ON FUNCTION public.craftsman_can_access_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.craftsman_can_access_request(UUID) TO authenticated;

DROP POLICY IF EXISTS "matches_insert_requester" ON public.matches;
CREATE POLICY "matches_insert_requester" ON public.matches
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'requester' AND status = 'pending' AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id
    )
  );

CREATE OR REPLACE FUNCTION public.protect_profile_trusted_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF (NEW.role NOT IN ('requester', 'craftsman') OR COALESCE(NEW.verified, false))
      AND NOT public.is_admin()
      AND COALESCE(auth.role(), '') <> 'service_role' THEN
      RAISE EXCEPTION 'Trusted profile fields can only be assigned by an administrator';
    END IF;
  ELSIF (NEW.role IS DISTINCT FROM OLD.role OR NEW.verified IS DISTINCT FROM OLD.verified)
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Trusted profile fields can only be changed by an administrator';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_trusted_fields ON public.profiles;
CREATE TRIGGER profiles_protect_trusted_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_trusted_fields();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
  display_name TEXT;
BEGIN
  requested_role := NEW.raw_user_meta_data ->> 'role';
  IF requested_role IS NULL OR requested_role NOT IN ('requester', 'craftsman') THEN
    requested_role := 'requester';
  END IF;
  display_name := NULLIF(left(trim(COALESCE(NEW.raw_user_meta_data ->> 'name', '')), 120), '');
  INSERT INTO public.profiles (id, role, name)
  VALUES (NEW.id, requested_role, COALESCE(display_name, 'ユーザー'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

DROP POLICY IF EXISTS "profiles_select_own_or_public" ON public.profiles;
CREATE POLICY "profiles_select_own_or_public" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id AND role IN ('requester', 'craftsman'));

DROP POLICY IF EXISTS "requests_insert_requester" ON public.requests;
CREATE POLICY "requests_insert_requester" ON public.requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid() AND public.current_user_role() = 'requester' AND status = 'draft'
  );

DROP POLICY IF EXISTS "requests_select" ON public.requests;
CREATE POLICY "requests_select" ON public.requests
  FOR SELECT USING (
    requester_id = auth.uid() OR public.is_admin() OR public.craftsman_can_access_request(public.requests.id)
  );

DROP POLICY IF EXISTS "requests_update_requester" ON public.requests;
CREATE POLICY "requests_update_requester" ON public.requests
  FOR UPDATE USING (auth.uid() = requester_id)
  WITH CHECK (auth.uid() = requester_id);

CREATE OR REPLACE FUNCTION public.protect_request_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $request$
BEGIN
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'The request owner cannot be changed';
  END IF;
  IF (NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description OR NEW.image_url IS DISTINCT FROM OLD.image_url)
    AND OLD.status <> 'draft'
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Request content cannot be changed after structuring';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND COALESCE(current_setting('app.transaction_status', true), '') <> 'on'
    AND NOT (OLD.status = 'draft' AND NEW.status = 'structured'
      AND OLD.requester_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.specifications s WHERE s.request_id = OLD.id)) THEN
    RAISE EXCEPTION 'Request status changes must use an authorized workflow';
  END IF;
  RETURN NEW;
END;
$request$;

DROP TRIGGER IF EXISTS requests_protect_fields ON public.requests;
CREATE TRIGGER requests_protect_fields
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_request_fields();

CREATE OR REPLACE FUNCTION public.protect_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $message$
BEGIN
  IF (NEW.request_id IS DISTINCT FROM OLD.request_id
      OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
      OR NEW.text IS DISTINCT FROM OLD.text
      OR NEW.attachments IS DISTINCT FROM OLD.attachments
      OR NEW.created_at IS DISTINCT FROM OLD.created_at)
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Only the message read state can be updated';
  END IF;
  RETURN NEW;
END;
$message$;

DROP TRIGGER IF EXISTS messages_protect_content ON public.messages;
CREATE TRIGGER messages_protect_content
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.protect_message_content();

DROP POLICY IF EXISTS "specifications_select" ON public.specifications;
CREATE POLICY "specifications_select" ON public.specifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR public.is_admin() OR
        EXISTS (SELECT 1 FROM public.matches m JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id WHERE m.request_id = r.id AND cp.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.applications a JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id WHERE a.request_id = r.id AND cp.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.transactions t JOIN public.craftsman_profiles cp ON cp.id = t.craftsman_id WHERE t.request_id = r.id AND cp.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "specifications_update_requester" ON public.specifications;
CREATE POLICY "specifications_update_requester" ON public.specifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
        AND r.status IN ('draft', 'structured')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
        AND r.status IN ('draft', 'structured')
    )
  );

DROP POLICY IF EXISTS "messages_update_participant" ON public.messages;
CREATE POLICY "messages_update_participant" ON public.messages
  FOR UPDATE USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.matches m JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id WHERE m.request_id = r.id AND cp.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.applications a JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id WHERE a.request_id = r.id AND cp.user_id = auth.uid())
      )
    )
  ) WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.matches m JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id WHERE m.request_id = r.id AND cp.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.applications a JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id WHERE a.request_id = r.id AND cp.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.matches m
          JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id
          WHERE m.request_id = r.id AND cp.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.applications a
          JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id
          WHERE a.request_id = r.id AND cp.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.matches m
          JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id
          WHERE m.request_id = r.id AND cp.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.applications a
          JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id
          WHERE a.request_id = r.id AND cp.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "applications_insert_craftsman" ON public.applications;
CREATE POLICY "applications_insert_craftsman" ON public.applications
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'craftsman' AND status = 'pending' AND EXISTS (
      SELECT 1 FROM public.craftsman_profiles cp
      WHERE cp.id = craftsman_id AND cp.user_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.status IN ('structured', 'matching')
    )
  );

DROP POLICY IF EXISTS "craftsman_profiles_insert_own" ON public.craftsman_profiles;
CREATE POLICY "craftsman_profiles_insert_own" ON public.craftsman_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND public.current_user_role() = 'craftsman'
  );

DROP POLICY IF EXISTS "craftsman_profiles_update_own" ON public.craftsman_profiles;
CREATE POLICY "craftsman_profiles_update_own" ON public.craftsman_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.current_user_role() = 'craftsman');

CREATE OR REPLACE FUNCTION public.protect_craftsman_profile_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT public.is_admin() AND COALESCE(auth.role(), '') <> 'service_role' THEN
    NEW.rating := 0;
    NEW.review_count := 0;
    NEW.completed_orders := 0;
  ELSIF TG_OP = 'UPDATE' AND (NEW.rating IS DISTINCT FROM OLD.rating
      OR NEW.review_count IS DISTINCT FROM OLD.review_count
      OR NEW.completed_orders IS DISTINCT FROM OLD.completed_orders)
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND COALESCE(current_setting('app.reputation_update', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Craftsman reputation fields can only be changed by trusted workflows';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS craftsman_profiles_protect_metrics ON public.craftsman_profiles;
CREATE TRIGGER craftsman_profiles_protect_metrics
  BEFORE INSERT OR UPDATE ON public.craftsman_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_craftsman_profile_metrics();

DROP POLICY IF EXISTS "identity_verifications_update_admin" ON public.identity_verifications;
CREATE POLICY "identity_verifications_update_admin" ON public.identity_verifications
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "estimates_select_participant" ON public.estimates;
CREATE POLICY "estimates_select_participant" ON public.estimates
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.requester_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.craftsman_profiles cp
      WHERE cp.id = craftsman_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "estimates_insert_craftsman" ON public.estimates;
CREATE POLICY "estimates_insert_craftsman" ON public.estimates
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'craftsman' AND status = 'pending' AND EXISTS (
      SELECT 1 FROM public.craftsman_profiles cp
      WHERE cp.id = craftsman_id AND cp.user_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.status IN ('structured', 'matching')
    )
  );

DROP POLICY IF EXISTS "estimates_update_participant" ON public.estimates;
DROP POLICY IF EXISTS "estimates_update_admin" ON public.estimates;
CREATE POLICY "estimates_update_admin" ON public.estimates
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE UNIQUE INDEX IF NOT EXISTS transactions_request_id_key
  ON public.transactions(request_id);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_estimate_id_key
  ON public.transactions(estimate_id) WHERE estimate_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_estimate_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $estimate$
BEGIN
  IF (NEW.request_id IS DISTINCT FROM OLD.request_id
      OR NEW.craftsman_id IS DISTINCT FROM OLD.craftsman_id
      OR NEW.items IS DISTINCT FROM OLD.items
      OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
      OR NEW.tax IS DISTINCT FROM OLD.tax
      OR NEW.total IS DISTINCT FROM OLD.total
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.notes IS DISTINCT FROM OLD.notes
      OR NEW.valid_until IS DISTINCT FROM OLD.valid_until
      OR NEW.created_at IS DISTINCT FROM OLD.created_at)
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Estimate contents cannot be changed after submission';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND COALESCE(current_setting('app.accept_estimate', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Estimate status changes must use the accept_estimate action';
  END IF;
  RETURN NEW;
END;
$estimate$;

DROP TRIGGER IF EXISTS estimates_protect_fields ON public.estimates;
CREATE TRIGGER estimates_protect_fields
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.protect_estimate_fields();

CREATE OR REPLACE FUNCTION public.accept_estimate(target_estimate_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $accept$
DECLARE
  selected_estimate public.estimates%ROWTYPE;
  new_transaction_id UUID;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() <> 'requester' THEN
    RAISE EXCEPTION 'Only the authenticated requester can accept an estimate';
  END IF;

  SELECT e.* INTO selected_estimate
  FROM public.estimates e
  JOIN public.requests r ON r.id = e.request_id
  WHERE e.id = target_estimate_id AND r.requester_id = auth.uid()
  FOR UPDATE OF e;

  IF NOT FOUND OR selected_estimate.status <> 'pending' THEN
    RAISE EXCEPTION 'Estimate not found or no longer pending';
  END IF;

  PERFORM 1 FROM public.requests WHERE id = selected_estimate.request_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.transactions t WHERE t.request_id = selected_estimate.request_id) THEN
    RAISE EXCEPTION 'A transaction already exists for this request';
  END IF;

  PERFORM set_config('app.accept_estimate', 'on', true);
  UPDATE public.estimates
  SET status = CASE WHEN id = selected_estimate.id THEN 'accepted' ELSE 'rejected' END
  WHERE request_id = selected_estimate.request_id AND status = 'pending';
  PERFORM set_config('app.accept_estimate', 'off', true);

  PERFORM set_config('app.transaction_status', 'on', true);
  INSERT INTO public.transactions (request_id, craftsman_id, estimate_id, amount, status)
  VALUES (selected_estimate.request_id, selected_estimate.craftsman_id, selected_estimate.id, selected_estimate.total, 'contracted')
  RETURNING id INTO new_transaction_id;

  INSERT INTO public.transaction_events (transaction_id, actor_id, status, note)
  VALUES (new_transaction_id, auth.uid(), 'contracted', '見積もりを承認しました。');

  UPDATE public.requests SET status = 'contracted' WHERE id = selected_estimate.request_id;
  PERFORM set_config('app.transaction_status', 'off', true);
  RETURN new_transaction_id;
END;
$accept$;

CREATE OR REPLACE FUNCTION public.reject_estimate(target_estimate_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $reject$
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() <> 'requester' THEN
    RAISE EXCEPTION 'Only the authenticated requester can reject an estimate';
  END IF;
  PERFORM set_config('app.accept_estimate', 'on', true);
  UPDATE public.estimates e
  SET status = 'rejected'
  FROM public.requests r
  WHERE e.id = target_estimate_id AND e.request_id = r.id
    AND r.requester_id = auth.uid() AND e.status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estimate not found or no longer pending';
  END IF;
  PERFORM set_config('app.accept_estimate', 'off', true);
  RETURN true;
END;
$reject$;

REVOKE ALL ON FUNCTION public.accept_estimate(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_estimate(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_estimate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_estimate(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_transaction_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $transaction$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.request_id IS DISTINCT FROM OLD.request_id
      OR NEW.craftsman_id IS DISTINCT FROM OLD.craftsman_id
      OR NEW.estimate_id IS DISTINCT FROM OLD.estimate_id
      OR NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.created_at IS DISTINCT FROM OLD.created_at)
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Transaction parties and agreed amount are immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND COALESCE(current_setting('app.transaction_status', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Transaction status changes must use the authorized workflow';
  END IF;
  RETURN NEW;
END;
$transaction$;

DROP TRIGGER IF EXISTS transactions_protect_fields ON public.transactions;
CREATE TRIGGER transactions_protect_fields
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.protect_transaction_fields();

DROP POLICY IF EXISTS "transactions_update_participant" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_requester" ON public.transactions;


DROP POLICY IF EXISTS "transaction_events_select_participant" ON public.transaction_events;
CREATE POLICY "transaction_events_select_participant" ON public.transaction_events
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.requests r ON r.id = t.request_id
      JOIN public.craftsman_profiles cp ON cp.id = t.craftsman_id
      WHERE t.id = transaction_id AND (r.requester_id = auth.uid() OR cp.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "transaction_events_insert_participant" ON public.transaction_events;
DROP POLICY IF EXISTS "reviews_insert_participant" ON public.reviews;
CREATE OR REPLACE FUNCTION public.protect_notification_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notification$
BEGIN
  IF (NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.type IS DISTINCT FROM OLD.type
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.body IS DISTINCT FROM OLD.body
      OR NEW.created_at IS DISTINCT FROM OLD.created_at)
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Notification content cannot be changed by its recipient';
  END IF;
  RETURN NEW;
END;
$notification$;

DROP TRIGGER IF EXISTS notifications_protect_content ON public.notifications;
CREATE TRIGGER notifications_protect_content
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_notification_content();

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;
CREATE POLICY "notifications_insert_system" ON public.notifications
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "transaction_events_admin_insert" ON public.transaction_events;
CREATE POLICY "transaction_events_admin_insert" ON public.transaction_events
  FOR INSERT WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS requests_requester_created_idx
  ON public.requests(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_request_created_idx
  ON public.messages(request_id, created_at);
CREATE INDEX IF NOT EXISTS estimates_request_created_idx
  ON public.estimates(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_request_created_idx
  ON public.transactions(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_transaction_status(
  target_transaction_id UUID,
  next_status TEXT,
  event_note TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $status$
DECLARE
  transaction_row public.transactions%ROWTYPE;
  request_owner UUID;
  craftsman_owner UUID;
  allowed BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT t INTO transaction_row
  FROM public.transactions t
  WHERE t.id = target_transaction_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  SELECT r.requester_id, cp.user_id
  INTO request_owner, craftsman_owner
  FROM public.requests r
  JOIN public.craftsman_profiles cp ON cp.id = transaction_row.craftsman_id
  WHERE r.id = transaction_row.request_id;

  IF next_status = 'in_progress' THEN
    allowed := transaction_row.status = 'contracted'
      AND auth.uid() = craftsman_owner
      AND public.current_user_role() = 'craftsman';
  ELSIF next_status = 'delivered' THEN
    allowed := transaction_row.status = 'in_progress'
      AND auth.uid() = craftsman_owner
      AND public.current_user_role() = 'craftsman';
  ELSIF next_status = 'completed' THEN
    allowed := transaction_row.status = 'delivered'
      AND auth.uid() = request_owner
      AND public.current_user_role() = 'requester';
  END IF;
  IF NOT allowed THEN
    RAISE EXCEPTION 'This user cannot make the requested transaction status change';
  END IF;

  PERFORM set_config('app.transaction_status', 'on', true);
  UPDATE public.transactions SET status = next_status WHERE id = target_transaction_id;
  UPDATE public.requests SET status = next_status WHERE id = transaction_row.request_id;
  INSERT INTO public.transaction_events (transaction_id, actor_id, status, note)
  VALUES (target_transaction_id, auth.uid(), next_status, left(COALESCE(event_note, ''), 1000));
  IF next_status = 'completed' THEN
    PERFORM set_config('app.reputation_update', 'on', true);
    UPDATE public.craftsman_profiles SET completed_orders = (
      SELECT count(*)::INTEGER FROM public.transactions
      WHERE craftsman_id = transaction_row.craftsman_id AND status = 'completed'
    ) WHERE id = transaction_row.craftsman_id;
    PERFORM set_config('app.reputation_update', 'off', true);
  END IF;
  PERFORM set_config('app.transaction_status', 'off', true);
  RETURN true;
END;
$status$;

REVOKE ALL ON FUNCTION public.update_transaction_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_transaction_status(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_request_with_spec(
  request_title TEXT,
  request_description TEXT,
  specification JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $create_request$
DECLARE
  new_request_id UUID;
  safe_title TEXT;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() <> 'requester' THEN
    RAISE EXCEPTION 'Only an authenticated requester can create a request';
  END IF;
  safe_title := left(trim(COALESCE(request_title, '')), 200);
  IF safe_title = '' OR length(COALESCE(request_description, '')) NOT BETWEEN 1 AND 5000
    OR jsonb_typeof(specification) <> 'object'
    OR COALESCE(jsonb_typeof(specification -> 'requiredSkills'), '') <> 'array'
    OR COALESCE(jsonb_typeof(specification -> 'materials'), '') <> 'array'
    OR (CASE WHEN jsonb_typeof(specification -> 'requiredSkills') = 'array' THEN jsonb_array_length(specification -> 'requiredSkills') ELSE 999 END) > 30
    OR (CASE WHEN jsonb_typeof(specification -> 'materials') = 'array' THEN jsonb_array_length(specification -> 'materials') ELSE 999 END) > 30 THEN
    RAISE EXCEPTION 'Request or specification input is invalid';
  END IF;

  INSERT INTO public.requests (requester_id, title, description, status)
  VALUES (auth.uid(), safe_title, left(request_description, 5000), 'draft')
  RETURNING id INTO new_request_id;

  INSERT INTO public.specifications (request_id, title, summary, category, required_skills, materials, budget, deadline, notes)
  VALUES (
    new_request_id,
    left(COALESCE(specification ->> 'title', safe_title), 200),
    left(COALESCE(specification ->> 'summary', ''), 1000),
    left(COALESCE(specification ->> 'category', ''), 120),
    ARRAY(SELECT left(required_skill.value, 120) FROM jsonb_array_elements_text(specification -> 'requiredSkills') AS required_skill(value)),
    ARRAY(SELECT left(material.value, 120) FROM jsonb_array_elements_text(specification -> 'materials') AS material(value)),
    left(COALESCE(specification ->> 'budget', ''), 120),
    left(COALESCE(specification ->> 'deadline', ''), 120),
    left(COALESCE(specification ->> 'notes', ''), 1000)
  );
  UPDATE public.requests SET status = 'structured' WHERE id = new_request_id;
  RETURN new_request_id;
END;
$create_request$;

REVOKE ALL ON FUNCTION public.create_request_with_spec(TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_request_with_spec(TEXT, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_review(
  target_transaction_id UUID,
  target_reviewee_id UUID,
  review_rating INTEGER,
  review_categories JSONB,
  review_comment TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $review$
DECLARE
  requester_owner UUID;
  craftsman_owner UUID;
  craftsman_profile_id UUID;
  new_review_id UUID;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() NOT IN ('requester', 'craftsman') THEN
    RAISE EXCEPTION 'Authenticated marketplace user required';
  END IF;
  IF review_rating NOT BETWEEN 1 AND 5
    OR jsonb_typeof(review_categories) <> 'object'
    OR COALESCE((review_categories ->> 'quality')::INTEGER, 0) NOT BETWEEN 1 AND 5
    OR COALESCE((review_categories ->> 'communication')::INTEGER, 0) NOT BETWEEN 1 AND 5
    OR COALESCE((review_categories ->> 'deadline')::INTEGER, 0) NOT BETWEEN 1 AND 5
    OR COALESCE((review_categories ->> 'costPerformance')::INTEGER, 0) NOT BETWEEN 1 AND 5
    OR length(COALESCE(review_comment, '')) > 5000 THEN
    RAISE EXCEPTION 'Review input is invalid';
  END IF;

  SELECT r.requester_id, cp.user_id, cp.id
  INTO requester_owner, craftsman_owner, craftsman_profile_id
  FROM public.transactions t
  JOIN public.requests r ON r.id = t.request_id
  JOIN public.craftsman_profiles cp ON cp.id = t.craftsman_id
  WHERE t.id = target_transaction_id AND t.status = 'completed';
  IF NOT FOUND OR NOT (
    (auth.uid() = requester_owner AND target_reviewee_id = craftsman_owner)
    OR (auth.uid() = craftsman_owner AND target_reviewee_id = requester_owner)
  ) THEN
    RAISE EXCEPTION 'Only a transaction participant can review the other participant after completion';
  END IF;

  INSERT INTO public.reviews (transaction_id, reviewer_id, reviewee_id, rating, categories, comment)
  VALUES (target_transaction_id, auth.uid(), target_reviewee_id, review_rating, review_categories, left(COALESCE(review_comment, ''), 5000))
  RETURNING id INTO new_review_id;

  IF target_reviewee_id = craftsman_owner THEN
    PERFORM set_config('app.reputation_update', 'on', true);
    UPDATE public.craftsman_profiles cp SET
      review_count = review_count + 1,
      rating = (SELECT round(avg(rv.rating)::numeric, 1) FROM public.reviews rv WHERE rv.reviewee_id = craftsman_owner)
    WHERE cp.id = craftsman_profile_id;
    PERFORM set_config('app.reputation_update', 'off', true);
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (target_reviewee_id, 'review', '新しいレビュー', '取引完了後のレビューが届きました。');
  RETURN new_review_id;
END;
$review$;

REVOKE ALL ON FUNCTION public.create_review(UUID, UUID, INTEGER, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_review(UUID, UUID, INTEGER, JSONB, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_request_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify_request$
DECLARE
  target_user_id UUID;
  notice_title TEXT;
  notice_body TEXT;
BEGIN
  SELECT requester_id INTO target_user_id FROM public.requests WHERE id = NEW.request_id;
  IF target_user_id IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'matches' THEN
    notice_title := '新しいマッチング候補';
    notice_body := '依頼に技能者候補が追加されました。';
  ELSIF TG_TABLE_NAME = 'applications' THEN
    notice_title := '新しい応募';
    notice_body := '依頼に技能者から応募が届きました。';
  ELSE
    notice_title := '新しい見積もり';
    notice_body := '依頼に技能者から見積もりが届きました。';
  END IF;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (target_user_id, CASE WHEN TG_TABLE_NAME = 'matches' THEN 'ai' ELSE 'estimate' END, notice_title, notice_body);
  RETURN NEW;
END;
$notify_request$;

CREATE OR REPLACE FUNCTION public.notify_message_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify_message$
DECLARE
  request_owner UUID;
  recipient UUID;
BEGIN
  SELECT requester_id INTO request_owner FROM public.requests WHERE id = NEW.request_id;
  IF request_owner IS NULL THEN RETURN NEW; END IF;
  IF NEW.sender_id = request_owner THEN
    FOR recipient IN
      SELECT DISTINCT cp.user_id
      FROM (
        SELECT craftsman_id FROM public.matches WHERE request_id = NEW.request_id
        UNION
        SELECT craftsman_id FROM public.applications WHERE request_id = NEW.request_id
      ) candidates
      JOIN public.craftsman_profiles cp ON cp.id = candidates.craftsman_id
      WHERE cp.user_id <> NEW.sender_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (recipient, 'message', '新しいメッセージ', '依頼者からメッセージが届きました。');
    END LOOP;
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (request_owner, 'message', '新しいメッセージ', '技能者からメッセージが届きました。');
  END IF;
  RETURN NEW;
END;
$notify_message$;

CREATE OR REPLACE FUNCTION public.notify_transaction_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notify_transaction$
DECLARE
  requester_owner UUID;
  craftsman_owner UUID;
  recipient UUID;
BEGIN
  SELECT r.requester_id, cp.user_id INTO requester_owner, craftsman_owner
  FROM public.transactions t
  JOIN public.requests r ON r.id = t.request_id
  JOIN public.craftsman_profiles cp ON cp.id = t.craftsman_id
  WHERE t.id = NEW.transaction_id;
  IF requester_owner IS NULL THEN RETURN NEW; END IF;
  recipient := CASE WHEN NEW.actor_id = requester_owner THEN craftsman_owner ELSE requester_owner END;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (recipient, 'system', '取引ステータスが更新されました', NEW.note);
  RETURN NEW;
END;
$notify_transaction$;

DROP TRIGGER IF EXISTS matches_notify_requester ON public.matches;
CREATE TRIGGER matches_notify_requester AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_request_owner();
DROP TRIGGER IF EXISTS applications_notify_requester ON public.applications;
CREATE TRIGGER applications_notify_requester AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_request_owner();
DROP TRIGGER IF EXISTS estimates_notify_requester ON public.estimates;
CREATE TRIGGER estimates_notify_requester AFTER INSERT ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.notify_request_owner();
DROP TRIGGER IF EXISTS messages_notify_participants ON public.messages;
CREATE TRIGGER messages_notify_participants AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_message_participants();
DROP TRIGGER IF EXISTS transaction_events_notify_participant ON public.transaction_events;
CREATE TRIGGER transaction_events_notify_participant AFTER INSERT ON public.transaction_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_transaction_participant();

REVOKE ALL ON FUNCTION public.notify_request_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_message_participants() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_transaction_participant() FROM PUBLIC, anon, authenticated;
