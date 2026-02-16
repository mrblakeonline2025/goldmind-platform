-- Updated Function to stop auto-generating links.
-- Admin now provides links manually via the frontend Management Console.
CREATE OR REPLACE FUNCTION attach_block_meet_link(
  slot_uuid uuid, 
  start_date date, 
  overwrite boolean DEFAULT false
)
RETURNS text 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-generation removed.
  -- Links are now applied manually via the Management Console.
  RETURN NULL;
END;
$$;