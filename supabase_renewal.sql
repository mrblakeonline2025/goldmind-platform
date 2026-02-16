-- Function to renew a 4-week block for a student
-- Calculates next start date based on student's latest enrollment in the slot
CREATE OR REPLACE FUNCTION public.renew_4week_block(
  p_student_id uuid,
  p_slot_id uuid,
  p_package_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_date date;
  v_start_date date;
  v_student_name text;
BEGIN
  -- 1. Identify the latest session date the student is currently enrolled in for this slot
  SELECT MAX(gi.session_date) INTO v_last_date
  FROM public.enrollments e
  JOIN public.group_instances gi ON e.instance_id = gi.id
  WHERE e.student_id = p_student_id
    AND gi.slot_id = p_slot_id;

  -- 2. If no previous enrollment found, we can't "renew"
  IF v_last_date IS NULL THEN
    RAISE EXCEPTION 'NO_PREVIOUS_ENROLLMENT_FOUND';
  END IF;

  -- 3. The new block starts exactly 7 days after the last session
  v_start_date := v_last_date + interval '7 days';

  -- 4. Get student name for record keeping
  SELECT name INTO v_student_name FROM public.profiles WHERE id = p_student_id;

  -- 5. Ensure the instances exist in the system (calls existing admin logic)
  PERFORM public.ensure_4week_block(p_slot_id, v_start_date);

  -- 6. Attach/maintain the Meet link for this new block
  PERFORM public.attach_block_meet_link(p_slot_id, v_start_date, false);

  -- 7. Create the 4 pending enrollments
  INSERT INTO public.enrollments (
    package_id,
    instance_id,
    student_id,
    student_name,
    payment_status,
    enrolled_at
  )
  SELECT 
    p_package_id,
    gi.id,
    p_student_id,
    COALESCE(v_student_name, 'Student'),
    'Pending', -- Renewal is created as Pending until verified
    NOW()
  FROM public.group_instances gi
  WHERE gi.slot_id = p_slot_id
    AND gi.session_date >= v_start_date
    AND gi.session_date < (v_start_date + interval '28 days')
  ON CONFLICT (instance_id, student_id) DO NOTHING;

END;
$$;