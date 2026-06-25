import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { supabase } from '../../../../lib/supabase/client';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { email, credential } = await req.json();
    console.log('Registration finish for email:', email);
    console.log('Credential received:', credential ? 'Yes' : 'No');

    if (!email || !credential) {
      console.error('Missing required fields:', { email: !!email, credential: !!credential });
      return Response.json({ error: 'Email and credential are required' }, { status: 400 });
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select()
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return Response.json({ error: 'Database error fetching user', details: userError.message }, { status: 500 });
    }

    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    // Get saved challenge
    const { data: challengeRow, error: challengeError } = await supabase
      .from('challenges')
      .select()
      .eq('user_id', user.id)
      .maybeSingle();

    if (challengeError) {
      console.error('Error fetching challenge:', challengeError);
      return Response.json({ error: 'Database error fetching challenge', details: challengeError.message }, { status: 500 });
    }

    if (!challengeRow) {
      console.error('No challenge found for user:', user.id);
      return Response.json({ error: 'Challenge not found or expired. Please try registration again.' }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_APP_DOMAIN) {
      console.error('Missing NEXT_PUBLIC_APP_DOMAIN environment variable');
      return Response.json({ error: 'Server configuration error: missing APP_DOMAIN' }, { status: 500 });
    }

    // Get the actual origin from the request
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer')?.split('/')[2] || `http://${process.env.NEXT_PUBLIC_APP_DOMAIN}`;
    const expectedOrigin = requestOrigin;
    
    console.log('Verifying registration with origin:', expectedOrigin);
    
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin,
      expectedRPID: process.env.NEXT_PUBLIC_APP_DOMAIN!,
    });

    if (!verification.verified || !verification.registrationInfo) {
      console.error('Verification failed:', { verified: verification.verified, hasInfo: !!verification.registrationInfo });
      return Response.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credential: cred } = verification.registrationInfo;

    // Save passkey
    const { error: passkeyError } = await supabase.from('passkeys').insert({
      user_id: user.id,
      credential_id: cred.id,
      public_key: Buffer.from(cred.publicKey).toString('base64'),
      counter: cred.counter,
      device_type: verification.registrationInfo.credentialDeviceType,
    });

    if (passkeyError) {
      console.error('Error saving passkey:', passkeyError);
      return Response.json({ error: 'Failed to save passkey', details: passkeyError.message }, { status: 500 });
    }

    // Clean up challenge
    await supabase.from('challenges').delete().eq('user_id', user.id);

    // Create session so user is logged in after registration
    const session = await getIronSession<{ userId: string; email: string }>(
      await cookies(),
      {
        password: process.env.SESSION_SECRET!,
        cookieName: 'session',
        cookieOptions: {
          secure: process.env.NODE_ENV === 'production',
        },
      }
    );

    session.userId = user.id;
    session.email = user.email;
    await session.save();

    console.log('Session created for user:', user.id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json({ 
      error: 'Registration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}