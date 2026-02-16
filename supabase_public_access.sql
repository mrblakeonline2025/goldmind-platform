-- Enable Row Level Security if not already active
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing select policies for this table if they conflict
DROP POLICY IF EXISTS "Allow public read access to platform_settings" ON public.platform_settings;

-- Allow anyone (including anonymous/non-logged in users) to read the settings
CREATE POLICY "Allow public read access to platform_settings" 
ON public.platform_settings 
FOR SELECT 
USING (true);
