INSERT INTO public.skills (name, category) VALUES
  ('内装張り替え', '内装'),
  ('シートカバー縫製', '縫製'),
  ('木製パネル加工', '木工'),
  ('樹脂成型', '成型'),
  ('CAD設計', '設計'),
  ('電装配線', '電装')
ON CONFLICT (name) DO NOTHING;
