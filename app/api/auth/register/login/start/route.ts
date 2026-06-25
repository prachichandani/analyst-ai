import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { supabase } from '../../../../../lib/supabase/client';

export async function POST(req: Request) {
  const { email } = await req.json();

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select()
    .eq('email', email)
    .single();

  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

  // Get user's passkeys
  const { data: passkeys } = await supabase
    .from('passkeys')
    .select('credential_id, device_type')
    .eq('user_id', user.id);

  if (!passkeys?.length) {
    return Response.json({ error: 'No passkeys registered' }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: process.env.NEXT_PUBLIC_APP_DOMAIN!,
    allowCredentials: passkeys.map((p) => ({
      id: p.credential_id,
      transports: p.device_type === 'singleDevice' ? ['internal'] : ['hybrid'],
    })),
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
}