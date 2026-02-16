-- Safe "Undo Verification" RPC for GoldMind Tuition
-- Reverts a specific 4-session block back to Pending status.

CREATE OR REPLACE FUNCTION public.undo_4week_block_payment(
  p_student_id uuid,
  p_slot_id uuid,
  p_block_start_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Update the enrollments joined to group_instances for the specific block window
  -- Target window is [start_date, start_date + 28 days)
  UPDATE public.enrollments
  SET payment_status = 'Pending'
  WHERE student_id = p_student_id
    AND payment_status = 'Paid'
    AND instance_id IN (
      SELECT id 
      FROM public.group_instances 
      WHERE slot_id = p_slot_id 
        AND session_date >= p_block_start_date 
        AND session_date < (p_block_start_date + interval '28 days')
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;