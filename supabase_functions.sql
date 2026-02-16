-- Hard Capacity Enforcement Function
-- Use this in the Supabase SQL Editor to enable RPC-based enrollment
CREATE OR REPLACE FUNCTION public.enroll_student(
  instance_uuid uuid,
  package_id text,
  notes text DEFAULT ''
)
RETURNS public.enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
  max_cap int;
  s_name text;
  result public.enrollments;
BEGIN
  -- 1. Get capacity and lock the instance row to prevent concurrent check/insert races
  SELECT max_capacity INTO max_cap 
  FROM public.group_instances 
  WHERE id = instance_uuid
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSTANCE_NOT_FOUND';
  END IF;

  -- 2. Count existing enrollments for this instance
  SELECT count(*) INTO current_count 
  FROM public.enrollments 
  WHERE instance_id = instance_uuid;

  -- 3. Enforce limit
  IF current_count >= max_cap THEN
    RAISE EXCEPTION 'GROUP_FULL';
  END IF;

  -- 4. Retrieve student name from profiles for record keeping
  SELECT name INTO s_name 
  FROM public.profiles 
  WHERE id = auth.uid();

  -- 5. Atomic Insert - Initial status is 'Paid' for immediate internal access
  INSERT INTO public.enrollments (
    package_id,
    instance_id,
    student_id,
    student_name,
    notes,
    payment_status,
    enrolled_at
  )
  VALUES (
    package_id,
    instance_uuid,
    auth.uid(),
    COALESCE(s_name, 'Unknown Student'),
    notes,
    'Paid',
    NOW()
  )
  RETURNING * INTO result;

  RETURN result;
END;
$$;