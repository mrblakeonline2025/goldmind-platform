import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare Deno global for TypeScript in Supabase environment
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const { slot_id, start_date, classroom_url, classroom_provider = 'Google Meet', overwrite = false } = await req.json()
    
    if (!classroom_url) {
       throw new Error('Classroom URL is required for manual assignment.');
    }

    // 1. Initialize Supabase Client with Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Validate Authenticated User is ADMIN
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Unauthorized')

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 3. Determine the dates for the 4-week block
    const dates = []
    for (let i = 0; i < 4; i++) {
      const d = new Date(start_date)
      d.setDate(d.getDate() + (i * 7))
      dates.push(d.toISOString().split('T')[0])
    }

    // 4. Fetch relevant instances
    const { data: instances, error: fetchError } = await supabaseAdmin
      .from('group_instances')
      .select('id, classroom_url')
      .eq('slot_id', slot_id)
      .in('session_date', dates)

    if (fetchError) throw fetchError

    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ message: "No sessions found to update." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 5. Map to sessions using PROVIDED link
    const updates = instances.map((inst) => {
      // If not overwriting, only update if current URL is null or empty
      if (!overwrite && inst.classroom_url && inst.classroom_url.trim() !== '') return null;

      return {
        id: inst.id,
        classroom_url,
        classroom_provider,
        classroom_notes: 'Manual link applied to 4-week block.'
      }
    }).filter(Boolean);

    if (updates.length > 0) {
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from('group_instances')
        .upsert(updates)
        .select('id, classroom_url')

      if (updateError) throw updateError

      return new Response(JSON.stringify({ 
        success: true, 
        count: updates.length,
        url: classroom_url,
        updated: updatedRows 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ message: "No sessions required updating." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})