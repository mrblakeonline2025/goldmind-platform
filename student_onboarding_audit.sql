
-- 1. Student Profile Audit Table
CREATE TABLE IF NOT EXISTS public.student_profile_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  edited_by uuid,
  edited_by_role text,
  before jsonb,
  after jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. Audit Trigger Function
CREATE OR REPLACE FUNCTION public.audit_student_profile_change()
RETURNS TRIGGER AS $$
DECLARE
    v_editor_role text;
BEGIN
    -- Capture the role of the person making the edit
    SELECT role INTO v_editor_role FROM public.profiles WHERE id = auth.uid();
    
    INSERT INTO public.student_profile_audit (
        student_id,
        edited_by,
        edited_by_role,
        before,
        after
    )
    VALUES (
        COALESCE(OLD.student_id, NEW.student_id),
        auth.uid(),
        v_editor_role,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger to student_profiles
DROP TRIGGER IF EXISTS trigger_audit_student_profile ON public.student_profiles;
CREATE TRIGGER trigger_audit_student_profile
AFTER INSERT OR UPDATE OR DELETE ON public.student_profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_student_profile_change();

-- 4. RLS for Audit Table
ALTER TABLE public.student_profile_audit ENABLE ROW LEVEL SECURITY;

CSELECT TO authenticated
  USING REATE POLICY "Admin select all audits" ON public.student_profile_audit
  FOR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Student select own audits" ON public.student_profile_audit
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- 5. Ensure student_profiles allows updates (Editable Requirement)
DROP POLICY IF EXISTS "Students manage own academic profile" ON public.student_profiles;
CREATE POLICY "Students manage own academic profile" ON public.student_profiles
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
