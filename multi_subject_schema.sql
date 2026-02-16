
-- Package Subject Requirements Table
CREATE TABLE IF NOT EXISTS public.package_subject_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id text NOT NULL,
  required_count integer NOT NULL,
  tier text NOT NULL CHECK (tier IN ('Standard', 'Enhanced')),
  UNIQUE(package_id)
);

-- Seed Data for Bundles
INSERT INTO public.package_subject_requirements (package_id, required_count, tier)
VALUES 
  ('p-ms-2-std', 2, 'Standard'),
  ('p-ms-3-std', 3, 'Standard'),
  ('p-ms-4-std', 4, 'Standard'),
  ('p-ms-2-enh', 2, 'Enhanced'),
  ('p-ms-3-enh', 3, 'Enhanced'),
  ('p-ms-4-enh', 4, 'Enhanced')
ON CONFLICT (package_id) DO UPDATE SET required_count = EXCLUDED.required_count, tier = EXCLUDED.tier;

-- ATOMIC MULTI-SUBJECT ENROLLMENT RPC
CREATE OR REPLACE FUNCTION public.book_multi_subject_block(
  p_bundle_package_id text,
  p_start_date date,
  p_subject_slot_map jsonb, -- e.g. {"Maths": "uuid", "Science": "uuid"}
  p_payment_mode text DEFAULT 'Paid',
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id uuid := auth.uid();
  v_student_name text;
  v_required_count integer;
  v_subject text;
  v_slot_id uuid;
  v_subjects_processed integer := 0;
  v_sessions_processed integer := 0;
BEGIN
  -- 1. Validate Auth
  SELECT name INTO v_student_name FROM public.profiles WHERE id = v_student_id;
  IF v_student_name IS NULL THEN RAISE EXCEPTION 'STUDENT_PROFILE_NOT_FOUND'; END IF;

  -- 2. Validate Bundle Requirements
  SELECT required_count INTO v_required_count 
  FROM public.package_subject_requirements 
  WHERE package_id = p_bundle_package_id;
  
  IF v_required_count IS NULL THEN RAISE EXCEPTION 'INVALID_BUNDLE_PACKAGE'; END IF;
  
  -- Ensure map size matches requirements
  IF (SELECT count(*) FROM jsonb_object_keys(p_subject_slot_map)) != v_required_count THEN
    RAISE EXCEPTION 'SUBJECT_COUNT_MISMATCH';
  END IF;

  -- 3. Process Each Subject
  FOR v_subject, v_slot_id IN SELECT * FROM jsonb_each_text(p_subject_slot_map)
  LOOP
    -- Ensure 4-week block exists for this slot
    PERFORM public.ensure_4week_block(v_slot_id, p_start_date);
    
    -- Ensure meet link is attached
    PERFORM public.attach_block_meet_link(v_slot_id, p_start_date, false);

    -- Enroll for 4 sessions
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
      p_bundle_package_id,
      gi.id,
      v_student_id,
      v_student_name,
      p_payment_mode,
      now(),
      'Bundle Enrolment: ' || v_subject || ' (' || p_bundle_package_id || ') ' || p_notes
    FROM public.group_instances gi
    WHERE gi.slot_id = v_slot_id
      AND gi.session_date >= p_start_date
      AND gi.session_date < (p_start_date + interval '28 days')
    ON CONFLICT (student_id, instance_id) DO NOTHING;

    v_subjects_processed := v_subjects_processed + 1;
  END LOOP;

  SELECT count(*) INTO v_sessions_processed 
  FROM public.enrollments 
  WHERE student_id = v_student_id 
    AND enrolled_at >= (now() - interval '1 minute')
    AND package_id = p_bundle_package_id;

  RETURN jsonb_build_object(
    'subjects_enrolled', v_subjects_processed,
    'sessions_enrolled', v_sessions_processed,
    'status', 'success'
  );
END;
$$;
