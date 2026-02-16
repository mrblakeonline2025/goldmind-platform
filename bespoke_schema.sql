
-- Bespoke Offers Table
CREATE TABLE IF NOT EXISTS public.bespoke_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by_admin_id uuid REFERENCES public.profiles(id),
  student_id uuid REFERENCES public.profiles(id) NULL,
  offer_title text NOT NULL,
  offer_description text NOT NULL,
  package_id text NOT NULL,
  slot_id uuid REFERENCES public.recurring_slots(id),
  block_start_date date NOT NULL,
  custom_price_gbp numeric NOT NULL,
  payment_status text NOT NULL DEFAULT 'Draft' CHECK (payment_status IN ('Draft', 'Sent', 'Paid', 'Cancelled')),
  payment_reference text NULL,
  public_token text UNIQUE DEFAULT substring(md5(random()::text), 1, 12),
  expires_at timestamptz NULL
);

-- Bespoke Enquiries Table
CREATE TABLE IF NOT EXISTS public.bespoke_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  message text NOT NULL,
  status text DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Closed'))
);

-- RLS Policies
ALTER TABLE public.bespoke_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bespoke_enquiries ENABLE ROW LEVEL SECURITY;

-- Admin Access
CREATE POLICY "Admin full access bespoke_offers" ON public.bespoke_offers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Admin full access bespoke_enquiries" ON public.bespoke_enquiries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Public/Student Read Access for Offers
CREATE POLICY "Public read bespoke_offers via token" ON public.bespoke_offers
  FOR SELECT TO anon, authenticated
  USING (true); -- Filtered by token in app logic

-- Public Insert for Enquiries
CREATE POLICY "Public insert bespoke_enquiries" ON public.bespoke_enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ATOMIC ENROLLMENT RPC
CREATE OR REPLACE FUNCTION public.enrol_bespoke_offer(p_offer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer record;
  v_student_name text;
  v_enrolled_count integer := 0;
BEGIN
  -- 1. Get offer details
  SELECT * INTO v_offer FROM public.bespoke_offers WHERE id = p_offer_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'OFFER_NOT_FOUND'; END IF;
  IF v_offer.payment_status = 'Paid' THEN RAISE EXCEPTION 'ALREADY_PAID'; END IF;
  IF v_offer.student_id IS NULL THEN RAISE EXCEPTION 'STUDENT_NOT_ASSIGNED'; END IF;

  -- 2. Ensure block exists (calls existing admin logic)
  PERFORM public.ensure_4week_block(v_offer.slot_id, v_offer.block_start_date);
  
  -- 3. Ensure meet link exists
  PERFORM public.attach_block_meet_link(v_offer.slot_id, v_offer.block_start_date, false);

  -- 4. Get student name
  SELECT name INTO v_student_name FROM public.profiles WHERE id = v_offer.student_id;

  -- 5. Insert 4 Enrollments as 'Paid'
  INSERT INTO public.enrollments (
    package_id,
    instance_id,
    student_id,
    student_name,
    payment_status,
    enrolled_at,
    notes
  )
  SELECT 
    v_offer.package_id,
    gi.id,
    v_offer.student_id,
    COALESCE(v_student_name, 'Student'),
    'Paid',
    now(),
    'Bespoke Offer: ' || v_offer.offer_title
  FROM public.group_instances gi
  WHERE gi.slot_id = v_offer.slot_id
    AND gi.session_date >= v_offer.block_start_date
    AND gi.session_date < (v_offer.block_start_date + interval '28 days')
  ON CONFLICT (student_id, instance_id) DO NOTHING;

  GET DIAGNOSTICS v_enrolled_count = ROW_COUNT;

  -- 6. Update Offer Status
  UPDATE public.bespoke_offers 
  SET payment_status = 'Paid' 
  WHERE id = p_offer_id;

  RETURN v_enrolled_count;
END;
$$;
