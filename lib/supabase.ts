import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xftzmpmgmklpfgifzzqs.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHptcG1nbWtscGZnaWZ6enFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjM3NzMsImV4cCI6MjA4NjM5OTc3M30.cUp28J7gzdUdE-u1lrNmonMp9oCGxP0hkS33kndVmxU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);