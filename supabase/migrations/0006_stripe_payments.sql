ALTER TABLE public.provider_profiles
  ADD COLUMN stripe_account_id TEXT UNIQUE,
  ADD COLUMN stripe_onboarding_completed BOOLEAN NOT NULL DEFAULT false;

CREATE FUNCTION public.protect_provider_stripe_fields() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    IF TG_OP = 'INSERT' AND (NEW.stripe_account_id IS NOT NULL OR NEW.stripe_onboarding_completed) THEN
      RAISE EXCEPTION 'Stripe account fields require a trusted workflow';
    ELSIF TG_OP = 'UPDATE' AND (NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id OR NEW.stripe_onboarding_completed IS DISTINCT FROM OLD.stripe_onboarding_completed) THEN
      RAISE EXCEPTION 'Stripe account fields require a trusted workflow';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER provider_profiles_protect_stripe BEFORE INSERT OR UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_provider_stripe_fields();

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE REFERENCES public.bookings(id),
  order_id UUID UNIQUE REFERENCES public.orders(id),
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  platform_fee INTEGER NOT NULL CHECK (platform_fee >= 0 AND platform_fee <= amount),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT UNIQUE,
  stripe_transfer_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'transferring', 'transferred', 'refund_pending', 'refunded', 'failed', 'disputed')),
  stripe_attempted_at TIMESTAMPTZ,
  transfer_attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(booking_id, order_id) = 1)
);

CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.provider_profiles(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  stripe_payout_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  stripe_attempted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_read ON public.payments FOR SELECT TO authenticated USING (
  customer_id = auth.uid() OR public.listing_owner(provider_id) OR public.is_admin()
);
CREATE POLICY payouts_read ON public.payouts FOR SELECT TO authenticated USING (
  public.listing_owner(provider_id) OR public.is_admin()
);
GRANT SELECT ON public.payments, public.payouts TO authenticated;
GRANT ALL ON public.payments, public.payouts TO service_role;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER payouts_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX payments_provider_idx ON public.payments(provider_id, created_at DESC);
CREATE INDEX payouts_provider_idx ON public.payouts(provider_id, created_at DESC);
CREATE UNIQUE INDEX payouts_one_pending_per_provider ON public.payouts(provider_id) WHERE status = 'pending';

CREATE FUNCTION public.reserve_trade_payment(trade_type TEXT, trade_id UUID)
RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result public.payments%ROWTYPE;
  provider UUID;
  customer UUID;
  trade_amount INTEGER;
  trade_status TEXT;
  ready BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF trade_type = 'booking' THEN
    SELECT b.customer_id, b.amount, b.status, p.id, p.stripe_onboarding_completed
      INTO customer, trade_amount, trade_status, provider, ready
      FROM public.bookings b JOIN public.provider_profiles p ON p.user_id = b.provider_user_id
      WHERE b.id = trade_id FOR UPDATE OF b;
    IF trade_status IS DISTINCT FROM 'accepted' THEN RAISE EXCEPTION 'Booking is not payable'; END IF;
  ELSIF trade_type = 'order' THEN
    SELECT o.customer_id, q.amount, o.status, p.id, p.stripe_onboarding_completed
      INTO customer, trade_amount, trade_status, provider, ready
      FROM public.orders o JOIN public.provider_profiles p ON p.id = o.provider_profile_id
      JOIN public.order_quotes q ON q.order_id = o.id AND q.provider_user_id = p.user_id
      WHERE o.id = trade_id FOR UPDATE OF o;
    IF trade_status IS DISTINCT FROM 'quoted' THEN RAISE EXCEPTION 'Order is not payable'; END IF;
  ELSE
    RAISE EXCEPTION 'Invalid trade type';
  END IF;
  IF customer IS DISTINCT FROM auth.uid() OR provider IS NULL OR NOT COALESCE(ready, false) OR trade_amount IS NULL OR trade_amount < 50 THEN
    RAISE EXCEPTION 'Trade is not payable';
  END IF;
  SELECT * INTO result FROM public.payments WHERE (trade_type = 'booking' AND booking_id = trade_id) OR (trade_type = 'order' AND order_id = trade_id);
  IF FOUND THEN RETURN result; END IF;
  INSERT INTO public.payments(booking_id, order_id, customer_id, provider_id, amount, platform_fee)
  VALUES (CASE WHEN trade_type = 'booking' THEN trade_id END, CASE WHEN trade_type = 'order' THEN trade_id END, customer, provider, trade_amount, floor(trade_amount::numeric / 10)::integer)
  RETURNING * INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.reserve_trade_payment(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_trade_payment(TEXT, UUID) TO authenticated;

CREATE FUNCTION public.guard_paid_trade_transition() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payment_status TEXT; payment_required BOOLEAN;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'bookings' THEN
    SELECT status INTO payment_status FROM public.payments WHERE booking_id = NEW.id;
    SELECT stripe_onboarding_completed INTO payment_required FROM public.provider_profiles WHERE user_id = NEW.provider_user_id;
    IF NEW.status IN ('cancelled_by_customer','cancelled_by_provider') AND payment_status IS NOT NULL AND payment_status NOT IN ('refunded','failed') THEN
      RAISE EXCEPTION 'Payment must be resolved before cancellation';
    END IF;
    IF NEW.status = 'completed' AND (payment_status IS NOT NULL OR COALESCE(payment_required,false)) AND COALESCE(payment_status,'') NOT IN ('captured','transferring','transferred') THEN
      RAISE EXCEPTION 'Payment is required before completion';
    END IF;
  ELSE
    SELECT status INTO payment_status FROM public.payments WHERE order_id = NEW.id;
    SELECT stripe_onboarding_completed INTO payment_required FROM public.provider_profiles WHERE id = NEW.provider_profile_id;
    IF NEW.status = 'cancelled' AND payment_status IS NOT NULL AND payment_status NOT IN ('refunded','failed') THEN
      RAISE EXCEPTION 'Payment must be resolved before cancellation';
    END IF;
    IF NEW.status IN ('ordered','in_progress','delivered','completed') AND (payment_status IS NOT NULL OR COALESCE(payment_required,false)) AND COALESCE(payment_status,'') NOT IN ('captured','transferring','transferred') THEN
      RAISE EXCEPTION 'Payment is required before proceeding';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bookings_payment_guard BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.guard_paid_trade_transition();
CREATE TRIGGER orders_payment_guard BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_paid_trade_transition();
