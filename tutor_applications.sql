-- Create Tutor Applications Table
CREATE TABLE IF NOT EXISTS public.tutor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  subjects jsonb NULL DEFAULT '[]'::jsonb,
  key_stages jsonb NULL DEFAULT '[]'::jsonb,
  dbs_status text NULL,
  experience_notes text NULL,
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Reviewed', 'Approved', 'Activated', 'Rejected')),
  source text NOT NULL DEFAULT 'platform' CHECK (source IN ('import', 'google_form', 'platform')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tutor_app_email ON public.tutor_applications(email);
CREATE INDEX IF NOT EXISTS idx_tutor_app_status ON public.tutor_applications(status);

-- Enable RLS
ALTER TABLE public.tutor_applications ENABLE ROW LEVEL SECURITY;

-- Admin: Full Control
CREATE POLICY "Admin full access" ON public.tutor_applications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Public: Insert applications (for the platform form)
CREATE POLICY "Allow public inserts" ON public.tutor_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (source = 'platform');

-- No Read access for non-admins
-- (Default RLS behavior is deny if no policy matches)