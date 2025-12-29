import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is a teacher or admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || (roleData?.role !== 'teacher' && roleData?.role !== 'admin')) {
      console.error('Role error:', roleError, 'Role:', roleData?.role);
      throw new Error('Only teachers and admins can delete users');
    }

    const { userId } = await req.json();
    console.log('Attempting to delete user:', userId);

    if (!userId) {
      throw new Error('User ID is required');
    }

    // CRITICAL: Delete from auth.users FIRST using admin client
    // This is the most important step - if this fails, user can still login
    console.log('Deleting user from auth.users...');
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting from auth.users:', deleteAuthError);
      throw new Error(`Failed to delete user from auth: ${deleteAuthError.message}`);
    }
    console.log('Successfully deleted from auth.users');

    // Now clean up related tables (these may already be cascade deleted or may fail if RLS blocks)
    // Using admin client to bypass RLS
    console.log('Cleaning up user_roles...');
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Error deleting user roles (non-critical):', rolesError);
    }

    console.log('Cleaning up profiles...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile (non-critical):', profileError);
    }

    console.log(`User ${userId} fully deleted from all tables`);

    return new Response(
      JSON.stringify({ success: true, message: 'User completely deleted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Delete user error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});