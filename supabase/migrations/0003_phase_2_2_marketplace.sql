ALTER TABLE public.craftsman_profiles
  ADD COLUMN IF NOT EXISTS hourly_rate INTEGER;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolio', 'portfolio', true, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "portfolio_storage_public_read" ON storage.objects;
CREATE POLICY "portfolio_storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio');

DROP POLICY IF EXISTS "portfolio_storage_craftsman_insert" ON storage.objects;
CREATE POLICY "portfolio_storage_craftsman_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() = 'craftsman'
  );

DROP POLICY IF EXISTS "portfolio_storage_craftsman_delete" ON storage.objects;
CREATE POLICY "portfolio_storage_craftsman_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() = 'craftsman'
  );

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
    AND COALESCE(current_setting('app.request_content_update', true), '') <> 'on'
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Request content cannot be changed outside the authorized edit workflow';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
    AND NOT public.is_admin()
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND COALESCE(current_setting('app.transaction_status', true), '') <> 'on'
    AND COALESCE(current_setting('app.request_content_update', true), '') <> 'on'
    AND NOT (OLD.status = 'draft' AND NEW.status = 'structured'
      AND OLD.requester_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.specifications s WHERE s.request_id = OLD.id)) THEN
    RAISE EXCEPTION 'Request status changes must use an authorized workflow';
  END IF;
  RETURN NEW;
END;
$request$;

CREATE OR REPLACE FUNCTION public.update_request_with_spec(
  target_request_id UUID,
  request_title TEXT,
  request_description TEXT,
  specification JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $update_request$
DECLARE
  request_row public.requests%ROWTYPE;
  safe_title TEXT;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() <> 'requester' THEN
    RAISE EXCEPTION 'Only the authenticated requester can edit a request';
  END IF;
  SELECT * INTO request_row FROM public.requests
  WHERE id = target_request_id AND requester_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND OR request_row.status NOT IN ('draft', 'structured', 'matching') THEN
    RAISE EXCEPTION 'Request not found or no longer editable';
  END IF;
  IF EXISTS (SELECT 1 FROM public.applications WHERE request_id = target_request_id)
    OR EXISTS (SELECT 1 FROM public.estimates WHERE request_id = target_request_id)
    OR EXISTS (SELECT 1 FROM public.transactions WHERE request_id = target_request_id) THEN
    RAISE EXCEPTION 'A request with applications, estimates, or a transaction cannot be edited';
  END IF;
  safe_title := left(trim(COALESCE(request_title, '')), 200);
  IF safe_title = '' OR length(COALESCE(request_description, '')) NOT BETWEEN 1 AND 5000
    OR jsonb_typeof(specification) <> 'object'
    OR COALESCE(jsonb_typeof(specification -> 'requiredSkills'), '') <> 'array'
    OR COALESCE(jsonb_typeof(specification -> 'materials'), '') <> 'array'
    OR (CASE WHEN jsonb_typeof(specification -> 'requiredSkills') = 'array' THEN jsonb_array_length(specification -> 'requiredSkills') ELSE 31 END) > 30
    OR (CASE WHEN jsonb_typeof(specification -> 'materials') = 'array' THEN jsonb_array_length(specification -> 'materials') ELSE 31 END) > 30 THEN
    RAISE EXCEPTION 'Request or specification input is invalid';
  END IF;

  PERFORM set_config('app.request_content_update', 'on', true);
  DELETE FROM public.matches WHERE request_id = target_request_id;
  UPDATE public.requests
  SET title = safe_title, description = left(request_description, 5000), status = 'structured'
  WHERE id = target_request_id;
  UPDATE public.specifications
  SET title = left(COALESCE(specification ->> 'title', safe_title), 200),
      summary = left(COALESCE(specification ->> 'summary', ''), 1000),
      category = left(COALESCE(specification ->> 'category', ''), 120),
      required_skills = ARRAY(SELECT left(value, 120) FROM jsonb_array_elements_text(specification -> 'requiredSkills') AS skills(value)),
      materials = ARRAY(SELECT left(value, 120) FROM jsonb_array_elements_text(specification -> 'materials') AS materials(value)),
      budget = left(COALESCE(specification ->> 'budget', ''), 120),
      deadline = left(COALESCE(specification ->> 'deadline', ''), 120),
      notes = left(COALESCE(specification ->> 'notes', ''), 1000)
  WHERE request_id = target_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request specification is missing';
  END IF;
  PERFORM set_config('app.request_content_update', 'off', true);
  RETURN true;
END;
$update_request$;

CREATE OR REPLACE FUNCTION public.delete_request(target_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $delete_request$
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() <> 'requester' THEN
    RAISE EXCEPTION 'Only the authenticated requester can delete a request';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.requests
    WHERE id = target_request_id AND requester_id = auth.uid()
      AND status IN ('draft', 'structured', 'matching', 'quoted')
  ) THEN
    RAISE EXCEPTION 'Request not found or no longer deletable';
  END IF;
  IF EXISTS (SELECT 1 FROM public.applications WHERE request_id = target_request_id)
    OR EXISTS (SELECT 1 FROM public.estimates WHERE request_id = target_request_id)
    OR EXISTS (SELECT 1 FROM public.transactions WHERE request_id = target_request_id) THEN
    RAISE EXCEPTION 'A request with applications, estimates, or a transaction cannot be deleted';
  END IF;
  DELETE FROM public.requests WHERE id = target_request_id AND requester_id = auth.uid();
  RETURN FOUND;
END;
$delete_request$;

REVOKE ALL ON FUNCTION public.update_request_with_spec(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_request_with_spec(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_request(UUID) TO authenticated;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.matches m JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id WHERE m.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.applications a JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id WHERE a.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.estimates e JOIN public.craftsman_profiles cp ON cp.id = e.craftsman_id WHERE e.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.transactions t JOIN public.craftsman_profiles cp ON cp.id = t.craftsman_id WHERE t.request_id = r.id AND cp.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.matches m JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id WHERE m.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.applications a JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id WHERE a.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.estimates e JOIN public.craftsman_profiles cp ON cp.id = e.craftsman_id WHERE e.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.transactions t JOIN public.craftsman_profiles cp ON cp.id = t.craftsman_id WHERE t.request_id = r.id AND cp.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "messages_update_participant" ON public.messages;
CREATE POLICY "messages_update_participant" ON public.messages
  FOR UPDATE USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.matches m JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id WHERE m.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.applications a JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id WHERE a.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.estimates e JOIN public.craftsman_profiles cp ON cp.id = e.craftsman_id WHERE e.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.transactions t JOIN public.craftsman_profiles cp ON cp.id = t.craftsman_id WHERE t.request_id = r.id AND cp.user_id = auth.uid())
      )
    )
  ) WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND (
        r.requester_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.matches m JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id WHERE m.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.applications a JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id WHERE a.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.estimates e JOIN public.craftsman_profiles cp ON cp.id = e.craftsman_id WHERE e.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.transactions t JOIN public.craftsman_profiles cp ON cp.id = t.craftsman_id WHERE t.request_id = r.id AND cp.user_id = auth.uid())
      )
    )
  );

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
        r.status IN ('structured', 'matching')
        OR EXISTS (SELECT 1 FROM public.matches m JOIN public.craftsman_profiles cp ON cp.id = m.craftsman_id WHERE m.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.applications a JOIN public.craftsman_profiles cp ON cp.id = a.craftsman_id WHERE a.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.estimates e JOIN public.craftsman_profiles cp ON cp.id = e.craftsman_id WHERE e.request_id = r.id AND cp.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.transactions t JOIN public.craftsman_profiles cp ON cp.id = t.craftsman_id WHERE t.request_id = r.id AND cp.user_id = auth.uid())
      )
    ), false
  )
$access$;

CREATE OR REPLACE FUNCTION public.advance_request_status_for_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $advance$
DECLARE
  next_status TEXT;
BEGIN
  next_status := CASE WHEN TG_TABLE_NAME = 'estimates' THEN 'quoted' ELSE 'matching' END;
  PERFORM set_config('app.request_content_update', 'on', true);
  UPDATE public.requests
  SET status = next_status
  WHERE id = NEW.request_id AND status IN ('structured', 'matching');
  PERFORM set_config('app.request_content_update', 'off', true);
  RETURN NEW;
END;
$advance$;

DROP TRIGGER IF EXISTS matches_advance_request_status ON public.matches;
CREATE TRIGGER matches_advance_request_status AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.advance_request_status_for_submission();
DROP TRIGGER IF EXISTS applications_advance_request_status ON public.applications;
CREATE TRIGGER applications_advance_request_status AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.advance_request_status_for_submission();
DROP TRIGGER IF EXISTS estimates_advance_request_status ON public.estimates;
CREATE TRIGGER estimates_advance_request_status AFTER INSERT ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.advance_request_status_for_submission();

DROP POLICY IF EXISTS "applications_insert_craftsman" ON public.applications;
CREATE POLICY "applications_insert_craftsman" ON public.applications
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'craftsman' AND status = 'pending' AND EXISTS (
      SELECT 1 FROM public.craftsman_profiles cp WHERE cp.id = craftsman_id AND cp.user_id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.status IN ('structured', 'matching', 'quoted')
    )
  );
