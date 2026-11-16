import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/shell/AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Safe upsert fallback in case trigger was added after account creation
  let { data: profile } = await supabase
    .from('shop_profiles')
    .select('shop_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    const { data: inserted } = await supabase
      .from('shop_profiles')
      .upsert(
        {
          user_id: user.id,
          shop_name:
            (user.user_metadata?.shop_name as string | undefined)?.trim() ||
            'Tạp Hóa Mẹ',
        },
        { onConflict: 'user_id' }
      )
      .select('shop_name')
      .maybeSingle();
    profile = inserted;
  }

  return (
    <AppShell
      shopName={profile?.shop_name || 'Tạp Hóa Mẹ'}
      userEmail={user.email || ''}
    >
      {children}
    </AppShell>
  );
}
