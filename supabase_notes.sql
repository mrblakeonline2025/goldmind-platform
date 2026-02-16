-- Create Session Notes table
CREATE TABLE IF NOT EXISTS public.session_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id uuid REFERENCES public.group_instances(id) ON DELETE CASCADE,
  tutor_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  session_title text NOT NULL,
  session_summary text NOT NULL,
  homework text NULL,
  student_focus jsonb NULL  -- optional structured notes
);

-- Enable RLS
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- ADMIN can read/write all
CREATE POLICY "Admin full access" ON public.session_notes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- TUTOR can read/write only where tutor_id = auth.uid()
CREATE POLICY "Tutor manage own notes" ON public.session_notes
  FOR ALL TO authenticated
  USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

-- STUDENT/PARENT can read notes only for instances they are enrolled in
CREATE POLICY "Student/Parent read access" ON public.session_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.instance_id = session_notes.instance_id
      AND (
        e.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.linked_user_id = e.student_id
        )
      )
    )
  );