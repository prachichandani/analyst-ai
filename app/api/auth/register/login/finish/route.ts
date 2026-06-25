import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { supabase } from '../../../../../lib/supabase/client';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const { email, credential } = await req.json();

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select()
    .eq('email', email)
    .single();

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
    return Response.json({ error: 'Challenge not found or expired. Please try login again.' }, { status: 400 });
  }

  // Get the specific passkey used
  const { data: passkey, error: passkeyError } = await supabase
    .from('passkeys')
    .select()
    .eq('credential_id', credential.id)
    .maybeSingle();

  if (passkeyError) {
    console.error('Error fetching passkey:', passkeyError);
    return Response.json({ error: 'Database error fetching passkey', details: passkeyError.message }, { status: 500 });
  }

  if (!passkey) return Response.json({ error: 'Passkey not found' }, { status: 400 });

  try {
    // Get the actual origin from the request
    const requestOrigin = req.headers.get('origin') || req.headers.get('referer')?.split('/')[2] || `http://${process.env.NEXT_PUBLIC_APP_DOMAIN}`;
    const expectedOrigin = requestOrigin;
    
    console.log('Verifying authentication with origin:', expectedOrigin);
    
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin,
      expectedRPID: process.env.NEXT_PUBLIC_APP_DOMAIN!,
      credential: {
        id: passkey.credential_id,
        publicKey: Buffer.from(passkey.public_key, 'base64'),
        counter: passkey.counter,
      },
    });

    if (!verification.verified) {
      return Response.json({ error: 'Verification failed' }, { status: 400 });
    }

    // Update counter
    await supabase
      .from('passkeys')
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq('credential_id', passkey.credential_id);

    // Clean up challenge
    await supabase.from('challenges').delete().eq('user_id', user.id);

    // Create session
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

    return Response.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}