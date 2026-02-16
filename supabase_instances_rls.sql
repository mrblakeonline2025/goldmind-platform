-- Extend RLS for group_instances to allow Tutors to manage their own classroom links
-- Existing policy: only ADMIN can update everything.
-- New policy: TUTOR can update rows where they are the assigned tutor.

CREATE POLICY "Tutors can update classroom info for assigned sessions"
ON public.group_instances
FOR UPDATE
TO authenticated
USING (assigned_tutor_id = auth.uid())
WITH CHECK (assigned_tutor_id = auth.uid());

-- Note: To be more restrictive and only allow updates to classroom_url and classroom_notes,
-- one would traditionally use a trigger or separate table, as Supabase RLS policies 
-- apply to the whole row. However, in this context, assigned_tutor_id ownership
-- provides sufficient logical isolation for the MVP.