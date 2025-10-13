import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const inviteCode = requestUrl.searchParams.get('invite_code');

  console.log('🔍 Auth callback received');
  console.log('Code:', code);
  console.log('Invite code:', inviteCode);

  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('❌ Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(`${requestUrl.origin}/error?message=auth_failed`);
    }

    console.log('✅ Session established');

    // Get the authenticated user
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

    if (userError || !authUser) {
      console.error('❌ Error getting user:', userError);
      return NextResponse.redirect(`${requestUrl.origin}/error?message=user_not_found`);
    }

    console.log('✅ Auth user:', authUser.email);

    // Check if user profile already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single();

    console.log('Existing user:', existingUser);
    console.log('User check error:', userCheckError);

    if (existingUser) {
      // Profile exists, redirect to dashboard
      console.log('✅ Profile exists, redirecting to dashboard...');
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
    }

    // New user - need invite code to create profile
    if (!inviteCode) {
      console.error('❌ No invite code provided for new user');
      return NextResponse.redirect(`${requestUrl.origin}/error?message=invite_required`);
    }

    // Fetch the invite
    console.log('🔍 Fetching invite...');
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('token', inviteCode)
      .single();

    console.log('Invite:', invite);
    console.log('Invite error:', inviteError);

    if (!invite || invite.used_at) {
      console.error('❌ Invalid or used invite');
      return NextResponse.redirect(`${requestUrl.origin}/error?message=invalid_invite`);
    }

    // Create user profile
    console.log('📝 Creating user profile...');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUser.id,
        company_id: invite.company_id,
        warehouse_id: invite.warehouse_id,
        role: invite.role,
        first_name: authUser.user_metadata?.given_name ||
                    authUser.user_metadata?.name?.split(' ')[0] || 'User',
        last_name: authUser.user_metadata?.family_name ||
                   authUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
        email: authUser.email,
        is_active: true,
      })
      .select()
      .single();

    console.log('New user:', newUser);
    console.log('Create error:', createError);

    if (createError) {
      console.error('❌ Error creating user profile:', createError);
      return NextResponse.redirect(`${requestUrl.origin}/error?message=profile_creation_failed`);
    }

    // Mark invite as used
    console.log('✅ Marking invite as used...');
    await supabase
      .from('invites')
      .update({
        used_at: new Date().toISOString(),
        used_by_user_id: newUser.id,
      })
      .eq('id', invite.id);

    // Redirect to dashboard
    console.log('🎉 Success! Redirecting to dashboard...');
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
  }

  // No code provided, redirect to home
  return NextResponse.redirect(requestUrl.origin);
}
