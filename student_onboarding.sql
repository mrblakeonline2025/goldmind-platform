
-- Student Academic Profiles Table
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  school text NOT NULL,
  year_group text NOT NULL,
  exam_board text NOT NULL,
  strengths text,
  weaknesses text,
  target_grades jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id)
);

-- Enable RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Admin: Full Access
CREATE POLICY "Admin manage all student profiles" ON public.student_profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Student: Own Profile Access
CREATE POLICY "Students manage own academic profile" ON public.student_profiles
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Parent: Linked Child Profile Access
CREATE POLICY "Parents read linked child profile" ON public.student_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'PARENT' 
    AND p.linked_user_id = student_profiles.student_id
  ));

-- Tutor: Access for Enrolled Students
CREATE POLICY "Tutors read enrolled student profiles" ON public.student_profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.group_instances gi ON e.instance_id = gi.id
    WHERE e.student_id = student_profiles.student_id
    AND gi.assigned_tutor_id = auth.uid()
  ));
