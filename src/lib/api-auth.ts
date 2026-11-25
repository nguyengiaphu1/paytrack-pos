import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ApiAuthResult =
  | { ok: true; supabase: SupabaseServerClient; user: User }
  | { ok: false; response: NextResponse };

/**
 * Authenticates an incoming Next.js Route Handler request against Supabase Auth.
 * Returns either `{ ok: true, supabase, user }` or a standardized 401 JSON response.
 */
export async function requireApiUser(
  unauthorizedMessage = 'Chưa đăng nhập'
): Promise<ApiAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: unauthorizedMessage }, { status: 401 }),
    };
  }

  return { ok: true, supabase, user };
}
