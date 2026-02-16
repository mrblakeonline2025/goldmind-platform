-- Create Tutors Directory Table
CREATE TABLE IF NOT EXISTS public.tutors_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  timestamp_submitted timestamptz NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NULL,
  address text NULL,
  location text NULL,
  subjects text[] NOT NULL DEFAULT '{}',
  years_gcse_experience text NULL,
  hourly_rate_group_gcse text NULL,
  weekly_availability text NULL,
  dbs_certificate text NULL,
  dbs_notes text NULL
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_tutor_dir_email ON public.tutors_directory(email);
CREATE INDEX IF NOT EXISTS idx_tutor_dir_name ON public.tutors_directory(first_name, last_name);

-- Enable RLS
ALTER TABLE public.tutors_directory ENABLE ROW LEVEL SECURITY;

-- Admin: Full Access
CREATE POLICY "Admin full access to tutor directory" ON public.tutors_directory
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Optional: Allow tutors to see directory if needed in future (currently restricted to Admin)
