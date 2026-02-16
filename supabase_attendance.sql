-- Create Attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id uuid NOT NULL REFERENCES public.group_instances(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  tutor_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL CHECK (status IN ('Present', 'Late', 'Absent', 'Excused')),
  note text NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(instance_id, student_id)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ADMIN: Full control
CREATE POLICY "Admin full access" ON public.attendance
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- TUTOR: Manage attendance for their own classes
CREATE POLICY "Tutor manage own attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

-- STUDENT/PARENT: Read-only access for their own child's records
CREATE POLICY "Student/Parent read child attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.linked_user_id = attendance.student_id
    )
  );