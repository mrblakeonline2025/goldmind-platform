-- Ensure group_instances table has all fields for the live classroom workflow
ALTER TABLE public.group_instances 
ADD COLUMN IF NOT EXISTS classroom_provider text DEFAULT 'Google Meet',
ADD COLUMN IF NOT EXISTS classroom_url text,
ADD COLUMN IF NOT EXISTS classroom_notes text;

-- Also ensure the recurring_slots table matches for consistency during block generation
ALTER TABLE public.recurring_slots
ADD COLUMN IF NOT EXISTS classroom_provider text DEFAULT 'Google Meet',
ADD COLUMN IF NOT EXISTS classroom_url text,
ADD COLUMN IF NOT EXISTS classroom_notes text;