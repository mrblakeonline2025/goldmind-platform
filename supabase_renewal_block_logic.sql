-- 1. Ensure unique constraint exists for student per instance
-- This allows us to use ON CONFLICT DO NOTHING for idempotency
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_instance'
    ) THEN
        ALTER TABLE public.enrollments 
        ADD CONSTRAINT unique_student_instance UNIQUE (student_id, instance_id);
    END IF;
END $$;

-- 2. Create the renewal function (Updated: Manual Link requirement)
CREATE OR REPLACE FUNCTION public.renew_4week_block(
  p_student_id uuid,
  p_slot_id uuid,
  p_package_id text,
  p_notes text DEFAULT ''
)
RETURNS TABLE (instance_id uuid) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to manage blocks and records
AS $$
DECLARE
  v_last_session_date date;
  v_next_start_date date;
  v_student_name text;
BEGIN
  -- A. Find the latest session date this student is currently enrolled in for this specific slot
  SELECT MAX(gi.session_date) INTO v_last_session_date
  FROM public.enrollments e
  JOIN public.group_instances gi ON e.instance_id = gi.id
  WHERE e.student_id = p_student_id
    AND gi.slot_id = p_slot_id;

  -- B. Guard: If no previous sessions exist, this isn't a renewal
  IF v_last_session_date IS NULL THEN
    RAISE EXCEPTION 'NO_EXISTING_BLOCK' USING DETAIL = 'Student has no prior enrollments for this slot.';
  END IF;

  -- C. Calculate next block start (7 days after the last session)
  v_next_start_date := (v_last_session_date + interval '7 days')::date;

  -- D. Fetch student name from profiles for metadata consistency
  SELECT name INTO v_student_name FROM public.profiles WHERE id = p_student_id;

  -- E. Execute administrative block management logic
  -- 1. Ensure the 4 physical instance rows exist in the DB
  PERFORM public.ensure_4week_block(p_slot_id, v_next_start_date);
  
  -- 2. NOTE: attach_block_meet_link is NO LONGER called here automatically.
  -- Admin will assign the link during payment verification in the dashboard.

  -- F. Create the 4 Pending enrollments
  -- We return the IDs of the instances we just enrolled the student in
  RETURN QUERY
  INSERT INTO public.enrollments (
    package_id,
    instance_id,
    student_id,
    student_name,
    notes,
    payment_status,
    enrolled_at
  )
  SELECT 
    p_package_id,
    gi.id,
    p_student_id,
    COALESCE(v_student_name, 'Student'),
    p_notes,
    'Pending', -- Renewal requires verification and Link Assignment
    NOW()
  FROM public.group_instances gi
  WHERE gi.slot_id = p_slot_id
    AND gi.session_date >= v_next_start_date
    AND gi.session_date < (v_next_start_date + interval '28 days')
  ON CONFLICT ON CONSTRAINT unique_student_instance DO NOTHING
  RETURNING enrollments.instance_id;

END;
$$;