import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare Deno global for TypeScript in Supabase environment
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Verify Caller is ADMIN
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token)
    
    if (callerError || !caller) throw new Error('Unauthorized')

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', caller.id)
      .single()

    if (profileErr || profile?.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 2. Parse Payload
    const { full_name, email, phone, subjects } = await req.json()
    if (!full_name || !email) throw new Error('Full name and email are required')

    // 3. Create Auth User (Invite flow sends setup email)
    const { data: invite, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role: 'TUTOR' }
    })

    if (inviteError) throw inviteError

    // 4. Create Profile Row
    const { error: insertProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: invite.user.id,
        name: full_name,
        role: 'TUTOR',
        tenant_id: profile.tenant_id // Inherit tenant from admin
      })

    if (insertProfileError) {
      await supabaseAdmin.auth.admin.deleteUser(invite.user.id)
      throw insertProfileError
    }

    // 5. Populate Tutors Directory Registry
    const nameParts = full_name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Tutor';

    const { error: insertDirError } = await supabaseAdmin
      .from('tutors_directory')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null,
        subjects: subjects || [],
        timestamp_submitted: new Date().toISOString()
      })

    if (insertDirError) {
      // Non-critical if directory fails but profile succeeded, 
      // however for consistency we return an error if this registry insertion fails.
      console.error("Directory insertion failed:", insertDirError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: invite.user.id, email: invite.user.email, name: full_name } 
    }), {
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