import { generateRegistrationOptions } from '@simplewebauthn/server';
import { supabase } from '../../../../lib/supabase/client';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    console.log('Registration start for email:', email);

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_APP_DOMAIN) {
      console.error('Missing NEXT_PUBLIC_APP_DOMAIN environment variable');
      return Response.json({ error: 'Server configuration error: missing APP_DOMAIN' }, { status: 500 });
    }

    console.log('Environment check - APP_DOMAIN:', process.env.NEXT_PUBLIC_APP_DOMAIN);
    console.log('Environment check - SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');

    // Get or create user
    let { data: user } = await supabase
      .from('users')
      .select()
      .eq('email', email)
      .single();

  if (!user) {
    console.log('Creating new user for email:', email);
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ email })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating user:', insertError);
      return Response.json({ error: 'Failed to create user', details: insertError.message }, { status: 500 });
    }
    user = newUser;
  }

  // Get existing passkeys so we can exclude them
  const { data: existingPasskeys } = await supabase
    .from('passkeys')
    .select('credential_id, device_type')
    .eq('user_id', user.id);

  const options = await generateRegistrationOptions({
    rpName: 'analyst-ai',
    rpID: process.env.NEXT_PUBLIC_APP_DOMAIN!,
    userID: new TextEncoder().encode(user.id),
    userName: email,
    excludeCredentials: existingPasskeys?.map((p) => ({
      id: p.credential_id,
      transports: p.device_type === 'singleDevice' ? ['internal'] : ['hybrid'],
    })) ?? [],
  });

  // Save challenge (delete existing first, then insert)
  const { error: deleteError } = await supabase
    .from('challenges')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Error deleting old challenge:', deleteError);
    // Continue anyway - might not exist
  }

  const { error: insertError } = await supabase.from('challenges').insert({
    user_id: user.id,
    challenge: options.challenge,
  });

  if (insertError) {
    console.error('Error inserting challenge:', insertError);
    return Response.json({ error: 'Failed to save challenge', details: insertError.message }, { status: 500 });
  }

  console.log('Challenge saved successfully for user:', user.id);
  return Response.json(options);
  } catch (error) {
    console.error('Registration start error:', error);
    return Response.json({ error: 'Registration start failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}